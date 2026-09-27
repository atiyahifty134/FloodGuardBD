import React from 'react';

const items = [
  { id: 'dashboard', icon: '⌂', label: 'Dashboard' },
  { id: 'risk', icon: '◈', label: 'AutoRisk AI Scanner' },
  { id: 'map', icon: '⌖', label: 'Live GIS Risk Map' },
  { id: 'route', icon: '➜', label: 'Emergency Route', badge: 'NEW' },
  { id: 'shelters', icon: '⌂', label: 'Shelters & Resources' },
  { id: 'alerts', icon: '⚠', label: 'Alert Center' },
  { id: 'resources', icon: '▦', label: 'Resources' },
];

export default function Sidebar({ activeView, onChange, alertCount = 0 }) {
  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">🌊</div>
        <div>
          <strong>FloodGuard BD</strong>
          <span>Flood Intelligence</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`sidebar-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => onChange(item.id)}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
            {item.id === 'alerts' && alertCount > 0 && <span className="sidebar-count">{alertCount}</span>}
            {item.badge && <span className="sidebar-new">{item.badge}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-status">
        <div><span className="sidebar-status-dot" /> System Active</div>
        <small>Live weather & risk monitoring</small>
      </div>
    </aside>
  );
}
