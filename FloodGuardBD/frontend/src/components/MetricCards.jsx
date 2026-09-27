import React from 'react';

function WaterIcon() { return <span>≈</span>; }
function RainIcon() { return <span>☔</span>; }
function TempIcon() { return <span>°</span>; }
function HumidityIcon() { return <span>◌</span>; }

function MetricValue({ value, loading, digits = 1 }) {
  if (loading) return <span className="loading-shimmer">--.-</span>;
  if (value == null || Number.isNaN(Number(value))) return <span>--</span>;
  return <>{Number(value).toFixed(digits)}</>;
}

export default function MetricCards({ metrics, loading }) {
  const waterLevel = metrics?.water_level_m;
  const rainfall = metrics?.rainfall_mm;
  const temperature = metrics?.temperature_c;
  const humidity = metrics?.humidity_percent;

  const cards = [
    { key: 'water', icon: <WaterIcon />, value: waterLevel, unit: 'm', label: 'Water Level', bn: 'পানির স্তর' },
    { key: 'rain', icon: <RainIcon />, value: rainfall, unit: 'mm', label: 'Rainfall', bn: 'বৃষ্টিপাত' },
    { key: 'temp', icon: <TempIcon />, value: temperature, unit: '°C', label: 'Temperature', bn: 'তাপমাত্রা' },
    { key: 'humidity', icon: <HumidityIcon />, value: humidity, unit: '%', label: 'Humidity', bn: 'আর্দ্রতা' }
  ];

  return (
    <div className="metrics-grid">
      {cards.map((card) => (
        <div className="metric-card" key={card.key}>
          <div className={`metric-icon ${card.key}`}>{card.icon}</div>
          <div className="metric-value text-mono">
            <MetricValue value={card.value} loading={loading} digits={card.key === 'humidity' ? 0 : 1} />
            <span className="unit">{card.unit}</span>
          </div>
          <div className="metric-label">
            {card.label}
            <span className="bn">{card.bn}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
