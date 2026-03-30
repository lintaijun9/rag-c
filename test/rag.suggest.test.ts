import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/rag/suggest/route';

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
}));

import { query } from '@/lib/db';

describe('Rag Suggest API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockRequest(url: string) {
    return new NextRequest(new URL(url, 'http://localhost'));
  }

  it('should return empty array if query is too short', async () => {
    const req = createMockRequest('/api/rag/suggest?q=');
    const response = await GET(req);
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(json.data).toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });

  it('should search for all types by default', async () => {
    (query as any).mockResolvedValueOnce([{ speaker: 'Test Speaker', count: '10' }]); // speaker
    (query as any).mockResolvedValueOnce([{ tag: 'AI', count: '5' }]); // tag
    (query as any).mockResolvedValueOnce([{ topic: 'Tech', count: '8' }]); // topic
    (query as any).mockResolvedValueOnce([{ title: 'NextJS Info', count: '2' }]); // keyword/title

    const req = createMockRequest('/api/rag/suggest?q=Te');
    const response = await GET(req);
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(4);
    expect(json.data.map((d: any) => d.type)).toEqual(['speaker', 'tag', 'topic', 'title']);
    expect(query).toHaveBeenCalledTimes(4);

    // Verify parameter substitution is working
    const firstCallArgs = vi.mocked(query).mock.calls[0];
    const params = firstCallArgs[1] as string[];
    expect(params[0]).toBe('%Te%');
  });

  it('should filter by specific type', async () => {
    (query as any).mockResolvedValueOnce([{ speaker: 'Only Speaker', count: '5' }]);

    const req = createMockRequest('/api/rag/suggest?q=Test&type=speaker');
    const response = await GET(req);
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].type).toBe('speaker');
    expect(query).toHaveBeenCalledTimes(1); 
  });

  it('should handle errors gracefully', async () => {
    (query as any).mockRejectedValueOnce(new Error('Db error'));

    const req = createMockRequest('/api/rag/suggest?q=Test');
    const response = await GET(req);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Db error');
  });
});
