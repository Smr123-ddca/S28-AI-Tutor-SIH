import React from 'react';
import { Pill } from '../common/Pill';
import { AvatarStack } from '../common/AvatarStack';
import { Button } from '../common/Button';
import { Sparkles } from 'lucide-react';

export function PromoCard({
  category = 'Computer Science',
  categoryColor = 'yellow',
  title = 'AI & Deep Learning Foundations: Neural Architectures',
  eyebrow = 'New course matching your interests',
  avatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80'
  ],
  extraCount = 100,
  onAction,
  className = ''
}) {
  return (
    <div
      className={`card-ink ${className}`}
      style={{
        padding: '1.75rem',
        borderRadius: 'var(--radius-xl)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div>
        {/* Eyebrow */}
        <div
          style={{
            fontSize: '0.75rem',
            color: 'rgba(255, 255, 255, 0.65)',
            marginBottom: '0.75rem',
            fontWeight: 500
          }}
        >
          {eyebrow}
        </div>

        {/* Category Pill */}
        <Pill color={categoryColor} size="sm" style={{ marginBottom: '1rem' }}>
          {category}
        </Pill>

        {/* Title */}
        <h3
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#ffffff',
            lineHeight: 1.25,
            marginBottom: '1.5rem'
          }}
        >
          {title}
        </h3>
      </div>

      <div>
        {/* Social Proof */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.6)',
              marginBottom: '0.5rem'
            }}
          >
            They are already studying
          </div>
          <AvatarStack avatars={avatars} extraCount={extraCount} size={28} />
        </div>

        {/* Full width button */}
        <Button
          variant="orange"
          size="md"
          onClick={onAction}
          style={{ width: '100%', borderRadius: 'var(--radius-full)' }}
        >
          More details
        </Button>
      </div>
    </div>
  );
}

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
