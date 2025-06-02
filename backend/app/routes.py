from flask import Blueprint, jsonify, request, session, current_app
from app.models import (
    City,
    Category,
    User,
    AnalysisRequest,
)
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from . import login_manager
from .extensions import db
import math
import h3
import datetime
from functools import lru_cache

main_bp = Blueprint("main", __name__)

MIN_RADIUS = 0.5
MAX_RADIUS = 2.0
MIN_RENT = 0
MAX_RENT = 100000000
MIN_COMPETITORS = 1
MAX_COMPETITORS = 20
MIN_AREA_COUNT = 1
MAX_AREA_COUNT = 100


# --- Функция для валидации параметров ---
def validate_analysis_params(args):
    """
    Валидирует параметры запроса вручную.
    Возвращает кортеж: (validated_data, errors)
    validated_data: Словарь с проверенными и преобразованными данными, если нет ошибок.
    errors: Словарь с ошибками {field: message}, если есть ошибки.
    """
    errors = {}
    validated_data = {}
    required_params = [
        "city_id",
        "category_id",
        "radius",
        "rent",
        "competitors",
        "area_count",
    ]

    # 1. Проверка наличия обязательных параметров
    for param in required_params:
        if param not in args:
            errors[param] = f"Параметр '{param}' обязателен."
    if (
        errors
    ):  # Если не хватает параметров, дальше можно не проверять типы/значения для них
        return None, errors

    # 2. Проверка типов и значений
    # City ID
    try:
        city_id_val = int(args["city_id"])
        if city_id_val <= 0:
            errors["city_id"] = "ID города должен быть положительным числом."
        else:
            validated_data["city_id"] = city_id_val
    except (ValueError, TypeError):
        errors["city_id"] = "ID города должен быть целым числом."

    # Category ID
    try:
        category_id_val = int(args["category_id"])
        if category_id_val <= 0:
            errors["category_id"] = "ID категории должен быть положительным числом."
        else:
            validated_data["category_id"] = category_id_val
    except (ValueError, TypeError):
        errors["category_id"] = "ID категории должен быть целым числом."

    # Radius
    try:
        radius_val = float(args["radius"])
        if not (MIN_RADIUS <= radius_val <= MAX_RADIUS):
            errors["radius"] = (
                f"Радиус должен быть между {MIN_RADIUS} и {MAX_RADIUS} км."
            )
        else:
            validated_data["radius"] = radius_val
    except (ValueError, TypeError):
        errors["radius"] = "Радиус должен быть числом."

    # Rent
    try:
        rent_val = int(args["rent"])  # Используем int как в оригинальном коде
        if not (MIN_RENT <= rent_val <= MAX_RENT):
            errors["rent"] = (
                f"Стоимость аренды должна быть от {MIN_RENT} до {MAX_RENT}."
            )
        else:
            validated_data["rent"] = rent_val
    except (ValueError, TypeError):
        errors["rent"] = "Стоимость аренды должна быть целым числом."

    # Competitors
    try:
        competitors_val = int(args["competitors"])
        if not (MIN_COMPETITORS <= competitors_val <= MAX_COMPETITORS):
            errors["competitors"] = (
                f"Макс. кол-во конкурентов должно быть от {MIN_COMPETITORS} до {MAX_COMPETITORS}."
            )
        else:
            validated_data["competitors"] = competitors_val
    except (ValueError, TypeError):
        errors["competitors"] = "Макс. кол-во конкурентов должно быть целым числом."

    # Area Count
    try:
        area_count_val = int(args["area_count"])
        if not (MIN_AREA_COUNT <= area_count_val <= MAX_AREA_COUNT):
            errors["area_count"] = (
                f"Количество зон должно быть от {MIN_AREA_COUNT} до {MAX_AREA_COUNT}."
            )
        else:
            validated_data["area_count"] = area_count_val
    except (ValueError, TypeError):
        errors["area_count"] = "Количество зон должно быть целым числом."

    if errors:
        return None, errors
    else:
        return validated_data, None


@main_bp.after_request
def after_request_set_secure_headers(response):
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https://raw.githubusercontent.com https://cdnjs.cloudflare.com; "
        "connect-src 'self' http://localhost:5000; "
        "font-src 'self'; "
    )
    return response


@main_bp.before_request
def before_request_handler():
    session.permanent = True

    if current_user.is_authenticated:
        now = datetime.datetime.now(datetime.timezone.utc)
        last_activity_str = session.get("last_activity")

        if last_activity_str:
            try:
                last_activity = datetime.datetime.fromisoformat(last_activity_str)
                inactivity_duration = now - last_activity
                max_inactivity = current_app.permanent_session_lifetime

                if inactivity_duration > max_inactivity:
                    logout_user()
                    session.clear()
                    return
            except (ValueError, TypeError):
                logout_user()
                session.clear()
                return

        session["last_activity"] = now.isoformat()


@main_bp.route("/api/history", methods=["GET"])
@login_required  # Обязательно для получения истории текущего пользователя
def get_analysis_history():
    """Получение истории запросов анализа для текущего пользователя"""
    try:
        user_history = (
            AnalysisRequest.query.filter_by(user_id=current_user.id)
            .order_by(AnalysisRequest.created_at.desc())
            .limit(10)
            .all()
        )

        history_list = [item.to_dict() for item in user_history]

        return jsonify(history_list)

    except Exception as e:
        current_app.logger.error(
            f"Error fetching history for user {current_user.id}: {e}"
        )
        return jsonify({"message": "Не удалось получить историю запросов."}), 500


@lru_cache()
def get_cities_cached():
    from app.models import City
    from shapely.wkb import loads as load_wkb
    from flask import current_app

    cities = City.query.all()
    result = []
    for city in cities:
        try:
            point = load_wkb(bytes(city.center.data))
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
            current_app.logger.error(f"Ошибка при обработке города ID={city.id}: {e}")
            continue
    return result


@lru_cache()
def get_categories_cached():
    from app.models import Category
    from flask import current_app

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
            current_app.logger.error(
                f"Ошибка при обработке категории ID={category.id}: {e}"
            )
            continue
    return result[1:]


@main_bp.route("/api/cities", methods=["GET"])
def get_cities():
    result = get_cities_cached()
    print(f"Ответ: {result}")
    return jsonify(result)


@main_bp.route("/api/categories", methods=["GET"])
def get_categories():
    result = get_categories_cached()
    print(f"Ответ: {result}")
    return jsonify(result)


@lru_cache(maxsize=512)
def compute_analysis(
    city_id, category_id, radius_km, rent_limit, max_competitors_count, n_areas
):
    rent_places = get_rental_places(city_id, rent_limit)
    competitors = get_competitors(city_id, category_id)
    hexs_geojson = get_hexs(city_id)
    radius_m = radius_km * 1000

    locations = find_top_zones(
        [geo["properties"] for geo in hexs_geojson["features"]],
        competitors,
        10,
        radius_m,
        max_competitors_count,
        n_areas,
    )

    for i, location in enumerate(locations):
        location["id"] = i

    return {
        "locations": locations,  # Список найденных локаций
        "circle_radius_km": radius_km,
        "rent_places": rent_places,
        "avg_rent": calculate_avg_rent(rent_places) if rent_places else None,
        "avg_for_square": (
            calculate_avg_cost_for_square(rent_places) if rent_places else None
        ),
        "competitors": competitors,
        "bounds": get_bound(city_id),
        "hexs": hexs_geojson,
    }


@main_bp.route("/api/analysis", methods=["GET"])
@login_required
def get_analysis():
    """Основной метод анализа данных"""
    validated_data, validation_errors = validate_analysis_params(request.args)
    if validation_errors:
        return (
            jsonify(
                {
                    "message": "Ошибка валидации параметров запроса.",
                    "errors": validation_errors,
                }
            ),
            400,
        )

    city_id = validated_data["city_id"]
    category_id = validated_data["category_id"]
    radius_km = validated_data["radius"]
    rent_limit = validated_data["rent"]
    max_competitors_count = validated_data["competitors"]
    n_areas = validated_data["area_count"]
    current_app.logger.info(
        f"User ID: {current_user.id}, City ID: {city_id}, Category ID: {category_id}"
    )
    city = db.session.get(City, city_id)
    if not city:
        return jsonify({"message": f"Город с ID {city_id} не найден."}), 404

    category = db.session.get(Category, category_id)
    if not category:
        return jsonify({"message": f"Категория с ID {category_id} не найдена."}), 404

    result = compute_analysis(
        city_id, category_id, radius_km, rent_limit, max_competitors_count, n_areas
    )

    try:
        history_entry = AnalysisRequest(
            user_id=current_user.id,
            city_id=city_id,
            category_id=category_id,
            radius=validated_data["radius"],
            rent=validated_data["rent"],
            max_competitors=validated_data["competitors"],
            area_count=validated_data["area_count"],
        )
        db.session.add(history_entry)
        db.session.commit()
    except Exception as e:
        db.session.rollback()  # Откатываем транзакцию в случае ошибки сохранения
        current_app.logger.error(
            f"Failed to save analysis history for user {current_user.id}: {e}"
        )

    return jsonify(result)


@login_manager.unauthorized_handler
def unauthorized():
    return jsonify({"error": "Unauthorized"}), 401


@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))


import re

USERNAME_REGEX = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")


@main_bp.route("/register", methods=["POST"])
def register():
    current_app.logger.warning(f"Current user: {current_user.is_authenticated}")
    if current_user.is_authenticated:
        return jsonify({"error": "Already logged in"}), 400

    data = request.json
    username = data.get("username")
    password = data.get("password")

    current_app.logger.warning(f"Username: {username}")
    current_app.logger.warning(
        f"User exists: {User.query.filter_by(username=username).first()}"
    )

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    if not USERNAME_REGEX.match(username):
        return jsonify({"error": "Invalid username format"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password too short"}), 400

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

    if not user:
        current_app.logger.warning(f"Login failed for user: {data['username']}")
        return jsonify({"error": "User does not exist"}), 404

    if check_password_hash(user.password, data["password"]):
        login_user(user)
        session["last_activity"] = datetime.datetime.now(
            datetime.timezone.utc
        ).isoformat()
        return jsonify({"message": "Logged in!"})

    current_app.logger.warning(f"Login failed for user: {data['username']}")
    return jsonify({"error": "Incorrect password"}), 401


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


from sqlalchemy import func


@lru_cache(maxsize=128)
def get_competitors(city_id, category_id):
    from app.models import Organization, Category
    from sqlalchemy import func

    """Получение конкурентов в заданном радиусе"""
    query = db.session.query(
        func.ST_Y(Organization.coordinates).label("lat"),
        func.ST_X(Organization.coordinates).label("lon"),
        Organization.name,
        Organization.rate,
        Organization.rate_count,
        Organization.strength.label("strength")
    ).filter(
        Organization.city_id == city_id,
        Organization.categories.any(Category.id == category_id),
        
    )

    competitors_data = query.all()

    result = []
    for comp_data in competitors_data:
        try:
            result.append(
                {
                    "coordinates": [comp_data.lat, comp_data.lon],
                    "name": comp_data.name,
                    "strength": comp_data.strength,
                    'rate': comp_data.rate,
                    'rate_count':comp_data.rate_count
                }
            )
        except Exception as e:
            current_app.logger.warning(f"Ошибка при обработке конкурента: {e}")
            continue

    return result


@lru_cache(maxsize=32)
def get_rental_places(city_id, rent_limit):
    from app.models import CianListing
    from sqlalchemy import func
    from flask import current_app

    """Получение мест аренды в заданном радиусе"""
    query = db.session.query(
        func.ST_Y(CianListing.coordinates).label("lat"),
        func.ST_X(CianListing.coordinates).label("lon"),
        CianListing.cian_id,
        CianListing.price,
        CianListing.total_area,
    ).filter(
        CianListing.city_id == city_id,
        CianListing.price <= rent_limit,
    )

    rent_data = query.all()

    result = []
    for rental in rent_data:
        try:
            result.append(
                {
                    "id": rental.cian_id,
                    "coordinates": [rental.lat, rental.lon],
                    "price": rental.price,
                    "total_area": rental.total_area,
                }
            )
        except Exception as e:
            current_app.logger.warning(
                f"Ошибка при обработке аренды ID={rental.cian_id}: {e}"
            )
            continue

    return result


import json


@lru_cache(maxsize=32)
def get_hexs(city_id):
    from app.models import Hexagon
    from sqlalchemy import func
    from flask import current_app

    query = db.session.query(
        Hexagon.population,
        Hexagon.id.label("hex_id"),
        func.ST_AsGeoJSON(Hexagon.geometry).label("geometry_geojson_str"),
    ).filter(Hexagon.city_id == city_id)

    hex_rows = query.all()
    features = []
    populations_for_stats = []

    for row in hex_rows:
        try:
            geometry_dict = json.loads(row.geometry_geojson_str)

            features.append(
                {
                    "type": "Feature",
                    "geometry": geometry_dict,
                    "properties": {
                        "pop": row.population,
                        "hex_id": row.hex_id,
                    },
                }
            )
            if row.population is not None:  # Для корректного расчета max/sum
                populations_for_stats.append(row.population)
        except Exception as e:
            current_app.logger.error(
                f"Ошибка при обработке гексагона (id: {row.hex_id if hasattr(row, 'hex_id') else 'N/A'}): {e}"
            )
            continue

    stats_query = db.session.query(
        func.max(Hexagon.population).label("max_pop"),
        func.sum(Hexagon.population).label("total_pop"),
    ).filter(Hexagon.city_id == city_id)
    stats_result = stats_query.one()

    geojson_result = {
        "type": "FeatureCollection",
        "features": features,
        "max": (
            stats_result.max_pop
            if stats_result and stats_result.max_pop is not None
            else 0
        ),
        "total": (
            stats_result.total_pop
            if stats_result and stats_result.total_pop is not None
            else 0
        ),
    }

    return geojson_result


@lru_cache(maxsize=32)
def get_bound(city_id):
    from app.models import CityBound
    from sqlalchemy import func
    import json

    bound_geojson_str = (
        db.session.query(func.ST_AsGeoJSON(CityBound.geometry))
        .filter(CityBound.city_id == city_id)
        .scalar()
    )

    if not bound_geojson_str:
        return None

    return {
        "type": "Feature",
        "geometry": json.loads(bound_geojson_str),
        "properties": {"city_id": city_id},
    }


# Расчет средней аренды
def calculate_avg_rent(rent_places):
    if not rent_places:
        return 0
    return int(sum(rental["price"] for rental in rent_places) / len(rent_places))


def calculate_avg_cost_for_square(rent_places):
    valid_rentals = [r for r in rent_places if r.get("total_area")]
    if not valid_rentals:
        return 0

    return int(
        sum(rental["price"] / rental["total_area"] for rental in valid_rentals)
        / len(valid_rentals)
    )


from collections import defaultdict


def find_top_zones(hexs, orgs, resolution, radius_m, max_comp, n):
    # 1. Подготовка: популяция по H3-клетке
    pop_by_cell = {h["hex_id"]: h["pop"] for h in hexs}

    # 2. Сила конкурентов по гексам
    strength_by_cell = defaultdict(float)
    count = defaultdict(int)
    for org in orgs:
        lat, lon = org["coordinates"]
        cell = h3.latlng_to_cell(lat, lon, resolution)
        strength_by_cell[cell] += org.get("strength") or 0
        count[cell] += 1

    hex_ids = set(pop_by_cell) | set(strength_by_cell)
    hex_ids = list(hex_ids)
    edge_m = h3.average_hexagon_edge_length(resolution, unit="m")
    cell_distance = edge_m * math.sqrt(3)
    k = math.ceil(((radius_m-cell_distance/2) / cell_distance))

    @lru_cache(maxsize=8192)
    def cached_grid_disk(cell, k):
        return set(h3.grid_disk(cell, k))

    neighbor_map = {cell: cached_grid_disk(cell, k) for cell in hex_ids}

    # 3. Генерация всех кандидатов
    candidates = []
    for cell in hex_ids:
        neighbors = neighbor_map[cell]
        pop_sum = sum(pop_by_cell.get(c, 0) for c in neighbors)
        comp_strength = sum(strength_by_cell.get(c, 0) for c in neighbors)
        comp_count = sum(count.get(c, 0) for c in neighbors)
        avg_strength = comp_strength / (comp_count or 1)
        if comp_count > max_comp:
            continue
        alpha = 0.01
        score = pop_sum / (1 + alpha * avg_strength)
        lat, lon = h3.cell_to_latlng(cell)
        candidates.append(
            {
                "cell": cell,
                "neighbors": neighbors,
                "pop_sum": pop_sum,
                "comp_count": comp_count,
                "comp_strength": comp_strength,
                "score": score,
                "center": [lat, lon],
            }
        )

    candidates.sort(key=lambda x: x["score"], reverse=True)
    selected = []
    covered = set()
    for cand in candidates:
        if cand["cell"] in covered:
            continue
        selected.append(
            {
                "comp_count": int(cand["comp_count"]),
                "center": [float(cand["center"][0]), float(cand["center"][1])],
                "pop_sum": int(cand["pop_sum"]),
                "comp_strength": float(cand["comp_strength"]),
            }
        )
        covered |= cand["neighbors"]
        if len(selected) >= n:
            break

    return selected
