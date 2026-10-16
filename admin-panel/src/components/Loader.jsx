import React from 'react';

/**
 * Unique, futuristic glowing orbital loader for Umi Live
 * @param {string} text - Optional text below the loader
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {boolean} fullScreen - Whether to display as full viewport overlay
 */
export default function Loader({ text = 'Loading data...', size = 'md', fullScreen = false }) {
  const dimensions = {
    sm: { box: 50, ring: 42, icon: '0.9rem', fontSize: '0.8rem' },
    md: { box: 80, ring: 68, icon: '1.4rem', fontSize: '0.875rem' },
    lg: { box: 110, ring: 96, icon: '1.9rem', fontSize: '0.95rem' },
  }[size] || { box: 80, ring: 68, icon: '1.4rem', fontSize: '0.875rem' };

  const content = (
    <div className="umi-loader-wrapper">
      <div
        className="umi-loader-visual"
        style={{ width: `${dimensions.box}px`, height: `${dimensions.box}px` }}
      >
        {/* Outer glowing pulsing aura */}
        <div className="umi-loader-halo" />

        {/* Outer Orbital Ring (clockwise violet-cyan gradient) */}
        <div
          className="umi-loader-ring umi-ring-outer"
          style={{ width: `${dimensions.ring}px`, height: `${dimensions.ring}px` }}
        />

        {/* Inner Counter Orbital Ring (counter-clockwise amber-rose gradient) */}
        <div
          className="umi-loader-ring umi-ring-inner"
          style={{
            width: `${Math.round(dimensions.ring * 0.72)}px`,
            height: `${Math.round(dimensions.ring * 0.72)}px`,
          }}
        />

        {/* Center glowing energy nucleus */}
        <div className="umi-loader-core">
          <span style={{ fontSize: dimensions.icon, lineHeight: 1 }}>⚡</span>
        </div>
      </div>

      {/* Modern Shimmer Text */}
      {text && (
        <div className="umi-loader-text" style={{ fontSize: dimensions.fontSize }}>
          <span>{text}</span>
          <div className="umi-loader-dots">
            <span />
            <span />
            <span />
          </div>
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return <div className="umi-loader-fullscreen">{content}</div>;
  }

  return <div className="umi-loader-container">{content}</div>;
}
