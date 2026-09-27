import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

const startIcon = L.divIcon({
  className: 'route-start-marker',
  html: '<div class="route-start-marker-core">●</div>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const shelterIcon = L.divIcon({
  className: 'route-shelter-marker',
  html: '<div class="route-shelter-marker-core">⌂</div>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

function FitRoute({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points?.length) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [35, 35], maxZoom: 13 });
  }, [map, points]);
  return null;
}

function distanceKm(a, b) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export default function EmergencyRoute({ userLocation, riskScore, shelters = [], highRiskAreas = [], onSelectShelter }) {
  const [selectedShelterId, setSelectedShelterId] = useState(null);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [routeError, setRouteError] = useState('');

  const origin = [Number(userLocation?.lat ?? 23.8103), Number(userLocation?.lng ?? 90.4125)];

  const sortedShelters = useMemo(() => {
    return [...shelters]
      .filter((s) => Number.isFinite(Number(s.lat)) && Number.isFinite(Number(s.lng)))
      .map((s) => ({ ...s, localDistance: distanceKm(origin, [Number(s.lat), Number(s.lng)]) }))
      .sort((a, b) => a.localDistance - b.localDistance);
  }, [shelters, origin[0], origin[1]]);

  const selectedShelter = sortedShelters.find((s) => s.id === selectedShelterId) || sortedShelters[0];

  useEffect(() => {
    if (selectedShelter && selectedShelter.id !== selectedShelterId) setSelectedShelterId(selectedShelter.id);
  }, [selectedShelter, selectedShelterId]);

  useEffect(() => {
    let cancelled = false;
    async function loadRoute() {
      if (!selectedShelter) return;
      setLoading(true);
      setRouteError('');
      try {
        const params = new URLSearchParams({
          start_lat: String(origin[0]),
          start_lng: String(origin[1]),
          end_lat: String(selectedShelter.lat),
          end_lng: String(selectedShelter.lng),
        });
        const response = await fetch(`${API_BASE_URL}/route?${params.toString()}`);
        if (!response.ok) throw new Error('Route service unavailable');
        const data = await response.json();
        if (!cancelled) setRoute(data);
      } catch (error) {
        if (!cancelled) {
          const end = [Number(selectedShelter.lat), Number(selectedShelter.lng)];
          setRoute({
            coordinates: [origin, end],
            distance_km: distanceKm(origin, end),
            duration_min: Math.max(5, Math.round(distanceKm(origin, end) * 2.5)),
            fallback: true,
          });
          setRouteError('Road routing service unavailable; showing a direct fallback path.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadRoute();
    return () => { cancelled = true; };
  }, [selectedShelter?.id, origin[0], origin[1]]);

  const routeRisk = Number(riskScore ?? 0) >= 70 ? 'HIGH' : Number(riskScore ?? 0) >= 40 ? 'MODERATE' : 'LOW';
  const routeColor = routeRisk === 'HIGH' ? '#ef4444' : routeRisk === 'MODERATE' ? '#f59e0b' : '#16a34a';

  const chooseShelter = (shelter) => {
    setSelectedShelterId(shelter.id);
    onSelectShelter?.(shelter);
  };

  return (
    <div className="route-page">
      <section className="page-title-row">
        <div>
          <span className="panel-eyebrow">EMERGENCY EVACUATION</span>
          <h2>Emergency Route & Safe Shelter</h2>
          <p>Find a nearby shelter and calculate a route from the selected GPS/location point.</p>
        </div>
        <span className={`route-risk-pill ${routeRisk.toLowerCase()}`}><span /> Route risk: {routeRisk}</span>
      </section>

      <div className="route-layout">
        <section className="panel route-map-panel">
          <div className="panel-header">
            <div>
              <span className="panel-eyebrow">LIVE EVACUATION MAP</span>
              <h2>Safe Shelter Route</h2>
            </div>
            {loading && <span className="panel-live-pill">CALCULATING…</span>}
          </div>
          <div className="route-map-container">
            <MapContainer center={origin} zoom={8} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitRoute points={route?.coordinates?.length ? route.coordinates : [origin]} />
              <Circle center={origin} radius={Math.max(1200, Number(riskScore ?? 0) * 60)} pathOptions={{ color: routeColor, fillColor: routeColor, fillOpacity: 0.08, dashArray: '6 6' }} />
              <Marker position={origin} icon={startIcon}>
                <Popup><strong>Current / selected location</strong><br />Risk: {Math.round(Number(riskScore ?? 0))}%</Popup>
              </Marker>
              {sortedShelters.map((shelter) => (
                <Marker key={shelter.id} position={[shelter.lat, shelter.lng]} icon={shelterIcon}>
                  <Popup>
                    <strong>{shelter.name}</strong><br />
                    {shelter.district}<br />
                    Capacity: {shelter.capacity}<br />
                    Distance: {shelter.localDistance.toFixed(1)} km<br />
                    <button className="map-popup-action" onClick={() => chooseShelter(shelter)}>Use this shelter</button>
                  </Popup>
                </Marker>
              ))}
              {highRiskAreas.slice(0, 10).map((area) => (
                <Circle key={`route-risk-${area.name}`} center={[area.lat, area.lng]} radius={2500 + Number(area.risk_score || 0) * 20} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.08, weight: 1 }} />
              ))}
              {route?.coordinates?.length > 1 && <Polyline positions={route.coordinates} pathOptions={{ color: routeColor, weight: 6, opacity: 0.88, dashArray: route.fallback ? '9 8' : undefined }} />}
            </MapContainer>
          </div>
          <div className="map-legend route-legend">
            <span className="item"><span className="swatch current" /> Start</span>
            <span className="item"><span className="swatch shelter" /> Shelter</span>
            <span className="item"><span className="swatch high" /> High-risk zone</span>
            <span className="item"><span className="route-line-swatch" style={{ background: routeColor }} /> Route</span>
          </div>
        </section>

        <aside className="route-side-column">
          <section className="panel route-summary-card">
            <div className="panel-header">
              <div><span className="panel-eyebrow">RECOMMENDED SHELTER</span><h2>{selectedShelter?.name || 'No shelter found'}</h2></div>
            </div>
            {selectedShelter ? (
              <div className="route-summary-body">
                <div className="route-stat-grid">
                  <div><small>Distance</small><strong>{Number(route?.distance_km ?? selectedShelter.localDistance).toFixed(1)} km</strong></div>
                  <div><small>ETA</small><strong>{Math.round(Number(route?.duration_min ?? 0)) || '--'} min</strong></div>
                  <div><small>Capacity</small><strong>{selectedShelter.capacity ?? '--'}</strong></div>
                  <div><small>Status</small><strong className="status-open">OPEN</strong></div>
                </div>
                <div className="route-safety-note"><span>✓</span><div><strong>Evacuation guidance</strong><p>Follow the mapped route and local authority instructions. Shelter occupancy is not live in the current dataset.</p></div></div>
                {routeError && <div className="route-fallback-note">{routeError}</div>}
              </div>
            ) : <div className="empty-risk">No shelter data is available.</div>}
          </section>

          <section className="panel shelter-choice-panel">
            <div className="panel-header"><div><span className="panel-eyebrow">NEARBY SHELTERS</span><h2>Available locations</h2></div><span className="count-chip">{sortedShelters.length}</span></div>
            <div className="shelter-choice-list">
              {sortedShelters.map((shelter, index) => (
                <button key={shelter.id} type="button" className={`shelter-choice ${selectedShelter?.id === shelter.id ? 'selected' : ''}`} onClick={() => chooseShelter(shelter)}>
                  <span className="shelter-choice-icon">⌂</span>
                  <span><strong>{index === 0 ? 'Nearest · ' : ''}{shelter.name}</strong><small>{shelter.district} · {shelter.localDistance.toFixed(1)} km · Capacity {shelter.capacity}</small></span>
                  <span className="shelter-arrow">›</span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
