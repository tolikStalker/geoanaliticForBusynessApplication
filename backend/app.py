from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from geoalchemy2 import Geometry
from geoalchemy2.shape import to_shape
from sqlalchemy import func, text
from shapely.wkb import loads as load_wkb
from flask_cors import CORS

# from cachetools import TTLCache
import os

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DB_URI', 'postgresql+psycopg2://postgres:chkaf042do@localhost/diplom')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Кэш на 1 час
# cache = TTLCache(maxsize=100, ttl=3600)

# Модели БД
class City(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    osm_name = db.Column(db.String(255), nullable=False, unique=True)
    name = db.Column(db.String(255), nullable=False)
    center = db.Column(Geometry(geometry_type='POINT', srid=4326), nullable=False)
    population = db.Column(db.Integer, nullable=False)

# class Competitor(db.Model):
#     id = db.Column(db.Integer, primary_key=True)
#     name = db.Column(db.String(100), nullable=False)
#     category = db.Column(db.String(50))
#     coordinates = db.Column(Geometry(geometry_type='POINT', srid=4326))
#     city_id = db.Column(db.Integer, db.ForeignKey('city.id'))
#     is_active = db.Column(db.Boolean, default=True)
#     last_updated = db.Column(db.DateTime)

@app.route('/api/cities', methods=['GET'])
def get_cities():
    """Получение списка доступных городов"""
    cities = City.query.all()
    
    result = []
    for city in cities:
        try:
            point = load_wkb(bytes(city.center.data))  # безопасная конвертация WKB → shapely Point

            result.append({
                "id": city.id,
                "name": city.name,
                "osm_name": city.osm_name,
                "center": [point.y, point.x],  # lat, lon
                "population": city.population
            })
        except Exception as e:
            app.logger.error(f"Ошибка при обработке города ID={city.id}: {e}")
            continue

    print(f"Ответ: {result}")  # Логирование данных перед отправкой
    return jsonify(result)

# @app.route('/api/analysis', methods=['GET'])
# def get_analysis():
#     """Основной метод анализа данных"""
#     cache_key = str(request.args)
#     if cache_key in cache:
#         return jsonify(cache[cache_key])

#     try:
#         city_id = int(request.args.get('cityId'))
#         radius = float(request.args.get('radius', 1))
#     except (TypeError, ValueError):
#         return jsonify({"error": "Invalid parameters"}), 400

#     city = next((c for c in CITIES_DATA if c['id'] == city_id), None)
#     if not city:
#         return jsonify({"error": "City not found"}), 404

#     # Поиск конкурентов в радиусе
#     competitors = get_competitors(city['center'], radius)
    
#     # Расчет средней аренды
#     avg_rent = calculate_avg_rent(city_id)
    
#     # Формирование ответа
#     result = {
#         "stats": {
#             "competitors": len(competitors),
#             "avg_rent": avg_rent
#         },
#         "heatmap": generate_heatmap_data(city_id),
#         "competitors": competitors
#     }
    
#     cache[cache_key] = result
#     return jsonify(result)

def get_competitors(center, radius_km):
    """Получение конкурентов в заданном радиусе"""
    point = f"POINT({center[1]} {center[0]})"
    return Competitor.query.filter(
        text(
            "ST_DWithin(coordinates::geography, "
            f"ST_GeomFromText('{point}', 4326)::geography, "
            f"{radius_km * 1000})"
        )
    ).filter_by(is_active=True).all()

def calculate_avg_rent(city_id):
    """Расчет средней аренды (заглушка)"""
    # Реальная реализация будет зависеть от структуры БД
    return 2500

def generate_heatmap_data(city_id):
    """Генерация данных для тепловой карты (заглушка)"""
    return [[55.75, 37.61, 50], [55.76, 37.63, 30]]


def test_db_connection():
    with app.app_context():
        try:
            db.session.execute(text('SELECT 1'))
            print("Подключение к базе данных успешно.")
        except Exception as e:
            print(f"Ошибка подключения к базе данных: {str(e)}")
            exit(1)  # Остановить запуск, если подключение не удалось

test_db_connection()
app.run(debug=True)
