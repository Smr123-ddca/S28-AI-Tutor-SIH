import React from 'react';
import { Pill } from '../common/Pill';

export function StatCard({
  tag = 'Education',
  tagColor = 'purple',
  number = '+40',
  label = 'subjects',
  className = '',
  style = {}
}) {
  return (
    <div
      className={`card-white ${className}`}
      style={{
        padding: '1.25rem 1.5rem',
        borderRadius: 'var(--radius-xl)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '0.5rem',
        minWidth: '160px',
        ...style
      }}
    >
      <Pill color={tagColor} size="sm">
        {tag}
      </Pill>
      <div
        style={{
          fontSize: '2rem',
          fontWeight: 700,
          color: 'var(--color-ink)',
          lineHeight: 1.1
        }}
      >
        {number}
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
        {label}
      </div>
    </div>
  );
}
