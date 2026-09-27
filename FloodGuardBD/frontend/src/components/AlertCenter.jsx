import React from 'react';

export default function AlertCenter({ riskScore, locationName, highRiskAreas = [], onSelectArea }) {
  const current = Number(riskScore ?? 0);
  const alerts = [];
  if (current >= 70) alerts.push({ level: 'HIGH', title: `High flood risk at ${locationName || 'selected location'}`, text: `Current modeled risk is ${Math.round(current)}%. Review the emergency route and nearby shelters.` });
  highRiskAreas.slice(0, 6).forEach((area) => {
    if (Number(area.risk_score) >= 70) alerts.push({ level: area.risk_score >= 85 ? 'SEVERE' : 'HIGH', title: `${area.name} — ${Math.round(area.risk_score)}% risk`, text: `${area.level} modeled risk. Rainfall ${Number(area.rainfall || 0).toFixed(1)} mm.` , area});
  });
  if (!alerts.length) alerts.push({ level: 'INFO', title: 'No high-risk alert detected', text: 'The current monitored data does not cross the project high-risk threshold.' });

  return (
    <div className="resource-page">
      <section className="page-title-row"><div><span className="panel-eyebrow">ALERT CENTER</span><h2>Flood Risk Alerts</h2><p>Current selected-location alert plus automatically monitored high-risk districts.</p></div></section>
      <div className="alert-list-page">
        {alerts.map((alert, index) => (
          <article className={`panel alert-card-page ${alert.level.toLowerCase()}`} key={`${alert.title}-${index}`}>
            <div className="alert-card-icon">{alert.level === 'INFO' ? 'i' : '!'}</div>
            <div className="alert-card-copy"><span className="alert-level-label">{alert.level}</span><h3>{alert.title}</h3><p>{alert.text}</p></div>
            {alert.area && <button type="button" className="secondary-action" onClick={() => onSelectArea?.(alert.area.lat, alert.area.lng, alert.area.name)}>Analyze area</button>}
          </article>
        ))}
      </div>
    </div>
  );
}
