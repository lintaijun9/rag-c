import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div className={`card ${className}`} {...props}>
      {children}
      <style jsx>{`
        .card {
          background-color: var(--bg-cell);
          border-radius: var(--radius-card);
          box-shadow: var(--shadow-sm);
          padding: var(--spacing-xl);
          border: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }
      `}</style>
    </div>
  );
}
