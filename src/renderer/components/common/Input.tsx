import React, { forwardRef } from 'react';
import './Input.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className, style, ...props }, ref) => {
    const inputClasses = [
      'input',
      leftIcon && 'input--has-left-icon',
      rightIcon && 'input--has-right-icon',
      error && 'input--error',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="input-group">
        {label && (
          <label className="input-label">
            {label}
          </label>
        )}
        <div className="input-wrapper">
          {leftIcon && (
            <span className="input-icon--left">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            className={inputClasses}
            style={style}
            {...props}
          />
          {rightIcon && (
            <span className="input-icon--right">
              {rightIcon}
            </span>
          )}
        </div>
        {error && (
          <span className="input-error">
            {error}
          </span>
        )}
        {helperText && !error && (
          <span className="input-helper">
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
