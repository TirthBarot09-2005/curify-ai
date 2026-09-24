import pg from 'pg';
import { env } from '../config/env.js';

const { Client } = pg;

export async function ensureDatabaseExists() {
  const client = new Client({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: 'postgres', // Connect to default postgres DB first
  });

  try {
    await client.connect();
    const res = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [env.DB_NAME]
    );

    if (res.rowCount === 0) {
      console.log(`[DB] Database "${env.DB_NAME}" does not exist. Creating...`);
      await client.query(`CREATE DATABASE "${env.DB_NAME}"`);
      console.log(`[DB] Database "${env.DB_NAME}" created successfully.`);
    } else {
      console.log(`[DB] Database "${env.DB_NAME}" already exists.`);
    }
  } catch (err) {
    console.error('[DB] Could not ensure database exists:', err);
    throw err;
  } finally {
    await client.end();
  }
}

if (process.argv[1] && process.argv[1].endsWith('create-database.ts')) {
  ensureDatabaseExists()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
