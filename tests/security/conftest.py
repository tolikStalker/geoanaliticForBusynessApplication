import pytest
from app import create_app
from app.extensions import db
from datetime import timedelta
from app.models import User, City, Category, Hexagon, CityBound, CianListing, Organization, AnalysisRequest
from werkzeug.security import generate_password_hash


@pytest.fixture(scope='function')
def app_instance(): 
    app_obj = create_app() 
    app_obj.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        'WTF_CSRF_ENABLED': False,
        'LOGIN_DISABLED': False, 
        'SECRET_KEY': 'test_secret_key',
        'PERMANENT_SESSION_LIFETIME': timedelta(minutes=5) 
    })
    with app_obj.app_context():
        db.create_all()
        yield app_obj 

    with app_obj.app_context():
        db.drop_all()

@pytest.fixture(scope='function')
def client(app_instance):
    """Тестовый клиент для приложения."""
    return app_instance.test_client()


@pytest.fixture(scope='function')
def db_session(app_instance): 
    """Предоставляет сессию базы данных для тестов с автоматическим откатом."""
    with app_instance.app_context():
        yield db.session

@pytest.fixture
def default_user_data():
    return {"username": "default_test_user", "password": "password123"}

@pytest.fixture
def create_user_in_db(db_session, default_user_data):
    """Создает пользователя в БД и возвращает его."""
    user = User(username=default_user_data["username"], password=generate_password_hash(default_user_data["password"]))
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture
def authenticated_client(client, create_user_in_db, default_user_data):
    """Аутентифицированный тестовый клиент для default_user_data."""
    response = client.post('/login', json=default_user_data)
    assert response.status_code == 200, f"Login failed: {response.json}"
    return client


@pytest.fixture
def sample_city(db_session):
    city = City(id=1, name="Test City", osm_name="TestOsmCity", center='SRID=4326;POINT(0 0)', population=100000)
    db_session.add(city)
    db_session.commit()
    return city

@pytest.fixture
def sample_category(db_session):
    category = Category(id=1, name="Test Category")
    db_session.add(category)
    db_session.commit()
    return category

@pytest.fixture
def sample_hexagon(db_session, sample_city):
    hex_obj = Hexagon(id="89283082833ffff", city_id=sample_city.id, population=100, geometry='SRID=4326;POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))')
    db_session.add(hex_obj)
    db_session.commit()
    return hex_obj

@pytest.fixture
def sample_cian_listing(db_session, sample_city):
    listing = CianListing(
        cian_id=123, city_id=sample_city.id, coordinates='SRID=4326;POINT(0.1 0.1)',
        price=50000, total_area=50.0
    )
    db_session.add(listing)
    db_session.commit()
    return listing

@pytest.fixture
def sample_organization(db_session, sample_city, sample_category):
    org = Organization(
        name="Test Org", city_id=sample_city.id, coordinates='SRID=4326;POINT(0.2 0.2)',
        rate=4.5, rate_count=10
    )
    org.categories.append(sample_category) 
    db_session.add(org)
    db_session.commit()
    return org

@pytest.fixture
def sample_city_bound(db_session, sample_city):
    bound = CityBound(city_id=sample_city.id, geometry='SRID=4326;POLYGON(( -1 -1, 2 -1, 2 2, -1 2, -1 -1))')
    db_session.add(bound)
    db_session.commit()
    return bound
