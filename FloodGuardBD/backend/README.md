# FloodGuard BD - Backend (Flask + SQLite)

This is the backend service for **FloodGuard BD**, an AI-based flood
prediction, emergency route, and shelter tracking system for Bangladesh.

It is built with:
- **Flask** - the web framework serving our REST API
- **Flask-SQLAlchemy** - the ORM that manages our SQLite database
- **Flask-CORS** - allows our React frontend to call this API
- **Requests** - used to fetch live weather data from Open-Meteo
- **Open-Meteo API** - a free, no-API-key-required weather data source

No manual database setup is required - SQLite is a serverless,
file-based database, and this app creates and seeds it automatically the
first time it runs.

---

## 1. Folder Structure

```
backend/
├── app.py               # Main Flask app & API routes
├── database.py           # SQLAlchemy models (Shelter, FloodLog) & seed data
├── requirements.txt      # Python dependencies
├── README.md             # This file
└── floodguard.db          # Created automatically on first run (SQLite file)
```

---

## 2. Prerequisites

- Python 3.9 or newer installed on your machine
- `pip` (Python's package installer), which comes bundled with Python

Check your Python version:

```bash
python --version
```

---

## 3. Setup Instructions

### Step 1 - Open a terminal in the `backend/` folder

```bash
cd backend
```

### Step 2 - Create a virtual environment

A virtual environment keeps this project's Python packages separate from
the rest of your system.

```bash
python -m venv venv
```

### Step 3 - Activate the virtual environment

**On macOS / Linux:**
```bash
source venv/bin/activate
```

**On Windows (Command Prompt):**
```bash
venv\Scripts\activate
```

**On Windows (PowerShell):**
```bash
venv\Scripts\Activate.ps1
```

You'll know it worked when you see `(venv)` appear at the start of your
terminal prompt.

### Step 4 - Install the required packages

```bash
pip install -r requirements.txt
```

### Step 5 - Run the server

```bash
python app.py
```

If everything worked, you should see output similar to:

```
[database.py] Seeded 'shelters' table with 4 initial records.
 * Running on http://127.0.0.1:5000
 * Running on http://0.0.0.0:5000
```

A new file, `floodguard.db`, will automatically appear inside the
`backend/` folder - this is your SQLite database, already created and
pre-populated with 4 Bangladeshi shelters (Kurigram, Sunamganj, Feni,
Sylhet). You do NOT need to install any separate database software.

---

## 4. API Endpoints

### `GET /api/health`
A simple check to confirm the server is running.

```bash
curl http://127.0.0.1:5000/api/health
```

### `GET /api/shelters`
Returns every shelter currently stored in the database.

```bash
curl http://127.0.0.1:5000/api/shelters
```

### `GET /api/flood-data?lat={lat}&lng={lng}`
Fetches live weather data for the given coordinates, calculates the
estimated water level and AI risk score, logs the request into the
`flood_logs` table, and returns the nearest shelters.

```bash
curl "http://127.0.0.1:5000/api/flood-data?lat=23.8103&lng=90.4125"
```

Example response shape:

```json
{
  "location": { "latitude": 23.8103, "longitude": 90.4125 },
  "metrics": {
    "rainfall_mm": 4.2,
    "temperature_c": 29.8,
    "humidity_percent": 87,
    "water_level_m": 0.63
  },
  "risk": {
    "score": 12,
    "level": "LOW",
    "color": "#10b981",
    "status": "Conditions are stable. Flood risk is currently low."
  },
  "log_id": 1,
  "shelters": [
    {
      "id": 3,
      "name": "Feni Government College Shelter",
      "district": "Feni",
      "lat": 23.0159,
      "lng": 91.3976,
      "capacity": 400,
      "contact": "+880-1711-000003",
      "distance_km": 145.02
    }
  ],
  "last_updated": "2026-09-27T10:15:30.123456"
}
```

---

## 5. Resetting the Database

If you ever want to start over with a completely fresh database (for
example, to clear out old `flood_logs` entries), simply stop the server
and delete the `floodguard.db` file:

```bash
rm floodguard.db      # macOS / Linux
del floodguard.db     # Windows
```

The next time you run `python app.py`, a brand-new database will be
created and re-seeded automatically.

---

## 6. Connecting the React Frontend

CORS is already enabled for all origins in `app.py`, so once the React
frontend (from a later step) is running - typically at
`http://localhost:5173` (Vite) or `http://localhost:3000` (Create React
App) - it can call this backend directly at `http://127.0.0.1:5000`
without any extra configuration.
