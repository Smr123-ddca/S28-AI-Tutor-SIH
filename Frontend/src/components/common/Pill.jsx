import React from 'react';

export function getCategoryColor(category = '') {
  const cat = category.toLowerCase();
  if (cat.includes('math') || cat.includes('marketing') || cat.includes('assessment')) return 'yellow';
  if (cat.includes('comp') || cat.includes('algo') || cat.includes('psych')) return 'purple';
  if (cat.includes('phys') || cat.includes('wave') || cat.includes('system')) return 'sky';
  if (cat.includes('urgent') || cat.includes('live') || cat.includes('update')) return 'orange';
  return 'ink';
}

export function Pill({
  children,
  color, // 'yellow' | 'purple' | 'sky' | 'orange' | 'ink' | 'green' | 'red'
  category,
  size = 'md', // 'sm' | 'md'
  icon: Icon,
  className = '',
  style = {}
}) {
  const resolvedColor = color || (category ? getCategoryColor(category) : 'ink');

  const getColorClass = () => {
    switch (resolvedColor) {
      case 'yellow':
        return 'bg-tag-yellow';
      case 'purple':
        return 'bg-tag-purple';
      case 'sky':
        return 'bg-tag-sky';
      case 'orange':
        return 'bg-tag-orange';
      case 'green':
        return 'bg-green';
      case 'red':
        return 'bg-red';
      default:
        return 'bg-tag-ink';
    }
  };

  const isDarkTag = resolvedColor === 'ink' || resolvedColor === 'orange' || resolvedColor === 'red';

  return (
    <span
      className={`pill-badge ${getColorClass()} ${className}`}
      style={{
        padding: size === 'sm' ? '0.25rem 0.65rem' : '0.35rem 0.85rem',
        fontSize: size === 'sm' ? '0.7rem' : '0.78rem',
        color: isDarkTag ? '#ffffff' : '#151313',
        ...style
      }}
    >
      {Icon && <Icon size={size === 'sm' ? 12 : 14} />}
      {children}
    </span>
  );
}
