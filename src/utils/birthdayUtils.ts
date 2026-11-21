import { Member, AuthenticatedMemberDirectoryItem, BirthdayHighlight } from '../types';

export interface DhakaDateParts {
  year: number;
  month: number; // 1 - 12
  day: number; // 1 - 31
  isoDate: string; // YYYY-MM-DD
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Extract today's calendar year/month/day strictly in Bangladesh Standard Time (Asia/Dhaka).
 */
export function getDhakaTodayParts(refDate: Date = new Date()): DhakaDateParts {
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(refDate);

  const [yStr, mStr, dStr] = formatted.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);
  return {
    year,
    month,
    day,
    isoDate: `${yStr}-${mStr}-${dStr}`,
  };
}

/**
 * Parse YYYY-MM-DD safely into month (1-12) and day (1-31) without returning or using birth year.
 */
export function extractMonthDayFromDob(dob?: string | null): { month: number; day: number } | null {
  if (!dob || typeof dob !== 'string') return null;
  const match = dob.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { month, day };
}

/**
 * Format birthday strictly as Month & Day (NEVER exposes birth year).
 */
export function formatBirthdayMonthDay(month: number, day: number, full = false): string {
  const mList = full ? FULL_MONTHS : MONTH_ABBR;
  const mLabel = mList[Math.max(0, Math.min(11, month - 1))] || '';
  return `${mLabel} ${String(day).padStart(2, '0')}`;
}

/**
 * Resolve birthday date in a given target calendar year cleanly handling Feb 29 -> Mar 01 in non-leap years.
 * Uses UTC noon timestamps for exact integer day delta calculations free from DST shifts.
 */
function resolveBirthdayUtcMs(birthMonth: number, birthDay: number, year: number): number {
  if (birthMonth === 2 && birthDay === 29 && !isLeapYear(year)) {
    return Date.UTC(year, 2, 1); // March 1 in non-leap year
  }
  return Date.UTC(year, birthMonth - 1, birthDay);
}

/**
 * Calculate days until next birthday from Asia/Dhaka today (`0` = today, `1` = tomorrow, `2` = day after, etc.)
 * Handles Dec -> Jan year rollover and Feb 29 cleanly.
 */
export function computeDaysUntilBirthday(
  birthMonth: number,
  birthDay: number,
  refDate: Date = new Date()
): { daysUntil: number; targetYear: number } {
  const today = getDhakaTodayParts(refDate);
  const todayUtcMs = Date.UTC(today.year, today.month - 1, today.day);

  const thisYearMs = resolveBirthdayUtcMs(birthMonth, birthDay, today.year);
  if (thisYearMs >= todayUtcMs) {
    return {
      daysUntil: Math.round((thisYearMs - todayUtcMs) / 86400000),
      targetYear: today.year,
    };
  }

  const nextYear = today.year + 1;
  const nextYearMs = resolveBirthdayUtcMs(birthMonth, birthDay, nextYear);
  return {
    daysUntil: Math.round((nextYearMs - todayUtcMs) / 86400000),
    targetYear: nextYear,
  };
}

export interface BirthdayCandidateSource {
  id: string;
  member_code: string;
  full_name: string;
  profile_image_url?: string | null;
  designation?: string | null;
  status?: string;
  date_of_birth?: string | null;
  birth_month?: number | null;
  birth_day?: number | null;
}

/**
 * Build upcoming birthday highlights within [0 .. windowDays] in Asia/Dhaka timezone.
 * Strictly strips out any birth year or full date_of_birth.
 */
export function getUpcomingBirthdayHighlightsFromList(
  list: Array<Member | AuthenticatedMemberDirectoryItem | BirthdayCandidateSource>,
  windowDays = 2,
  refDate: Date = new Date()
): BirthdayHighlight[] {
  const results: BirthdayHighlight[] = [];

  list.forEach((item) => {
    if (item.status && item.status !== 'active') return;

    let month: number | null = null;
    let day: number | null = null;

    if ('birth_month' in item && 'birth_day' in item && item.birth_month && item.birth_day) {
      month = Number(item.birth_month);
      day = Number(item.birth_day);
    } else if ('date_of_birth' in item && item.date_of_birth) {
      const parsed = extractMonthDayFromDob(item.date_of_birth);
      if (parsed) {
        month = parsed.month;
        day = parsed.day;
      }
    }

    if (!month || !day) return;

    const { daysUntil, targetYear } = computeDaysUntilBirthday(month, day, refDate);
    if (daysUntil >= 0 && daysUntil <= windowDays) {
      results.push({
        id: item.id,
        member_code: item.member_code,
        full_name: item.full_name,
        profile_image_url: item.profile_image_url || null,
        designation: item.designation || 'Member',
        birth_month: month,
        birth_day: day,
        days_until: daysUntil,
        target_year: targetYear,
      });
    }
  });

  return results.sort(
    (a, b) => a.days_until - b.days_until || a.member_code.localeCompare(b.member_code)
  );
}
