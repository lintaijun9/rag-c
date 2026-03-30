'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/ui/Toast';
import { BarChart } from '@/components/ui/BarChart';

interface AnalyticsData {
  dailyTrend: Array<{ date: string; count: number; totalDuration: number }>;
  speakerActivity: Array<{ speaker: string; count: number; totalDuration: number; avgDuration: number }>;
  topicDistribution: Array<{ topic: string; count: number }>;
  tagHeatmap: Array<{ tag: string; count: number }>;
  durationDistribution: Array<{ bucket: string; count: number }>;
  mentionedPersons: Array<{ person: string; count: number }>;
}

export function RagAnalytics() {
  const { t } = useI18n();
  const { error } = useToast();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const res = await fetch('/api/rag/analytics');
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        } else {
          error(json.error || 'Failed to load analytics');
        }
      } catch (err) {
        error('Network error');
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, [error, t]);

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="spinner" />
        <p>{t('common.loading')}</p>
        <style jsx>{`
          .analytics-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; gap: 16px; color: var(--text-secondary); }
          .spinner { width: 32px; height: 32px; border: 3px solid var(--border-color); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="analytics-dashboard">
      <div className="dashboard-grid">
        <Card className="chart-card span-2">
          <h3>📈 近60天数据趋势</h3>
          <BarChart
            data={data.dailyTrend.map(d => ({ label: d.date.split('-').slice(1).join('-'), value: d.count }))}
            height={200}
            color="var(--link)"
            maxBars={30}
          />
        </Card>

        <Card className="chart-card">
          <h3>👤 活跃发言人</h3>
          <BarChart
            data={data.speakerActivity.map(s => ({ label: s.speaker, value: s.count }))}
            height={200}
            color="var(--primary)"
          />
        </Card>

        <Card className="chart-card">
          <h3>📌 热门主题</h3>
          <BarChart
            data={data.topicDistribution.map(t => ({ label: t.topic, value: t.count }))}
            height={200}
            color="var(--warn)"
          />
        </Card>

        <Card className="chart-card">
          <h3>🏷️ 高频标签</h3>
          <div className="tag-cloud">
            {data.tagHeatmap.slice(0, 20).map((t, i) => (
              <div key={i} className="heatmap-tag" style={{ opacity: Math.max(0.4, 1 - i * 0.04) }}>
                {t.tag} <span className="tag-count">{t.count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="chart-card">
          <h3>⏱️ 时长分布</h3>
          <BarChart
            data={data.durationDistribution.map(d => ({ label: d.bucket, value: d.count }))}
            height={200}
            color="var(--success)"
            maxBars={6}
          />
        </Card>

        <Card className="chart-card">
          <h3>👥 提及最多的人</h3>
          <div className="person-list">
            {data.mentionedPersons.slice(0, 6).map((p, i) => (
              <div key={i} className="person-item">
                <span className="person-rank">{i + 1}</span>
                <span className="person-name">{p.person}</span>
                <span className="person-count">{p.count} 次</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <style jsx>{`
        .analytics-dashboard { padding: 8px 0; }
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--spacing-lg);
        }
        .span-2 { grid-column: span 2; }
        .chart-card { padding: var(--spacing-lg); height: 100%; display: flex; flex-direction: column; }
        .chart-card h3 { font-size: 16px; font-weight: 600; margin-bottom: 20px; color: var(--text-primary); }
        .tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; align-content: flex-start; }
        .heatmap-tag { background: var(--bg-active); border-radius: 4px; padding: 4px 8px; font-size: 13px; color: var(--text-primary); }
        .tag-count { color: var(--text-secondary); font-size: 11px; margin-left: 4px; }
        .person-list { display: flex; flex-direction: column; gap: 12px; }
        .person-item { display: flex; align-items: center; padding: 8px; background: var(--bg-hover); border-radius: 8px; }
        .person-rank { width: 24px; height: 24px; border-radius: 50%; background: var(--border-color); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 12px; }
        .person-item:nth-child(1) .person-rank { background: #FFD700; color: #000; }
        .person-item:nth-child(2) .person-rank { background: #C0C0C0; color: #000; }
        .person-item:nth-child(3) .person-rank { background: #CD7F32; color: #fff; }
        .person-name { flex: 1; font-size: 14px; font-weight: 500; }
        .person-count { font-size: 12px; color: var(--text-secondary); }

        @media (max-width: 1024px) {
          .dashboard-grid { grid-template-columns: repeat(2, 1fr); }
          .span-2 { grid-column: span 2; }
        }
        @media (max-width: 768px) {
          .dashboard-grid { grid-template-columns: 1fr; }
          .span-2 { grid-column: span 1; }
        }
      `}</style>
    </div>
  );
}
