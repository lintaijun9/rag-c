import { NextResponse } from 'next/server';
import { getStore } from '@/services/store.service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const storeName = `fileSearchStores/${storeId}`;
    const store = await getStore(storeName);
    return NextResponse.json({ success: true, data: store });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get store';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
