import React from 'react';

const RADIUS = 72;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getRiskConfig(score) {
  if (score >= 85) {
    return {
      level: 'SEVERE',
      color: 'var(--risk-severe)',
      label: 'তীব্র ঝুঁকি',
      message: 'অবিলম্বে নিরাপদ আশ্রয়ে সরে যান। পরিস্থিতি অত্যন্ত বিপজ্জনক।'
    };
  }
  if (score > 70) {
    return {
      level: 'HIGH',
      color: 'var(--risk-high)',
      label: 'উচ্চ ঝুঁকি',
      message: 'নিকটতম আশ্রয়কেন্দ্রের দিকে যাওয়ার প্রস্তুতি নিন। পরিস্থিতির দিকে নজর রাখুন।'
    };
  }
  if (score >= 40) {
    return {
      level: 'MODERATE',
      color: 'var(--risk-moderate)',
      label: 'মাঝারি ঝুঁকি',
      message: 'সতর্ক থাকুন এবং জরুরি ব্যাগ প্রস্তুত রাখুন।'
    };
  }
  return {
    level: 'LOW',
    color: 'var(--risk-low)',
    label: 'নিম্ন ঝুঁকি',
    message: 'বর্তমানে পরিস্থিতি স্বাভাবিক রয়েছে।'
  };
}

export default function RiskGauge({ riskScore, loading, alarmActive, onDismissAlarm }) {
  const score = Math.max(0, Math.min(100, riskScore ?? 0));
  const config = getRiskConfig(score);
  const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <span className="panel-eyebrow">AI Risk Analysis</span>
          <h2 style={{ marginTop: 2 }}>বন্যা ঝুঁকি বিশ্লেষণ</h2>
        </div>
      </div>

      <div className="risk-panel-body">
        {alarmActive && (
          <div className="risk-alarm-banner">
            🚨 উচ্চ ঝুঁকি সতর্কতা সক্রিয়
            <button onClick={onDismissAlarm}>সাইলেন্স</button>
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
            <span className="pct text-mono" style={{ color: config.color }}>
              {loading ? '--' : `${Math.round(score)}%`}
            </span>
            <span className="pct-label">RISK SCORE</span>
          </div>
        </div>

        <span
          className="risk-status-badge"
          style={{
            color: config.color,
            background: `color-mix(in srgb, ${config.color} 16%, transparent)`,
            border: `1px solid color-mix(in srgb, ${config.color} 45%, transparent)`
          }}
        >
          <span className="dot" style={{ background: config.color }} />
          {config.level} · {config.label}
        </span>

        <p className="risk-message">
          AI মডেল রিয়েল-টাইম সেন্সর ডেটা বিশ্লেষণ করে এই ঝুঁকি স্কোর নির্ধারণ করেছে।
          <span className="bn-line">{config.message}</span>
        </p>
      </div>
    </section>
  );
}
