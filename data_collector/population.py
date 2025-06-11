import geopandas as gpd
import osmnx as ox
import numpy as np
import pandas as pd
import psycopg2
from config import db_params, sqlalchemy_url
import h3
from shapely.geometry import Polygon
import json
from sqlalchemy import create_engine, text
from shapely.geometry import MultiPolygon
import matplotlib.pyplot as plt
import matplotlib as mpl


def plot_hexagons_population(hex_gdf, title="Hex population"):
    # Оставляем только гексагоны с ненулевым населением
    hex_gdf = hex_gdf.copy()
    hex_gdf = hex_gdf[hex_gdf["population"] > 0]
    if hex_gdf.empty:
        print("Нет гексагонов с населением > 0")
        return

    pop = hex_gdf["population"]
    pop_max = pop.max()
    pop_min = pop.min()

    # Логарифмическая шкала в диапазоне [1, pop_max]
    norm = mpl.colors.LogNorm(vmin=1, vmax=pop_max)
    cmap = plt.get_cmap("RdYlGn")

    fig, ax = plt.subplots(figsize=(12, 12))

    hex_gdf.plot(
        ax=ax,
        column="population",
        cmap=cmap,
        norm=norm,
        linewidth=0.5,
        edgecolor="gray",
        legend=True,
        legend_kwds={"label": "Население в гексагоне (логарифмическая шкала)"},
    )

    plt.title(title)
    plt.xlabel("Долгота")
    plt.ylabel("Широта")
    plt.tight_layout()
    plt.show()


def estimate_population(gdf):
    """
    Оценка населения:
    - houses: 3 человека/дом
    """
    gdf = gdf.copy()

    gdf = gdf.to_crs(epsg=3857)
    gdf["area"] = gdf.geometry.area
    gdf = gdf.to_crs(epsg=4326)

    gdf["area"] = pd.to_numeric(gdf["area"], errors="coerce")
    gdf["building:levels"] = pd.to_numeric(
        gdf["building:levels"], errors="coerce"
    ).fillna(1)
    gdf["flats"] = pd.to_numeric(
        gdf.get("flats", gdf.get("apartments", None)), errors="coerce"
    )

    population = np.where(
        ~gdf["flats"].isna(),
        gdf["flats"] * 2.2,
        np.select(
            [
                gdf["building"].isin(["apartments", "dormitory"]),
                gdf["building"].isin(["house", "detached", "terrace"]),
                gdf["building"] == "yes",
            ],
            [
                gdf["building:levels"].fillna(1) * gdf["area"] * 0.015,
                3,
                3,  # можно вместо 3 сделать формулу по площади, если нужно
            ],
            default=np.nan,
        ),
    )

    gdf["population"] = pd.to_numeric(population, errors="coerce")
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


def create_hexagons(geoJson, residential_buildings_gdf, cityid, resolution=10):
    if geoJson["type"] == "MultiPolygon":
        polygons = [Polygon(coords) for coords in geoJson["coordinates"]]
    else:
        polygons = [Polygon(geoJson["coordinates"][0])]

    hex_data = []
    for polygon in polygons:
        polyline = list(polygon.exterior.coords)

        poly = h3.LatLngPoly(polyline)
        hexagons = list(h3.h3shape_to_cells(poly, res=resolution))

        for hex_id in hexagons:
            boundary = h3.cell_to_boundary(hex_id)
            boundary_lon_lat = [(lon, lat) for lat, lon in boundary]
            hex_polygon = Polygon(boundary_lon_lat)
            hex_data.append({"id": hex_id, "geometry": hex_polygon})

    def to_lon_lat(polygon: Polygon) -> Polygon:
        """Переставляем координаты с (lat, lon) на (lon, lat) для всех колец"""
        exterior = [(lon, lat) for lat, lon in polygon.exterior.coords]
        interiors = [
            [(lon, lat) for lat, lon in ring.coords] for ring in polygon.interiors
        ]
        return Polygon(exterior, interiors)

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

    hex_gdf = gpd.GeoDataFrame(hex_data, crs="EPSG:4326")
    residential_buildings_gdf = residential_buildings_gdf.to_crs(epsg=3857)
    residential_buildings_gdf["geometry"] = residential_buildings_gdf[
        "geometry"
    ].centroid
    residential_buildings_gdf = residential_buildings_gdf.to_crs(epsg=4326)

    joined = gpd.sjoin(
        residential_buildings_gdf[["population", "geometry"]],
        hex_gdf,
        how="inner",
        predicate="within",
    )

    pop_by_hex = joined.groupby("index_right")["population"].sum().reset_index()
    pop_by_hex.columns = ["hex_index", "population"]
    pop_by_hex["population"] = pop_by_hex["population"].round().astype(int)

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

    # plot_hexagons_population(filtered_hex_gdf)


def get_osm_data(area):
    polygon = area.geometry[0]

    tags = {
        "building": [
            "apartments",
            "house",
            "detached",
            "residential",
            "dormitory",
            "terrace",
            "semidetached_house",
            "bungalow",
            "yes",
        ]
    }
    gdf = ox.features_from_polygon(polygon, tags=tags)

    unwanted_tags = ["amenity", "tourism", "resort", "man_made", "shop", "leisure"]
    for tag in unwanted_tags:
        if tag in gdf.columns:
            gdf = gdf[gdf[tag].isna()]

    condition = ~(
        (gdf["building"] == "yes")
        & (gdf["building:levels"].isna())
        & (gdf["addr:housenumber"].isna())
    )
    gdf_filtered = gdf[condition].copy()

    exclude_areas_tags = {
        "landuse": [
            "industrial",
            "commercial",
            "retail",
            "military",
            "cemetery",
            "garages",
            "park",
        ],
        "amenity": [
            "school",
            "university",
            "college",
            "kindergarten",
            "hospital",
            "parking",
        ],
        "man_made": ["works", "plant"],
        "military": True,
    }
    exclude_areas = ox.features_from_polygon(polygon, exclude_areas_tags)

    gdf_filtered = gdf_filtered.to_crs("EPSG:3857")
    exclude_areas = exclude_areas.to_crs("EPSG:3857")

    gdf_filtered["geometry"] = gdf_filtered.geometry.centroid

    joined = gpd.sjoin(gdf_filtered, exclude_areas, how="left", predicate="within")

    if "id_right" in joined.columns:
        filtered = joined[joined["id_right"].isna()].copy()
    else:
        filtered = joined.copy()
    result = gdf.loc[filtered.index].copy()
    return result


engine = create_engine(sqlalchemy_url, client_encoding="utf8")
conn = psycopg2.connect(**db_params)
cursor = conn.cursor()
cursor.execute("select osm_name,population,id from city")
city = [
    {"osmid": city[0], "population": city[1], "id": city[2]}
    for city in cursor.fetchall()
]
for selectedCity in city:
    print("Текущий город: ", selectedCity)
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
