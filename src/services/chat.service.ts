import { getGeminiClient } from '@/lib/gemini-client';
import { config } from '@/lib/config';

interface ChatStreamOptions {
  model?: string;
  contents: string;
  storeNames: string[];
  metadataFilter?: string;
}

export async function* chatStream(options: ChatStreamOptions): AsyncGenerator<string> {
  const client = getGeminiClient();
  const model = options.model || config.defaultModel;

  const response = await client.models.generateContentStream({
    model,
    contents: options.contents,
    config: {
      tools: [
        {
          fileSearch: {
            fileSearchStoreNames: options.storeNames,
            ...(options.metadataFilter ? { metadataFilter: options.metadataFilter } : {}),
          },
        },
      ],
    },
  });

  for await (const chunk of response) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
}

export async function chatGenerate(options: ChatStreamOptions) {
  const client = getGeminiClient();
  const model = options.model || config.defaultModel;

  const response = await client.models.generateContent({
    model,
    contents: options.contents,
    config: {
      tools: [
        {
          fileSearch: {
            fileSearchStoreNames: options.storeNames,
            ...(options.metadataFilter ? { metadataFilter: options.metadataFilter } : {}),
          },
        },
      ],
    },
  });

  return {
    text: response.text || '',
    groundingMetadata: response.candidates?.[0]?.groundingMetadata || null,
  };
}
