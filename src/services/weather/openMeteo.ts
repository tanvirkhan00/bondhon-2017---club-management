import { extractZoneCity, getBrowserTimeZone } from '../../utils/dhakaTime';

export interface WeatherConditionInfo {
  label: string;
  shortLabel: string;
  emoji: string;
  kind: 'clear' | 'partly-cloudy' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';
}

export interface CurrentWeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  isDay: boolean;
  condition: WeatherConditionInfo;
}

export interface DailyForecastItem {
  date: string;
  dayName: string;
  shortDate: string;
  tempMin: number;
  tempMax: number;
  weatherCode: number;
  condition: WeatherConditionInfo;
}

export interface WeatherForecastPayload {
  cityName: string;
  timezone: string;
  timezoneAbbreviation: string;
  cacheZone: string;
  isDefaultLocation: boolean;
  latitude: number;
  longitude: number;
  fetchedAt: number;
  current: CurrentWeatherData;
  daily: DailyForecastItem[];
}

const WEATHER_CACHE_KEY = 'bondhon_weather_cache_v3';
const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes for fresh live updates

export const DHAKA_DEFAULT_COORDS = {
  latitude: 23.8103,
  longitude: 90.4125,
  cityName: 'Dhaka, Bangladesh',
  timezone: 'Asia/Dhaka',
};

type WeatherListener = (payload: WeatherForecastPayload) => void;
const listeners = new Set<WeatherListener>();

export function subscribeWeatherUpdates(listener: WeatherListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyWeatherListeners(payload: WeatherForecastPayload): void {
  listeners.forEach((cb) => {
    try {
      cb(payload);
    } catch {
      // Ignore subscriber errors
    }
  });
}

export function mapWmoWeatherCode(code: number, isDay = true): WeatherConditionInfo {
  if (code === 0) {
    return {
      label: isDay ? 'Clear & Sunny' : 'Clear Night',
      shortLabel: isDay ? 'Sunny' : 'Clear',
      emoji: isDay ? '☀️' : '🌙',
      kind: 'clear',
    };
  }
  if (code === 1 || code === 2) {
    return {
      label: 'Partly Cloudy',
      shortLabel: 'Partly Cloudy',
      emoji: isDay ? '⛅' : '☁️',
      kind: 'partly-cloudy',
    };
  }
  if (code === 3) {
    return {
      label: 'Overcast Clouds',
      shortLabel: 'Cloudy',
      emoji: '☁️',
      kind: 'cloudy',
    };
  }
  if (code === 45 || code === 48) {
    return {
      label: 'Mist & Fog',
      shortLabel: 'Foggy',
      emoji: '🌫️',
      kind: 'fog',
    };
  }
  if (code >= 51 && code <= 57) {
    return {
      label: 'Light Drizzle',
      shortLabel: 'Drizzle',
      emoji: '🌦️',
      kind: 'drizzle',
    };
  }
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    return {
      label: code >= 65 || code === 82 ? 'Heavy Rain' : 'Rain Showers',
      shortLabel: 'Rain',
      emoji: '🌧️',
      kind: 'rain',
    };
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return {
      label: 'Snowfall',
      shortLabel: 'Snow',
      emoji: '❄️',
      kind: 'snow',
    };
  }
  if (code >= 95 && code <= 99) {
    return {
      label: 'Thunderstorm',
      shortLabel: 'Storm',
      emoji: '⛈️',
      kind: 'storm',
    };
  }
  return {
    label: 'Partly Cloudy',
    shortLabel: 'Cloudy',
    emoji: '⛅',
    kind: 'partly-cloudy',
  };
}

export function getCachedWeather(): WeatherForecastPayload | null {
  try {
    const raw = localStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherForecastPayload;
    if (!parsed || !parsed.current || !Array.isArray(parsed.daily)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeWeatherCache(payload: WeatherForecastPayload): void {
  try {
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors
  }
}

function detectBrowserPosition(): Promise<{ latitude: number; longitude: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: false,
        timeout: 5500,
        maximumAge: 10 * 60 * 1000,
      }
    );
  });
}

/**
 * Resolves coordinates for the visitor's browser time zone city (e.g. Asia/Riyadh -> Riyadh)
 * when browser geolocation is denied or unavailable. Falls back to Dhaka, Bangladesh.
 */
async function resolveCoordsFromTimeZone(
  browserZone: string,
  signal?: AbortSignal
): Promise<{ latitude: number; longitude: number; cityName: string } | null> {
  if (!browserZone || browserZone === 'Asia/Dhaka') {
    return null;
  }

  const cityQuery = extractZoneCity(browserZone);
  if (!cityQuery || cityQuery.toLowerCase() === 'dhaka') {
    return null;
  }

  try {
    const geoUrl =
      `https://geocoding-api.open-meteo.com/v1/search` +
      `?name=${encodeURIComponent(cityQuery)}&count=1&language=en&format=json`;
    const res = await fetch(geoUrl, { signal });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: Array<{
        name?: string;
        country?: string;
        latitude?: number;
        longitude?: number;
      }>;
    };
    const top = data.results?.[0];
    if (top && typeof top.latitude === 'number' && typeof top.longitude === 'number') {
      const cityLabel =
        top.name && top.country ? `${top.name}, ${top.country}` : top.name || cityQuery;
      return {
        latitude: top.latitude,
        longitude: top.longitude,
        cityName: cityLabel,
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function resolveCityName(
  lat: number,
  lon: number,
  fallbackName: string,
  signal?: AbortSignal
): Promise<string> {
  if (
    Math.abs(lat - DHAKA_DEFAULT_COORDS.latitude) < 0.03 &&
    Math.abs(lon - DHAKA_DEFAULT_COORDS.longitude) < 0.03
  ) {
    return DHAKA_DEFAULT_COORDS.cityName;
  }

  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(
      lat.toFixed(4)
    )}&longitude=${encodeURIComponent(lon.toFixed(4))}&localityLanguage=en`;

    const res = await fetch(url, { signal });
    if (!res.ok) return fallbackName;
    const geo = (await res.json()) as {
      city?: string;
      locality?: string;
      principalSubdivision?: string;
      countryName?: string;
    };

    const city = geo.city || geo.locality || geo.principalSubdivision;
    const country = geo.countryName;
    if (city && country) return `${city}, ${country}`;
    if (city) return city;
    if (country) return country;
    return fallbackName;
  } catch {
    return fallbackName;
  }
}

function formatForecastDay(isoDate: string): { dayName: string; shortDate: string } {
  const [y, m, d] = isoDate.split('-').map(Number);
  const local = new Date(y, (m || 1) - 1, d || 1);
  return {
    dayName: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(local),
    shortDate: new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' }).format(local),
  };
}

let inflightWeatherPromise: Promise<WeatherForecastPayload> | null = null;

export async function fetchLiveWeatherForecast(options?: {
  forceRefresh?: boolean;
  signal?: AbortSignal;
}): Promise<WeatherForecastPayload> {
  const browserZone = getBrowserTimeZone();
  const cached = getCachedWeather();
  const sameZone = cached?.cacheZone === browserZone;
  const isFresh = cached && sameZone && Date.now() - cached.fetchedAt < WEATHER_CACHE_TTL_MS;

  if (!options?.forceRefresh && isFresh && cached) {
    return cached;
  }

  if (!options?.forceRefresh && inflightWeatherPromise) {
    return inflightWeatherPromise;
  }

  const runFetch = async (): Promise<WeatherForecastPayload> => {
    let lat = DHAKA_DEFAULT_COORDS.latitude;
    let lon = DHAKA_DEFAULT_COORDS.longitude;
    let resolvedFallbackCity = DHAKA_DEFAULT_COORDS.cityName;
    let isDefaultLocation = true;
    let usedGeolocation = false;

    const detected = await detectBrowserPosition();
    if (detected) {
      lat = detected.latitude;
      lon = detected.longitude;
      resolvedFallbackCity = extractZoneCity(browserZone);
      isDefaultLocation = false;
      usedGeolocation = true;
    } else {
      const tzCoords = await resolveCoordsFromTimeZone(browserZone, options?.signal);
      if (tzCoords) {
        lat = tzCoords.latitude;
        lon = tzCoords.longitude;
        resolvedFallbackCity = tzCoords.cityName;
        isDefaultLocation = false;
      }
    }

    const forecastUrl =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${encodeURIComponent(lat.toFixed(4))}` +
      `&longitude=${encodeURIComponent(lon.toFixed(4))}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
      `&timezone=auto&forecast_days=6`;

    try {
      const [weatherRes, resolvedCity] = await Promise.all([
        fetch(forecastUrl, { signal: options?.signal }),
        usedGeolocation
          ? resolveCityName(lat, lon, resolvedFallbackCity, options?.signal)
          : Promise.resolve(resolvedFallbackCity),
      ]);

      if (!weatherRes.ok) {
        throw new Error(`Weather API responded with ${weatherRes.status}`);
      }

      const json = (await weatherRes.json()) as {
        timezone?: string;
        timezone_abbreviation?: string;
        current?: {
          temperature_2m?: number;
          relative_humidity_2m?: number;
          apparent_temperature?: number;
          weather_code?: number;
          wind_speed_10m?: number;
          is_day?: number;
        };
        daily?: {
          time?: string[];
          weather_code?: number[];
          temperature_2m_max?: number[];
          temperature_2m_min?: number[];
        };
      };

      if (!json.current || !json.daily?.time) {
        throw new Error('Incomplete weather payload');
      }

      const curIsDay = Number(json.current.is_day ?? 1) === 1;
      const curCode = Number(json.current.weather_code ?? 0);

      const rawTimes = json.daily.time || [];
      const startIdx = rawTimes.length >= 6 ? 1 : 0;
      const daily: DailyForecastItem[] = rawTimes
        .slice(startIdx, startIdx + 5)
        .map((dateStr, i) => {
          const idx = startIdx + i;
          const code = Number(json.daily?.weather_code?.[idx] ?? 0);
          const { dayName, shortDate } = formatForecastDay(dateStr);
          return {
            date: dateStr,
            dayName,
            shortDate,
            tempMin: Math.round(Number(json.daily?.temperature_2m_min?.[idx] ?? 0)),
            tempMax: Math.round(Number(json.daily?.temperature_2m_max?.[idx] ?? 0)),
            weatherCode: code,
            condition: mapWmoWeatherCode(code, true),
          };
        });

      const resolvedTimezone =
        json.timezone && json.timezone.includes('/') ? json.timezone : browserZone;

      const payload: WeatherForecastPayload = {
        cityName: resolvedCity,
        timezone: resolvedTimezone,
        timezoneAbbreviation: json.timezone_abbreviation || '',
        cacheZone: browserZone,
        isDefaultLocation,
        latitude: lat,
        longitude: lon,
        fetchedAt: Date.now(),
        current: {
          temperature: Math.round(Number(json.current.temperature_2m ?? 0)),
          feelsLike: Math.round(Number(json.current.apparent_temperature ?? 0)),
          humidity: Math.round(Number(json.current.relative_humidity_2m ?? 0)),
          windSpeed: Math.round(Number(json.current.wind_speed_10m ?? 0)),
          weatherCode: curCode,
          isDay: curIsDay,
          condition: mapWmoWeatherCode(curCode, curIsDay),
        },
        daily,
      };

      writeWeatherCache(payload);
      notifyWeatherListeners(payload);
      return payload;
    } catch (err) {
      if (cached && sameZone) {
        return cached;
      }
      throw err;
    }
  };

  inflightWeatherPromise = runFetch().finally(() => {
    inflightWeatherPromise = null;
  });

  return inflightWeatherPromise;
}
