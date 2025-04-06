import folium
import geopandas as gpd
import osmnx as ox
import numpy as np
import pandas as pd
import psycopg2
from folium.plugins import HeatMap


db_params = {
    "dbname": "diplom",
    "user": "postgres",
    "password": "chkaf042do",
    "host": "localhost",
    "port": "5432",
}

def get_city_coordinates(selected_city):
    query = """
    SELECT "Название","Рейтинг","Количество_отзывов","Категория",ST_Y("Координаты") AS latitude, ST_X("Координаты") AS longitude ,"Адрес","Город" FROM organizations
    WHERE "Город" = %s;
    """
    with psycopg2.connect(**db_params) as conn, conn.cursor() as cur:
        cur.execute(query, (selected_city,))
        return cur.fetchall()

def visualize_polygons(geometry):
    lats, lons = get_lat_lon(geometry)

    m = folium.Map(location=[sum(lats) / len(lats), sum(lons) / len(lons)], zoom_start=13)

    overlay = gpd.GeoSeries(geometry).to_json()
    folium.GeoJson(overlay, name='boundary').add_to(m)
    m.show_in_browser()
    return m


# выводим центроиды полигонов
def get_lat_lon(geometry):
    lon = geometry.apply(lambda x: x.x if x.type == 'Point' else x.centroid.x)
    lat = geometry.apply(lambda x: x.y if x.type == 'Point' else x.centroid.y)
    return lat, lon

city = ['Таганрог', 'Железноводск', 'Москва']
current_city = city[0]
organization_coords = get_city_coordinates(current_city)

# Создание карты с метками
# m = folium.Map(location=[55.7558, 37.6176], zoom_start=10)  # Москва по умолчанию
# for name, rating, review_count, category, lat,lon, address, city in organization_coords:
#     folium.Marker([lon, lat], popup=name).add_to(m)



# Функция для расчета населения на основе характеристик зданий
def estimate_population(gdf):
    """
    Оценка населения:
    - apartments: 3 человека/квартиру * 10 квартир/этаж
    - houses: 3 человека/дом
    """
    conditions = [
        gdf['building'].isin(['apartments', 'dormitory']),
        gdf['building'].isin(['house', 'detached', 'terrace']),
        gdf['building'] == 'yes'
    ]

    choices = [
        gdf['building:levels'].fillna(1) ,
        gdf['building:levels'].fillna(1) ,
        gdf['building:levels'].fillna(1)
    ]


    gdf['population'] = np.select(conditions, choices, default=np.nan)
    gdf['population'] = pd.to_numeric(gdf['population'], errors='coerce')
    valid_gdf=gdf.dropna(subset=['population'])
    print(valid_gdf.groupby('building')['population'].agg(['sum', 'mean', 'count']))
    return valid_gdf


# Получение данных
def get_osm_data(place_name):
    # Получаем границы города
    area = ox.geocode_to_gdf(place_name)

    # Скачиваем здания
    tags = {'building': True, 'building:levels': True}
    gdf = ox.features_from_polygon(area.geometry[0], tags=tags)

    # Фильтруем жилые здания
    residential_types = ['apartments', 'house', 'detached', 'dormitory','yes']
    gdf = gdf[gdf['building'].isin(residential_types) & gdf['amenity'].isna()]

    return gdf


# Построение тепловой карты
def create_population_heatmap(place_name):
    # Получаем данные
    gdf = get_osm_data(place_name)
    gdf = estimate_population(gdf)

    if gdf.empty:
        raise ValueError("Нет валидных данных для построения карты")

    gdf_projected = gdf.to_crs(epsg=3857)
    gdf_projected['geometry'] = gdf_projected.geometry.centroid
    gdf_projected = gdf_projected.to_crs(epsg=4326)
    #
    # # Извлекаем координаты из точечных геометрий
    gdf_projected['lat'] = gdf_projected.geometry.y
    gdf_projected['lon'] = gdf_projected.geometry.x
    #
    # # Создаем карту
    m = folium.Map(location=[gdf_projected['lat'].mean(), gdf_projected['lon'].mean()], zoom_start=13)
    #
    # # Подготавливаем данные для HeatMap
    heat_data = gdf_projected[['lat', 'lon', 'population']].values.tolist()
    #
    # # Добавляем тепловой слой
    HeatMap(
        heat_data,
        radius=70,
        blur=30,
        min_opacity=0.3
        # max_val=gdf['population'].quantile(0.95),
        # gradient={0.4: 'blue', 0.6: 'lime', 0.8: 'yellow', 1: 'red'}
    ).add_to(m)
    #
    return m

m= create_population_heatmap('городской округ Железноводск')
m.save(f"sus_map.html")
