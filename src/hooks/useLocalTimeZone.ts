import { useEffect, useState } from 'react';
import {
  DhakaGreetingInfo,
  getBrowserTimeZone,
  getLocalGreeting,
} from '../utils/dhakaTime';
import {
  getCachedWeather,
  subscribeWeatherUpdates,
} from '../services/weather/openMeteo';

/**
 * React hook returning a live-updating greeting aligned to the viewer's current country/time zone.
 * Automatically updates on exact minute boundaries, tab visibility changes, and weather location updates.
 */
export function useLiveLocalGreeting(): DhakaGreetingInfo {
  const [now, setNow] = useState<Date>(() => new Date());
  const [activeZone, setActiveZone] = useState<string>(() => {
    const cached = getCachedWeather();
    const browserZone = getBrowserTimeZone();
    if (cached?.cacheZone === browserZone && cached.timezone) {
      return cached.timezone;
    }
    return browserZone;
  });

  useEffect(() => {
    let intervalId: number | undefined;

    // Align next update to the exact start of the next minute so Morning/Afternoon/Evening/Night flips instantly
    const syncToMinuteBoundary = () => {
      const current = new Date();
      setNow(current);
      const msToNextMinute = 60000 - (current.getSeconds() * 1000 + current.getMilliseconds()) + 50;

      return window.setTimeout(() => {
        setNow(new Date());
        intervalId = window.setInterval(() => {
          setNow(new Date());
        }, 60 * 1000);
      }, msToNextMinute);
    };

    const timeoutId = syncToMinuteBoundary();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setNow(new Date());
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const unsubscribeWeather = subscribeWeatherUpdates((payload) => {
      if (payload.timezone) {
        setActiveZone(payload.timezone);
      }
    });

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
      unsubscribeWeather();
    };
  }, []);

  return getLocalGreeting(now, activeZone);
}
