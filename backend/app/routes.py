from flask import Blueprint, jsonify, request
from app.models import City, Organization, CianListing, Category
from shapely.wkb import loads as load_wkb

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
    # cache_key = str(request.args)
    # if cache_key in cache:
    # return jsonify(cache[cache_key])

    try:
        city_id = int(request.args.get("city_id"))
        category_id = int(request.args.get("category_id"))
        radius = float(request.args.get("radius", 1))
        rent = int(request.args.get("rent", 10000))
        maxCompetitorsCount = int(request.args.get("competitors"))

    except (TypeError, ValueError):
        return jsonify({"error": "Invalid parameters"}), 400

    city = City.query.get(city_id)
    if not city:
        return jsonify({"error": "City not found"}), 404
    result = {}
    result["rent_places"] = get_rental_places(city_id, rent)
    # Расчет средней аренды
    result["avg_rent"] = calculate_avg_rent(result["rent_places"])
    # Поиск конкурентов в радиусе
    result["competitors"] = get_competitors(city_id, category_id)

    # Формирование ответа
    # result = {
    #     "stats": {"competitors": len(competitors), "avg_rent": avg_rent},
    #     "heatmap": generate_heatmap_data(city_id),
    #     "competitors": competitors,
    # }

    # cache[cache_key] = result
    return jsonify(result)


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
                    "id": competitor.id,
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


"""Расчет средней аренды"""


def calculate_avg_rent(rent_places):
    return sum(rental["price"] for rental in rent_places) / len(rent_places)


def generate_heatmap_data(city_id):
    """Генерация данных для тепловой карты (заглушка)"""
    return [[55.75, 37.61, 50], [55.76, 37.63, 30]]
