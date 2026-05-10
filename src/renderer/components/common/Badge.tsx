import React from 'react';
import './Badge.css';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
}) => {
  return (
    <span className={`badge badge--${variant} badge--${size}`}>
      {dot && <span className="badge__dot" />}
      {children}
    </span>
  );
};
