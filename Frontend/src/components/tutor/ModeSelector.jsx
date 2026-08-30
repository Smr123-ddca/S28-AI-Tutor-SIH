import React from 'react';
import { HelpCircle, CheckSquare, Sparkles } from 'lucide-react';

export function ModeSelector({
  activeMode = 'ask_doubt', // 'ask_doubt' | 'practice_test' | 'study_plan'
  onSelectMode,
  className = ''
}) {
  const modes = [
    {
      id: 'ask_doubt',
      label: 'Ask a Doubt',
      description: 'Syllabus-grounded explanations with source citations',
      icon: HelpCircle,
      accent: 'orange'
    },
    {
      id: 'practice_test',
      label: 'Practice Test',
      description: 'Interactive questions with progressive hint ladders',
      icon: CheckSquare,
      accent: 'purple'
    },
    {
      id: 'study_plan',
      label: 'Study Plan / Mock Test',
      description: 'Custom learning path and diagnostic assessment',
      icon: Sparkles,
      accent: 'yellow'
    }
  ];

  return (
    <div
      className={`mode-selector-bar ${className}`}
      style={{
        display: 'flex',
        gap: '0.75rem',
        width: '100%',
        overflowX: 'auto',
        paddingBottom: '0.5rem'
      }}
    >
      {modes.map((m) => {
        const Icon = m.icon;
        const isActive = activeMode === m.id;

        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelectMode(m.id)}
            style={{
              flex: 1,
              minWidth: '180px',
              padding: '0.85rem 1.15rem',
              borderRadius: 'var(--radius-lg)',
              border: isActive
                ? '2px solid var(--color-orange)'
                : '1.5px solid var(--color-border)',
              backgroundColor: isActive ? 'var(--color-orange-subtle)' : 'var(--color-white)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              textAlign: 'left',
              transition: 'all var(--transition-fast)',
              boxShadow: isActive ? 'var(--shadow-orange)' : 'var(--shadow-sm)'
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: isActive ? 'var(--color-orange)' : 'var(--color-surface-subtle)',
                color: isActive ? '#ffffff' : m.accent === 'purple' ? 'var(--color-purple)' : m.accent === 'yellow' ? 'var(--color-yellow)' : 'var(--color-orange)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Icon size={18} />
            </div>

            <div>
              <div
                style={{
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  color: 'var(--color-ink)',
                  lineHeight: 1.2
                }}
              >
                {m.label}
              </div>
              <div
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--color-text-secondary)',
                  marginTop: '0.15rem'
                }}
              >
                {m.id === 'ask_doubt' ? 'Direct Q&A' : m.id === 'practice_test' ? 'Socratic Hints' : 'Roadmap'}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
