from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from geoalchemy2 import Geometry
from sqlalchemy import func, text
from cachetools import TTLCache
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DB_URI', 'postgresql+psycopg2://user:pass@localhost/geoapp')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Кэш на 1 час
cache = TTLCache(maxsize=100, ttl=3600)

# Модели БД
class City(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    center = db.Column(Geometry(geometry_type='POINT', srid=4326))
    bbox = db.Column(Geometry(geometry_type='POLYGON', srid=4326))

class Competitor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50))
    coordinates = db.Column(Geometry(geometry_type='POINT', srid=4326))
    city_id = db.Column(db.Integer, db.ForeignKey('city.id'))
    is_active = db.Column(db.Boolean, default=True)
    last_updated = db.Column(db.DateTime)

# JSON с городами
CITIES_DATA = [
    {
        "id": 1,
        "name": "Москва",
        "center": [55.751244, 37.618423],
        "bbox": [[55.573, 37.370], [55.916, 37.856]]
    }
]

@app.route('/api/cities', methods=['GET'])
def get_cities():
    """Получение списка доступных городов"""
    return jsonify(CITIES_DATA)

@app.route('/api/analysis', methods=['GET'])
def get_analysis():
    """Основной метод анализа данных"""
    cache_key = str(request.args)
    if cache_key in cache:
        return jsonify(cache[cache_key])

    try:
        city_id = int(request.args.get('cityId'))
        radius = float(request.args.get('radius', 1))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid parameters"}), 400

    city = next((c for c in CITIES_DATA if c['id'] == city_id), None)
    if not city:
        return jsonify({"error": "City not found"}), 404

    # Поиск конкурентов в радиусе
    competitors = get_competitors(city['center'], radius)
    
    # Расчет средней аренды
    avg_rent = calculate_avg_rent(city_id)
    
    # Формирование ответа
    result = {
        "stats": {
            "competitors": len(competitors),
            "avg_rent": avg_rent
        },
        "heatmap": generate_heatmap_data(city_id),
        "competitors": competitors
    }
    
    cache[cache_key] = result
    return jsonify(result)

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

if __name__ == '__main__':
    app.run(debug=True)
