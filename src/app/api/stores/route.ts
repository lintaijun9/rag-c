import { NextResponse } from 'next/server';
import { listStores, createStore, deleteStore } from '@/services/store.service';

export async function GET() {
  try {
    const stores = await listStores();
    return NextResponse.json({ success: true, data: stores });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list stores';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { displayName } = body;

    if (!displayName) {
      return NextResponse.json(
        { success: false, error: 'displayName is required' },
        { status: 400 }
      );
    }

    const store = await createStore(displayName);
    return NextResponse.json({ success: true, data: store });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create store';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Store name is required' },
        { status: 400 }
      );
    }

    await deleteStore(name);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete store';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
