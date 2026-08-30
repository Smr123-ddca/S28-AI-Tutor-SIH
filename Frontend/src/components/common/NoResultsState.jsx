import React from 'react';
import { SearchX, RotateCcw } from 'lucide-react';
import { Button } from './Button';

/**
 * Reusable NoResultsState Component
 * Specifically designed for zero-match search queries or over-constrained filters.
 */
export function NoResultsState({
  query = '',
  filter = '',
  onReset = null,
  resetLabel = 'Reset All Filters',
  className = '',
  style = {}
}) {
  return (
    <div
      role="region"
      aria-label="No search results"
      className={`no-results-state card-white ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '3rem 2rem',
        borderRadius: 'var(--radius-xl)',
        backgroundColor: 'var(--color-white)',
        border: '1px solid var(--color-border)',
        ...style
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '18px',
          backgroundColor: 'var(--color-yellow-light)',
          color: '#d97706',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.25rem',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <SearchX size={26} />
      </div>

      <h3
        style={{
          fontSize: '1.2rem',
          fontWeight: 700,
          color: 'var(--color-ink)',
          marginBottom: '0.4rem'
        }}
      >
        No matches found
      </h3>

      <p
        style={{
          fontSize: '0.88rem',
          color: 'var(--color-text-secondary)',
          maxWidth: '440px',
          lineHeight: 1.55,
          marginBottom: onReset ? '1.5rem' : 0
        }}
      >
        {query && filter && filter !== 'All' ? (
          <>
            No items matched your search for <strong>&quot;{query}&quot;</strong> in category <strong>&quot;{filter}&quot;</strong>.
          </>
        ) : query ? (
          <>
            No items matched your search for <strong>&quot;{query}&quot;</strong>. Try adjusting keywords or checking spelling.
          </>
        ) : filter && filter !== 'All' ? (
          <>
            No items currently exist under the <strong>&quot;{filter}&quot;</strong> filter.
          </>
        ) : (
          'No matching records found for the applied criteria.'
        )}
      </p>

      {onReset && (
        <Button
          variant="outline"
          size="md"
          onClick={onReset}
          icon={RotateCcw}
        >
          {resetLabel}
        </Button>
      )}
    </div>
  );
}
