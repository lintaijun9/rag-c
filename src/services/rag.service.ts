import { db, query as rawQuery } from '@/lib/db';
import { getGeminiClient } from '@/lib/gemini-client';
import { ragMetadata } from '@/db/schema';
import { eq, ilike, and, or, sql, isNull, gte, lte, desc } from 'drizzle-orm';

export interface RagMetadataRow {
  id: number;
  unique_id: string | null;
  record_id: string;
  utterance_id: string;
  file_name: string | null;
  file_path: string | null;
  store_path: string | null;
  speaker: string | null;
  title: string | null;
  topic: string | null;
  subject: string | null;
  content: string | null;
  start_time: string | null; // Usually returned as Date but handled as string locally
  raw_timestamp: string | null;
  duration_ms: number | null;
  summary: string | null;
  mentioned: string[] | null;
  tags: string[] | null;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  similarity?: number; // Added for Hybrid Search phase 3
}

export interface RagSearchFilter {
  speaker?: string;
  title?: string;
  topic?: string;
  subject?: string;
  startDateFrom?: string; // ISO date string
  startDateTo?: string;
  tags?: string[];
  mentioned?: string[];
  status?: string;
  keyword?: string; // Full text search in content / summary
  page?: number;
  pageSize?: number;
}

export interface RagSearchResult {
  items: RagMetadataRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface RagStats {
  totalRecords: number;
  totalSpeakers: number;
  totalDurationMs: number;
  speakers: Array<{ speaker: string; count: number }>;
  topTags: Array<{ tag: string; count: number }>;
  statusCounts: Array<{ status: string; count: number }>;
  recentDates: Array<{ date: string; count: number }>;
}

async function embedText(text: string, retries = 3): Promise<number[] | null> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      const client = getGeminiClient();
      const result = await client.models.embedContent({
        model: 'gemini-embedding-001',
        contents: text,
        config: { outputDimensionality: 768 },
      });
      return result.embeddings?.[0]?.values || null;
    } catch (error) {
      attempt++;
      console.warn(`Embedding generation failed (attempt ${attempt}):`, error);
      if (attempt >= retries) return null; // Fallback to raw text matching
      await new Promise(res => setTimeout(res, 1000 * Math.pow(2, attempt))); // Exponential backoff
    }
  }
  return null;
}

export async function searchRagMetadata(
  filter: RagSearchFilter
): Promise<RagSearchResult> {
  const {
    speaker,
    title,
    topic,
    subject,
    startDateFrom,
    startDateTo,
    tags,
    mentioned,
    status,
    keyword,
    page = 1,
    pageSize = 20,
  } = filter;

  const conditions = [isNull(ragMetadata.deleted_at)];

  if (speaker) conditions.push(ilike(ragMetadata.speaker, `%${speaker}%`));
  if (title) conditions.push(ilike(ragMetadata.title, `%${title}%`));
  if (topic) conditions.push(ilike(ragMetadata.topic, `%${topic}%`));
  if (subject) conditions.push(ilike(ragMetadata.subject, `%${subject}%`));
  if (startDateFrom) conditions.push(gte(ragMetadata.start_time, new Date(startDateFrom)));
  if (startDateTo) conditions.push(lte(ragMetadata.start_time, new Date(startDateTo + 'T23:59:59Z')));
  if (status) conditions.push(eq(ragMetadata.status, status));

  if (tags && tags.length > 0) {
    conditions.push(sql`${ragMetadata.tags} ?| ${tags}::text[]`);
  }

  if (mentioned && mentioned.length > 0) {
    conditions.push(sql`${ragMetadata.mentioned} ?| ${mentioned}::text[]`);
  }

  let queryEmbedding: number[] | null = null;
  let k = '';

  if (keyword) {
    k = `%${keyword}%`;
    // Attempt semantic embedding generation
    queryEmbedding = await embedText(keyword);

    if (queryEmbedding) {
      const embString = `[${queryEmbedding.join(',')}]`;
      // Perform genuine Hybrid Search:
      // Match if the similarity > 0.4 (distance < 0.6) OR if it literally matches keyword
      conditions.push(
        sql`(${ragMetadata.embedding} <=> ${embString}::vector < 0.6 OR ${ragMetadata.content} ILIKE ${k} OR ${ragMetadata.summary} ILIKE ${k} OR ${ragMetadata.title} ILIKE ${k})`
      );
    } else {
      // Fallback Search mode when Gemini API drops or errors out
      conditions.push(
        sql`(${ragMetadata.content} ILIKE ${k} OR ${ragMetadata.summary} ILIKE ${k} OR ${ragMetadata.title} ILIKE ${k} OR ${ragMetadata.speaker} ILIKE ${k})`
      );
    }
  }

  const whereClause = and(...conditions);

  // Count query
  const countResult = await db
    .select({ total: sql<number>`cast(count(${ragMetadata.id}) as int)` })
    .from(ragMetadata)
    .where(whereClause);
  const total = countResult[0]?.total || 0;

  // Data query with pagination
  const offset = (page - 1) * pageSize;
  
  // Notice we use sql to return LEFT(content, 500)
  const items = await db
    .select({
      id: ragMetadata.id,
      unique_id: ragMetadata.unique_id,
      record_id: ragMetadata.record_id,
      utterance_id: ragMetadata.utterance_id,
      file_name: ragMetadata.file_name,
      file_path: ragMetadata.file_path,
      store_path: ragMetadata.store_path,
      speaker: ragMetadata.speaker,
      title: ragMetadata.title,
      topic: ragMetadata.topic,
      subject: ragMetadata.subject,
      content: ragMetadata.content,
      start_time: ragMetadata.start_time,
      raw_timestamp: ragMetadata.raw_timestamp,
      duration_ms: ragMetadata.duration_ms,
      summary: ragMetadata.summary,
      mentioned: ragMetadata.mentioned,
      tags: ragMetadata.tags,
      status: ragMetadata.status,
      created_at: ragMetadata.created_at,
      updated_at: ragMetadata.updated_at,
      deleted_at: ragMetadata.deleted_at,
      // Request similarity out for UI display if needed
      similarity: queryEmbedding
        ? sql<number>`round((1 - (${ragMetadata.embedding} <=> ${`[${queryEmbedding.join(',')}]`}::vector))::numeric, 4)`
        : sql<number>`0`,
    })
    .from(ragMetadata)
    .where(whereClause)
    .orderBy(...(queryEmbedding 
      ? [sql`${ragMetadata.embedding} <=> ${`[${queryEmbedding.join(',')}]`}::vector ASC`] 
      : [sql`${ragMetadata.start_time} DESC NULLS LAST`, desc(ragMetadata.id)]
    ))
    .limit(pageSize)
    .offset(offset);

  return {
    items: items as unknown as RagMetadataRow[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getRagMetadataById(id: number): Promise<RagMetadataRow | null> {
  const result = await db
    .select()
    .from(ragMetadata)
    .where(and(eq(ragMetadata.id, id), isNull(ragMetadata.deleted_at)))
    .limit(1);
    
  return (result[0] as unknown as RagMetadataRow) ?? null;
}

export async function getRagStats(): Promise<RagStats> {
  // We use raw sql here to keep the complex stats calculation identical to previous optimized behavior
  const [totals, speakers, tags, statusCounts, recent] = await Promise.all([
    rawQuery<{ total: string; total_speakers: string; total_duration: string }>(
      `SELECT 
        COUNT(*) AS total,
        COUNT(DISTINCT speaker) AS total_speakers,
        COALESCE(SUM(duration_ms), 0) AS total_duration
       FROM rag_metadata WHERE deleted_at IS NULL`
    ),
    rawQuery<{ speaker: string; count: string }>(
      `SELECT speaker, COUNT(*) AS count
       FROM rag_metadata
       WHERE deleted_at IS NULL AND speaker IS NOT NULL
       GROUP BY speaker
       ORDER BY count DESC
       LIMIT 20`
    ),
    rawQuery<{ tag: string; count: string }>(
      `SELECT tag, COUNT(*) AS count
       FROM rag_metadata,
            LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(tags) = 'array' THEN tags ELSE '[]'::jsonb END) AS tag
       WHERE deleted_at IS NULL AND tags IS NOT NULL
       GROUP BY tag
       ORDER BY count DESC
       LIMIT 30`
    ),
    rawQuery<{ status: string; count: string }>(
      `SELECT status, COUNT(*) AS count
       FROM rag_metadata
       WHERE deleted_at IS NULL
       GROUP BY status`
    ),
    rawQuery<{ date: string; count: string }>(
      `SELECT DATE(start_time AT TIME ZONE 'Asia/Shanghai') AS date, COUNT(*) AS count
       FROM rag_metadata
       WHERE deleted_at IS NULL AND start_time IS NOT NULL
       GROUP BY date
       ORDER BY date DESC
       LIMIT 30`
    ),
  ]);

  return {
    totalRecords: parseInt(totals[0]?.total || '0', 10),
    totalSpeakers: parseInt(totals[0]?.total_speakers || '0', 10),
    totalDurationMs: parseInt(totals[0]?.total_duration || '0', 10),
    speakers: speakers.map((s) => ({ speaker: s.speaker, count: parseInt(s.count, 10) })),
    topTags: tags.map((t) => ({ tag: t.tag, count: parseInt(t.count, 10) })),
    statusCounts: statusCounts.map((s) => ({ status: s.status, count: parseInt(s.count, 10) })),
    recentDates: recent.map((r) => ({ date: String(r.date), count: parseInt(r.count, 10) })),
  };
}

export async function getDistinctSpeakers(): Promise<string[]> {
  const rows = await rawQuery<{ speaker: string }>(
    `SELECT DISTINCT speaker FROM rag_metadata
     WHERE deleted_at IS NULL AND speaker IS NOT NULL
     ORDER BY speaker`
  );
  return rows.map((r) => r.speaker);
}

export async function getDistinctTopics(): Promise<string[]> {
  const rows = await rawQuery<{ topic: string }>(
    `SELECT DISTINCT topic FROM rag_metadata
     WHERE deleted_at IS NULL AND topic IS NOT NULL
     ORDER BY topic`
  );
  return rows.map((r) => r.topic);
}

export async function getDistinctTags(): Promise<string[]> {
  const rows = await rawQuery<{ tag: string }>(
    `SELECT DISTINCT tag
     FROM rag_metadata,
          LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(tags) = 'array' THEN tags ELSE '[]'::jsonb END) AS tag
     WHERE deleted_at IS NULL AND tags IS NOT NULL
     ORDER BY tag`
  );
  return rows.map((r) => r.tag);
}

/**
 * Build a Gemini metadata filter string from the search filter.
 * This is used to pass to the Gemini File Search tool.
 */
export function buildGeminiMetadataFilter(filter: RagSearchFilter): string | undefined {
  const parts: string[] = [];

  if (filter.speaker) {
    parts.push(`speaker="${filter.speaker}"`);
  }
  if (filter.topic) {
    parts.push(`topic="${filter.topic}"`);
  }
  if (filter.startDateFrom) {
    parts.push(`startDate>="${filter.startDateFrom.substring(0, 10)}"`);
  }
  if (filter.startDateTo) {
    parts.push(`startDate<="${filter.startDateTo.substring(0, 10)}"`);
  }

  return parts.length > 0 ? parts.join(' AND ') : undefined;
}
