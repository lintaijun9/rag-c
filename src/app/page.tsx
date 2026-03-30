'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { FileSearchStore } from '@/types/gemini';
import { useToast } from '@/components/ui/Toast';

export default function DashboardPage() {
  const { t } = useI18n();
  const { error } = useToast();
  const [stores, setStores] = useState<FileSearchStore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStores() {
      try {
        const res = await fetch('/api/stores');
        const json = await res.json();
        if (json.success) {
          setStores(json.data || []);
        } else {
          error(json.error || t('common.error'));
        }
      } catch (err) {
        error(t('common.error'));
      } finally {
        setLoading(false);
      }
    }
    loadStores();
  }, [t, error]);

  const totalStores = stores.length;
  const totalDocuments = stores.reduce((acc, s) => acc + parseInt(s.activeDocumentsCount || '0', 10), 0);
  const totalSizeBytes = stores.reduce((acc, s) => acc + parseInt(s.sizeBytes || '0', 10), 0);
  const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(2);

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>{t('dashboard.title')}</h1>
      </div>

      <div className="stats-grid">
        <Card>
          <h3>{t('dashboard.totalStores')}</h3>
          <div className="stat-value">{loading ? '-' : totalStores}</div>
        </Card>
        <Card>
          <h3>{t('dashboard.totalDocuments')}</h3>
          <div className="stat-value">{loading ? '-' : totalDocuments}</div>
        </Card>
        <Card>
          <h3>{t('dashboard.totalSize')}</h3>
          <div className="stat-value">{loading ? '-' : `${totalSizeMB} MB`}</div>
        </Card>
      </div>

      <div className="dashboard-content">
        <div className="recent-stores-section">
          <h2>{t('dashboard.recentStores')}</h2>
          <Card className="list-card">
            {loading ? (
              <div className="loading-state">{t('common.loading')}</div>
            ) : stores.length === 0 ? (
              <div className="empty-state">
                <p>{t('stores.empty')}</p>
                <Link href="/stores">
                  <Button size="sm">{t('stores.create')}</Button>
                </Link>
              </div>
            ) : (
              <div className="store-list">
                {stores.slice(0, 5).map(store => {
                  const id = store.name.split('/').pop();
                  return (
                    <div key={store.name} className="store-item">
                      <div className="store-info">
                        <h4>{store.displayName || store.name}</h4>
                        <span>{store.activeDocumentsCount} docs</span>
                      </div>
                      <Link href={`/stores/${id}`}>
                        <Button variant="secondary" size="sm">{t('stores.viewDocuments')}</Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="quick-actions-section">
          <h2>{t('dashboard.quickActions')}</h2>
          <Card className="actions-card">
            <Link href="/stores" className="action-button">
              <span className="icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
              </span>
              <span>{t('dashboard.createStore')}</span>
            </Link>
            <Link href="/chat" className="action-button">
              <span className="icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </span>
              <span>{t('dashboard.startChat')}</span>
            </Link>
          </Card>
        </div>
      </div>

      <style jsx>{`
        .dashboard-page {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-2xl);
        }

        .page-header h1 {
          font-size: 24px;
          font-weight: var(--font-weight-bold);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: var(--spacing-lg);
        }

        .stats-grid h3 {
          font-size: var(--font-size-caption);
          color: var(--text-secondary);
          font-weight: var(--font-weight-normal);
        }

        .stat-value {
          font-size: 32px;
          font-weight: var(--font-weight-bold);
          color: var(--primary);
        }

        .dashboard-content {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: var(--spacing-xl);
        }

        .dashboard-content h2 {
          font-size: var(--font-size-body);
          margin-bottom: var(--spacing-md);
          font-weight: var(--font-weight-medium);
        }

        .loading-state,
        .empty-state {
          padding: var(--spacing-2xl) 0;
          text-align: center;
          color: var(--text-secondary);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--spacing-md);
        }

        .store-list {
          display: flex;
          flex-direction: column;
        }

        .store-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-md) 0;
          border-bottom: 1px solid var(--border-color);
        }

        .store-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .store-item:first-child {
          padding-top: 0;
        }

        .store-info h4 {
          font-size: var(--font-size-body);
          font-weight: var(--font-weight-medium);
          margin-bottom: var(--spacing-xs);
        }

        .store-info span {
          font-size: var(--font-size-small);
          color: var(--text-tertiary);
        }

        .actions-card {
          padding: var(--spacing-lg);
          gap: var(--spacing-md);
        }

        .action-button {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          background-color: var(--bg-page);
          border-radius: var(--radius-card);
          color: var(--text-primary);
          text-decoration: none;
          transition: background-color var(--transition-fast);
          font-weight: var(--font-weight-medium);
        }

        .action-button:hover {
          background-color: var(--bg-hover);
          text-decoration: none;
        }

        .action-button .icon {
          display: flex;
          color: var(--primary);
        }

        @media (max-width: 768px) {
          .dashboard-content {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
