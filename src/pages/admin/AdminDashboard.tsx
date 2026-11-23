import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useClubData } from '../../hooks/useClubData';
import { useAuth } from '../../hooks/useAuth';
import { AnnouncementCategory, MonthlyDue } from '../../types';
import { FISCAL_YEARS, formatBDT, formatDate, getMonthName, MONTH_NAMES } from '../../utils/formatters';
import { calculateDueBreakdown, computeMemberFinancialSummary, parseLocalDate } from '../../utils/fineCalculator';
import { useLiveLocalGreeting } from '../../hooks/useLocalTimeZone';
import { MetricCard } from '../../components/MetricCard';
import { DashboardClock } from '../../components/DashboardClock';
import { Modal } from '../../components/ui/Modal';
import {
  CollectionTrendStudio,
  PeriodStatusDonut,
  HistoryPieAnalyticsRow,
} from '../../components/DashboardCharts';
import { DashboardLeaderboard } from '../../components/DashboardLeaderboard';
import { PageTransition } from '../../components/ui/MotionPrimitives';
import {
  Users,
  Target,
  Banknote,
  AlertCircle,
  PlusCircle,
  Calendar,
  CheckCircle2,
  ArrowRight,
  CreditCard,
  Landmark,
  Trash2,
  Search,
  Megaphone,
  Send,
  TrendingUp,
} from 'lucide-react';
import { RecordPaymentModal } from '../../components/RecordPaymentModal';

export const AdminDashboard: React.FC = () => {
  const { user, profile, canEditAdmin, isViewer } = useAuth();
  const {
    stats,
    members,
    myMemberRecord,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    monthlyDues,
    monthSummaries,
    totalClubPrincipalCollected,
    totalClubFineCollected,
    totalBankInterest,
    totalBankCharges,
    totalClubExpenses,
    netClubAvailableBalance,
    currentBankBalance,
    pendingBankDeposit,
    bankDepositProgress,
    announcements,
    publishAnnouncement,
    deleteAnnouncement,
    clubMonthlyTarget,
  } = useClubData();

  const greetingInfo = useLiveLocalGreeting();
  const adminDisplayName =
    myMemberRecord?.full_name ||
    profile?.full_name ||
    (typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name) ||
    (user?.email ? user.email.split('@')[0] : 'Admin');

  const [recordPaymentModalOpen, setRecordPaymentModalOpen] = useState(false);
  const [selectedMemberForPayment, setSelectedMemberForPayment] = useState<string | undefined>(undefined);

  // Search State for Pending Contributions
  const [pendingSearch, setPendingSearch] = useState('');

  // Date Range / Period Analytics Filter
  type AnalyticsPreset = 'month' | '6m' | 'year' | 'all' | 'custom';
  const [analyticsPreset, setAnalyticsPreset] = useState<AnalyticsPreset>('month');
  const [customStartDate, setCustomStartDate] = useState<string>(() => `${new Date().getFullYear()}-01-01`);
  const [customEndDate, setCustomEndDate] = useState<string>(() => new Date().toISOString().substring(0, 10));

  // Admin Announcements Publish Modal State
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annCategory, setAnnCategory] = useState<AnnouncementCategory>('general');
  const [annSaving, setAnnSaving] = useState(false);
  const [annFeedback, setAnnFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deletingAnnId, setDeletingAnnId] = useState<string | null>(null);

  // Yearly cumulative member collections
  const yearlyMemberCollections = useMemo(() => {
    const byYear = new Map<number, { principal: number; fine: number; total: number }>();
    monthlyDues.forEach((d) => {
      const principal = Number(d.amount_paid || 0);
      const fine = Number(d.fine_paid || 0);
      if (principal <= 0 && fine <= 0) return;
      const cur = byYear.get(d.year) || { principal: 0, fine: 0, total: 0 };
      cur.principal += principal;
      cur.fine += fine;
      cur.total += principal + fine;
      byYear.set(d.year, cur);
    });
    return Array.from(byYear.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, vals]) => ({ year, ...vals }));
  }, [monthlyDues]);

  // Selected-year monthly fines collected array (index 0..11)
  const monthlyFinesByMonth = useMemo(() => {
    const totals = Array<number>(12).fill(0);
    monthlyDues.forEach((d) => {
      if (d.year === selectedYear && d.month >= 1 && d.month <= 12) {
        totals[d.month - 1] += Number(d.fine_paid || 0);
      }
    });
    return totals;
  }, [monthlyDues, selectedYear]);

  // Real cumulative all-time outstanding dues across all active members
  const cumulativeOutstandingTotal = useMemo(() => {
    const now = new Date();
    return members
      .filter((m) => m.status === 'active')
      .reduce((sum, m) => {
        const mDues = monthlyDues.filter((d) => d.member_id === m.id);
        return sum + computeMemberFinancialSummary(m, mDues, now).totalOutstanding;
      }, 0);
  }, [members, monthlyDues]);

  // Real database period analytics + prior-period growth comparison
  const periodAnalytics = useMemo(() => {
    const paidRows = monthlyDues.filter((d) => Number(d.amount_paid || 0) + Number(d.fine_paid || 0) > 0);
    const sumDues = (rows: MonthlyDue[]) =>
      rows.reduce((s, d) => s + Number(d.amount_paid || 0) + Number(d.fine_paid || 0), 0);

    if (analyticsPreset === 'month') {
      const currentRows = paidRows.filter((d) => d.year === selectedYear && d.month === selectedMonth);
      const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
      const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
      const prevRows = paidRows.filter((d) => d.year === prevYear && d.month === prevMonth);
      const collected = sumDues(currentRows);
      const prevCollected = sumDues(prevRows);
      const deltaPct =
        prevCollected > 0 ? Math.round(((collected - prevCollected) / prevCollected) * 100) : null;
      const target = clubMonthlyTarget;
      return {
        label: `${getMonthName(selectedMonth)} ${selectedYear}`,
        comparisonLabel: `vs ${getMonthName(prevMonth)} ${prevYear}`,
        collected,
        target,
        rate: target > 0 ? Math.round((collected / target) * 100) : 0,
        txCount: currentRows.length,
        deltaPct,
      };
    }

    if (analyticsPreset === '6m') {
      const endKey = selectedYear * 12 + (selectedMonth - 1);
      const startKey = endKey - 5;
      const prevStartKey = startKey - 6;
      const prevEndKey = startKey - 1;
      const currentRows = paidRows.filter((d) => {
        const k = d.year * 12 + (d.month - 1);
        return k >= startKey && k <= endKey;
      });
      const prevRows = paidRows.filter((d) => {
        const k = d.year * 12 + (d.month - 1);
        return k >= prevStartKey && k <= prevEndKey;
      });
      const collected = sumDues(currentRows);
      const prevCollected = sumDues(prevRows);
      const deltaPct =
        prevCollected > 0 ? Math.round(((collected - prevCollected) / prevCollected) * 100) : null;
      const target = clubMonthlyTarget * 6;
      return {
        label: `Last 6 Months (ending ${getMonthName(selectedMonth)} ${selectedYear})`,
        comparisonLabel: 'vs prior 6 months',
        collected,
        target,
        rate: target > 0 ? Math.round((collected / target) * 100) : 0,
        txCount: currentRows.length,
        deltaPct,
      };
    }

    if (analyticsPreset === 'year') {
      const currentRows = paidRows.filter((d) => d.year === selectedYear);
      const prevRows = paidRows.filter((d) => d.year === selectedYear - 1);
      const collected = sumDues(currentRows);
      const prevCollected = sumDues(prevRows);
      const deltaPct =
        prevCollected > 0 ? Math.round(((collected - prevCollected) / prevCollected) * 100) : null;
      const target = monthSummaries.reduce((s, m) => s + m.target, 0);
      return {
        label: `Fiscal Year ${selectedYear}`,
        comparisonLabel: `vs FY ${selectedYear - 1}`,
        collected,
        target,
        rate: target > 0 ? Math.round((collected / target) * 100) : 0,
        txCount: currentRows.length,
        deltaPct,
      };
    }

    if (analyticsPreset === 'custom') {
      const currentRows = paidRows.filter((d) => {
        if (!d.paid_at) return false;
        const iso = d.paid_at.substring(0, 10);
        return (!customStartDate || iso >= customStartDate) && (!customEndDate || iso <= customEndDate);
      });
      const collected = sumDues(currentRows);
      return {
        label: `${customStartDate || '...'} to ${customEndDate || '...'}`,
        comparisonLabel: 'Custom paid date window',
        collected,
        target: 0,
        rate: 100,
        txCount: currentRows.length,
        deltaPct: null as number | null,
      };
    }

    const collected = sumDues(paidRows);
    return {
      label: 'All-Time Club Ledger',
      comparisonLabel: `${yearlyMemberCollections.length} fiscal years`,
      collected,
      target: 0,
      rate: 100,
      txCount: paidRows.length,
      deltaPct: null as number | null,
    };
  }, [
    analyticsPreset,
    monthlyDues,
    selectedMonth,
    selectedYear,
    clubMonthlyTarget,
    monthSummaries,
    customStartDate,
    customEndDate,
    yearlyMemberCollections.length,
  ]);

  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (annSaving) return;
    setAnnSaving(true);
    setAnnFeedback(null);
    const res = await publishAnnouncement({
      title: annTitle,
      body: annBody,
      category: annCategory,
    });
    setAnnSaving(false);
    if (res.success) {
      setAnnTitle('');
      setAnnBody('');
      setAnnCategory('general');
      setAnnFeedback({ type: 'success', text: 'Announcement published & sent to all members!' });
      setTimeout(() => {
        setAnnouncementModalOpen(false);
        setAnnFeedback(null);
      }, 900);
    } else {
      setAnnFeedback({ type: 'error', text: res.error || 'Failed to publish announcement.' });
    }
  };

  // Evaluate ALL active members eligible in (selectedYear, selectedMonth)
  const effectiveMonthDues = useMemo<MonthlyDue[]>(() => {
    const existingByMember = new Map<string, MonthlyDue>();
    monthlyDues.forEach((d) => {
      if (d.month === selectedMonth && d.year === selectedYear) {
        existingByMember.set(d.member_id, d);
      }
    });

    const selectedPeriodKey = selectedYear * 100 + selectedMonth;
    const list: MonthlyDue[] = [];

    members
      .filter((m) => m.status === 'active')
      .forEach((m) => {
        const existing = existingByMember.get(m.id);
        if (existing) {
          list.push(existing);
          return;
        }
        const joinParsed = parseLocalDate(m.join_date || '2024-04-01');
        const joinPeriodKey = joinParsed.getFullYear() * 100 + (joinParsed.getMonth() + 1);
        if (joinPeriodKey <= selectedPeriodKey) {
          list.push({
            id: `virtual-${selectedYear}-${selectedMonth}-${m.id}`,
            member_id: m.id,
            member: m,
            month: selectedMonth,
            year: selectedYear,
            amount_due: m.monthly_contribution || (m.shares_count || 1) * 500,
            amount_paid: 0,
            fine_due: 0,
            fine_paid: 0,
            status: 'unpaid',
            paid_at: null,
          });
        }
      });

    return list;
  }, [members, monthlyDues, selectedMonth, selectedYear]);

  const unpaidDues = useMemo(() => {
    const now = new Date();
    const q = pendingSearch.trim().toLowerCase();
    return effectiveMonthDues.filter((d) => {
      const bd = calculateDueBreakdown(d, d.member?.shares_count, now);
      if (bd.isFullySettled) return false;
      if (!q) return true;
      const name = (d.member?.full_name || '').toLowerCase();
      const code = (d.member?.member_code || '').toLowerCase();
      const phone = (d.member?.phone || '').toLowerCase();
      return name.includes(q) || code.includes(q) || phone.includes(q);
    });
  }, [effectiveMonthDues, pendingSearch]);

  // Top 12 recent member payments
  const recentPayments = useMemo(
    () =>
      [...monthlyDues]
        .filter((d) => d.amount_paid > 0 && d.paid_at)
        .sort((a, b) => (b.paid_at || '').localeCompare(a.paid_at || ''))
        .slice(0, 12),
    [monthlyDues]
  );

  return (
    <PageTransition className="space-y-6">
      {/* 1. EXECUTIVE COMMAND HEADER */}
      <section className="surface-card rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#38BDF8]">
              <span role="img" aria-hidden="true">
                {greetingInfo.celestialEmoji}
              </span>
              <span>
                {greetingInfo.periodLabel} · {greetingInfo.zoneCity} Time ({greetingInfo.shortZone})
              </span>
              <span className="text-[#233452]" aria-hidden="true">|</span>
              <span className="font-mono text-[#F0C56E]">
                {isViewer ? 'Bondhon 2017 · Executive Overview' : 'Bondhon 2017 Executive Console'}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#F3F6FC] truncate">
              {greetingInfo.greeting},{' '}
              <span className="text-[#38BDF8]">{adminDisplayName}!</span>
            </h1>

            <p className="text-xs text-[#9BB0CD]">
              Active Fiscal Period:{' '}
              <strong className="text-slate-200">{getMonthName(selectedMonth)} {selectedYear}</strong>
              {' · '}Real-time club financial overview
            </p>
          </div>

          <DashboardClock />
        </div>

        {/* Period Selector & Primary Actions */}
        <div className="pt-4 border-t border-[#233452] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex items-center bg-[#09101D]/80 border border-[#233452] rounded-xl divide-x divide-[#233452] overflow-hidden self-start">
            <label className="flex items-center gap-1.5 pl-3 pr-2 py-2 cursor-pointer">
              <Calendar className="w-3.5 h-3.5 text-[#60A5FA] shrink-0" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                aria-label="Select month"
                className="text-xs font-semibold text-[#F3F6FC] bg-transparent focus:outline-hidden cursor-pointer pr-1"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1} className="bg-[#111B2E] text-[#F3F6FC]">
                    {name}
                  </option>
                ))}
              </select>
            </label>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              aria-label="Select year"
              className="px-3 py-2 text-xs font-semibold font-mono tabular-nums text-[#F3F6FC] bg-transparent focus:outline-hidden cursor-pointer"
            >
              {FISCAL_YEARS.map((yr) => (
                <option key={yr} value={yr} className="bg-[#111B2E] text-[#F3F6FC]">
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {canEditAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAnnFeedback(null);
                  setAnnouncementModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-[#F0C56E] bg-[#17243C] hover:bg-[#1E314A] border border-[#D6AC62]/35 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>Publish Notice</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedMemberForPayment(undefined);
                  setRecordPaymentModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-xl shadow-xs transition-colors cursor-pointer whitespace-nowrap"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Record Payment</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 2. COMPACT SONALI BANK RESERVE STRIP */}
      <section className="surface-card rounded-2xl px-5 py-4 sm:px-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#17243C] border border-[#223862] text-[#D6AC62] flex items-center justify-center shrink-0">
            <Landmark className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs sm:text-sm font-bold text-[#F3F6FC] block truncate">
              Sonali Bank PLC Reserve
            </span>
            <span className="text-[11px] font-mono text-[#9BB0CD] block truncate">
              A/C 2102201027292 · Bhedarganj Branch
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono tabular-nums">
          <div>
            <span className="text-[10px] font-sans uppercase tracking-wider text-[#9BB0CD] block">
              Net Available
            </span>
            <span className="text-sm font-bold text-[#38BDF8]">
              {formatBDT(netClubAvailableBalance)}
            </span>
          </div>
          <div className="hidden sm:block h-7 w-px bg-[#233452]" />
          <div>
            <span className="text-[10px] font-sans uppercase tracking-wider text-[#9BB0CD] block">
              Bank Cash
            </span>
            <span className="text-sm font-bold text-[#F3F6FC]">
              {formatBDT(currentBankBalance)}
            </span>
          </div>
          <div className="hidden sm:block h-7 w-px bg-[#233452]" />
          <div>
            <span className="text-[10px] font-sans uppercase tracking-wider text-[#9BB0CD] block">
              Cash in Hand
            </span>
            <span className="text-sm font-bold text-[#F0C56E]">
              {formatBDT(pendingBankDeposit)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-4 shrink-0">
          <div className="flex items-center gap-2.5 w-36 sm:w-44">
            <div className="flex-1 h-1.5 bg-[#17243C] rounded-full overflow-hidden border border-[#233452]">
              <div
                style={{ width: `${bankDepositProgress}%` }}
                className="h-full bg-[#38BDF8] rounded-full transition-all duration-300"
              />
            </div>
            <span className="text-[11px] font-mono font-bold text-[#60A5FA] tabular-nums shrink-0">
              {bankDepositProgress}%
            </span>
          </div>

          <Link
            to="/admin/treasury"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#60A5FA] hover:underline whitespace-nowrap shrink-0"
          >
            <span>Full Treasury Statement</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* 3. ANALYTICS HUB & PERIOD FILTERS */}
      <section className="space-y-4">
        <div className="surface-card rounded-2xl p-4 sm:px-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[#F3F6FC]">
              Period Snapshot &amp; Financial Analytics — {periodAnalytics.label}
            </h2>
            <p className="text-[11px] text-[#9BB0CD] mt-0.5">
              Live figures · Cumulative Active Member Dues Pending:{' '}
              <strong className="font-mono text-rose-400 tabular-nums">{formatBDT(cumulativeOutstandingTotal)}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 max-w-full overflow-x-auto">
            <div className="inline-flex items-center p-1 bg-[#09101D]/70 border border-[#233452] rounded-xl text-[11px] font-semibold whitespace-nowrap">
              {(
                [
                  { id: 'month', label: 'This Month' },
                  { id: '6m', label: 'Last 6 Mos' },
                  { id: 'year', label: `FY ${selectedYear}` },
                  { id: 'all', label: 'All Time' },
                  { id: 'custom', label: 'Custom Range' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAnalyticsPreset(opt.id)}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    analyticsPreset === opt.id
                      ? 'bg-[#1D4ED8] text-white shadow-2xs'
                      : 'text-[#9BB0CD] hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {analyticsPreset === 'custom' && (
          <div className="surface-card p-3.5 rounded-xl flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>Filter Paid Transactions By Date:</span>
            </span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[#17243C] border border-[#233452] font-mono text-xs text-white"
            />
            <span className="text-[#9BB0CD]">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[#17243C] border border-[#233452] font-mono text-xs text-white"
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            label={analyticsPreset === 'month' ? 'Monthly Collected' : 'Filtered Collected'}
            value={formatBDT(periodAnalytics.collected)}
            subLabel={
              analyticsPreset === 'month'
                ? `${stats.paidMembersCount} paid · ${periodAnalytics.comparisonLabel}`
                : `${periodAnalytics.txCount} settled entries · ${periodAnalytics.comparisonLabel}`
            }
            icon={Banknote}
            accent="sapphire"
            trend={
              periodAnalytics.deltaPct !== null
                ? {
                    positive: periodAnalytics.deltaPct >= 0,
                    text: `${periodAnalytics.deltaPct >= 0 ? '+' : ''}${periodAnalytics.deltaPct}%`,
                  }
                : {
                    positive: stats.collectionRate >= 70,
                    text: `${stats.collectionRate}% rate`,
                  }
            }
          />
          <MetricCard
            label={analyticsPreset === 'month' ? 'Monthly Target' : periodAnalytics.target > 0 ? 'Period Target' : 'Avg Per Entry'}
            value={
              periodAnalytics.target > 0
                ? formatBDT(periodAnalytics.target)
                : formatBDT(periodAnalytics.txCount > 0 ? Math.round(periodAnalytics.collected / periodAnalytics.txCount) : 0)
            }
            subLabel={
              periodAnalytics.target > 0
                ? `${periodAnalytics.rate}% target attainment`
                : `${periodAnalytics.txCount} payment transactions`
            }
            icon={Target}
            accent="gold"
          />
          <MetricCard
            label={analyticsPreset === 'month' ? 'Month Outstanding' : 'All-Time Outstanding'}
            value={formatBDT(analyticsPreset === 'month' ? stats.totalOutstanding : cumulativeOutstandingTotal)}
            subLabel={
              analyticsPreset === 'month'
                ? `${stats.unpaidMembersCount} unpaid · ${stats.partialMembersCount} partial (All-time: ${formatBDT(cumulativeOutstandingTotal)})`
                : 'Real cumulative unpaid principal + late fines'
            }
            icon={AlertCircle}
            accent="rose"
            trend={{
              positive: (analyticsPreset === 'month' ? stats.totalOutstanding : cumulativeOutstandingTotal) === 0,
              text: (analyticsPreset === 'month' ? stats.totalOutstanding : cumulativeOutstandingTotal) === 0 ? 'Settled' : 'Pending',
            }}
          />
          <MetricCard
            label="Active Members"
            value={stats.activeMembers}
            subLabel={`${stats.totalMembers} registered · ${stats.inactiveMembers} inactive`}
            icon={Users}
            accent="navy"
          />
        </div>

        {/* Interactive Charts (8 + 4) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <CollectionTrendStudio
            selectedYear={selectedYear}
            monthSummaries={monthSummaries}
            monthlyFinesByMonth={monthlyFinesByMonth}
            yearlyCollections={yearlyMemberCollections}
            periodLabel={periodAnalytics.label}
          />

          <PeriodStatusDonut
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            collectionRate={stats.collectionRate}
            paidCount={stats.paidMembersCount}
            partialCount={stats.partialMembersCount}
            unpaidCount={stats.unpaidMembersCount}
          />
        </div>

        {/* Historical Financial Breakdown Pies (6 + 6) */}
        <HistoryPieAnalyticsRow
          currentBankBalance={currentBankBalance}
          cashInHandBalance={pendingBankDeposit}
          totalClubExpenses={totalClubExpenses}
          totalBankCharges={totalBankCharges}
          totalClubPrincipalCollected={totalClubPrincipalCollected}
          totalClubFineCollected={totalClubFineCollected}
          totalBankInterest={totalBankInterest}
          yearlyCollections={yearlyMemberCollections}
        />
      </section>

      {/* 4. CLUB FINANCIAL LEADERBOARDS (Max Joma, Max Due, Max Jorimana, Max Jorimana Due) */}
      <DashboardLeaderboard members={members} monthlyDues={monthlyDues} />

      {/* 5. OPERATIONAL WORKBENCH (Pending Dues + Tabbed Activity Feed) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Pending Contributions */}
        <div className="lg:col-span-6 surface-card rounded-2xl flex flex-col overflow-hidden min-w-0">
          <div className="px-5 py-4 border-b border-[#233452] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#F3F6FC]">
                Pending Contributions ({unpaidDues.length})
              </h3>
              <p className="text-xs text-[#9BB0CD]">
                Unpaid members for {getMonthName(selectedMonth)} {selectedYear}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-44">
                <Search className="w-3.5 h-3.5 text-[#9BB0CD] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={pendingSearch}
                  onChange={(e) => setPendingSearch(e.target.value)}
                  placeholder="Filter member..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-[#17243C] border border-[#233452] rounded-lg text-[#F3F6FC] placeholder:text-[#9BB0CD] focus:outline-hidden focus:border-[#1D4ED8]"
                />
              </div>
              <Link
                to="/admin/payments"
                className="text-xs font-semibold text-[#60A5FA] hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <span>Reconcile</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-80 divide-y divide-[#233452]">
            {unpaidDues.length === 0 ? (
              <div className="py-12 px-4 text-center text-xs text-[#9BB0CD]">
                <CheckCircle2 className="w-8 h-8 text-[#60A5FA] mx-auto mb-2" />
                <p className="font-semibold text-slate-200">
                  {pendingSearch
                    ? 'No matching unpaid members found.'
                    : `All active members have settled ${getMonthName(selectedMonth)}!`}
                </p>
              </div>
            ) : (
              unpaidDues.map((due) => {
                const bd = calculateDueBreakdown(due, due.member?.shares_count);
                return (
                  <div
                    key={due.id}
                    className="px-5 py-3 flex items-center justify-between text-xs gap-3 hover:bg-[#17243C]/60 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-mono text-[11px] font-semibold text-[#9BB0CD]">
                          {due.member?.member_code}
                        </span>
                        <span className="text-[#9BB0CD]" aria-hidden="true">·</span>
                        <Link
                          to={`/admin/members/${due.member_id}`}
                          className="font-semibold text-[#F3F6FC] hover:text-[#60A5FA] truncate"
                        >
                          {due.member?.full_name}
                        </Link>
                      </div>
                      <span className="block text-[11px] text-[#9BB0CD] mt-0.5 font-mono truncate">
                        {due.member?.phone || 'No phone'} · {due.member?.shares_count || 1}{' '}
                        {(due.member?.shares_count || 1) > 1 ? 'shares' : 'share'}
                        {bd.fineOutstanding > 0 && ` · Fine +${formatBDT(bd.fineOutstanding)}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="font-mono font-bold text-rose-400 block tabular-nums">
                          {formatBDT(bd.totalOutstanding)}
                        </span>
                        <span className="text-[10px] font-medium text-[#9BB0CD] capitalize">
                          {due.status}
                        </span>
                      </div>
                      {canEditAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMemberForPayment(due.member_id);
                            setRecordPaymentModalOpen(true);
                          }}
                          className="px-3 py-1.5 text-[11px] font-bold text-[#7EB6FF] bg-[#1D4ED8]/15 hover:bg-[#1D4ED8]/25 rounded-lg border border-[#60A5FA]/35 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          + Pay
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Member Payments */}
        <div className="lg:col-span-6 surface-card rounded-2xl flex flex-col overflow-hidden min-w-0">
          <div className="px-5 py-4 border-b border-[#233452] flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-[#F3F6FC]">
                Recent Member Payments ({recentPayments.length})
              </h3>
              <p className="text-xs text-[#9BB0CD]">
                Latest verified dues and fine settlements
              </p>
            </div>

            <Link
              to="/admin/payment-history"
              className="text-xs font-semibold text-[#60A5FA] hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <span>Full Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto max-h-80 divide-y divide-[#233452]">
            {recentPayments.length === 0 ? (
              <div className="py-12 px-4 text-center text-xs text-[#9BB0CD]">
                No recent member payments recorded yet.
              </div>
            ) : (
              recentPayments.map((due) => (
                <div
                  key={due.id}
                  className="px-5 py-3 flex items-center justify-between text-xs gap-3 hover:bg-[#17243C]/60 transition-colors"
                >
                  <div className="min-w-0">
                    <Link
                      to={`/admin/members/${due.member_id}`}
                      className="font-semibold text-[#F3F6FC] hover:text-[#60A5FA] block truncate"
                    >
                      {due.member?.full_name || 'Member'}
                    </Link>
                    <span className="text-[11px] text-[#9BB0CD] font-mono">
                      {due.member?.member_code} · {getMonthName(due.month)} {due.year} ·{' '}
                      {due.paid_at ? formatDate(due.paid_at) : 'Paid'}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-[#38BDF8] text-sm block tabular-nums">
                      +{formatBDT(due.amount_paid)}
                    </span>
                    {Number(due.fine_paid || 0) > 0 && (
                      <span className="text-[10px] font-mono text-[#F0C56E] tabular-nums">
                        +{formatBDT(due.fine_paid)} fine
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 6. CLUB ANNOUNCEMENTS BULLETIN BOARD */}
      <section className="surface-card rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#233452] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#D6AC62]/15 text-[#F0C56E] flex items-center justify-center shrink-0">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F3F6FC]">
                Club Announcements ({announcements.length})
              </h3>
              <p className="text-[11px] text-[#9BB0CD]">
                Official notices broadcast to all authenticated club members
              </p>
            </div>
          </div>

          {canEditAdmin && (
            <button
              type="button"
              onClick={() => {
                setAnnFeedback(null);
                setAnnouncementModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Announcement</span>
            </button>
          )}
        </div>

        {announcements.length === 0 ? (
          <div className="py-10 px-5 text-center text-xs text-[#9BB0CD]">
            No club announcements published yet.
          </div>
        ) : (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {announcements.slice(0, 6).map((ann) => (
              <div
                key={ann.id}
                className="p-4 rounded-xl bg-[#0D1726]/70 border border-[#233452] flex flex-col justify-between gap-3 hover:border-[#38BDF8]/35 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                    <span className="font-bold uppercase tracking-wider text-[#F0C56E]">
                      {ann.category}
                    </span>
                    <span className="text-[#9BB0CD]">{formatDate(ann.created_at)}</span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#F3F6FC] line-clamp-1">
                    {ann.title}
                  </h4>
                  <p className="text-[11px] text-[#9BB0CD] line-clamp-3 leading-relaxed">
                    {ann.body}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-[#233452] flex items-center justify-between gap-2 text-[10px] font-mono text-[#9BB0CD]">
                  <span className="truncate">By {ann.author_name}</span>
                  {canEditAdmin &&
                    (deletingAnnId === ann.id ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            deleteAnnouncement(ann.id);
                            setDeletingAnnId(null);
                          }}
                          className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold cursor-pointer"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingAnnId(null)}
                          className="px-1.5 py-0.5 text-[#9BB0CD] text-[10px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeletingAnnId(ann.id)}
                        className="p-1 text-[#9BB0CD] hover:text-rose-400 rounded-md hover:bg-rose-950/30 cursor-pointer shrink-0"
                        title="Delete Announcement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Admin-only Write Modals */}
      {canEditAdmin && (
        <>
          <RecordPaymentModal
            isOpen={recordPaymentModalOpen}
            onClose={() => setRecordPaymentModalOpen(false)}
            initialMemberId={selectedMemberForPayment}
            initialMonth={selectedMonth}
            initialYear={selectedYear}
          />

          <Modal
            isOpen={announcementModalOpen}
            onClose={() => setAnnouncementModalOpen(false)}
            title="Publish Club Announcement"
            subtitle="Broadcasts an instant notification to all club members"
            icon={<Megaphone className="w-4 h-4" />}
            maxWidthClass="max-w-lg"
          >
            <form onSubmit={handlePublishAnnouncement} className="space-y-4 text-xs">
              {annFeedback && (
                <div
                  className={`p-3 rounded-xl border font-semibold ${
                    annFeedback.type === 'success'
                      ? 'bg-[#0369A1]/15 text-[#38BDF8] border-[#38BDF8]/30'
                      : 'bg-rose-950/40 text-rose-300 border-rose-800/40'
                  }`}
                >
                  {annFeedback.text}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-200 mb-1.5">Category</label>
                <select
                  value={annCategory}
                  onChange={(e) => setAnnCategory(e.target.value as AnnouncementCategory)}
                  className="w-full px-3 py-2 bg-[#17243C] border border-[#233452] rounded-xl text-xs text-[#F3F6FC] focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8] cursor-pointer"
                >
                  <option value="general">General Notice</option>
                  <option value="finance">Financial / Dues Notice</option>
                  <option value="event">Club Event / Gathering</option>
                  <option value="urgent">Urgent Alert</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-200 mb-1.5">Headline</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Meeting & November Dues Schedule"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#17243C] border border-[#233452] rounded-xl text-xs text-[#F3F6FC] focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-200 mb-1.5">Announcement Message</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Write the full announcement details for members..."
                  value={annBody}
                  onChange={(e) => setAnnBody(e.target.value)}
                  className="w-full px-3 py-2 bg-[#17243C] border border-[#233452] rounded-xl text-xs text-[#F3F6FC] focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#233452]">
                <button
                  type="button"
                  onClick={() => setAnnouncementModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-300 hover:bg-[#17243C] rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={annSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 font-bold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-xl disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{annSaving ? 'Publishing...' : 'Publish to All Members'}</span>
                </button>
              </div>
            </form>
          </Modal>
        </>
      )}
    </PageTransition>
  );
};
