'use client';

import React, { useState } from 'react';

interface BarChartProps {
  data: Array<{ label: string; value: number }>;
  height?: number;
  color?: string;
  formatValue?: (v: number) => string;
  title?: string;
  maxBars?: number;
}

export function BarChart({
  data,
  height = 180,
  color = 'var(--primary)',
  formatValue = (v) => String(v),
  title,
  maxBars = 12,
}: BarChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const displayed = data.slice(0, maxBars);
  const maxVal = Math.max(...displayed.map((d) => d.value), 1);
  const barWidth = 100 / displayed.length;

  return (
    <div className="bar-chart-wrap">
      {title && <div className="chart-title">{title}</div>}
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="bar-chart-svg"
      >
        {displayed.map((d, i) => {
          const barH = (d.value / maxVal) * (height - 24);
          const x = i * barWidth + barWidth * 0.1;
          const w = barWidth * 0.8;
          const y = height - barH - 20;
          const isHovered = hovered === i;
          return (
            <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
              <rect
                x={`${x}%`}
                y={y}
                width={`${w}%`}
                height={barH}
                fill={color}
                opacity={isHovered ? 1 : 0.75}
                rx={2}
                style={{ transition: 'opacity 0.15s, height 0.3s' }}
              />
              {isHovered && (
                <text
                  x={`${x + w / 2}%`}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize={9}
                  fill="var(--text-primary)"
                >
                  {formatValue(d.value)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="bar-chart-labels">
        {displayed.map((d, i) => (
          <div
            key={i}
            className={`bar-label ${hovered === i ? 'hovered' : ''}`}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            {d.label.length > 6 ? d.label.slice(0, 6) + '…' : d.label}
          </div>
        ))}
      </div>
      <style jsx>{`
        .bar-chart-wrap { width: 100%; overflow: hidden; }
        .chart-title {
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 6px;
          font-weight: 500;
        }
        .bar-chart-svg { display: block; overflow: visible; }
        .bar-chart-labels {
          display: flex;
          margin-top: 4px;
        }
        .bar-label {
          flex: 1;
          text-align: center;
          font-size: 10px;
          color: var(--text-tertiary);
          cursor: default;
          transition: color 0.15s;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          padding: 0 1px;
        }
        .bar-label.hovered { color: var(--text-primary); }
      `}</style>
    </div>
  );
}
