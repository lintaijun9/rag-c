import { GoogleGenAI } from '@google/genai';
import { config } from './config';

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    if (!config.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    client = new GoogleGenAI({ apiKey: config.geminiApiKey });
  }
  return client;
}
