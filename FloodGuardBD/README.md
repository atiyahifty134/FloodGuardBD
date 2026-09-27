# FloodGuard BD 🌊

**FloodGuard BD – Online Flood Prediction, Risk Assessment & Emergency Route System**

A beginner/mid-level friendly full-stack project built with:

- **Frontend:** React + Vite + CSS
- **Backend:** Python + Flask
- **Map:** Leaflet + OpenStreetMap
- **Risk engine:** simple Python rule-based scoring (easy to replace with a trained ML model later)

## Features

1. Real-time-style flood dashboard
2. Location-based risk assessment
3. AI-style **AutoRisk Scanner**
4. Interactive Bangladesh map
5. Evacuation route demonstration
6. Nearby shelter recommendations
7. Emergency contacts
8. Flood alerts
9. Preparedness/essential information
10. Responsive mobile-friendly UI

> The included risk engine uses demo/sample environmental values. It is intentionally simple for a university project and is **not an official emergency warning system**. For a real deployment, connect verified government/hydrological/weather data and a trained model.

---

## Project structure

```text
FloodGuardBD/
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api.js
│       └── styles.css
├── backend/
│   ├── app.py
│   └── requirements.txt
└── README.md
```

## 1. Start the Python backend

Open a terminal:

```bash
cd backend
python -m venv venv
```

### Windows

```bash
venv\Scripts\activate
```

### macOS/Linux

```bash
source venv/bin/activate
```

Install packages:

```bash
pip install -r requirements.txt
```

Run:

```bash
python app.py
```

Backend runs at:

```text
http://127.0.0.1:5000
```

## 2. Start React frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the address shown by Vite, normally:

```text
http://localhost:5173
```

---

## Future upgrade ideas

- Connect Bangladesh Water Development Board / verified hydrological feeds
- Add weather API
- Add a real ML model using historical flood data
- Store users and alerts in MySQL/PostgreSQL
- Add admin dashboard
- Add SMS gateway
- Use a proper routing API for road-based evacuation routes
- Deploy frontend and backend separately

## Live data sources

FloodGuard BD now uses observed Bangladesh Flood Forecasting & Warning Centre (FFWC), Bangladesh Water Development Board (BWDB) public data for rainfall and river-gauge water level. Temperature/humidity and precipitation forecast are supporting Open-Meteo data.

The dashboard refreshes selected-location data every 2 minutes and monitored high-risk areas every 5 minutes. The backend caches the public FFWC snapshot for 2 minutes to avoid excessive requests.

The water-level chart records actual FFWC/BWDB observations fetched by the app. Its dashed 24-hour line is explicitly a simulation starting from the observed gauge level and using forecast precipitation; it is not presented as an official BWDB forecast.
