/** Format a number as INR currency (Indian notation: ₹1,25,000) */
export function formatINR(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN');
}

/** Format a number as INR in lakhs shorthand (₹1.25L) */
export function formatINRLakhs(amount: number): string {
  if (amount >= 100000) {
    return '₹' + (amount / 100000).toFixed(2) + 'L';
  }
  return formatINR(amount);
}

/** Format a cost range */
export function formatCostRange(min: number, max: number): string {
  return `${formatINR(min)} – ${formatINR(max)}`;
}

/** Format confidence as percentage */
export function formatConfidence(score: number): string {
  return Math.round(score * 100) + '%';
}

/** Get confidence level label */
export function getConfidenceLevel(score: number): 'High' | 'Moderate' | 'Low' {
  if (score >= 0.75) return 'High';
  if (score >= 0.50) return 'Moderate';
  return 'Low';
}

/** Get confidence color class */
export function getConfidenceColor(score: number): string {
  if (score >= 0.75) return 'text-emerald-600';
  if (score >= 0.50) return 'text-amber-500';
  return 'text-red-600';
}

/** Get confidence bg color class */
export function getConfidenceBg(score: number): string {
  if (score >= 0.75) return 'bg-emerald-50';
  if (score >= 0.50) return 'bg-amber-50';
  return 'bg-red-50';
}

/** Get status badge color classes */
export function getStatusColors(status: string): { bg: string; text: string; dot: string } {
  switch (status) {
    case 'Approved':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' };
    case 'Rejected':
      return { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' };
    case 'Needs Review':
      return { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' };
    default:
      return { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' };
  }
}

/** Generate a mock case ID */
export function generateCaseId(): string {
  const num = Math.floor(Math.random() * 900000) + 100000;
  return `CUR-2026-${String(num).slice(0, 6)}`;
}

/** Simulate a delay */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Format date string */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Format date and time string: e.g. "22 Aug 2026 · 11:12 AM" */
export function formatDateTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const datePart = d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timePart = d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).toUpperCase();
    return `${datePart} · ${timePart}`;
  } catch {
    return dateStr;
  }
}

/** Get greeting based on time of day */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
