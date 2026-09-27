import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header.jsx';
import MetricCards from './components/MetricCards.jsx';
import RiskGauge from './components/RiskGauge.jsx';
import LeafletMap from './components/LeafletMap.jsx';
import EmergencyGuide from './components/EmergencyGuide.jsx';
import HighRiskAreas from './components/HighRiskAreas.jsx';
import Sidebar from './components/Sidebar.jsx';
import EmergencyRoute from './components/EmergencyRoute.jsx';
import SheltersResources from './components/SheltersResources.jsx';
import AlertCenter from './components/AlertCenter.jsx';
import ResourcesPage from './components/ResourcesPage.jsx';
import Charts from './components/Charts.jsx';
import { startSiren, stopSiren } from './utils/alarm.js';

const API_BASE_URL = 'http://127.0.0.1:5000/api';
const POLL_INTERVAL_MS = 120000;
const HIGH_RISK_POLL_MS = 300000;
const DHAKA_FALLBACK = { lat: 23.8103, lng: 90.4125, name: 'Dhaka' };
const HIGH_RISK_THRESHOLD = 70;

export default function App() {
  const [userLocation, setUserLocation] = useState(null);
  const [floodData, setFloodData] = useState(null);
  const [highRiskAreas, setHighRiskAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [highRiskLoading, setHighRiskLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [alarmActive, setAlarmActive] = useState(false);
  const [alarmDismissed, setAlarmDismissed] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');

  const pollTimerRef = useRef(null);
  const highRiskTimerRef = useRef(null);
  const requestInFlightRef = useRef(false);
  const lastFetchAtRef = useRef(0);

  useEffect(() => {
    if (!navigator.geolocation) {
      setUserLocation(DHAKA_FALLBACK);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude, name: 'My Current GPS Location' }),
      () => setUserLocation(DHAKA_FALLBACK),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  const fetchFloodData = useCallback(async (lat, lng, locationName = '', { silent = false } = {}) => {
    if (requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    try {
      if (!silent) setError(null);
      if (!silent) setLoading(true);
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 20000);
      const response = await fetch(`${API_BASE_URL}/flood-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, location_name: locationName }),
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`Server responded with ${response.status}`);
      const data = await response.json();
      setFloodData(data);
      const updatedAt = data.last_updated ? new Date(data.last_updated + (data.last_updated.endsWith('Z') ? '' : 'Z')) : new Date();
      setLastUpdated(updatedAt);
      lastFetchAtRef.current = Date.now();
      setError(null);
    } catch (err) {
      console.error(err);
      setError('সার্ভারের সাথে সংযোগ করা যাচ্ছে না। Backend চালু আছে কিনা পরীক্ষা করুন।');
    } finally {
      requestInFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  const fetchHighRiskAreas = useCallback(async () => {
    try {
      setHighRiskLoading(true);
      const response = await fetch(`${API_BASE_URL}/high-risk-areas`);
      if (!response.ok) throw new Error(`High-risk API returned ${response.status}`);
      const data = await response.json();
      setHighRiskAreas(data.areas || []);
    } catch (err) {
      console.error('High-risk area error:', err);
    } finally {
      setHighRiskLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userLocation) return undefined;

    const refresh = (options = {}) => fetchFloodData(userLocation.lat, userLocation.lng, userLocation.name, options);
    refresh();

    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(() => refresh({ silent: true }), POLL_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetchAtRef.current >= POLL_INTERVAL_MS) {
        refresh({ silent: true });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [userLocation, fetchFloodData]);

  useEffect(() => {
    fetchHighRiskAreas();
    if (highRiskTimerRef.current) clearInterval(highRiskTimerRef.current);
    highRiskTimerRef.current = setInterval(fetchHighRiskAreas, HIGH_RISK_POLL_MS);
    return () => { if (highRiskTimerRef.current) clearInterval(highRiskTimerRef.current); };
  }, [fetchHighRiskAreas]);

  useEffect(() => {
    const currentScore = floodData?.risk?.score ?? 0;
    if (currentScore > HIGH_RISK_THRESHOLD && !alarmDismissed) { startSiren(); setAlarmActive(true); }
    else { stopSiren(); setAlarmActive(false); }
    if (currentScore <= HIGH_RISK_THRESHOLD && alarmDismissed) setAlarmDismissed(false);
  }, [floodData?.risk?.score, alarmDismissed]);

  useEffect(() => () => stopSiren(), []);

  const handleDismissAlarm = () => { stopSiren(); setAlarmActive(false); setAlarmDismissed(true); };
  const handleLocationSelect = useCallback((lat, lng, locationName = '') => setUserLocation({ lat, lng, name: locationName || 'Selected Location' }), []);
  const handleViewChange = (view) => { setActiveView(view); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const activeLocation = userLocation || DHAKA_FALLBACK;
  const selectedRisk = floodData?.risk?.score ?? 0;

  const renderDashboard = () => (
    <>
      {error && <div className="app-status-line is-error">⚠️ {error}</div>}
      {!error && loading && <div className="app-status-line">📡 Live BWDB/FFWC data loading... Auto-refresh: 2 min · FFWC cache: 2 min</div>}
      <section className="dashboard-summary">
        <div><span className="panel-eyebrow">LIVE FLOOD RISK ASSESSMENT</span><h2>{floodData?.location?.name || activeLocation.name}</h2><p>BWDB/FFWC river-gauge observations are refreshed every 2 minutes.</p></div>
        <div className="summary-live-meta">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'})}` : 'Waiting for live data'} · Auto-refresh 2 min</div><div className="summary-score" data-risk={selectedRisk >= 70 ? 'high' : selectedRisk >= 40 ? 'medium' : 'low'}><span>Current Risk</span><strong>{loading ? '--' : `${Math.round(selectedRisk)}%`}</strong></div>
      </section>
      <div className="dashboard-grid">
        <div className="map-column">
          <LeafletMap userLocation={activeLocation} locationName={floodData?.location?.name} riskScore={selectedRisk} shelters={floodData?.shelters} highRiskAreas={highRiskAreas} onLocationSelect={handleLocationSelect} />
          <EmergencyGuide />
        </div>
        <div className="control-column">
          <RiskGauge riskScore={selectedRisk} riskLevel={floodData?.risk?.level} riskColor={floodData?.risk?.color} riskStatus={floodData?.risk?.status} loading={loading} alarmActive={alarmActive} onDismissAlarm={handleDismissAlarm} />
          <section className="panel"><div className="panel-header"><div><span className="panel-eyebrow">LIVE SENSOR READINGS</span><h2>Environmental Data</h2><p className="panel-location">📍 {floodData?.location?.name || activeLocation.name}</p></div></div><div className="panel-body"><MetricCards metrics={floodData?.metrics} loading={loading} /></div></section>
        </div>
      </div>
      <Charts chartData={floodData?.charts} locationName={floodData?.location?.name || activeLocation.name} loading={loading} />
      <HighRiskAreas areas={highRiskAreas} loading={highRiskLoading} onSelectArea={handleLocationSelect} />
    </>
  );

  const renderView = () => {
    if (activeView === 'route') return <EmergencyRoute userLocation={activeLocation} riskScore={selectedRisk} shelters={floodData?.shelters || []} highRiskAreas={highRiskAreas} />;
    if (activeView === 'shelters') return <SheltersResources userLocation={activeLocation} onRoute={() => handleViewChange('route')} />;
    if (activeView === 'alerts') return <AlertCenter riskScore={selectedRisk} locationName={floodData?.location?.name || activeLocation.name} highRiskAreas={highRiskAreas} onSelectArea={(lat, lng, name) => { handleLocationSelect(lat, lng, name); handleViewChange('dashboard'); }} />;
    if (activeView === 'resources') return <ResourcesPage shelters={floodData?.shelters || []} />;
    if (activeView === 'risk') return <div className="single-view"><section className="page-title-row"><div><span className="panel-eyebrow">AUTORISK AI SCANNER</span><h2>Automatic Flood Risk Analysis</h2><p>Live location scoring and automatically ranked high-risk monitored areas.</p></div></section><div className="dashboard-grid"><div className="control-column"><RiskGauge riskScore={selectedRisk} loading={loading} alarmActive={alarmActive} onDismissAlarm={handleDismissAlarm}/><section className="panel"><div className="panel-header"><div><span className="panel-eyebrow">LIVE SENSOR READINGS</span><h2>Environmental Data</h2></div></div><div className="panel-body"><MetricCards metrics={floodData?.metrics} loading={loading}/></div></section></div><div className="map-column"><HighRiskAreas areas={highRiskAreas} loading={highRiskLoading} onSelectArea={(lat,lng,name)=>{handleLocationSelect(lat,lng,name);handleViewChange('dashboard')}}/></div></div></div>;
    if (activeView === 'map') return <div className="single-view"><section className="page-title-row"><div><span className="panel-eyebrow">LIVE GIS RISK MAP</span><h2>Bangladesh Flood Risk Map</h2><p>Click anywhere on the map to run a fresh flood-risk analysis.</p></div></section><LeafletMap userLocation={activeLocation} locationName={floodData?.location?.name} riskScore={selectedRisk} shelters={floodData?.shelters} highRiskAreas={highRiskAreas} onLocationSelect={handleLocationSelect}/></div>;
    return renderDashboard();
  };

  return (
    <div className="app-shell">
      <Header isOnline={!error && !!floodData} lastUpdated={lastUpdated} onLocationSelect={handleLocationSelect} />
      <div className="app-layout">
        <Sidebar activeView={activeView} onChange={handleViewChange} alertCount={highRiskAreas.filter((a) => Number(a.risk_score) >= 70).length + (selectedRisk >= 70 ? 1 : 0)} />
        <main className="app-body">{renderView()}</main>
      </div>
    </div>
  );
}
