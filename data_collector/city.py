import osmnx as ox
import psycopg2
from psycopg2.extras import execute_values
from config import db_params

# Список городов для загрузки
CITIES = [
    "zheleznovodsk",
    "taganrog",
    "rostov-on-don",
]

tags = {"place": ["city","town"]}

def get_city_data(city_name: str) -> dict:
    """Получение данных города из OSM"""
    try:
        city_features = ox.features_from_place(city_name, tags)
        
        if city_features.empty:
            return None

        props = city_features.iloc[0]
        
        print(city_features[["int_name", "name:ru", "population"]].head())
                    
        return {
            "osm_name": props.get("int_name", "N/A"),
            "name": props.get("name:ru", "N/A"),
            "center": f"SRID=4326;POINT({props.geometry.centroid.x} {props.geometry.centroid.y})",
            "population": props.get("population", "N/A")
        }
        
    except Exception as e:
        print(f"Ошибка получения данных для {city_name}: {str(e)}")
        return None

def load_cities():
    """Основная функция загрузки данных"""
    data=[]
    for city in CITIES:
            added=get_city_data(city)
            if added:
                data.append((
        added.get("osm_name", "N/A"),                     # osm_name
        added.get("name", "N/A"),
        added.get('center'),  # Геометрия в EWKT
        added.get("population", None)
    ))
    
    # Формирование SQL-запроса
    query = """
			INSERT INTO city (osm_name, name, center, population)
			VALUES %s
			ON CONFLICT (osm_name) DO NOTHING
		"""

    try:    
        conn = psycopg2.connect(**db_params)
        cursor = conn.cursor()
        
        execute_values(cursor, query, data, template="(%s, %s, ST_GeomFromEWKT(%s), %s)")
        conn.commit()
        print(f"Успешно загружены данные")
                
    except Exception as e:
        print(f"Ошибка: {str(e)}")
    finally:
        if 'conn' in locals():
            cursor.close()
            conn.close()
            
            
load_cities()
print("Загрузка завершена")
