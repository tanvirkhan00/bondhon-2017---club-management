import React, { useState, useMemo } from 'react';
import { useClubData } from '../../hooks/useClubData';
import { formatBDT, formatDate, getMonthName, MONTH_NAMES } from '../../utils/formatters';
import { downloadCsv } from '../../utils/csvExport';
import {
  BarChart3,
  Download,
  Calendar,
  FileSpreadsheet,
  TrendingUp,
  AlertCircle,
  Users,
  Award,
} from 'lucide-react';

export const AdminReports: React.FC = () => {
  const {
    monthSummaries,
    selectedYear,
    setSelectedYear,
    monthlyDues,
    members,
    selectedMonth,
  } = useClubData();

  const [activeTab, setActiveTab] = useState<'monthly' | 'yearly' | 'members'>('monthly');

  // Yearly aggregates
  const yearDues = monthlyDues.filter(d => d.year === selectedYear);
  const totalYearTarget = yearDues.reduce((sum, d) => sum + Number(d.amount_due), 0);
  const totalYearCollected = yearDues.reduce((sum, d) => sum + Number(d.amount_paid), 0);
  const totalYearOutstanding = Math.max(0, totalYearTarget - totalYearCollected);
  const yearCollectionRate = totalYearTarget > 0 ? Math.round((totalYearCollected / totalYearTarget) * 100) : 0;

  // Member-wise ranking report
  const memberRankings = useMemo(() => {
    return members
      .map((m) => {
        const dues = monthlyDues.filter(d => d.member_id === m.id);
        const billed = dues.reduce((acc, d) => acc + Number(d.amount_due), 0);
        const paid = dues.reduce((acc, d) => acc + Number(d.amount_paid), 0);
        const outstanding = Math.max(0, billed - paid);
        const paidMonths = dues.filter(d => d.status === 'paid').length;
        const unpaidMonths = dues.filter(d => d.status === 'unpaid' || d.status === 'partial').length;

        return {
          member: m,
          billed,
          paid,
          outstanding,
          paidMonths,
          unpaidMonths,
          settlementRate: billed > 0 ? Math.round((paid / billed) * 100) : 0,
        };
      })
      .sort((a, b) => b.paid - a.paid);
  }, [members, monthlyDues]);

  // Export Yearly Report CSV
  const handleExportYearlyReport = () => {
    const headers = [
      'Month',
      'Target Amount (BDT)',
      'Collected Amount (BDT)',
      'Outstanding Amount (BDT)',
      'Paid Members',
      'Unpaid Members',
      'Active Members',
      'Collection Efficiency (%)',
    ];

    const rows = monthSummaries.map(m => [
      m.label,
      m.target,
      m.collected,
      m.outstanding,
      m.paidCount,
      m.unpaidCount,
      m.totalActive,
      `${m.collectionRate}%`,
    ]);

    rows.push([
      `TOTAL ${selectedYear}`,
      totalYearTarget,
      totalYearCollected,
      totalYearOutstanding,
      '',
      '',
      '',
      `${yearCollectionRate}%`,
    ]);

    downloadCsv(`Bondhon_2017_Yearly_Report_${selectedYear}.csv`, headers, rows);
  };

  // Export Member-Wise Report CSV
  const handleExportMembersReport = () => {
    const headers = [
      'Member Code',
      'Full Name',
      'Designation',
      'Status',
      'Total Billed (BDT)',
      'Total Paid (BDT)',
      'Outstanding (BDT)',
      'Paid Months',
      'Unpaid Months',
      'Settlement Rate (%)',
    ];

    const rows = memberRankings.map(r => [
      r.member.member_code,
      r.member.full_name,
      r.member.designation || 'Member',
      r.member.status.toUpperCase(),
      r.billed,
      r.paid,
      r.outstanding,
      r.paidMonths,
      r.unpaidMonths,
      `${r.settlementRate}%`,
    ]);

    downloadCsv(`Bondhon_2017_Member_Contributions_${new Date().toISOString().substring(0, 10)}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
            <span>Financial Reports & Backups</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Annual reconciliations, member-wise contribution rankings, and CSV export backups
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-transparent focus:outline-hidden cursor-pointer"
            >
              <option value={2026}>Fiscal Year 2026</option>
              <option value={2025}>Fiscal Year 2025</option>
              <option value={2024}>Fiscal Year 2024</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-500 uppercase">{selectedYear} Annual Target</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums mt-1">
            {formatBDT(totalYearTarget)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Expected annual dues</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 uppercase">Annual Collection</span>
          <div className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400 tabular-nums mt-1">
            {formatBDT(totalYearCollected)}
          </div>
          <span className="text-[11px] text-emerald-600 mt-1 block">{yearCollectionRate}% collection rate</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-rose-700 dark:text-rose-400 uppercase">Outstanding Balance</span>
          <div className="text-2xl font-bold font-mono text-rose-700 dark:text-rose-400 tabular-nums mt-1">
            {formatBDT(totalYearOutstanding)}
          </div>
          <span className="text-[11px] text-rose-600 mt-1 block">Unsettled dues</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-500 uppercase">Contributing Members</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums mt-1">
            {members.filter(m => m.status === 'active').length}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Active roster</span>
        </div>
      </div>

      {/* Report Tabs & CSV Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'monthly'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Monthly Reconciliation ({selectedYear})
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'members'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Member-Wise Rankings
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'monthly' ? (
            <button
              onClick={handleExportYearlyReport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Monthly Report CSV</span>
            </button>
          ) : (
            <button
              onClick={handleExportMembersReport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Members Ranking CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: Monthly Breakdown */}
      {activeTab === 'monthly' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Month</th>
                  <th className="py-3 px-4 font-semibold text-right">Target (৳)</th>
                  <th className="py-3 px-4 font-semibold text-right">Collected (৳)</th>
                  <th className="py-3 px-4 font-semibold text-right">Outstanding (৳)</th>
                  <th className="py-3 px-4 font-semibold text-center">Paid Count</th>
                  <th className="py-3 px-4 font-semibold text-center">Unpaid Count</th>
                  <th className="py-3 px-4 font-semibold text-right">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {monthSummaries.map((m) => (
                  <tr key={m.month} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {m.label}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                      {formatBDT(m.target)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                      {formatBDT(m.collected)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-rose-700 dark:text-rose-400">
                      {m.outstanding > 0 ? formatBDT(m.outstanding) : '—'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono tabular-nums text-slate-700">
                      {m.paidCount}
                    </td>
                    <td className="py-3 px-4 text-center font-mono tabular-nums text-slate-700">
                      {m.unpaidCount}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                      {m.target > 0 ? `${m.collectionRate}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100/70 dark:bg-slate-800/90 font-bold text-slate-900 dark:text-slate-100 border-t border-slate-200 dark:border-slate-800">
                <tr>
                  <td className="py-3 px-4">TOTAL {selectedYear}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">{formatBDT(totalYearTarget)}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400">{formatBDT(totalYearCollected)}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-rose-700 dark:text-rose-400">{formatBDT(totalYearOutstanding)}</td>
                  <td colSpan={2}></td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">{yearCollectionRate}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Member-Wise Ranking */}
      {activeTab === 'members' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Rank</th>
                  <th className="py-3 px-4 font-semibold">Member</th>
                  <th className="py-3 px-4 font-semibold">Code</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Billed (৳)</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Paid (৳)</th>
                  <th className="py-3 px-4 font-semibold text-right">Outstanding (৳)</th>
                  <th className="py-3 px-4 font-semibold text-center">Settled Months</th>
                  <th className="py-3 px-4 font-semibold text-right">Efficiency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {memberRankings.map((r, index) => (
                  <tr key={r.member.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-400">
                      #{index + 1}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {r.member.full_name}
                      <span className="block text-[10px] text-emerald-700 font-normal">
                        {r.member.designation || 'Member'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                      {r.member.member_code}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                      {formatBDT(r.billed)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                      {formatBDT(r.paid)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-rose-700 dark:text-rose-400">
                      {r.outstanding > 0 ? formatBDT(r.outstanding) : '—'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono tabular-nums text-slate-700">
                      {r.paidMonths} mo
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                      {r.settlementRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
