import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export function ThemeToggle({ className = '', style = {}, size = 'md' }) {
  const { toggleTheme, isDark } = useTheme();

  const buttonSize = size === 'sm' ? '34px' : '42px';
  const iconSize = size === 'sm' ? 16 : 18;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`btn-icon btn-outline ${className}`}
      style={{
        width: buttonSize,
        height: buttonSize,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--radius-full)',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-white)',
        color: 'var(--color-ink)',
        cursor: 'pointer',
        transition: 'all var(--transition-normal)',
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
      title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
    >
      {isDark ? (
        <Sun
          size={iconSize}
          style={{
            color: 'var(--color-yellow)',
            transition: 'transform var(--transition-fast)'
          }}
        />
      ) : (
        <Moon
          size={iconSize}
          style={{
            color: 'var(--color-ink)',
            transition: 'transform var(--transition-fast)'
          }}
        />
      )}
    </button>
  );
}
