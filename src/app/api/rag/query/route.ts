import { NextRequest, NextResponse } from 'next/server';
import { searchRagMetadata, buildGeminiMetadataFilter, RagSearchFilter } from '@/services/rag.service';
import { chatStream } from '@/services/chat.service';
import { config } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      question,
      filter: filterInput,
      storeId,
      model,
      includeContext = true,
    }: {
      question: string;
      filter?: RagSearchFilter;
      storeId?: string;
      model?: string;
      includeContext?: boolean;
    } = body;

    if (!question) {
      return NextResponse.json(
        { success: false, error: 'question is required' },
        { status: 400 }
      );
    }

    const storeNames = storeId
      ? [`fileSearchStores/${storeId}`]
      : [`fileSearchStores/${config.defaultStoreName}`];

    // Build Gemini metadata filter from user filters
    const geminiFilter = filterInput ? buildGeminiMetadataFilter(filterInput) : undefined;

    // Optionally include relevant DB context as system context
    let contextPrefix = '';
    if (includeContext && filterInput) {
      try {
        const dbResult = await searchRagMetadata({ ...filterInput, pageSize: 5 });
        if (dbResult.items.length > 0) {
          const contextLines = dbResult.items.map((item) => {
            const parts = [`[${item.speaker || '未知'}] ${item.start_time || ''}`];
            if (item.title) parts.push(`标题: ${item.title}`);
            if (item.summary) parts.push(`摘要: ${item.summary}`);
            return parts.join(' | ');
          });
          contextPrefix = `以下是相关记录的上下文信息，请参考：\n${contextLines.join('\n')}\n\n---\n\n`;
        }
      } catch {
        // Context loading failed, continue without it
      }
    }

    const fullQuestion = contextPrefix + question;

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          const gen = chatStream({
            contents: fullQuestion,
            storeNames,
            model,
            metadataFilter: geminiFilter,
          });

          for await (const chunk of gen) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
            );
          }

          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Stream error';
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Query failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
