import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/rag/analytics/route';

// Mock the db module
vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
}));

import { query } from '@/lib/db';

describe('Rag Analytics API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockRequest(url: string) {
    return new NextRequest(new URL(url, 'http://localhost'));
  }

  it('should successfully return aggregated analytics data', async () => {
    // Mock successful database responses for the 6 queries
    (query as any).mockResolvedValueOnce([{ date: '2026-01-01', count: '5', total_duration: '1000' }]); // dailyTrend
    (query as any).mockResolvedValueOnce([{ speaker: 'Test User', count: '10', total_duration: '5000', avg_duration: '500' }]); // speakerActivity
    (query as any).mockResolvedValueOnce([{ topic: 'Tech', count: '8' }]); // topicDistribution
    (query as any).mockResolvedValueOnce([{ tag: 'AI', count: '20' }]); // tagHeatmap
    (query as any).mockResolvedValueOnce([{ bucket: '1-5min', count: '15' }]); // durationDistribution
    (query as any).mockResolvedValueOnce([{ person: 'John Doe', count: '3' }]); // mentionedPersons

    const req = createMockRequest('/api/rag/analytics');
    const response = await GET(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.dailyTrend).toHaveLength(1);
    expect(json.data.speakerActivity[0].speaker).toBe('Test User');
    expect(json.data.topicDistribution[0].topic).toBe('Tech');
    expect(json.data.tagHeatmap[0].tag).toBe('AI');
    expect(json.data.durationDistribution[0].bucket).toBe('1-5min');
    expect(json.data.mentionedPersons[0].person).toBe('John Doe');
  });

  it('should pass search parameters to database queries', async () => {
    (query as any).mockResolvedValue([]); // Mock all queries to return empty array

    const req = createMockRequest('/api/rag/analytics?speaker=Test&startDateFrom=2026-01-01&startDateTo=2026-01-31');
    await GET(req);

    // Verify if db.query was called with correct parameters
    expect(query).toHaveBeenCalledTimes(6);
    
    // The params array should contain the speaker search, start date, and end date
    const firstCallArgs = vi.mocked(query).mock.calls[0];
    const params = firstCallArgs[1] as string[];

    expect(params).toContain('%Test%');
    expect(params).toContain('2026-01-01');
    expect(params).toContain('2026-01-31T23:59:59Z');
  });

  it('should return 500 when database query fails', async () => {
    (query as any).mockRejectedValueOnce(new Error('Database connection failed'));

    const req = createMockRequest('/api/rag/analytics');
    const response = await GET(req);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Database connection failed');
  });
});
