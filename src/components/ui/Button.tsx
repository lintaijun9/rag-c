import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

export function Button({
  className = '',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${isLoading ? 'loading' : ''} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <span className="spinner"></span>}
      <span className="btn-content">{children}</span>

      <style jsx>{`
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
          font-family: var(--font-family);
          font-weight: var(--font-weight-medium);
          border-radius: var(--radius-button);
          border: none;
          cursor: pointer;
          transition: all var(--transition-fast);
          outline: none;
          position: relative;
          text-decoration: none;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Sizes */
        .btn-sm {
          height: var(--button-height-sm);
          padding: 0 var(--spacing-lg);
          font-size: var(--font-size-caption);
        }

        .btn-md {
          height: var(--button-height);
          padding: 0 var(--spacing-xl);
          font-size: var(--font-size-body);
        }

        .btn-lg {
          height: 56px;
          padding: 0 var(--spacing-2xl);
          font-size: var(--font-size-h1);
        }

        /* Variants */
        .btn-primary {
          background-color: var(--primary);
          color: #FFFFFF;
        }
        .btn-primary:hover:not(:disabled) {
          background-color: var(--primary-hover);
        }
        .btn-primary:active:not(:disabled) {
          background-color: var(--primary-active);
        }

        .btn-secondary {
          background-color: var(--bg-active);
          color: var(--text-primary);
        }
        .btn-secondary:hover:not(:disabled) {
          background-color: var(--bg-hover);
        }

        .btn-danger {
          background-color: rgba(250, 81, 81, 0.1);
          color: var(--error);
        }
        .btn-danger:hover:not(:disabled) {
          background-color: rgba(250, 81, 81, 0.2);
        }

        .btn-ghost {
          background-color: transparent;
          color: var(--text-primary);
        }
        .btn-ghost:hover:not(:disabled) {
          background-color: var(--bg-hover);
        }

        /* Loading state */
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid currentColor;
          border-bottom-color: transparent;
          border-radius: 50%;
          display: inline-block;
          animation: spin 1s linear infinite;
        }

        .btn-content {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </button>
  );
}
