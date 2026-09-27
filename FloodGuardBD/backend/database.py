"""SQLite models and seed data for FloodGuard BD."""

from datetime import datetime
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()


class Shelter(db.Model):
    __tablename__ = "shelters"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    district = db.Column(db.String(100), nullable=False)
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    capacity = db.Column(db.Integer, nullable=False)
    contact = db.Column(db.String(50), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "district": self.district,
            "lat": self.lat,
            "lng": self.lng,
            "capacity": self.capacity,
            "contact": self.contact,
        }


class FloodLog(db.Model):
    __tablename__ = "flood_logs"

    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    rainfall = db.Column(db.Float, nullable=False)
    water_level = db.Column(db.Float, nullable=False)
    risk_score = db.Column(db.Integer, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat(),
            "lat": self.lat,
            "lng": self.lng,
            "rainfall": self.rainfall,
            "water_level": self.water_level,
            "risk_score": self.risk_score,
        }


class District(db.Model):
    __tablename__ = "districts"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    division = db.Column(db.String(100), nullable=False)
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)


SEED_SHELTERS = [
    {"name": "Kurigram Government Primary School Shelter", "district": "Kurigram", "lat": 25.8054, "lng": 89.6362, "capacity": 500, "contact": "+880-1711-000001"},
    {"name": "Sunamganj Model High School Shelter", "district": "Sunamganj", "lat": 25.0658, "lng": 91.3950, "capacity": 750, "contact": "+880-1711-000002"},
    {"name": "Feni Government College Shelter", "district": "Feni", "lat": 23.0159, "lng": 91.3976, "capacity": 400, "contact": "+880-1711-000003"},
    {"name": "Sylhet MAG Osmani Medical Shelter Point", "district": "Sylhet", "lat": 24.8949, "lng": 91.8687, "capacity": 600, "contact": "+880-1711-000004"},
]

# District centres used for the automatic risk-ranking panel.
# These are monitoring points, not official river-gauge observations.
SEED_DISTRICTS = [
    ("Sunamganj", "Sylhet", 25.0658, 91.3950),
    ("Sylhet", "Sylhet", 24.8949, 91.8687),
    ("Kurigram", "Rangpur", 25.8054, 89.6362),
    ("Gaibandha", "Rangpur", 25.3288, 89.5281),
    ("Nilphamari", "Rangpur", 25.9318, 88.8560),
    ("Lalmonirhat", "Rangpur", 25.9167, 89.4500),
    ("Jamalpur", "Mymensingh", 24.9375, 89.9370),
    ("Netrokona", "Mymensingh", 24.8700, 90.7270),
    ("Sherpur", "Mymensingh", 25.0200, 90.0150),
    ("Tangail", "Dhaka", 24.2513, 89.9167),
    ("Feni", "Chattogram", 23.0159, 91.3976),
    ("Noakhali", "Chattogram", 22.8696, 91.0995),
    ("Lakshmipur", "Chattogram", 22.9447, 90.8300),
    ("Chandpur", "Chattogram", 23.2330, 90.6712),
    ("Brahmanbaria", "Chattogram", 23.9571, 91.1119),
    ("Narsingdi", "Dhaka", 23.9322, 90.7150),
    ("Rajbari", "Dhaka", 23.7574, 89.6444),
    ("Faridpur", "Dhaka", 23.6071, 89.8429),
    ("Manikganj", "Dhaka", 23.8617, 90.0003),
    ("Munshiganj", "Dhaka", 23.5422, 90.5305),
]


def seed_database():
    if Shelter.query.count() == 0:
        db.session.add_all([Shelter(**item) for item in SEED_SHELTERS])
        db.session.commit()
        print(f"[database] Seeded {len(SEED_SHELTERS)} shelters.")

    existing = {row.name for row in District.query.all()}
    new_rows = []
    for name, division, lat, lng in SEED_DISTRICTS:
        if name not in existing:
            new_rows.append(District(name=name, division=division, lat=lat, lng=lng))
    if new_rows:
        db.session.add_all(new_rows)
        db.session.commit()
        print(f"[database] Seeded {len(new_rows)} monitored districts.")
