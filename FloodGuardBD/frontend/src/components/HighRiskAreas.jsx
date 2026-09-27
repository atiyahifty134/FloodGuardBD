import React from 'react';

function riskClass(score) {
  if (score >= 85) return 'severe';
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export default function HighRiskAreas({ areas = [], loading, onSelectArea }) {
  return (
    <section className="panel high-risk-panel">
      <div className="panel-header high-risk-header">
        <div>
          <span className="panel-eyebrow">AUTOMATIC MONITORING</span>
          <h2>Highest Flood Risk Areas</h2>
          <p>Monitored districts are scored automatically and sorted by current risk.</p>
        </div>
        <span className="panel-live-pill">● AUTO</span>
      </div>

      <div className="high-risk-list">
        {loading && <div className="empty-risk">Scanning monitored districts...</div>}
        {!loading && areas.length === 0 && <div className="empty-risk">No risk-area data available right now.</div>}
        {!loading && areas.map((area, index) => {
          const cls = riskClass(area.risk_score);
          return (
            <button
              type="button"
              className="risk-area-row"
              key={`${area.name}-${index}`}
              onClick={() => onSelectArea?.(area.lat, area.lng, area.name)}
            >
              <span className="risk-rank">{index + 1}</span>
              <span className="risk-location">
                <strong>{area.name}</strong>
                <small>{area.division || 'Bangladesh'} · Rain {Number(area.rainfall ?? 0).toFixed(1)} mm</small>
              </span>
              <span className="risk-progress-wrap">
                <span className="risk-progress-top">
                  <small>Risk score</small>
                  <strong>{Math.round(area.risk_score)}%</strong>
                </span>
                <span className="risk-progress-bar"><i className={cls} style={{ width: `${Math.min(100, Math.max(0, area.risk_score))}%` }} /></span>
              </span>
              <span className={`risk-status ${cls}`}>{area.level}</span>
              <span className="risk-open">›</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
