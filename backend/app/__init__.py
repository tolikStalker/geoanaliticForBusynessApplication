from flask import Flask
from .extensions import db
from flask_cors import CORS
from flask_login import LoginManager


login_manager = LoginManager()


def create_app():
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = (
        "postgresql+psycopg2://postgres:chkaf042do@localhost/diplom"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.secret_key = "secret_key"
    app.config["SESSION_COOKIE_NAME"] = "_cookie_name"
    app.config["SESSION_TYPE"] = "filesystem"

    # Инициализация SQLAlchemy
    CORS(app, supports_credentials=True)
    db.init_app(app)
    login_manager.init_app(app)

    from .routes import main_bp

    app.register_blueprint(main_bp)

    return app
