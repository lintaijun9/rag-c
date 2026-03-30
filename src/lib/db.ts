import { Pool, PoolClient } from 'pg';

import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';

// Create a safe global singleton for Next.js hot-reloads
const globalForPg = globalThis as unknown as {
  pgPool: Pool | undefined;
};

function getDatabaseUrl(): string {
  // From docs: postgresql://admin:cHczwTs7JeYfeMpH@124.223.68.223:35432:35432/lifeflow
  // Fix the duplicated port in the original connection string
  const rawUrl = process.env.DATABASE_URL || 
    'postgresql://admin:cHczwTs7JeYfeMpH@124.223.68.223:35432/postgres';
  // Handle duplicated port like "host:35432:35432"
  return rawUrl.replace(/:(\d+):\1\//, ':$1/');
}

export function getPool(): Pool {
  if (!globalForPg.pgPool) {
    const connectionString = getDatabaseUrl();
    globalForPg.pgPool = new Pool({
      connectionString,
      ssl: false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    globalForPg.pgPool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }
  return globalForPg.pgPool;
}

export const db = drizzle(getPool(), { schema });

export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    await query('SELECT 1 AS ok');
    return true;
  } catch {
    return false;
  }
}
