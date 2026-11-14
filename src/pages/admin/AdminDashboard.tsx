import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useClubData } from '../../hooks/useClubData';
import { formatBDT, formatDate, getMonthName, MONTH_NAMES } from '../../utils/formatters';
import { MetricCard } from '../../components/MetricCard';
import { StatusBadge } from '../../components/StatusBadge';
import {
  Users,
  Target,
  Banknote,
  AlertCircle,
  TrendingUp,
  PlusCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  CreditCard,
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

interface AdminDashboardProps {
  onOpenGenerateDues?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onOpenGenerateDues }) => {
  const {
    stats,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    monthlyDues,
    monthSummaries,
    members,
  } = useClubData();

  const [recordPaymentModalOpen, setRecordPaymentModalOpen] = useState(false);
  const [selectedMemberForPayment, setSelectedMemberForPayment] = useState<string | undefined>(undefined);

  // Dues for selected month and year
  const currentMonthDues = monthlyDues.filter(
    d => d.month === selectedMonth && d.year === selectedYear
  );

  const unpaidDues = currentMonthDues.filter(d => d.status === 'unpaid' || d.status === 'partial');

  const recentPayments = [...monthlyDues]
    .filter(d => d.amount_paid > 0 && d.paid_at)
    .sort((a, b) => (b.paid_at || '').localeCompare(a.paid_at || ''))
    .slice(0, 6);

  // Recharts Data: Monthly Collection Trends for Selected Year
  const chartData = monthSummaries.map(m => ({
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
  ].filter(p => p.value > 0);

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
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
            <option value={2024}>2024</option>
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
            to="/admin/payments"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg shadow-2xs transition-colors shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Monthly Dues Sheet</span>
          </Link>
        </div>
      </div>

      {/* 8 Statistics Cards */}
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

      {/* INTERACTIVE CHARTS (RECHARTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Collection Bar Chart */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Monthly Collections & Target Trend — {selectedYear}
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
                  formatter={(value: any) => [`৳${Number(value).toLocaleString()}`, '']}
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
                    formatter={(val: any, name: any) => [`${val} members`, name]}
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
              <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                {stats.paidMembersCount}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                Partial:
              </span>
              <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                {stats.partialMembersCount}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" />
                Unpaid:
              </span>
              <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                {stats.unpaidMembersCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Columns: Pending / Unpaid Alert + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Pending dues */}
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
              unpaidDues.map((due) => (
                <div key={due.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded mr-1.5">
                      {due.member?.member_code}
                    </span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {due.member?.full_name}
                    </span>
                    <span className="block text-[11px] font-mono text-slate-400">
                      {due.member?.phone}
                    </span>
                  </div>

                  <div className="text-right flex items-center gap-2">
                    <div>
                      <span className="font-mono font-bold text-rose-700 dark:text-rose-400 block">
                        {formatBDT(Number(due.amount_due) - Number(due.amount_paid))} Due
                      </span>
                      <StatusBadge status={due.status} size="sm" />
                    </div>
                    <button
                      onClick={() => {
                        setSelectedMemberForPayment(due.member_id);
                        setRecordPaymentModalOpen(true);
                      }}
                      className="px-2 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg border border-emerald-200 transition-colors"
                      title="Quick Record Payment"
                    >
                      + Pay
                    </button>
                  </div>
                </div>
              ))
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
                    <span className="font-medium text-slate-900 dark:text-slate-100 block">
                      {due.member?.full_name || 'Member'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Month: {getMonthName(due.month)} {due.year} · {due.paid_at ? formatDate(due.paid_at) : 'Paid'}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm block">
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
