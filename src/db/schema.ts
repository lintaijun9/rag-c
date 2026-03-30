import { pgTable, serial, text, varchar, timestamp, integer, jsonb, vector, index } from 'drizzle-orm/pg-core';

export const ragMetadata = pgTable('rag_metadata', {
  id: serial('id').primaryKey(),
  unique_id: varchar('unique_id', { length: 255 }),
  record_id: varchar('record_id', { length: 255 }).notNull(),
  utterance_id: varchar('utterance_id', { length: 255 }).notNull(),
  file_name: text('file_name'),
  file_path: text('file_path'),
  store_path: text('store_path'),
  speaker: varchar('speaker', { length: 255 }),
  title: text('title'),
  topic: text('topic'),
  subject: text('subject'),
  content: text('content'),
  start_time: timestamp('start_time'),
  raw_timestamp: varchar('raw_timestamp', { length: 255 }),
  duration_ms: integer('duration_ms'),
  summary: text('summary'),
  mentioned: jsonb('mentioned').$type<string[]>(),
  tags: jsonb('tags').$type<string[]>(),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  // Add embedding column for Phase 3 pgvector Semantic Search
  embedding: vector('embedding', { dimensions: 768 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  deleted_at: timestamp('deleted_at'),
},
(table) => ({
  embeddingIndex: index('embeddingIndex').using('hnsw', table.embedding.op('vector_cosine_ops')),
}));
