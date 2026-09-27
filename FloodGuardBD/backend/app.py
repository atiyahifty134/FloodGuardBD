"""FloodGuard BD - Flask backend.

Provides:
- live weather data from Open-Meteo
- Bangladesh location search/reverse geocoding via Nominatim
- project flood-risk scoring
- nearest shelter lookup
- automatic highest-risk monitored-area ranking
- SQLite persistence for shelters, monitored districts and assessment logs
"""

from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
import io
import math
import os
import re
import threading

import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader
from flask import Flask, jsonify, request
from flask_cors import CORS

from database import db, Shelter, FloodLog, District, seed_database

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + os.path.join(BASE_DIR, "floodguard.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

with app.app_context():
    db.create_all()
    seed_database()

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
FFWC_RAINFALL_URL = "https://ffwc.gov.bd/app/rainfall-table"
FFWC_BULLETIN_URL = "https://api.ffwc.gov.bd/assets/uploads/fbullev.pdf"
NOMINATIM_HEADERS = {
    "User-Agent": "FloodGuardBD/2.0 (flood-risk-dashboard; contact: floodguardbd@example.com)"
}
FFWC_HEADERS = {
    "User-Agent": "FloodGuardBD/2.0 (+https://ffwc.gov.bd/)"
}
FFWC_CACHE_TTL = 120
_ffwc_cache = {"at": 0.0, "stations": {}}

# Public FFWC/BWDB station coordinates used only to choose the nearest monitored
# government gauge. Values are approximate map points; measurements themselves
# always come from FFWC/BWDB, never from these coordinates.
FFWC_STATIONS = [
    ("Sylhet", "Surma", 24.8949, 91.8687),
    ("Kanaighat", "Surma", 25.0085, 92.2570),
    ("Sunamganj", "Surma", 25.0658, 91.3950),
    ("Chattak", "Surma", 25.0460, 91.6720),
    ("Amalsid", "Kushiyara", 24.7860, 92.4270),
    ("Sheola", "Kushiyara", 24.7700, 92.2000),
    ("Fenchuganj", "Kushiyara", 24.7100, 91.9400),
    ("Sarighat", "Sarigowain", 25.1700, 92.1600),
    ("Kurigram", "Dharla", 25.8054, 89.6362),
    ("Pateswari", "Dharla", 25.7900, 89.7000),
    ("Dalia", "Teesta", 26.1200, 89.0800),
    ("Gaibandha", "Karatoa", 25.3288, 89.5281),
    ("Jamalpur", "Old Brahmaputra", 24.9375, 89.9370),
    ("Tangail", "Dhaleswari", 24.2513, 89.9167),
    ("Narsingdi", "Meghna", 23.9322, 90.7150),
    ("Dhaka", "Buriganga", 23.8103, 90.4125),
    ("Chandpur", "Meghna", 23.2330, 90.6712),
    ("Feni", "Feni", 23.0159, 91.3976),
    ("Noakhali", "Noakhali", 22.8696, 91.0995),
    ("Rajshahi", "Ganges", 24.3745, 88.6042),
    ("Faridpur", "Kumar", 23.6071, 89.8429),
]


def normalize_station_name(value):
    return re.sub(r"[^a-z0-9]+", "", str(value or "").lower())


def calculate_distance_km(lat1, lon1, lat2, lon2):
    earth_radius_km = 6371.0
    lat1_rad, lon1_rad = math.radians(lat1), math.radians(lon1)
    lat2_rad, lon2_rad = math.radians(lat2), math.radians(lon2)
    delta_lat = lat2_rad - lat1_rad
    delta_lon = lon2_rad - lon1_rad
    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(earth_radius_km * c, 2)


def resolve_location_name(lat, lon):
    try:
        response = requests.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={"format": "json", "lat": lat, "lon": lon, "zoom": 10, "addressdetails": 1},
            headers=NOMINATIM_HEADERS,
            timeout=5,
        )
        response.raise_for_status()
        address = response.json().get("address", {})
        return (
            address.get("city")
            or address.get("town")
            or address.get("municipality")
            or address.get("county")
            or address.get("state_district")
            or address.get("suburb")
            or f"GPS ({round(lat, 3)}, {round(lon, 3)})"
        )
    except requests.RequestException as exc:
        print(f"[WARNING] Reverse geocoding failed: {exc}")
        return f"GPS ({round(lat, 3)}, {round(lon, 3)})"


def fetch_weather_data(latitude, longitude, include_forecast=True):
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,relative_humidity_2m",
        "timezone": "Asia/Dhaka",
    }
    if include_forecast:
        params.update({
            "hourly": "precipitation",
            "daily": "precipitation_sum",
            "forecast_days": 7,
            "past_days": 1,
        })
    try:
        response = requests.get(OPEN_METEO_URL, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as error:
        print(f"[ERROR] Weather request failed for {latitude},{longitude}: {error}")
        return None


def _download(url, timeout=15):
    response = requests.get(url, headers=FFWC_HEADERS, timeout=timeout)
    response.raise_for_status()
    return response


def _parse_rainfall_html(html):
    """Parse the public FFWC rainfall table; last numeric daily column is today's reading."""
    soup = BeautifulSoup(html, "html.parser")
    parsed = {}
    for table in soup.find_all("table"):
        for row in table.find_all("tr"):
            cells = [cell.get_text(" ", strip=True) for cell in row.find_all(["th", "td"])]
            if len(cells) < 3:
                continue
            name = cells[0].strip()
            if not name or name.lower() in {"location", "station", "rainfall"}:
                continue
            numbers = []
            for value in cells[2:]:
                match = re.search(r"[-+]?\d+(?:\.\d+)?", value.replace(",", ""))
                if match:
                    try:
                        numbers.append(float(match.group(0)))
                    except ValueError:
                        pass
            if numbers:
                parsed[normalize_station_name(name)] = {
                    "station": name,
                    "rainfall_mm": round(max(numbers[-1], 0), 2),
                    "rainfall_source": "FFWC/BWDB rainfall table",
                }
    return parsed


def _extract_pdf_text(content):
    reader = PdfReader(io.BytesIO(content))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _parse_waterlevel_pdf(content):
    """Parse the current FFWC river bulletin rows.

    The bulletin's common row shape is:
    SL, RIVER, STATION, DANGER LEVEL, YESTERDAY WL, TODAY WL, RISE/FALL, BELOW/ABOVE.
    We use the final five numeric fields so the optional serial number does not
    affect extraction.
    """
    text = _extract_pdf_text(content)
    parsed = {}
    for line in text.splitlines():
        cleaned = re.sub(r"\s+", " ", line).strip()
        if not cleaned:
            continue
        numbers = []
        for token in re.findall(r"[-+]?\d+(?:\.\d+)?", cleaned):
            try:
                numbers.append(float(token))
            except ValueError:
                pass
        if len(numbers) < 5:
            continue
        for station_name, river, *_ in FFWC_STATIONS:
            if normalize_station_name(station_name) not in normalize_station_name(cleaned):
                continue
            danger, yesterday, today, rise_fall, delta = numbers[-5:]
            if not (0 <= danger <= 30 and -10 <= yesterday <= 30 and -10 <= today <= 30):
                continue
            key = normalize_station_name(station_name)
            parsed[key] = {
                "station": station_name,
                "river": river,
                "water_level_m": round(today, 2),
                "previous_water_level_m": round(yesterday, 2),
                "danger_level_m": round(danger, 2),
                "rise_fall_cm": round(rise_fall, 1),
                "danger_delta_cm": round(delta, 1),
                "water_source": "FFWC/BWDB river bulletin",
            }
            break
    return parsed


def fetch_ffwc_snapshot(force=False):
    """Fetch public BWDB/FFWC observed rainfall and river-gauge data.

    The official FFWC API exists, but its developer documentation is registration-gated.
    This public adapter therefore uses the official public rainfall table and current
    FFWC bulletin PDF. If the user later has API credentials, the adapter can be
    replaced without changing the dashboard contract.
    """
    now = datetime.utcnow().timestamp()
    if not force and _ffwc_cache["stations"] and now - _ffwc_cache["at"] < FFWC_CACHE_TTL:
        return _ffwc_cache["stations"]

    rainfall = {}
    water = {}
    errors = []
    try:
        rainfall_response = _download(FFWC_RAINFALL_URL)
        rainfall = _parse_rainfall_html(rainfall_response.text)
    except Exception as exc:
        errors.append(f"rainfall: {exc}")

    try:
        bulletin_response = _download(FFWC_BULLETIN_URL)
        water = _parse_waterlevel_pdf(bulletin_response.content)
    except Exception as exc:
        errors.append(f"water-level: {exc}")

    stations = {}
    for station_name, river, lat, lng in FFWC_STATIONS:
        key = normalize_station_name(station_name)
        item = {
            "station": station_name,
            "river": river,
            "lat": lat,
            "lng": lng,
        }
        item.update(rainfall.get(key, {}))
        item.update(water.get(key, {}))
        if "rainfall_mm" in item or "water_level_m" in item:
            stations[key] = item

    if errors:
        print("[WARNING] FFWC adapter:", " | ".join(errors))
    _ffwc_cache["at"] = now
    _ffwc_cache["stations"] = stations
    return stations


def nearest_ffwc_station(latitude, longitude, snapshot=None):
    snapshot = snapshot if snapshot is not None else fetch_ffwc_snapshot()
    candidates = []
    for key, item in snapshot.items():
        distance = calculate_distance_km(latitude, longitude, item["lat"], item["lng"])
        candidates.append((distance, item))
    if not candidates:
        return None
    candidates.sort(key=lambda pair: pair[0])
    distance, item = candidates[0]
    result = dict(item)
    result["distance_km"] = distance
    return result


def calculate_risk_score(rainfall_mm, water_level_m, danger_level_m):
    """Transparent local index; this is not an official BWDB risk score."""
    if danger_level_m and danger_level_m > 0:
        water_score = min(max(water_level_m, 0) / danger_level_m * 100, 100)
    else:
        water_score = 0
    rainfall_score = min(max(rainfall_mm, 0) / 100.0 * 100, 100)
    return round((water_score * 0.7) + (rainfall_score * 0.3))


def classify_risk(score):
    if score >= 85:
        return {"level": "SEVERE", "color": "#dc2626", "status": "Very high observed flood pressure."}
    if score >= 70:
        return {"level": "HIGH", "color": "#ef4444", "status": "High observed flood pressure. Check official warnings."}
    if score >= 40:
        return {"level": "MEDIUM", "color": "#f59e0b", "status": "Moderate observed flood pressure."}
    return {"level": "LOW", "color": "#16a34a", "status": "Observed level is below the danger threshold."}


def build_chart_data(latitude, longitude, station, weather_data):
    recent_logs = FloodLog.query.order_by(FloodLog.timestamp.desc()).limit(500).all()
    nearby_logs = [
        row for row in recent_logs
        if calculate_distance_km(latitude, longitude, row.lat, row.lng) <= 8
    ]
    nearby_logs = sorted(nearby_logs, key=lambda row: row.timestamp)[-36:]
    history = [
        {
            "timestamp": row.timestamp.isoformat(),
            "water_level": round(float(row.water_level), 2),
            "rainfall": round(float(row.rainfall), 2),
            "risk_score": int(row.risk_score),
        }
        for row in nearby_logs
    ]

    current_level = float(station.get("water_level_m") or 0) if station else 0
    danger = float(station.get("danger_level_m") or 0) if station else 0
    hourly = weather_data.get("hourly", {}) or {}
    hourly_times = hourly.get("time", []) or []
    hourly_precip = hourly.get("precipitation", []) or []
    current_time = (weather_data.get("current", {}) or {}).get("time")
    start_index = 0
    if current_time and current_time in hourly_times:
        start_index = hourly_times.index(current_time) + 1
    forecast = []
    for index in range(start_index, min(start_index + 24, len(hourly_times))):
        if index >= len(hourly_precip):
            break
        rainfall = float(hourly_precip[index] or 0)
        # Transparent 24h simulation: start from the observed FFWC gauge level and
        # apply a small response to forecast rainfall. This is a simulation, not an
        # official BWDB forecast, and is explicitly labelled as such in the UI.
        simulated = current_level + min(max(rainfall, 0) * 0.01, 0.25)
        if danger > 0:
            simulated = min(simulated, max(danger + 2, current_level + 2))
        forecast.append({
            "timestamp": hourly_times[index],
            "rainfall": round(max(rainfall, 0), 2),
            "water_level": round(simulated, 2),
        })

    daily = weather_data.get("daily", {}) or {}
    daily_times = daily.get("time", []) or []
    daily_rain = daily.get("precipitation_sum", []) or []
    daily_forecast = []
    for index, date_value in enumerate(daily_times[:7]):
        if index >= len(daily_rain):
            break
        daily_forecast.append({
            "date": date_value,
            "rainfall": round(max(float(daily_rain[index] or 0), 0), 1),
        })

    return {
        "history": history,
        "forecast": forecast,
        "daily_rainfall": daily_forecast,
        "history_source": "FFWC/BWDB observed river-gauge readings saved at each refresh",
        "forecast_source": "24h simulation from observed FFWC level + Open-Meteo precipitation forecast",
        "rainfall_forecast_source": "Open-Meteo daily precipitation forecast",
        "danger_level_m": danger,
    }

def build_area_risk(district):
    snapshot = fetch_ffwc_snapshot()
    station = nearest_ffwc_station(district.lat, district.lng, snapshot)
    if not station:
        return None
    rainfall = float(station.get("rainfall_mm") or 0)
    water_level = station.get("water_level_m")
    danger = station.get("danger_level_m")
    if water_level is None:
        return None
    score = calculate_risk_score(rainfall, float(water_level), float(danger or 0))
    risk = classify_risk(score)
    return {
        "id": district.id,
        "name": district.name,
        "division": district.division,
        "lat": district.lat,
        "lng": district.lng,
        "station": station.get("station"),
        "river": station.get("river"),
        "distance_km": station.get("distance_km"),
        "rainfall": rainfall,
        "water_level": float(water_level),
        "danger_level": float(danger or 0),
        "risk_score": score,
        "level": risk["level"],
        "color": risk["color"],
        "source": "FFWC/BWDB public observations",
    }


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "ok",
        "message": "FloodGuard BD backend is running.",
        "timestamp": datetime.utcnow().isoformat(),
    })


@app.route("/api/search-location", methods=["GET"])
def search_location():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify([])

    try:
        response = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={
                "format": "json",
                "q": query,
                "countrycodes": "bd",
                "limit": 7,
                "addressdetails": 1,
            },
            headers={**NOMINATIM_HEADERS, "Accept-Language": "en,bn"},
            timeout=7,
        )
        response.raise_for_status()
        raw = response.json()
        results = []
        for item in raw:
            address = item.get("address", {})
            short_name = (
                address.get("city")
                or address.get("town")
                or address.get("municipality")
                or address.get("county")
                or address.get("state_district")
                or item.get("display_name", "").split(",")[0]
            )
            results.append({
                "display_name": item.get("display_name", short_name),
                "short_name": short_name,
                "lat": float(item["lat"]),
                "lon": float(item["lon"]),
            })
        return jsonify(results)
    except requests.RequestException as exc:
        return jsonify({"error": "Location search failed", "details": str(exc)}), 502


@app.route("/api/shelters", methods=["GET"])
def get_shelters():
    shelters = [s.to_dict() for s in Shelter.query.all()]
    return jsonify({"count": len(shelters), "shelters": shelters})


@app.route("/api/high-risk-areas", methods=["GET"])
def high_risk_areas():
    districts = District.query.order_by(District.name.asc()).all()
    if not districts:
        return jsonify({"areas": [], "updated_at": datetime.utcnow().isoformat()})

    results = []
    # Parallel calls keep the dashboard responsive while checking multiple districts.
    with ThreadPoolExecutor(max_workers=min(6, len(districts))) as executor:
        futures = {executor.submit(build_area_risk, district): district for district in districts}
        for future in as_completed(futures):
            try:
                result = future.result()
                if result:
                    results.append(result)
            except Exception as exc:
                district = futures[future]
                print(f"[WARNING] Risk calculation failed for {district.name}: {exc}")

    results.sort(key=lambda item: item["risk_score"], reverse=True)
    return jsonify({
        "areas": results[:10],
        "monitored_count": len(districts),
        "updated_at": datetime.utcnow().isoformat(),
    })


@app.route("/api/route", methods=["GET"])
def route_to_shelter():
    """Proxy a road route request through OSRM so the browser gets route geometry without CORS issues."""
    try:
        start_lat = float(request.args.get("start_lat"))
        start_lng = float(request.args.get("start_lng"))
        end_lat = float(request.args.get("end_lat"))
        end_lng = float(request.args.get("end_lng"))
    except (TypeError, ValueError):
        return jsonify({"error": "Valid start/end coordinates are required."}), 400

    if not all([math.isfinite(start_lat), math.isfinite(start_lng), math.isfinite(end_lat), math.isfinite(end_lng)]):
        return jsonify({"error": "Coordinates must be finite numbers."}), 400

    url = f"https://router.project-osrm.org/route/v1/driving/{start_lng},{start_lat};{end_lng},{end_lat}"
    try:
        response = requests.get(url, params={"overview": "full", "geometries": "geojson", "steps": "false"}, timeout=12)
        response.raise_for_status()
        payload = response.json()
        route = (payload.get("routes") or [None])[0]
        if not route:
            raise requests.RequestException("No route returned")
        coords = [[float(lat), float(lon)] for lon, lat in route["geometry"]["coordinates"]]
        return jsonify({
            "coordinates": coords,
            "distance_km": round(route.get("distance", 0) / 1000, 2),
            "duration_min": round(route.get("duration", 0) / 60),
            "source": "OSRM",
        })
    except (requests.RequestException, KeyError, IndexError, TypeError, ValueError) as exc:
        return jsonify({"error": "Road route unavailable", "details": str(exc)}), 502


@app.route("/api/flood-data", methods=["GET", "POST"])
def flood_data():
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        lat_raw = data.get("lat") or data.get("latitude")
        lng_raw = data.get("lng") or data.get("longitude") or data.get("lon")
        location_name = data.get("location_name")
    else:
        lat_raw = request.args.get("lat")
        lng_raw = request.args.get("lng") or request.args.get("lon")
        location_name = request.args.get("location_name")

    if lat_raw is None or lng_raw is None:
        return jsonify({"error": "Missing required coordinates."}), 400

    try:
        latitude = float(lat_raw)
        longitude = float(lng_raw)
    except (TypeError, ValueError):
        return jsonify({"error": "Coordinates must be valid numbers."}), 400

    if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
        return jsonify({"error": "Coordinates out of valid geographical bounds."}), 400

    if not location_name or location_name in {"My GPS Location", "My Current GPS Location", "Selected Location"}:
        location_name = resolve_location_name(latitude, longitude)

    snapshot = fetch_ffwc_snapshot()
    station = nearest_ffwc_station(latitude, longitude, snapshot)
    if not station or station.get("water_level_m") is None:
        return jsonify({
            "error": "No current BWDB/FFWC river-gauge reading was available for the nearest monitored station.",
            "source": "FFWC/BWDB",
        }), 503

    weather_data = fetch_weather_data(latitude, longitude, include_forecast=True)
    if weather_data is None:
        return jsonify({"error": "Could not retrieve supporting weather forecast data."}), 502

    current = weather_data.get("current", {})
    rainfall_mm = float(station.get("rainfall_mm") or 0)
    water_level_m = float(station.get("water_level_m"))
    danger_level_m = float(station.get("danger_level_m") or 0)
    risk_score = calculate_risk_score(rainfall_mm, water_level_m, danger_level_m)
    risk_info = classify_risk(risk_score)

    # Persist the observed BWDB/FFWC values at each dashboard refresh. These are
    # real fetched measurements; no synthetic water level is written to SQLite.
    log_entry = FloodLog(
        lat=latitude,
        lng=longitude,
        rainfall=rainfall_mm,
        water_level=water_level_m,
        risk_score=risk_score,
    )
    db.session.add(log_entry)
    db.session.commit()

    shelters_with_distance = []
    for shelter in Shelter.query.all():
        item = shelter.to_dict()
        item["distance_km"] = calculate_distance_km(latitude, longitude, shelter.lat, shelter.lng)
        shelters_with_distance.append(item)
    shelters_with_distance.sort(key=lambda item: item["distance_km"])

    return jsonify({
        "location": {
            "name": location_name,
            "latitude": latitude,
            "longitude": longitude,
            "station": station.get("station"),
            "river": station.get("river"),
            "station_distance_km": station.get("distance_km"),
        },
        "metrics": {
            "rainfall_mm": rainfall_mm,
            "temperature_c": current.get("temperature_2m"),
            "humidity_percent": current.get("relative_humidity_2m"),
            "water_level_m": water_level_m,
            "danger_level_m": danger_level_m,
            "rise_fall_cm": station.get("rise_fall_cm"),
        },
        "risk": {
            "score": risk_score,
            "level": risk_info["level"],
            "color": risk_info["color"],
            "status": risk_info["status"],
            "method": "Local index using observed FFWC/BWDB water level vs danger level and observed station rainfall; not an official BWDB score.",
        },
        "sources": {
            "river_and_rainfall": "FFWC / Bangladesh Water Development Board",
            "temperature_humidity": "Open-Meteo",
            "forecast_rainfall": "Open-Meteo",
        },
        "log_id": log_entry.id,
        "shelters": shelters_with_distance,
        "charts": build_chart_data(latitude, longitude, station, weather_data),
        "last_updated": datetime.utcnow().isoformat(),
    })


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
