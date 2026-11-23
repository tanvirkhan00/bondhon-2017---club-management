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

export type WeatherLocationSource = 'gps' | 'ip' | 'timezone' | 'default';

export interface WeatherForecastPayload {
  areaName: string;
  cityName: string;
  timezone: string;
  timezoneAbbreviation: string;
  cacheZone: string;
  isDefaultLocation: boolean;
  locationSource: WeatherLocationSource;
  latitude: number;
  longitude: number;
  fetchedAt: number;
  current: CurrentWeatherData;
  daily: DailyForecastItem[];
}

const WEATHER_CACHE_KEY = 'bondhon_weather_cache_v5';
const LEGACY_CUSTOM_LOCATION_KEY = 'bondhon_custom_weather_location_v1';
const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes for fresh live updates

export const DHAKA_DEFAULT_COORDS = {
  latitude: 23.8103,
  longitude: 90.4125,
  areaName: 'Dhaka',
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
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
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
    localStorage.removeItem(LEGACY_CUSTOM_LOCATION_KEY);
    const raw = localStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherForecastPayload;
    if (!parsed || !parsed.current || !Array.isArray(parsed.daily)) return null;
    if (!parsed.areaName && parsed.cityName) {
      parsed.areaName = parsed.cityName.split(',')[0].trim();
    }
    if (!parsed.locationSource) {
      parsed.locationSource = parsed.isDefaultLocation ? 'default' : 'timezone';
    }
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

function cleanPlacePart(value?: string | null): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (lower === 'unnamed road' || lower === 'unknown' || /^\d+$/.test(trimmed)) {
    return '';
  }
  return trimmed
    .replace(/\s+(Thana|Upazila|Sub-?district)$/i, '')
    .trim();
}

interface BigDataCloudAdminItem {
  name?: string;
  description?: string;
  adminLevel?: number;
  order?: number;
}

interface BigDataCloudResponse {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryName?: string;
  localityInfo?: {
    administrative?: BigDataCloudAdminItem[];
  };
}

function extractNearestThanaOrUpazila(geo: BigDataCloudResponse): string {
  const adminList = Array.isArray(geo.localityInfo?.administrative)
    ? geo.localityInfo.administrative
    : [];

  // 1. Prefer explicit thana / upazila / subdistrict administrative boundary
  const explicitMatch = adminList.find((item) =>
    /thana|upazila|sub-?district|circle|municipality|borough/i.test(
      `${item.description || ''} ${item.name || ''}`
    )
  );
  if (explicitMatch?.name) {
    const cleaned = cleanPlacePart(explicitMatch.name);
    if (cleaned) return cleaned;
  }

  // 2. Next prefer granular local level (adminLevel 6..8, e.g. upazila/thana/town)
  const sortedGranular = [...adminList]
    .filter(
      (item) =>
        typeof item.adminLevel === 'number' &&
        item.adminLevel >= 6 &&
        item.adminLevel <= 8 &&
        Boolean(cleanPlacePart(item.name))
    )
    .sort((a, b) => (b.adminLevel || 0) - (a.adminLevel || 0));

  if (sortedGranular[0]?.name) {
    const cleaned = cleanPlacePart(sortedGranular[0].name);
    if (cleaned) return cleaned;
  }

  return cleanPlacePart(geo.locality);
}

function buildAreaAndCityLabel(params: {
  thanaOrUpazila?: string;
  locality?: string;
  city?: string;
  subdivision?: string;
  country?: string;
  fallbackArea: string;
}): { areaName: string; cityName: string } {
  const thana = cleanPlacePart(params.thanaOrUpazila);
  const locality = cleanPlacePart(params.locality);
  const city = cleanPlacePart(params.city);
  const subdivision = cleanPlacePart(params.subdivision);
  const country = cleanPlacePart(params.country);

  // Display nearest thana/upazila cleanly on the dashboard clock
  const areaName = thana || locality || city || subdivision || params.fallbackArea;

  const fullParts = [areaName];
  if (city && city.toLowerCase() !== areaName.toLowerCase() && !areaName.toLowerCase().includes(city.toLowerCase())) {
    fullParts.push(city);
  }
  if (country && !fullParts.some((p) => p.toLowerCase().includes(country.toLowerCase()))) {
    fullParts.push(country);
  }

  return {
    areaName,
    cityName: fullParts.join(', '),
  };
}

async function detectBrowserPosition(
  allowPrompt: boolean
): Promise<{ latitude: number; longitude: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return null;
  }

  if (!allowPrompt) {
    try {
      if ('permissions' in navigator && navigator.permissions?.query) {
        const status = await navigator.permissions.query({
          name: 'geolocation' as PermissionName,
        });
        if (status.state !== 'granted') {
          return null;
        }
      } else {
        return null;
      }
    } catch {
      return null;
    }
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
        enableHighAccuracy: true,
        timeout: 6500,
        maximumAge: 5 * 60 * 1000,
      }
    );
  });
}

async function fetchJsonWithTimeout<T>(
  url: string,
  timeoutMs: number,
  externalSignal?: AbortSignal
): Promise<T | null> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      window.clearTimeout(timeoutId);
      return null;
    }
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeoutId);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

/**
 * Automatically detects the visitor's actual district/area via HTTPS CORS IP geolocation
 * when browser GPS permission isn't granted, avoiding defaulting everyone to country capitals.
 */
async function detectIpAreaLocation(signal?: AbortSignal): Promise<{
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
  country?: string;
} | null> {
  type GeoJsRes = {
    latitude?: string | number;
    longitude?: string | number;
    city?: string;
    region?: string;
    country?: string;
  };

  const geoJs = await fetchJsonWithTimeout<GeoJsRes>(
    'https://get.geojs.io/v1/ip/geo.json',
    4500,
    signal
  );

  if (geoJs) {
    const lat = Number(geoJs.latitude);
    const lon = Number(geoJs.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0)) {
      return {
        latitude: lat,
        longitude: lon,
        city: geoJs.city,
        region: geoJs.region,
        country: geoJs.country,
      };
    }
  }

  type IpWhoRes = {
    success?: boolean;
    latitude?: number;
    longitude?: number;
    city?: string;
    region?: string;
    country?: string;
  };

  const ipWho = await fetchJsonWithTimeout<IpWhoRes>(
    'https://ipwho.is/',
    4500,
    signal
  );

  if (ipWho && ipWho.success !== false) {
    const lat = Number(ipWho.latitude);
    const lon = Number(ipWho.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0)) {
      return {
        latitude: lat,
        longitude: lon,
        city: ipWho.city,
        region: ipWho.region,
        country: ipWho.country,
      };
    }
  }

  return null;
}

/**
 * Resolves coordinates for the visitor's browser time zone city (e.g. Asia/Riyadh -> Riyadh)
 * only as a last resort when both GPS and IP geolocation are unavailable.
 */
async function resolveCoordsFromTimeZone(
  browserZone: string,
  signal?: AbortSignal
): Promise<{ latitude: number; longitude: number; areaName: string; cityName: string } | null> {
  if (!browserZone || browserZone === 'Asia/Dhaka') {
    return null;
  }

  const cityQuery = extractZoneCity(browserZone);
  if (!cityQuery || cityQuery.toLowerCase() === 'dhaka') {
    return null;
  }

  const data = await fetchJsonWithTimeout<{
    results?: Array<{
      name?: string;
      country?: string;
      latitude?: number;
      longitude?: number;
    }>;
  }>(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      cityQuery
    )}&count=1&language=en&format=json`,
    4500,
    signal
  );

  const top = data?.results?.[0];
  if (top && typeof top.latitude === 'number' && typeof top.longitude === 'number') {
    const areaName = top.name || cityQuery;
    const cityName =
      top.name && top.country ? `${top.name}, ${top.country}` : areaName;
    return {
      latitude: top.latitude,
      longitude: top.longitude,
      areaName,
      cityName,
    };
  }
  return null;
}

async function resolveAreaDetails(
  lat: number,
  lon: number,
  fallbackArea: string,
  fallbackCountry?: string,
  signal?: AbortSignal
): Promise<{ areaName: string; cityName: string }> {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(
    lat.toFixed(4)
  )}&longitude=${encodeURIComponent(lon.toFixed(4))}&localityLanguage=en`;

  const geo = await fetchJsonWithTimeout<BigDataCloudResponse>(url, 4500, signal);

  if (geo) {
    const thanaOrUpazila = extractNearestThanaOrUpazila(geo);
    return buildAreaAndCityLabel({
      thanaOrUpazila,
      locality: geo.locality,
      city: geo.city || fallbackArea,
      subdivision: geo.principalSubdivision,
      country: geo.countryName || fallbackCountry,
      fallbackArea,
    });
  }

  return buildAreaAndCityLabel({
    city: fallbackArea,
    country: fallbackCountry,
    fallbackArea,
  });
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
  allowGpsPrompt?: boolean;
  signal?: AbortSignal;
}): Promise<WeatherForecastPayload> {
  const browserZone = getBrowserTimeZone();
  const cached = getCachedWeather();
  const sameZone = cached?.cacheZone === browserZone;
  const isFresh =
    cached && sameZone && Date.now() - cached.fetchedAt < WEATHER_CACHE_TTL_MS;

  if (!options?.forceRefresh && isFresh && cached) {
    return cached;
  }

  if (!options?.forceRefresh && inflightWeatherPromise) {
    return inflightWeatherPromise;
  }

  const runFetch = async (): Promise<WeatherForecastPayload> => {
    let lat = DHAKA_DEFAULT_COORDS.latitude;
    let lon = DHAKA_DEFAULT_COORDS.longitude;
    let fallbackArea = DHAKA_DEFAULT_COORDS.areaName;
    let fallbackCountry: string | undefined = 'Bangladesh';
    let isDefaultLocation = true;
    let locationSource: WeatherLocationSource = 'default';
    let needsReverseGeocode = false;
    let preResolvedArea: { areaName: string; cityName: string } | null = null;

    const allowPrompt = options?.allowGpsPrompt !== false;
    const gpsPos = await detectBrowserPosition(allowPrompt);
    if (gpsPos) {
      lat = gpsPos.latitude;
      lon = gpsPos.longitude;
      fallbackArea = extractZoneCity(browserZone);
      fallbackCountry = undefined;
      isDefaultLocation = false;
      locationSource = 'gps';
      needsReverseGeocode = true;
    } else {
      const ipLoc = await detectIpAreaLocation(options?.signal);
      if (ipLoc) {
        lat = ipLoc.latitude;
        lon = ipLoc.longitude;
        fallbackArea = ipLoc.city || ipLoc.region || extractZoneCity(browserZone);
        fallbackCountry = ipLoc.country;
        isDefaultLocation = false;
        locationSource = 'ip';
        needsReverseGeocode = true;
      } else {
        const tzCoords = await resolveCoordsFromTimeZone(browserZone, options?.signal);
        if (tzCoords) {
          lat = tzCoords.latitude;
          lon = tzCoords.longitude;
          isDefaultLocation = false;
          locationSource = 'timezone';
          preResolvedArea = {
            areaName: tzCoords.areaName,
            cityName: tzCoords.cityName,
          };
        } else {
          preResolvedArea = {
            areaName: DHAKA_DEFAULT_COORDS.areaName,
            cityName: DHAKA_DEFAULT_COORDS.cityName,
          };
        }
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
      const [weatherRes, resolvedArea] = await Promise.all([
        fetch(forecastUrl, { signal: options?.signal }),
        needsReverseGeocode
          ? resolveAreaDetails(lat, lon, fallbackArea, fallbackCountry, options?.signal)
          : Promise.resolve(
              preResolvedArea || {
                areaName: DHAKA_DEFAULT_COORDS.areaName,
                cityName: DHAKA_DEFAULT_COORDS.cityName,
              }
            ),
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
        areaName: resolvedArea.areaName,
        cityName: resolvedArea.cityName,
        timezone: resolvedTimezone,
        timezoneAbbreviation: json.timezone_abbreviation || '',
        cacheZone: browserZone,
        isDefaultLocation,
        locationSource,
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
