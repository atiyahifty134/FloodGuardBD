import React, { useEffect, useRef, useState } from 'react';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

export default function Header({ isOnline, lastUpdated, onLocationSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const searchTimer = useRef(null);

  const formattedTime = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  useEffect(() => () => clearTimeout(searchTimer.current), []);

  const searchLocation = async (value = query) => {
    const q = value.trim();
    if (!q) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(`${API_BASE_URL}/search-location?q=${encodeURIComponent(q)}`);
      const data = await response.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Location search failed:', error);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleInputChange = (event) => {
    const value = event.target.value;
    setQuery(value);
    clearTimeout(searchTimer.current);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    searchTimer.current = setTimeout(() => searchLocation(value), 350);
  };

  const selectLocation = (location) => {
    const lat = Number(location.lat);
    const lng = Number(location.lon ?? location.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    onLocationSelect(lat, lng, location.short_name || location.display_name);
    setQuery(location.short_name || location.display_name);
    setResults([]);
  };

  const useGPS = () => {
    if (!navigator.geolocation) {
      alert('এই browser-এ GPS/Geolocation supported নয়।');
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onLocationSelect(
          position.coords.latitude,
          position.coords.longitude,
          'My Current GPS Location'
        );
        setQuery('My Current GPS Location');
        setGpsLoading(false);
      },
      (error) => {
        console.error(error);
        alert('GPS location পাওয়া যায়নি। Browser location permission চালু করুন।');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div className="brand">
          <div className="brand-mark">
            <span>🌊</span>
          </div>
          <div className="brand-text">
            <h1>FloodGuard BD</h1>
            <span>Real-Time Flood Risk Intelligence</span>
          </div>
        </div>

        <div className="header-search-area">
          <div className="search-box">
            <span className="search-icon">⌕</span>
            <input
              value={query}
              onChange={handleInputChange}
              onKeyDown={(event) => {
                if (event.key === 'Enter') searchLocation();
                if (event.key === 'Escape') setResults([]);
              }}
              placeholder="Search district / area... e.g. Sylhet, Cumilla"
              aria-label="Search district or area"
            />
            <button className="search-submit" onClick={() => searchLocation()} disabled={searching}>
              {searching ? '...' : 'Search'}
            </button>

            {results.length > 0 && (
              <div className="search-results">
                {results.map((item, index) => (
                  <button className="search-result-item" key={`${item.lat}-${item.lon}-${index}`} onClick={() => selectLocation(item)}>
                    <span className="result-pin">📍</span>
                    <span>
                      <strong>{item.short_name || item.display_name.split(',')[0]}</strong>
                      <small>{item.display_name}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="gps-button" onClick={useGPS} disabled={gpsLoading}>
            <span>⌖</span> {gpsLoading ? 'Locating...' : 'Use My GPS'}
          </button>
        </div>

        <div className="header-right">
          <div className="live-status">
            <span className={`live-dot ${isOnline ? '' : 'offline'}`} />
            {isOnline ? `LIVE · ${formattedTime}` : 'OFFLINE'}
          </div>
          <a href="tel:1090" className="hotline-chip">Emergency 1090</a>
        </div>
      </div>
    </header>
  );
}
