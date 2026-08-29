import React from 'react';

export function Button({
  children,
  variant = 'orange', // 'orange' | 'ink' | 'outline' | 'ghost'
  size = 'md',        // 'sm' | 'md' | 'lg'
  icon: Icon,
  iconPosition = 'left',
  className = '',
  disabled = false,
  onClick,
  type = 'button',
  ...props
}) {
  const getVariantClass = () => {
    switch (variant) {
      case 'orange':
        return 'btn-orange';
      case 'ink':
        return 'btn-ink';
      case 'outline':
        return 'btn-outline';
      case 'ghost':
        return 'btn-ghost';
      default:
        return 'btn-orange';
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'btn-sm';
      case 'lg':
        return 'btn-lg';
      default:
        return '';
    }
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`btn ${getVariantClass()} ${getSizeClass()} ${className}`}
      style={{ opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
      {...props}
    >
      {Icon && iconPosition === 'left' && <Icon size={size === 'sm' ? 16 : 18} />}
      {children}
      {Icon && iconPosition === 'right' && <Icon size={size === 'sm' ? 16 : 18} />}
    </button>
  );
}

export function IconButton({
  icon: Icon,
  variant = 'ghost',
  size = 'md',
  className = '',
  title,
  onClick,
  ...props
}) {
  const getVariantClass = () => {
    switch (variant) {
      case 'orange':
        return 'btn-orange';
      case 'ink':
        return 'btn-ink';
      case 'outline':
        return 'btn-outline';
      default:
        return 'btn-ghost';
    }
  };

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`btn-icon ${getVariantClass()} ${className}`}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 18 : 20} />}
    </button>
  );
}
