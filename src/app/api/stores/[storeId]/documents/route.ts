import { NextResponse } from 'next/server';
import { listDocuments, deleteDocument } from '@/services/document.service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const storeName = `fileSearchStores/${storeId}`;
    const documents = await listDocuments(storeName);
    return NextResponse.json({ success: true, data: documents });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list documents';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Document name is required' },
        { status: 400 }
      );
    }

    await deleteDocument(name);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete document';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
