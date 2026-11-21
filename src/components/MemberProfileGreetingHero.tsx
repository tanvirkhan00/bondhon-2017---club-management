import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Member } from '../types';
import { useLiveLocalGreeting } from '../hooks/useLocalTimeZone';
import { formatBDT, formatDate } from '../utils/formatters';
import { StatusBadge } from './StatusBadge';
import { Calendar, CreditCard, Mail, Phone, User, Droplets, Cake, Lock } from 'lucide-react';

interface MemberProfileGreetingHeroProps {
  member: Member;
  monthlyContribution: number;
  showEmail?: boolean;
  showPrivateDob?: boolean;
}

export const MemberProfileGreetingHero: React.FC<MemberProfileGreetingHeroProps> = ({
  member,
  monthlyContribution,
  showEmail = false,
  showPrivateDob = false,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const greetingInfo = useLiveLocalGreeting();

  // Reset image error state if navigated to a different member
  useEffect(() => {
    setImgFailed(false);
  }, [member.id, member.profile_image_url]);

  const avatarUrl = !imgFailed ? member.profile_image_url : null;
  const initials =
    member.full_name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || '')
      .join('') || 'M';

  return (
    <section className="surface-card rounded-3xl overflow-hidden relative">
      {/* Subtle Top Accent Ribbon */}
      <div className="h-2 bg-gradient-to-r from-[#0F1B33] via-[#1D4ED8] to-[#D6AC62]" />

      {/* Subtle Ambient Decorative Geometry (Light/Dark safe, low-opacity background texture) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[#1D4ED8]/6 dark:bg-[#38BDF8]/8 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-[#D6AC62]/8 dark:bg-[#D6AC62]/6 blur-2xl"
      />

      <div className="relative p-6 sm:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
        {/* Member Profile Image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="w-24 h-24 rounded-full bg-[#EFF3F9] dark:bg-[#17243C] ring-3 ring-[#D6AC62]/75 flex items-center justify-center text-[#1D4ED8] dark:text-[#60A5FA] font-extrabold text-3xl shrink-0 overflow-hidden shadow-sm"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={member.full_name}
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{initials}</span>
          )}
        </motion.div>

        {/* Greeting & Member Metadata */}
        <div className="flex-1 space-y-2.5 min-w-0">
          {/* Dynamic Time Greeting Kicker */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-2.5 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#0369A1] dark:text-[#38BDF8]">
              <span role="img" aria-hidden="true">
                {greetingInfo.celestialEmoji}
              </span>
              <span>
                {greetingInfo.periodLabel} · {greetingInfo.zoneCity} Time ({greetingInfo.shortZone})
              </span>
            </span>
            <span className="text-[#DFE6F0] dark:text-[#233452]" aria-hidden="true">
              |
            </span>
            <span className="font-mono font-bold text-[#0F1B33] dark:text-[#F0C56E]">
              {member.member_code}
            </span>
            <span className="text-[#4E5E78] dark:text-[#9BB0CD]" aria-hidden="true">
              ·
            </span>
            <span className="font-semibold text-[#1D4ED8] dark:text-[#60A5FA]">
              {member.designation || 'Member'}
            </span>
            <StatusBadge status={member.status} size="sm" />
          </div>

          {/* Personalized Greeting Headline for Viewed Member */}
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F1B2E] dark:text-white leading-tight">
            {greetingInfo.greeting},{' '}
            <span className="text-[#1D4ED8] dark:text-[#60A5FA]">{member.full_name}!</span>
          </h1>

          {/* Contact & Membership Details */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-5 gap-y-2 text-xs text-[#4E5E78] dark:text-[#9BB0CD] pt-1">
            {member.father_name && (
              <span className="flex items-center gap-1.5 text-[#0F1B2E]/85 dark:text-slate-300">
                <User className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#60A5FA]" />
                <span>{member.father_name}</span>
              </span>
            )}
            <span className="flex items-center gap-1.5 font-mono text-[#0F1B2E] dark:text-slate-200 tabular-nums">
              <Phone className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#60A5FA]" />
              <span>{member.phone || '—'}</span>
            </span>
            {showEmail && member.email && (
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#60A5FA]" />
                <span className="truncate max-w-[220px]">{member.email}</span>
              </span>
            )}
            {member.blood_group && (
              <span className="flex items-center gap-1.5 font-mono font-bold text-rose-600 dark:text-rose-400">
                <Droplets className="w-3.5 h-3.5" />
                <span>Blood: {member.blood_group}</span>
              </span>
            )}
            {showPrivateDob && member.date_of_birth && (
              <span
                className="flex items-center gap-1.5 font-mono text-[#0F1B2E] dark:text-slate-200"
                title="Private — visible only to you & admins"
              >
                <Cake className="w-3.5 h-3.5 text-[#D6AC62]" />
                <span>DOB: {formatDate(member.date_of_birth)}</span>
                <Lock className="w-3 h-3 text-[#4E5E78]" />
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#60A5FA]" />
              <span>Joined {formatDate(member.join_date)}</span>
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-[#0369A1] dark:text-[#38BDF8] font-mono tabular-nums">
              <CreditCard className="w-3.5 h-3.5" />
              <span>
                {formatBDT(monthlyContribution)}/mo
                {member.shares_count > 1 ? ` (${member.shares_count} shares)` : ''}
              </span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
