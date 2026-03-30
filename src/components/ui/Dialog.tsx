import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Dialog({ isOpen, onClose, title, children, footer, className = '' }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div 
      className="dialog-overlay" 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        ref={dialogRef}
        className={`dialog-content ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div className="dialog-header">
          <h2 id="dialog-title">{title}</h2>
          <button className="dialog-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="dialog-body">
          {children}
        </div>
        {footer && (
          <div className="dialog-footer">
            {footer}
          </div>
        )}
      </div>

      <style jsx>{`
        .dialog-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--bg-mask);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: var(--z-modal);
          animation: fadeIn 0.2s ease;
          padding: var(--spacing-lg);
        }
        .dialog-content {
          background: var(--bg-cell);
          border-radius: var(--radius-card);
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--border-color);
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s ease;
        }
        .dialog-header {
          padding: var(--spacing-lg) var(--spacing-xl);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .dialog-header h2 {
          font-size: var(--font-size-h1);
          font-weight: var(--font-weight-bold);
          color: var(--text-primary);
        }
        .dialog-close {
          background: none;
          color: var(--text-tertiary);
          font-size: 24px;
          line-height: 1;
          padding: 4px;
        }
        .dialog-close:hover {
          color: var(--text-primary);
        }
        .dialog-body {
          padding: var(--spacing-xl);
          overflow-y: auto;
          flex: 1;
        }
        .dialog-footer {
          padding: var(--spacing-lg) var(--spacing-xl);
          background: var(--bg-sidebar);
          border-radius: 0 0 var(--radius-card) var(--radius-card);
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: flex-end;
          gap: var(--spacing-md);
        }
      `}</style>
    </div>,
    document.body
  );
}
