import React from 'react';
import './Button.css';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled,
  children,
  className,
  style,
  ...props
}) => {
  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    loading && 'btn--loading',
    disabled && 'btn--disabled',
    !children && icon && 'btn--icon-only',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      disabled={disabled || loading}
      className={classes}
      style={style}
      {...props}
    >
      {loading && <span className="btn__spinner" />}
      <span className={`btn__content${loading ? ' btn__content--hidden' : ''}`} style={loading ? { opacity: 0 } : undefined}>
        {icon && <span className="btn__icon">{icon}</span>}
        {children && <span className="btn__label">{children}</span>}
      </span>
    </button>
  );
};
