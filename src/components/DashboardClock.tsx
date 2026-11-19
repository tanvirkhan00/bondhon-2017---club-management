import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { DhakaPeriodKey, getDhakaClockParts } from '../utils/dhakaTime';
import {
  fetchLiveWeatherForecast,
  WeatherForecastPayload,
} from '../services/weather/openMeteo';
import { MapPin, RefreshCw } from 'lucide-react';

const CLOCK_FORMAT_KEY = 'bondhon_clock_24h';

const DIAL_GLOW_MAP: Record<DhakaPeriodKey, string> = {
  morning:
    'from-[#D6AC62]/25 via-[#EFF3F9] to-[#D6AC62]/10 dark:from-[#D6AC62]/20 dark:via-[#17243C] dark:to-[#0D1726] border-[#D6AC62]/45',
  afternoon:
    'from-[#38BDF8]/20 via-[#EFF3F9] to-[#1D4ED8]/10 dark:from-[#38BDF8]/20 dark:via-[#17243C] dark:to-[#0D1726] border-[#0369A1]/30 dark:border-[#38BDF8]/35',
  evening:
    'from-[#1D4ED8]/20 via-[#EFF3F9] to-[#D6AC62]/15 dark:from-[#1D4ED8]/25 dark:via-[#17243C] dark:to-[#D6AC62]/15 border-[#1D4ED8]/35 dark:border-[#60A5FA]/35',
  night:
    'from-[#0F1B33] via-[#17243C] to-[#09101D] border-[#2B4066]',
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

  const [weather, setWeather] = useState<WeatherForecastPayload | null>(null);
  const [weatherLoading, setWeatherLoading] = useState<boolean>(true);
  const [weatherError, setWeatherError] = useState<boolean>(false);

  // Live second-synced Asia/Dhaka clock tick
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

  // Load current temperature & weather condition (geolocation -> Dhaka fallback, 20-min cached)
  const loadWeather = useCallback(async (forceRefresh = false, signal?: AbortSignal) => {
    setWeatherError(false);
    if (forceRefresh) setWeatherLoading(true);

    try {
      const data = await fetchLiveWeatherForecast({ forceRefresh, signal });
      if (!signal?.aborted) {
        setWeather(data);
        setWeatherLoading(false);
      }
    } catch {
      if (!signal?.aborted) {
        setWeatherError(true);
        setWeatherLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadWeather(false, controller.signal);

    // Background refresh every 20 minutes
    const refreshInterval = window.setInterval(() => {
      loadWeather(false);
    }, 20 * 60 * 1000);

    return () => {
      controller.abort();
      window.clearInterval(refreshInterval);
    };
  }, [loadWeather]);

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

  // SVG outer second-sweep dial (r = 25)
  const radius = 25;
  const circumference = 2 * Math.PI * radius;
  const secProgress = parts.secondsNum / 60;
  const dashOffset = circumference * (1 - secProgress);
  const orbAngleRad = ((parts.secondsNum * 6 - 90) * Math.PI) / 180;
  const orbX = 29 + radius * Math.cos(orbAngleRad);
  const orbY = 29 + radius * Math.sin(orbAngleRad);

  const displayHours = is24Hour ? parts.hours24Str : parts.hours12;
  const dialGlow = DIAL_GLOW_MAP[parts.periodKey];
  const compactCity = weather?.cityName ? weather.cityName.split(',')[0] : 'Dhaka';

  return (
    <div
      className="surface-card rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 shrink-0 w-full lg:w-auto"
      aria-label={`Dhaka live clock: ${displayHours}:${parts.minutes}:${parts.seconds}${
        is24Hour ? '' : ` ${parts.dayPeriod}`
      }, ${parts.dateLabel}`}
    >
      {/* Left + Center: Emoji Clock Dial & Crisp Digital Time */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Animated Emoji Clock Chronometer */}
        <div
          className="relative w-14.5 h-14.5 shrink-0 flex items-center justify-center"
          title={`Bangladesh Standard Time · ${parts.greeting}`}
        >
          {/* Second Sweep Progress Track */}
          <svg className="w-14.5 h-14.5 -rotate-90" viewBox="0 0 58 58" aria-hidden="true">
            <circle
              cx="29"
              cy="29"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-[#DFE6F0] dark:text-[#233452]"
            />
            <circle
              cx="29"
              cy="29"
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

          {/* Orbiting Gold Second Dot */}
          <svg
            className="absolute inset-0 w-14.5 h-14.5 pointer-events-none"
            viewBox="0 0 58 58"
            aria-hidden="true"
          >
            <circle cx={orbX} cy={orbY} r="2.7" fill="#D6AC62" />
          </svg>

          {/* Center Dynamic Clock-Face Emoji */}
          <motion.div
            key={parts.clockEmoji}
            initial={{ scale: 0.85, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={`w-10 h-10 rounded-full bg-gradient-to-br border flex items-center justify-center shadow-inner select-none ${dialGlow}`}
          >
            <span
              role="img"
              aria-label={`Analog clock emoji showing ${parts.hours12}:${parts.minutes}`}
              className="text-[22px] leading-none drop-shadow-xs"
            >
              {parts.clockEmoji}
            </span>
          </motion.div>

          {/* Corner Day/Night Celestial Emoji Orb */}
          <span
            role="img"
            aria-label={parts.periodLabel}
            className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-white dark:bg-[#111B2E] border border-[#DFE6F0] dark:border-[#233452] shadow-xs flex items-center justify-center text-[11px] leading-none select-none"
          >
            {parts.celestialEmoji}
          </span>
        </div>

        {/* Time + Date Block */}
        <div className="min-w-0 flex-1 sm:flex-initial">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <div className="inline-flex items-baseline gap-0.5 font-mono tabular-nums">
              <span className="text-lg sm:text-xl font-extrabold tracking-tight text-[#0F1B2E] dark:text-white leading-none">
                {displayHours}
              </span>
              <span
                aria-hidden="true"
                className={`font-bold text-[#1D4ED8] dark:text-[#60A5FA] text-base leading-none mx-0.5 transition-opacity duration-200 ${
                  parts.secondsNum % 2 === 0 ? 'opacity-100' : 'opacity-35'
                }`}
              >
                :
              </span>
              <span className="text-lg sm:text-xl font-extrabold tracking-tight text-[#0F1B2E] dark:text-white leading-none">
                {parts.minutes}
              </span>
              <span className="ml-1 px-1.5 py-0.5 rounded-md bg-[#1D4ED8]/10 dark:bg-[#60A5FA]/15 border border-[#1D4ED8]/20 dark:border-[#60A5FA]/25 text-[11px] font-bold text-[#1D4ED8] dark:text-[#60A5FA] leading-none">
                {parts.seconds}
              </span>
              {!is24Hour && (
                <span className="ml-1 text-[10px] font-extrabold text-[#92600A] dark:text-[#F0C56E] tracking-wider">
                  {parts.dayPeriod}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={toggleFormat}
              title={is24Hour ? 'Switch to 12-hour format' : 'Switch to 24-hour format'}
              className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#EFF3F9] dark:bg-[#17243C] text-[#4E5E78] dark:text-[#9BB0CD] hover:text-[#1D4ED8] dark:hover:text-[#60A5FA] border border-[#DFE6F0] dark:border-[#233452] transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              {is24Hour ? '24H' : '12H'}
            </button>
          </div>

          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#4E5E78] dark:text-[#9BB0CD] whitespace-nowrap">
            <span role="img" aria-hidden="true" className="text-[11px] leading-none">
              📅
            </span>
            <span className="font-semibold text-[#0F1B2E] dark:text-slate-200">{parts.dateLabel}</span>
            <span aria-hidden="true" className="text-[#DFE6F0] dark:text-[#233452]">
              ·
            </span>
            <span className="font-mono text-[10px] font-semibold text-[#0369A1] dark:text-[#38BDF8]">
              BST
            </span>
          </div>
        </div>
      </div>

      {/* Right: Organized Live Temperature & Weather Condition Compartment */}
      <div className="pt-2.5 sm:pt-0 border-t sm:border-t-0 sm:border-l border-[#DFE6F0] dark:border-[#233452] sm:pl-4 flex items-center justify-between gap-2.5 min-w-0">
        {weatherLoading && !weather ? (
          <div className="flex items-center gap-2.5 animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-[#EFF3F9] dark:bg-[#17243C]" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-16 rounded bg-[#EFF3F9] dark:bg-[#17243C]" />
              <div className="h-2.5 w-20 rounded bg-[#EFF3F9] dark:bg-[#17243C]" />
            </div>
          </div>
        ) : weatherError && !weather ? (
          <button
            type="button"
            onClick={() => loadWeather(true)}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-[#4E5E78] dark:text-[#9BB0CD] hover:text-[#1D4ED8] dark:hover:text-[#60A5FA] cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Weather</span>
          </button>
        ) : weather ? (
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-9 h-9 rounded-xl bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] flex items-center justify-center text-lg leading-none shrink-0 select-none"
                title={weather.current.condition.label}
              >
                <span role="img" aria-label={weather.current.condition.label}>
                  {weather.current.condition.emoji}
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                  <span className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-[#0F1B2E] dark:text-white leading-none">
                    {weather.current.temperature}°C
                  </span>
                  <span className="text-xs font-semibold text-[#0369A1] dark:text-[#38BDF8] truncate max-w-[115px]">
                    {weather.current.condition.shortLabel}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5 text-[11px] text-[#4E5E78] dark:text-[#9BB0CD] whitespace-nowrap">
                  <MapPin className="w-3 h-3 text-[#D6AC62] shrink-0" />
                  <span className="truncate max-w-[125px] font-medium">{compactCity}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadWeather(true)}
              disabled={weatherLoading}
              aria-label="Refresh weather"
              title="Refresh live temperature"
              className="p-1.5 rounded-lg text-[#4E5E78] dark:text-[#9BB0CD] hover:text-[#1D4ED8] dark:hover:text-[#60A5FA] hover:bg-[#EFF3F9] dark:hover:bg-[#17243C] transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${weatherLoading ? 'animate-spin' : ''}`} />
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
});

DashboardClock.displayName = 'DashboardClock';
