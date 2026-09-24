import pg from 'pg';
import { newDb, DataType } from 'pg-mem';
import { randomUUID } from 'crypto';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { env } from './env.js';
import { getSchemaSql } from '../utils/paths.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const { Pool: PgPool } = pg;

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

let activePool: any = null;
let isInMemory = false;
let isSQLite = false;

export function getIsInMemory(): boolean {
  return isInMemory;
}

export function getIsSQLite(): boolean {
  return isSQLite;
}

/**
 * Initializes database connection with 3-tier fallback:
 *
 *   Tier 1: External PostgreSQL (production / local Postgres install)
 *   Tier 2: SQLite file-backed database (persists across server restarts)
 *   Tier 3: pg-mem in-memory engine (zero persistence, last resort)
 */
export async function initializeDatabase(): Promise<any> {
  if (activePool) return activePool;

  // ─── Tier 1: Try external PostgreSQL ───────────────────────
  const isProd = env.NODE_ENV === 'production';
  const customDbUrl = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1')
    ? process.env.DATABASE_URL
    : null;

  const requiresSsl = Boolean(
    isProd ||
    (customDbUrl && (customDbUrl.includes('sslmode=require') || customDbUrl.includes('.neon.tech') || customDbUrl.includes('supabase') || customDbUrl.includes('render.com')))
  );

  const pgPoolConfig: pg.PoolConfig = customDbUrl
    ? {
        connectionString: customDbUrl,
        connectionTimeoutMillis: 3500,
        max: 10,
        ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
      }
    : {
        host: env.DB_HOST,
        port: env.DB_PORT,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_NAME,
        connectionTimeoutMillis: 1500,
        max: 10,
        ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
      };

  const realPool = new PgPool(pgPoolConfig);

  try {
    const client = await realPool.connect();
    await client.query('SELECT 1');

    // Auto-migrate schema on first PostgreSQL run if users table does not exist
    try {
      const tableCheck = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_name = 'users' LIMIT 1;`
      );
      if (tableCheck.rowCount === 0) {
        console.log('[DB] PostgreSQL tables missing — running initial schema migration...');
        const schemaSql = getSchemaSql();
        await client.query(schemaSql);
        console.log('[DB] PostgreSQL schema initialized successfully.');

        // Seed reference data (hospitals, procedures, companies)
        const { seedDatabase } = await import('../db/seed.js');
        await seedDatabase();
      }
    } catch (migErr: any) {
      console.warn('[DB] PostgreSQL schema verification check notice:', migErr?.message || migErr);
    }

    client.release();
    console.log(`[DB] Connected to PostgreSQL (${customDbUrl ? 'DATABASE_URL' : `${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`})`);
    activePool = realPool;
    isInMemory = false;
    isSQLite = false;
    return activePool;
  } catch (pgErr: any) {
    // If external PostgreSQL is not available, proceed to SQLite fallback
    if (isProd && customDbUrl) {
      console.warn('[DB] PostgreSQL connection failed in production:', pgErr?.message || pgErr);
    }
  }

  // ─── Tier 2: SQLite file-backed persistence ────────────────
  try {
    const { initializeSQLite, createSQLitePool, hasExistingData } = await import('./sqlite-adapter.js');
    const dbPath = resolve(__dirname, '../../data/curify.db');
    const database = initializeSQLite(dbPath);
    const sqlitePool = createSQLitePool(database);

    // Wrap the synchronous sqlitePool.query in a Promise-compatible interface
    // so the rest of the codebase (which uses `await pool.query(...)`) works unchanged
    activePool = {
      query: (text: string, params?: any[]) => {
        const result = sqlitePool.query(text, params);
        return Promise.resolve(result);
      },
      end: () => sqlitePool.end(),
      _sqlite: database,
      _hasExistingData: () => hasExistingData(database),
    };

    isInMemory = false;
    isSQLite = true;
    console.log(`[DB] Connected to SQLite at ${dbPath}`);
    return activePool;
  } catch (sqliteErr) {
    console.warn('[DB] SQLite initialization failed, falling back to in-memory:', sqliteErr);
  }

  // ─── Tier 3: pg-mem in-memory (zero persistence) ──────────
  console.log('[DB] Initializing embedded PostgreSQL engine (pg-mem)...');
  
  const db = newDb({
    autoCreateForeignKeyIndices: true,
  });

  // Register extensions and UUID generators
  db.public.registerFunction({
    name: 'gen_random_uuid',
    returns: DataType.uuid,
    implementation: () => randomUUID(),
  });

  db.public.registerFunction({
    name: 'uuid_generate_v4',
    returns: DataType.uuid,
    implementation: () => randomUUID(),
  });

  const pgAdapter = db.adapters.createPg();
  activePool = new pgAdapter.Pool();
  isInMemory = true;
  isSQLite = false;

  // Run schema and seed automatically
  try {
    const schemaSql = getSchemaSql();
    
    // Clean up statements not strictly necessary for pg-mem (like CREATE EXTENSION)
    const cleanedSchema = schemaSql
      .replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";/gi, '')
      .replace(/CREATE EXTENSION IF NOT EXISTS "pgcrypto";/gi, '');
    
    await activePool.query(cleanedSchema);
    console.log('[DB] Embedded PostgreSQL schema loaded.');

    // Run seeding
    const { seedDatabase } = await import('../db/seed.js');
    await seedDatabase();
    console.log('[DB] Embedded PostgreSQL seeded with demo data.');
  } catch (schemaErr) {
    console.error('[DB] Failed to load schema into embedded DB:', schemaErr);
  }

  return activePool;
}

/**
 * Executes a SQL query with parameter binding
 */
export async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  if (!activePool) {
    await initializeDatabase();
  }
  const result = await activePool.query(text, params);
  return {
    rows: result.rows || [],
    rowCount: result.rowCount ?? (result.rows ? result.rows.length : 0),
  };
}

export const pool = {
  query: (text: string, params?: any[]) => query(text, params),
  end: async () => {
    if (activePool && typeof activePool.end === 'function') {
      await activePool.end();
    }
  },
};
