import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Robust schema.sql locator that works across:
 * - tsx / dev server (from src/db/schema.sql)
 * - compiled production (dist/db/schema.sql or src/db/schema.sql)
 * - running from root vs running from server/ directory
 */
export function getSchemaSql(): string {
  const candidates = [
    resolve(__dirname, '../db/schema.sql'),
    resolve(__dirname, '../../src/db/schema.sql'),
    resolve(__dirname, '../../../src/db/schema.sql'),
    resolve(process.cwd(), 'src/db/schema.sql'),
    resolve(process.cwd(), 'server/src/db/schema.sql'),
    resolve(process.cwd(), '../server/src/db/schema.sql'),
    resolve(process.cwd(), 'dist/db/schema.sql'),
    resolve(process.cwd(), 'server/dist/db/schema.sql'),
  ];

  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        return readFileSync(p, 'utf-8');
      } catch {
        // try next candidate
      }
    }
  }

  throw new Error(`[Schema] Could not locate schema.sql in any of: ${candidates.join(', ')}`);
}

/**
 * Robust data file locator for reference SQL and CSV seed files
 */
export function getDataFilePath(relativePath: string): string {
  const candidates = [
    resolve(process.cwd(), '../data', relativePath),
    resolve(process.cwd(), 'data', relativePath),
    resolve(__dirname, '../../../data', relativePath),
    resolve(__dirname, '../../data', relativePath),
    resolve(__dirname, '../../../../data', relativePath),
  ];

  for (const p of candidates) {
    if (existsSync(p)) {
      return p;
    }
  }

  // Fallback to primary expected path
  return resolve(process.cwd(), '../data', relativePath);
}
