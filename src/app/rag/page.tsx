'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import useSWR from 'swr';
import { useI18n } from '@/lib/i18n';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Streamdown } from 'streamdown';
import type { RagMetadataRow } from '@/services/rag.service';
import { RagAnalytics } from '@/components/rag/RagAnalytics';
import { RagAiTab } from '@/components/rag/RagAiTab';
import { useDebounce } from '@/lib/hooks';

interface FilterState {
  keyword: string;
  speaker: string;
  topic: string;
  startDateFrom: string;
  startDateTo: string;
  tags: string[];
  status: string;
}

interface SearchResult {
  items: RagMetadataRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface RagStats {
  totalRecords: number;
  totalSpeakers: number;
  totalDurationMs: number;
  speakers: Array<{ speaker: string; count: number }>;
  topTags: Array<{ tag: string; count: number }>;
  statusCounts: Array<{ status: string; count: number }>;
}


function formatDuration(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  if (mins > 0) return `${mins}m ${secs % 60}s`;
  return `${secs}s`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function RagSearchPage() {
  const { t } = useI18n();
  const { error: showError, success: showSuccess } = useToast();

  const { data: statsData, error: statsError } = useSWR('/api/rag/stats', (url) => fetch(url).then(r => r.json()));
  const { data: storesData } = useSWR('/api/stores', (url) => fetch(url).then(r => r.json()));

  const stats = statsData?.success ? statsData.data.stats as RagStats : null;
  const speakers = statsData?.success ? statsData.data.speakers as string[] : [];
  const topics = statsData?.success ? statsData.data.topics as string[] : [];
  const allTags = statsData?.success ? statsData.data.tags as string[] : [];
  const loadingStats = !statsData && !statsError;

  const storeId = (storesData?.success && storesData.data.length > 0)
    ? storesData.data[0].name.split('/').pop() || ''
    : '';

  const [filter, setFilter] = useState<FilterState>({
    keyword: '',
    speaker: '',
    topic: '',
    startDateFrom: '',
    startDateTo: '',
    tags: [],
    status: '',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<RagMetadataRow | null>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<RagMetadataRow[]>([]);

  type TabType = 'dashboard' | 'search' | 'ai';
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [aiQuestion, setAiQuestion] = useState('');

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debouncedKeyword = useDebounce(filter.keyword, 300);

  const [searchUrl, setSearchUrl] = useState<string | null>(null);
  const { data: searchSwr, isValidating: searching } = useSWR(searchUrl, (url) => fetch(url).then(r => r.json()));
  const searchResult: SearchResult | null = searchSwr?.success ? searchSwr.data : null;

  const { data: suggestSwr } = useSWR(
    debouncedKeyword.length > 1 ? `/api/rag/suggest?q=${encodeURIComponent(debouncedKeyword)}` : null,
    (url) => fetch(url).then(r => r.json())
  );

  useEffect(() => {
    if (suggestSwr?.success) {
      setSuggestions(suggestSwr.data.map((d: any) => d.value));
      setShowSuggestions(suggestSwr.data.length > 0);
    } else if (debouncedKeyword.length <= 1) {
      setShowSuggestions(false);
    }
  }, [suggestSwr, debouncedKeyword]);

  // SWR automatically handles fetching and caching the stats and store data.
  // Error handling effect if stats fail to load initially.
  useEffect(() => {
    if (statsError) {
      showError(t('common.error'));
    }
  }, [statsError, t, showError]);


  // Suggestions are fetched via SWR above

  const handleSearch = useCallback(
    (page = 1) => {
      setCurrentPage(page);
      setActiveTab('search');
      setShowSuggestions(false);
      setSelectedForCompare([]); // Reset comparisons on new search
      const params = new URLSearchParams();
      if (filter.keyword) params.set('keyword', filter.keyword);
      if (filter.speaker) params.set('speaker', filter.speaker);
      if (filter.topic) params.set('topic', filter.topic);
      if (filter.startDateFrom) params.set('startDateFrom', filter.startDateFrom);
      if (filter.startDateTo) params.set('startDateTo', filter.startDateTo);
      if (filter.status) params.set('status', filter.status);
      if (filter.tags.length > 0) params.set('tags', filter.tags.join(','));
      params.set('page', String(page));
      params.set('pageSize', '20');

      setSearchUrl(`/api/rag/search?${params.toString()}`);
    },
    [filter]
  );

  const handleExport = () => {
    const params = new URLSearchParams();
    if (filter.keyword) params.set('keyword', filter.keyword);
    if (filter.speaker) params.set('speaker', filter.speaker);
    if (filter.topic) params.set('topic', filter.topic);
    if (filter.startDateFrom) params.set('startDateFrom', filter.startDateFrom);
    if (filter.startDateTo) params.set('startDateTo', filter.startDateTo);
    if (filter.status) params.set('status', filter.status);
    if (filter.tags.length > 0) params.set('tags', filter.tags.join(','));
    params.set('format', 'csv');
    window.location.href = `/api/rag/export?${params.toString()}`;
  };


  const toggleTag = (tag: string) => {
    setFilter((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const clearFilter = () => {
    setFilter({ keyword: '', speaker: '', topic: '', startDateFrom: '', startDateTo: '', tags: [], status: '' });
    setSearchUrl(null);
    setCurrentPage(1);
  };

  const totalDurationFormatted = stats
    ? formatDuration(stats.totalDurationMs)
    : '—';



  return (
    <div className="rag-page">
      <div className="page-header">
        <div className="header-left">
          <h1>🔬 {t('rag.title')} <span className="beta-badge">Advanced</span></h1>
          <p className="header-sub">{t('rag.subtitle')}</p>
        </div>
        <div className="header-stats">
          {loadingStats ? (
            <div className="stat-skeleton" />
          ) : (
            <>
              <div className="header-stat">
                <span className="stat-num">{stats?.totalRecords?.toLocaleString() ?? 0}</span>
                <span className="stat-label">{t('rag.totalRecords')}</span>
              </div>
              <div className="header-stat">
                <span className="stat-num">{stats?.totalSpeakers ?? 0}</span>
                <span className="stat-label">{t('rag.speakers')}</span>
              </div>
              <div className="header-stat">
                <span className="stat-num">{totalDurationFormatted}</span>
                <span className="stat-label">{t('rag.totalDuration')}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="rag-layout">
        <aside className="filter-panel">
          <Card className="filter-card">
            <h3 className="filter-title">🎯 精准筛选</h3>

            <div className="filter-group focus-within-active relative">
              <label>{t('common.search')}</label>
              <div className="search-wrapper">
                <div className="search-icon">🔍</div>
                <input
                  className="filter-input with-icon"
                  placeholder="搜索全局..."
                  value={filter.keyword}
                  onChange={(e) => setFilter((p) => ({ ...p, keyword: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setShowSuggestions(false);
                      handleSearch(1);
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  onFocus={() => filter.keyword.length > 1 && setShowSuggestions(true)}
                />
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <div className="suggestions-dropdown">
                  {suggestions.map((s, idx) => (
                    <div
                      key={idx}
                      className="suggestion-item"
                      onClick={() => {
                        setFilter((p) => ({ ...p, keyword: s }));
                        setShowSuggestions(false);
                      }}
                    >
                      {s}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="filter-group">
              <label>筛选条件</label>
              <select
                className="filter-select"
                value={filter.speaker}
                onChange={(e) => setFilter((p) => ({ ...p, speaker: e.target.value }))}
              >
                <option value="">👤 全部人员</option>
                {speakers.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <select
                className="filter-select mt-xs"
                value={filter.topic}
                onChange={(e) => setFilter((p) => ({ ...p, topic: e.target.value }))}
              >
                <option value="">📂 全部话题</option>
                {topics.map((tp) => (
                  <option key={tp} value={tp}>{tp}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>{t('rag.dateRange')}</label>
              <div className="date-inputs">
                <input
                  className="filter-input"
                  type="date"
                  value={filter.startDateFrom}
                  onChange={(e) => setFilter((p) => ({ ...p, startDateFrom: e.target.value }))}
                />
                <span className="date-separator">-</span>
                <input
                  className="filter-input"
                  type="date"
                  value={filter.startDateTo}
                  onChange={(e) => setFilter((p) => ({ ...p, startDateTo: e.target.value }))}
                />
              </div>
            </div>

            {allTags.length > 0 && (
              <div className="filter-group tag-group">
                <label>🔥 热门标签</label>
                <div className="tag-cloud">
                  {allTags.slice(0, 20).map((tag) => (
                    <button
                      key={tag}
                      className={`tag-chip ${filter.tags.includes(tag) ? 'active' : ''}`}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="filter-actions mt-lg">
              <Button onClick={() => handleSearch(1)} isLoading={searching} className="btn-full btn-glow">
                查询
              </Button>
              <div className="action-row">
                <Button variant="secondary" onClick={clearFilter} disabled={searching} className="flex-1">
                  重置
                </Button>
                <Button variant="secondary" onClick={handleExport} disabled={searching} className="flex-1">
                  导出CSV
                </Button>
              </div>
            </div>
          </Card>
        </aside>

        <main className="main-content">
          <div className="tab-bar">
            <button
              className={`tab-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              📊 全局概览
            </button>
            <button
              className={`tab-item ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              📋 数据检索
              {searchResult && (
                <span className="tab-badge">{searchResult.total}</span>
              )}
            </button>
            <button
              className={`tab-item ${activeTab === 'ai' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai')}
            >
              🤖 AI分析
            </button>
          </div>

          <div className="tab-container">
            {activeTab === 'dashboard' && (
              <div className="tab-pane fade-in">
                <RagAnalytics />
              </div>
            )}

            {activeTab === 'search' && (
              <div className="tab-pane fade-in">
                {!searchResult && !searching && (
                  <div className="empty-hint">
                    <div className="empty-icon animation-float">🔍</div>
                    <p>调整左侧筛选条件，探索知识库全貌</p>
                  </div>
                )}

                {searching && (
                  <div className="loading-overlay">
                    <div className="spinner" />
                    <p>{t('common.loading')}</p>
                  </div>
                )}

                {searchResult && !searching && (
                  <>
                    <div className="result-header">
                      <span className="result-count">
                        找到 <strong className="highlight">{searchResult.total}</strong> 条相关记录
                      </span>
                    </div>

                    <div className="result-list">
                      {searchResult.items.length === 0 ? (
                        <div className="empty-state zero-result-rescue">
                          <p className="empty-icon">🤷‍♂️</p>
                          <h3>没有找到直接匹配的数据</h3>
                          {filter.keyword ? (
                            <div className="rescue-actions">
                              <p className="rescue-text">但 AI 可以根据知识库脉络帮您推断关联内容。</p>
                              <Button className="btn-glow" onClick={() => {
                                setAiQuestion(`在知识库中未找到和 "${filter.keyword}" 的直接匹配。请跨文档搜索或给出业务方向建议：`);
                                setActiveTab('ai');
                              }}>✨ 启动 AI 无检索救援</Button>
                            </div>
                          ) : (
                            <p>尝试调整左侧筛选条件</p>
                          )}
                        </div>
                      ) : (
                        searchResult.items.map((item) => {
                          const isComparing = selectedForCompare.some(r => r.id === item.id);
                          return (
                          <div
                            key={item.id}
                            className={`result-item ${selectedRecord?.id === item.id ? 'selected' : ''} ${isComparing ? 'comparing' : ''}`}
                            onClick={(e) => {
                              // Prevent click through if clicking checkbox
                              if ((e.target as HTMLElement).tagName.toLowerCase() === 'input') return;
                              setSelectedRecord(item);
                            }}
                          >
                            <label className="compare-checkbox-lb" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                className="compare-checkbox" 
                                checked={isComparing} 
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedForCompare(prev => [...prev, item]);
                                  } else {
                                    setSelectedForCompare(prev => prev.filter(r => r.id !== item.id));
                                  }
                                }} 
                              />
                              <span className="sr-only">对比</span>
                            </label>
                            <div className="result-top">
                              <div className="result-author">
                                <div className="author-avatar">{item.speaker ? item.speaker[0].toUpperCase() : '?'}</div>
                                <span className="meta-speaker">{item.speaker || '未知发言人'}</span>
                              </div>
                              <div className="result-meta">
                                {item.similarity !== undefined && item.similarity > 0 && (
                                  <span className="meta-similarity" title="Semantic Context Match">
                                    ⚡️ {(item.similarity * 100).toFixed(1)}%
                                  </span>
                                )}
                                <span className="meta-date">📅 {formatDate(item.start_time)}</span>
                                {item.duration_ms && (
                                  <span className="meta-duration">⏱ {formatDuration(item.duration_ms)}</span>
                                )}
                              </div>
                            </div>

                            <div className="result-title">{item.title || item.topic || '—'}</div>

                            {item.summary && (
                              <p className="result-summary">{item.summary}</p>
                            )}

                            {!item.summary && item.content && (
                              <p className="result-content">{item.content.substring(0, 160)}...</p>
                            )}

                            {(Array.isArray(item.tags) && item.tags.length > 0) || (Array.isArray(item.mentioned) && item.mentioned.length > 0) ? (
                              <div className="result-tags">
                                {Array.isArray(item.tags) && item.tags.map((tag) => (
                                  <span key={tag} className="tag-chip small">🏷 {tag}</span>
                                ))}
                                {Array.isArray(item.mentioned) && item.mentioned.map((m) => (
                                  <span key={m} className="tag-chip small person">@{m}</span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                      )}
                    </div>

                    {searchResult.totalPages > 1 && (
                      <div className="pagination modern-paginator">
                        <button className="page-btn" disabled={currentPage <= 1} onClick={() => handleSearch(currentPage - 1)}>
                          ← 上页
                        </button>
                        <span className="page-info">第 {currentPage} 页 / 共 {searchResult.totalPages} 页</span>
                        <button className="page-btn" disabled={currentPage >= searchResult.totalPages} onClick={() => handleSearch(currentPage + 1)}>
                          下页 →
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {selectedForCompare.length > 1 && activeTab === 'search' && (
              <div className="compare-fab fade-in slideUp">
                <span className="compare-count">已选 {selectedForCompare.length} 项</span>
                <Button className="btn-glow" onClick={() => {
                  const comparisonTargets = selectedForCompare.map(r => `"${r.title || r.topic}" (发言人: ${r.speaker})`).join(' 和 ');
                  setAiQuestion(`请横向对比分析以下记录：${comparisonTargets}。找出它们的共同点、分歧点及核心业务方向：`);
                  setActiveTab('ai');
                  setSelectedForCompare([]);
                }}>
                  📊 AI 深度对比分析
                </Button>
                <button className="compare-clear" onClick={() => setSelectedForCompare([])}>取消</button>
              </div>
            )}

            {activeTab === 'ai' && (
              <RagAiTab storeId={storeId} filter={filter} showError={showError} aiQuestion={aiQuestion} setAiQuestion={setAiQuestion} />
            )}
          </div>
        </main>

        {selectedRecord && (
          <aside className="detail-panel animation-slideInRight">
            <Card className="detail-card">
              <div className="detail-header">
                <h3>记录详情</h3>
                <button className="detail-close" onClick={() => setSelectedRecord(null)}>✕</button>
              </div>

              <div className="detail-body custom-scroll">
                <div className="detail-header-info">
                  <h4 className="detail-title">{selectedRecord.title || selectedRecord.topic || '无标题记录'}</h4>
                  <div className="detail-tags-row">
                    <span className={`status-badge status-${selectedRecord.status}`}>{selectedRecord.status}</span>
                    <span className="meta-speaker">👤 {selectedRecord.speaker || '未知'}</span>
                  </div>
                </div>

                <div className="detail-grid">
                  <div className="detail-cell">
                    <span className="detail-label">开始时间</span>
                    <span className="detail-value">{formatDate(selectedRecord.start_time)}</span>
                  </div>
                  <div className="detail-cell">
                    <span className="detail-label">全长</span>
                    <span className="detail-value">{selectedRecord.duration_ms ? formatDuration(selectedRecord.duration_ms) : '—'}</span>
                  </div>
                </div>

                {selectedRecord.summary && (
                  <div className="detail-section highlight-box">
                    <span className="detail-label">📋 智能摘要</span>
                    <p className="detail-text">{selectedRecord.summary}</p>
                  </div>
                )}

                {Array.isArray(selectedRecord.tags) && selectedRecord.tags.length > 0 && (
                  <div className="detail-section">
                    <span className="detail-label">标签</span>
                    <div className="detail-tags">
                      {selectedRecord.tags.map((tag) => <span key={tag} className="tag-chip small">{tag}</span>)}
                    </div>
                  </div>
                )}

                {Array.isArray(selectedRecord.mentioned) && selectedRecord.mentioned.length > 0 && (
                  <div className="detail-section">
                    <span className="detail-label">提及</span>
                    <div className="detail-tags">
                      {selectedRecord.mentioned.map((name) => <span key={name} className="tag-chip small person">@{name}</span>)}
                    </div>
                  </div>
                )}

                {selectedRecord.raw_timestamp && (
                  <div className="detail-section highlight-box audio-player">
                    <span className="detail-label">🎵 媒体回放</span>
                    <div className="audio-control">
                      <button className="play-btn">▶</button>
                      <div className="audio-track">
                        <div className="track-progress" style={{ width: '30%' }}></div>
                      </div>
                      <span className="time-display">{selectedRecord.raw_timestamp}</span>
                    </div>
                  </div>
                )}

                {selectedRecord.content && (
                  <div className="detail-section">
                    <span className="detail-label">完整转录内容</span>
                    <p className="detail-text content-text">{selectedRecord.content}</p>
                  </div>
                )}

                <div className="detail-actions mt-lg">
                  <Button className="btn-full btn-glow" onClick={() => {
                    setAiQuestion(`深度分析这段 ${selectedRecord.speaker || '未知'} 关于 "${selectedRecord.title || selectedRecord.topic}" 的发言记录：`);
                    setActiveTab('ai');
                  }}>
                    🤖 深度分析此记录
                  </Button>
                </div>
              </div>
            </Card>
          </aside>
        )}
      </div>

      <style jsx>{`
        .beta-badge { font-size: 10px; background: linear-gradient(135deg, var(--warn), #FF8C00); color: #fff; padding: 2px 6px; border-radius: 4px; vertical-align: super; font-weight: bold; margin-left: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .rag-page { display: flex; flex-direction: column; gap: var(--spacing-xl); min-height: calc(100vh - var(--navbar-height) - 80px); }
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--spacing-md); }
        .header-left h1 { font-size: 26px; font-weight: 800; margin-bottom: 6px; letter-spacing: -0.5px; }
        .header-sub { font-size: var(--font-size-caption); color: var(--text-secondary); }
        .header-stats { display: flex; gap: var(--spacing-2xl); background: var(--bg-cell); padding: 12px 24px; border-radius: var(--radius-card); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); }
        .header-stat { text-align: center; }
        .stat-num { display: block; font-size: 24px; font-weight: 800; color: var(--primary); line-height: 1.2; font-feature-settings: "tnum"; font-variant-numeric: tabular-nums; }
        .stat-label { font-size: var(--font-size-small); color: var(--text-tertiary); font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-skeleton { width: 240px; height: 48px; background: linear-gradient(90deg, var(--bg-hover) 25%, var(--bg-active) 50%, var(--bg-hover) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: var(--radius-card); }

        .rag-layout { display: grid; grid-template-columns: 300px 1fr; gap: var(--spacing-xl); align-items: start; position: relative; }
        .rag-layout:has(.detail-panel) { grid-template-columns: 280px 1fr 340px; }

        .filter-card { padding: var(--spacing-xl); position: sticky; top: calc(var(--navbar-height) + var(--spacing-lg)); border: 1px solid rgba(0,0,0,0.05); box-shadow: 0 10px 30px -10px rgba(0,0,0,0.05); }
        .filter-title { font-size: 16px; font-weight: 700; margin-bottom: var(--spacing-lg); color: var(--text-primary); border-bottom: 1px solid var(--border-color); padding-bottom: 12px; }
        .filter-group { margin-bottom: var(--spacing-md); }
        .filter-group > label { display: block; font-size: var(--font-size-small); color: var(--text-secondary); margin-bottom: 6px; font-weight: 500; }
        .relative { position: relative; }

        .search-wrapper { position: relative; }
        .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 14px; color: var(--text-tertiary); pointer-events: none; }
        .filter-input.with-icon { padding-left: 36px; }
        .suggestions-dropdown { position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-cell); border: 1px solid var(--primary); border-radius: var(--radius-card); margin-top: 4px; z-index: 100; box-shadow: var(--shadow-lg); overflow: hidden; }
        .suggestion-item { padding: 10px 16px; font-size: 14px; cursor: pointer; transition: background 0.2s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-bottom: 1px solid var(--border-color); }
        .suggestion-item:last-child { border-bottom: none; }
        .suggestion-item:hover { background: var(--bg-hover); color: var(--primary); }

        .filter-input, .filter-select { width: 100%; height: 40px; padding: 0 var(--spacing-md); border-radius: var(--radius-button); border: 1.5px solid var(--border-color-strong); background-color: var(--bg-page); color: var(--text-primary); font-size: 14px; transition: all 0.2s; }
        .filter-input:focus, .filter-select:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(7, 193, 96, 0.15); background-color: var(--bg-cell); }
        .mt-xs { margin-top: 8px; }
        .mt-lg { margin-top: var(--spacing-xl); }
        .date-inputs { display: flex; align-items: center; gap: 8px; }
        .date-separator { color: var(--text-tertiary); }
        .tag-group { padding-top: 12px; border-top: 1px dashed var(--border-color); }

        .tag-cloud { display: flex; flex-wrap: wrap; gap: 6px; }
        .tag-chip { padding: 4px 12px; border-radius: var(--radius-full); font-size: 12px; font-weight: 500; cursor: pointer; border: 1px solid var(--border-color-strong); background: transparent; color: var(--text-secondary); transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); white-space: nowrap; }
        .tag-chip:hover { border-color: var(--primary); color: var(--primary); background: rgba(7, 193, 96, 0.05); }
        .tag-chip.active { background: var(--primary); border-color: var(--primary); color: white; box-shadow: 0 2px 8px rgba(7, 193, 96, 0.3); }
        .tag-chip.small { font-size: 11px; padding: 2px 8px; cursor: default; }
        .tag-chip.person { background: rgba(87, 107, 149, 0.08); color: var(--link); border-color: transparent; }

        .filter-actions { display: flex; flex-direction: column; gap: 12px; }
        .action-row { display: flex; gap: 12px; }
        .flex-1 { flex: 1; }
        .btn-full { width: 100%; }
        .btn-glow { box-shadow: 0 4px 14px 0 rgba(7, 193, 96, 0.39); transition: all 0.2s; }
        .btn-glow:hover { box-shadow: 0 6px 20px rgba(7, 193, 96, 0.5); transform: translateY(-1px); }

        .main-content { min-width: 0; display: flex; flex-direction: column; }
        .tab-bar { display: flex; border-bottom: 2px solid var(--border-color); margin-bottom: var(--spacing-lg); }
        .tab-item { background: transparent; padding: 14px 24px; font-size: 15px; font-weight: 600; color: var(--text-secondary); border: none; border-bottom: 2px solid transparent; cursor: pointer; transition: all 0.2s; margin-bottom: -2px; display: flex; align-items: center; gap: 8px; }
        .tab-item:hover { color: var(--text-primary); }
        .tab-item.active { color: var(--primary); border-bottom-color: var(--primary); background: linear-gradient(180deg, transparent 50%, rgba(7, 193, 96, 0.05) 100%); }

        .result-item { position: relative; padding-left: 48px; }
        .compare-checkbox-lb { position: absolute; left: 16px; top: 22px; cursor: pointer; }
        .compare-checkbox { width: 18px; height: 18px; accent-color: var(--primary); cursor: pointer; }
        .result-item.comparing { border-color: var(--primary); background: rgba(7, 193, 96, 0.02); }

        .empty-state.zero-result-rescue { padding: var(--spacing-3xl); text-align: center; background: var(--bg-cell); border-radius: var(--radius-card); border: 1px dashed var(--border-color-strong); }
        .zero-result-rescue h3 { margin: 16px 0 8px; font-size: 20px; }
        .rescue-actions { margin-top: 24px; padding: 24px; background: rgba(7, 193, 96, 0.04); border-radius: var(--radius-card); border: 1px solid rgba(7, 193, 96, 0.1); }
        .rescue-text { color: var(--text-secondary); margin-bottom: 16px; font-size: 15px; }

        .compare-fab { position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%); background: var(--bg-cell); border-radius: 40px; padding: 12px 24px; display: flex; align-items: center; gap: 16px; box-shadow: var(--shadow-lg); border: 1px solid var(--border-color); z-index: var(--z-toast); }
        .compare-count { font-weight: bold; color: var(--text-primary); }
        .compare-clear { border: none; background: transparent; color: var(--text-tertiary); cursor: pointer; font-size: 14px; }
        .compare-clear:hover { color: var(--error); text-decoration: underline; }

        .audio-player { background: linear-gradient(to right, rgba(7, 193, 96, 0.05), transparent); border-left: 3px solid var(--primary); padding-left: 12px !important; }
        .audio-control { display: flex; align-items: center; gap: 12px; margin-top: 8px; }
        .play-btn { background: var(--primary); color: white; border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 14px; cursor: pointer; transition: transform 0.2s; }
        .play-btn:hover { transform: scale(1.1); background: var(--primary-hover); }
        .audio-track { flex: 1; height: 6px; background: var(--border-color); border-radius: 3px; overflow: hidden; }
        .track-progress { height: 100%; background: var(--primary); border-radius: 3px; }
        .time-display { font-size: 12px; color: var(--primary); font-weight: 500; font-variant-numeric: tabular-nums; }

        .tab-badge { background: var(--border-color-strong); color: var(--text-primary); padding: 2px 8px; border-radius: var(--radius-full); font-size: 11px; font-weight: 700; }
        .tab-item.active .tab-badge { background: var(--primary); color: white; }

        .tab-container { flex: 1; }
        .tab-pane { min-height: 400px; }
        .empty-hint { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; color: var(--text-tertiary); max-width: 400px; margin: 0 auto; text-align: center; }
        .empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.8; }
        .animation-float { animation: float 6s ease-in-out infinite; }
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }

        .result-header { font-size: 14px; margin-bottom: 16px; color: var(--text-secondary); }
        .highlight { color: var(--primary); font-weight: bold; font-size: 16px; }
        .result-list { display: flex; flex-direction: column; gap: 16px; }
        .result-item { background: var(--bg-cell); padding: 20px; border-radius: var(--radius-card); border: 1px solid var(--border-color); cursor: pointer; transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1); position: relative; overflow: hidden; }
        .result-item:hover { border-color: var(--border-color-strong); box-shadow: var(--shadow-md); transform: translateY(-2px); }
        .result-item.selected { border-color: var(--primary); box-shadow: 0 0 0 1px var(--primary); background: rgba(7, 193, 96, 0.02); }
        .result-item::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--primary); transform: scaleY(0); transition: transform 0.2s; }
        .result-item.selected::before { transform: scaleY(1); }

        .result-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
        .result-author { display: flex; align-items: center; gap: 10px; }
        .author-avatar { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), #00C853); color: white; display: flex; justify-content: center; align-items: center; font-size: 13px; font-weight: bold; box-shadow: 0 2px 6px rgba(7, 193, 96, 0.3); }
        .result-meta { display: flex; gap: 12px; font-size: 12px; color: var(--text-tertiary); align-items: center; }
        .meta-similarity { background: rgba(255, 190, 0, 0.15); color: #d97706; padding: 2px 8px; border-radius: 4px; font-weight: 700; display: flex; align-items: center; gap: 4px; border: 1px solid rgba(255, 190, 0, 0.3); }
        .result-title { font-size: 18px; font-weight: 700; margin-bottom: 8px; color: var(--text-primary); line-height: 1.4; }
        .result-summary { font-size: 14px; color: var(--text-secondary); line-height: 1.6; background: var(--bg-page); padding: 12px; border-radius: var(--radius-button); margin-bottom: 12px; border-inline-start: 3px solid var(--primary); }
        .result-content { font-size: 14px; color: var(--text-secondary); line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 12px; }
        .result-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }

        .modern-paginator { display: flex; justify-content: center; align-items: center; gap: 24px; margin-top: 32px; padding: 16px; }
        .page-btn { padding: 8px 16px; border-radius: 99px; font-size: 14px; font-weight: 600; color: var(--text-primary); background: var(--bg-hover); transition: all 0.2s; }
        .page-btn:not(:disabled):hover { background: var(--primary); color: white; transform: scale(1.05); }
        .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .page-info { font-size: 14px; color: var(--text-secondary); font-weight: 500; font-feature-settings: "tnum"; }



        .detail-panel { position: sticky; top: calc(var(--navbar-height) + var(--spacing-lg)); height: calc(100vh - var(--navbar-height) - 40px); }
        .detail-card { height: 100%; display: flex; flex-direction: column; overflow: hidden; border: 1px solid rgba(0,0,0,0.08); box-shadow: -10px 0 30px rgba(0,0,0,0.05); }
        .detail-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid var(--border-color); background: var(--bg-cell); z-index: 2; }
        .detail-header h3 { font-size: 18px; font-weight: 700; margin: 0; }
        .detail-close { width: 32px; height: 32px; border-radius: 50%; background: var(--bg-hover); display: flex; align-items: center; justify-content: center; font-size: 16px; color: var(--text-secondary); transition: all 0.2s; }
        .detail-close:hover { background: var(--error); color: white; transform: rotate(90deg); }

        .detail-body { padding: 24px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 24px; }
        .detail-header-info { border-bottom: 1px solid var(--border-color); padding-bottom: 20px; }
        .detail-title { font-size: 20px; font-weight: 800; line-height: 1.4; margin-bottom: 12px; }
        .detail-tags-row { display: flex; gap: 12px; align-items: center; }

        .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: var(--bg-page); padding: 16px; border-radius: 8px; border: 1px solid var(--border-color); }
        .detail-cell { display: flex; flex-direction: column; gap: 4px; }
        .detail-label { font-size: 12px; color: var(--text-tertiary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .detail-value { font-size: 14px; color: var(--text-primary); font-weight: 500; font-feature-settings: 'tnum'; }

        .detail-section { display: flex; flex-direction: column; gap: 8px; }
        .highlight-box { background: rgba(7, 193, 96, 0.05); border: 1px solid rgba(7, 193, 96, 0.2); padding: 16px; border-radius: 12px; }
        .highlight-box .detail-label { color: var(--primary); font-size: 14px; }
        .detail-text { font-size: 14px; line-height: 1.6; color: var(--text-secondary); white-space: pre-wrap; word-break: break-word; }
        .content-text { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; padding: 16px; background: var(--bg-page); border-radius: 8px; max-height: 300px; overflow-y: auto; overflow-x: hidden; border: 1px solid var(--border-color); }
        .detail-tags { display: flex; flex-wrap: wrap; gap: 6px; }

        .status-badge { padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .status-indexed { background: rgba(7, 193, 96, 0.15); color: var(--success); }
        .status-uploaded { background: rgba(87, 107, 149, 0.15); color: var(--link); }
        .status-pending { background: rgba(255, 190, 0, 0.15); color: var(--warn); }
        .status-error { background: rgba(250, 81, 81, 0.15); color: var(--error); }

        .fade-in { animation: fadeIn 0.4s ease; }
        .animation-slideUp { animation: slideUp 0.4s cubic-bezier(0.2, 0.8, 0.2, 1); }
        .animation-slideInRight { animation: slideInRight 0.4s cubic-bezier(0.2, 0.8, 0.2, 1); }
      `}</style>
    </div>
  );
}
