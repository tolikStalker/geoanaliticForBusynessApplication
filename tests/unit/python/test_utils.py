from app.routes import (
    validate_analysis_params,
    calculate_avg_rent,
    calculate_avg_cost_for_square,
    find_top_zones,
)
from app.routes import (
    MIN_RADIUS,
    MAX_RADIUS,
    MIN_RENT,
    MAX_RENT,
    MIN_COMPETITORS,
    MAX_COMPETITORS,
    MIN_AREA_COUNT,
    MAX_AREA_COUNT,
)


def test_validate_analysis_params_valid():
    args = {
        "city_id": "1",
        "category_id": "2",
        "radius": "2.5",
        "rent": "100000",
        "competitors": "5",
        "area_count": "10",
    }
    validated_data, errors = validate_analysis_params(args)
    assert errors is None
    assert validated_data is not None
    assert validated_data["city_id"] == 1
    assert validated_data["radius"] == 2.5


def test_validate_analysis_params_missing_required():
    args = {"city_id": "1"}
    validated_data, errors = validate_analysis_params(args)
    assert validated_data is None
    assert errors is not None
    assert "category_id" in errors
    assert "radius" in errors


def test_validate_analysis_params_invalid_type():
    args = {
        "city_id": "abc",
        "category_id": "2",
        "radius": "2.5",
        "rent": "100000",
        "competitors": "5",
        "area_count": "10",
    }
    validated_data, errors = validate_analysis_params(args)
    assert validated_data is None
    assert errors is not None
    assert "city_id" in errors
    assert errors["city_id"] == "ID города должен быть целым числом."


def test_validate_analysis_params_out_of_range_radius():
    args = {
        "city_id": "1",
        "category_id": "2",
        "radius": str(MAX_RADIUS + 1),
        "rent": "100000",
        "competitors": "5",
        "area_count": "10",
    }
    validated_data, errors = validate_analysis_params(args)
    assert validated_data is None
    assert errors is not None
    assert "radius" in errors
    assert (
        errors["radius"] == f"Радиус должен быть между {MIN_RADIUS} и {MAX_RADIUS} км."
    )


def test_calculate_avg_rent_empty():
    assert calculate_avg_rent([]) is 0


def test_calculate_avg_rent_valid():
    places = [{"price": 100}, {"price": 200}, {"price": 300}]
    assert calculate_avg_rent(places) == 200


def test_calculate_avg_cost_for_square_empty():
    assert calculate_avg_cost_for_square([]) is 0


def test_calculate_avg_cost_for_square_all_invalid():
    data = [{"price": 10000, "total_area": 0}, {"price": 5000, "total_area": None}]
    assert calculate_avg_cost_for_square(data) == 0


def test_calculate_avg_cost_for_square_valid():
    places = [
        {"price": 1000, "total_area": 10},
        {"price": 2500, "total_area": 20},
        {"price": 1500, "total_area": 15},
    ]
    assert calculate_avg_cost_for_square(places) == 108


def test_calculate_avg_cost_for_square_with_zero_area():
    places = [
        {"price": 1000, "total_area": 10},
        {"price": 2000, "total_area": 0},
        {"price": 1500, "total_area": 15},
    ]
    assert calculate_avg_cost_for_square(places) == int((1000 / 10 + 1500 / 15) / 2)
