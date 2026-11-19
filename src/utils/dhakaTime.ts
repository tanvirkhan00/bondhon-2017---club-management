export type DhakaPeriodKey = 'morning' | 'afternoon' | 'evening' | 'night';

export interface DhakaGreetingInfo {
  greeting: 'Good Morning' | 'Good Afternoon' | 'Good Evening' | 'Good Night';
  periodKey: DhakaPeriodKey;
  periodLabel: string;
  celestialEmoji: string;
  hours24: number;
  timeZone: string;
  zoneCity: string;
  shortZone: string;
}

export interface DhakaClockParts extends DhakaGreetingInfo {
  hours12: string;
  hours24Str: string;
  minutes: string;
  seconds: string;
  dayPeriod: string;
  minutesNum: number;
  secondsNum: number;
  clockEmoji: string;
  weekday: string;
  dateLabel: string;
}

const HOUR_CLOCK_EMOJIS = ['🕛', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚'];
const HALF_CLOCK_EMOJIS = ['🕧', '🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣', '🕤', '🕥', '🕦'];

export function getClockFaceEmoji(hours24: number, minutes: number): string {
  const baseIdx = ((hours24 % 12) + 12) % 12;
  if (minutes >= 15 && minutes < 45) {
    return HALF_CLOCK_EMOJIS[baseIdx];
  }
  const idx = minutes >= 45 ? (baseIdx + 1) % 12 : baseIdx;
  return HOUR_CLOCK_EMOJIS[idx];
}

const pickPart = (parts: Intl.DateTimeFormatPart[], type: string): string =>
  parts.find((p) => p.type === type)?.value || '';

/**
 * Safely detects the visitor's local IANA time zone (e.g., "Asia/Dhaka", "Asia/Riyadh", "Europe/London").
 * Falls back to "Asia/Dhaka" if unavailable.
 */
export function getBrowserTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz.includes('/')) {
      return tz;
    }
  } catch {
    // Ignore Intl errors
  }
  return 'Asia/Dhaka';
}

export function extractZoneCity(timeZone: string): string {
  if (!timeZone) return 'Dhaka';
  const lastSegment = timeZone.split('/').pop() || 'Dhaka';
  return lastSegment.replace(/_/g, ' ');
}

export function formatShortZoneName(now: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'short',
    }).formatToParts(now);
    const tzName = pickPart(parts, 'timeZoneName');
    if (tzName) return tzName;
  } catch {
    // Ignore invalid timezone fallback
  }
  return 'Local';
}

function resolveSafeTimeZone(preferredZone?: string): string {
  const candidate = preferredZone || getBrowserTimeZone();
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return getBrowserTimeZone();
  }
}

/**
 * Computes time-of-day greeting according to the active country/local time zone:
 * - 5:00 AM – 11:59 AM: Good Morning
 * - 12:00 PM – 4:59 PM: Good Afternoon
 * - 5:00 PM – 8:59 PM: Good Evening
 * - 9:00 PM – 4:59 AM: Good Night
 */
export function getLocalGreeting(
  now: Date = new Date(),
  preferredTimeZone?: string
): DhakaGreetingInfo {
  const timeZone = resolveSafeTimeZone(preferredTimeZone);
  const zoneCity = extractZoneCity(timeZone);
  const shortZone = formatShortZoneName(now, timeZone);

  const hour24Parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const h24Raw = Number(pickPart(hour24Parts, 'hour') || '0');
  const hours24 = h24Raw === 24 ? 0 : h24Raw;

  if (hours24 >= 5 && hours24 < 12) {
    return {
      greeting: 'Good Morning',
      periodKey: 'morning',
      periodLabel: hours24 < 7 ? 'Dawn' : 'Morning',
      celestialEmoji: hours24 < 7 ? '🌅' : '☀️',
      hours24,
      timeZone,
      zoneCity,
      shortZone,
    };
  }

  if (hours24 >= 12 && hours24 < 17) {
    return {
      greeting: 'Good Afternoon',
      periodKey: 'afternoon',
      periodLabel: 'Afternoon',
      celestialEmoji: '🌤️',
      hours24,
      timeZone,
      zoneCity,
      shortZone,
    };
  }

  if (hours24 >= 17 && hours24 < 21) {
    return {
      greeting: 'Good Evening',
      periodKey: 'evening',
      periodLabel: hours24 < 19 ? 'Golden Hour' : 'Evening',
      celestialEmoji: '🌇',
      hours24,
      timeZone,
      zoneCity,
      shortZone,
    };
  }

  return {
    greeting: 'Good Night',
    periodKey: 'night',
    periodLabel: 'Night',
    celestialEmoji: '🌙',
    hours24,
    timeZone,
    zoneCity,
    shortZone,
  };
}

export function getLocalClockParts(
  now: Date = new Date(),
  preferredTimeZone?: string
): DhakaClockParts {
  const greetingInfo = getLocalGreeting(now, preferredTimeZone);
  const { timeZone } = greetingInfo;

  const timeParts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).formatToParts(now);

  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).formatToParts(now);

  const hours12 = pickPart(timeParts, 'hour').padStart(2, '0');
  const minutes = pickPart(timeParts, 'minute').padStart(2, '0');
  const seconds = pickPart(timeParts, 'second').padStart(2, '0');
  const dayPeriod = pickPart(timeParts, 'dayPeriod').toUpperCase() || 'AM';

  const hours24Str = String(greetingInfo.hours24).padStart(2, '0');
  const minutesNum = Number(minutes);
  const secondsNum = Number(seconds);

  const weekday = pickPart(dateParts, 'weekday');
  const day = pickPart(dateParts, 'day');
  const month = pickPart(dateParts, 'month');
  const year = pickPart(dateParts, 'year');

  return {
    ...greetingInfo,
    hours12,
    hours24Str,
    minutes,
    seconds,
    dayPeriod,
    minutesNum,
    secondsNum,
    clockEmoji: getClockFaceEmoji(greetingInfo.hours24, minutesNum),
    weekday,
    dateLabel: `${weekday}, ${day} ${month} ${year}`,
  };
}

// Backward-compatible aliases that default to visitor's detected local time zone
export const getDhakaGreeting = getLocalGreeting;
export const getDhakaClockParts = getLocalClockParts;
