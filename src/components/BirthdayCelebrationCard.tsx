import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useClubData } from '../hooks/useClubData';
import { INITIAL_MEMBERS } from '../lib/mockData';
import { formatBirthdayMonthDay } from '../utils/birthdayUtils';
import crestImage from '../assets/images/bondhon_club_crest_1793703027252.jpg';
import { Cake, Sparkles, PartyPopper } from 'lucide-react';

const FALLBACK_AVATAR_BY_CODE = new Map(
  INITIAL_MEMBERS.filter((m) => m.profile_image_url).map((m) => [
    m.member_code.toUpperCase(),
    m.profile_image_url as string,
  ])
);

export const BirthdayCelebrationCard: React.FC = () => {
  const { upcomingBirthdayHighlights } = useClubData();
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Strictly visible only from 2 days prior through birthday date (0 <= days_until <= 2)
  const celebrations = upcomingBirthdayHighlights.filter(
    (b) => b.days_until >= 0 && b.days_until <= 2
  );

  if (celebrations.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Club Birthday Celebrations"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F1B33] via-[#15284E] to-[#1D4ED8] text-white border border-[#D6AC62]/45 shadow-[0_20px_50px_-15px_rgba(15,27,51,0.45)] p-5 sm:p-7"
      >
        {/* Subtle decorative aura */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-12 w-56 h-56 rounded-full bg-[#D6AC62]/18 blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-12 w-56 h-56 rounded-full bg-[#38BDF8]/15 blur-2xl"
        />

        <div className="relative space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#D6AC62]/20 border border-[#D6AC62]/50 text-[#F0C56E] flex items-center justify-center shrink-0">
                <Cake className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-[#F0C56E]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Bondhon 2017 Celebration · শুভ জন্মদিন</span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
                  {celebrations.some((c) => c.days_until === 0)
                    ? 'Birthday Wishes From All Friends!'
                    : 'Upcoming Club Birthday Celebration'}
                </h2>
              </div>
            </div>

            <span className="text-xs font-mono text-slate-200/90 self-start sm:self-auto">
              Bangladesh Standard Time (BST)
            </span>
          </div>

          {/* Responsive Cards (1 to N members seamlessly, Month & Day only — NEVER birth year) */}
          <div
            className={`grid gap-4 ${
              celebrations.length === 1
                ? 'grid-cols-1'
                : celebrations.length === 2
                ? 'grid-cols-1 md:grid-cols-2'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            {celebrations.map((person) => {
              const isToday = person.days_until === 0;
              const timingLabel = isToday
                ? 'Today · শুভ জন্মদিন!'
                : person.days_until === 1
                ? 'Tomorrow'
                : 'In 2 Days';

              const dateLabel = formatBirthdayMonthDay(
                person.birth_month,
                person.birth_day,
                true
              );

              const resolvedAvatar =
                !failedImages[person.id]
                  ? (person.profile_image_url || '').trim() ||
                    FALLBACK_AVATAR_BY_CODE.get((person.member_code || '').toUpperCase()) ||
                    crestImage
                  : crestImage;

              return (
                <div
                  key={person.id}
                  className="rounded-2xl bg-[#09101D]/60 backdrop-blur-md border border-white/15 p-4 sm:p-5 flex items-center gap-4"
                >
                  <div className="relative shrink-0">
                    <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden ring-2 ring-[#D6AC62] shadow-[0_10px_25px_-8px_rgba(214,172,98,0.45)] bg-[#18294A] flex items-center justify-center">
                      <img
                        src={resolvedAvatar}
                        alt={person.full_name}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedImages((prev) =>
                            prev[person.id] ? prev : { ...prev, [person.id]: true }
                          )
                        }
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {isToday && (
                      <span
                        aria-hidden="true"
                        className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-[#D6AC62] text-[#0F1B33] flex items-center justify-center shadow-md ring-2 ring-[#09101D]"
                      >
                        <PartyPopper className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono">
                      <span className="font-bold text-[#F0C56E]">{timingLabel}</span>
                      <span className="text-slate-400">·</span>
                      <span className="font-semibold text-[#38BDF8]">{dateLabel}</span>
                    </div>

                    <h3 className="text-base sm:text-lg font-extrabold text-white truncate">
                      {person.full_name}
                    </h3>

                    <p className="text-xs text-slate-300 truncate font-mono">
                      {person.member_code} · {person.designation || 'Member'}
                    </p>

                    <p className="text-[11px] text-slate-300/90 pt-0.5">
                      {isToday
                        ? 'Wishing health, joy & prosperity!'
                        : 'Get ready to celebrate together.'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </section>
  );
};
