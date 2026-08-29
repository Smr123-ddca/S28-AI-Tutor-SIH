import React from 'react';

export function SegmentedControl({
  options = [], // [{ id, label, count? }] or string[]
  value,
  onChange,
  className = '',
  size = 'md'
}) {
  return (
    <div className={`segmented-control ${className}`}>
      {options.map((opt) => {
        const id = typeof opt === 'string' ? opt : opt.id;
        const label = typeof opt === 'string' ? opt : opt.label;
        const count = typeof opt === 'object' ? opt.count : undefined;
        const isActive = value === id;

        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`segment-item ${isActive ? 'active' : ''}`}
            style={{
              padding: size === 'sm' ? '0.35rem 0.85rem' : '0.5rem 1.15rem',
              fontSize: size === 'sm' ? '0.78rem' : '0.85rem'
            }}
          >
            {label}
            {count !== undefined && (
              <span
                style={{
                  marginLeft: '0.4rem',
                  opacity: isActive ? 0.9 : 0.6,
                  fontSize: '0.75rem'
                }}
              >
                ({count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
