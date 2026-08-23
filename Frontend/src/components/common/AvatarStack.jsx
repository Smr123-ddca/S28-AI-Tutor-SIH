import React from 'react';

export function AvatarStack({
  avatars = [],
  extraCount = 0,
  maxVisible = 4,
  size = 32,
  className = ''
}) {
  const visibleAvatars = avatars.slice(0, maxVisible);
  const remaining = Math.max(0, avatars.length - maxVisible) + extraCount;

  return (
    <div className={`avatar-stack ${className}`}>
      {visibleAvatars.map((src, i) => (
        <img
          key={i}
          src={src}
          alt={`Learner ${i + 1}`}
          className="avatar-stack-item"
          style={{ width: `${size}px`, height: `${size}px` }}
        />
      ))}
      {remaining > 0 && (
        <div
          className="avatar-stack-count"
          style={{ height: `${size}px`, minWidth: `${size}px` }}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}

export function ProgressBar({
  current = 0,
  total = 100,
  color = 'ink', // 'ink' | 'orange' | 'purple'
  height = 8,
  className = '',
  style = {}
}) {
  const percentage = Math.min(100, Math.max(0, Math.round((current / (total || 1)) * 100)));

  const getFillColor = () => {
    switch (color) {
      case 'orange':
        return 'var(--color-orange)';
      case 'purple':
        return 'var(--color-purple)';
      case 'yellow':
        return 'var(--color-yellow)';
      default:
        return 'var(--color-ink)';
    }
  };

  return (
    <div
      className={`progress-track ${className}`}
      style={{
        width: '100%',
        height: `${height}px`,
        backgroundColor: 'rgba(21, 19, 19, 0.12)',
        borderRadius: '9999px',
        overflow: 'hidden',
        position: 'relative',
        ...style
      }}
    >
      <div
        className="progress-fill"
        style={{
          width: `${percentage}%`,
          height: '100%',
          backgroundColor: getFillColor(),
          borderRadius: '9999px',
          transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      />
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  onSearch,
  placeholder = 'Search courses, doubts, lessons...',
  className = '',
  style = {}
}) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(value);
    }
  };

  return (
    <div className={`search-pill-container ${className}`} style={style}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="search-pill-input"
      />
      <button
        type="button"
        onClick={() => onSearch && onSearch(value)}
        className="search-pill-btn"
        aria-label="Search"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </button>
    </div>
  );
}
