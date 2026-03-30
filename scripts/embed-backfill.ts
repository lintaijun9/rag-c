import { GoogleGenAI } from '@google/genai';
import { db, query, getPool } from '../src/lib/db';
import { ragMetadata } from '../src/db/schema';
import { isNull, sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

// Ensure the GoogleGenAI uses the env directly, or pass the key
const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyBf5NB9d0I_fzwJb0l1QpaLGojmmRTdbv8';
const client = new GoogleGenAI({ apiKey });

const BATCH_SIZE = 50; 
const TARGET_MODEL = 'gemini-embedding-001'; // Gemini's text embedding model (produces 768 dims)

async function setupVectorExtension() {
  console.log('🔄 Checking / Creating pgvector extension...');
  await query('CREATE EXTENSION IF NOT EXISTS vector;');
  
  console.log('🔄 Ensuring embedding column exists...');
  await query('ALTER TABLE rag_metadata ADD COLUMN IF NOT EXISTS "embedding" vector(768);');
  
  console.log('✅ pgvector extension and schema column are ready.');
}

async function runBackfill() {
  try {
    await setupVectorExtension();

    console.log('🔎 Scanning for records without embeddings...');
    
    // We get records that don't have embeddings set and aren't deleted
    while (true) {
      // Because drizzle may not know about embedding if it's not fully synced, we use raw sql
      // but since we updated schema.ts, we can use Drizzle:
      const recordsToEmbed = await db
        .select({
          id: ragMetadata.id,
          title: ragMetadata.title,
          summary: ragMetadata.summary,
          content: sql<string>`left(${ragMetadata.content}, 1500)`, // truncate to 1500 to keep it concise and cost-efficient for embedding
        })
        .from(ragMetadata)
        .where(
          sql`${ragMetadata.embedding} IS NULL AND ${ragMetadata.deleted_at} IS NULL`
        )
        .limit(BATCH_SIZE);

      if (recordsToEmbed.length === 0) {
        console.log('🎉 No more records need embeddings! Backfill complete.');
        break;
      }

      console.log(`📦 Processing batch of ${recordsToEmbed.length} records...`);

      // Prepare text chunks
      const textsToEmbed = recordsToEmbed.map(r => {
        // Construct a meaningful block of text for semantic representation
        return [
          r.title ? `Title: ${r.title}` : '',
          r.summary ? `Summary: ${r.summary}` : '',
          r.content ? `Content: ${r.content}` : '',
        ].filter(Boolean).join('\n');
      });

      // Call Gemini for batch embeddings
      // Instead of looping individually, we can Promise.all or send them if batch-embedding API is supported by the SDK
      const embeddingsList: number[][] = [];
      
      console.log('   - Requesting embeddings from Gemini...');
      
      // We will do parallel requests with a small concurrency limit because the SDK might not support bulk embeddings natively
      // GoogleGenAI supports embedContent.
      const promises = textsToEmbed.map(async (text, index) => {
        try {
          // If text is extremely short or empty, provide a fallback to avoid errors
          const safeText = text.trim() || 'No content';
          const result = await client.models.embedContent({
            model: TARGET_MODEL,
            contents: safeText,
            config: { outputDimensionality: 768 },
          });
          
          return result.embeddings?.[0]?.values || [];
        } catch (error) {
          console.error(`   ❌ Failed to embed record ID ${recordsToEmbed[index].id}:`, error);
          return [];
        }
      });

      const results = await Promise.all(promises);

      console.log('   - Applying embeddings to the database...');
      let updatedCount = 0;
      
      for (let i = 0; i < recordsToEmbed.length; i++) {
        const emb = results[i];
        if (emb && emb.length === 768) {
          // Drizzle has native support, but sometimes string array representation is safer: `[0.1, 0.2, ...]`
          const embString = `[${emb.join(',')}]`;
          
          await query(
            'UPDATE rag_metadata SET embedding = $1::vector WHERE id = $2',
            [embString, recordsToEmbed[i].id]
          );
          updatedCount++;
        }
      }

      console.log(`✅ Batch complete: Successfully added embeddings to ${updatedCount}/${recordsToEmbed.length} records.`);
    }

  } catch (error) {
    console.error('❌ Backfill encounter a fatal error:', error);
  } finally {
    // Need to aggressively terminate pool or process will hang
    process.exit(0);
  }
}

console.log('🚀 Starting PgVector Embedding Pipeline...');
runBackfill();
