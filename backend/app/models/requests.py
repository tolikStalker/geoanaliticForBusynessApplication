from app import db
from datetime import datetime, timezone


class AnalysisRequest(db.Model):
    __tablename__ = "analysis_requests"

    id = db.Column(db.Integer, primary_key=True)
    city_id = db.Column(db.BigInteger, db.ForeignKey("city.id"), nullable=False)
    user_id = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=False)
    category_id = db.Column(
        db.BigInteger, db.ForeignKey("categories.id"), nullable=False
    )
    radius = db.Column(db.Float, nullable=False)
    rent = db.Column(db.Integer, nullable=False)
    max_competitors = db.Column(db.Integer, nullable=False)
    area_count = db.Column(db.Integer, nullable=False)
    created_at = db.Column(
        db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    city = db.relationship("City")
    user = db.relationship("User")
    category = db.relationship("Category")

    def to_dict(self):
        return {
            "id": self.id,
            "city": self.city.name,
            "city_id": self.city_id,
            "user_id": self.user_id,
            "category": self.category.name,
            "category_id": self.category_id,
            "radius": self.radius,
            "rent": self.rent,
            "max_competitors": self.max_competitors,
            "area_count": self.area_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
