import React, { memo, useEffect, useMemo, useState } from 'react';

interface ClockParts {
  hours12: string;
  hours24Str: string;
  minutes: string;
  seconds: string;
  dayPeriod: string;
  hours24: number;
  minutesNum: number;
  secondsNum: number;
  dateLabel: string;
  celestialEmoji: string;
  periodLabel: string;
  auraClass: string;
}

const CLOCK_FORMAT_KEY = 'bondhon_clock_24h';

const getDhakaClockParts = (now: Date): ClockParts => {
  const timeParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).formatToParts(now);

  const hour24Parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).formatToParts(now);

  const pick = (parts: Intl.DateTimeFormatPart[], type: string) =>
    parts.find((p) => p.type === type)?.value || '';

  const hours12 = pick(timeParts, 'hour').padStart(2, '0');
  const minutes = pick(timeParts, 'minute').padStart(2, '0');
  const seconds = pick(timeParts, 'second').padStart(2, '0');
  const dayPeriod = pick(timeParts, 'dayPeriod').toUpperCase() || 'AM';

  const h24Raw = Number(pick(hour24Parts, 'hour') || '0');
  const hours24 = h24Raw === 24 ? 0 : h24Raw;
  const hours24Str = String(hours24).padStart(2, '0');
  const minutesNum = Number(minutes);
  const secondsNum = Number(seconds);

  const weekday = pick(dateParts, 'weekday');
  const day = pick(dateParts, 'day');
  const month = pick(dateParts, 'month');
  const year = pick(dateParts, 'year');

  let celestialEmoji = '🌙';
  let periodLabel = 'Night';
  let auraClass =
    'bg-[#0F1B33] text-[#F0C56E] border-[#233452]';

  if (hours24 >= 5 && hours24 < 7) {
    celestialEmoji = '🌅';
    periodLabel = 'Dawn';
    auraClass =
      'bg-[#D6AC62]/15 text-[#92600A] dark:bg-[#D6AC62]/15 dark:text-[#F0C56E] border-[#D6AC62]/40';
  } else if (hours24 >= 7 && hours24 < 12) {
    celestialEmoji = '☀️';
    periodLabel = 'Morning';
    auraClass =
      'bg-[#D6AC62]/18 text-[#92600A] dark:bg-[#D6AC62]/15 dark:text-[#F0C56E] border-[#D6AC62]/40';
  } else if (hours24 >= 12 && hours24 < 17) {
    celestialEmoji = '🌤️';
    periodLabel = 'Afternoon';
    auraClass =
      'bg-[#0369A1]/10 text-[#0369A1] dark:bg-[#38BDF8]/15 dark:text-[#38BDF8] border-[#0369A1]/25 dark:border-[#38BDF8]/30';
  } else if (hours24 >= 17 && hours24 < 19) {
    celestialEmoji = '🌇';
    periodLabel = 'Evening';
    auraClass =
      'bg-[#D6AC62]/15 text-[#92600A] dark:bg-[#D6AC62]/15 dark:text-[#F0C56E] border-[#D6AC62]/40';
  } else if (hours24 >= 19 && hours24 < 21) {
    celestialEmoji = '🌆';
    periodLabel = 'Dusk';
    auraClass =
      'bg-[#1D4ED8]/10 text-[#1D4ED8] dark:bg-[#60A5FA]/15 dark:text-[#60A5FA] border-[#1D4ED8]/25 dark:border-[#60A5FA]/30';
  }

  return {
    hours12,
    hours24Str,
    minutes,
    seconds,
    dayPeriod,
    hours24,
    minutesNum,
    secondsNum,
    dateLabel: `${weekday}, ${day} ${month} ${year}`,
    celestialEmoji,
    periodLabel,
    auraClass,
  };
};

export const DashboardClock: React.FC = memo(() => {
  const [now, setNow] = useState<Date>(() => new Date());
  const [is24Hour, setIs24Hour] = useState<boolean>(() => {
    try {
      return localStorage.getItem(CLOCK_FORMAT_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let intervalId: number | undefined;
    const msToNextSecond = 1000 - (Date.now() % 1000);

    const timeoutId = window.setTimeout(() => {
      setNow(new Date());
      intervalId = window.setInterval(() => {
        setNow(new Date());
      }, 1000);
    }, msToNextSecond);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, []);

  const toggleFormat = () => {
    setIs24Hour((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(CLOCK_FORMAT_KEY, String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const parts = useMemo(() => getDhakaClockParts(now), [now]);

  // SVG Radial Second Sweep Ring (r = 21)
  const radius = 21;
  const circumference = 2 * Math.PI * radius;
  const secProgress = parts.secondsNum / 60;
  const dashOffset = circumference * (1 - secProgress);
  const orbAngleRad = ((parts.secondsNum * 6 - 90) * Math.PI) / 180;
  const orbX = 26 + radius * Math.cos(orbAngleRad);
  const orbY = 26 + radius * Math.sin(orbAngleRad);

  const displayHours = is24Hour ? parts.hours24Str : parts.hours12;

  return (
    <div
      className="surface-card rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center gap-3.5 shrink-0 w-full md:w-auto"
      aria-label={`Dhaka live clock: ${displayHours}:${parts.minutes}:${parts.seconds}${is24Hour ? '' : ` ${parts.dayPeriod}`}, ${parts.dateLabel}`}
    >
      {/* Celestial Emoji Chronometer Dial with Orbiting Second Sweep */}
      <div className="relative w-13 h-13 shrink-0 flex items-center justify-center">
        <svg className="w-13 h-13 -rotate-90" viewBox="0 0 52 52" aria-hidden="true">
          {/* Subtle Ring Track */}
          <circle
            cx="26"
            cy="26"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="text-[#DFE6F0] dark:text-[#233452]"
          />
          {/* 60-Second Sapphire Progress Sweep */}
          <circle
            cx="26"
            cy="26"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="text-[#1D4ED8] dark:text-[#38BDF8] transition-[stroke-dashoffset] duration-300 ease-out"
          />
        </svg>

        {/* Orbiting Burnished Brass Second Bead */}
        <svg
          className="absolute inset-0 w-13 h-13 pointer-events-none"
          viewBox="0 0 52 52"
          aria-hidden="true"
        >
          <circle cx={orbX} cy={orbY} r="2.6" fill="#D6AC62" />
        </svg>

        {/* Centered Atmospheric Emoji Disc */}
        <div
          className={`w-8.5 h-8.5 rounded-full border flex items-center justify-center text-base leading-none select-none shadow-2xs ${parts.auraClass}`}
          title={`Dhaka Time · ${parts.periodLabel}`}
        >
          <span role="img" aria-label={parts.periodLabel}>
            {parts.celestialEmoji}
          </span>
        </div>
      </div>

      {/* Executive Split-Flip Digital Readout */}
      <div className="min-w-0 flex-1 md:flex-initial">
        <div className="flex items-center justify-between gap-2.5">
          <div className="inline-flex items-center gap-1">
            {/* Hours Flip Tile */}
            <span className="relative inline-flex items-center justify-center min-w-[2.05rem] px-1.5 py-0.5 rounded-lg bg-[#EFF3F9] dark:bg-[#0D1726] border border-[#DFE6F0] dark:border-[#233452] font-mono tabular-nums text-base sm:text-lg font-extrabold text-[#0F1B2E] dark:text-[#F3F6FC] leading-tight overflow-hidden">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-[#DFE6F0]/80 dark:bg-[#233452]/90"
              />
              <span className="relative">{displayHours}</span>
            </span>

            <span
              aria-hidden="true"
              className={`font-mono font-bold text-[#1D4ED8] dark:text-[#60A5FA] text-sm transition-opacity duration-200 ${
                parts.secondsNum % 2 === 0 ? 'opacity-100' : 'opacity-45'
              }`}
            >
              :
            </span>

            {/* Minutes Flip Tile */}
            <span className="relative inline-flex items-center justify-center min-w-[2.05rem] px-1.5 py-0.5 rounded-lg bg-[#EFF3F9] dark:bg-[#0D1726] border border-[#DFE6F0] dark:border-[#233452] font-mono tabular-nums text-base sm:text-lg font-extrabold text-[#0F1B2E] dark:text-[#F3F6FC] leading-tight overflow-hidden">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-[#DFE6F0]/80 dark:bg-[#233452]/90"
              />
              <span className="relative">{parts.minutes}</span>
            </span>

            {/* Seconds Accent Chip */}
            <span className="inline-flex items-center justify-center min-w-[1.85rem] px-1.5 py-0.5 rounded-lg bg-[#1D4ED8]/10 dark:bg-[#60A5FA]/15 border border-[#1D4ED8]/20 dark:border-[#60A5FA]/30 font-mono tabular-nums text-xs sm:text-sm font-bold text-[#1D4ED8] dark:text-[#60A5FA] leading-tight ml-0.5">
              {parts.seconds}
            </span>

            {!is24Hour && (
              <span className="font-mono text-[10px] font-extrabold text-[#92600A] dark:text-[#F0C56E] tracking-wider ml-1">
                {parts.dayPeriod}
              </span>
            )}
          </div>

          {/* Interactive 12H / 24H Mode Switch */}
          <button
            type="button"
            onClick={toggleFormat}
            title={is24Hour ? 'Switch to 12-hour format' : 'Switch to 24-hour format'}
            className="px-2 py-1 rounded-md text-[10px] font-mono font-bold bg-[#EFF3F9] dark:bg-[#17243C] text-[#4E5E78] dark:text-[#9BB0CD] hover:text-[#1D4ED8] dark:hover:text-[#60A5FA] border border-[#DFE6F0] dark:border-[#233452] transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          >
            {is24Hour ? '24H' : '12H'}
          </button>
        </div>

        {/* Clean Unboxed Date & Timezone Line */}
        <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-[#4E5E78] dark:text-[#9BB0CD] whitespace-nowrap">
          <span role="img" aria-hidden="true" className="text-[11px] leading-none">
            📅
          </span>
          <span className="font-semibold text-[#0F1B2E] dark:text-slate-200">{parts.dateLabel}</span>
          <span aria-hidden="true" className="text-[#DFE6F0] dark:text-[#233452]">
            ·
          </span>
          <span className="font-mono text-[10px] font-semibold text-[#0369A1] dark:text-[#38BDF8]">
            Dhaka · {parts.periodLabel}
          </span>
        </div>
      </div>
    </div>
  );
});

DashboardClock.displayName = 'DashboardClock';
