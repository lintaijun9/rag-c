import { getGeminiClient } from '@/lib/gemini-client';
import type { FileSearchStore } from '@/types/gemini';

export async function listStores(): Promise<FileSearchStore[]> {
  const client = getGeminiClient();
  const stores: FileSearchStore[] = [];

  const result = await client.fileSearchStores.list();
  for await (const store of result) {
    stores.push(store as unknown as FileSearchStore);
  }

  return stores;
}

export async function getStore(name: string): Promise<FileSearchStore> {
  const client = getGeminiClient();
  const store = await client.fileSearchStores.get({ name });
  return store as unknown as FileSearchStore;
}

export async function createStore(displayName: string): Promise<FileSearchStore> {
  const client = getGeminiClient();
  const store = await client.fileSearchStores.create({
    config: { displayName },
  });
  return store as unknown as FileSearchStore;
}

export async function deleteStore(name: string, force = true): Promise<void> {
  const client = getGeminiClient();
  await client.fileSearchStores.delete({
    name,
    config: { force },
  });
}
