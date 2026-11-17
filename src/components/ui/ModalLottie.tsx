import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Lottie, LottieHandle } from 'lottie-react';
import { usePrefersReducedMotion } from '../LoginLottieStage';

// Store immutable JSON strings so lottie-web's in-place layer mutations
// never corrupt cached assets or trigger deep-equality recursion across re-opens.
const lottieJsonTextCache = new Map<string, string>();

function cloneLottieJson(rawText: string): object | null {
  try {
    return JSON.parse(rawText) as object;
  } catch {
    return null;
  }
}

interface ModalLottieProps {
  src: string;
  successSrc?: string;
  isSuccess?: boolean;
  speed?: number;
  fallbackIcon?: React.ReactNode;
  className?: string;
  loop?: boolean;
}

export const ModalLottie: React.FC<ModalLottieProps> = ({
  src,
  successSrc = '/lottie/payment-success.json',
  isSuccess = false,
  speed = 1,
  fallbackIcon,
  className = 'w-11 h-11',
  loop = true,
}) => {
  const lottieRef = useRef<LottieHandle | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const targetUrl = isSuccess ? successSrc : src;
  const [rawJsonText, setRawJsonText] = useState<string | null>(
    () => lottieJsonTextCache.get(targetUrl) || null
  );
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    setHasError(false);

    const cached = lottieJsonTextCache.get(targetUrl);
    if (cached) {
      setRawJsonText(cached);
      return;
    }

    const controller = new AbortController();
    fetch(targetUrl, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch ${targetUrl}`);
        return res.text();
      })
      .then((text: string) => {
        // Validate JSON once before caching
        JSON.parse(text);
        lottieJsonTextCache.set(targetUrl, text);
        if (active) {
          setRawJsonText(text);
        }
      })
      .catch((err) => {
        if (active && err?.name !== 'AbortError') {
          setHasError(true);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [targetUrl]);

  // Preload success animation text quietly once
  useEffect(() => {
    if (!successSrc || lottieJsonTextCache.has(successSrc)) return;
    const controller = new AbortController();
    fetch(successSrc, { signal: controller.signal })
      .then((res) => (res.ok ? res.text() : null))
      .then((text: string | null) => {
        if (text) {
          JSON.parse(text);
          lottieJsonTextCache.set(successSrc, text);
        }
      })
      .catch(() => {
        // Silent background preload
      });
    return () => controller.abort();
  }, [successSrc]);

  // Fresh deep clone per targetUrl mount so lottie-web never mutates cached objects
  const animData = useMemo(() => {
    if (!rawJsonText) return null;
    return cloneLottieJson(rawJsonText);
  }, [rawJsonText]);

  const subscriptions = useMemo(
    () => ({
      ready: () => {
        if (prefersReducedMotion) {
          lottieRef.current?.pause();
          lottieRef.current?.seek({ percent: isSuccess ? 0.95 : 0.5 });
        }
      },
      error: () => setHasError(true),
    }),
    [prefersReducedMotion, isSuccess]
  );

  if (hasError || !animData) {
    return (
      <div className={`${className} flex items-center justify-center`}>
        {fallbackIcon}
      </div>
    );
  }

  return (
    <div
      key={targetUrl}
      className={`${className} flex items-center justify-center transition-opacity duration-150`}
    >
      <Lottie
        lottieRef={lottieRef}
        src={animData}
        loop={!prefersReducedMotion && !isSuccess && loop}
        autoplay={!prefersReducedMotion}
        speed={speed}
        subscriptions={subscriptions}
        className="w-full h-full"
      />
    </div>
  );
};
