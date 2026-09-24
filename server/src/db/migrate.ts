import { fileURLToPath } from 'url';
import { query, pool } from '../config/database.js';
import { getSchemaSql } from '../utils/paths.js';

export async function runMigrations() {
  console.log('[DB] Running database migrations...');
  const schemaSql = getSchemaSql();
  await query(schemaSql);
  console.log('[DB] Database schema migrated successfully.');
}

// Allow direct CLI execution: tsx src/db/migrate.ts
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[DB] Migration failed:', err);
      await pool.end();
      process.exit(1);
    });
}
