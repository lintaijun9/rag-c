'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import type { FileSearchDocument, FileSearchStore } from '@/types/gemini';

export default function DocumentsPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const { t } = useI18n();
  const { success, error } = useToast();
  
  const [store, setStore] = useState<FileSearchStore | null>(null);
  const [documents, setDocuments] = useState<FileSearchDocument[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load store info
      const storeRes = await fetch(`/api/stores/${storeId}`);
      const storeJson = await storeRes.json();
      
      // Load documents
      const docsRes = await fetch(`/api/stores/${storeId}/documents`);
      const docsJson = await docsRes.json();
      
      if (storeJson.success) setStore(storeJson.data);
      if (docsJson.success) setDocuments(docsJson.data || []);
      else error(docsJson.error || t('common.error'));
      
    } catch (err) {
      error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (storeId) {
      loadData();
    }
  }, [storeId]);

  const handleDelete = async () => {
    if (!docToDelete) return;
    
    try {
      setSubmitting(true);
      const res = await fetch(`/api/stores/${storeId}/documents?name=${encodeURIComponent(docToDelete)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      
      if (json.success) {
        success(t('common.success'));
        setIsDeleteOpen(false);
        setDocToDelete(null);
        loadData();
      } else {
        error(json.error || t('common.error'));
      }
    } catch (err) {
      error(t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const formatSize = (bytesStr: string) => {
    const bytes = parseInt(bytesStr || '0', 10);
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStateColor = (state: string) => {
    switch(state) {
      case 'STATE_ACTIVE': return 'var(--success)';
      case 'STATE_PENDING': return 'var(--warn)';
      case 'STATE_FAILED': return 'var(--error)';
      default: return 'var(--text-tertiary)';
    }
  };

  const shortName = (name: string) => {
    if (!name) return '';
    return name.split('/').pop() || name;
  };

  return (
    <div className="documents-page">
      <div className="page-header">
        <div className="page-title">
          <Link href="/stores" className="back-link">
            ← {t('common.back')}
          </Link>
          <h1>{store ? store.displayName : t('documents.title')}</h1>
        </div>
        <div className="header-actions">
          <Button variant="secondary" onClick={loadData}>{t('common.refresh')}</Button>
          <Link href={`/stores/${storeId}/upload`}>
            <Button>{t('documents.upload')}</Button>
          </Link>
        </div>
      </div>

      <Card className="documents-card">
        {loading ? (
          <div className="loading-state">{t('common.loading')}</div>
        ) : documents.length === 0 ? (
          <div className="empty-state">
            <p>{t('documents.empty')}</p>
            <Link href={`/stores/${storeId}/upload`}>
              <Button>{t('documents.upload')}</Button>
            </Link>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="documents-table">
              <thead>
                <tr>
                  <th>{t('documents.name')}</th>
                  <th>{t('documents.status')}</th>
                  <th>{t('documents.size')}</th>
                  <th>{t('documents.type')}</th>
                  <th>{t('documents.metadata')}</th>
                  <th align="right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => {
                  const id = doc.name.split('/').pop();
                  return (
                    <tr key={doc.name}>
                      <td className="doc-name">
                        <div className="name-primary">{doc.displayName || id}</div>
                        <div className="name-secondary">{shortName(doc.name)}</div>
                      </td>
                      <td>
                        <div className="status-badge" style={{ backgroundColor: `${getStateColor(doc.state)}20`, color: getStateColor(doc.state) }}>
                          {doc.state.replace('STATE_', '')}
                        </div>
                      </td>
                      <td className="text-secondary">{formatSize(doc.sizeBytes)}</td>
                      <td className="text-secondary text-sm">{doc.mimeType || '-'}</td>
                      <td className="doc-metadata">
                        {doc.customMetadata && doc.customMetadata.length > 0 ? (
                          <div className="metadata-tags">
                            {doc.customMetadata.map((meta, i) => {
                              const value = meta.stringValue || meta.numericValue || (meta.stringListValue ? meta.stringListValue.values.join(', ') : '');
                              return (
                                <span key={i} className="metadata-tag" title={`${meta.key}: ${value}`}>
                                  {meta.key}: {value}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-secondary">-</span>
                        )}
                      </td>
                      <td className="actions" align="right">
                        <Button 
                          variant="danger" 
                          size="sm" 
                          onClick={() => {
                            setDocToDelete(doc.name);
                            setIsDeleteOpen(true);
                          }}
                        >
                          {t('documents.delete')}
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

      {/* Delete Document Dialog */}
      <Dialog
        isOpen={isDeleteOpen}
        onClose={() => !submitting && setIsDeleteOpen(false)}
        title={t('documents.delete')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)} disabled={submitting}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={handleDelete} isLoading={submitting}>
              {t('documents.delete')}
            </Button>
          </>
        }
      >
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {t('documents.confirmDelete')}
          <br />
          <br />
          <strong style={{ color: 'var(--text-primary)' }}>{shortName(docToDelete || '')}</strong>
        </p>
      </Dialog>

      <style jsx>{`
        .documents-page {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-2xl);
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: var(--spacing-md);
        }

        .page-title {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .back-link {
          font-size: var(--font-size-caption);
          color: var(--text-secondary);
          text-decoration: none;
        }

        .back-link:hover {
          color: var(--primary);
        }

        .page-title h1 {
          font-size: 24px;
          font-weight: var(--font-weight-bold);
        }

        .header-actions {
          display: flex;
          gap: var(--spacing-sm);
        }

        .documents-card {
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

        .documents-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .documents-table th,
        .documents-table td {
          padding: var(--spacing-lg) var(--spacing-xl);
          border-bottom: 1px solid var(--border-color);
        }

        .documents-table th {
          font-weight: var(--font-weight-medium);
          color: var(--text-secondary);
          font-size: var(--font-size-caption);
          background-color: var(--bg-sidebar);
        }

        .documents-table tr:hover {
          background-color: var(--bg-hover);
        }

        .documents-table tr:last-child td {
          border-bottom: none;
        }

        .doc-name {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .doc-metadata {
          max-width: 250px;
        }

        .metadata-tags {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-xs);
        }

        .metadata-tag {
          font-size: var(--font-size-small);
          padding: 2px 6px;
          background-color: var(--bg-hover);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
          display: inline-block;
        }

        .name-primary {
          font-weight: var(--font-weight-medium);
          color: var(--text-primary);
        }

        .name-secondary {
          font-size: var(--font-size-small);
          color: var(--text-tertiary);
          font-family: monospace;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 2px var(--spacing-sm);
          border-radius: var(--radius-full);
          font-size: var(--font-size-small);
          font-weight: var(--font-weight-bold);
          line-height: 1.5;
        }

        .text-secondary { color: var(--text-secondary); }
        .text-sm { font-size: var(--font-size-caption); }

        .actions {
          display: flex;
          gap: var(--spacing-sm);
          justify-content: flex-end;
        }

        @media (max-width: 768px) {
          .documents-table th,
          .documents-table td {
            padding: var(--spacing-md);
          }
        }
      `}</style>
    </div>
  );
}
