import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { useClubData } from '../hooks/useClubData';
import { useLiveLocalGreeting } from '../hooks/useLocalTimeZone';
import { ArrowRight } from 'lucide-react';
import crestImage from '../assets/images/bondhon_club_crest_1793703027252.jpg';

/**
 * In-memory page-load tracker:
 * - Resets automatically on EVERY full browser refresh / page reload.
 * - Resets explicitly on sign-out and new login via clearWelcomePreloaderSession / markWelcomePreloaderPending.
 * - Prevents unnecessary replay during internal SPA route switches (e.g., Admin <-> Member Portal).
 */
let shownInCurrentPageLoadForUserId: string | null = null;
let pendingLoginWelcome = false;

export function markWelcomePreloaderPending(): void {
  pendingLoginWelcome = true;
  shownInCurrentPageLoadForUserId = null;
}

export function clearWelcomePreloaderSession(): void {
  pendingLoginWelcome = false;
  shownInCurrentPageLoadForUserId = null;
}

export const WelcomePreloader: React.FC = () => {
  const { user, profile, isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const { myMemberRecord, isLoading: dataLoading } = useClubData();

  const [visible, setVisible] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const userId = user?.id || '';

  // Wait for both auth profile and club member record (so real avatar & full name are ready)
  const identityReady = useMemo(() => {
    if (!isAuthenticated || authLoading || !userId) return false;
    if (isAdmin) return Boolean(profile) && (!dataLoading || Boolean(myMemberRecord));
    return !dataLoading || Boolean(myMemberRecord);
  }, [isAuthenticated, authLoading, userId, isAdmin, profile, dataLoading, myMemberRecord]);

  useEffect(() => {
    if (!identityReady || !userId) return;

    if (!pendingLoginWelcome && shownInCurrentPageLoadForUserId === userId) {
      return;
    }

    pendingLoginWelcome = false;
    shownInCurrentPageLoadForUserId = userId;
    setImgFailed(false);
    setVisible(true);
  }, [identityReady, userId]);

  // Isolated auto-dismiss timer so data updates cannot cancel fade-out
  useEffect(() => {
    if (!visible) return;
    const dismissTimer = window.setTimeout(() => {
      setVisible(false);
    }, 2400);

    return () => {
      window.clearTimeout(dismissTimer);
    };
  }, [visible]);

  const greetingInfo = useLiveLocalGreeting();

  const displayName =
    myMemberRecord?.full_name ||
    profile?.full_name ||
    (typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name) ||
    (user?.email ? user.email.split('@')[0] : 'Member');

  const avatarUrl =
    !imgFailed
      ? myMemberRecord?.profile_image_url ||
        profile?.avatar_url ||
        (typeof user?.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : null)
      : null;

  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'M';

  const roleSubtitle = isAdmin
    ? `Administrator${myMemberRecord?.member_code ? ` · ${myMemberRecord.member_code}` : ''}`
    : `${myMemberRecord?.member_code || 'Verified Member'}${
        myMemberRecord?.designation ? ` · ${myMemberRecord.designation}` : ''
      }`;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="welcome-preloader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          onClick={() => setVisible(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`${greetingInfo.greeting}, ${displayName}`}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#09101D]/85 backdrop-blur-md cursor-pointer"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-[#111B2E] border border-[#233452] shadow-2xl overflow-hidden text-center cursor-default"
          >
            {/* Top Sovereign Sapphire & Brass Ribbon */}
            <div className="h-1.5 bg-gradient-to-r from-[#0F1B33] via-[#1D4ED8] to-[#D6AC62]" />

            <div className="px-6 py-8 sm:px-8 space-y-5">
              {/* Club Crest Kicker */}
              <div className="flex items-center justify-center gap-2 text-xs text-[#9BB0CD]">
                <img
                  src={crestImage}
                  alt="Bondhon 2017"
                  className="w-5 h-5 rounded-full object-cover ring-1 ring-[#D6AC62]/60"
                />
                <span className="font-semibold text-white tracking-wide">Bondhon 2017</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[#F0C56E]">
                  {greetingInfo.celestialEmoji} {greetingInfo.zoneCity}
                </span>
              </div>

              {/* Authenticated User Real Avatar */}
              <motion.div
                initial={{ scale: 0.86, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.08, duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-24 h-24 mx-auto"
              >
                <div className="w-24 h-24 rounded-full bg-[#17243C] ring-3 ring-[#D6AC62]/85 flex items-center justify-center text-2xl font-extrabold text-[#60A5FA] overflow-hidden shadow-lg">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      referrerPolicy="no-referrer"
                      onError={() => setImgFailed(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
              </motion.div>

              {/* Animated Greeting Headline */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14, duration: 0.3 }}
                className="space-y-1.5"
              >
                <h2 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-white leading-snug">
                  {greetingInfo.greeting},{' '}
                  <span className="text-[#38BDF8]">{displayName}!</span>
                </h2>
                <p className="text-xs font-mono text-[#9BB0CD]">{roleSubtitle}</p>
              </motion.div>

              {/* Smooth Loading Progress Bar */}
              <div className="space-y-2 pt-1">
                <div className="w-full h-1.5 bg-[#17243C] rounded-full overflow-hidden border border-[#233452]">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 2.1, ease: [0.16, 1, 0.3, 1] }}
                    style={{ originX: 0 }}
                    className="h-full w-full bg-gradient-to-r from-[#1D4ED8] via-[#38BDF8] to-[#D6AC62] rounded-full"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#9BB0CD]">
                  <span>Preparing your dashboard...</span>
                  <button
                    type="button"
                    onClick={() => setVisible(false)}
                    className="inline-flex items-center gap-1 font-semibold text-[#60A5FA] hover:text-white cursor-pointer transition-colors"
                  >
                    <span>Continue</span>
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
