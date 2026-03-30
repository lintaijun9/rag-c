import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildGeminiMetadataFilter } from '@/services/rag.service';
import type { RagSearchFilter } from '@/services/rag.service';

// Mock the db module
vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
}));

describe('rag.service', () => {
  describe('buildGeminiMetadataFilter', () => {
    it('should return undefined for empty filter', () => {
      const filter: RagSearchFilter = {};
      expect(buildGeminiMetadataFilter(filter)).toBeUndefined();
    });

    it('should build speaker filter', () => {
      const filter: RagSearchFilter = { speaker: '李阳' };
      const result = buildGeminiMetadataFilter(filter);
      expect(result).toBe('speaker="李阳"');
    });

    it('should build topic filter', () => {
      const filter: RagSearchFilter = { topic: '十点读书' };
      const result = buildGeminiMetadataFilter(filter);
      expect(result).toBe('topic="十点读书"');
    });

    it('should combine multiple filters with AND', () => {
      const filter: RagSearchFilter = {
        speaker: '李阳',
        topic: '十点读书',
      };
      const result = buildGeminiMetadataFilter(filter);
      expect(result).toBe('speaker="李阳" AND topic="十点读书"');
    });

    it('should build date range filter', () => {
      const filter: RagSearchFilter = {
        startDateFrom: '2025-06-01',
        startDateTo: '2025-06-30',
      };
      const result = buildGeminiMetadataFilter(filter);
      expect(result).toBe('startDate>="2025-06-01" AND startDate<="2025-06-30"');
    });

    it('should handle all filter fields combined', () => {
      const filter: RagSearchFilter = {
        speaker: '张三',
        topic: '健康',
        startDateFrom: '2025-01-01',
        startDateTo: '2025-12-31',
      };
      const result = buildGeminiMetadataFilter(filter);
      expect(result).toContain('speaker="张三"');
      expect(result).toContain('topic="健康"');
      expect(result).toContain('startDate>="2025-01-01"');
      expect(result).toContain('startDate<="2025-12-31"');
    });
  });
});
