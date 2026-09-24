import { ensureDatabaseExists } from './create-database.js';
import { runMigrations } from './migrate.js';
import { seedDatabase } from './seed.js';
import { pool } from '../config/database.js';

async function reset() {
  console.log('[DB] Resetting database...');
  try {
    await ensureDatabaseExists();
    await runMigrations();
    await seedDatabase();
    console.log('[DB] Database reset and ready!');
  } catch (err) {
    console.error('[DB] Reset failed:', err);
  } finally {
    await pool.end();
  }
}

reset();
