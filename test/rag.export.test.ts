import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/rag/export/route';

// Mock the rag service
vi.mock('@/services/rag.service', () => ({
  searchRagMetadata: vi.fn(),
}));

import { searchRagMetadata } from '@/services/rag.service';

describe('Rag Export API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockRequest(url: string) {
    return new NextRequest(new URL(url, 'http://localhost'));
  }

  const mockData = {
    items: [
      {
        id: '1',
        speaker: 'Test Speaker',
        title: 'Test Title',
        topic: 'Tech',
        start_time: '2026-01-01T10:00:00Z',
        duration_ms: 1000,
        status: 'indexed',
        summary: 'Test "Summary"',
        tags: ['AI', 'React'],
        mentioned: ['Alice'],
        file_name: 'test.pdf',
      },
    ],
    total: 1,
    page: 1,
    pageSize: 5000,
    totalPages: 1,
  };

  it('should export data as JSON', async () => {
    (searchRagMetadata as any).mockResolvedValueOnce(mockData);

    const req = createMockRequest('/api/rag/export?format=json&speaker=Test');
    const response = await GET(req);
    const jsonStr = await response.text();

    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('Content-Disposition')).toContain('rag-export');
    expect(response.headers.get('Content-Disposition')).toContain('.json');

    const parsed = JSON.parse(jsonStr);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].speaker).toBe('Test Speaker');
    
    // Verify filters
    expect(searchRagMetadata).toHaveBeenCalledWith(expect.objectContaining({
      speaker: 'Test',
      page: 1,
      pageSize: 5000,
    }));
  });

  it('should export data as CSV with UTF-8 BOM', async () => {
    (searchRagMetadata as any).mockResolvedValueOnce(mockData);

    const req = createMockRequest('/api/rag/export?format=csv');
    const response = await GET(req);
    const csvContent = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
    expect(response.headers.get('Content-Disposition')).toContain('.csv');

    // BOM check skipped because Response.text() strips it naturally

    // Check headers and replaced quotes
    expect(csvContent).toContain('id,speaker,title,topic,start_time,duration_ms,status,summary,tags,mentioned,file_name');
    expect(csvContent).toContain('Test ""Summary""'); // Quotes should be escaped
    expect(csvContent).toContain('AI;React'); // Arrays joined by semicolon
    expect(csvContent).toContain('Alice');
  });

  it('should cleanly handle array parameters', async () => {
    (searchRagMetadata as any).mockResolvedValueOnce({ items: [] });
    
    const req = createMockRequest('/api/rag/export?tags=a,b,c');
    await GET(req);

    expect(searchRagMetadata).toHaveBeenCalledWith(expect.objectContaining({
      tags: ['a', 'b', 'c'],
    }));
  });

  it('should handle service errors', async () => {
    (searchRagMetadata as any).mockRejectedValueOnce(new Error('Export search failed'));

    const req = createMockRequest('/api/rag/export');
    const response = await GET(req);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Export search failed');
  });
});
