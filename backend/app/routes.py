from flask import Blueprint, jsonify, request
from app.models import (
    City,
    Organization,
    CianListing,
    Category,
    Hexagon,
    CityBound,
    User,
)
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from . import login_manager
from .extensions import db
import math
from shapely.wkb import loads as load_wkb
from shapely.geometry import mapping
from geoalchemy2.shape import to_shape
import h3
from app.models import Hexagon, Organization

main_bp = Blueprint("main", __name__)


@main_bp.route("/api/cities", methods=["GET"])
def get_cities():
    """Получение списка доступных городов"""
    cities = City.query.all()

    result = []
    for city in cities:
        try:
            point = load_wkb(
                bytes(city.center.data)
            )  # безопасная конвертация WKB → shapely Point

            result.append(
                {
                    "id": city.id,
                    "name": city.name,
                    "osm_name": city.osm_name,
                    "center": [point.y, point.x],  # lat, lon
                    "population": city.population,
                }
            )
        except Exception as e:
            # app.logger.error(f"Ошибка при обработке города ID={city.id}: {e}")
            continue

    print(f"Ответ: {result}")  # Логирование данных перед отправкой
    return jsonify(result)


@main_bp.route("/api/categories", methods=["GET"])
def get_categories():
    """Получение списка категорий"""
    categories = Category.query.all()

    result = []
    for category in categories:
        try:
            result.append(
                {
                    "id": category.id,
                    "name": category.name,
                }
            )
        except Exception as e:
            # app.logger.error(f"Ошибка при обработке огранизации ID={category.id}: {e}")
            continue

    print(f"Ответ: {result}")  # Логирование данных перед отправкой
    return jsonify(result[1:])


@main_bp.route("/api/analysis", methods=["GET"])
def get_analysis():
    """Основной метод анализа данных"""
    try:
        city_id = int(request.args.get("city_id"))
        category_id = int(request.args.get("category_id"))
        radius_km = float(request.args.get("radius", 1))
        rent_limit = int(request.args.get("rent", 10000))
        maxCompetitorsCount = int(request.args.get("competitors"))
        n = int(request.args.get("area_count"))

    except (TypeError, ValueError):
        return jsonify({"error": "Invalid parameters"}), 400

    city = City.query.get(city_id)
    if not city:
        return jsonify({"error": "City not found"}), 404

    rent_places = get_rental_places(city_id, rent_limit)
    competitors = get_competitors(city_id, category_id)
    hexs_geojson = get_hexs(city_id)

    radius_m = radius_km * 1000

    locations = find_top_zones(
        [geo["properties"] for geo in hexs_geojson["features"]],
        competitors,
        10,
        radius_m,
        maxCompetitorsCount,
        n,
    )

    return jsonify(
        {
            "locations": locations,  # Список найденных локаций
            "circle_radius_km": radius_km,
            "rent_places": rent_places,
            "avg_rent": calculate_avg_rent(rent_places) if rent_places else None,
            "avg_for_square": calculate_avg_cost_for_square(rent_places) if rent_places else None,
            "competitors": competitors,
            "bounds": get_bound(city_id),
            "hexs": hexs_geojson,
        }
    )


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


@main_bp.route("/register", methods=["POST"])
def register():
    if current_user.is_authenticated:
        return jsonify({"error": "Already logged in"}), 400

    data = request.json
    if User.query.filter_by(username=data["username"]).first():
        return jsonify({"error": "User already exists"}), 400

    hashed_password = generate_password_hash(data["password"])
    user = User(username=data["username"], password=hashed_password)
    db.session.add(user)
    db.session.commit()
    login_user(user)

    return jsonify({"message": "Registered!"})


@main_bp.route("/login", methods=["POST"])
def login():
    if current_user.is_authenticated:
        return jsonify({"error": "Already logged in"}), 400

    data = request.json
    user = User.query.filter_by(username=data["username"]).first()
    if user and check_password_hash(user.password, data["password"]):
        login_user(user)
        return jsonify({"message": "Logged in!"})
    return jsonify({"error": "Invalid credentials"}), 401


@main_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return jsonify({"message": "Logged out"})


@main_bp.route("/me")
def me():
    if current_user.is_authenticated:
        return jsonify({"username": current_user.username})
    return jsonify({"error": "Not logged in"}), 401


def get_competitors(city_id, category_id):
    """Получение конкурентов в заданном радиусе"""
    competitors = Organization.query.filter(
        Organization.city_id == city_id,
        Organization.categories.any(Category.id == category_id),
    ).all()

    result = []
    for competitor in competitors:
        try:
            point = load_wkb(bytes(competitor.coordinates.data))
            result.append(
                {
                    # "id": competitor.id,
                    "coordinates": [point.y, point.x],
                    "name": competitor.name,
                    "rate": competitor.rate,
                    "rate_count": competitor.rate_count,
                }
            )
        except Exception as e:
            # app.logger.warning(f"Ошибка при обработке аренды ID={competitor.id}: {e}")
            continue

    return result


def get_rental_places(city_id, rent_limit):
    """Получение мест аренды в заданном радиусе"""
    # Поиск мест аренды в радиусе
    rental_places = CianListing.query.filter(
        CianListing.city_id == city_id,
        CianListing.price <= rent_limit,  # Фильтрация по цене аренды
    ).all()

    result = []
    for rental in rental_places:
        try:
            point = load_wkb(bytes(rental.coordinates.data))
            result.append(
                {
                    "id": rental.cian_id,
                    "coordinates": [point.y, point.x],
                    "price": rental.price,
                    "total_area": rental.total_area,
                }
            )
        except Exception as e:
            # app.logger.warning(f"Ошибка при обработке аренды ID={rental.cian_id}: {e}")
            continue

    return result


def get_hexs(city_id):
    hexagons = Hexagon.query.filter_by(city_id=city_id).all()

    populations = [hex.population for hex in hexagons]
    max_pop = max(populations)
    total_pop = sum(populations)

    geojson = {
        "type": "FeatureCollection",
        "features": [],
        "max": max_pop,
        "total": total_pop,
    }
    for hex in hexagons:
        shape = to_shape(hex.geometry)  # shapely geometry
        geojson["features"].append(
            {
                "type": "Feature",
                "geometry": mapping(shape),  # converts to GeoJSON geometry
                "properties": {
                    "pop": hex.population,
                    "hex_id": hex.id,
                },
            }
        )

    return geojson


def get_bound(city_id):
    bound = CityBound.query.filter_by(city_id=city_id).first()

    if not bound:
        return jsonify({"error": "Not found"}), 404

    geojson = {
        "type": "Feature",
        "geometry": mapping(to_shape(bound.geometry)),
        "properties": {"city_id": bound.city_id},
    }

    return geojson


# Расчет средней аренды
def calculate_avg_rent(rent_places):
    return int(sum(rental["price"] for rental in rent_places) / len(rent_places))


def calculate_avg_cost_for_square(rent_places):
    valid_rentals = [r for r in rent_places if r["total_area"]]
    return int(
        sum(rental["price"] / rental["total_area"] for rental in valid_rentals)
        / len(valid_rentals)
    )


from collections import defaultdict


def find_top_zones(hexs, orgs, resolution, radius_m, max_comp, n):
    # 1. Подготовка: популяция по H3-клетке
    pop_by_cell = {hex["hex_id"]: hex["pop"] for hex in hexs}

    # 2. Сила конкурентов по клеткам
    strength_by_cell = {}
    count = defaultdict(int)
    for org in orgs:
        cell = h3.latlng_to_cell(
            org["coordinates"][0], org["coordinates"][1], resolution
        )
        rate = org.get("rate")
        rate = 1 if rate is None else rate
        rate_count = org.get("rate_count")
        rate_count = 1 if rate_count is None else rate_count
        strength_by_cell[cell] = strength_by_cell.get(cell, 0) + rate * math.log10(
            rate_count + 1
        )
        count[cell] += 1

    edge_m = h3.average_hexagon_edge_length(resolution, unit="m")
    cell_distance = edge_m * math.sqrt(3)
    k = math.ceil(radius_m / cell_distance)

    pop_get = pop_by_cell.get
    str_get = strength_by_cell.get
    count_get = count.get

    # 3. Генерация всех кандидатов
    candidates = {}
    neighbor_map = {cell: set(h3.grid_disk(cell, k)) for cell in pop_by_cell}
    for cell, neighbors in neighbor_map.items():
        # получаем все клетки и расстояния до центра
        pop_sum0 = sum(pop_get(c, 0) for c in neighbors)
        comp_strength0 = sum(str_get(c, 0) for c in neighbors)
        comp_count0 = sum(count_get(c, 0) for c in neighbors)
        # фильтруем по max_comp сразу
        if comp_count0 > max_comp:
            continue
        score0 = pop_sum0  # / (comp_strength0 + 1)
        # гео‑координаты центра
        lat, lon = h3.cell_to_latlng(cell)
        candidates[cell] = {
            "neighbors": neighbors,
            "pop_sum": pop_sum0,
            "comp_count": comp_count0,
            "comp_strength": comp_strength0,
            "score": score0,
            "center": [lat, lon],
        }

    # 5. Greedy отбор n зон

    sorted_cells = sorted(
        candidates.items(),
        key=lambda x: x[1]["pop_sum"],
        reverse=True,
    )

    selected = []
    covered = set()
    for cell, data in sorted_cells:
        if cell in covered:
            continue
        selected.append(
            {
                "comp_count": data["comp_count"],
                "center": data["center"],
                "pop_sum": data["pop_sum"],
                "comp_strength": data["comp_strength"],
            }
        )
        covered |= data["neighbors"]
        if len(selected) >= n:
            break

    return selected
