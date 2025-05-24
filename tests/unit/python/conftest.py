import pytest
from app import create_app
from app.extensions import db
from datetime import datetime, timedelta
from app.models import User, City, Category, Hexagon, CityBound, CianListing, Organization, AnalysisRequest
from werkzeug.security import generate_password_hash


@pytest.fixture(scope='function')
def app():
    app = create_app()
    app.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        'WTF_CSRF_ENABLED': False, 
        'LOGIN_DISABLED': False, 
        'SECRET_KEY': 'test_secret_key',
        'PERMANENT_SESSION_LIFETIME': timedelta(minutes=5)     
        })
    with app.app_context():
        db.create_all()
        yield app
        
    with app.app_context():
        db.drop_all()

@pytest.fixture(scope='function')
def client(app):
    """Тестовый клиент для приложения."""
    return app.test_client()


@pytest.fixture(scope='function') 
def db_session(app):
    """Предоставляет сессию базы данных для тестов с автоматическим откатом."""
    with app.app_context():
        connection = db.engine.connect()
        transaction = connection.begin()
        db.session.begin_nested() 

        yield db.session

        db.session.rollback()
        transaction.rollback()
        connection.close()
        db.session.remove() # Важно для очистки сессии

@pytest.fixture
def test_user(db_session):
    """Создает тестового пользователя."""
    user = User(username='testuser', password=generate_password_hash('password'))
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def logged_in_client(client, test_user):
    """Клиент с залогиненным тестовым пользователем."""
    client.post('/login', json={'username': 'testuser', 'password': 'password'})
    return client

# Фикстуры для создания тестовых данных
@pytest.fixture
def sample_city(db_session):
    city = City(id=1, name="Test City", osm_name="TestOsmCity", center=f'SRID=4326;POINT(0 0)', population=100000)
    # Вместо f'SRID=4326;POINT(0 0)' можно использовать WKBElement если знаете как его сформировать для вашей БД
    # from sqlalchemy.dialects.postgresql import WKBElement
    # city = City(id=1, name="Test City", osm_name="TestOsmCity", center=WKBElement(WKB_POINT_0_0_SRID_4326, srid=4326), population=100000)
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
    hex = Hexagon(id="89283082833ffff", city_id=sample_city.id, population=100, geometry=f'SRID=4326;POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))')
    # hex = Hexagon(id="89283082833ffff", city_id=sample_city.id, population=100, geometry=WKBElement(WKB_POLYGON_SRID_4326, srid=4326))
    db_session.add(hex)
    db_session.commit()
    return hex

@pytest.fixture
def sample_cian_listing(db_session, sample_city):
    listing = CianListing(
        cian_id=123, city_id=sample_city.id, coordinates=f'SRID=4326;POINT(0.1 0.1)',
        price=50000, total_area=50.0
    )
    db_session.add(listing)
    db_session.commit()
    return listing

@pytest.fixture
def sample_organization(db_session, sample_city, sample_category):
    org = Organization(
        name="Test Org", city_id=sample_city.id, coordinates=f'SRID=4326;POINT(0.2 0.2)',
        rate=4.5, rate_count=10
    )
    org.categories.append(sample_category)
    db_session.add(org)
    db_session.commit()
    return org

@pytest.fixture
def sample_city_bound(db_session, sample_city):
    bound = CityBound(city_id=sample_city.id, geometry=f'SRID=4326;POLYGON(( -1 -1, 2 -1, 2 2, -1 2, -1 -1))')
    db_session.add(bound)
    db_session.commit()
    return bound
