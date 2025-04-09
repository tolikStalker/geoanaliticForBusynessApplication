from app import db
from geoalchemy2 import Geometry

class City(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    osm_name = db.Column(db.String(255), nullable=False, unique=True)
    name = db.Column(db.String(255), nullable=False)
    center = db.Column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    population = db.Column(db.Integer, nullable=False)
    organizations = db.relationship("Organization", back_populates="city")
    cian_listings = db.relationship("CianListing", back_populates="city")

