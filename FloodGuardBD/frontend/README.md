# FloodGuard BD — Frontend

Real-time flood monitoring dashboard for Bangladesh. Built with React + Vite +
Leaflet, connecting to the Flask + SQLite backend from Step 1.

## Setup

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173` by default.

**Requirement:** the Flask backend must be running at `http://127.0.0.1:5000`
with a `GET /api/flood-data?lat={lat}&lng={lng}` endpoint enabled with CORS,
returning JSON shaped like:

```json
{
  "water_level": 4.2,
  "rainfall": 12.5,
  "temperature": 29.4,
  "humidity": 78,
  "risk_score": 62,
  "shelters": [
    {
      "id": 1,
      "name": "Mirpur Community Shelter",
      "lat": 23.8041,
      "lng": 90.3654,
      "capacity": 200,
      "current_occupancy": 40,
      "distance_km": 2.3
    }
  ]
}
```

## Project structure

```
frontend/
├── package.json
├── index.html
├── vite.config.js
├── src/
│   ├── main.jsx
│   ├── index.css
│   ├── App.jsx
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── MetricCards.jsx
│   │   ├── RiskGauge.jsx
│   │   ├── LeafletMap.jsx
│   │   └── EmergencyGuide.jsx
│   └── utils/
│       └── alarm.js
```

## Notes

- Location defaults to Dhaka (23.8103, 90.4125) if geolocation is denied or
  unavailable.
- Data polls automatically every 2 minutes; the map's risk buffer circle and
  the gauge update live.
- The siren (Web Audio API, no audio files) auto-starts when `risk_score` is
  above 70 and can be silenced from the risk panel until risk drops again.
- Map tiles use CARTO's dark basemap to match the dashboard theme; shelter and
  user markers are custom SVG/div icons (no broken default Leaflet icon
  assets).
