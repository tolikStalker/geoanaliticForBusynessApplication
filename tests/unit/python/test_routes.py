import pytest
from app.routes import validate_analysis_params
from unittest.mock import (
    patch,
)  # Для мокирования гео-функций, если SQLite без SpatiaLite
from app.models import AnalysisRequest, City, Category  # и другие, если нужно


def test_validate_missing_params():
    data, errors = validate_analysis_params({})
    assert data is None
    assert "city_id" in errors and "category_id" in errors


def test_validate_good_params():
    args = {
        "city_id": "1",
        "category_id": "2",
        "radius": "0.5",
        "rent": "10000",
        "competitors": "3",
        "area_count": "5",
    }
    data, errors = validate_analysis_params(args)
    assert errors is None
    assert data["city_id"] == 1
    assert pytest.approx(data["radius"]) == 0.5


from run import check_db_connection


def test_db_connect_prints_success(capsys):
    check_db_connection()
    captured = capsys.readouterr()
    assert "Подключение к базе данных успешно." in captured.out


def test_get_cities(client, sample_city):
    with patch("app.routes.load_wkb") as mock_load_wkb:

        class MockPoint:
            def __init__(self, x, y):
                self.x = x
                self.y = y

        mock_load_wkb.return_value = MockPoint(x=0.0, y=0.0)

        response = client.get("/api/cities")
        assert response.status_code == 200
        data = response.json
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["id"] == sample_city.id
        assert data[0]["name"] == sample_city.name
        assert data[0]["center"] == [0.0, 0.0]


def test_get_cities_empty(client, db_session):
    response = client.get("/api/cities")
    assert response.status_code == 200
    assert response.json == []


def test_get_categories(client, db_session, sample_category):
    cat2 = Category(id=2, name="Another Category")
    db_session.add(cat2)
    db_session.commit()

    response = client.get("/api/categories")
    assert response.status_code == 200
    data = response.json
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["id"] == cat2.id
    assert data[0]["name"] == cat2.name


def test_get_analysis_history_authenticated_empty(logged_in_client):
    response = logged_in_client.get("/api/history")
    assert response.status_code == 200
    assert response.json == []


def test_get_analysis_history_with_data(
    logged_in_client, db_session, test_user, sample_city, sample_category
):
    req1 = AnalysisRequest(
        user_id=test_user.id,
        city_id=sample_city.id,
        category_id=sample_category.id,
        radius=1.0,
        rent=1000,
        max_competitors=5,
        area_count=3,
    )
    db_session.add(req1)
    db_session.commit()

    response = logged_in_client.get("/api/history")
    assert response.status_code == 200
    data = response.json
    assert len(data) == 1
    assert data[0]["user_id"] == test_user.id
    assert data[0]["city_id"] == sample_city.id


def test_get_analysis_validation_error(logged_in_client):
    response = logged_in_client.get("/api/analysis?city_id=1")
    assert response.status_code == 400
    data = response.json
    assert "message" in data
    assert "errors" in data
    assert "category_id" in data["errors"]


def test_get_analysis_city_not_found(logged_in_client):
    valid_params = (
        "city_id=999&category_id=1&radius=1&rent=10000&competitors=5&area_count=5"
    )
    response = logged_in_client.get(f"/api/analysis?{valid_params}")
    assert response.status_code == 404
    assert response.json["message"] == "Город с ID 999 не найден."


def test_get_analysis_category_not_found(logged_in_client, sample_city):
    valid_params = f"city_id={sample_city.id}&category_id=999&radius=1&rent=10000&competitors=5&area_count=5"
    response = logged_in_client.get(f"/api/analysis?{valid_params}")
    assert response.status_code == 404
    assert response.json["message"] == "Категория с ID 999 не найдена."


@patch("app.routes.load_wkb")
@patch("app.routes.to_shape")
def test_get_analysis_success(
    mock_to_shape,
    mock_load_wkb,
    logged_in_client,
    db_session,
    test_user,
    sample_city,
    sample_category,
    sample_hexagon,
    sample_cian_listing,
    sample_organization,
    sample_city_bound,
):

    class MockShapelyGeom:
        def __init__(self, x=None, y=None, coords=None):
            self.x = x
            self.y = y
            self._coords = coords

        @property
        def __geo_interface__(self):
            if hasattr(self, "x") and self.x is not None:
                return {"type": "Point", "coordinates": (self.x, self.y)}
            return {
                "type": "Polygon",
                "coordinates": [[(0, 0), (1, 0), (1, 1), (0, 1), (0, 0)]],
            }

    mock_load_wkb.return_value = MockShapelyGeom(x=0.0, y=0.0)
    mock_to_shape.return_value = MockShapelyGeom()

    params = {
        "city_id": sample_city.id,
        "category_id": sample_category.id,
        "radius": "1.0",
        "rent": "100000",
        "competitors": "10",
        "area_count": "3",
    }

    response = logged_in_client.get("/api/analysis", query_string=params)
    assert response.status_code == 200
    data = response.json

    assert data["user"] == test_user.id
    assert "locations" in data
    assert isinstance(data["locations"], list)
    assert "rent_places" in data
    assert isinstance(data["rent_places"], list)
    if data["rent_places"]:
        assert len(data["rent_places"]) == 1
        assert data["rent_places"][0]["id"] == sample_cian_listing.cian_id
        assert data["avg_rent"] is not None
        assert data["avg_for_square"] is not None

    assert "competitors" in data
    assert isinstance(data["competitors"], list)
    if data["competitors"]:
        assert len(data["competitors"]) == 1
        assert data["competitors"][0]["name"] == sample_organization.name

    assert "bounds" in data
    assert data["bounds"]["properties"]["city_id"] == sample_city.id

    assert "hexs" in data
    assert data["hexs"]["type"] == "FeatureCollection"
    assert len(data["hexs"]["features"]) == 1
    assert data["hexs"]["features"][0]["properties"]["hex_id"] == sample_hexagon.id

    history_entry = AnalysisRequest.query.filter_by(user_id=test_user.id).first()
    assert history_entry is not None
    assert history_entry.city_id == sample_city.id
    assert history_entry.radius == 1.0
