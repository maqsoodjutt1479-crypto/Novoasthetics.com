import React from 'react';

const reports = [
  { title: 'Appointment Conversion', value: '62%', detail: 'Pending to confirmed' },
  { title: 'Revenue Mix', value: '58% services / 42% products', detail: 'Packages included' },
  { title: 'No-show Rate', value: '4%', detail: 'Missed or unattempted' },
  { title: 'Average Ticket', value: 'PKR 18,200', detail: 'Per appointment' },
];

export const ReportsPage: React.FC = () => (
  <div className="stack">
    <div className="panel section">
      <div className="section__header">
        <div>
          <div className="section__title">Reports & Analytics</div>
          <div className="muted">High-level KPIs and trends</div>
        </div>
        <div className="pill pill--ghost">Export (future)</div>
      </div>
      <div className="card-grid">
        {reports.map((r) => (
          <div key={r.title} className="stat-card panel">
            <div className="stat-card__label">{r.title}</div>
            <div className="stat-card__value">{r.value}</div>
            <div className="stat-card__trend">{r.detail}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
