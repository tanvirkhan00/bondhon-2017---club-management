import React, { useState, useMemo } from 'react';
import { useClubData } from '../../hooks/useClubData';
import { FISCAL_YEARS, formatBDT, formatDate, getMonthName, MONTH_NAMES } from '../../utils/formatters';
import { calculateDueBreakdown } from '../../utils/fineCalculator';
import { MonthlyDue } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { MetricCard } from '../../components/MetricCard';
import { DashboardClock } from '../../components/DashboardClock';
import { PaymentReceiptModal } from '../../components/PaymentReceiptModal';
import { PageTransition } from '../../components/ui/MotionPrimitives';
import { History, Search, Receipt, CheckCircle2, Coins, AlertCircle } from 'lucide-react';

export const MemberPaymentHistory: React.FC = () => {
  const { myDues, myMemberRecord } = useClubData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('all');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [receiptDue, setReceiptDue] = useState<MonthlyDue | null>(null);

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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#DFE6F0] dark:border-[#233452]">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0F1B33] dark:text-white flex items-center gap-2.5">
            <History className="w-6 h-6 text-[#1D4ED8] dark:text-[#60A5FA]" />
            <span>Payment Ledger</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#4E5E78] dark:text-[#9BB0CD] mt-0.5 font-mono">
            {myMemberRecord?.full_name} · {myMemberRecord?.member_code}
          </p>
        </div>
        <DashboardClock />
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
          accent="sapphire"
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
          accent={filteredBreakdown.outstanding > 0 ? 'rose' : 'sapphire'}
        />
      </div>

      {/* Filter Toolbar */}
      <div className="surface-card p-4 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#4E5E78] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by month or year (e.g. November or 2026)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <select
              value={selectedYearFilter}
              onChange={(e) => setSelectedYearFilter(e.target.value)}
              className="px-2.5 py-2 text-xs bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden cursor-pointer"
            >
              <option key="member-year-all" value="all" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">All Years</option>
              {years.map(y => (
                <option key={`member-year-${y}`} value={String(y)} className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">{y}</option>
              ))}
            </select>

            <select
              value={selectedMonthFilter}
              onChange={(e) => setSelectedMonthFilter(e.target.value)}
              className="px-2.5 py-2 text-xs bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden cursor-pointer"
            >
              <option key="member-month-all" value="all" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">All Months</option>
              {MONTH_NAMES.map((name, idx) => (
                <option key={`member-month-${idx + 1}`} value={String(idx + 1)} className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">{name}</option>
              ))}
            </select>

            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-2.5 py-2 text-xs bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden cursor-pointer"
            >
              <option key="member-status-all" value="all" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">All Statuses</option>
              <option key="member-status-paid" value="paid" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">Paid Only</option>
              <option key="member-status-partial" value="partial" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">Partial Only</option>
              <option key="member-status-unpaid" value="unpaid" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">Unpaid Only</option>
            </select>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
              className="px-2.5 py-2 text-xs bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden cursor-pointer"
            >
              <option key="sort-desc" value="desc" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">Newest First</option>
              <option key="sort-asc" value="asc" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payment History Table */}
      <div className="surface-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EFF3F9] dark:bg-[#17243C] text-[#4E5E78] border-b border-[#DFE6F0] dark:border-[#233452]">
              <tr>
                <th className="py-3 px-4 font-semibold">Period</th>
                <th className="py-3 px-4 font-semibold text-right">Due (৳)</th>
                <th className="py-3 px-4 font-semibold text-right">Fine (৳)</th>
                <th className="py-3 px-4 font-semibold text-right">Paid (৳)</th>
                <th className="py-3 px-4 font-semibold text-right">Outstanding (৳)</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold">Payment Date</th>
                <th className="py-3 px-4 font-semibold text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DFE6F0] dark:divide-[#233452]">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#4E5E78]">
                    No payment records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((d, idx) => {
                  const bd = calculateDueBreakdown(d, myMemberRecord?.shares_count);
                  const canReceipt = !d.isVirtual && bd.totalPaid > 0;

                  return (
                    <tr
                      key={d.id || `my-due-${idx}-${d.year}-${d.month}`}
                      className="hover:bg-[#EFF3F9]/60 dark:hover:bg-[#17243C]/60 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-[#0F1B33] dark:text-white whitespace-nowrap">
                        {getMonthName(d.month)} {d.year}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#4E5E78]">
                        {formatBDT(bd.principalDue)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#92600A] dark:text-[#F0C56E]">
                        {bd.fineDue > 0 ? (
                          <span>
                            {formatBDT(bd.fineDue)}
                            {bd.finePaid > 0 && (
                              <span className="block text-[10px] text-[#0369A1] dark:text-[#38BDF8]">
                                Paid: {formatBDT(bd.finePaid)}
                              </span>
                            )}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-[#0369A1] dark:text-[#38BDF8]">
                        {formatBDT(bd.totalPaid)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-rose-700 dark:text-rose-400">
                        {bd.totalOutstanding > 0 ? formatBDT(bd.totalOutstanding) : '—'}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <StatusBadge status={d.status} size="sm" />
                      </td>

                      <td className="py-3 px-4 font-mono text-[#4E5E78] whitespace-nowrap">
                        {d.paid_at ? formatDate(d.paid_at) : 'Unpaid'}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {canReceipt ? (
                          <button
                            type="button"
                            onClick={() => setReceiptDue(d)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#1D4ED8] dark:text-[#60A5FA] bg-[#1D4ED8]/10 hover:bg-[#1D4ED8]/18 rounded-lg border border-[#1D4ED8]/25 dark:border-[#60A5FA]/30 cursor-pointer"
                            title="View & Download Payment Receipt"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>Receipt</span>
                          </button>
                        ) : (
                          <span className="text-[#4E5E78]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PaymentReceiptModal
        due={receiptDue}
        member={myMemberRecord}
        onClose={() => setReceiptDue(null)}
      />
    </PageTransition>
  );
};
