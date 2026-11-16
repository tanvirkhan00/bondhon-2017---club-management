import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useClubData } from '../../hooks/useClubData';
import { BankDeposit, MonthlyDue } from '../../types';
import { FISCAL_YEARS, formatBDT, formatDate, getMonthName, MONTH_NAMES } from '../../utils/formatters';
import { calculateDueBreakdown, parseLocalDate } from '../../utils/fineCalculator';
import { MetricCard } from '../../components/MetricCard';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { PageTransition } from '../../components/ui/MotionPrimitives';
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
} from 'lucide-react';
import { RecordPaymentModal } from '../../components/RecordPaymentModal';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
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
    { name: 'Paid', value: stats.paidMembersCount, color: '#087F70' },
    { name: 'Partial', value: stats.partialMembersCount, color: '#D6AC62' },
    { name: 'Unpaid', value: stats.unpaidMembersCount, color: '#E11D48' },
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
    <PageTransition className="space-y-6">
      {/* Top Banner & Global Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8EDF3] dark:border-[#1F2F46]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#172435] dark:text-slate-100">
            Administrative Financial Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 mt-0.5">
            Real-time analytics for Bondhon 2017 · Currency: BDT (৳)
          </p>
        </div>

        {/* Global Month & Year Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#111C2D] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl px-3 py-2 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-[#087F70]" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-xs font-semibold text-[#172435] dark:text-slate-100 bg-transparent focus:outline-hidden cursor-pointer"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1} className="dark:bg-[#111C2D]">
                  {name}
                </option>
              ))}
            </select>
          </div>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-xs font-semibold font-mono tabular-nums text-[#172435] dark:text-slate-100 bg-white dark:bg-[#111C2D] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl px-3 py-2 shadow-2xs focus:outline-hidden cursor-pointer"
          >
            {FISCAL_YEARS.map((yr) => (
              <option key={yr} value={yr} className="dark:bg-[#111C2D]">
                {yr}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setSelectedMemberForPayment(undefined);
              setRecordPaymentModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#087F70] hover:bg-[#06675B] rounded-xl shadow-xs transition-all shrink-0 cursor-pointer whitespace-nowrap"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </button>

          <Link
            to="/admin/fines"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#9A7127] dark:text-[#D6AC62] bg-[#D6AC62]/15 border border-[#D6AC62]/30 hover:bg-[#D6AC62]/25 rounded-xl transition-colors shrink-0 whitespace-nowrap"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Fines Sheet</span>
          </Link>

          <Link
            to="/admin/payments"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#172435] dark:text-slate-200 bg-white dark:bg-[#111C2D] border border-[#E8EDF3] dark:border-[#1F2F46] hover:bg-[#F5F6F3] dark:hover:bg-[#162438] rounded-xl transition-colors shrink-0 whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#087F70]" />
            <span>Dues Sheet</span>
          </Link>
        </div>
      </div>

      {/* 4 Primary Monthly Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Members"
          value={stats.totalMembers}
          subLabel={`${stats.activeMembers} active · ${stats.inactiveMembers} inactive`}
          icon={Users}
          accent="navy"
        />
        <MetricCard
          label="Monthly Target"
          value={formatBDT(stats.monthlyTarget)}
          subLabel={`${getMonthName(selectedMonth)} ${selectedYear}`}
          icon={Target}
          accent="gold"
        />
        <MetricCard
          label="Total Collected"
          value={formatBDT(stats.totalCollected)}
          subLabel={`${stats.paidMembersCount} members fully paid`}
          icon={Banknote}
          accent="emerald"
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
          accent="rose"
          trend={{
            positive: stats.totalOutstanding === 0,
            text: stats.totalOutstanding === 0 ? 'Settled' : 'Pending',
          }}
        />
      </div>

      {/* SONALI BANK PLC — FUND DEPOSIT TRACKER */}
      <div className="surface-card rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E8EDF3] dark:border-[#1F2F46]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#14243A] dark:bg-[#162438] dark:border dark:border-[#2B4564] text-[#D6AC62] flex items-center justify-center shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#172435] dark:text-slate-100">
                Sonali Bank PLC — Club Fund Deposit Tracker
              </h2>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5 font-mono">
                A/C: 2102201027292 · Bhedarganj Branch, Shariatpur · jafor saikot dhali tanvir khan
              </p>
            </div>
          </div>

          <button
            onClick={openAddDepositModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#087F70] hover:bg-[#06675B] rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer self-start sm:self-auto whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Deposit to Bank</span>
          </button>
        </div>

        {/* 3 Bank Tracker Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-xl bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
              All-Time Club Collections
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-[#172435] dark:text-slate-100 tabular-nums mt-1">
              {formatBDT(totalClubCollected)}
            </div>
            <span className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1 block font-mono tabular-nums">
              Principal: {formatBDT(totalClubPrincipalCollected)} · Fines: {formatBDT(totalClubFineCollected)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#087F70]/8 dark:bg-[#087F70]/15 border border-[#087F70]/25">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#087F70] dark:text-[#34D399]">
              Deposited to Sonali Bank PLC
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-[#087F70] dark:text-[#34D399] tabular-nums mt-1">
              {formatBDT(totalBankDeposited)}
            </div>
            <span className="text-[11px] text-[#087F70]/80 dark:text-[#34D399]/80 mt-1 block tabular-nums">
              {bankDeposits.length} verified deposit {bankDeposits.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#D6AC62]/12 dark:bg-[#D6AC62]/15 border border-[#D6AC62]/30">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9A7127] dark:text-[#D6AC62]">
              Remaining Cash / Pending Deposit
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-[#9A7127] dark:text-[#D6AC62] tabular-nums mt-1">
              {formatBDT(pendingBankDeposit)}
            </div>
            <span className="text-[11px] text-[#9A7127]/90 dark:text-[#D6AC62]/80 mt-1 block">
              {pendingBankDeposit === 0 && totalClubCollected > 0
                ? '100% funds deposited in bank'
                : 'Available with Treasurer for bank deposit'}
            </span>
          </div>
        </div>

        {/* Deposit Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#172435] dark:text-slate-200">
              Bank Deposit Progress
            </span>
            <span className="font-mono font-bold text-[#087F70] dark:text-[#34D399] tabular-nums">
              {bankDepositProgress}% ({formatBDT(totalBankDeposited)} / {formatBDT(totalClubCollected)})
            </span>
          </div>
          <div className="w-full h-2.5 bg-[#F5F6F3] dark:bg-[#162438] rounded-full overflow-hidden border border-[#E8EDF3] dark:border-[#1F2F46]">
            <div
              style={{ width: `${bankDepositProgress}%` }}
              className="h-full bg-[#087F70] rounded-full transition-all duration-300"
            />
          </div>
        </div>

        {/* Deposit History Table */}
        <div className="border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl overflow-hidden">
          <div className="overflow-x-auto max-h-60">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F6F3] dark:bg-[#162438] text-[#64748B] dark:text-slate-400 border-b border-[#E8EDF3] dark:border-[#1F2F46]">
                <tr>
                  <th className="py-2.5 px-3.5 font-semibold">Deposit Date</th>
                  <th className="py-2.5 px-3.5 font-semibold">Slip / Ref No.</th>
                  <th className="py-2.5 px-3.5 font-semibold">Notes</th>
                  <th className="py-2.5 px-3.5 font-semibold text-right">Amount (৳)</th>
                  <th className="py-2.5 px-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EDF3] dark:divide-[#1F2F46]">
                {bankDeposits.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[#64748B] dark:text-slate-400">
                      No Sonali Bank deposit entries recorded yet. Click "Deposit to Bank" to log a deposit.
                    </td>
                  </tr>
                ) : (
                  bankDeposits.map((dep) => {
                    const isDeleting = deleteDepositId === dep.id;
                    return (
                      <tr key={dep.id} className="hover:bg-[#F5F6F3]/60 dark:hover:bg-[#162438]/60 transition-colors">
                        <td className="py-2.5 px-3.5 font-mono text-[#172435] dark:text-slate-200 whitespace-nowrap tabular-nums">
                          {formatDate(dep.deposited_at)}
                        </td>
                        <td className="py-2.5 px-3.5 font-mono text-[#64748B] dark:text-slate-400 whitespace-nowrap">
                          {dep.reference_no || '—'}
                        </td>
                        <td className="py-2.5 px-3.5 text-[#64748B] dark:text-slate-400 max-w-xs truncate">
                          {dep.notes || 'Sonali Bank PLC Deposit'}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold text-[#087F70] dark:text-[#34D399] tabular-nums whitespace-nowrap">
                          {formatBDT(dep.amount)}
                        </td>
                        <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => openEditDepositModal(dep)}
                              className="p-1.5 text-[#64748B] hover:text-[#087F70] rounded-lg hover:bg-[#F5F6F3] dark:hover:bg-[#203650] cursor-pointer"
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
                                  className="px-1.5 py-0.5 text-[#64748B] text-[10px] cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteDepositId(dep.id)}
                                className="p-1.5 text-[#64748B] hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
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
        <div className="lg:col-span-8 surface-card rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-[#172435] dark:text-slate-100">
                Monthly Collections &amp; Target Trend — {selectedYear}
              </h2>
              <p className="text-xs text-[#64748B] dark:text-slate-400">
                Comparison of target dues vs actual collections in BDT (৳)
              </p>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#1F2F46" strokeOpacity={0.35} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={{ stroke: '#1F2F46' }} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `৳${val / 1000}k`}
                />
                <Tooltip
                  formatter={(value: unknown) => [`৳${Number(value).toLocaleString()}`, '']}
                  contentStyle={{
                    backgroundColor: '#0D1726',
                    borderColor: '#2B4564',
                    borderRadius: '0.75rem',
                    color: '#F1F5F9',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px', color: '#94A3B8' }} />
                <Bar dataKey="Target" fill="#334E6E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Collected" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Paid vs Unpaid Pie / Donut */}
        <div className="lg:col-span-4 surface-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#172435] dark:text-slate-100">
              Paid vs Unpaid Ratio
            </h2>
            <p className="text-xs text-[#64748B] dark:text-slate-400">
              {getMonthName(selectedMonth)} {selectedYear} status distribution
            </p>
          </div>

          <div className="h-52 w-full my-auto flex items-center justify-center">
            {pieData.length === 0 ? (
              <div className="text-xs text-[#64748B] text-center">No dues generated for this month.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={76}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: unknown, name: unknown) => [`${val} members`, String(name)]}
                    contentStyle={{
                      backgroundColor: '#14243A',
                      borderColor: '#203650',
                      borderRadius: '0.5rem',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1.5 pt-3 border-t border-[#E8EDF3] dark:border-[#1F2F46] text-xs">
            <div className="flex items-center justify-between text-[#64748B] dark:text-slate-400">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#087F70] inline-block" />
                Paid in Full:
              </span>
              <span className="font-bold text-[#172435] dark:text-slate-100 font-mono tabular-nums">
                {stats.paidMembersCount}
              </span>
            </div>
            <div className="flex items-center justify-between text-[#64748B] dark:text-slate-400">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D6AC62] inline-block" />
                Partial:
              </span>
              <span className="font-bold text-[#172435] dark:text-slate-100 font-mono tabular-nums">
                {stats.partialMembersCount}
              </span>
            </div>
            <div className="flex items-center justify-between text-[#64748B] dark:text-slate-400">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48] inline-block" />
                Unpaid:
              </span>
              <span className="font-bold text-[#172435] dark:text-slate-100 font-mono tabular-nums">
                {stats.unpaidMembersCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Columns: Pending / Unpaid Alert + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Pending dues across ALL active members */}
        <div className="surface-card rounded-2xl p-5 sm:p-6 flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E8EDF3] dark:border-[#1F2F46]">
            <div>
              <h3 className="text-sm font-bold text-[#172435] dark:text-slate-100 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#9A7127] dark:text-[#D6AC62]" />
                <span>Pending Contributions ({unpaidDues.length})</span>
              </h3>
              <p className="text-xs text-[#64748B] dark:text-slate-400">
                Unpaid members for {getMonthName(selectedMonth)} {selectedYear}
              </p>
            </div>
            <Link
              to="/admin/payments"
              className="text-xs font-semibold text-[#087F70] dark:text-[#34D399] hover:underline inline-flex items-center gap-1 whitespace-nowrap"
            >
              Reconcile <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto max-h-72 divide-y divide-[#E8EDF3] dark:divide-[#1F2F46]">
            {unpaidDues.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#64748B]">
                <CheckCircle2 className="w-8 h-8 text-[#087F70] mx-auto mb-2" />
                <p className="font-semibold text-[#172435] dark:text-slate-200">
                  All active members have settled their contributions for {getMonthName(selectedMonth)}!
                </p>
              </div>
            ) : (
              unpaidDues.map((due) => {
                const bd = calculateDueBreakdown(due, due.member?.shares_count);
                return (
                  <div key={due.id} className="py-3 flex items-center justify-between text-xs gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-mono text-[11px] font-bold text-[#64748B] dark:text-slate-400">
                          {due.member?.member_code}
                        </span>
                        <span className="text-[#64748B]">·</span>
                        <Link
                          to={`/admin/members/${due.member_id}`}
                          className="font-semibold text-[#172435] dark:text-slate-100 hover:text-[#087F70] dark:hover:text-[#34D399] truncate"
                        >
                          {due.member?.full_name}
                        </Link>
                      </div>
                      <span className="block text-[11px] font-mono text-[#64748B] dark:text-slate-400 mt-0.5">
                        {due.member?.phone || '—'} · {(due.member?.shares_count || 1)}{' '}
                        {(due.member?.shares_count || 1) > 1 ? 'shares' : 'share'}
                      </span>
                    </div>

                    <div className="text-right flex items-center gap-2.5 shrink-0">
                      <div>
                        <span className="font-mono font-bold text-rose-700 dark:text-rose-400 block tabular-nums">
                          {formatBDT(bd.totalOutstanding)} Due
                        </span>
                        {bd.fineOutstanding > 0 && (
                          <span className="block text-[10px] text-[#9A7127] dark:text-[#D6AC62] font-semibold tabular-nums">
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
                        className="px-2.5 py-1.5 text-[11px] font-bold text-[#087F70] dark:text-[#34D399] bg-[#087F70]/10 hover:bg-[#087F70]/15 rounded-lg border border-[#087F70]/25 transition-colors cursor-pointer whitespace-nowrap"
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
        <div className="surface-card rounded-2xl p-5 sm:p-6 flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E8EDF3] dark:border-[#1F2F46]">
            <div>
              <h3 className="text-sm font-bold text-[#172435] dark:text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#087F70]" />
                <span>Recent Payments Received</span>
              </h3>
              <p className="text-xs text-[#64748B] dark:text-slate-400">
                Verified member contributions
              </p>
            </div>
            <Link
              to="/admin/payment-history"
              className="text-xs font-semibold text-[#087F70] dark:text-[#34D399] hover:underline inline-flex items-center gap-1 whitespace-nowrap"
            >
              Full Ledger <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto max-h-72 divide-y divide-[#E8EDF3] dark:divide-[#1F2F46]">
            {recentPayments.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#64748B]">
                No recent payment transactions recorded yet.
              </div>
            ) : (
              recentPayments.map((due) => (
                <div key={due.id} className="py-3 flex items-center justify-between text-xs gap-2">
                  <div className="min-w-0">
                    <Link
                      to={`/admin/members/${due.member_id}`}
                      className="font-semibold text-[#172435] dark:text-slate-100 hover:text-[#087F70] dark:hover:text-[#34D399] block truncate"
                    >
                      {due.member?.full_name || 'Member'}
                    </Link>
                    <span className="text-[11px] text-[#64748B] dark:text-slate-400">
                      {getMonthName(due.month)} {due.year} · {due.paid_at ? formatDate(due.paid_at) : 'Paid'}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-[#087F70] dark:text-[#34D399] text-sm block tabular-nums">
                      +{formatBDT(due.amount_paid)}
                    </span>
                    <span className="text-[10px] text-[#64748B] dark:text-slate-400 font-mono">
                      {due.member?.member_code}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Sonali Bank Deposit Modal */}
      <Modal
        isOpen={bankModalOpen}
        onClose={() => setBankModalOpen(false)}
        title={editingDeposit ? 'Edit Sonali Bank Deposit' : 'Deposit Funds to Sonali Bank PLC'}
        subtitle="A/C: 2102201027292 · Bhedarganj Branch"
        icon={<Landmark className="w-4 h-4" />}
        lottieSrc="/lottie/bank-deposit.json"
        lottieSuccess={bankFeedback?.type === 'success'}
        lottieSpeed={bankSaving ? 1.35 : 1}
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          {bankFeedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                bankFeedback.type === 'success'
                  ? 'bg-[#087F70]/10 text-[#087F70] dark:text-[#34D399] border-[#087F70]/25'
                  : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
              }`}
            >
              {bankFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{bankFeedback.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveDeposit} className="space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-[#172435] dark:text-slate-200">
                  Deposit Amount (৳)
                </label>
                {pendingBankDeposit > 0 && !editingDeposit && (
                  <button
                    type="button"
                    onClick={() => setBankAmount(pendingBankDeposit)}
                    className="text-[11px] font-semibold text-[#087F70] dark:text-[#34D399] hover:underline cursor-pointer"
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
                className="w-full px-3 py-2.5 bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl font-mono tabular-nums text-sm font-bold text-[#087F70] dark:text-[#34D399] focus:outline-hidden focus:ring-2 focus:ring-[#087F70]"
                placeholder="e.g. 17000"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#172435] dark:text-slate-200 mb-1.5">
                  Deposit Date
                </label>
                <input
                  type="date"
                  required
                  value={bankDate}
                  onChange={(e) => setBankDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl font-mono text-[#172435] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#087F70]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#172435] dark:text-slate-200 mb-1.5">
                  Slip / Ref No.
                </label>
                <input
                  type="text"
                  value={bankRef}
                  onChange={(e) => setBankRef(e.target.value)}
                  placeholder="Optional receipt no."
                  className="w-full px-3 py-2 bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl text-[#172435] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#087F70]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#172435] dark:text-slate-200 mb-1.5">
                Notes
              </label>
              <input
                type="text"
                value={bankNotes}
                onChange={(e) => setBankNotes(e.target.value)}
                placeholder="e.g. Monthly batch deposit to Sonali Bank PLC"
                className="w-full px-3 py-2 bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl text-[#172435] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#087F70]"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#E8EDF3] dark:border-[#1F2F46]">
              <button
                type="button"
                onClick={() => setBankModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#162438] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={bankSaving}
                className="px-5 py-2 text-xs font-bold text-white bg-[#087F70] hover:bg-[#06675B] rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{bankSaving ? 'Saving...' : editingDeposit ? 'Update Deposit' : 'Save Deposit'}</span>
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={recordPaymentModalOpen}
        onClose={() => setRecordPaymentModalOpen(false)}
        initialMemberId={selectedMemberForPayment}
        initialMonth={selectedMonth}
        initialYear={selectedYear}
      />
    </PageTransition>
  );
};
