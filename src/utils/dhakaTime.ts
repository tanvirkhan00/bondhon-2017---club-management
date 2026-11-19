export type DhakaPeriodKey = 'morning' | 'afternoon' | 'evening' | 'night';

export interface DhakaGreetingInfo {
  greeting: 'Good Morning' | 'Good Afternoon' | 'Good Evening' | 'Good Night';
  periodKey: DhakaPeriodKey;
  periodLabel: string;
  celestialEmoji: string;
  hours24: number;
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
 * Computes the official Bangladesh Standard Time (Asia/Dhaka, UTC+6) greeting:
 * - 5:00 AM – 11:59 AM: Good Morning
 * - 12:00 PM – 4:59 PM: Good Afternoon
 * - 5:00 PM – 8:59 PM: Good Evening
 * - 9:00 PM – 4:59 AM: Good Night
 */
export function getDhakaGreeting(now: Date = new Date()): DhakaGreetingInfo {
  const hour24Parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka',
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
    };
  }

  if (hours24 >= 12 && hours24 < 17) {
    return {
      greeting: 'Good Afternoon',
      periodKey: 'afternoon',
      periodLabel: 'Afternoon',
      celestialEmoji: '🌤️',
      hours24,
    };
  }

  if (hours24 >= 17 && hours24 < 21) {
    return {
      greeting: 'Good Evening',
      periodKey: 'evening',
      periodLabel: hours24 < 19 ? 'Golden Hour' : 'Evening',
      celestialEmoji: '🌇',
      hours24,
    };
  }

  return {
    greeting: 'Good Night',
    periodKey: 'night',
    periodLabel: 'Night',
    celestialEmoji: '🌙',
    hours24,
  };
}

export function getDhakaClockParts(now: Date = new Date()): DhakaClockParts {
  const timeParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).formatToParts(now);

  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).formatToParts(now);

  const greetingInfo = getDhakaGreeting(now);

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
