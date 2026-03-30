import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const speaker = searchParams.get('speaker') || undefined;
    const startDateFrom = searchParams.get('startDateFrom') || undefined;
    const startDateTo = searchParams.get('startDateTo') || undefined;

    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (speaker) {
      conditions.push(`speaker ILIKE $${paramIndex++}`);
      params.push(`%${speaker}%`);
    }
    if (startDateFrom) {
      conditions.push(`start_time >= $${paramIndex++}`);
      params.push(startDateFrom);
    }
    if (startDateTo) {
      conditions.push(`start_time <= $${paramIndex++}`);
      params.push(startDateTo + 'T23:59:59Z');
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [
      dailyTrend,
      speakerActivity,
      topicDistribution,
      tagHeatmap,
      durationDistribution,
      mentionedPersons,
    ] = await Promise.all([
      // Daily record count trend (last 60 days)
      query<{ date: string; count: string; total_duration: string }>(
        `SELECT
          DATE(start_time AT TIME ZONE 'Asia/Shanghai') AS date,
          COUNT(*) AS count,
          COALESCE(SUM(duration_ms), 0) AS total_duration
         FROM rag_metadata
         ${whereClause}
           AND start_time >= NOW() - INTERVAL '60 days'
         GROUP BY date
         ORDER BY date ASC`,
        params
      ),
      // Speaker activity with total duration
      query<{ speaker: string; count: string; total_duration: string; avg_duration: string }>(
        `SELECT
          speaker,
          COUNT(*) AS count,
          COALESCE(SUM(duration_ms), 0) AS total_duration,
          COALESCE(AVG(duration_ms), 0) AS avg_duration
         FROM rag_metadata
         ${whereClause} AND speaker IS NOT NULL
         GROUP BY speaker
         ORDER BY count DESC
         LIMIT 15`,
        params
      ),
      // Topic distribution
      query<{ topic: string; count: string }>(
        `SELECT topic, COUNT(*) AS count
         FROM rag_metadata
         ${whereClause} AND topic IS NOT NULL
         GROUP BY topic
         ORDER BY count DESC
         LIMIT 20`,
        params
      ),
      // Tag frequency heatmap
      query<{ tag: string; count: string }>(
        `SELECT tag, COUNT(*) AS count
         FROM rag_metadata,
              LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(tags) = 'array' THEN tags ELSE '[]'::jsonb END) AS tag
         ${whereClause} AND tags IS NOT NULL
         GROUP BY tag
         ORDER BY count DESC
         LIMIT 50`,
        params
      ),
      // Duration distribution buckets
      query<{ bucket: string; count: string }>(
        `SELECT
          CASE
            WHEN duration_ms < 60000 THEN '< 1min'
            WHEN duration_ms < 300000 THEN '1-5min'
            WHEN duration_ms < 900000 THEN '5-15min'
            WHEN duration_ms < 1800000 THEN '15-30min'
            WHEN duration_ms < 3600000 THEN '30-60min'
            ELSE '> 60min'
          END AS bucket,
          COUNT(*) AS count
         FROM rag_metadata
         ${whereClause} AND duration_ms IS NOT NULL
         GROUP BY bucket
         ORDER BY MIN(duration_ms)`,
        params
      ),
      // Most mentioned persons
      query<{ person: string; count: string }>(
        `SELECT person, COUNT(*) AS count
         FROM rag_metadata,
              LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(mentioned) = 'array' THEN mentioned ELSE '[]'::jsonb END) AS person
         ${whereClause} AND mentioned IS NOT NULL
         GROUP BY person
         ORDER BY count DESC
         LIMIT 20`,
        params
      ),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        dailyTrend: dailyTrend.map((r) => ({
          date: String(r.date),
          count: parseInt(r.count, 10),
          totalDuration: parseInt(r.total_duration, 10),
        })),
        speakerActivity: speakerActivity.map((r) => ({
          speaker: r.speaker,
          count: parseInt(r.count, 10),
          totalDuration: parseInt(r.total_duration, 10),
          avgDuration: Math.round(parseFloat(r.avg_duration)),
        })),
        topicDistribution: topicDistribution.map((r) => ({
          topic: r.topic,
          count: parseInt(r.count, 10),
        })),
        tagHeatmap: tagHeatmap.map((r) => ({
          tag: r.tag,
          count: parseInt(r.count, 10),
        })),
        durationDistribution: durationDistribution.map((r) => ({
          bucket: r.bucket,
          count: parseInt(r.count, 10),
        })),
        mentionedPersons: mentionedPersons.map((r) => ({
          person: r.person,
          count: parseInt(r.count, 10),
        })),
      },
    });
  } catch (error) {
    logger.error({ err: error, url: request.url }, "Error in GET /api/rag/analytics");
    const message = error instanceof Error ? error.message : 'Analytics query failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
