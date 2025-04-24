from app import db
from geoalchemy2 import Geometry


class Hexagon(db.Model):
    __tablename__ = "city_hexagons"

    id = db.Column(db.String(16), primary_key=True)
    city_id = db.Column(db.Integer, db.ForeignKey("city.id"), nullable=False)
    geometry = db.Column(
        Geometry(geometry_type="POLYGON", srid=4326), nullable=False, name="geom"
    )
    population = db.Column(db.Integer)
    city = db.relationship("City", back_populates="city_hexagons")
