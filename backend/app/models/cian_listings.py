from app import db
from geoalchemy2 import Geometry
from sqlalchemy import func

class CianListing(db.Model):
    __tablename__ = "cian_listings"

    cian_id = db.Column(db.BigInteger, primary_key=True)
    city_id = db.Column(db.Integer, db.ForeignKey("city.id"), nullable=False)
    coordinates = db.Column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    price = db.Column(db.Integer, nullable=False)
    total_area = db.Column(db.Float)
    last_updated = db.Column(db.TIMESTAMP, server_default=func.now())
    city = db.relationship("City", back_populates="cian_listings")
