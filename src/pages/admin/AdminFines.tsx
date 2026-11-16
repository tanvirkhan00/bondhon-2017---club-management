import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useClubData } from '../../hooks/useClubData';
import { MonthlyDue } from '../../types';
import { FISCAL_YEARS, formatBDT, formatDate, getMonthName, MONTH_NAMES } from '../../utils/formatters';
import {
  buildMemberCompleteLedger,
  calculateDueBreakdown,
  FINE_PER_SHARE,
  isAfterMonthDeadline,
  MonthlyDueWithMeta,
} from '../../utils/fineCalculator';
import {
  AlertTriangle,
  CheckCircle2,
  Search,
  PlusCircle,
  Users,
  Receipt,
  X,
  AlertCircle,
  Ban,
} from 'lucide-react';

type FineFilterStatus = 'all' | 'pending' | 'paid' | 'waived';

export const AdminFines: React.FC = () => {
  const {
    members,
    monthlyDues,
    selectedMonth,
    selectedYear,
    recordFinePayment,
    waiveMemberFine,
  } = useClubData();

  const [activeTab, setActiveTab] = useState<'sheet' | 'members'>('sheet');
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [fineStatusFilter, setFineStatusFilter] = useState<FineFilterStatus>('all');

  // Entry / Clear Fine Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [formMemberId, setFormMemberId] = useState<string>(members[0]?.id || '');
  const [formMonth, setFormMonth] = useState<number>(selectedMonth);
  const [formYear, setFormYear] = useState<number>(selectedYear);
  const [formFineDue, setFormFineDue] = useState<number>(50);
  const [formFinePaid, setFormFinePaid] = useState<number>(50);
  const [formClearPrincipal, setFormClearPrincipal] = useState<boolean>(true);
  const [formPrincipalPaid, setFormPrincipalPaid] = useState<number>(500);
  const [formPaidDate, setFormPaidDate] = useState<string>(
    new Date().toISOString().substring(0, 10)
  );
  const [formNotes, setFormNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const memberMap = useMemo(() => {
    const map = new Map<string, (typeof members)[number]>();
    members.forEach((m) => map.set(m.id, m));
    return map;
  }, [members]);

  // Complete ledgers across all active members (includes unentered overdue months)
  const allEffectiveDues = useMemo<MonthlyDueWithMeta[]>(() => {
    const now = new Date();
    const list: MonthlyDueWithMeta[] = [];
    const seenMemberIds = new Set<string>();

    members.forEach((m) => {
      seenMemberIds.add(m.id);
      const realDues = monthlyDues.filter((d) => d.member_id === m.id);
      list.push(...buildMemberCompleteLedger(m, realDues, now));
    });

    monthlyDues.forEach((d) => {
      if (!seenMemberIds.has(d.member_id)) {
        list.push({ ...d, isVirtual: false });
      }
    });

    return list;
  }, [members, monthlyDues]);

  // All due rows with fine activity (either explicit fine_due/fine_paid/fine_waived or auto-late unpaid after 12th)
  const fineRows = useMemo(() => {
    return allEffectiveDues
      .map((due) => {
        const mem = due.member || memberMap.get(due.member_id);
        const shares = mem?.shares_count || 1;
        const bd = calculateDueBreakdown(due, shares);
        const hasAnyFineContext =
          bd.fineDue > 0 || bd.finePaid > 0 || Boolean(due.fine_waived) || bd.isLate;
        return { due, member: mem, breakdown: bd, hasAnyFineContext };
      })
      .filter((item) => item.hasAnyFineContext)
      .sort((a, b) => b.due.year * 100 + b.due.month - (a.due.year * 100 + a.due.month));
  }, [allEffectiveDues, memberMap]);

  // Aggregate KPIs across all fine records
  const fineKpis = useMemo(() => {
    let totalFineCharged = 0;
    let totalFineCollected = 0;
    let totalFinePending = 0;
    let totalCombinedOutstanding = 0;
    let pendingFineCount = 0;

    allEffectiveDues.forEach((due) => {
      const mem = due.member || memberMap.get(due.member_id);
      const bd = calculateDueBreakdown(due, mem?.shares_count || 1);
      totalFineCharged += bd.fineDue;
      totalFineCollected += bd.finePaid;
      totalFinePending += bd.fineOutstanding;
      totalCombinedOutstanding += bd.totalOutstanding;
      if (bd.fineOutstanding > 0) pendingFineCount += 1;
    });

    return {
      totalFineCharged,
      totalFineCollected,
      totalFinePending,
      totalCombinedOutstanding,
      pendingFineCount,
    };
  }, [allEffectiveDues, memberMap]);

  // Member-wise fine & due summary
  const memberFineSummaries = useMemo(() => {
    return members
      .map((m) => {
        const mDues = allEffectiveDues.filter((d) => d.member_id === m.id);
        let fineCharged = 0;
        let finePaid = 0;
        let finePending = 0;
        let principalPaid = 0;
        let principalPending = 0;
        let finedMonths = 0;

        mDues.forEach((d) => {
          const bd = calculateDueBreakdown(d, m.shares_count);
          fineCharged += bd.fineDue;
          finePaid += bd.finePaid;
          finePending += bd.fineOutstanding;
          principalPaid += bd.principalPaid;
          principalPending += bd.principalOutstanding;
          if (bd.fineDue > 0 || bd.finePaid > 0) finedMonths += 1;
        });

        return {
          member: m,
          finedMonths,
          fineCharged,
          finePaid,
          finePending,
          principalPaid,
          principalPending,
          totalOutstanding: principalPending + finePending,
        };
      })
      .filter((row) => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        return (
          row.member.full_name.toLowerCase().includes(q) ||
          row.member.member_code.toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          b.finePending - a.finePending ||
          b.finePaid - a.finePaid ||
          a.member.member_code.localeCompare(b.member.member_code)
      );
  }, [members, allEffectiveDues, searchQuery]);

  // Filtered ledger rows for Tab 1
  const filteredFineRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return fineRows.filter(({ due, member, breakdown }) => {
      const name = member?.full_name || '';
      const code = member?.member_code || '';
      const matchSearch =
        !q || name.toLowerCase().includes(q) || code.toLowerCase().includes(q);
      const matchYear = yearFilter === 'all' || due.year === Number(yearFilter);
      const matchMonth = monthFilter === 'all' || due.month === Number(monthFilter);

      let matchStatus = true;
      if (fineStatusFilter === 'pending') {
        matchStatus = breakdown.fineOutstanding > 0 && !due.fine_waived;
      } else if (fineStatusFilter === 'paid') {
        matchStatus = breakdown.finePaid > 0 && breakdown.fineOutstanding === 0;
      } else if (fineStatusFilter === 'waived') {
        matchStatus = Boolean(due.fine_waived);
      }

      return matchSearch && matchYear && matchMonth && matchStatus;
    });
  }, [fineRows, searchQuery, yearFilter, monthFilter, fineStatusFilter]);

  const years = useMemo(() => {
    const set = new Set<number>([...FISCAL_YEARS, new Date().getFullYear()]);
    monthlyDues.forEach((d) => {
      if (d.year > 2000) set.add(d.year);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [monthlyDues]);

  // Sync modal defaults whenever member/month/year changes while modal is open
  useEffect(() => {
    if (!modalOpen || !formMemberId) return;
    const mem = members.find((m) => m.id === formMemberId);
    if (!mem) return;

    const existing = monthlyDues.find(
      (d) => d.member_id === formMemberId && d.month === formMonth && d.year === formYear
    );
    const shares = mem.shares_count || 1;
    const standardFine = shares * FINE_PER_SHARE;
    const principalDue = existing?.amount_due ?? mem.monthly_contribution ?? shares * 500;

    if (existing) {
      const bd = calculateDueBreakdown(existing, shares);
      const suggestedFine = bd.fineDue > 0 ? bd.fineDue : standardFine;
      setFormFineDue(suggestedFine);
      setFormFinePaid(suggestedFine);
      setFormPrincipalPaid(principalDue);
      setFormClearPrincipal(existing.status !== 'paid');
    } else {
      const isLate = isAfterMonthDeadline(formMonth, formYear);
      const suggestedFine = isLate ? standardFine : standardFine;
      setFormFineDue(suggestedFine);
      setFormFinePaid(suggestedFine);
      setFormPrincipalPaid(principalDue);
      setFormClearPrincipal(true);
    }
  }, [modalOpen, formMemberId, formMonth, formYear, members, monthlyDues]);

  const openEntryModal = (memberId?: string, due?: MonthlyDue) => {
    setFeedback(null);
    if (due) {
      setFormMemberId(due.member_id);
      setFormMonth(due.month);
      setFormYear(due.year);
    } else {
      setFormMemberId(memberId || members[0]?.id || '');
      setFormMonth(selectedMonth);
      setFormYear(selectedYear);
    }
    setFormPaidDate(new Date().toISOString().substring(0, 10));
    setFormNotes('');
    setModalOpen(true);
  };

  const handleClearBothSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMemberId) return;
    setSaving(true);
    setFeedback(null);

    const res = await recordFinePayment({
      memberId: formMemberId,
      month: formMonth,
      year: formYear,
      fineDue: Number(formFineDue),
      finePaid: Number(formFinePaid),
      clearPrincipal: formClearPrincipal,
      principalPaid: formClearPrincipal ? Number(formPrincipalPaid) : undefined,
      paidAt: formPaidDate ? new Date(formPaidDate).toISOString() : new Date().toISOString(),
      notes: formNotes.trim() || 'জরিমানা ও বকেয়া নিষ্পত্তি',
    });

    setSaving(false);
    if (res.success) {
      setFeedback({
        type: 'success',
        text: 'জরিমানা ও বকেয়া সফলভাবে পরিশোধ হিসেবে আপডেট হয়েছে! সকল ড্যাশবোর্ড ও প্রোফাইল থেকে বকেয়া ক্লিয়ার হয়েছে।',
      });
      setTimeout(() => {
        setModalOpen(false);
        setFeedback(null);
      }, 1200);
    } else {
      setFeedback({
        type: 'error',
        text: res.error || 'সংরক্ষণ করতে সমস্যা হয়েছে।',
      });
    }
  };

  const handleQuickWaive = async (due: MonthlyDueWithMeta) => {
    await waiveMemberFine(due.id, {
      memberId: due.member_id,
      month: due.month,
      year: due.year,
    });
  };

  const selectedFormMember = members.find((m) => m.id === formMemberId);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
            <span>Fines &amp; Due Clearance</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            ৳50/share late fine applies after the 12th of the following collection month
          </p>
        </div>

        <button
          type="button"
          onClick={() => openEntryModal()}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors cursor-pointer self-start sm:self-auto shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Clear Fine / Due</span>
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <span className="text-[11px] font-medium text-slate-500 uppercase">মোট আরোপিত জরিমানা</span>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums mt-1">
            {formatBDT(fineKpis.totalFineCharged)}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            প্রতি শেয়ার/নামে ৫০৳ হারে
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 uppercase">
            মোট জরিমানা আদায় (Collected)
          </span>
          <div className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400 tabular-nums mt-1">
            {formatBDT(fineKpis.totalFineCollected)}
          </div>
          <span className="text-[11px] text-emerald-600 mt-0.5 block">
            ক্লাব তহবিলে জরিমানা জমা
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 uppercase">
            বকেয়া জরিমানা (Pending Fines)
          </span>
          <div className="text-xl font-bold font-mono text-amber-700 dark:text-amber-400 tabular-nums mt-1">
            {formatBDT(fineKpis.totalFinePending)}
          </div>
          <span className="text-[11px] text-amber-600 mt-0.5 block">
            {fineKpis.pendingFineCount}টি মাসিক এন্ট্রিতে বকেয়া
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <span className="text-[11px] font-medium text-rose-700 dark:text-rose-400 uppercase">
            মূল + জরিমানাসহ মোট বকেয়া
          </span>
          <div className="text-xl font-bold font-mono text-rose-700 dark:text-rose-400 tabular-nums mt-1">
            {formatBDT(fineKpis.totalCombinedOutstanding)}
          </div>
          <span className="text-[11px] text-rose-600 mt-0.5 block">
            সকল সদস্যের মোট অপরিশোধিত
          </span>
        </div>
      </div>

      {/* View Tabs & Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start">
            <button
              type="button"
              onClick={() => setActiveTab('sheet')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'sheet'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Monthly Fines ({filteredFineRows.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('members')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'members'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Member Summary</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="সদস্যের নাম বা কোড..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>

            {activeTab === 'sheet' && (
              <>
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="all">সকল মাস</option>
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={`fine-m-${idx + 1}`} value={String(idx + 1)}>
                      {name}
                    </option>
                  ))}
                </select>

                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                >
                  <option value="all">সকল সাল</option>
                  {years.map((y) => (
                    <option key={`fine-y-${y}`} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>

                <select
                  value={fineStatusFilter}
                  onChange={(e) => setFineStatusFilter(e.target.value as FineFilterStatus)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="all">সকল অবস্থা</option>
                  <option value="pending">বকেয়া আছে (Pending)</option>
                  <option value="paid">পরিশোধিত (Cleared)</option>
                  <option value="waived">মওকুফকৃত (Waived)</option>
                </select>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tab 1: Monthly Fine & Due Clearance Sheet */}
      {activeTab === 'sheet' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">মাস ও সাল</th>
                  <th className="py-3 px-4 font-semibold">সদস্য (কোড ও নাম)</th>
                  <th className="py-3 px-4 font-semibold text-right">মূল কিস্তি</th>
                  <th className="py-3 px-4 font-semibold text-right">জরিমানা (৳৫০×নাম)</th>
                  <th className="py-3 px-4 font-semibold text-right">জরিমানা জমা</th>
                  <th className="py-3 px-4 font-semibold text-right">মোট বকেয়া (মূল+জরিমানা)</th>
                  <th className="py-3 px-4 font-semibold text-center">অবস্থা</th>
                  <th className="py-3 px-4 font-semibold text-right">অ্যাকশন (Clear / Waive)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredFineRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      নির্বাচিত ফিল্টারে কোনো বকেয়া জরিমানা বা জরিমানা রেকর্ড পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  filteredFineRows.map(({ due, member, breakdown }) => {
                    const isWaived = Boolean(due.fine_waived);
                    const isCleared = breakdown.isFullySettled;

                    return (
                      <tr key={due.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {getMonthName(due.month)} {due.year}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                              {member?.member_code}
                            </span>
                            {member ? (
                              <Link
                                to={`/admin/members/${member.id}`}
                                className="font-semibold text-slate-900 dark:text-slate-100 hover:text-emerald-700 dark:hover:text-emerald-400"
                              >
                                {member.full_name}
                              </Link>
                            ) : (
                              <span className="font-semibold text-slate-900 dark:text-slate-100">—</span>
                            )}
                            {breakdown.sharesCount > 1 && (
                              <span className="px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[9px] font-bold">
                                {breakdown.sharesCount} Shares
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          <span className="text-slate-700 dark:text-slate-300">
                            {formatBDT(breakdown.principalDue)}
                          </span>
                          <span className="block text-[10px] text-emerald-600">
                            Paid: {formatBDT(breakdown.principalPaid)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-amber-700 dark:text-amber-400">
                          {formatBDT(breakdown.fineDue)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                          {formatBDT(breakdown.finePaid)}
                          {due.fine_paid_at && (
                            <span className="block text-[10px] text-slate-400 font-normal">
                              {formatDate(due.fine_paid_at)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-rose-700 dark:text-rose-400">
                          {breakdown.totalOutstanding > 0 ? formatBDT(breakdown.totalOutstanding) : '৳0'}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {isWaived ? (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold">
                              Waived
                            </span>
                          ) : isCleared ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-semibold">
                              Cleared
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-[10px] font-semibold">
                              Due
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEntryModal(due.member_id, due)}
                              className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{isCleared ? 'Update' : 'Settle'}</span>
                            </button>
                            {!isWaived && breakdown.fineOutstanding > 0 && (
                              <button
                                type="button"
                                onClick={() => handleQuickWaive(due)}
                                className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-amber-700 bg-slate-100 hover:bg-amber-50 dark:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                title="Waive Fine"
                              >
                                <Ban className="w-3 h-3" />
                                <span>Waive</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Tab 2: Member-Wise Fine Summary */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Code</th>
                  <th className="py-3 px-4 font-semibold">Member</th>
                  <th className="py-3 px-4 font-semibold text-center">Shares</th>
                  <th className="py-3 px-4 font-semibold text-center">Fined Months</th>
                  <th className="py-3 px-4 font-semibold text-right">Fines Charged</th>
                  <th className="py-3 px-4 font-semibold text-right">Fines Paid</th>
                  <th className="py-3 px-4 font-semibold text-right">Pending Fines</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Due (Incl. Fine)</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {memberFineSummaries.map((row) => (
                  <tr
                    key={row.member.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {row.member.member_code}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      <Link
                        to={`/admin/members/${row.member.id}`}
                        className="hover:text-emerald-700 dark:hover:text-emerald-400"
                      >
                        {row.member.full_name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {row.member.shares_count} ({formatBDT(row.member.shares_count * FINE_PER_SHARE)}/mo)
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {row.finedMonths}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {formatBDT(row.fineCharged)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                      {formatBDT(row.finePaid)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-amber-700 dark:text-amber-400">
                      {row.finePending > 0 ? formatBDT(row.finePending) : '৳0'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-rose-700 dark:text-rose-400">
                      {row.totalOutstanding > 0 ? formatBDT(row.totalOutstanding) : '৳0'}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEntryModal(row.member.id)}
                        className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg border border-emerald-200 cursor-pointer"
                      >
                        + Clear / Record
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fine Payment & Due Clearance Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Clear Fine &amp; Due
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Settle outstanding late fee and monthly contribution
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                )}
                <span>{feedback.text}</span>
              </div>
            )}

            <form onSubmit={handleClearBothSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Member
                </label>
                <select
                  required
                  value={formMemberId}
                  onChange={(e) => setFormMemberId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.member_code} - {m.full_name} ({m.shares_count} share{m.shares_count > 1 ? 's' : ''} · ৳
                      {m.shares_count * FINE_PER_SHARE} fine)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Billing Month
                  </label>
                  <select
                    value={formMonth}
                    onChange={(e) => setFormMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Year
                  </label>
                  <select
                    value={formYear}
                    onChange={(e) => setFormYear(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  >
                    {FISCAL_YEARS.map((yr) => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fine Amounts */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Fine Due (৳)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formFineDue}
                    onChange={(e) => setFormFineDue(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Fine Paid (৳)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formFinePaid}
                    onChange={(e) => setFormFinePaid(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400"
                  />
                </div>
              </div>

              {/* Principal clearance toggle */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formClearPrincipal}
                    onChange={(e) => setFormClearPrincipal(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                  />
                  <span>
                    Also mark monthly principal as paid (
                    {formatBDT(selectedFormMember?.monthly_contribution || 500)})
                  </span>
                </label>

                {formClearPrincipal && (
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <span className="text-[11px] text-slate-500">Principal Paid (৳):</span>
                    <input
                      type="number"
                      min={0}
                      value={formPrincipalPaid}
                      onChange={(e) => setFormPrincipalPaid(Number(e.target.value))}
                      className="w-32 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs text-right font-bold"
                    />
                  </div>
                )}

                <div className="pt-1 border-t border-slate-200 dark:border-slate-700 flex justify-between text-[11px] font-bold">
                  <span>Total Payment (Principal + Fine):</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-mono">
                    {formatBDT(
                      (formClearPrincipal ? Number(formPrincipalPaid) : 0) + Number(formFinePaid)
                    )}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formPaidDate}
                    onChange={(e) => setFormPaidDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    placeholder="Cash / bKash / Reference"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Confirm Settlement'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
