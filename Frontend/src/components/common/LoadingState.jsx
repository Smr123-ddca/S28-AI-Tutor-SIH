import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

/**
 * Reusable LoadingState Component
 * Supports multiple presentation variants:
 * - 'spinner': Compact centered spinner with animated message
 * - 'skeleton-table': Placeholder rows for tabular data (e.g. Teacher Misconceptions)
 * - 'skeleton-cards': Placeholder cards for grids (e.g. Library Documents, Courses)
 * - 'fullscreen': Full-page splash loader (e.g. App initialization)
 */
export function LoadingState({
  message = 'Loading data...',
  description = 'Connecting to grounded knowledge base...',
  variant = 'spinner',
  rows = 4,
  cards = 3,
  className = '',
  style = {}
}) {
  if (variant === 'fullscreen') {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className={`loading-fullscreen ${className}`}
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-offwhite)',
          padding: '2rem',
          textAlign: 'center',
          ...style
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            backgroundColor: 'var(--color-orange-subtle)',
            color: 'var(--color-orange)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.25rem',
            boxShadow: 'var(--shadow-sm)',
            animation: 'float-subtle 2s ease-in-out infinite'
          }}
        >
          <Sparkles size={32} />
        </div>
        <div style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--color-ink)', marginBottom: '0.35rem' }}>
          {message}
        </div>
        {description && (
          <div style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', maxWidth: '360px' }}>
            {description}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'skeleton-table') {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={message}
        className={`skeleton-table-wrapper ${className}`}
        style={{ width: '100%', padding: '1rem', ...style }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-orange)' }} />
          <span>{message}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {Array.from({ length: rows }).map((_, idx) => (
            <div
              key={idx}
              style={{
                height: '52px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-offwhite)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 1.25rem',
                gap: '1.5rem',
                border: '1px solid var(--color-border)',
                animation: 'pulse-subtle 1.5s ease-in-out infinite'
              }}
            >
              <div style={{ width: '30%', height: '14px', borderRadius: '4px', backgroundColor: 'var(--color-skeleton)' }} />
              <div style={{ width: '20%', height: '14px', borderRadius: '4px', backgroundColor: 'var(--color-skeleton)' }} />
              <div style={{ width: '20%', height: '14px', borderRadius: '4px', backgroundColor: 'var(--color-skeleton)' }} />
              <div style={{ width: '25%', height: '14px', borderRadius: '4px', backgroundColor: 'var(--color-skeleton)' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'skeleton-cards') {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={message}
        className={`skeleton-cards-grid ${className}`}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5rem',
          width: '100%',
          ...style
        }}
      >
        {Array.from({ length: cards }).map((_, idx) => (
          <div
            key={idx}
            className="card-white"
            style={{
              padding: '1.5rem',
              minHeight: '220px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              animation: 'pulse-subtle 1.5s ease-in-out infinite'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ width: '80px', height: '22px', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--color-skeleton)' }} />
                <div style={{ width: '45px', height: '16px', borderRadius: '4px', backgroundColor: 'var(--color-skeleton)' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'var(--color-skeleton)', flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ width: '90%', height: '16px', borderRadius: '4px', backgroundColor: 'var(--color-skeleton)' }} />
                  <div style={{ width: '60%', height: '12px', borderRadius: '4px', backgroundColor: 'var(--color-skeleton)' }} />
                </div>
              </div>
            </div>
            <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ width: '90px', height: '14px', borderRadius: '4px', backgroundColor: 'var(--color-skeleton)' }} />
              <div style={{ width: '70px', height: '28px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-skeleton)' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default 'spinner'
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`loading-spinner-container ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem 1.5rem',
        textAlign: 'center',
        ...style
      }}
    >
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-orange-subtle)',
          color: 'var(--color-orange)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '0.85rem'
        }}
      >
        <Loader2 size={24} className="animate-spin" />
      </div>
      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-ink)' }}>
        {message}
      </div>
      {description && (
        <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem', maxWidth: '320px' }}>
          {description}
        </div>
      )}
    </div>
  );
}
