import { NextRequest, NextResponse } from 'next/server';
import { searchRagMetadata, RagSearchFilter } from '@/services/rag.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filter: RagSearchFilter = {
      speaker: searchParams.get('speaker') || undefined,
      title: searchParams.get('title') || undefined,
      topic: searchParams.get('topic') || undefined,
      subject: searchParams.get('subject') || undefined,
      startDateFrom: searchParams.get('startDateFrom') || undefined,
      startDateTo: searchParams.get('startDateTo') || undefined,
      status: searchParams.get('status') || undefined,
      keyword: searchParams.get('keyword') || undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      pageSize: parseInt(searchParams.get('pageSize') || '20', 10),
    };

    // Tags and mentioned are comma-separated
    const tagsParam = searchParams.get('tags');
    if (tagsParam) {
      filter.tags = tagsParam.split(',').map((t) => t.trim()).filter(Boolean);
    }

    const mentionedParam = searchParams.get('mentioned');
    if (mentionedParam) {
      filter.mentioned = mentionedParam.split(',').map((m) => m.trim()).filter(Boolean);
    }

    const result = await searchRagMetadata(filter);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
