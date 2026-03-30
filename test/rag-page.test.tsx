import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock child components to isolate the page test and avoid heavy API calls/rendering inside tests
vi.mock('@/app/rag/RagAnalytics', () => ({
  default: () => <div data-testid="rag-analytics-mock">RagAnalytics Component</div>
}));

vi.mock('@/app/rag/RagSearchFilter', () => ({
  default: ({ onSearch }: any) => (
    <div data-testid="rag-search-filter-mock">
      <button onClick={() => onSearch({ keyword: 'test' })}>Trigger Search</button>
    </div>
  )
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const texts: Record<string, string> = {
        'rag.title': 'RAG 智能查询',
        'rag.dataSearch': '数据检索',
        'rag.aiQuery': 'AI 问答',
        'rag.aiWelcome': '向 AI 提问',
      };
      return texts[key] || key;
    },
  }),
}));

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({
    error: vi.fn(),
    success: vi.fn(),
  }),
}));

vi.mock('streamdown', () => ({
  Streamdown: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('RagSearchPage', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/rag/stats') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { stats: {}, speakers: [], topics: [], tags: [] },
          }),
        });
      }
      if (url === '/api/stores') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: [{ name: 'stores/1', displayName: 'Store 1' }],
          }),
        });
      }
      if (url.includes('/api/rag/search')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 },
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: false, error: 'Unknown' }),
      });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header and tabs', async () => {
    const { default: RagSearchPage } = await import('@/app/rag/page');
    render(<RagSearchPage />);
    
    await waitFor(() => {
        expect(screen.getByText(/RAG 智能查询/)).toBeInTheDocument();
    });
    expect(screen.getByText(/数据检索/)).toBeInTheDocument();
  });

  it('switches to AI tab when clicked', async () => {
    const { default: RagSearchPage } = await import('@/app/rag/page');
    render(<RagSearchPage />);
    
    const uiTab = screen.getByText('🤖 AI分析');
    fireEvent.click(uiTab);
    
    await waitFor(() => {
        expect(screen.getByText('向AI大模型提问，获取对现有文档数据的深度洞察')).toBeInTheDocument();
    });
  });

  it('calls search endpoint when search is triggered', async () => {
    const { default: RagSearchPage } = await import('@/app/rag/page');
    render(<RagSearchPage />);

    const searchBtn = screen.getByText('查询').closest('button');
    fireEvent.click(searchBtn!);

    await waitFor(() => {
      const calls = mockFetch.mock.calls.map((c) => c[0] as string);
      expect(calls.some((url) => url.includes('/api/rag/search'))).toBe(true);
    });
  });
});
