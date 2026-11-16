import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useClubData } from '../../hooks/useClubData';
import { BankDeposit, MonthlyDue } from '../../types';
import { FISCAL_YEARS, formatBDT, formatDate, getMonthName, MONTH_NAMES } from '../../utils/formatters';
import { calculateDueBreakdown, parseLocalDate } from '../../utils/fineCalculator';
import { MetricCard } from '../../components/MetricCard';
import { StatusBadge } from '../../components/StatusBadge';
import {
  Users,
  Target,
  Banknote,
  AlertCircle,
  PlusCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  CreditCard,
  Landmark,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';
import { RecordPaymentModal } from '../../components/RecordPaymentModal';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const AdminDashboard: React.FC = () => {
  const {
    stats,
    members,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    monthlyDues,
    monthSummaries,
    bankDeposits,
    totalClubPrincipalCollected,
    totalClubFineCollected,
    totalClubCollected,
    totalBankDeposited,
    pendingBankDeposit,
    bankDepositProgress,
    addBankDeposit,
    updateBankDeposit,
    deleteBankDeposit,
  } = useClubData();

  const [recordPaymentModalOpen, setRecordPaymentModalOpen] = useState(false);
  const [selectedMemberForPayment, setSelectedMemberForPayment] = useState<string | undefined>(undefined);

  // Sonali Bank Deposit Modal State
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState<BankDeposit | null>(null);
  const [bankAmount, setBankAmount] = useState<number>(0);
  const [bankDate, setBankDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [bankRef, setBankRef] = useState<string>('');
  const [bankNotes, setBankNotes] = useState<string>('');
  const [bankSaving, setBankSaving] = useState(false);
  const [bankFeedback, setBankFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteDepositId, setDeleteDepositId] = useState<string | null>(null);

  // Evaluate ALL active members eligible in (selectedYear, selectedMonth) — fixes 0-row blind spot
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
    return effectiveMonthDues.filter((d) => {
      const bd = calculateDueBreakdown(d, d.member?.shares_count, now);
      return !bd.isFullySettled;
    });
  }, [effectiveMonthDues]);

  const recentPayments = useMemo(
    () =>
      [...monthlyDues]
        .filter((d) => d.amount_paid > 0 && d.paid_at)
        .sort((a, b) => (b.paid_at || '').localeCompare(a.paid_at || ''))
        .slice(0, 6),
    [monthlyDues]
  );

  // Recharts Data: Monthly Collection Trends for Selected Year
  const chartData = monthSummaries.map((m) => ({
    name: m.shortLabel,
    Target: m.target,
    Collected: m.collected,
    Outstanding: m.outstanding,
  }));

  // Recharts Data: Paid vs Unpaid Pie
  const pieData = [
    { name: 'Paid', value: stats.paidMembersCount, color: '#059669' },
    { name: 'Partial', value: stats.partialMembersCount, color: '#d97706' },
    { name: 'Unpaid', value: stats.unpaidMembersCount, color: '#dc2626' },
  ].filter((p) => p.value > 0);

  const openAddDepositModal = () => {
    setEditingDeposit(null);
    setBankAmount(pendingBankDeposit > 0 ? pendingBankDeposit : 0);
    setBankDate(new Date().toISOString().substring(0, 10));
    setBankRef('');
    setBankNotes('');
    setBankFeedback(null);
    setBankModalOpen(true);
  };

  const openEditDepositModal = (deposit: BankDeposit) => {
    setEditingDeposit(deposit);
    setBankAmount(Number(deposit.amount || 0));
    setBankDate((deposit.deposited_at || new Date().toISOString()).substring(0, 10));
    setBankRef(deposit.reference_no || '');
    setBankNotes(deposit.notes || '');
    setBankFeedback(null);
    setBankModalOpen(true);
  };

  const handleSaveDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBankSaving(true);
    setBankFeedback(null);

    const res = editingDeposit
      ? await updateBankDeposit(editingDeposit.id, {
          amount: Number(bankAmount),
          deposited_at: bankDate,
          reference_no: bankRef || null,
          notes: bankNotes || null,
        })
      : await addBankDeposit({
          amount: Number(bankAmount),
          deposited_at: bankDate,
          reference_no: bankRef,
          notes: bankNotes,
        });

    setBankSaving(false);

    if (res.success) {
      setBankFeedback({
        type: 'success',
        text: editingDeposit
          ? 'Sonali Bank deposit record updated.'
          : 'Sonali Bank deposit recorded successfully.',
      });
      setTimeout(() => {
        setBankModalOpen(false);
        setBankFeedback(null);
      }, 900);
    } else {
      setBankFeedback({
        type: 'error',
        text: res.error || 'Failed to save bank deposit.',
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner & Global Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Administrative Financial Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time analytics for Bondhon 2017 · Currency: BDT (৳)
          </p>
        </div>

        {/* Global Month & Year Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-transparent focus:outline-hidden cursor-pointer"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1} className="dark:bg-slate-900">
                  {name}
                </option>
              ))}
            </select>
          </div>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 shadow-2xs focus:outline-hidden cursor-pointer"
          >
            {FISCAL_YEARS.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setSelectedMemberForPayment(undefined);
              setRecordPaymentModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all shrink-0 cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>+ Record Payment</span>
          </button>

          <Link
            to="/admin/fines"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 rounded-lg shadow-2xs transition-colors shrink-0"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Fines Sheet</span>
          </Link>

          <Link
            to="/admin/payments"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg shadow-2xs transition-colors shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Monthly Dues Sheet</span>
          </Link>
        </div>
      </div>

      {/* 4 Primary Monthly Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3.5">
        <MetricCard
          label="Total Members"
          value={stats.totalMembers}
          subLabel={`${stats.activeMembers} active · ${stats.inactiveMembers} inactive`}
          icon={Users}
        />
        <MetricCard
          label="Monthly Target"
          value={formatBDT(stats.monthlyTarget)}
          subLabel={`${getMonthName(selectedMonth)} ${selectedYear}`}
          icon={Target}
        />
        <MetricCard
          label="Total Collected"
          value={formatBDT(stats.totalCollected)}
          subLabel={`${stats.paidMembersCount} members fully paid`}
          icon={Banknote}
          trend={{
            positive: stats.collectionRate >= 70,
            text: `${stats.collectionRate}% collected`,
          }}
        />
        <MetricCard
          label="Outstanding Dues"
          value={formatBDT(stats.totalOutstanding)}
          subLabel={`${stats.unpaidMembersCount} unpaid · ${stats.partialMembersCount} partial`}
          icon={AlertCircle}
          trend={{
            positive: stats.totalOutstanding === 0,
            text: stats.totalOutstanding === 0 ? 'Settled' : 'Pending',
          }}
        />
      </div>

      {/* SONALI BANK PLC — FUND DEPOSIT TRACKER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                Sonali Bank PLC — Club Fund Deposit Tracker
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                A/C: 2102201027292 · Bhedarganj Branch, Shariatpur · jafor saikot dhali tanvir khan
              </p>
            </div>
          </div>

          <button
            onClick={openAddDepositModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Deposit to Bank</span>
          </button>
        </div>

        {/* 3 Bank Tracker Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              All-Time Club Collections
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums mt-1">
              {formatBDT(totalClubCollected)}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block font-mono tabular-nums">
              Principal: {formatBDT(totalClubPrincipalCollected)} · Fines: {formatBDT(totalClubFineCollected)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/50">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
              Deposited to Sonali Bank PLC
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400 tabular-nums mt-1">
              {formatBDT(totalBankDeposited)}
            </div>
            <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-1 block">
              {bankDeposits.length} verified deposit {bankDeposits.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-400">
              Remaining Cash / Pending Deposit
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-amber-800 dark:text-amber-300 tabular-nums mt-1">
              {formatBDT(pendingBankDeposit)}
            </div>
            <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-1 block">
              {pendingBankDeposit === 0 && totalClubCollected > 0
                ? '100% funds deposited in bank'
                : 'Available with Treasurer for bank deposit'}
            </span>
          </div>
        </div>

        {/* Deposit Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Bank Deposit Progress
            </span>
            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
              {bankDepositProgress}% ({formatBDT(totalBankDeposited)} / {formatBDT(totalClubCollected)})
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              style={{ width: `${bankDepositProgress}%` }}
              className="h-full bg-emerald-600 rounded-full transition-all duration-300"
            />
          </div>
        </div>

        {/* Deposit History Table */}
        <div className="border border-slate-200/90 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto max-h-60">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3.5 font-semibold">Deposit Date</th>
                  <th className="py-2.5 px-3.5 font-semibold">Slip / Ref No.</th>
                  <th className="py-2.5 px-3.5 font-semibold">Notes</th>
                  <th className="py-2.5 px-3.5 font-semibold text-right">Amount (৳)</th>
                  <th className="py-2.5 px-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {bankDeposits.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No Sonali Bank deposit entries recorded yet. Click "+ Deposit to Bank" to log a deposit.
                    </td>
                  </tr>
                ) : (
                  bankDeposits.map((dep) => {
                    const isDeleting = deleteDepositId === dep.id;
                    return (
                      <tr key={dep.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-3.5 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {formatDate(dep.deposited_at)}
                        </td>
                        <td className="py-2.5 px-3.5 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {dep.reference_no || '—'}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {dep.notes || 'Sonali Bank PLC Deposit'}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                          {formatBDT(dep.amount)}
                        </td>
                        <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => openEditDepositModal(dep)}
                              className="p-1 text-slate-500 hover:text-emerald-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              title="Edit Bank Deposit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {isDeleting ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    deleteBankDeposit(dep.id);
                                    setDeleteDepositId(null);
                                  }}
                                  className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold cursor-pointer"
                                >
                                  Delete
                                </button>
                                <button
                                  onClick={() => setDeleteDepositId(null)}
                                  className="px-1.5 py-0.5 text-slate-500 text-[10px] cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteDepositId(dep.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                title="Remove Entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
      </div>

      {/* INTERACTIVE CHARTS (RECHARTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Collection Bar Chart */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Monthly Collections &amp; Target Trend — {selectedYear}
              </h2>
              <p className="text-xs text-slate-500">
                Comparison of target dues vs actual collections in BDT (৳)
              </p>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(val) => `৳${val / 1000}k`} />
                <Tooltip
                  formatter={(value: unknown) => [`৳${Number(value).toLocaleString()}`, '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="Target" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Collected" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Paid vs Unpaid Pie / Donut */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Paid vs Unpaid Ratio
            </h2>
            <p className="text-xs text-slate-500">
              {getMonthName(selectedMonth)} {selectedYear} status distribution
            </p>
          </div>

          <div className="h-52 w-full my-auto flex items-center justify-center">
            {pieData.length === 0 ? (
              <div className="text-xs text-slate-400 text-center">No dues generated for this month.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: unknown, name: unknown) => [`${val} members`, String(name)]}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '0.5rem', color: '#fff', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                Paid in Full:
              </span>
              <span className="font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                {stats.paidMembersCount}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                Partial:
              </span>
              <span className="font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                {stats.partialMembersCount}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" />
                Unpaid:
              </span>
              <span className="font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                {stats.unpaidMembersCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Columns: Pending / Unpaid Alert + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Pending dues across ALL active members */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Pending Contributions ({unpaidDues.length})</span>
              </h3>
              <p className="text-xs text-slate-500">
                Unpaid members for {getMonthName(selectedMonth)} {selectedYear}
              </p>
            </div>
            <Link
              to="/admin/payments"
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              Reconcile <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto max-h-72 divide-y divide-slate-100 dark:divide-slate-800">
            {unpaidDues.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  All active members have settled their contributions for {getMonthName(selectedMonth)}!
                </p>
              </div>
            ) : (
              unpaidDues.map((due) => {
                const bd = calculateDueBreakdown(due, due.member?.shares_count);
                return (
                  <div key={due.id} className="py-2.5 flex items-center justify-between text-xs gap-2">
                    <div className="min-w-0">
                      <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded mr-1.5">
                        {due.member?.member_code}
                      </span>
                      <Link
                        to={`/admin/members/${due.member_id}`}
                        className="font-medium text-slate-900 dark:text-slate-100 hover:text-emerald-700 dark:hover:text-emerald-400"
                      >
                        {due.member?.full_name}
                      </Link>
                      <span className="block text-[11px] font-mono text-slate-400 mt-0.5">
                        {due.member?.phone || '—'} · {(due.member?.shares_count || 1)} {(due.member?.shares_count || 1) > 1 ? 'shares' : 'share'}
                      </span>
                    </div>

                    <div className="text-right flex items-center gap-2 shrink-0">
                      <div>
                        <span className="font-mono font-bold text-rose-700 dark:text-rose-400 block tabular-nums">
                          {formatBDT(bd.totalOutstanding)} Due
                        </span>
                        {bd.fineOutstanding > 0 && (
                          <span className="block text-[10px] text-amber-700 dark:text-amber-400 font-semibold tabular-nums">
                            (+{formatBDT(bd.fineOutstanding)} fine)
                          </span>
                        )}
                        <StatusBadge status={due.status} size="sm" />
                      </div>
                      <button
                        onClick={() => {
                          setSelectedMemberForPayment(due.member_id);
                          setRecordPaymentModalOpen(true);
                        }}
                        className="px-2 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                        title="Quick Record Payment"
                      >
                        + Pay
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Panel 2: Recent Payments */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Recent Payments Received</span>
              </h3>
              <p className="text-xs text-slate-500">
                Verified member contributions
              </p>
            </div>
            <Link
              to="/admin/payment-history"
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              Full Ledger <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto max-h-72 divide-y divide-slate-100 dark:divide-slate-800">
            {recentPayments.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No recent payment transactions recorded yet.
              </div>
            ) : (
              recentPayments.map((due) => (
                <div key={due.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <Link
                      to={`/admin/members/${due.member_id}`}
                      className="font-medium text-slate-900 dark:text-slate-100 hover:text-emerald-700 dark:hover:text-emerald-400 block"
                    >
                      {due.member?.full_name || 'Member'}
                    </Link>
                    <span className="text-[11px] text-slate-500">
                      {getMonthName(due.month)} {due.year} · {due.paid_at ? formatDate(due.paid_at) : 'Paid'}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm block tabular-nums">
                      +{formatBDT(due.amount_paid)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{due.member?.member_code}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Sonali Bank Deposit Modal */}
      {bankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {editingDeposit ? 'Edit Sonali Bank Deposit' : 'Deposit Funds to Sonali Bank PLC'}
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">A/C: 2102201027292 · Bhedarganj</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBankModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bankFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  bankFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {bankFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <span>{bankFeedback.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveDeposit} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Deposit Amount (৳)
                  </label>
                  {pendingBankDeposit > 0 && !editingDeposit && (
                    <button
                      type="button"
                      onClick={() => setBankAmount(pendingBankDeposit)}
                      className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Use Remaining ({formatBDT(pendingBankDeposit)})
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min={1}
                  required
                  value={bankAmount || ''}
                  onChange={(e) => setBankAmount(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400"
                  placeholder="e.g. 17000"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Deposit Date
                  </label>
                  <input
                    type="date"
                    required
                    value={bankDate}
                    onChange={(e) => setBankDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Slip / Ref No.
                  </label>
                  <input
                    type="text"
                    value={bankRef}
                    onChange={(e) => setBankRef(e.target.value)}
                    placeholder="Optional receipt no."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={bankNotes}
                  onChange={(e) => setBankNotes(e.target.value)}
                  placeholder="e.g. Monthly batch deposit to Sonali Bank PLC"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setBankModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bankSaving}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{bankSaving ? 'Saving...' : editingDeposit ? 'Update Deposit' : 'Save Deposit'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={recordPaymentModalOpen}
        onClose={() => setRecordPaymentModalOpen(false)}
        initialMemberId={selectedMemberForPayment}
        initialMonth={selectedMonth}
        initialYear={selectedYear}
      />
    </div>
  );
};

