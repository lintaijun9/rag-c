import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, ...props }, ref) => {
    return (
      <div className={`input-wrapper ${className}`}>
        {label && <label className="input-label">{label}</label>}
        <input
          ref={ref}
          className={`input-field ${error ? 'input-error' : ''}`}
          {...props}
        />
        {error && <span className="input-error-msg">{error}</span>}

        <style jsx>{`
          .input-wrapper {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-xs);
            width: 100%;
          }

          .input-label {
            font-size: var(--font-size-caption);
            font-weight: var(--font-weight-medium);
            color: var(--text-secondary);
          }

          .input-field {
            height: var(--input-height);
            padding: 0 var(--spacing-md);
            border-radius: var(--radius-input);
            border: 1px solid var(--border-color-strong);
            background-color: var(--bg-cell);
            color: var(--text-primary);
            font-size: var(--font-size-body);
            transition: all var(--transition-fast);
          }

          .input-field:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 2px rgba(7, 193, 96, 0.2);
          }

          .input-field:disabled {
            background-color: var(--bg-page);
            color: var(--text-tertiary);
            cursor: not-allowed;
          }

          .input-error {
            border-color: var(--error);
          }
          .input-error:focus {
            box-shadow: 0 0 0 2px rgba(250, 81, 81, 0.2);
          }

          .input-error-msg {
            color: var(--error);
            font-size: var(--font-size-small);
            margin-top: 2px;
          }
        `}</style>
      </div>
    );
  }
);

Input.displayName = 'Input';
