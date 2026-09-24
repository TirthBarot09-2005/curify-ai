/**
 * SQLite Adapter for Curify AI Backend
 * 
 * Provides a PostgreSQL-compatible query interface backed by better-sqlite3.
 * Translates PG-style `$1, $2` params to SQLite `?, ?` placeholders and
 * handles common PostgreSQL → SQLite syntax differences.
 */
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { getSchemaSql } from '../utils/paths.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface SQLiteQueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

let db: Database.Database | null = null;

/**
 * Translate PostgreSQL SQL to SQLite-compatible SQL AND reorder params.
 *
 * PostgreSQL uses $1, $2, $3 where the number maps to the index in the params
 * array (1-indexed). A param can be reused ($1 appearing multiple times) and
 * can appear out of order ($2 before $1).
 *
 * SQLite uses ? where each ? maps sequentially to the next param in the array.
 *
 * This function extracts each $N, builds a reordered params array, and replaces
 * $N with ? so the two systems are compatible.
 */
function translateSQL(sql: string, params?: any[]): { sql: string; params: any[] } {
  let s = sql;

  // First, strip ::jsonb casts (before touching $N placeholders)
  // Handle $N::jsonb → $N (preserve the placeholder, remove the cast)
  s = s.replace(/(\$\d+)::jsonb/g, '$1');
  // Handle bare ::jsonb casts on values
  s = s.replace(/::jsonb/g, '');

  // Extract all $N references in order of appearance, build reordered params
  const reorderedParams: any[] = [];
  s = s.replace(/\$(\d+)/g, (_match, numStr) => {
    const idx = parseInt(numStr, 10) - 1; // Convert 1-indexed to 0-indexed
    if (params && idx >= 0 && idx < params.length) {
      reorderedParams.push(params[idx]);
    } else {
      reorderedParams.push(null);
    }
    return '?';
  });

  // Replace TIMESTAMPTZ → TEXT
  s = s.replace(/\bTIMESTAMPTZ\b/gi, 'TEXT');

  // Replace DOUBLE PRECISION → REAL
  s = s.replace(/\bDOUBLE PRECISION\b/gi, 'REAL');

  // Replace JSONB → TEXT
  s = s.replace(/\bJSONB\b/gi, 'TEXT');

  // Replace UUID type → TEXT
  s = s.replace(/\bUUID\b/gi, 'TEXT');

  // Replace VARCHAR(N) → TEXT
  s = s.replace(/\bVARCHAR\s*\(\s*\d+\s*\)/gi, 'TEXT');

  // Translate DEFAULT gen_random_uuid() → DEFAULT (gen_random_uuid())
  // SQLite requires DEFAULT expressions to be wrapped in parentheses
  s = s.replace(/DEFAULT\s+gen_random_uuid\(\)/gi, 'DEFAULT (gen_random_uuid())');

  // Replace BOOLEAN → INTEGER
  s = s.replace(/\bBOOLEAN\b/gi, 'INTEGER');
  s = s.replace(/\bDEFAULT\s+TRUE\b/gi, 'DEFAULT 1');
  s = s.replace(/\bDEFAULT\s+FALSE\b/gi, 'DEFAULT 0');

  // Remove CREATE EXTENSION statements
  s = s.replace(/CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+[^;]+;/gi, '');

  // Replace ADD COLUMN IF NOT EXISTS → ADD COLUMN
  s = s.replace(/ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS/gi, 'ADD COLUMN');

  // Replace DEFAULT '[]'::jsonb → DEFAULT '[]'
  s = s.replace(/DEFAULT\s+'(\[.*?\])'::jsonb/gi, "DEFAULT '$1'");
  s = s.replace(/DEFAULT\s+'(\{.*?\})'::jsonb/gi, "DEFAULT '$1'");

  // Replace SERIAL → INTEGER
  s = s.replace(/\bSERIAL\b/gi, 'INTEGER');

  return { sql: s, params: reorderedParams };
}

/**
 * Translate SQL for schema loading (no params, just DDL translation)
 */
function translateDDL(sql: string): string {
  return translateSQL(sql).sql;
}

/**
 * Split a SQL file into individual statements, handling multi-line statements correctly.
 */
function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];

    if (inString) {
      current += ch;
      if (ch === stringChar && sql[i + 1] !== stringChar) {
        inString = false;
      } else if (ch === stringChar && sql[i + 1] === stringChar) {
        current += sql[i + 1];
        i++;
      }
    } else if (ch === "'" || ch === '"') {
      inString = true;
      stringChar = ch;
      current += ch;
    } else if (ch === '-' && sql[i + 1] === '-') {
      // Skip line comments
      while (i < sql.length && sql[i] !== '\n') i++;
    } else if (ch === ';') {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = '';
    } else {
      current += ch;
    }
  }

  const trimmed = current.trim();
  if (trimmed) statements.push(trimmed);

  return statements;
}

/**
 * Initialize SQLite database with schema
 */
export function initializeSQLite(dbPath: string): Database.Database {
  // Ensure data directory exists
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const isNew = !existsSync(dbPath);
  
  db = new Database(dbPath);

  // Register gen_random_uuid() so DEFAULT gen_random_uuid() works in schema
  db.function('gen_random_uuid', () => randomUUID());
  
  // Enable WAL mode for better concurrent performance
  db.pragma('journal_mode = WAL');
  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  if (isNew) {
    console.log('[SQLite] Creating new database file...');
    loadSchema(db);
  } else {
    console.log('[SQLite] Opened existing database file.');
    // Run ALTER TABLE statements to ensure schema is up to date
    runMigrations(db);
  }

  return db;
}

function loadSchema(database: Database.Database) {
  const schemaSql = getSchemaSql();
  
  const translated = translateDDL(schemaSql);
  const statements = splitStatements(translated);

  for (const stmt of statements) {
    const trimmed = stmt.trim();
    if (!trimmed) continue;

    try {
      database.exec(trimmed);
    } catch (err: any) {
      // Tolerate "already exists" and "duplicate column" errors
      if (
        err.message?.includes('already exists') ||
        err.message?.includes('duplicate column')
      ) {
        continue;
      }
      console.warn(`[SQLite] Schema statement warning: ${err.message}`);
    }
  }

  console.log('[SQLite] Schema loaded successfully.');
}

function runMigrations(database: Database.Database) {
  const schemaSql = getSchemaSql();
  
  const lines = schemaSql.split('\n');
  const migrationStatements: string[] = [];
  let current = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--') || !trimmed) continue;
    
    current += ' ' + trimmed;
    if (trimmed.endsWith(';')) {
      const stmt = current.trim();
      if (
        stmt.toUpperCase().startsWith('ALTER TABLE') ||
        stmt.toUpperCase().startsWith('CREATE TABLE IF NOT EXISTS') ||
        stmt.toUpperCase().startsWith('CREATE INDEX IF NOT EXISTS')
      ) {
        migrationStatements.push(stmt);
      }
      current = '';
    }
  }

  for (const stmt of migrationStatements) {
    try {
      const translated = translateDDL(stmt);
      database.exec(translated);
    } catch (err: any) {
      if (
        err.message?.includes('already exists') ||
        err.message?.includes('duplicate column')
      ) {
        continue;
      }
    }
  }
}

/**
 * Check if the database already has data
 */
export function hasExistingData(database: Database.Database): boolean {
  try {
    const result = database.prepare('SELECT COUNT(*) as count FROM users').get() as any;
    return result?.count > 0;
  } catch {
    return false;
  }
}

/**
 * Create a pool-like object compatible with the existing codebase
 */
export function createSQLitePool(database: Database.Database) {
  return {
    query: (text: string, params?: any[]) => sqliteQuery(database, text, params),
    end: async () => {
      if (database) {
        database.close();
      }
    },
  };
}

/**
 * Execute a SQL query against the SQLite database.
 * Returns results in a PostgreSQL-compatible format.
 */
function sqliteQuery<T = any>(database: Database.Database, text: string, params?: any[]): SQLiteQueryResult<T> {
  const translated = translateSQL(text, params);
  const trimmed = translated.sql.trim();

  // Normalize params: replace undefined/null-like values
  const safeParams = translated.params.map(p => {
    if (p === undefined) return null;
    if (typeof p === 'boolean') return p ? 1 : 0;
    return p;
  });

  // Determine if this is a SELECT/RETURNING (read) or INSERT/UPDATE/DELETE (write)
  const isRead = /^\s*(SELECT|WITH)\b/i.test(trimmed);
  const hasReturning = /\bRETURNING\b/i.test(trimmed);

  try {
    if (isRead || hasReturning) {
      const stmt = database.prepare(trimmed);
      const rows = stmt.all(...safeParams) as T[];
      return { rows, rowCount: rows.length };
    }

    // Write query without RETURNING
    const stmt = database.prepare(trimmed);
    const result = stmt.run(...safeParams);
    return { rows: [] as T[], rowCount: result.changes };
  } catch (err: any) {
    // Handle "duplicate column" errors from ALTER TABLE gracefully
    if (err.message?.includes('duplicate column') || err.message?.includes('already exists')) {
      return { rows: [] as T[], rowCount: 0 };
    }
    throw err;
  }
}
