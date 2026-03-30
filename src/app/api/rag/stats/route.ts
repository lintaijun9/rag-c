import { NextResponse } from 'next/server';
import { getRagStats, getDistinctSpeakers, getDistinctTopics, getDistinctTags } from '@/services/rag.service';
import { testConnection } from '@/lib/db';
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const connected = await testConnection();
    if (!connected) {
      return NextResponse.json({ success: false, error: 'Database connection failed' }, { status: 503 });
    }

    const [stats, speakers, topics, tags] = await Promise.all([
      getRagStats(),
      getDistinctSpeakers(),
      getDistinctTopics(),
      getDistinctTags(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        stats,
        speakers,
        topics,
        tags,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Error in GET /api/rag/stats");
    const message = error instanceof Error ? error.message : 'Failed to get RAG stats';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
