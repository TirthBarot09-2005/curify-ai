import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env file manually
const envPaths = [
  resolve(__dirname, '../../.env'),
  resolve(__dirname, '../../../.env'),
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../.env'),
];

for (const envPath of envPaths) {
  try {
    const envFile = readFileSync(envPath, 'utf-8');
    for (const line of envFile.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // Ignore missing file
  }
}

// Map VITE_CLERK_PUBLISHABLE_KEY if CLERK_PUBLISHABLE_KEY not explicitly set
if (!process.env.CLERK_PUBLISHABLE_KEY && process.env.VITE_CLERK_PUBLISHABLE_KEY) {
  process.env.CLERK_PUBLISHABLE_KEY = process.env.VITE_CLERK_PUBLISHABLE_KEY;
}

export const env = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/curify',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
  DB_NAME: process.env.DB_NAME || 'curify',

  // Clerk Auth
  CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY || '',
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || '',

  // Legacy fallback
  JWT_SECRET: process.env.JWT_SECRET || 'curify-dev-secret-change-in-production-2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // Server
  PORT: parseInt(process.env.PORT || '5000', 10),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',

  // Email Notifications (Disabled by default)
  EMAIL_NOTIFICATIONS_ENABLED: process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@curify.ai',
  EMAIL_PROVIDER_API_KEY: process.env.EMAIL_PROVIDER_API_KEY || '',
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'console',

  // Gemini AI
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_API_KEYS: (process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean),
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  AI_TIMEOUT_MS: parseInt(process.env.AI_TIMEOUT_MS || '4000', 10),
  AI_CACHE_ENABLED: process.env.AI_CACHE_ENABLED !== 'false',
  AI_DAILY_LIMIT: parseInt(process.env.AI_DAILY_LIMIT || '3', 10),
};
