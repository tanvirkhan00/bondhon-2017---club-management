import React, { useState, useMemo } from 'react';
import { useClubData } from '../../hooks/useClubData';
import { formatBDT, formatDate, getMonthName, MONTH_NAMES } from '../../utils/formatters';
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

  const totalFilteredDue = filteredRecords.reduce((sum, d) => sum + Number(d.amount_due), 0);
  const totalFilteredPaid = filteredRecords.reduce((sum, d) => sum + Number(d.amount_paid), 0);
  const totalFilteredOutstanding = Math.max(0, totalFilteredDue - totalFilteredPaid);

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
            Personal contribution records for {myMemberRecord?.full_name} ({myMemberRecord?.member_code}) · প্রতি মাসের ১২ তারিখের মধ্যে কিস্তি পরিশোধ বাধ্যতামূলক (বিলম্ব ফি ৫০৳)
          </p>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-500 uppercase">Filtered Total Due</span>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums mt-1">
            {formatBDT(totalFilteredDue)}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">{filteredRecords.length} billing cycles</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 uppercase">Total Paid</span>
          <div className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400 tabular-nums mt-1">
            {formatBDT(totalFilteredPaid)}
          </div>
          <span className="text-[11px] text-emerald-600 mt-0.5 block">
            {totalFilteredDue > 0 ? Math.round((totalFilteredPaid / totalFilteredDue) * 100) : 0}% settled
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-rose-700 dark:text-rose-400 uppercase">Outstanding Balance</span>
          <div className="text-xl font-bold font-mono text-rose-700 dark:text-rose-400 tabular-nums mt-1">
            {formatBDT(totalFilteredOutstanding)}
          </div>
          <span className="text-[11px] text-rose-600 mt-0.5 block">
            {totalFilteredOutstanding === 0 ? 'All settled' : 'Unpaid contributions'}
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
                <th className="py-3 px-4 font-semibold text-right">Amount Paid (৳)</th>
                <th className="py-3 px-4 font-semibold text-right">Outstanding (৳)</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold">Payment Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No payment records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((d, idx) => {
                  const balance = Math.max(0, Number(d.amount_due) - Number(d.amount_paid));

                  return (
                    <tr key={d.id || `my-due-${idx}-${d.year}-${d.month}`} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        {getMonthName(d.month)} {d.year}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                        {formatBDT(d.amount_due)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                        {formatBDT(d.amount_paid)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-rose-700 dark:text-rose-400">
                        {balance > 0 ? formatBDT(balance) : '—'}
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
