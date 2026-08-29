import React from 'react';
import { Bookmark, ArrowRight, Play } from 'lucide-react';
import { Pill, getCategoryColor } from '../common/Pill';
import { AvatarStack, ProgressBar } from '../common/AvatarStack';
import { Button } from '../common/Button';

export function CourseCard({
  category = 'Computer Science',
  title = 'Data Structures & Algorithms',
  progressCurrent = 12,
  progressTotal = 20,
  unit = 'lessons',
  participantAvatars = [],
  participantExtraCount = 120,
  onContinue,
  onBookmark,
  className = ''
}) {
  const categoryColor = getCategoryColor(category);

  // Background tint per category
  const getCardBg = () => {
    switch (categoryColor) {
      case 'yellow':
        return 'var(--color-yellow-light)';
      case 'purple':
        return 'var(--color-purple-light)';
      case 'sky':
        return 'var(--color-sky-light)';
      default:
        return 'var(--color-white)';
    }
  };

  const getBorderColor = () => {
    switch (categoryColor) {
      case 'yellow':
        return '#fae39a';
      case 'purple':
        return '#dfc9fa';
      case 'sky':
        return '#b8d6e8';
      default:
        return 'var(--color-border)';
    }
  };

  return (
    <div
      className={`card-white ${className}`}
      style={{
        backgroundColor: getCardBg(),
        border: `1.5px solid ${getBorderColor()}`,
        padding: '1.5rem',
        borderRadius: 'var(--radius-xl)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '270px',
        transition: 'transform var(--transition-normal), box-shadow var(--transition-normal)'
      }}
    >
      {/* Top Row: Category Tag Pill + Bookmark Button */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <Pill category={category} color={categoryColor} size="sm">
            {category}
          </Pill>
          <button
            type="button"
            onClick={onBookmark}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-ink)',
              border: '1px solid rgba(21, 19, 19, 0.08)'
            }}
            title="Bookmark"
          >
            <Bookmark size={15} />
          </button>
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            color: 'var(--color-ink)',
            lineHeight: 1.25,
            marginBottom: '1.25rem'
          }}
        >
          {title}
        </h3>
      </div>

      {/* Progress & Bottom Row */}
      <div>
        {/* Progress labels */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
            marginBottom: '0.4rem'
          }}
        >
          <span>Progress</span>
          <span style={{ color: 'var(--color-ink)', fontWeight: 700 }}>
            {progressCurrent}/{progressTotal} {unit}
          </span>
        </div>

        {/* Progress Bar */}
        <ProgressBar
          current={progressCurrent}
          total={progressTotal}
          color={categoryColor === 'yellow' ? 'ink' : 'orange'}
          height={6}
          style={{ marginBottom: '1.25rem' }}
        />

        {/* Bottom Avatar Stack & Continue Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <AvatarStack
            avatars={participantAvatars}
            extraCount={participantExtraCount}
            size={30}
            maxVisible={3}
          />
          <Button
            size="sm"
            variant="orange"
            onClick={onContinue}
            icon={ArrowRight}
            iconPosition="right"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
