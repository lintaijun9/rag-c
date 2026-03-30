import { NextRequest, NextResponse } from 'next/server';
import { searchRagMetadata, RagSearchFilter } from '@/services/rag.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv'; // csv | json

    const filter: RagSearchFilter = {
      speaker: searchParams.get('speaker') || undefined,
      topic: searchParams.get('topic') || undefined,
      startDateFrom: searchParams.get('startDateFrom') || undefined,
      startDateTo: searchParams.get('startDateTo') || undefined,
      status: searchParams.get('status') || undefined,
      keyword: searchParams.get('keyword') || undefined,
      page: 1,
      pageSize: 5000, // Export up to 5000 records
    };

    const tagsParam = searchParams.get('tags');
    if (tagsParam) {
      filter.tags = tagsParam.split(',').map((t) => t.trim()).filter(Boolean);
    }

    const result = await searchRagMetadata(filter);

    if (format === 'json') {
      const blob = JSON.stringify(result.items, null, 2);
      return new Response(blob, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="rag-export-${Date.now()}.json"`,
        },
      });
    }

    // CSV export
    const headers = [
      'id', 'speaker', 'title', 'topic', 'start_time', 'duration_ms',
      'status', 'summary', 'tags', 'mentioned', 'file_name',
    ];

    const rows = result.items.map((item) => [
      item.id,
      item.speaker || '',
      item.title || '',
      item.topic || '',
      item.start_time || '',
      item.duration_ms || '',
      item.status,
      item.summary || '',
      Array.isArray(item.tags) ? item.tags.join(';') : '',
      Array.isArray(item.mentioned) ? item.mentioned.join(';') : '',
      item.file_name || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    return new Response('\uFEFF' + csvContent, { // BOM for Excel UTF-8
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="rag-export-${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Export failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
