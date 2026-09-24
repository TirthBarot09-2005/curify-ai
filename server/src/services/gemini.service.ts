import { env } from '../config/env.js';

export class GeminiRateLimitError extends Error {
  constructor(message: string = 'Gemini rate limit exceeded') {
    super(message);
    this.name = 'GeminiRateLimitError';
  }
}

export class GeminiTimeoutError extends Error {
  constructor(message: string = 'Gemini API request timed out') {
    super(message);
    this.name = 'GeminiTimeoutError';
  }
}

export class GeminiInvalidResponseError extends Error {
  constructor(message: string = 'Invalid or unparseable response from Gemini') {
    super(message);
    this.name = 'GeminiInvalidResponseError';
  }
}

export class GeminiNotConfiguredError extends Error {
  constructor(message: string = 'GEMINI_API_KEY is not configured') {
    super(message);
    this.name = 'GeminiNotConfiguredError';
  }
}

const stats = {
  totalCalls: 0,
  successes: 0,
  failures: 0,
  timeouts: 0,
  rateLimits: 0,
  cacheHits: 0,
};

export function getAIStats() {
  return { ...stats };
}

export function recordCacheHit() {
  stats.cacheHits++;
}

export async function callGemini(
  prompt: string,
  options?: { timeoutMs?: number; temperature?: number; jsonMode?: boolean }
): Promise<string> {
  if (!env.GEMINI_API_KEYS || env.GEMINI_API_KEYS.length === 0) {
    throw new GeminiNotConfiguredError();
  }

  // Select a random API key for rotation
  const apiKey = env.GEMINI_API_KEYS[Math.floor(Math.random() * env.GEMINI_API_KEYS.length)];

  stats.totalCalls++;
  const timeoutMs = options?.timeoutMs ?? env.AI_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = Date.now();

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${apiKey}`;
    
    const payload: any = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options?.temperature ?? 0.2,
        maxOutputTokens: 800,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (response.status === 429) {
      stats.rateLimits++;
      stats.failures++;
      console.warn(`[GEMINI] rate limited — falling back`);
      throw new GeminiRateLimitError();
    }

    if (!response.ok) {
      stats.failures++;
      console.warn(`[GEMINI] HTTP error ${response.status} — falling back`);
      throw new Error(`Gemini API HTTP Error: ${response.status}`);
    }

    const data: any = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      stats.failures++;
      console.warn(`[GEMINI] invalid structure — falling back`);
      throw new GeminiInvalidResponseError();
    }

    stats.successes++;
    console.log(`[GEMINI] success (${Date.now() - startTime}ms)`);
    return text;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      stats.timeouts++;
      stats.failures++;
      console.warn(`[GEMINI] timeout after ${timeoutMs}ms — falling back`);
      throw new GeminiTimeoutError();
    }
    // Re-throw known custom errors
    if (
      error instanceof GeminiRateLimitError ||
      error instanceof GeminiInvalidResponseError ||
      error instanceof GeminiNotConfiguredError
    ) {
      throw error;
    }
    
    stats.failures++;
    console.warn(`[GEMINI] unexpected error — falling back`, error.message);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function callGeminiJSON<T>(
  prompt: string,
  options?: { timeoutMs?: number; temperature?: number }
): Promise<T> {
  const text = await callGemini(prompt, { ...options, jsonMode: false });
  console.log('[GEMINI] Raw Response:', text);
  
  let cleanText = text.trim();
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.substring(7);
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.substring(3);
  }
  
  if (cleanText.endsWith('```')) {
    cleanText = cleanText.substring(0, cleanText.length - 3);
  }
  
  cleanText = cleanText.trim();
  
  try {
    return JSON.parse(cleanText) as T;
  } catch (error: any) {
    console.warn(`[GEMINI] JSON parse failed — falling back`);
    throw new GeminiInvalidResponseError('Failed to parse JSON response');
  }
}
