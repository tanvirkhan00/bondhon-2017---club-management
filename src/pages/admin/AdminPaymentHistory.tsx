import React, { useState, useMemo } from 'react';
import { useClubData } from '../../hooks/useClubData';
import { formatBDT, formatDate, getMonthName, MONTH_NAMES } from '../../utils/formatters';
import { StatusBadge } from '../../components/StatusBadge';
import { downloadCsv } from '../../utils/csvExport';
import {
  History,
  Search,
  Download,
  Calendar,
  Filter,
  Users,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react';

export const AdminPaymentHistory: React.FC = () => {
  const { monthlyDues, members } = useClubData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('all');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Extract unique years
  const years = useMemo(() => {
    const set = new Set<number>();
    monthlyDues.forEach(d => {
      const yr = Number(d.year);
      if (yr && !isNaN(yr) && yr > 2000) {
        set.add(yr);
      }
    });
    set.add(new Date().getFullYear());
    set.add(2026);
    set.add(2025);
    return Array.from(set).sort((a, b) => b - a);
  }, [monthlyDues]);

  // Filtered & Sorted Records
  const filteredRecords = useMemo(() => {
    return monthlyDues
      .filter((due) => {
        const name = due.member?.full_name || '';
        const code = due.member?.member_code || '';
        const phone = due.member?.phone || '';

        const matchSearch =
          name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          phone.includes(searchQuery);

        const matchYear = selectedYearFilter === 'all' || due.year === Number(selectedYearFilter);
        const matchMonth = selectedMonthFilter === 'all' || due.month === Number(selectedMonthFilter);
        const matchStatus = selectedStatusFilter === 'all' || due.status === selectedStatusFilter;
        const matchMember = selectedMemberFilter === 'all' || due.member_id === selectedMemberFilter;

        return matchSearch && matchYear && matchMonth && matchStatus && matchMember;
      })
      .sort((a, b) => {
        if (a.paid_at && b.paid_at) {
          return b.paid_at.localeCompare(a.paid_at);
        }
        return (b.year * 100 + b.month) - (a.year * 100 + a.month);
      });
  }, [
    monthlyDues,
    searchQuery,
    selectedYearFilter,
    selectedMonthFilter,
    selectedStatusFilter,
    selectedMemberFilter,
  ]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage]);

  const totalFilteredDue = filteredRecords.reduce((sum, d) => sum + Number(d.amount_due), 0);
  const totalFilteredPaid = filteredRecords.reduce((sum, d) => sum + Number(d.amount_paid), 0);
  const totalFilteredOutstanding = Math.max(0, totalFilteredDue - totalFilteredPaid);

  const handleExportCsv = () => {
    const headers = [
      'Record ID',
      'Member Code',
      'Member Name',
      'Phone Number',
      'Month',
      'Year',
      'Amount Due (BDT)',
      'Amount Paid (BDT)',
      'Outstanding (BDT)',
      'Payment Status',
      'Payment Date',
      'Recorded By',
    ];

    const rows = filteredRecords.map(d => [
      d.id,
      d.member?.member_code || '',
      d.member?.full_name || '',
      d.member?.phone || '',
      getMonthName(d.month),
      d.year,
      Number(d.amount_due),
      Number(d.amount_paid),
      Math.max(0, Number(d.amount_due) - Number(d.amount_paid)),
      d.status.toUpperCase(),
      d.paid_at ? formatDate(d.paid_at) : 'Unpaid',
      d.recorded_by || 'Admin',
    ]);

    downloadCsv(`Bondhon_2017_Ledger_${new Date().toISOString().substring(0, 10)}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <History className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
            <span>Complete Financial Payment Ledger</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Full audit log of all membership contributions in BDT (৳) with pagination and CSV export
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg shadow-2xs transition-colors self-start sm:self-auto shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Ledger CSV</span>
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-500 uppercase">Filtered Target</span>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums mt-1">
            {formatBDT(totalFilteredDue)}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">{filteredRecords.length} dues records</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 uppercase">Total Collected</span>
          <div className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400 tabular-nums mt-1">
            {formatBDT(totalFilteredPaid)}
          </div>
          <span className="text-[11px] text-emerald-600 mt-0.5 block">
            {totalFilteredDue > 0 ? Math.round((totalFilteredPaid / totalFilteredDue) * 100) : 0}% collected
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-rose-700 dark:text-rose-400 uppercase">Outstanding Balance</span>
          <div className="text-xl font-bold font-mono text-rose-700 dark:text-rose-400 tabular-nums mt-1">
            {formatBDT(totalFilteredOutstanding)}
          </div>
          <span className="text-[11px] text-rose-600 mt-0.5 block">Pending settlement</span>
        </div>
      </div>

      {/* Advanced Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search member name, code or phone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <select
              value={selectedYearFilter}
              onChange={(e) => {
                setSelectedYearFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <option key="year-all" value="all">All Fiscal Years</option>
              {years.map(y => (
                <option key={`year-${y}`} value={String(y)}>{y}</option>
              ))}
            </select>

            <select
              value={selectedMonthFilter}
              onChange={(e) => {
                setSelectedMonthFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <option key="month-all" value="all">All Months</option>
              {MONTH_NAMES.map((name, idx) => (
                <option key={`month-${idx + 1}`} value={String(idx + 1)}>{name}</option>
              ))}
            </select>

            <select
              value={selectedStatusFilter}
              onChange={(e) => {
                setSelectedStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <option key="status-all" value="all">All Statuses</option>
              <option key="status-paid" value="paid">Paid Only</option>
              <option key="status-partial" value="partial">Partial Only</option>
              <option key="status-unpaid" value="unpaid">Unpaid Only</option>
            </select>

            <select
              value={selectedMemberFilter}
              onChange={(e) => {
                setSelectedMemberFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg truncate"
            >
              <option key="member-all" value="all">All Members ({members.length})</option>
              {members.map((m, idx) => (
                <option key={`member-${m.id || idx}`} value={m.id}>{m.member_code} - {m.full_name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Month & Year</th>
                <th className="py-3 px-4 font-semibold">Code</th>
                <th className="py-3 px-4 font-semibold">Member Name</th>
                <th className="py-3 px-4 font-semibold text-right">Due (৳)</th>
                <th className="py-3 px-4 font-semibold text-right">Paid (৳)</th>
                <th className="py-3 px-4 font-semibold text-right">Outstanding (৳)</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold">Paid Date</th>
                <th className="py-3 px-4 font-semibold">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No payment records match your filters.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((due, idx) => {
                  const balance = Math.max(0, Number(due.amount_due) - Number(due.amount_paid));

                  return (
                    <tr key={due.id || `due-${due.member_id || idx}-${due.year}-${due.month}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {getMonthName(due.month)} {due.year}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {due.member?.member_code}
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        {due.member?.full_name}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                        {formatBDT(due.amount_due)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                        {formatBDT(due.amount_paid)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-rose-700 dark:text-rose-400">
                        {balance > 0 ? formatBDT(balance) : '—'}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <StatusBadge status={due.status} size="sm" />
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {due.paid_at ? formatDate(due.paid_at) : '—'}
                      </td>

                      <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                        Admin Audit Log
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {filteredRecords.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
            {Math.min(currentPage * pageSize, filteredRecords.length)} of {filteredRecords.length} records
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono font-semibold">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
