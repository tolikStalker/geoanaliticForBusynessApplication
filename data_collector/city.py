import osmnx as ox
import psycopg2
from psycopg2.extras import execute_values
from config import db_params
from transliterate import translit
import re

# Список городов для загрузки
CITIES = [
    {"city": "zheleznovodsk", "capital": "stavropol"},
    {"city": "taganrog", "capital": "rostov"},
    # {"city": "rostov-on-don", "capital": "rostov"},
]


def slugify_region(region_name: str) -> str:
    custom = region_name.replace("ий", "iy").replace("й", "y").replace("я", "ya")

    # Транслитерация (с русского на латиницу)
    transliterated = translit(custom, "ru", reversed=True)

    # Приводим к нижнему регистру
    slug = transliterated.lower()

    # Заменяем все небуквенно-цифровые символы на дефис
    slug = slug.replace("'", "")
    slug = re.sub(r"[^a-z0-9]+", "-", slug)

    return slug


tags = {"place": ["city", "town"]}


def get_city_data(city_name) -> dict:
    """Получение данных города из OSM"""
    try:
        city_features = ox.features_from_place(city_name["city"], tags)

        if city_features.empty:
            return None

        props = city_features.iloc[0]

        print(
            city_features[["int_name", "name:ru", "population", "addr:region"]].head()
        )

        return {
            "osm_name": props.get("int_name", "N/A"),
            "name": props.get("name:ru", "N/A"),
            "region": slugify_region(props.get("addr:region", "N/A")),
            "capital": city_name["capital"],
            "center": f"SRID=4326;POINT({props.geometry.centroid.x} {props.geometry.centroid.y})",
            "population": props.get("population", 0),
        }

    except Exception as e:
        print(f"Ошибка получения данных для {city_name}: {str(e)}")
        return None


def load_cities():
    """Основная функция загрузки данных"""
    data = []
    for city in CITIES:
        added = get_city_data(city)
        if added:
            data.append(
                (
                    added.get("osm_name", "N/A"),
                    added.get("name", "N/A"),
                    added.get("region", "N/A"),
                    added.get("capital", "N/A"),
                    added.get("center"),
                    added.get("population", None),
                )
            )

    # Формирование SQL-запроса
    query = """
			INSERT INTO city (osm_name, name, region, capital, center, population)
			VALUES %s
			ON CONFLICT (osm_name) DO update
            SET
                region = EXCLUDED.region,
                capital = EXCLUDED.capital,
                center = EXCLUDED.center,
                population = EXCLUDED.population
		"""

    try:
        conn = psycopg2.connect(**db_params)
        cursor = conn.cursor()

        execute_values(
            cursor, query, data, template="(%s, %s, %s, %s, ST_GeomFromEWKT(%s), %s)"
        )
        conn.commit()
        print(f"Успешно загружены данные")

    except Exception as e:
        print(f"Ошибка: {str(e)}")
    finally:
        if "conn" in locals():
            cursor.close()
            conn.close()


load_cities()
print("Загрузка завершена")
