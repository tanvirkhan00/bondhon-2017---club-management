import React, { useEffect, useRef, useState } from 'react';
import { Lottie, LottieHandle } from 'lottie-react';
import { AnimatePresence, motion } from 'motion/react';
import { usePrefersReducedMotion } from '../LoginLottieStage';

// Module-level cache prevents redundant network requests when re-opening modals
const lottieJsonCache = new Map<string, object>();

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
  const [animData, setAnimData] = useState<object | null>(
    () => lottieJsonCache.get(targetUrl) || null
  );
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
    const cached = lottieJsonCache.get(targetUrl);
    if (cached) {
      setAnimData(cached);
      return;
    }

    const controller = new AbortController();
    fetch(targetUrl, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch ${targetUrl}`);
        return res.json();
      })
      .then((json: object) => {
        lottieJsonCache.set(targetUrl, json);
        setAnimData(json);
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          setHasError(true);
        }
      });

    return () => controller.abort();
  }, [targetUrl]);

  // Preload success animation quietly once primary asset resolves
  useEffect(() => {
    if (!successSrc || lottieJsonCache.has(successSrc)) return;
    const controller = new AbortController();
    fetch(successSrc, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: object | null) => {
        if (json) lottieJsonCache.set(successSrc, json);
      })
      .catch(() => {
        // Silent background preload
      });
    return () => controller.abort();
  }, [successSrc]);

  if (hasError || !animData) {
    return (
      <div className={`${className} flex items-center justify-center`}>
        {fallbackIcon}
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={targetUrl}
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.88 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className={`${className} flex items-center justify-center`}
      >
        <Lottie
          lottieRef={lottieRef}
          src={animData}
          loop={!prefersReducedMotion && !isSuccess && loop}
          autoplay={!prefersReducedMotion}
          speed={speed}
          subscriptions={{
            ready: () => {
              if (prefersReducedMotion) {
                lottieRef.current?.pause();
                lottieRef.current?.seek({ percent: isSuccess ? 0.95 : 0.5 });
              }
            },
            error: () => setHasError(true),
          }}
          className="w-full h-full"
        />
      </motion.div>
    </AnimatePresence>
  );
};
