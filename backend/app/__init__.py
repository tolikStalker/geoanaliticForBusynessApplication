from flask import Flask
from .extensions import db
from flask_cors import CORS
import os

def create_app():
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = "postgresql+psycopg2://postgres:chkaf042do@localhost/diplom"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Инициализация SQLAlchemy
    db.init_app(app)
    CORS(app)

    from .routes import main_bp
    app.register_blueprint(main_bp)

    return app

