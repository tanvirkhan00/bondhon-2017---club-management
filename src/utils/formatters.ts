/**
 * Formatting helpers for Bondhon 2017 Club Management
 * Enforces BDT (৳) currency and clean date/status labels
 */

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const SHORT_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export function formatBDT(amount: number | string | null | undefined): string {
  const num = typeof amount === 'number' ? amount : Number(amount) || 0;
  return `৳${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function getMonthName(monthNumber: number): string {
  if (monthNumber >= 1 && monthNumber <= 12) {
    return MONTH_NAMES[monthNumber - 1];
  }
  return `Month ${monthNumber}`;
}

export function getShortMonthName(monthNumber: number): string {
  if (monthNumber >= 1 && monthNumber <= 12) {
    return SHORT_MONTH_NAMES[monthNumber - 1];
  }
  return `M${monthNumber}`;
}

export function formatMonthYear(month: number, year: number): string {
  return `${getMonthName(month)} ${year}`;
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}
