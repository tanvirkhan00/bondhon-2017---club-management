import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  DhakaPeriodKey,
  getBrowserTimeZone,
  getLocalClockParts,
} from '../utils/dhakaTime';
import {
  fetchLiveWeatherForecast,
  getCachedWeather,
  subscribeWeatherUpdates,
  WeatherConditionInfo,
  WeatherForecastPayload,
} from '../services/weather/openMeteo';
import { MapPin, RefreshCw } from 'lucide-react';

const CLOCK_FORMAT_KEY = 'bondhon_clock_24h';

const PERIOD_PILL_ACCENT: Record<DhakaPeriodKey, string> = {
  morning:
    'text-[#92600A] dark:text-[#F0C56E] bg-[#D6AC62]/12 border-[#D6AC62]/30',
  afternoon:
    'text-[#0369A1] dark:text-[#38BDF8] bg-[#0369A1]/10 dark:bg-[#38BDF8]/12 border-[#0369A1]/25 dark:border-[#38BDF8]/30',
  evening:
    'text-[#1D4ED8] dark:text-[#60A5FA] bg-[#1D4ED8]/10 dark:bg-[#60A5FA]/12 border-[#1D4ED8]/25 dark:border-[#60A5FA]/30',
  night:
    'text-[#1D4ED8] dark:text-[#F0C56E] bg-[#1D4ED8]/10 dark:bg-[#17243C] border-[#1D4ED8]/25 dark:border-[#2B4066]',
};

const WEATHER_TILE_ACCENT: Record<WeatherConditionInfo['kind'], string> = {
  clear: 'bg-[#D6AC62]/15 border-[#D6AC62]/35',
  'partly-cloudy': 'bg-[#38BDF8]/12 border-[#38BDF8]/30',
  cloudy: 'bg-[#4E5E78]/12 border-[#4E5E78]/25 dark:bg-[#17243C] dark:border-[#2B4066]',
  fog: 'bg-[#4E5E78]/12 border-[#4E5E78]/25 dark:bg-[#17243C] dark:border-[#2B4066]',
  drizzle: 'bg-[#0369A1]/12 border-[#0369A1]/30 dark:bg-[#38BDF8]/12 dark:border-[#38BDF8]/30',
  rain: 'bg-[#1D4ED8]/12 border-[#1D4ED8]/30 dark:bg-[#1D4ED8]/20 dark:border-[#60A5FA]/35',
  snow: 'bg-[#38BDF8]/15 border-[#38BDF8]/35',
  storm: 'bg-[#D6AC62]/15 border-[#D6AC62]/40',
};

// Center of the twin-bell alarm watch face inside viewBox="0 0 72 72"
const CX = 36;
const CY = 39;

const HOUR_TICKS = Array.from({ length: 12 }, (_, idx) => {
  const angleRad = ((idx * 30 - 90) * Math.PI) / 180;
  const isCardinal = idx % 3 === 0;
  const innerR = isCardinal ? 17.8 : 19.4;
  const outerR = 21.6;
  return {
    x1: CX + innerR * Math.cos(angleRad),
    y1: CY + innerR * Math.sin(angleRad),
    x2: CX + outerR * Math.cos(angleRad),
    y2: CY + outerR * Math.sin(angleRad),
    isCardinal,
  };
});

export const DashboardClock: React.FC = memo(() => {
  const [now, setNow] = useState<Date>(() => new Date());
  const [is24Hour, setIs24Hour] = useState<boolean>(() => {
    try {
      return localStorage.getItem(CLOCK_FORMAT_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [weather, setWeather] = useState<WeatherForecastPayload | null>(() => getCachedWeather());
  const [weatherLoading, setWeatherLoading] = useState<boolean>(() => !getCachedWeather());
  const [weatherError, setWeatherError] = useState<boolean>(false);

  // Live second-synced local clock tick
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

  // Load current temperature & weather condition (geolocation -> timezone city -> Dhaka fallback, 10-min live refresh)
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

    // Stay in sync when another clock widget refreshes weather
    const unsubscribeWeather = subscribeWeatherUpdates((payload) => {
      setWeather(payload);
      setWeatherLoading(false);
      setWeatherError(false);
    });

    // Periodic 10-minute live weather update + immediate check when tab becomes visible
    const refreshInterval = window.setInterval(() => {
      loadWeather(false);
    }, 10 * 60 * 1000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setNow(new Date());
        loadWeather(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      controller.abort();
      unsubscribeWeather();
      window.clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
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

  const activeTimeZone = weather?.timezone || getBrowserTimeZone();
  const parts = useMemo(() => getLocalClockParts(now, activeTimeZone), [now, activeTimeZone]);
  const displayHours = is24Hour ? parts.hours24Str : parts.hours12;
  const compactCity = weather?.cityName ? weather.cityName.split(',')[0] : parts.zoneCity;
  const periodPillClass = PERIOD_PILL_ACCENT[parts.periodKey];
  const weatherTileClass = weather
    ? WEATHER_TILE_ACCENT[weather.current.condition.kind]
    : 'bg-[#EFF3F9] dark:bg-[#17243C] border-[#DFE6F0] dark:border-[#233452]';

  // Exact live analog hand angles (degrees clockwise from 12 o'clock)
  const secondDeg = parts.secondsNum * 6;
  const minuteDeg = parts.minutesNum * 6 + parts.secondsNum * 0.1;
  const hourDeg = ((parts.hours24 % 12) + parts.minutesNum / 60 + parts.secondsNum / 3600) * 30;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[#DFE6F0] dark:border-[#243757] bg-gradient-to-br from-white via-[#F8FAFD] to-[#EEF3FB] dark:from-[#132038] dark:via-[#0E182B] dark:to-[#0A1221] shadow-[0_12px_32px_-16px_rgba(15,27,51,0.35)] px-3.5 py-2.5 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 shrink-0 w-full lg:w-auto"
      aria-label={`${parts.zoneCity} live clock: ${displayHours}:${parts.minutes}:${parts.seconds}${
        is24Hour ? '' : ` ${parts.dayPeriod}`
      }, ${parts.dateLabel}`}
    >
      {/* Subtle Top Sapphire-Brass Hairline Accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#1D4ED8]/70 via-[#38BDF8]/80 to-[#D6AC62]/80 opacity-85"
      />

      {/* Left + Center: Custom Twin-Bell ⏰ Live Analog Clock + Digital Readout */}
      <div className="flex items-center gap-3.5 min-w-0">
        {/* Unique Twin-Bell ⏰ Analog Timepiece with Live Running Hands */}
        <div
          className="relative w-16 h-16 shrink-0 flex items-center justify-center select-none"
          title={`${parts.zoneCity} Local Time · ${parts.hours12}:${parts.minutes}:${parts.seconds} ${parts.dayPeriod}`}
        >
          {/* Soft Ambient Glow Behind Clock */}
          <div
            aria-hidden="true"
            className="absolute inset-2 rounded-full bg-[#1D4ED8]/10 dark:bg-[#38BDF8]/12 blur-md pointer-events-none"
          />

          <svg
            viewBox="0 0 72 72"
            className="relative w-16 h-16 block"
            role="img"
            aria-label={`Live alarm clock showing ${parts.hours12}:${parts.minutes}:${parts.seconds} ${parts.dayPeriod}`}
          >
            {/* Top Handle Ring */}
            <path
              d="M 29 12 A 7 7 0 0 1 43 12"
              fill="none"
              stroke="#D6AC62"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <line
              x1={CX}
              y1="8"
              x2={CX}
              y2="14"
              stroke="#D6AC62"
              strokeWidth="2.4"
              strokeLinecap="round"
            />

            {/* Animated Twin Brass Bells + Hammer */}
            <motion.g
              animate={{ rotate: [0, -2.5, 2.5, -1.5, 1.5, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 3.5, ease: 'easeInOut' }}
              style={{ transformOrigin: `${CX}px ${CY}px` }}
            >
              {/* Left Bell */}
              <path
                d="M 13 24 A 9 9 0 0 1 26 14 Z"
                fill="#D6AC62"
                stroke="#B48636"
                strokeWidth="1"
                strokeLinejoin="round"
              />
              {/* Right Bell */}
              <path
                d="M 59 24 A 9 9 0 0 0 46 14 Z"
                fill="#D6AC62"
                stroke="#B48636"
                strokeWidth="1"
                strokeLinejoin="round"
              />
              {/* Top Hammer Stem */}
              <circle cx={CX} cy="11.5" r="2.2" fill="#F0C56E" />
            </motion.g>

            {/* Twin Angled Desk Feet */}
            <line
              x1="21"
              y1="57"
              x2="15.5"
              y2="65"
              stroke="#D6AC62"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <line
              x1="51"
              y1="57"
              x2="56.5"
              y2="65"
              stroke="#D6AC62"
              strokeWidth="3.2"
              strokeLinecap="round"
            />

            {/* Outer Metallic Watch Bezel */}
            <circle
              cx={CX}
              cy={CY}
              r="25"
              className="fill-[#0F1B33] dark:fill-[#1A2B4C] stroke-[#D6AC62]/85"
              strokeWidth="2.4"
            />

            {/* Inner Watch Dial Face */}
            <circle
              cx={CX}
              cy={CY}
              r="22.5"
              className="fill-white dark:fill-[#09101D]"
            />

            {/* Subtle Inner Track Ring */}
            <circle
              cx={CX}
              cy={CY}
              r="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.6"
              strokeDasharray="1.5 2.5"
              className="text-[#4E5E78]/35 dark:text-[#9BB0CD]/25"
            />

            {/* 12 Precision Dial Indices */}
            {HOUR_TICKS.map((t, idx) => (
              <line
                key={idx}
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                stroke="currentColor"
                strokeWidth={t.isCardinal ? '1.7' : '0.95'}
                strokeLinecap="round"
                className={
                  t.isCardinal
                    ? 'text-[#1D4ED8] dark:text-[#D6AC62]'
                    : 'text-[#4E5E78]/55 dark:text-[#9BB0CD]/50'
                }
              />
            ))}

            {/* Cardinal Micro Numerals (12 / 3 / 6 / 9) */}
            <text
              x={CX}
              y={CY - 12.2}
              textAnchor="middle"
              fontSize="5.4"
              fontWeight="800"
              className="fill-[#0F1B2E] dark:fill-slate-300 font-mono"
            >
              12
            </text>
            <text
              x={CX + 13.8}
              y={CY + 1.8}
              textAnchor="middle"
              fontSize="5.4"
              fontWeight="800"
              className="fill-[#0F1B2E] dark:fill-slate-300 font-mono"
            >
              3
            </text>
            <text
              x={CX}
              y={CY + 15.8}
              textAnchor="middle"
              fontSize="5.4"
              fontWeight="800"
              className="fill-[#0F1B2E] dark:fill-slate-300 font-mono"
            >
              6
            </text>
            <text
              x={CX - 13.8}
              y={CY + 1.8}
              textAnchor="middle"
              fontSize="5.4"
              fontWeight="800"
              className="fill-[#0F1B2E] dark:fill-slate-300 font-mono"
            >
              9
            </text>

            {/* Running Hour Hand */}
            <line
              x1={CX}
              y1={CY + 3}
              x2={CX}
              y2={CY - 11.5}
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              transform={`rotate(${hourDeg.toFixed(2)} ${CX} ${CY})`}
              className="text-[#0F1B2E] dark:text-white"
            />

            {/* Running Minute Hand */}
            <line
              x1={CX}
              y1={CY + 3.5}
              x2={CX}
              y2={CY - 16.5}
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              transform={`rotate(${minuteDeg.toFixed(2)} ${CX} ${CY})`}
              className="text-[#1D4ED8] dark:text-[#38BDF8]"
            />

            {/* Live Running Second Hand + Counterweight */}
            <line
              x1={CX}
              y1={CY + 5.5}
              x2={CX}
              y2={CY - 19}
              stroke="#E11D48"
              strokeWidth="1.15"
              strokeLinecap="round"
              transform={`rotate(${secondDeg} ${CX} ${CY})`}
            />

            {/* Center Brass Pinion */}
            <circle cx={CX} cy={CY} r="2.3" fill="#D6AC62" />
            <circle cx={CX} cy={CY} r="0.9" fill="#09101D" />
          </svg>
        </div>

        {/* Crisp Digital Readout, Period Tag & Date */}
        <div className="min-w-0 flex-1 sm:flex-initial">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <div className="inline-flex items-baseline gap-0.5 font-mono tabular-nums">
              <span className="text-lg sm:text-[21px] font-extrabold tracking-tight text-[#0F1B2E] dark:text-white leading-none">
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
              <span className="text-lg sm:text-[21px] font-extrabold tracking-tight text-[#0F1B2E] dark:text-white leading-none">
                {parts.minutes}
              </span>
              <span className="ml-1 px-1.5 py-0.5 rounded-md bg-[#1D4ED8]/10 dark:bg-[#38BDF8]/15 border border-[#1D4ED8]/20 dark:border-[#38BDF8]/30 text-[11px] font-bold text-[#1D4ED8] dark:text-[#38BDF8] leading-none">
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

          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-[#4E5E78] dark:text-[#9BB0CD] whitespace-nowrap">
            <span className="font-semibold text-[#0F1B2E] dark:text-slate-200">{parts.dateLabel}</span>
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-mono font-semibold leading-none ${periodPillClass}`}
              title={parts.timeZone}
            >
              <span role="img" aria-hidden="true" className="text-[10px] leading-none">
                {parts.celestialEmoji}
              </span>
              <span>{parts.shortZone}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Right: Integrated Live Temperature & Weather Condition */}
      <div className="pt-2.5 sm:pt-0 border-t sm:border-t-0 sm:border-l border-[#DFE6F0] dark:border-[#233452] sm:pl-4 flex items-center justify-between gap-2.5 min-w-0">
        {weatherLoading && !weather ? (
          <div className="flex items-center gap-2.5 animate-pulse">
            <div className="w-9 h-9 rounded-xl bg-[#EFF3F9] dark:bg-[#17243C]" />
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
                className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xl leading-none shrink-0 select-none ${weatherTileClass}`}
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
                <div className="flex items-center gap-1 mt-1 text-[11px] text-[#4E5E78] dark:text-[#9BB0CD] whitespace-nowrap">
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
