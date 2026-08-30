import React, { useState } from 'react';
import { AlertTriangle, RotateCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './Button';

/**
 * Reusable ErrorState Component
 * Used for failed API fetches, component load failures, or data retrieval errors.
 * Includes accessible retry triggers and collapsible technical details.
 */
export function ErrorState({
  title = 'Unable to Load Information',
  message = 'An unexpected network error occurred while communicating with the tutor service.',
  technicalDetails = null,
  onRetry = null,
  retryLabel = 'Try Again',
  className = '',
  style = {}
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`error-state-card card-white ${className}`}
      style={{
        padding: '2.5rem 2rem',
        borderRadius: 'var(--radius-xl)',
        backgroundColor: 'var(--color-white)',
        border: '1.5px solid var(--color-red)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        ...style
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '18px',
          backgroundColor: 'var(--color-red-light)',
          color: 'var(--color-red)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.25rem',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <AlertTriangle size={28} />
      </div>

      <h3
        style={{
          fontSize: '1.25rem',
          fontWeight: 700,
          color: 'var(--color-ink)',
          marginBottom: '0.4rem'
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: '0.9rem',
          color: 'var(--color-text-secondary)',
          maxWidth: '460px',
          lineHeight: 1.6,
          marginBottom: '1.5rem'
        }}
      >
        {message}
      </p>

      {onRetry && (
        <Button
          variant="orange"
          size="md"
          onClick={onRetry}
          icon={RotateCw}
          style={{ marginBottom: technicalDetails ? '1.25rem' : 0 }}
        >
          {retryLabel}
        </Button>
      )}

      {technicalDetails && (
        <div style={{ width: '100%', maxWidth: '520px', marginTop: '0.5rem', textAlign: 'left' }}>
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            style={{
              fontSize: '0.78rem',
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              cursor: 'pointer',
              margin: '0 auto 0.5rem'
            }}
          >
            <span>{showDetails ? 'Hide diagnostic details' : 'Show diagnostic details'}</span>
            {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showDetails && (
            <pre
              style={{
                backgroundColor: 'var(--color-offwhite)',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.75rem',
                color: 'var(--color-red)',
                overflowX: 'auto',
                border: '1px solid var(--color-border)',
                maxHeight: '140px'
              }}
            >
              {typeof technicalDetails === 'string' ? technicalDetails : JSON.stringify(technicalDetails, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
