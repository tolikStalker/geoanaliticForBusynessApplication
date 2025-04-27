from flask import Flask
from .extensions import db
from flask_cors import CORS
from flask_login import LoginManager
from datetime import timedelta


login_manager = LoginManager()
login_manager.login_view = "main_bp.login"

def create_app():
    app = Flask(__name__)

    app.config.from_mapping(
        DEBUG=True,
        SECRET_KEY="secret_key",
        SQLALCHEMY_DATABASE_URI="postgresql+psycopg2://postgres:chkaf042do@localhost/diplom",
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SESSION_COOKIE_NAME="_cookie_name",
        # SESSION_TYPE="filesystem",
        PERMANENT_SESSION_LIFETIME=timedelta(minutes=30),
        # SESSION_COOKIE_SECURE=True,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
    )

    # Инициализация SQLAlchemy
    CORS(app, supports_credentials=True, origins=["http://localhost:5173", "http://127.0.0.1:5173"])
    db.init_app(app)
    login_manager.init_app(app)

    from .routes import main_bp

    app.register_blueprint(main_bp)

    return app
