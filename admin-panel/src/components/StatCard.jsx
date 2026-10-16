import React from 'react';

export default function StatCard({ label, value, subtext, icon: Icon, iconColor = '#8b5cf6', bgColor = 'rgba(139, 92, 246, 0.12)' }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <div className="stat-icon-wrap" style={{ background: bgColor, color: iconColor }}>
          <Icon size={20} />
        </div>
      </div>
      <div className="stat-value">{value}</div>
      {subtext && <div className="stat-sub">{subtext}</div>}
    </div>
  );
}
