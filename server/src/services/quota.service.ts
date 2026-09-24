import { query } from '../config/database.js';
import { env } from '../config/env.js';
import { randomUUID } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = resolve(__dirname, '../../data/quota_cache.json');

/**
 * Returns the current date formatted as YYYY-MM-DD in Indian Standard Time (Asia/Kolkata, UTC+5:30).
 * This guarantees the daily quota advances strictly at 12:00:00 AM (midnight IST),
 * preventing early resets before 12:00 AM.
 */
export function getTodayDateString(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Calculates the exact next 12:00:00 AM IST midnight as an ISO string.
 */
export function getNextMidnightIST(): string {
  const istDateStr = getTodayDateString();
  const [year, month, day] = istDateStr.split('-').map(Number);
  // Next day 00:00:00 IST in UTC is: next day 00:00:00 UTC minus 5 hours 30 mins
  const nextMidnightUtcMs = Date.UTC(year, month - 1, day + 1, 0, 0, 0) - (5.5 * 60 * 60 * 1000);
  return new Date(nextMidnightUtcMs).toISOString();
}

interface LocalQuotaStore {
  [userId: string]: {
    date: string;
    count: number;
  };
}

function readLocalCache(): LocalQuotaStore {
  try {
    if (existsSync(CACHE_FILE)) {
      const content = readFileSync(CACHE_FILE, 'utf-8');
      return JSON.parse(content) || {};
    }
  } catch {
    // Ignore read errors
  }
  return {};
}

function writeLocalCache(data: LocalQuotaStore): void {
  try {
    writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // Ignore write errors
  }
}

export async function getQuota(userId: string): Promise<{
  used: number; limit: number; remaining: number; resetAt: string;
}> {
  const today = getTodayDateString();
  const configuredLimit = env.AI_DAILY_LIMIT || 3;
  const cache = readLocalCache();

  const { rows } = await query(
    `SELECT id, prompt_count, daily_limit FROM ai_usage_quotas WHERE user_id = $1 AND usage_date = $2`,
    [userId, today]
  );
  
  let used = 0;

  if (rows.length > 0) {
    used = rows[0].prompt_count;
    // If DB daily_limit does not match current configured limit, update it in DB
    if (rows[0].daily_limit !== configuredLimit) {
      await query(
        `UPDATE ai_usage_quotas SET daily_limit = $1 WHERE id = $2`,
        [configuredLimit, rows[0].id]
      ).catch(() => {});
    }
  } else if (cache[userId] && cache[userId].date === today) {
    // Restore from persistent file cache (prevents wipe on in-memory DB / server restart)
    used = cache[userId].count;
    await query(
      `INSERT INTO ai_usage_quotas (id, user_id, usage_date, prompt_count, daily_limit)
       VALUES ($1, $2, $3, $4, $5)`,
      [randomUUID(), userId, today, used, configuredLimit]
    ).catch(() => {});
  }

  // Update file cache to stay in sync
  cache[userId] = { date: today, count: used };
  writeLocalCache(cache);

  const limit = configuredLimit;
  const remaining = Math.max(0, limit - used);
  const resetAt = getNextMidnightIST();

  return { used, limit, remaining, resetAt };
}

export async function incrementAndCheck(userId: string): Promise<{
  allowed: boolean; used: number; limit: number;
}> {
  const today = getTodayDateString();
  const configuredLimit = env.AI_DAILY_LIMIT || 3;
  const current = await getQuota(userId);

  if (current.used >= configuredLimit) {
    return { allowed: false, used: current.used, limit: configuredLimit };
  }

  // Check existing quota row for today
  const { rows: existingRows } = await query(
    `SELECT id, prompt_count FROM ai_usage_quotas WHERE user_id = $1 AND usage_date = $2`,
    [userId, today]
  );

  let newUsed = 1;

  if (existingRows.length > 0) {
    newUsed = (existingRows[0].prompt_count || 0) + 1;
    await query(
      `UPDATE ai_usage_quotas 
       SET prompt_count = $1, daily_limit = $2
       WHERE user_id = $3 AND usage_date = $4;`,
      [newUsed, configuredLimit, userId, today]
    );
  } else {
    newUsed = 1;
    await query(
      `INSERT INTO ai_usage_quotas (id, user_id, usage_date, prompt_count, daily_limit)
       VALUES ($1, $2, $3, 1, $4);`,
      [randomUUID(), userId, today, configuredLimit]
    );
  }

  // Write to persistent file cache so server restarts don't lose the count
  const cache = readLocalCache();
  cache[userId] = { date: today, count: newUsed };
  writeLocalCache(cache);

  return {
    allowed: true,
    used: newUsed,
    limit: configuredLimit
  };
}
