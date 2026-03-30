import { getGeminiClient } from '@/lib/gemini-client';
import type { FileSearchDocument } from '@/types/gemini';

export async function listDocuments(storeName: string): Promise<FileSearchDocument[]> {
  const client = getGeminiClient();
  const documents: FileSearchDocument[] = [];

  const result = await client.fileSearchStores.documents.list({
    parent: storeName,
  });
  for await (const doc of result) {
    documents.push(doc as unknown as FileSearchDocument);
  }

  return documents;
}

export async function getDocument(name: string): Promise<FileSearchDocument> {
  const client = getGeminiClient();
  const doc = await client.fileSearchStores.documents.get({ name });
  return doc as unknown as FileSearchDocument;
}

export async function deleteDocument(name: string): Promise<void> {
  const client = getGeminiClient();
  await client.fileSearchStores.documents.delete({ name });
}
