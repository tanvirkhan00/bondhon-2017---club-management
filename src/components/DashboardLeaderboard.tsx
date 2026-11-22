import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Member, MonthlyDue } from '../types';
import { INITIAL_MEMBERS } from '../lib/mockData';
import { computeMemberFinancialSummary, calculateDueBreakdown } from '../utils/fineCalculator';
import { formatBDT } from '../utils/formatters';
import {
  Trophy,
  Crown,
  Medal,
  Coins,
  AlertCircle,
  AlertTriangle,
  Wallet,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';

type LeaderboardCategory = 'joma' | 'due' | 'jorimana' | 'jorimana_due';

interface DashboardLeaderboardProps {
  members: Member[];
  monthlyDues: MonthlyDue[];
}

interface RankedMemberEntry {
  member: Member;
  avatarUrl: string | null;
  value: number;
  primarySub: string;
  secondarySub: string;
}

const STATIC_AVATAR_BY_CODE = new Map(
  INITIAL_MEMBERS.filter((m) => m.profile_image_url).map((m) => [
    m.member_code.toUpperCase(),
    m.profile_image_url as string,
  ])
);

const CATEGORY_META: Array<{
  id: LeaderboardCategory;
  label: string;
  banglaLabel: string;
  emptyTitle: string;
  emptyDesc: string;
  accentText: string;
  barClass: string;
  ringClass: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'joma',
    label: 'Max Joma',
    banglaLabel: 'সর্বোচ্চ জমা',
    emptyTitle: 'No contributions recorded yet',
    emptyDesc: 'Member collection rankings appear automatically once payments are saved.',
    accentText: 'text-[#38BDF8]',
    barClass: 'bg-gradient-to-r from-[#1D4ED8] to-[#38BDF8]',
    ringClass: 'ring-[#38BDF8]/60',
    icon: Wallet,
  },
  {
    id: 'due',
    label: 'Max Due',
    banglaLabel: 'সর্বোচ্চ বকেয়া',
    emptyTitle: 'Zero outstanding member dues',
    emptyDesc: 'All active members are completely settled on principal and fines.',
    accentText: 'text-rose-400',
    barClass: 'bg-gradient-to-r from-rose-600 to-rose-400',
    ringClass: 'ring-rose-400/60',
    icon: AlertCircle,
  },
  {
    id: 'jorimana',
    label: 'Max Jorimana',
    banglaLabel: 'সর্বোচ্চ জরিমানা আদায়',
    emptyTitle: 'No late fines collected',
    emptyDesc: 'Members have settled monthly installments on time without late fine payments.',
    accentText: 'text-[#F0C56E]',
    barClass: 'bg-gradient-to-r from-[#B45309] to-[#F0C56E]',
    ringClass: 'ring-[#D6AC62]/70',
    icon: Coins,
  },
  {
    id: 'jorimana_due',
    label: 'Max Jorimana Due',
    banglaLabel: 'সর্বোচ্চ জরিমানা বকেয়া',
    emptyTitle: 'No pending late fines due',
    emptyDesc: 'All accrued 12th-deadline fines have been paid or waived.',
    accentText: 'text-amber-400',
    barClass: 'bg-gradient-to-r from-amber-600 to-amber-400',
    ringClass: 'ring-amber-400/60',
    icon: AlertTriangle,
  },
];

const MemberPortrait: React.FC<{
  name: string;
  url: string | null;
  sizeClass: string;
  ringClass: string;
  failed: boolean;
  onError: () => void;
}> = ({ name, url, sizeClass, ringClass, failed, onError }) => {
  const showImg = Boolean(url && !failed);
  return (
    <div
      className={`${sizeClass} rounded-full overflow-hidden ring-2 ${ringClass} bg-[#17243C] flex items-center justify-center shrink-0`}
    >
      {showImg ? (
        <img
          src={url as string}
          alt={name}
          referrerPolicy="no-referrer"
          onError={onError}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-xs font-extrabold font-mono text-[#F0C56E]">
          {name.substring(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
};

export const DashboardLeaderboard: React.FC<DashboardLeaderboardProps> = ({
  members,
  monthlyDues,
}) => {
  const [activeCategory, setActiveCategory] = useState<LeaderboardCategory>('joma');
  const [showAll, setShowAll] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const markImageFailed = (memberId: string) => {
    setFailedImages((prev) => (prev[memberId] ? prev : { ...prev, [memberId]: true }));
  };

  const rankingsByCategory = useMemo<Record<LeaderboardCategory, RankedMemberEntry[]>>(() => {
    const now = new Date();
    const activeMembers = members.filter((m) => m.status === 'active');

    const joma: RankedMemberEntry[] = [];
    const due: RankedMemberEntry[] = [];
    const jorimana: RankedMemberEntry[] = [];
    const jorimana_due: RankedMemberEntry[] = [];

    activeMembers.forEach((m) => {
      const mDues = monthlyDues.filter((d) => d.member_id === m.id);
      const summary = computeMemberFinancialSummary(m, mDues, now);
      const avatarUrl =
        (m.profile_image_url || '').trim() ||
        STATIC_AVATAR_BY_CODE.get((m.member_code || '').toUpperCase()) ||
        null;

      let finedPaidMonths = 0;
      let fineDueMonths = 0;
      mDues.forEach((d) => {
        const bd = calculateDueBreakdown(d, m.shares_count, now);
        if (bd.finePaid > 0) finedPaidMonths += 1;
        if (bd.fineOutstanding > 0) fineDueMonths += 1;
      });

      // 1. Max Joma (Principal + Fine collected)
      const totalCollected = summary.totalPaid + summary.totalFinePaid;
      joma.push({
        member: m,
        avatarUrl,
        value: totalCollected,
        primarySub: `Dues ${formatBDT(summary.totalPaid)}`,
        secondarySub:
          summary.totalFinePaid > 0
            ? `Fine ${formatBDT(summary.totalFinePaid)} · ${summary.totalPaidMonths} mos`
            : `${summary.totalPaidMonths} mos paid`,
      });

      // 2. Max Due (Total Outstanding: principal + pending fines)
      if (summary.totalOutstanding > 0) {
        due.push({
          member: m,
          avatarUrl,
          value: summary.totalOutstanding,
          primarySub: `Principal ${formatBDT(summary.principalOutstanding)}`,
          secondarySub:
            summary.totalFinePending > 0
              ? `Fine Due ${formatBDT(summary.totalFinePending)} · ${summary.unpaidMonthsCount} mos`
              : `${summary.unpaidMonthsCount} unpaid mos`,
        });
      }

      // 3. Max Jorimana (Total Fines Paid)
      if (summary.totalFinePaid > 0) {
        jorimana.push({
          member: m,
          avatarUrl,
          value: summary.totalFinePaid,
          primarySub: `${finedPaidMonths || 1} late cycles settled`,
          secondarySub: `Total Charged ${formatBDT(summary.totalFineCharged)}`,
        });
      }

      // 4. Max Jorimana Due (Pending Late Fines)
      if (summary.totalFinePending > 0) {
        jorimana_due.push({
          member: m,
          avatarUrl,
          value: summary.totalFinePending,
          primarySub: `${fineDueMonths || summary.unpaidMonthsCount} overdue mos`,
          secondarySub: `Total Due ${formatBDT(summary.totalOutstanding)}`,
        });
      }
    });

    const sortDesc = (arr: RankedMemberEntry[]) =>
      arr.sort((a, b) => b.value - a.value || a.member.member_code.localeCompare(b.member.member_code));

    return {
      joma: sortDesc(joma),
      due: sortDesc(due),
      jorimana: sortDesc(jorimana),
      jorimana_due: sortDesc(jorimana_due),
    };
  }, [members, monthlyDues]);

  const activeMeta = CATEGORY_META.find((c) => c.id === activeCategory) || CATEGORY_META[0];
  const activeList = rankingsByCategory[activeCategory];
  const maxVal = activeList.length > 0 ? Math.max(1, activeList[0].value) : 1;

  const podiumEntries = activeList.slice(0, 3);
  const restEntries = showAll ? activeList.slice(3) : activeList.slice(3, 8);

  return (
    <section
      aria-label="Club Financial Leaderboards"
      className="surface-card rounded-2xl overflow-hidden"
    >
      {/* Top Header + Segmented Category Switcher */}
      <div className="px-5 py-4 sm:px-6 border-b border-[#233452] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0F1B33] to-[#1D4ED8]/40 border border-[#D6AC62]/40 text-[#F0C56E] flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#F3F6FC] flex items-center gap-2">
              <span>Club Financial Leaderboards</span>
              <span className="text-[11px] font-mono font-normal text-[#9BB0CD]">
                · Live Member Rankings
              </span>
            </h2>
            <p className="text-xs text-[#9BB0CD]">
              Real-time standings for Max Joma, Max Due, Max Jorimana &amp; Jorimana Due
            </p>
          </div>
        </div>

        {/* 4 Category Switcher Tabs */}
        <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#09101D]/70 border border-[#233452] rounded-xl self-start xl:self-auto">
          {CATEGORY_META.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;
            const count = rankingsByCategory[cat.id].length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  setShowAll(false);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#1D4ED8] text-white shadow-xs'
                    : 'text-[#9BB0CD] hover:text-white hover:bg-[#17243C]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : cat.accentText}`} />
                <span>{cat.label}</span>
                <span
                  className={`font-mono text-[10px] tabular-nums ${
                    isSelected ? 'text-blue-100' : 'text-slate-400'
                  }`}
                >
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4-Way #1 Leader Spotlight Bar (Single hairline strip, click any to switch) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#233452] bg-[#0D1726]/70 border-b border-[#233452]">
        {CATEGORY_META.map((cat) => {
          const leader = rankingsByCategory[cat.id][0];
          const isSelected = activeCategory === cat.id;
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategory(cat.id);
                setShowAll(false);
              }}
              className={`p-4 text-left transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                isSelected ? 'bg-[#17243C]/90' : 'hover:bg-[#17243C]/45'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {leader ? (
                  <MemberPortrait
                    name={leader.member.full_name}
                    url={leader.avatarUrl}
                    sizeClass="w-10 h-10"
                    ringClass={cat.ringClass}
                    failed={Boolean(failedImages[leader.member.id])}
                    onError={() => markImageFailed(leader.member.id)}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#17243C] border border-[#233452] flex items-center justify-center shrink-0">
                    <Icon className={`w-4 h-4 ${cat.accentText}`} />
                  </div>
                )}

                <div className="min-w-0">
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider block ${cat.accentText}`}>
                    #1 {cat.label}
                  </span>
                  <span className="text-xs font-bold text-[#F3F6FC] truncate block">
                    {leader ? leader.member.full_name : 'All Settled'}
                  </span>
                  <span className="text-[10px] font-mono text-[#9BB0CD] truncate block">
                    {leader ? `${leader.member.member_code} · ${cat.banglaLabel}` : cat.banglaLabel}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className={`text-sm font-extrabold font-mono tabular-nums block ${cat.accentText}`}>
                  {leader ? formatBDT(leader.value) : '৳0'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Active Leaderboard Content */}
      {activeList.length === 0 ? (
        <div className="py-12 px-6 text-center space-y-2">
          <div className="w-11 h-11 rounded-2xl bg-[#17243C] border border-[#233452] text-[#38BDF8] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#F3F6FC]">{activeMeta.emptyTitle}</h3>
          <p className="text-xs text-[#9BB0CD] max-w-md mx-auto">{activeMeta.emptyDesc}</p>
        </div>
      ) : (
        <div className="p-5 sm:p-6 space-y-5">
          {/* Top 3 Podium Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {podiumEntries.map((entry, idx) => {
              const rank = idx + 1;
              const pct = Math.max(6, Math.round((entry.value / maxVal) * 100));
              const isFirst = rank === 1;
              const badgeRing =
                rank === 1
                  ? 'ring-[#D6AC62] shadow-[0_0_24px_-6px_rgba(214,172,98,0.55)]'
                  : rank === 2
                  ? 'ring-slate-300/75'
                  : 'ring-amber-600/75';
              const medalColor =
                rank === 1
                  ? 'bg-[#D6AC62] text-[#0F1B33]'
                  : rank === 2
                  ? 'bg-slate-200 text-[#0F1B33]'
                  : 'bg-amber-700 text-white';

              return (
                <Link
                  key={entry.member.id}
                  to={`/admin/members/${entry.member.id}`}
                  className={`group rounded-2xl p-4 sm:p-5 border transition-all flex flex-col justify-between gap-4 ${
                    isFirst
                      ? 'bg-gradient-to-br from-[#17243C] via-[#13223D] to-[#0F1B33] border-[#D6AC62]/45 hover:border-[#D6AC62]/80'
                      : 'bg-[#0F1B33]/80 border-[#233452] hover:border-[#38BDF8]/45'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative shrink-0">
                        <MemberPortrait
                          name={entry.member.full_name}
                          url={entry.avatarUrl}
                          sizeClass={isFirst ? 'w-14 h-14' : 'w-12 h-12'}
                          ringClass={badgeRing}
                          failed={Boolean(failedImages[entry.member.id])}
                          onError={() => markImageFailed(entry.member.id)}
                        />
                        <span
                          className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full text-[10px] font-mono font-extrabold flex items-center justify-center ring-2 ring-[#0F1B33] ${medalColor}`}
                        >
                          {rank === 1 ? <Crown className="w-3 h-3" /> : rank}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#9BB0CD]">
                          <span className={activeMeta.accentText}>RANK #{rank}</span>
                          <span>·</span>
                          <span>{entry.member.member_code}</span>
                        </div>
                        <h3 className="text-sm sm:text-base font-extrabold text-[#F3F6FC] truncate group-hover:text-[#38BDF8] transition-colors">
                          {entry.member.full_name}
                        </h3>
                        <p className="text-[11px] text-[#9BB0CD] truncate">
                          {entry.member.designation || 'Member'}
                        </p>
                      </div>
                    </div>

                    <ArrowUpRight className="w-4 h-4 text-[#9BB0CD] group-hover:text-[#38BDF8] shrink-0 transition-colors" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={`text-xl sm:text-2xl font-extrabold font-mono tabular-nums ${activeMeta.accentText}`}>
                        {formatBDT(entry.value)}
                      </span>
                      <span className="text-[11px] font-mono text-[#9BB0CD] text-right">
                        {entry.primarySub}
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-[#09101D] rounded-full overflow-hidden border border-[#233452]">
                      <div
                        style={{ width: `${pct}%` }}
                        className={`h-full rounded-full transition-all duration-300 ${activeMeta.barClass}`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-[#9BB0CD]">
                      <span>{entry.secondarySub}</span>
                      <span className="tabular-nums">{pct}% of leader</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Ranks #4+ Ranked Rows */}
          {restEntries.length > 0 && (
            <div className="rounded-xl border border-[#233452] overflow-hidden divide-y divide-[#233452] bg-[#0D1726]/45">
              {restEntries.map((entry, idx) => {
                const rank = idx + 4;
                const pct = Math.max(4, Math.round((entry.value / maxVal) * 100));
                return (
                  <Link
                    key={entry.member.id}
                    to={`/admin/members/${entry.member.id}`}
                    className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#17243C]/70 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="w-7 text-xs font-mono font-bold text-[#9BB0CD] tabular-nums shrink-0 flex items-center gap-1">
                        <Medal className="w-3 h-3 text-slate-500" />
                        <span>#{rank}</span>
                      </span>

                      <MemberPortrait
                        name={entry.member.full_name}
                        url={entry.avatarUrl}
                        sizeClass="w-10 h-10"
                        ringClass="ring-[#233452]"
                        failed={Boolean(failedImages[entry.member.id])}
                        onError={() => markImageFailed(entry.member.id)}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-[#F3F6FC] truncate">
                            {entry.member.full_name}
                          </span>
                          <span className="text-[10px] font-mono text-[#9BB0CD] shrink-0">
                            {entry.member.member_code}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-[#9BB0CD] truncate">
                          {entry.primarySub} · {entry.secondarySub}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:w-64 justify-between sm:justify-end shrink-0">
                      <div className="flex-1 sm:w-28 h-1.5 bg-[#09101D] rounded-full overflow-hidden border border-[#233452]">
                        <div
                          style={{ width: `${pct}%` }}
                          className={`h-full rounded-full ${activeMeta.barClass}`}
                        />
                      </div>

                      <span className={`text-sm font-extrabold font-mono tabular-nums text-right min-w-[84px] ${activeMeta.accentText}`}>
                        {formatBDT(entry.value)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Expand / Collapse Footer */}
          {activeList.length > 8 && (
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="font-mono text-[#9BB0CD]">
                Showing {showAll ? activeList.length : 8} of {activeList.length} ranked members
              </span>
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="font-semibold text-[#38BDF8] hover:underline cursor-pointer"
              >
                {showAll ? 'Show Top 8 Only' : `View All ${activeList.length} Members`}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
