import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'all'; // all | speaker | tag | topic | keyword

    if (!q || q.length < 1) {
      return NextResponse.json({ success: true, data: [] });
    }

    const results: Array<{ type: string; value: string; count?: number }> = [];

    if (type === 'all' || type === 'speaker') {
      const speakers = await query<{ speaker: string; count: string }>(
        `SELECT speaker, COUNT(*) AS count
         FROM rag_metadata
         WHERE deleted_at IS NULL AND speaker ILIKE $1
         GROUP BY speaker
         ORDER BY count DESC
         LIMIT 5`,
        [`%${q}%`]
      );
      results.push(
        ...speakers.map((s) => ({
          type: 'speaker',
          value: s.speaker,
          count: parseInt(s.count, 10),
        }))
      );
    }

    if (type === 'all' || type === 'tag') {
      const tags = await query<{ tag: string; count: string }>(
        `SELECT tag, COUNT(*) AS count
         FROM rag_metadata,
              LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(tags) = 'array' THEN tags ELSE '[]'::jsonb END) AS tag
         WHERE deleted_at IS NULL AND tag ILIKE $1
         GROUP BY tag
         ORDER BY count DESC
         LIMIT 5`,
        [`%${q}%`]
      );
      results.push(
        ...tags.map((t) => ({
          type: 'tag',
          value: t.tag,
          count: parseInt(t.count, 10),
        }))
      );
    }

    if (type === 'all' || type === 'topic') {
      const topics = await query<{ topic: string; count: string }>(
        `SELECT topic, COUNT(*) AS count
         FROM rag_metadata
         WHERE deleted_at IS NULL AND topic ILIKE $1
         GROUP BY topic
         ORDER BY count DESC
         LIMIT 5`,
        [`%${q}%`]
      );
      results.push(
        ...topics.map((t) => ({
          type: 'topic',
          value: t.topic,
          count: parseInt(t.count, 10),
        }))
      );
    }

    if (type === 'all' || type === 'keyword') {
      const keywords = await query<{ title: string; count: string }>(
        `SELECT title, COUNT(*) AS count
         FROM rag_metadata
         WHERE deleted_at IS NULL AND title ILIKE $1
         GROUP BY title
         ORDER BY count DESC
         LIMIT 5`,
        [`%${q}%`]
      );
      results.push(
        ...keywords.map((k) => ({
          type: 'title',
          value: k.title,
          count: parseInt(k.count, 10),
        }))
      );
    }

    return NextResponse.json({ success: true, data: results.slice(0, 12) });
  } catch (error) {
    logger.error({ err: error, url: request.url }, "Error in GET /api/rag/suggest");
    const message = error instanceof Error ? error.message : 'Suggest query failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
