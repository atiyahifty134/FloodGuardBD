import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const userDivIcon = L.divIcon({
  className: 'user-location-marker',
  html: `
    <div class="gps-marker-wrap">
      <div class="gps-marker-pulse"></div>
      <div class="gps-marker-core"></div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

function riskIcon(score) {
  const color = score >= 85 ? '#dc2626' : score >= 70 ? '#ef4444' : score >= 40 ? '#f59e0b' : '#16a34a';
  return L.divIcon({
    className: 'risk-marker',
    html: `<div class="risk-map-marker" style="--marker-color:${color}"><span>${Math.round(score)}</span></div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22]
  });
}

function shelterDivIcon(isFull) {
  const color = isFull ? '#ef4444' : '#0f766e';
  return L.divIcon({
    className: 'shelter-marker',
    html: `<div class="shelter-map-marker" style="--shelter-color:${color}">⌂</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
}

function getRiskColor(score) {
  if (score >= 85) return '#dc2626';
  if (score >= 70) return '#ef4444';
  if (score >= 40) return '#f59e0b';
  return '#16a34a';
}

function RecenterOnLocation({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (Number.isFinite(lat) && Number.isFinite(lng)) map.flyTo([lat, lng], 10, { duration: 0.8 });
  }, [lat, lng, map]);
  return null;
}

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(event) {
      onLocationSelect?.(event.latlng.lat, event.latlng.lng, 'Selected Map Location');
    }
  });
  return null;
}

export default function LeafletMap({ userLocation, locationName, riskScore, shelters = [], highRiskAreas = [], onLocationSelect }) {
  const lat = Number(userLocation?.lat ?? 23.8103);
  const lng = Number(userLocation?.lng ?? 90.4125);
  const riskColor = getRiskColor(Number(riskScore ?? 0));
  const bufferRadiusMeters = 1500 + (Number(riskScore ?? 0) / 100) * 6500;

  return (
    <section className="panel map-panel">
      <div className="panel-header map-panel-header">
        <div>
          <span className="panel-eyebrow">LIVE GIS MAP</span>
          <h2>Bangladesh Flood Risk Map</h2>
          <p className="panel-location">📍 {locationName || userLocation?.name || 'Current location'}</p>
        </div>
        <div className="map-toolbar-badge">Click map to analyze</div>
      </div>

      <div className="map-container">
        <MapContainer center={[lat, lng]} zoom={8} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <RecenterOnLocation lat={lat} lng={lng} />
          <MapClickHandler onLocationSelect={onLocationSelect} />

          <Circle
            center={[lat, lng]}
            radius={bufferRadiusMeters}
            pathOptions={{ color: riskColor, fillColor: riskColor, fillOpacity: 0.10, weight: 2, dashArray: '7 7' }}
          />

          <Marker position={[lat, lng]} icon={userDivIcon}>
            <Popup>
              <div className="map-popup-title">{locationName || userLocation?.name || 'Current Location'}</div>
              <div className="map-popup-meta">{lat.toFixed(4)}, {lng.toFixed(4)}</div>
              <strong style={{ color: riskColor }}>Current risk: {Math.round(Number(riskScore ?? 0))}%</strong>
            </Popup>
          </Marker>

          {highRiskAreas.map((area) => {
            const score = Number(area.risk_score ?? 0);
            const color = getRiskColor(score);
            return (
              <React.Fragment key={`risk-${area.name}`}>
                <Circle
                  center={[area.lat, area.lng]}
                  radius={3500 + score * 35}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.12, weight: 1.5 }}
                />
                <Marker position={[area.lat, area.lng]} icon={riskIcon(score)}>
                  <Popup>
                    <div className="map-popup-title">{area.name}</div>
                    <div className="map-popup-meta">{area.division || 'Bangladesh'}</div>
                    <div className="risk-popup-score" style={{ color }}>Risk {Math.round(score)}% · {area.level}</div>
                    <button className="map-popup-action" onClick={() => onLocationSelect?.(area.lat, area.lng, area.name)}>Analyze this area</button>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}

          {shelters.map((shelter) => {
            const isFull = shelter.capacity != null && shelter.current_occupancy != null && shelter.current_occupancy >= shelter.capacity;
            const navUrl = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${shelter.lat},${shelter.lng}&travelmode=driving`;
            return (
              <Marker key={shelter.id} position={[shelter.lat, shelter.lng]} icon={shelterDivIcon(isFull)}>
                <Popup>
                  <div className="map-popup-title">{shelter.name}</div>
                  <div className="map-popup-meta">
                    {shelter.capacity != null && <>Capacity: {shelter.current_occupancy ?? 0} / {shelter.capacity}<br /></>}
                    {shelter.distance_km != null && <>Distance: {Number(shelter.distance_km).toFixed(1)} km</>}
                  </div>
                  <a className="map-popup-nav-btn" href={navUrl} target="_blank" rel="noopener noreferrer">🧭 Navigate</a>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <div className="map-legend">
        <span className="item"><span className="swatch current" /> Current / selected location</span>
        <span className="item"><span className="swatch high" /> High risk area</span>
        <span className="item"><span className="swatch moderate" /> Moderate risk</span>
        <span className="item"><span className="swatch shelter" /> Shelter</span>
      </div>
    </section>
  );
}
