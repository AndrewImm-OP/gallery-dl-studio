import React, { useState, useCallback } from 'react';
import { Link, Plus, Clipboard } from 'lucide-react';
import { Button } from '@/components/common/Button';
import './UrlInput.css';

interface UrlInputProps {
  onSubmit: (url: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export const UrlInput: React.FC<UrlInputProps> = ({
  onSubmit,
  isLoading = false,
  placeholder = 'Paste a URL to download...',
}) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const validateUrl = (input: string): boolean => {
    try {
      new URL(input);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = useCallback(() => {
    const trimmed = url.trim();
    if (!trimmed) {
      setError('Please enter a URL');
      return;
    }
    if (!validateUrl(trimmed)) {
      setError('Please enter a valid URL');
      return;
    }
    setError(null);
    onSubmit(trimmed);
    setUrl('');
  }, [url, onSubmit]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const trimmed = text.trim();
      if (validateUrl(trimmed)) {
        setUrl(trimmed);
        setError(null);
      } else {
        setUrl(trimmed);
        setError('Clipboard content is not a valid URL');
      }
    } catch {
      setError('Failed to read clipboard');
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="url-input">
      <div className="url-input__row">
        <div className="url-input__field-wrapper">
          <Link size={18} className="url-input__icon" />
          <input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`url-input__field${error ? ' url-input__field--error' : ''}`}
          />
        </div>
        <Button
          variant="ghost"
          size="md"
          icon={<Clipboard size={18} />}
          onClick={handlePaste}
          title="Paste from clipboard"
          className="url-input__paste-btn"
        />
        <Button
          variant="primary"
          size="md"
          icon={<Plus size={18} />}
          onClick={handleSubmit}
          loading={isLoading}
          className="url-input__add-btn"
        >
          Add
        </Button>
      </div>
      {error && (
        <span className="url-input__error">
          {error}
        </span>
      )}
    </div>
  );
};
