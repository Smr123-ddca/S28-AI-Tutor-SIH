import React from 'react';
import { Sparkles, FolderOpen } from 'lucide-react';
import { Button } from './Button';
import { Pill } from './Pill';

/**
 * Reusable EmptyState Component
 * Displays when a dataset or list is naturally empty (e.g. no sessions, no uploaded documents).
 */
export function EmptyState({
  icon: Icon = FolderOpen,
  badge = null,
  badgeColor = 'purple',
  title = 'No records found',
  description = 'There is currently no data to display in this section.',
  actionText = null,
  onAction = null,
  actionIcon = Sparkles,
  secondaryActionText = null,
  onSecondaryAction = null,
  className = '',
  style = {}
}) {
  return (
    <div
      role="region"
      aria-label={title}
      className={`empty-state-card card-white ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '3rem 2rem',
        borderRadius: 'var(--radius-xl)',
        backgroundColor: 'var(--color-white)',
        border: '1.5px dashed var(--color-border)',
        boxShadow: 'none',
        ...style
      }}
    >
      <div
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '20px',
          backgroundColor: 'var(--color-orange-subtle)',
          color: 'var(--color-orange)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.25rem',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <Icon size={28} />
      </div>

      {badge && (
        <Pill color={badgeColor} size="sm" style={{ marginBottom: '0.75rem' }}>
          {badge}
        </Pill>
      )}

      <h3
        style={{
          fontSize: '1.25rem',
          fontWeight: 700,
          color: 'var(--color-ink)',
          marginBottom: '0.5rem',
          lineHeight: 1.3
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: '0.9rem',
          color: 'var(--color-text-secondary)',
          maxWidth: '480px',
          lineHeight: 1.6,
          marginBottom: actionText || secondaryActionText ? '1.75rem' : 0
        }}
      >
        {description}
      </p>

      {(actionText || secondaryActionText) && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {actionText && onAction && (
            <Button
              variant="orange"
              size="md"
              onClick={onAction}
              icon={actionIcon}
            >
              {actionText}
            </Button>
          )}
          {secondaryActionText && onSecondaryAction && (
            <Button
              variant="outline"
              size="md"
              onClick={onSecondaryAction}
            >
              {secondaryActionText}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
