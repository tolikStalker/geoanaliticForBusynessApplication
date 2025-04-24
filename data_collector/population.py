import geopandas as gpd
import osmnx as ox
import numpy as np
import pandas as pd
import psycopg2
from config import db_params
import h3
from shapely.geometry import Polygon
import json
from sqlalchemy import create_engine, text
from shapely.geometry import MultiPolygon


# Функция для расчета населения на основе характеристик зданий
def estimate_population(gdf):
    """
    Оценка населения:
    - apartments: 3 человека/квартиру * 10 квартир/этаж
    - houses: 3 человека/дом
    """
    gdf = gdf.copy()

    gdf = gdf.to_crs(epsg=3857)
    gdf["area"] = gdf.geometry.area
    gdf = gdf.to_crs(epsg=4326)

    conditions = [
        gdf["building"].isin(["apartments", "dormitory"]),
        gdf["building"].isin(["house", "detached", "terrace"]),
        gdf["building"] == "yes",
    ]
    gdf["area"] = pd.to_numeric(gdf["area"], errors="coerce")
    gdf["building:levels"] = pd.to_numeric(
        gdf["building:levels"], errors="coerce"
    ).fillna(1)

    choices = [
        gdf["building:levels"].fillna(1) * gdf["area"] * 0.01,
        3,
        3,  # gdf["building:levels"].fillna(1) * gdf["area"] * 0.01,
    ]

    gdf["population"] = np.select(conditions, choices, default=np.nan)
    gdf["population"] = pd.to_numeric(gdf["population"], errors="coerce")
    valid_gdf = gdf.dropna(subset=["population"])
    stats = (
        valid_gdf.groupby("building")["population"]
        .agg(
            total_population="sum",
            buildings_count="count",
        )
        .sort_values(by="total_population", ascending=False)
    )

    print(stats)
    return valid_gdf


# Функция для генерации гексагонов внутри полигона
def create_hexagons(geoJson, residential_buildings_gdf, cityid, resolution=10):
    # Преобразуем geoJson в полигоны
    if geoJson["type"] == "MultiPolygon":
        # Если на входе MultiPolygon, обрабатываем каждый полигон отдельно
        polygons = [Polygon(coords) for coords in geoJson["coordinates"]]
    else:
        # Если это просто Polygon, то создаем один полигон
        polygons = [Polygon(geoJson["coordinates"][0])]

    # Обрабатываем каждый полигон отдельно
    hex_data = []
    for polygon in polygons:
        # Получаем географические координаты полигона
        polyline = list(polygon.exterior.coords)

        # Генерация гексагонов
        poly = h3.LatLngPoly(polyline)
        hexagons = list(h3.h3shape_to_cells(poly, res=resolution))

        # Генерация гексагонов для этого полигона
        for hex_id in hexagons:
            boundary = h3.cell_to_boundary(hex_id)
            boundary_lon_lat = [
                (lon, lat) for lat, lon in boundary
            ]  # Меняем на [(lon, lat), ...]
            hex_polygon = Polygon(boundary_lon_lat)
            hex_data.append({"id": hex_id, "geometry": hex_polygon})

    engine = create_engine(
        "postgresql://postgres:chkaf042do@localhost:5432/diplom", client_encoding="utf8"
    )

    def to_lon_lat(polygon: Polygon) -> Polygon:
        """Переставляет координаты с (lat, lon) на (lon, lat) для всех колец"""
        exterior = [(lon, lat) for lat, lon in polygon.exterior.coords]
        interiors = [
            [(lon, lat) for lat, lon in ring.coords] for ring in polygon.interiors
        ]
        return Polygon(exterior, interiors)

    # Преобразуем каждый полигон
    polygons_lonlat = [to_lon_lat(polygon) for polygon in polygons]

    multipolygon = MultiPolygon(polygons_lonlat)
    gdf = gpd.GeoDataFrame(
        [{"city_id": cityid, "geom": multipolygon}], geometry="geom", crs="EPSG:4326"
    )
    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM city_boundaries WHERE city_id = :city_id"),
            {"city_id": cityid},
        )
        conn.execute(
            text("DELETE FROM city_hexagons WHERE city_id = :city_id"),
            {"city_id": cityid},
        )

    gdf.to_postgis("city_boundaries", engine, if_exists="append", index=False)

    # Создаем GeoDataFrame с гексагонами
    hex_gdf = gpd.GeoDataFrame(hex_data, crs="EPSG:4326")

    joined = gpd.sjoin(
        residential_buildings_gdf[["population", "geometry"]],
        hex_gdf,
        how="inner",
        predicate="intersects",
    )

    pop_by_hex = joined.groupby("index_right")["population"].sum().reset_index()
    pop_by_hex.columns = ["hex_index", "population"]
    pop_by_hex["population"] = pop_by_hex["population"].round().astype(int)

    # Объединяем с гексагонами
    filtered_hex_gdf = hex_gdf.reset_index().merge(
        pop_by_hex, left_on="index", right_on="hex_index"
    )
    filtered_hex_gdf["city_id"] = cityid
    filtered_hex_gdf = filtered_hex_gdf.rename(columns={"geometry": "geom"})
    filtered_hex_gdf.set_geometry("geom", inplace=True)
    filtered_hex_gdf = filtered_hex_gdf.drop(columns=["index", "hex_index"])

    filtered_hex_gdf.to_postgis(
        "city_hexagons",
        engine,
        if_exists="append",
        index=False,
    )


# Получение данных
def get_osm_data(area):
    # Скачиваем здания
    tags = {"building": ["apartments", "house", "detached", "dormitory", "yes"]}
    gdf = ox.features_from_polygon(area.geometry[0], tags=tags)

    # Убираем здания с признаками non-residential (если есть такие теги)
    unwanted_tags = ["amenity", "tourism", "resort", "man_made", "shop", "leisure"]
    for tag in unwanted_tags:
        if tag in gdf.columns:
            gdf = gdf[gdf[tag].isna()]

    # Убираем здания без указанных этажей
    condition = ~(
        (gdf["building"] == "yes")
        & (gdf["building:levels"].isna())
        & (gdf["addr:housenumber"].isna())
    )

    return gdf[condition]


conn = psycopg2.connect(**db_params)
cursor = conn.cursor()
cursor.execute("select osm_name,population,id from city")
city = [
    {"osmid": city[0], "population": city[1], "id": city[2]}
    for city in cursor.fetchall()
]
for selectedCity in city:
    polygon_krd = ox.geocode_to_gdf(selectedCity["osmid"])

    geoJson = json.loads(gpd.GeoSeries(polygon_krd["geometry"]).to_json())["features"][
        0
    ]["geometry"]

    if geoJson["type"] == "MultiPolygon":
        geoJson = {
            "type": "MultiPolygon",
            "coordinates": [
                np.column_stack(
                    (np.array(polygon[0])[:, 1], np.array(polygon[0])[:, 0])
                ).tolist()
                for polygon in geoJson["coordinates"]
            ],
        }
    else:
        geoJson = {
            "type": "Polygon",
            "coordinates": [
                np.column_stack(
                    (
                        np.array(geoJson["coordinates"][0])[:, 1],
                        np.array(geoJson["coordinates"][0])[:, 0],
                    )
                ).tolist()
            ],
        }

    gdf = get_osm_data(polygon_krd)
    residential_buildings = estimate_population(gdf)
    create_hexagons(geoJson, residential_buildings, selectedCity["id"])
