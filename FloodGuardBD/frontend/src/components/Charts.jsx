import React, { useMemo } from 'react';

const CHART_W = 760;
const CHART_H = 300;
const PAD = { top: 18, right: 18, bottom: 42, left: 52 };

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatHour(value) {
  if (!value) return '--';
  const match = String(value).match(/T(\d{2}):(\d{2})/);
  if (!match) return String(value).slice(0, 10);
  const hour = Number(match[1]);
  const minute = match[2];
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  return `${String(h).padStart(2, '0')}:${minute} ${suffix}`;
}

function formatDay(value) {
  if (!value) return '--';
  const date = new Date(`${value}T00:00:00+06:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-US', { weekday: 'short' });
}

function niceMax(value, minimum = 1) {
  if (!Number.isFinite(value) || value <= 0) return minimum;
  const step = value <= 10 ? 1 : value <= 50 ? 5 : 20;
  return Math.max(minimum, Math.ceil(value / step) * step);
}

function LineChart({ history, forecast }) {
  const chart = useMemo(() => {
    const actual = (history || []).map((item) => ({
      x: item.timestamp,
      y: Number(item.water_level) || 0,
    }));
    const predicted = (forecast || []).map((item) => ({
      x: item.timestamp,
      y: Number(item.water_level) || 0,
    }));
    const values = [...actual, ...predicted].map((point) => point.y);
    const max = niceMax(Math.max(...values, 1), 1);
    const min = Math.max(0, Math.min(...values, 0));
    const range = Math.max(max - min, 1);
    const plotW = CHART_W - PAD.left - PAD.right;
    const plotH = CHART_H - PAD.top - PAD.bottom;
    const allCount = Math.max(actual.length + predicted.length - (actual.length && predicted.length ? 1 : 0), 2);

    const point = (value, index) => ({
      x: PAD.left + (index / (allCount - 1)) * plotW,
      y: PAD.top + (1 - (value - min) / range) * plotH,
    });

    const actualPoints = actual.map((item, index) => ({ ...point(item.y, index), ...item }));
    const forecastStart = actual.length ? actual.length - 1 : 0;
    const forecastPoints = predicted.map((item, index) => ({
      ...point(item.y, forecastStart + index),
      ...item,
    }));

    const path = (points) => points.map((p, i) => `${i ? 'L' : 'M'} ${Number(p.x).toFixed(2)} ${Number(p.y).toFixed(2)}`).join(' ');
    const ticks = Array.from({ length: 5 }, (_, index) => min + (range * index) / 4);

    return { actualPoints, forecastPoints, path, ticks, min, max, plotH, plotW };
  }, [history, forecast]);

  const labels = useMemo(() => {
    const actual = history || [];
    const forecastItems = forecast || [];
    const combined = [...actual, ...forecastItems];
    if (!combined.length) return [];
    const indices = [0, Math.floor((combined.length - 1) / 2), combined.length - 1];
    return [...new Set(indices)].map((index) => ({ index, label: formatHour(combined[index]?.timestamp) }));
  }, [history, forecast]);

  const actual = chart.actualPoints;
  const predicted = chart.forecastPoints;
  const lastActual = actual[actual.length - 1];

  return (
    <div className="flood-chart-svg-wrap">
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} role="img" aria-label="Water level history and forecast line chart">
        {chart.ticks.map((tick, index) => {
          const y = PAD.top + (1 - (tick - chart.min) / (chart.max - chart.min || 1)) * chart.plotH;
          return (
            <g key={`grid-${index}`}>
              <line x1={PAD.left} x2={CHART_W - PAD.right} y1={y} y2={y} className="chart-grid-line" />
              <text x={PAD.left - 10} y={y + 4} textAnchor="end" className="chart-axis-label">{tick.toFixed(1)}</text>
            </g>
          );
        })}

        <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={CHART_H - PAD.bottom} className="chart-axis-line" />
        <line x1={PAD.left} x2={CHART_W - PAD.right} y1={CHART_H - PAD.bottom} y2={CHART_H - PAD.bottom} className="chart-axis-line" />

        {actual.length > 1 && <path d={chart.path(actual)} className="water-line actual" />}
        {predicted.length > 0 && <path d={chart.path([...(lastActual ? [lastActual] : []), ...predicted])} className="water-line forecast" />}

        {actual.map((item, index) => (
          <circle key={`actual-${index}`} cx={item.x} cy={item.y} r="4" className="water-point" />
        ))}

        {predicted.filter((_, index) => index === 0 || index === predicted.length - 1).map((item, index) => (
          <circle key={`forecast-${index}`} cx={item.x} cy={item.y} r="4" className="forecast-point" />
        ))}

        {labels.map(({ index, label }) => {
          const combinedPoint = [...actual, ...predicted][index];
          if (!combinedPoint) return null;
          return <text key={`label-${index}`} x={combinedPoint.x} y={CHART_H - 15} textAnchor="middle" className="chart-axis-label">{label}</text>;
        })}
      </svg>
    </div>
  );
}

function RainfallChart({ daily }) {
  const data = daily || [];
  const max = niceMax(Math.max(...data.map((item) => Number(item.rainfall) || 0), 10), 10);
  const barW = 44;
  const gap = data.length > 1 ? (CHART_W - PAD.left - PAD.right - data.length * barW) / (data.length - 1) : 0;
  const plotH = CHART_H - PAD.top - PAD.bottom;
  const ticks = Array.from({ length: 5 }, (_, index) => (max * index) / 4);

  return (
    <div className="flood-chart-svg-wrap">
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} role="img" aria-label="Seven day expected precipitation bar chart">
        {ticks.map((tick, index) => {
          const y = PAD.top + (1 - tick / max) * plotH;
          return (
            <g key={`rain-grid-${index}`}>
              <line x1={PAD.left} x2={CHART_W - PAD.right} y1={y} y2={y} className="chart-grid-line" />
              <text x={PAD.left - 10} y={y + 4} textAnchor="end" className="chart-axis-label">{Math.round(tick)}</text>
            </g>
          );
        })}
        <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={CHART_H - PAD.bottom} className="chart-axis-line" />
        <line x1={PAD.left} x2={CHART_W - PAD.right} y1={CHART_H - PAD.bottom} y2={CHART_H - PAD.bottom} className="chart-axis-line" />

        {data.map((item, index) => {
          const value = Number(item.rainfall) || 0;
          const height = (value / max) * plotH;
          const x = PAD.left + index * (barW + Math.max(gap, 0));
          const y = CHART_H - PAD.bottom - height;
          return (
            <g key={`${item.date}-${index}`}>
              <rect x={x} y={y} width={barW} height={Math.max(height, 1)} rx="7" className="rain-bar" />
              <text x={x + barW / 2} y={CHART_H - 15} textAnchor="middle" className="chart-axis-label">{formatDay(item.date)}</text>
              <text x={x + barW / 2} y={Math.max(y - 7, PAD.top + 10)} textAnchor="middle" className="chart-value-label">{Math.round(value)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function Charts({ chartData, locationName, loading }) {
  const history = chartData?.history || [];
  const forecast = chartData?.forecast || [];
  const daily = chartData?.daily_rainfall || [];
  const hasAny = history.length > 0 || forecast.length > 0 || daily.length > 0;

  return (
    <section className="charts-section">
      <div className="charts-heading">
        <div>
          <span className="panel-eyebrow">FLOOD TELEMETRY & FORECAST</span>
          <h2>Water Level & Rainfall Trends</h2>
          <p>BWDB/FFWC observed river telemetry and a clearly labelled 24-hour simulation for {locationName || 'the selected location'}.</p>
        </div>
        <span className="chart-source-pill">{loading ? 'Updating…' : 'Live data'}</span>
      </div>

      {!hasAny && !loading ? (
        <div className="charts-empty">
          <strong>Chart data is building</strong>
          <span>Keep the dashboard open for a few live assessments so the location history becomes available.</span>
        </div>
      ) : (
        <div className="charts-grid">
          <article className="chart-card">
            <div className="chart-card-header">
              <div>
                <span>Recorded telemetry vs 24-hour predictive simulation</span>
                <strong>Water level (m)</strong>
              </div>
              <div className="chart-legend">
                <span><i className="legend-dot actual" /> Recorded</span>
                <span><i className="legend-dot forecast" /> Forecast</span>
              </div>
            </div>
            {loading && !history.length && !forecast.length ? <div className="chart-loading">Loading water-level trend…</div> : <LineChart history={history} forecast={forecast} />}
            <div className="chart-note">Recorded line = FFWC/BWDB gauge observations. Dashed line = 24-hour simulation starting from the observed gauge level and using forecast precipitation; it is not an official BWDB forecast.</div>
          </article>

          <article className="chart-card">
            <div className="chart-card-header">
              <div>
                <span>7-day weather outlook</span>
                <strong>Expected daily precipitation (mm)</strong>
              </div>
              <div className="chart-unit">mm</div>
            </div>
            {loading && !daily.length ? <div className="chart-loading">Loading rainfall forecast…</div> : <RainfallChart daily={daily} />}
            <div className="chart-note">7-day precipitation forecast for the selected location (Open-Meteo).</div>
          </article>
        </div>
      )}
    </section>
  );
}
