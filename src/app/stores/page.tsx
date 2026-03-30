'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import type { FileSearchStore } from '@/types/gemini';

export default function StoresPage() {
  const { t } = useI18n();
  const { success, error } = useToast();
  const [stores, setStores] = useState<FileSearchStore[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<string | null>(null);
  
  // Form states
  const [newStoreName, setNewStoreName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadStores = async () => {
    try {
      setLoading(true);
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
  };

  useEffect(() => {
    loadStores();
  }, []);

  const handleCreate = async () => {
    if (!newStoreName.trim()) return;
    
    try {
      setSubmitting(true);
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: newStoreName }),
      });
      const json = await res.json();
      
      if (json.success) {
        success(t('common.success'));
        setIsCreateOpen(false);
        setNewStoreName('');
        loadStores();
      } else {
        error(json.error || t('common.error'));
      }
    } catch (err) {
      error(t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!storeToDelete) return;
    
    try {
      setSubmitting(true);
      const res = await fetch(`/api/stores?name=${encodeURIComponent(storeToDelete)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      
      if (json.success) {
        success(t('common.success'));
        setIsDeleteOpen(false);
        setStoreToDelete(null);
        loadStores();
      } else {
        error(json.error || t('common.error'));
      }
    } catch (err) {
      error(t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const formatSize = (bytesStr: string) => {
    const bytes = parseInt(bytesStr || '0', 10);
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="stores-page">
      <div className="page-header">
        <h1>{t('stores.title')}</h1>
        <Button onClick={() => setIsCreateOpen(true)}>{t('stores.create')}</Button>
      </div>

      <Card className="stores-card">
        {loading ? (
          <div className="loading-state">{t('common.loading')}</div>
        ) : stores.length === 0 ? (
          <div className="empty-state">
            <p>{t('stores.empty')}</p>
            <Button onClick={() => setIsCreateOpen(true)}>{t('stores.create')}</Button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="stores-table">
              <thead>
                <tr>
                  <th>{t('stores.displayName')}</th>
                  <th>{t('stores.name')}</th>
                  <th>{t('stores.documents')}</th>
                  <th>{t('stores.size')}</th>
                  <th>{t('stores.created')}</th>
                  <th align="right">{t('stores.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((store) => {
                  const id = store.name.split('/').pop();
                  return (
                    <tr key={store.name}>
                      <td className="store-name">
                        <Link href={`/stores/${id}`}>
                          {store.displayName || '-'}
                        </Link>
                      </td>
                      <td className="text-secondary text-sm">{id}</td>
                      <td>
                        <div className="doc-stats">
                          <span title={t('stores.activeDocuments')} className="stat active">{store.activeDocumentsCount || '0'}</span>
                          {parseInt(store.pendingDocumentsCount || '0') > 0 && (
                            <span title={t('stores.pendingDocuments')} className="stat pending">+{store.pendingDocumentsCount}</span>
                          )}
                          {parseInt(store.failedDocumentsCount || '0') > 0 && (
                            <span title={t('stores.failedDocuments')} className="stat failed">!{store.failedDocumentsCount}</span>
                          )}
                        </div>
                      </td>
                      <td>{formatSize(store.sizeBytes)}</td>
                      <td className="text-tertiary text-sm">{formatDate(store.createTime)}</td>
                      <td className="actions" align="right">
                        <Link href={`/stores/${id}`}>
                          <Button variant="secondary" size="sm">{t('stores.viewDocuments')}</Button>
                        </Link>
                        <Button 
                          variant="danger" 
                          size="sm" 
                          onClick={() => {
                            setStoreToDelete(store.name);
                            setIsDeleteOpen(true);
                          }}
                        >
                          {t('stores.delete')}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Store Dialog */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => !submitting && setIsCreateOpen(false)}
        title={t('stores.create')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)} disabled={submitting}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreate} isLoading={submitting} disabled={!newStoreName.trim()}>
              {t('common.confirm')}
            </Button>
          </>
        }
      >
        <Input
          label={t('stores.displayName')}
          placeholder={t('stores.createPlaceholder')}
          value={newStoreName}
          onChange={(e) => setNewStoreName(e.target.value)}
          disabled={submitting}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newStoreName.trim() && !submitting) {
              handleCreate();
            }
          }}
        />
      </Dialog>

      {/* Delete Store Dialog */}
      <Dialog
        isOpen={isDeleteOpen}
        onClose={() => !submitting && setIsDeleteOpen(false)}
        title={t('stores.delete')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)} disabled={submitting}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={handleDelete} isLoading={submitting}>
              {t('stores.delete')}
            </Button>
          </>
        }
      >
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {t('stores.confirmDelete')}
          <br />
          <br />
          <strong style={{ color: 'var(--text-primary)' }}>{storeToDelete}</strong>
        </p>
      </Dialog>

      <style jsx>{`
        .stores-page {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-2xl);
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .page-header h1 {
          font-size: 24px;
          font-weight: var(--font-weight-bold);
        }

        .stores-card {
          padding: 0;
          overflow: hidden;
        }

        .loading-state,
        .empty-state {
          padding: var(--spacing-3xl) 0;
          text-align: center;
          color: var(--text-secondary);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--spacing-lg);
        }

        .table-responsive {
          width: 100%;
          overflow-x: auto;
        }

        .stores-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .stores-table th,
        .stores-table td {
          padding: var(--spacing-lg) var(--spacing-xl);
          border-bottom: 1px solid var(--border-color);
        }

        .stores-table th {
          font-weight: var(--font-weight-medium);
          color: var(--text-secondary);
          font-size: var(--font-size-caption);
          background-color: var(--bg-sidebar);
        }

        .stores-table tr:hover {
          background-color: var(--bg-hover);
        }

        .stores-table tr:last-child td {
          border-bottom: none;
        }

        .store-name a {
          font-weight: var(--font-weight-medium);
          color: var(--primary);
          text-decoration: none;
        }

        .store-name a:hover {
          text-decoration: underline;
        }

        .text-secondary { color: var(--text-secondary); }
        .text-tertiary { color: var(--text-tertiary); }
        .text-sm { font-size: var(--font-size-caption); }

        .doc-stats {
          display: flex;
          gap: var(--spacing-sm);
          align-items: center;
        }

        .stat {
          font-size: var(--font-size-small);
          font-family: monospace;
        }

        .stat.active { color: var(--text-primary); }
        .stat.pending { color: var(--warn); }
        .stat.failed { color: var(--error); }

        .actions {
          display: flex;
          gap: var(--spacing-sm);
          justify-content: flex-end;
        }

        @media (max-width: 768px) {
          .stores-table th,
          .stores-table td {
            padding: var(--spacing-md);
          }
          
          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--spacing-md);
          }
        }
      `}</style>
    </div>
  );
}
