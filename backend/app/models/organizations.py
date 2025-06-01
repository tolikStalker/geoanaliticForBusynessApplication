from app import db
from geoalchemy2 import Geometry
from sqlalchemy import func

class Organization(db.Model):
    __tablename__ = "organizations"

    id = db.Column(db.Integer, primary_key=True)
    city_id = db.Column(db.Integer, db.ForeignKey("city.id"), nullable=False)
    name = db.Column(db.String(255), nullable=True)
    rate = db.Column(db.Float)
    rate_count = db.Column(db.Integer)
    coordinates = db.Column(Geometry(geometry_type="POINT", srid=4326))
    strength=db.Column(db.Double)
    address = db.Column(db.String(255))
    last_updated = db.Column(db.DateTime, server_default=func.now())
    city = db.relationship("City", back_populates="organizations")
    categories = db.relationship("Category", secondary="organization_categories", back_populates="organizations")

