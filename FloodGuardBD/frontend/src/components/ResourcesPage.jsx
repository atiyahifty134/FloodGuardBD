import React from 'react';

export default function ResourcesPage({ shelters = [] }) {
  const resources = [
    { icon: '⌂', title: 'Emergency Shelters', value: shelters.length, text: 'Monitored shelter locations in the current database.' },
    { icon: '☎', title: 'Emergency Hotline', value: '1090', text: 'Bangladesh disaster management emergency hotline.' },
    { icon: '⌖', title: 'GIS Monitoring', value: 'LIVE', text: 'OpenStreetMap-based live location and risk visualization.' },
    { icon: '☁', title: 'Weather Input', value: 'LIVE', text: 'Current weather inputs from the project weather service.' },
  ];
  return (
    <div className="resource-page">
      <section className="page-title-row"><div><span className="panel-eyebrow">RESOURCE TRACKING</span><h2>Flood Response Resources</h2><p>Quick access to the response resources currently represented by this project.</p></div></section>
      <div className="resource-grid-page">
        {resources.map((item) => <article className="panel resource-tile" key={item.title}><div className="resource-tile-icon">{item.icon}</div><span>{item.title}</span><strong>{item.value}</strong><p>{item.text}</p></article>)}
      </div>
    </div>
  );
}
