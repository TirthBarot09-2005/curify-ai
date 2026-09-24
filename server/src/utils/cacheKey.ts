import crypto from 'crypto';

export function normalizeQuery(q: string): string {
  if (!q) return '';
  return q
    .toLowerCase()
    .replace(/[^\w\s\u20B9\d]/gi, '') // strip punctuation except ₹ (\u20B9) and digits
    .replace(/\s+/g, ' ')
    .trim();
}

export function ageBucket(age?: number): string {
  if (age === undefined || age === null) return 'unknown';
  if (age < 18) return '<18';
  if (age >= 18 && age <= 30) return '18-30';
  if (age >= 31 && age <= 45) return '31-45';
  if (age >= 46 && age <= 60) return '46-60';
  return '60+';
}

export function buildClinicalCacheKey(input: {
  query: string;
  age?: number;
  gender?: string;
  comorbidities?: string[];
}): string {
  const normQ = normalizeQuery(input.query);
  const ab = ageBucket(input.age);
  const gen = (input.gender || 'unknown').toLowerCase();
  const comorb = (input.comorbidities || []).sort().join(',').toLowerCase();

  const raw = `${normQ}|${ab}|${gen}|${comorb}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}
