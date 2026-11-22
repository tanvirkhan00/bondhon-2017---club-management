import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useLiveLocalGreeting } from '../hooks/useLocalTimeZone';
import { ArrowRight } from 'lucide-react';
import crestImage from '../assets/images/bondhon_club_crest_1793703027252.jpg';

const BRAND_LOGO_URL = '/assets/aistudio/transparent_Bondon_2017_logo_45efd5ac.png';

/**
 * In-memory per-page-load flag:
 * - Shows on first visit AND every full page refresh of the public website (whether logged in or not).
 * - Avoids replaying while navigating internally across Home, About, Directory, Constitution, or Login.
 */
let hasShownWebsitePreloader = false;

export const WebsiteWelcomePreloader: React.FC = () => {
  const greetingInfo = useLiveLocalGreeting();
  const [logoSrc, setLogoSrc] = useState(BRAND_LOGO_URL);
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isAuthRedirect =
      window.location.hash.includes('access_token=') ||
      window.location.hash.includes('type=recovery');
    const isQrProfileDeepLink = /^\/members\/[^/]+/.test(window.location.pathname);
    if (isAuthRedirect || isQrProfileDeepLink) return false;
    if (hasShownWebsiteWelcomeOnce()) return false;
    hasShownWebsitePreloader = true;
    return true;
  });

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => {
      setVisible(false);
    }, 2200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="website-welcome-preloader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
          onClick={() => setVisible(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Welcome to Bondhon 2017"
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-[#070D19]/92 backdrop-blur-md cursor-pointer"
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-[#132038] to-[#0B1324] border border-[#243757] shadow-[0_28px_70px_-20px_rgba(0,0,0,0.75)] overflow-hidden text-center cursor-default"
          >
            {/* Sovereign Sapphire & Brass Top Accent */}
            <div className="h-1.5 bg-gradient-to-r from-[#0F1B33] via-[#1D4ED8] to-[#D6AC62]" />

            {/* Subtle Ambient Radial Glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-[#1D4ED8]/15 blur-3xl"
            />

            <div className="relative px-6 py-8 sm:px-8 space-y-5">
              {/* Time-Aware Greeting Kicker */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#17243C]/90 border border-[#243757] text-xs font-semibold text-[#38BDF8]">
                <span role="img" aria-hidden="true">
                  {greetingInfo.celestialEmoji}
                </span>
                <span>
                  {greetingInfo.greeting} · {greetingInfo.zoneCity}
                </span>
              </div>

              {/* Official Transparent Bondhon 2017 Emblem */}
              <motion.div
                initial={{ scale: 0.84, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.08, duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-28 h-28 mx-auto flex items-center justify-center"
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-1 rounded-full bg-[#D6AC62]/20 blur-md"
                />
                <img
                  src={logoSrc}
                  alt="Bondhon 2017 Official Logo"
                  onError={() => setLogoSrc(crestImage)}
                  className="relative w-26 h-26 rounded-full object-contain drop-shadow-[0_10px_24px_rgba(15,27,51,0.55)]"
                />
              </motion.div>

              {/* Welcome Headline & Bengali Club Identity */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14, duration: 0.32 }}
                className="space-y-1.5"
              >
                <h2 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-white leading-snug">
                  Welcome to{' '}
                  <span className="text-[#F0C56E]">Bondhon 2017</span>
                </h2>
                <p className="text-xs sm:text-sm font-medium text-[#9BB0CD]">
                  বন্ধুত্ব সমবায় সমিতি · Friends Forever · Batch SSC 2017
                </p>
              </motion.div>

              {/* Smooth Loading Bar */}
              <div className="space-y-2 pt-1">
                <div className="w-full h-1.5 bg-[#09101D] rounded-full overflow-hidden border border-[#243757]">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 1.9, ease: [0.16, 1, 0.3, 1] }}
                    style={{ originX: 0 }}
                    className="h-full w-full bg-gradient-to-r from-[#1D4ED8] via-[#38BDF8] to-[#D6AC62] rounded-full"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#9BB0CD]">
                  <span>Est. 01 April 2024 · Transparent Ledger</span>
                  <button
                    type="button"
                    onClick={() => setVisible(false)}
                    className="inline-flex items-center gap-1 font-semibold text-[#60A5FA] hover:text-white cursor-pointer transition-colors"
                  >
                    <span>Explore</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

function hasShownWebsiteWelcomeOnce(): boolean {
  return hasShownWebsitePreloader;
}
