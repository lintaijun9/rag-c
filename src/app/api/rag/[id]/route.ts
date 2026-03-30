import { NextRequest, NextResponse } from 'next/server';
import { getRagMetadataById } from '@/services/rag.service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    const item = await getRagMetadataById(numId);
    if (!item) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get record';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
