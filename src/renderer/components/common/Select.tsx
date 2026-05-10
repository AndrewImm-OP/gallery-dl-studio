import React from 'react';
import { ChevronDown } from 'lucide-react';
import './Select.css';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
  onChange: (value: string) => void;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  helperText,
  onChange,
  value,
  className,
  style,
  ...props
}) => {
  return (
    <div className="select-group">
      {label && (
        <label className="select-label">
          {label}
        </label>
      )}
      <div className="select-wrapper">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`select${error ? ' select--error' : ''}${className ? ` ${className}` : ''}`}
          style={style}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className="select-chevron" />
      </div>
      {error && (
        <span className="select-error">
          {error}
        </span>
      )}
      {helperText && !error && (
        <span className="select-helper">
          {helperText}
        </span>
      )}
    </div>
  );
};
