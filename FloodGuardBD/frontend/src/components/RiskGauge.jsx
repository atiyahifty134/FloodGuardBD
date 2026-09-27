import React from 'react';

const RADIUS = 72;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getRiskConfig(score) {
  if (score >= 85) return { level: 'SEVERE', color: 'var(--risk-severe)', label: 'তীব্র ঝুঁকি', message: 'তাৎক্ষণিক সতর্কতা প্রয়োজন। নিরাপদ স্থানে যাওয়ার প্রস্তুতি নিন।' };
  if (score >= 70) return { level: 'HIGH', color: 'var(--risk-high)', label: 'উচ্চ ঝুঁকি', message: 'পরিস্থিতি ঘনিষ্ঠভাবে পর্যবেক্ষণ করুন এবং নিকটবর্তী আশ্রয়কেন্দ্র চিহ্নিত রাখুন।' };
  if (score >= 40) return { level: 'MODERATE', color: 'var(--risk-moderate)', label: 'মাঝারি ঝুঁকি', message: 'সতর্ক থাকুন এবং জরুরি সামগ্রী প্রস্তুত রাখুন।' };
  return { level: 'LOW', color: 'var(--risk-low)', label: 'নিম্ন ঝুঁকি', message: 'বর্তমান সূচক অনুযায়ী ঝুঁকি তুলনামূলকভাবে কম।' };
}

export default function RiskGauge({ riskScore, loading, alarmActive, onDismissAlarm }) {
  const score = Math.max(0, Math.min(100, Number(riskScore ?? 0)));
  const config = getRiskConfig(score);
  const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;

  return (
    <section className="panel risk-panel">
      <div className="panel-header">
        <div>
          <span className="panel-eyebrow">AI-ASSISTED RISK ANALYSIS</span>
          <h2>Flood Risk Assessment</h2>
        </div>
        <span className="panel-live-pill">● LIVE</span>
      </div>

      <div className="risk-panel-body">
        {alarmActive && (
          <div className="risk-alarm-banner">
            <span>🚨 High-risk alert active</span>
            <button onClick={onDismissAlarm}>Silence</button>
          </div>
        )}

        <div className="risk-ring-wrap">
          <svg viewBox="0 0 168 168">
            <circle className="risk-ring-track" cx="84" cy="84" r={RADIUS} />
            <circle
              className="risk-ring-value"
              cx="84"
              cy="84"
              r={RADIUS}
              stroke={config.color}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={loading ? CIRCUMFERENCE : offset}
            />
          </svg>
          <div className="risk-ring-center">
            <span className="pct text-mono" style={{ color: config.color }}>{loading ? '--' : `${Math.round(score)}%`}</span>
            <span className="pct-label">RISK SCORE</span>
          </div>
        </div>

        <span className="risk-status-badge" style={{ color: config.color, background: `${config.color}18`, borderColor: `${config.color}55` }}>
          <span className="dot" style={{ background: config.color }} />
          {config.level} · {config.label}
        </span>

        <p className="risk-message">
          Current conditions are evaluated from live weather inputs and the project risk-scoring formula.
          <span className="bn-line">{config.message}</span>
        </p>
      </div>
    </section>
  );
}
