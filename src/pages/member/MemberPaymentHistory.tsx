import React, { useState, useMemo } from 'react';
import { useClubData } from '../../hooks/useClubData';
import { FISCAL_YEARS, formatBDT, formatDate, getMonthName, MONTH_NAMES } from '../../utils/formatters';
import { calculateDueBreakdown } from '../../utils/fineCalculator';
import { StatusBadge } from '../../components/StatusBadge';
import { MetricCard } from '../../components/MetricCard';
import { PageTransition } from '../../components/ui/MotionPrimitives';
import { History, Search, Receipt, CheckCircle2, Coins, AlertCircle } from 'lucide-react';

export const MemberPaymentHistory: React.FC = () => {
  const { myDues, myMemberRecord } = useClubData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('all');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const years = useMemo(() => {
    const set = new Set<number>(FISCAL_YEARS);
    myDues.forEach(d => {
      const yr = Number(d.year);
      if (yr && !isNaN(yr) && yr > 2000) {
        set.add(yr);
      }
    });
    set.add(new Date().getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [myDues]);

  const filteredRecords = useMemo(() => {
    return myDues
      .filter((d) => {
        const monthName = getMonthName(d.month).toLowerCase();
        const yearStr = String(d.year);
        const matchSearch =
          monthName.includes(searchQuery.toLowerCase()) ||
          yearStr.includes(searchQuery);

        const matchYear = selectedYearFilter === 'all' || d.year === Number(selectedYearFilter);
        const matchMonth = selectedMonthFilter === 'all' || d.month === Number(selectedMonthFilter);
        const matchStatus = selectedStatusFilter === 'all' || d.status === selectedStatusFilter;

        return matchSearch && matchYear && matchMonth && matchStatus;
      })
      .sort((a, b) => {
        const keyA = a.year * 100 + a.month;
        const keyB = b.year * 100 + b.month;
        return sortOrder === 'desc' ? keyB - keyA : keyA - keyB;
      });
  }, [myDues, searchQuery, selectedYearFilter, selectedMonthFilter, selectedStatusFilter, sortOrder]);

  const filteredBreakdown = filteredRecords.reduce(
    (acc, d) => {
      const bd = calculateDueBreakdown(d, myMemberRecord?.shares_count);
      return {
        due: acc.due + bd.totalDue,
        paid: acc.paid + bd.principalPaid,
        finePaid: acc.finePaid + bd.finePaid,
        outstanding: acc.outstanding + bd.totalOutstanding,
      };
    },
    { due: 0, paid: 0, finePaid: 0, outstanding: 0 }
  );

  return (
    <PageTransition className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8EDF3] dark:border-[#1F2F46]">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#14243A] dark:text-white flex items-center gap-2.5">
            <History className="w-6 h-6 text-[#087F70] dark:text-[#34D399]" />
            <span>Payment Ledger</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5 font-mono">
            {myMemberRecord?.full_name} · {myMemberRecord?.member_code}
          </p>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <MetricCard
          label="Total Billed"
          value={formatBDT(filteredBreakdown.due)}
          subLabel={`${filteredRecords.length} cycles`}
          icon={Receipt}
          accent="navy"
        />
        <MetricCard
          label="Principal Paid"
          value={formatBDT(filteredBreakdown.paid)}
          subLabel="Monthly contributions"
          icon={CheckCircle2}
          accent="emerald"
          trend={{
            positive: true,
            text: `${filteredBreakdown.due > 0 ? Math.round(((filteredBreakdown.paid + filteredBreakdown.finePaid) / filteredBreakdown.due) * 100) : 0}% settled`,
          }}
        />
        <MetricCard
          label="Fines Paid"
          value={formatBDT(filteredBreakdown.finePaid)}
          subLabel="Late fees settled"
          icon={Coins}
          accent="gold"
        />
        <MetricCard
          label="Outstanding"
          value={formatBDT(filteredBreakdown.outstanding)}
          subLabel={filteredBreakdown.outstanding === 0 ? 'Account settled' : 'Balance due'}
          icon={AlertCircle}
          accent={filteredBreakdown.outstanding > 0 ? 'rose' : 'emerald'}
        />
      </div>

      {/* Filter Toolbar */}
      <div className="surface-card p-4 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by month or year (e.g. November or 2026)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl text-[#172435] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#087F70]"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <select
              value={selectedYearFilter}
              onChange={(e) => setSelectedYearFilter(e.target.value)}
              className="px-2.5 py-2 text-xs bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl cursor-pointer"
            >
              <option key="member-year-all" value="all">All Years</option>
              {years.map(y => (
                <option key={`member-year-${y}`} value={String(y)}>{y}</option>
              ))}
            </select>

            <select
              value={selectedMonthFilter}
              onChange={(e) => setSelectedMonthFilter(e.target.value)}
              className="px-2.5 py-2 text-xs bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl cursor-pointer"
            >
              <option key="member-month-all" value="all">All Months</option>
              {MONTH_NAMES.map((name, idx) => (
                <option key={`member-month-${idx + 1}`} value={String(idx + 1)}>{name}</option>
              ))}
            </select>

            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-2.5 py-2 text-xs bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl cursor-pointer"
            >
              <option key="member-status-all" value="all">All Statuses</option>
              <option key="member-status-paid" value="paid">Paid Only</option>
              <option key="member-status-partial" value="partial">Partial Only</option>
              <option key="member-status-unpaid" value="unpaid">Unpaid Only</option>
            </select>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
              className="px-2.5 py-2 text-xs bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl cursor-pointer"
            >
              <option key="sort-desc" value="desc">Newest First</option>
              <option key="sort-asc" value="asc">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payment History Table */}
      <div className="surface-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F6F3] dark:bg-[#162438] text-[#64748B] border-b border-[#E8EDF3] dark:border-[#1F2F46]">
              <tr>
                <th className="py-3 px-4 font-semibold">Period</th>
                <th className="py-3 px-4 font-semibold text-right">Due (৳)</th>
                <th className="py-3 px-4 font-semibold text-right">Fine (৳)</th>
                <th className="py-3 px-4 font-semibold text-right">Paid (৳)</th>
                <th className="py-3 px-4 font-semibold text-right">Outstanding (৳)</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold">Payment Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EDF3] dark:divide-[#1F2F46]">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#64748B]">
                    No payment records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((d, idx) => {
                  const bd = calculateDueBreakdown(d, myMemberRecord?.shares_count);

                  return (
                    <tr
                      key={d.id || `my-due-${idx}-${d.year}-${d.month}`}
                      className="hover:bg-[#F5F6F3]/60 dark:hover:bg-[#162438]/60 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-[#14243A] dark:text-white whitespace-nowrap">
                        {getMonthName(d.month)} {d.year}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#64748B]">
                        {formatBDT(bd.principalDue)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#9A7127] dark:text-[#D6AC62]">
                        {bd.fineDue > 0 ? (
                          <span>
                            {formatBDT(bd.fineDue)}
                            {bd.finePaid > 0 && (
                              <span className="block text-[10px] text-[#087F70] dark:text-[#34D399]">
                                Paid: {formatBDT(bd.finePaid)}
                              </span>
                            )}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-[#087F70] dark:text-[#34D399]">
                        {formatBDT(bd.totalPaid)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-rose-700 dark:text-rose-400">
                        {bd.totalOutstanding > 0 ? formatBDT(bd.totalOutstanding) : '—'}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <StatusBadge status={d.status} size="sm" />
                      </td>

                      <td className="py-3 px-4 font-mono text-[#64748B] whitespace-nowrap">
                        {d.paid_at ? formatDate(d.paid_at) : 'Unpaid'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageTransition>
  );
};
