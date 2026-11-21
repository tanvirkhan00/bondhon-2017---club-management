import React from 'react';
import { motion } from 'motion/react';
import { useClubData } from '../hooks/useClubData';
import { formatBirthdayMonthDay } from '../utils/birthdayUtils';
import { Cake, Sparkles, PartyPopper } from 'lucide-react';

export const BirthdayCelebrationCard: React.FC = () => {
  const { upcomingBirthdayHighlights } = useClubData();

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

              return (
                <div
                  key={person.id}
                  className="rounded-2xl bg-[#09101D]/55 backdrop-blur-md border border-white/15 p-4 sm:p-5 flex items-center gap-4"
                >
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full overflow-hidden ring-2 ring-[#D6AC62] bg-[#18294A] flex items-center justify-center">
                      {person.profile_image_url ? (
                        <img
                          src={person.profile_image_url}
                          alt={person.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-extrabold text-[#F0C56E]">
                          {person.full_name.substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    {isToday && (
                      <span
                        aria-hidden="true"
                        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#D6AC62] text-[#0F1B33] flex items-center justify-center shadow-sm"
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

                    <p className="text-xs text-slate-300 truncate">
                      {person.member_code} · {person.designation || 'Member'}
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
