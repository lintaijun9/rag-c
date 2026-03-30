'use client';

import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import type { CustomMetadata, ChunkingConfig, UploadStatus } from '@/types/gemini';

interface FileWithStatus {
  file: File;
  id: string;
  status: UploadStatus;
  progress: number;
}

export default function UploadPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const { t } = useI18n();
  const { success, error, info } = useToast();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ completed: 0, total: 0, current: '' });

  // Chunking config
  const [maxTokens, setMaxTokens] = useState('512');
  const [overlapTokens, setOverlapTokens] = useState('50');

  // Metadata
  const [metadata, setMetadata] = useState<CustomMetadata[]>([]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles: File[]) => {
    // Check max files limit (simplification: just add to queue)
    const filesWithStatus = newFiles.map(file => ({
      file,
      id: Math.random().toString(36).substring(7),
      status: 'pending' as UploadStatus,
      progress: 0
    }));
    setFiles(prev => [...prev, ...filesWithStatus]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const addMetadataField = () => {
    setMetadata([...metadata, { key: '', stringValue: '' }]);
  };

  const updateMetadata = (index: number, field: keyof CustomMetadata, value: string) => {
    const newMetadata = [...metadata];
    
    if (field === 'key') {
      newMetadata[index].key = value;
    } else {
      // Clear other values when changing type
      const key = newMetadata[index].key;
      newMetadata[index] = { key };
      
      if (field === 'stringValue') {
        newMetadata[index].stringValue = value;
      } else if (field === 'numericValue') {
        newMetadata[index].numericValue = Number(value);
      }
    }
    setMetadata(newMetadata);
  };

  const removeMetadata = (index: number) => {
    setMetadata(metadata.filter((_, i) => i !== index));
  };

  const startUpload = async () => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress({ completed: 0, total: files.length, current: '' });

    // Prepare config
    const chunkingConfig: ChunkingConfig | undefined = maxTokens && overlapTokens ? {
      whiteSpaceConfig: {
        maxTokensPerChunk: parseInt(maxTokens, 10),
        maxOverlapTokens: parseInt(overlapTokens, 10),
      }
    } : undefined;

    const validMetadata = metadata.filter(m => m.key.trim() !== '');

    // Upload with concurrency (e.g., 5 at a time)
    const concurrency = 5;
    const queue = [...files.map((f, i) => ({ ...f, index: i }))];
    let completedCount = 0;
    
    const uploadWorker = async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) continue;
        
        // Update status to uploading
        setFiles(prev => {
          const next = [...prev];
          next[item.index] = { ...next[item.index], status: 'uploading' };
          return next;
        });

        try {
          const formData = new FormData();
          formData.append('file', item.file);
          formData.append('displayName', item.file.name);
          
          if (validMetadata.length > 0) {
            formData.append('metadata', JSON.stringify(validMetadata));
          }
          if (chunkingConfig) {
            formData.append('chunkingConfig', JSON.stringify(chunkingConfig));
          }

          const response = await fetch(`/api/stores/${storeId}/upload`, {
            method: 'POST',
            body: formData,
          });

          const result = await response.json();
          
          if (result.success) {
            setFiles(prev => {
              const next = [...prev];
              next[item.index] = { ...next[item.index], status: 'completed', progress: 100 };
              return next;
            });
          } else {
            setFiles(prev => {
              const next = [...prev];
              next[item.index] = { ...next[item.index], status: 'failed' };
              return next;
            });
          }
        } catch (err) {
          setFiles(prev => {
            const next = [...prev];
            next[item.index] = { ...next[item.index], status: 'failed' };
            return next;
          });
        } finally {
          completedCount++;
          setUploadProgress({ 
            completed: completedCount, 
            total: files.length, 
            current: item.file.name 
          });
        }
      }
    };

    // Start workers
    const workers = Array(Math.min(concurrency, files.length)).fill(0).map(() => uploadWorker());
    await Promise.all(workers);
    
    setIsUploading(false);
    
    // Check results
    const failedCount = files.filter(f => f.status === 'failed').length;
    if (failedCount === 0) {
      success(t('upload.completed'));
    } else {
      error(`${failedCount} files failed to upload`);
    }
  };

  return (
    <div className="upload-page">
      <div className="page-header">
        <div className="page-title">
          <Link href={`/stores/${storeId}`} className="back-link">
            ← {t('documents.backToStore')}
          </Link>
          <h1>{t('upload.title')}</h1>
        </div>
      </div>

      <div className="layout-grid">
        <div className="main-column">
          <Card>
            <div 
              className={`dropzone ${isDragging ? 'dragging' : ''} ${isUploading ? 'disabled' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                multiple 
                ref={fileInputRef} 
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                disabled={isUploading}
              />
              <div className="dropzone-icon">📁</div>
              <p>{t('upload.dropzone')}</p>
            </div>

            {files.length > 0 && (
              <div className="file-list-container">
                <div className="list-header">
                  <h3>{t('upload.selectedCount', { count: files.length })}</h3>
                  {!isUploading && (
                    <Button variant="ghost" size="sm" onClick={() => setFiles([])}>
                      {t('common.cancel')}
                    </Button>
                  )}
                </div>
                
                <div className="file-list">
                  {files.map((f, i) => (
                    <div key={f.id} className={`file-item status-${f.status}`}>
                      <div className="file-info">
                        <span className="file-name" title={f.file.name}>{f.file.name}</span>
                        <span className="file-size">{(f.file.size / 1024).toFixed(1)} KB</span>
                      </div>
                      <div className="file-status">
                        {f.status === 'pending' && !isUploading && (
                          <button className="remove-btn" onClick={() => removeFile(f.id)}>×</button>
                        )}
                        {f.status === 'uploading' && <div className="spinner-micro"></div>}
                        {f.status === 'completed' && <span className="icon-success">✓</span>}
                        {f.status === 'failed' && <span className="icon-error">!</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="side-column">
          <Card>
            <h2>{t('chunking.title')}</h2>
            <div className="config-form">
              <Input 
                label={t('chunking.maxTokens')} 
                type="number" 
                value={maxTokens} 
                onChange={(e) => setMaxTokens(e.target.value)} 
                disabled={isUploading}
              />
              <Input 
                label={t('chunking.overlap')} 
                type="number" 
                value={overlapTokens} 
                onChange={(e) => setOverlapTokens(e.target.value)} 
                disabled={isUploading}
              />
            </div>
          </Card>

          <Card>
            <div className="card-header-spaced">
              <h2>{t('metadata.title')}</h2>
              <Button variant="ghost" size="sm" onClick={addMetadataField} disabled={isUploading}>
                + {t('metadata.addField')}
              </Button>
            </div>
            
            <div className="metadata-list">
              {metadata.length === 0 && (
                <div className="text-secondary text-sm">{t('common.noData')}</div>
              )}
              {metadata.map((field, index) => (
                <div key={index} className="metadata-field">
                  <Input 
                    placeholder={t('metadata.key')} 
                    value={field.key} 
                    onChange={(e) => updateMetadata(index, 'key', e.target.value)}
                    disabled={isUploading}
                  />
                  <div className="field-row">
                    <select 
                      className="type-select"
                      value={field.stringValue !== undefined ? 'string' : 'number'}
                      onChange={(e) => updateMetadata(index, e.target.value === 'string' ? 'stringValue' : 'numericValue', '')}
                      disabled={isUploading}
                    >
                      <option value="string">{t('metadata.string')}</option>
                      <option value="number">{t('metadata.number')}</option>
                    </select>
                    <Input 
                      placeholder={t('metadata.value')} 
                      value={field.stringValue !== undefined ? field.stringValue : field.numericValue || ''} 
                      onChange={(e) => updateMetadata(index, field.stringValue !== undefined ? 'stringValue' : 'numericValue', e.target.value)}
                      type={field.stringValue !== undefined ? "text" : "number"}
                      disabled={isUploading}
                    />
                    <Button 
                      variant="danger" 
                      onClick={() => removeMetadata(index)}
                      disabled={isUploading}
                      style={{ padding: '0 12px' }}
                    >×</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="action-panel">
            {isUploading && (
              <div className="progress-info">
                <div className="progress-text">
                  {t('upload.progress', { completed: uploadProgress.completed, total: uploadProgress.total })}
                </div>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${(uploadProgress.completed / uploadProgress.total) * 100}%` }}
                  ></div>
                </div>
                <div className="current-file truncate">{uploadProgress.current}</div>
              </div>
            )}
            <Button 
              size="lg" 
              className="w-full" 
              onClick={startUpload}
              isLoading={isUploading}
              disabled={files.length === 0 || files.every(f => f.status === 'completed')}
            >
              {isUploading ? t('upload.uploading') : t('upload.startUpload')}
            </Button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .upload-page {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-2xl);
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

        .page-title h1 {
          font-size: 24px;
          font-weight: var(--font-weight-bold);
        }

        .layout-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: var(--spacing-xl);
          align-items: start;
        }

        .main-column {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xl);
        }

        .side-column {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xl);
          position: sticky;
          top: calc(var(--navbar-height) + var(--spacing-lg));
        }

        .dropzone {
          border: 2px dashed var(--border-color-strong);
          border-radius: var(--radius-card);
          padding: var(--spacing-3xl);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-md);
          cursor: pointer;
          background-color: var(--bg-page);
          transition: all var(--transition-fast);
          color: var(--text-secondary);
          min-height: 200px;
        }

        .dropzone:hover:not(.disabled) {
          background-color: var(--bg-hover);
          border-color: var(--primary);
          color: var(--primary);
        }

        .dropzone.dragging {
          background-color: rgba(7, 193, 96, 0.05);
          border-color: var(--primary);
          color: var(--primary);
        }

        .dropzone.disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        .dropzone-icon {
          font-size: 48px;
          opacity: 0.5;
        }

        .file-list-container {
          margin-top: var(--spacing-xl);
          border-top: 1px solid var(--border-color);
          padding-top: var(--spacing-lg);
        }

        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-md);
        }

        .list-header h3 {
          font-size: var(--font-size-body);
          font-weight: var(--font-weight-medium);
        }

        .file-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
          max-height: 500px;
          overflow-y: auto;
          padding-right: var(--spacing-sm);
        }

        .file-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-md);
          background-color: var(--bg-page);
          border-radius: var(--radius-button);
          border: 1px solid var(--border-color);
        }

        .file-item.status-uploading { border-color: var(--link); background-color: rgba(87, 107, 149, 0.05); }
        .file-item.status-completed { border-color: var(--success); background-color: rgba(7, 193, 96, 0.05); }
        .file-item.status-failed { border-color: var(--error); background-color: rgba(250, 81, 81, 0.05); }

        .file-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow: hidden;
        }

        .file-name {
          font-weight: var(--font-weight-medium);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .file-size {
          font-size: var(--font-size-small);
          color: var(--text-tertiary);
        }

        .file-status {
          display: flex;
          align-items: center;
          min-width: 24px;
          justify-content: center;
        }

        .remove-btn {
          background: none;
          color: var(--text-tertiary);
          font-size: 20px;
          transition: color 0.1s;
        }
        .remove-btn:hover { color: var(--error); }

        .icon-success { color: var(--success); font-weight: bold; }
        .icon-error { color: var(--error); font-weight: bold; }

        .spinner-micro {
          width: 14px;
          height: 14px;
          border: 2px solid var(--link);
          border-bottom-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        h2 {
          font-size: var(--font-size-body);
          font-weight: var(--font-weight-bold);
          margin-bottom: var(--spacing-md);
        }

        .card-header-spaced {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-md);
        }
        
        .card-header-spaced h2 {
          margin-bottom: 0;
        }

        .config-form {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .metadata-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .metadata-field {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
          padding-bottom: var(--spacing-md);
          border-bottom: 1px dashed var(--border-color);
        }
        .metadata-field:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .field-row {
          display: flex;
          gap: var(--spacing-sm);
        }

        .type-select {
          width: 90px;
          height: var(--input-height);
          padding: 0 var(--spacing-sm);
          border-radius: var(--radius-input);
          border: 1px solid var(--border-color-strong);
          background-color: var(--bg-cell);
          color: var(--text-primary);
        }

        .action-panel {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .progress-info {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
          padding: var(--spacing-md);
          background-color: var(--bg-cell);
          border-radius: var(--radius-card);
          border: 1px solid var(--border-color);
        }

        .progress-text {
          font-size: var(--font-size-caption);
          font-weight: var(--font-weight-medium);
          text-align: right;
        }

        .progress-bar-container {
          height: 6px;
          background-color: var(--bg-page);
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background-color: var(--primary);
          transition: width var(--transition-normal);
        }

        .current-file {
          font-size: var(--font-size-small);
          color: var(--text-tertiary);
        }

        .w-full { width: 100%; }
        .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        @media (max-width: 900px) {
          .layout-grid {
            grid-template-columns: 1fr;
          }
          .side-column {
            position: static;
          }
        }
      `}</style>
    </div>
  );
}
