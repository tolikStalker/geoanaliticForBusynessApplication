from app import db
from geoalchemy2 import Geometry


class CityBound(db.Model):
    __tablename__ = "city_boundaries"
    id = db.Column(db.Integer, primary_key=True)
    city_id = db.Column(db.Integer, db.ForeignKey("city.id"), nullable=False)
    geometry = db.Column(
        Geometry(geometry_type="MULTIPOLYGON", srid=4326), nullable=False, name="geom"
    )
    city = db.relationship("City", back_populates="city_boundaries")
