import React, { useEffect, useRef, useState } from 'react';
import { Lottie, LottieHandle } from 'lottie-react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Loader2, Lock, Pause, Play, ShieldCheck } from 'lucide-react';

export type LoginAuthState = 'idle' | 'loading' | 'success' | 'error';

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

interface LoginLottieStageProps {
  role: 'member' | 'admin';
  authState: LoginAuthState;
}

export const LoginLottieStage: React.FC<LoginLottieStageProps> = ({ role, authState }) => {
  const lottieRef = useRef<LottieHandle | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const [paused, setPaused] = useState(false);
  const [memberData, setMemberData] = useState<object | null>(null);
  const [adminData, setAdminData] = useState<object | null>(null);
  const [authData, setAuthData] = useState<object | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  // Lazy-fetch distinct Member, Admin, and Verification LottieFiles JSON assets cleanly
  useEffect(() => {
    const controller = new AbortController();

    fetch('/lottie/member-login.json', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load member login animation');
        return res.json();
      })
      .then((json: object) => {
        setMemberData(json);
        // Preload Admin & Verification animations quietly after primary renders
        return Promise.all([
          fetch('/lottie/admin-login.json', { signal: controller.signal }).then((r) =>
            r.ok ? r.json() : null
          ),
          fetch('/lottie/user-auth.json', { signal: controller.signal }).then((r) =>
            r.ok ? r.json() : null
          ),
        ]);
      })
      .then(([adminJson, authJson]) => {
        if (adminJson) setAdminData(adminJson);
        if (authJson) setAuthData(authJson);
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          setLoadFailed(true);
        }
      });

    return () => controller.abort();
  }, []);

  const isVerifyingOrSuccess = authState === 'loading' || authState === 'success';
  const activeSrc =
    isVerifyingOrSuccess && authData
      ? authData
      : role === 'admin'
      ? adminData
      : memberData;

  const activeKey = isVerifyingOrSuccess && authData ? `verify-${authState}` : `portal-${role}`;
  const shouldPlay = !prefersReducedMotion && !paused;
  const shouldLoop = authState === 'success' ? false : true;

  useEffect(() => {
    const handle = lottieRef.current;
    if (!handle) return;
    if (shouldPlay) {
      handle.play();
    } else {
      handle.pause();
      if (prefersReducedMotion) {
        handle.seek({ percent: 0.55 });
      }
    }
  }, [shouldPlay, prefersReducedMotion, activeKey]);

  const togglePlayback = () => {
    setPaused((prev) => !prev);
  };

  const stateCaption =
    authState === 'loading'
      ? 'নিরাপদ তথ্য যাচাই চলছে...'
      : authState === 'success'
      ? role === 'admin'
        ? 'অ্যাডমিন অনুমোদন সম্পন্ন'
        : 'সদস্য যাচাই সম্পন্ন'
      : authState === 'error'
      ? 'সঠিক তথ্য দিয়ে পুনরায় চেষ্টা করুন'
      : role === 'admin'
      ? 'সুরক্ষিত কোষাধ্যক্ষ ও অ্যাডমিন পোর্টাল'
      : 'সদস্য সঞ্চয় ও ব্যক্তিগত পোর্টাল';

  return (
    <div className="relative flex flex-col items-center justify-center w-full">
      {/* Subtle radial ambient aura behind stage */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 m-auto w-56 h-56 lg:w-80 lg:h-80 rounded-full opacity-80 transition-colors duration-300"
        style={{
          background:
            authState === 'error'
              ? 'radial-gradient(circle, rgba(225,29,72,0.22) 0%, rgba(20,36,58,0) 72%)'
              : role === 'admin'
              ? 'radial-gradient(circle, rgba(214,172,98,0.24) 0%, rgba(20,36,58,0) 72%)'
              : 'radial-gradient(circle, rgba(8,127,112,0.28) 0%, rgba(20,36,58,0) 72%)',
        }}
      />

      {/* Luminous circular stage ensures 100% crisp contrast for both Member & Admin vector animations */}
      <div
        className={`relative z-10 w-36 h-36 sm:w-44 sm:h-44 lg:w-68 lg:h-68 xl:w-76 xl:h-76 rounded-full flex items-center justify-center p-4 sm:p-5 lg:p-6 transition-all duration-300 shadow-[0_20px_45px_rgba(0,0,0,0.32)] ${
          isVerifyingOrSuccess
            ? 'bg-[#0F1B2D] ring-2 ring-[#34D399]/50'
            : role === 'admin'
            ? 'bg-gradient-to-br from-[#F5F6F3] to-[#E8EFEF] ring-4 ring-[#D6AC62]/35'
            : 'bg-gradient-to-br from-[#FFFFFF] to-[#EDF5F3] ring-4 ring-[#34D399]/30'
        }`}
      >
        {loadFailed ? (
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <ShieldCheck className="w-10 h-10 text-[#087F70]" />
            <span className="text-xs font-semibold text-[#14243A]">Secure Portal</span>
          </div>
        ) : !activeSrc ? (
          <div
            aria-label="Loading authentication illustration"
            className="w-24 h-24 lg:w-44 lg:h-44 rounded-full bg-slate-200/70 animate-pulse"
          />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeKey}
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full h-full flex items-center justify-center"
            >
              <Lottie
                lottieRef={lottieRef}
                src={activeSrc}
                loop={shouldPlay && shouldLoop}
                autoplay={shouldPlay}
                speed={authState === 'loading' ? 1.25 : 1}
                subscriptions={{
                  ready: () => {
                    if (prefersReducedMotion) {
                      lottieRef.current?.pause();
                      lottieRef.current?.seek({ percent: 0.55 });
                    }
                  },
                  error: () => setLoadFailed(true),
                }}
                className="w-full h-full"
              />
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Subtle Interactive Caption + Accessibility Playback Control */}
      <div className="relative z-10 mt-3 hidden sm:flex items-center justify-center gap-2.5 text-xs text-slate-300">
        <span className="font-medium tracking-tight">{stateCaption}</span>
        {!prefersReducedMotion && activeSrc && !loadFailed && (
          <>
            <span aria-hidden="true" className="text-slate-500">
              ·
            </span>
            <button
              type="button"
              onClick={togglePlayback}
              aria-label={paused ? 'Play animation' : 'Pause animation'}
              title={paused ? 'Play animation' : 'Pause animation'}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-300 hover:text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D6AC62] rounded px-1.5 py-0.5"
            >
              {paused ? (
                <>
                  <Play className="w-3 h-3" />
                  <span>Play</span>
                </>
              ) : (
                <>
                  <Pause className="w-3 h-3" />
                  <span>Pause</span>
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

interface AnimatedLoginButtonProps {
  variant: 'member' | 'admin';
  loading: boolean;
  authState: LoginAuthState;
  idleLabel: string;
}

export const AnimatedLoginButton: React.FC<AnimatedLoginButtonProps> = ({
  variant,
  loading,
  authState,
  idleLabel,
}) => {
  const unlockRef = useRef<LottieHandle | null>(null);
  const arrowRef = useRef<LottieHandle | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const [hovered, setHovered] = useState(false);
  const [unlockData, setUnlockData] = useState<object | null>(null);
  const [arrowData, setArrowData] = useState<object | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      fetch('/lottie/button-unlock.json', { signal: controller.signal }).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch('/lottie/button-arrow.json', { signal: controller.signal }).then((r) =>
        r.ok ? r.json() : null
      ),
    ])
      .then(([unlockJson, arrowJson]) => {
        if (unlockJson) setUnlockData(unlockJson);
        if (arrowJson) setArrowData(arrowJson);
      })
      .catch(() => {
        // Fallback icons remain visible if fetch is aborted or unavailable
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      unlockRef.current?.pause();
      arrowRef.current?.pause();
      if (authState === 'success') {
        unlockRef.current?.seek({ percent: 0.95 });
      } else {
        unlockRef.current?.seek({ frame: 0 });
      }
      return;
    }

    if (authState === 'success') {
      unlockRef.current?.play();
      arrowRef.current?.pause();
    } else if (loading || hovered) {
      unlockRef.current?.play();
      arrowRef.current?.play();
    } else {
      unlockRef.current?.stop();
      arrowRef.current?.stop();
    }
  }, [hovered, loading, authState, prefersReducedMotion]);

  const isSuccess = authState === 'success';
  const isDisabled = loading || isSuccess;

  const baseBgClass =
    variant === 'member'
      ? 'bg-[#087F70] hover:bg-[#06675B]'
      : 'bg-[#14243A] hover:bg-[#203650] dark:bg-[#087F70] dark:hover:bg-[#06675B]';

  return (
    <motion.button
      type="submit"
      disabled={isDisabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      whileHover={isDisabled || prefersReducedMotion ? undefined : { y: -1.5 }}
      whileTap={isDisabled || prefersReducedMotion ? undefined : { scale: 0.985 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative overflow-hidden w-full min-h-[48px] py-3 px-5 ${baseBgClass} text-white font-semibold text-sm rounded-xl shadow-xs hover:shadow-md transition-all duration-150 disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 cursor-pointer whitespace-nowrap`}
    >
      {/* Subtle compositor-only hover & authenticating light sheen */}
      {!prefersReducedMotion && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] transition-transform duration-700 ease-out ${
            loading
              ? 'translate-x-[420%] animate-[pulse_1.4s_ease-in-out_infinite]'
              : hovered
              ? 'translate-x-[420%]'
              : '-translate-x-full'
          }`}
        />
      )}

      {/* Leading LottieFiles Unlock Micro-Animation */}
      <span className="relative z-10 w-6 h-6 rounded-lg bg-white/12 flex items-center justify-center shrink-0">
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-[#D6AC62]" />
        ) : isSuccess ? (
          <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
        ) : unlockData ? (
          <Lottie
            lottieRef={unlockRef}
            src={unlockData}
            loop={!prefersReducedMotion && (hovered || loading)}
            autoplay={false}
            speed={1.2}
            className="w-5 h-5"
          />
        ) : variant === 'admin' ? (
          <ShieldCheck className="w-4 h-4 text-[#D6AC62]" />
        ) : (
          <Lock className="w-4 h-4 text-white" />
        )}
      </span>

      {/* Label */}
      <span className="relative z-10 tracking-tight">
        {loading ? 'Authenticating...' : isSuccess ? 'Verified · Redirecting...' : idleLabel}
      </span>

      {/* Trailing LottieFiles Arrow Micro-Animation */}
      {!loading && !isSuccess && (
        <span
          className={`relative z-10 w-6 h-4 flex items-center justify-center shrink-0 transition-transform duration-200 ${
            hovered && !prefersReducedMotion ? 'translate-x-0.5' : ''
          }`}
        >
          {arrowData ? (
            <Lottie
              lottieRef={arrowRef}
              src={arrowData}
              loop={!prefersReducedMotion && hovered}
              autoplay={false}
              speed={1.25}
              className="w-6 h-4 brightness-0 invert"
            />
          ) : (
            <span aria-hidden="true" className="text-sm leading-none">
              →
            </span>
          )}
        </span>
      )}
    </motion.button>
  );
};
