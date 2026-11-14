import React, { useState, useMemo } from 'react';
import { useClubData } from '../../hooks/useClubData';
import { formatBDT, formatDate, getMonthName, MONTH_NAMES } from '../../utils/formatters';
import { calculateDueBreakdown } from '../../utils/fineCalculator';
import { StatusBadge } from '../../components/StatusBadge';
import {
  History,
  Search,
  Calendar,
  Filter,
  CreditCard,
  DollarSign,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const MemberPaymentHistory: React.FC = () => {
  const { myDues, myMemberRecord } = useClubData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('all');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Extract unique years from personal dues
  const years = useMemo(() => {
    const set = new Set<number>();
    myDues.forEach(d => {
      const yr = Number(d.year);
      if (yr && !isNaN(yr) && yr > 2000) {
        set.add(yr);
      }
    });
    set.add(new Date().getFullYear());
    set.add(2026);
    set.add(2025);
    return Array.from(set).sort((a, b) => b - a);
  }, [myDues]);

  // Filtered & Sorted Records
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
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <History className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
            <span>My Contribution Payment Ledger</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {myMemberRecord?.full_name} ({myMemberRecord?.member_code}) · প্রতি মাসের ১২ তারিখের মধ্যে কিস্তি পরিশোধ বাধ্যতামূলক (১২ তারিখের পর প্রতি নামে ৫০৳ জরিমানা)
          </p>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-500 uppercase">সর্বমোট বিল (জরিমানাসহ)</span>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums mt-1">
            {formatBDT(filteredBreakdown.due)}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">{filteredRecords.length} মাস</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 uppercase">মোট মূল সঞ্চয় জমা</span>
          <div className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400 tabular-nums mt-1">
            {formatBDT(filteredBreakdown.paid)}
          </div>
          <span className="text-[11px] text-emerald-600 mt-0.5 block">
            {filteredBreakdown.due > 0 ? Math.round(((filteredBreakdown.paid + filteredBreakdown.finePaid) / filteredBreakdown.due) * 100) : 0}% settled
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 uppercase">মোট জরিমানা পরিশোধ</span>
          <div className="text-xl font-bold font-mono text-amber-700 dark:text-amber-400 tabular-nums mt-1">
            {formatBDT(filteredBreakdown.finePaid)}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            বিলম্ব ফি জমা হিসাব
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-rose-700 dark:text-rose-400 uppercase">মোট বকেয়া (মূল+জরিমানা)</span>
          <div className="text-xl font-bold font-mono text-rose-700 dark:text-rose-400 tabular-nums mt-1">
            {formatBDT(filteredBreakdown.outstanding)}
          </div>
          <span className="text-[11px] text-rose-600 mt-0.5 block">
            {filteredBreakdown.outstanding === 0 ? 'সকল বকেয়া পরিশোধিত' : 'পরিশোধযোগ্য বকেয়া'}
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by month or year (e.g. November or 2026)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Year */}
            <select
              value={selectedYearFilter}
              onChange={(e) => setSelectedYearFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <option key="member-year-all" value="all">All Years</option>
              {years.map(y => (
                <option key={`member-year-${y}`} value={String(y)}>{y}</option>
              ))}
            </select>

            {/* Month */}
            <select
              value={selectedMonthFilter}
              onChange={(e) => setSelectedMonthFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <option key="member-month-all" value="all">All Months</option>
              {MONTH_NAMES.map((name, idx) => (
                <option key={`member-month-${idx + 1}`} value={String(idx + 1)}>{name}</option>
              ))}
            </select>

            {/* Status */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <option key="member-status-all" value="all">All Statuses</option>
              <option key="member-status-paid" value="paid">Paid Only</option>
              <option key="member-status-partial" value="partial">Partial Only</option>
              <option key="member-status-unpaid" value="unpaid">Unpaid Only</option>
            </select>

            {/* Sort Order */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <option key="sort-desc" value="desc">Newest First</option>
              <option key="sort-asc" value="asc">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payment History Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Month & Year</th>
                <th className="py-3 px-4 font-semibold text-right">Amount Due (৳)</th>
                <th className="py-3 px-4 font-semibold text-right">জরিমানা (৳)</th>
                <th className="py-3 px-4 font-semibold text-right">Paid (৳)</th>
                <th className="py-3 px-4 font-semibold text-right">মোট বকেয়া (৳)</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold">Payment Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No payment records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((d, idx) => {
                  const bd = calculateDueBreakdown(d, myMemberRecord?.shares_count);

                  return (
                    <tr key={d.id || `my-due-${idx}-${d.year}-${d.month}`} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        {getMonthName(d.month)} {d.year}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                        {formatBDT(bd.principalDue)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums text-amber-700 dark:text-amber-400">
                        {bd.fineDue > 0 ? (
                          <span>
                            {formatBDT(bd.fineDue)}
                            {bd.finePaid > 0 && (
                              <span className="block text-[10px] text-emerald-600">
                                জমা: {formatBDT(bd.finePaid)}
                              </span>
                            )}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                        {formatBDT(bd.totalPaid)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-rose-700 dark:text-rose-400">
                        {bd.totalOutstanding > 0 ? formatBDT(bd.totalOutstanding) : '—'}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <StatusBadge status={d.status} size="sm" />
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
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
    </div>
  );
};
