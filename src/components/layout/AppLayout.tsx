'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n, I18nProvider } from '@/lib/i18n';
import { ToastProvider } from '@/components/ui/Toast';
import { ThemeProvider } from '@/lib/theme';

const Icons = {
  Dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  Stores: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    </svg>
  ),
  Chat: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  Settings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Rag: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
      <path d="M11 8v6M8 11h6" />
    </svg>
  )
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: t('nav.dashboard'), icon: Icons.Dashboard },
    { href: '/stores', label: t('nav.stores'), icon: Icons.Stores },
    { href: '/chat', label: t('nav.chat'), icon: Icons.Chat },
    { href: '/rag', label: t('nav.rag'), icon: Icons.Rag },
    { href: '/settings', label: t('nav.settings'), icon: Icons.Settings },
  ];

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-mark">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <h1>Gemini RAG</h1>
        </div>
        <nav className="nav-menu">
          {navItems.map((item) => {
            const isActive = item.href === '/' 
              ? pathname === '/' 
              : pathname.startsWith(item.href);
              
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      
      <main className="main-content">
        <header className="mobile-header">
          <div className="logo-mark">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <h1>Gemini RAG</h1>
        </header>
        <div className="page-content">
          {children}
        </div>
      </main>

      <style jsx>{`
        .app-container {
          display: flex;
          min-height: 100vh;
          background-color: var(--bg-page);
          color: var(--text-primary);
        }

        .sidebar {
          width: var(--sidebar-width);
          background-color: var(--bg-sidebar, var(--bg-cell));
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0;
          bottom: 0;
          left: 0;
          z-index: 10;
          transition: transform var(--transition-normal);
        }

        .logo {
          height: var(--navbar-height, 64px);
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 var(--spacing-xl);
          border-bottom: 1px solid var(--border-color);
        }
        
        .logo-mark {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, var(--primary) 0%, #05a050 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(7, 193, 96, 0.3);
        }

        .logo h1, .mobile-header h1 {
          font-size: 18px;
          color: var(--text-primary);
          font-weight: 700;
          letter-spacing: -0.5px;
          margin: 0;
        }

        .nav-menu {
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .nav-menu :global(.nav-item) {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 16px;
          border-radius: 12px;
          color: var(--text-secondary);
          text-decoration: none;
          transition: all 0.2s ease;
          font-weight: 500;
          font-size: 15px;
          position: relative;
          overflow: hidden;
        }

        .nav-menu :global(.nav-item::before) {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background-color: var(--primary);
          border-radius: 0 4px 4px 0;
          transform: scaleY(0);
          transition: transform 0.2s ease;
        }

        .nav-menu :global(.nav-item:hover) {
          background-color: rgba(7, 193, 96, 0.08);
          color: var(--primary);
        }

        .nav-menu :global(.nav-item.active) {
          background-color: rgba(7, 193, 96, 0.12);
          color: var(--primary);
          font-weight: 600;
        }

        .nav-menu :global(.nav-item.active::before) {
          transform: scaleY(1);
        }
        
        .nav-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.8;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .nav-menu :global(.nav-item:hover) .nav-icon {
           opacity: 1;
           transform: scale(1.1);
        }
        
        .nav-menu :global(.nav-item.active) .nav-icon {
           opacity: 1;
        }

        .main-content {
          flex: 1;
          margin-left: var(--sidebar-width);
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        .mobile-header {
          display: none;
          height: var(--navbar-height, 60px);
          background-color: var(--bg-cell);
          border-bottom: 1px solid var(--border-color);
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 0 var(--page-edge);
          position: sticky;
          top: 0;
          z-index: 5;
          box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05));
        }

        .page-content {
          padding: var(--spacing-2xl) var(--page-edge);
          flex: 1;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }

        @media (max-width: 768px) {
          .app-container {
            flex-direction: column;
          }
          .sidebar {
            display: none;
          }
          .main-content {
            margin-left: 0;
          }
          .mobile-header {
            display: flex;
          }
          .page-content {
            padding-top: var(--spacing-lg);
          }
        }
      `}</style>
    </div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
