import { getGeminiClient } from '@/lib/gemini-client';
import type { CustomMetadata, ChunkingConfig, Operation } from '@/types/gemini';
import { config } from '@/lib/config';

interface UploadOptions {
  storeName: string;
  file: File | Blob;
  displayName?: string;
  customMetadata?: CustomMetadata[];
  chunkingConfig?: ChunkingConfig;
}

export async function uploadFileToStore(options: UploadOptions): Promise<Operation> {
  const client = getGeminiClient();

  const uploadConfig: Record<string, unknown> = {};
  if (options.displayName) {
    uploadConfig.displayName = options.displayName;
  }
  if (options.customMetadata && options.customMetadata.length > 0) {
    uploadConfig.customMetadata = options.customMetadata;
  }
  if (options.chunkingConfig) {
    uploadConfig.chunkingConfig = options.chunkingConfig;
  } else {
    uploadConfig.chunkingConfig = {
      whiteSpaceConfig: {
        maxTokensPerChunk: config.defaultMaxTokensPerChunk,
        maxOverlapTokens: config.defaultMaxOverlapTokens,
      },
    };
  }

  const operation = await client.fileSearchStores.uploadToFileSearchStore({
    fileSearchStoreName: options.storeName,
    file: options.file,
    config: uploadConfig,
  });

  return operation as unknown as Operation;
}

export async function waitForOperation(operation: Operation): Promise<Operation> {
  const client = getGeminiClient();
  let current = operation;

  while (!current.done) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    current = (await client.operations.get({ operation: current as any })) as unknown as Operation;
  }

  return current;
}

/**
 * Upload multiple files with concurrency control
 */
export async function uploadFilesBatch(
  storeName: string,
  files: { file: File | Blob; displayName: string }[],
  options: {
    customMetadata?: CustomMetadata[];
    chunkingConfig?: ChunkingConfig;
    concurrency?: number;
    onProgress?: (completed: number, total: number, currentFile: string) => void;
    onFileComplete?: (fileName: string, success: boolean, error?: string) => void;
  } = {}
): Promise<{ succeeded: number; failed: number; errors: { file: string; error: string }[] }> {
  const concurrency = options.concurrency || config.concurrentUploads;
  const total = files.length;
  let completed = 0;
  const errors: { file: string; error: string }[] = [];

  // Process files in batches
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);

    const results = await Promise.allSettled(
      batch.map(async ({ file, displayName }) => {
        try {
          const op = await uploadFileToStore({
            storeName,
            file,
            displayName,
            customMetadata: options.customMetadata,
            chunkingConfig: options.chunkingConfig,
          });

          // Wait for processing to complete
          await waitForOperation(op);

          completed++;
          options.onProgress?.(completed, total, displayName);
          options.onFileComplete?.(displayName, true);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          errors.push({ file: displayName, error: errorMsg });
          completed++;
          options.onProgress?.(completed, total, displayName);
          options.onFileComplete?.(displayName, false, errorMsg);
          throw err;
        }
      })
    );

    // Check for failures
    results.forEach((result, index) => {
      if (result.status === 'rejected' && !errors.find(e => e.file === batch[index].displayName)) {
        errors.push({
          file: batch[index].displayName,
          error: result.reason?.message || 'Unknown error',
        });
      }
    });
  }

  return {
    succeeded: total - errors.length,
    failed: errors.length,
    errors,
  };
}
