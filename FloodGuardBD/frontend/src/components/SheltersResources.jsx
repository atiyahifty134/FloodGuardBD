import React, { useEffect, useState } from 'react';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

export default function SheltersResources({ userLocation, onRoute }) {
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/shelters`)
      .then((r) => r.json())
      .then((data) => setShelters(data.shelters || []))
      .catch(() => setShelters([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = shelters.filter((s) => `${s.name} ${s.district}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="resource-page">
      <section className="page-title-row">
        <div><span className="panel-eyebrow">SHELTERS & RESOURCES</span><h2>Emergency Shelter Directory</h2><p>Browse monitored shelters and start an evacuation route from your selected location.</p></div>
      </section>
      <section className="resource-toolbar panel">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search shelter or district..." />
        <span className="count-chip">{filtered.length} shelters</span>
      </section>
      <div className="shelter-grid">
        {loading && <section className="panel empty-risk">Loading shelter directory...</section>}
        {!loading && filtered.map((shelter) => (
          <article className="panel shelter-card" key={shelter.id}>
            <div className="shelter-card-top"><span className="shelter-big-icon">⌂</span><span className="status-open-pill">OPEN</span></div>
            <h3>{shelter.name}</h3>
            <p>{shelter.district}, Bangladesh</p>
            <div className="shelter-detail-grid"><div><small>Capacity</small><strong>{shelter.capacity}</strong></div><div><small>Contact</small><strong>{shelter.contact}</strong></div></div>
            <button type="button" className="primary-action" onClick={() => onRoute?.(shelter)}>🧭 View Emergency Route</button>
          </article>
        ))}
      </div>
      <div className="resource-note">Live occupancy, medical stock and rescue-team availability are not included in the current backend dataset, so the directory only shows verified fields available in this project.</div>
    </div>
  );
}
