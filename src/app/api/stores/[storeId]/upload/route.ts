import { NextResponse } from 'next/server';
import { uploadFileToStore, waitForOperation } from '@/services/upload.service';
import type { CustomMetadata, ChunkingConfig } from '@/types/gemini';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const storeName = `fileSearchStores/${storeId}`;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const displayName = formData.get('displayName') as string | null;
    const metadataStr = formData.get('metadata') as string | null;
    const chunkingStr = formData.get('chunkingConfig') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File is required' },
        { status: 400 }
      );
    }

    let customMetadata: CustomMetadata[] | undefined;
    if (metadataStr) {
      try {
        customMetadata = JSON.parse(metadataStr);
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid metadata JSON' },
          { status: 400 }
        );
      }
    }

    let chunkingConfig: ChunkingConfig | undefined;
    if (chunkingStr) {
      try {
        chunkingConfig = JSON.parse(chunkingStr);
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid chunkingConfig JSON' },
          { status: 400 }
        );
      }
    }

    const operation = await uploadFileToStore({
      storeName,
      file,
      displayName: displayName || file.name,
      customMetadata,
      chunkingConfig,
    });

    // Wait for the upload to be processed
    const result = await waitForOperation(operation);

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload file';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
