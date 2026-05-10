import React from 'react';
import { motion } from 'framer-motion';
import './ProgressBar.css';

type ProgressVariant = 'default' | 'success' | 'warning' | 'error';

interface ProgressBarProps {
  value: number; // 0-100
  variant?: ProgressVariant;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
  label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  variant = 'default',
  size = 'md',
  showLabel = false,
  animated = true,
  label,
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));
  const isComplete = clampedValue >= 100;

  return (
    <div className={`progress${isComplete ? ' progress--complete' : ''}`}>
      {(showLabel || label) && (
        <div className="progress__label-row">
          {label && <span className="progress__label">{label}</span>}
          {showLabel && <span className="progress__value">{Math.round(clampedValue)}%</span>}
        </div>
      )}
      <div className={`progress__track progress__track--${size}`}>
        <motion.div
          initial={animated ? { width: 0 } : false}
          animate={{ width: `${clampedValue}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`progress__fill progress__fill--${variant}`}
        />
      </div>
    </div>
  );
};
