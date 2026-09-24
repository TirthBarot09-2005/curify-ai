import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, basename } from 'path';
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
  const candidates: string[] = [
    resolve(__dirname, '../db/schema.sql'),
    resolve(__dirname, '../../src/db/schema.sql'),
    resolve(__dirname, '../../../src/db/schema.sql'),
    resolve(process.cwd(), 'dist/db/schema.sql'),
    resolve(process.cwd(), 'server/dist/db/schema.sql'),
    resolve(process.cwd(), 'src/db/schema.sql'),
    resolve(process.cwd(), 'server/src/db/schema.sql'),
    resolve(process.cwd(), '../server/src/db/schema.sql'),
  ];

  // Upward traversal from __dirname and process.cwd()
  const searchRoots = [__dirname, process.cwd()];
  for (const root of searchRoots) {
    let curr = root;
    for (let i = 0; i < 5; i++) {
      candidates.push(
        resolve(curr, 'dist/db/schema.sql'),
        resolve(curr, 'src/db/schema.sql'),
        resolve(curr, 'server/dist/db/schema.sql'),
        resolve(curr, 'server/src/db/schema.sql'),
        resolve(curr, 'schema.sql')
      );
      const parent = dirname(curr);
      if (parent === curr) break;
      curr = parent;
    }
  }

  const uniqueCandidates = Array.from(new Set(candidates));

  for (const p of uniqueCandidates) {
    if (existsSync(p)) {
      try {
        return readFileSync(p, 'utf-8');
      } catch {
        // try next candidate
      }
    }
  }

  throw new Error(`[Schema] Could not locate schema.sql in any of: \n${uniqueCandidates.map((c) => `  - ${c}`).join('\n')}`);
}

/**
 * Robust data file locator for repository-root data files (SQL and CSV seed files)
 *
 * Reliably finds files across:
 * - Local development from CURIFY_TEST/server
 * - Local development from CURIFY_TEST
 * - Compiled production (node dist/server.js)
 * - Railway container deployment where app root is /app and backend is /app/server
 *
 * Strict rule: NEVER returns a non-existent path. Only returns a path if fs.existsSync() is true.
 */
export function getDataFilePath(relativePath: string): string {
  const fileBaseName = basename(relativePath);
  const candidates: string[] = [];

  const addCandidate = (p: string) => {
    if (!candidates.includes(p)) {
      candidates.push(p);
    }
  };

  // 1. Direct relative paths from __dirname (stable across compiled dist and tsx src)
  // __dirname is either <server>/src/utils or <server>/dist/utils (2 levels inside <server>)
  // So resolve(__dirname, '../..') is <server>, resolve(__dirname, '../../..') is <repo-root>
  addCandidate(resolve(__dirname, '../../../data', relativePath));
  addCandidate(resolve(__dirname, '../../../data/datafor curify', fileBaseName));
  addCandidate(resolve(__dirname, '../../data', relativePath));
  addCandidate(resolve(__dirname, '../../data/datafor curify', fileBaseName));
  addCandidate(resolve(__dirname, '../../../../data', relativePath));
  addCandidate(resolve(__dirname, '../../../../data/datafor curify', fileBaseName));

  // 2. Direct relative paths from process.cwd()
  // Avoid cwd + '../data' if cwd is root ('/')
  if (process.cwd() !== resolve('/')) {
    addCandidate(resolve(process.cwd(), '../data', relativePath));
    addCandidate(resolve(process.cwd(), '../data/datafor curify', fileBaseName));
  }
  addCandidate(resolve(process.cwd(), 'data', relativePath));
  addCandidate(resolve(process.cwd(), 'data/datafor curify', fileBaseName));

  // 3. Search upwards from __dirname and process.cwd()
  const searchBases = [__dirname, process.cwd()];
  for (const base of searchBases) {
    let curr = base;
    for (let i = 0; i < 6; i++) {
      addCandidate(resolve(curr, 'data', relativePath));
      addCandidate(resolve(curr, 'data/datafor curify', fileBaseName));
      addCandidate(resolve(curr, fileBaseName));

      const parent = dirname(curr);
      if (parent === curr) break;
      curr = parent;
    }
  }

  // 4. Test candidates in order with fs.existsSync()
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  // 5. If not found, throw a descriptive Error instead of generating an invalid /data/... path
  throw new Error(
    `[Data] Could not locate data file '${relativePath}'.\nSearched ${candidates.length} candidate paths:\n` +
    candidates.map((c) => `  - ${c}`).join('\n')
  );
}
