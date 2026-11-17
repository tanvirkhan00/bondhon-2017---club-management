import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useClubData } from '../../hooks/useClubData';
import { FISCAL_YEARS, formatBDT } from '../../utils/formatters';
import { computeMemberFinancialSummary } from '../../utils/fineCalculator';
import { downloadCsv } from '../../utils/csvExport';
import { MetricCard } from '../../components/MetricCard';
import { PageTransition } from '../../components/ui/MotionPrimitives';
import {
  BarChart3,
  Download,
  Calendar,
  Target,
  Banknote,
  AlertCircle,
  Users,
} from 'lucide-react';

export const AdminReports: React.FC = () => {
  const {
    monthSummaries,
    selectedYear,
    setSelectedYear,
    monthlyDues,
    members,
  } = useClubData();

  const [activeTab, setActiveTab] = useState<'monthly' | 'yearly' | 'members'>('monthly');

  // Yearly aggregates anchored to ৳17,000/month club target via monthSummaries
  const totalYearTarget = monthSummaries.reduce((sum, m) => sum + m.target, 0);
  const totalYearCollected = monthSummaries.reduce((sum, m) => sum + m.collected, 0);
  const totalYearOutstanding = Math.max(0, totalYearTarget - totalYearCollected);
  const yearCollectionRate = totalYearTarget > 0 ? Math.round((totalYearCollected / totalYearTarget) * 100) : 0;

  // Member-wise ranking report using real-time complete ledger
  const memberRankings = useMemo(() => {
    const now = new Date();
    return members
      .map((m) => {
        const dues = monthlyDues.filter((d) => d.member_id === m.id);
        const summary = computeMemberFinancialSummary(m, dues, now);
        const paidTotal = summary.totalPaid + summary.totalFinePaid;

        return {
          member: m,
          billed: summary.totalBilled,
          paid: paidTotal,
          outstanding: summary.totalOutstanding,
          paidMonths: summary.totalPaidMonths,
          unpaidMonths: summary.unpaidMonthsCount,
          settlementRate: summary.totalBilled > 0 ? Math.round((paidTotal / summary.totalBilled) * 100) : 0,
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

    const rows = monthSummaries.map((m) => [
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

    const rows = memberRankings.map((r) => [
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
    <PageTransition className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8EDF3] dark:border-[#1F2F46]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#172435] dark:text-slate-100 flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-[#087F70]" />
            <span>Financial Reports &amp; Backups</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 mt-0.5">
            Annual reconciliations, member-wise contribution rankings, and CSV export backups
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#111C2D] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl px-3 py-2 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-[#087F70] shrink-0" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-xs font-semibold font-mono tabular-nums text-[#172435] dark:text-slate-100 bg-white dark:bg-[#111C2D] focus:outline-hidden cursor-pointer"
            >
              {FISCAL_YEARS.map((yr) => (
                <option
                  key={yr}
                  value={yr}
                  className="bg-white text-[#172435] dark:bg-[#111C2D] dark:text-slate-100"
                >
                  Fiscal Year {yr}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label={`${selectedYear} Annual Target`}
          value={formatBDT(totalYearTarget)}
          subLabel="Expected annual dues"
          icon={Target}
          accent="navy"
        />
        <MetricCard
          label="Annual Collection"
          value={formatBDT(totalYearCollected)}
          subLabel={`${yearCollectionRate}% collection rate`}
          icon={Banknote}
          accent="emerald"
        />
        <MetricCard
          label="Outstanding Balance"
          value={formatBDT(totalYearOutstanding)}
          subLabel="Unsettled dues"
          icon={AlertCircle}
          accent="rose"
        />
        <MetricCard
          label="Contributing Members"
          value={members.filter((m) => m.status === 'active').length}
          subLabel="Active roster"
          icon={Users}
          accent="gold"
        />
      </div>

      {/* Report Tabs & CSV Action */}
      <div className="surface-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl">
        <div className="flex items-center gap-1 p-1 bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl self-start">
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'monthly'
                ? 'bg-[#14243A] dark:bg-[#087F70] text-white shadow-2xs'
                : 'text-[#64748B] hover:text-[#172435] dark:hover:text-white'
            }`}
          >
            Monthly Reconciliation ({selectedYear})
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'members'
                ? 'bg-[#14243A] dark:bg-[#087F70] text-white shadow-2xs'
                : 'text-[#64748B] hover:text-[#172435] dark:hover:text-white'
            }`}
          >
            Member-Wise Rankings
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'monthly' ? (
            <button
              onClick={handleExportYearlyReport}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#087F70] hover:bg-[#06675B] rounded-xl transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Monthly Report CSV</span>
            </button>
          ) : (
            <button
              onClick={handleExportMembersReport}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#087F70] hover:bg-[#06675B] rounded-xl transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Members Ranking CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: Monthly Breakdown */}
      {activeTab === 'monthly' && (
        <div className="surface-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F6F3] dark:bg-[#162438] text-[#64748B] dark:text-slate-400 border-b border-[#E8EDF3] dark:border-[#1F2F46]">
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
              <tbody className="divide-y divide-[#E8EDF3] dark:divide-[#1F2F46]">
                {monthSummaries.map((m) => (
                  <tr
                    key={m.month}
                    className="hover:bg-[#F5F6F3]/65 dark:hover:bg-[#162438]/65 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-[#172435] dark:text-slate-100 whitespace-nowrap">
                      {m.label}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#64748B] dark:text-slate-300">
                      {formatBDT(m.target)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-[#087F70] dark:text-[#34D399]">
                      {formatBDT(m.collected)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-rose-700 dark:text-rose-400">
                      {m.outstanding > 0 ? formatBDT(m.outstanding) : '—'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono tabular-nums text-[#172435] dark:text-slate-200">
                      {m.paidCount}
                    </td>
                    <td className="py-3 px-4 text-center font-mono tabular-nums text-[#172435] dark:text-slate-200">
                      {m.unpaidCount}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#172435] dark:text-slate-100">
                      {m.target > 0 ? `${m.collectionRate}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#14243A] dark:bg-[#162438] dark:border-t dark:border-[#2B4564] text-white font-bold">
                <tr>
                  <td className="py-3 px-4">TOTAL {selectedYear}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">{formatBDT(totalYearTarget)}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#34D399]">{formatBDT(totalYearCollected)}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-rose-300">{formatBDT(totalYearOutstanding)}</td>
                  <td colSpan={2}></td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#D6AC62]">{yearCollectionRate}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Member-Wise Ranking */}
      {activeTab === 'members' && (
        <div className="surface-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F6F3] dark:bg-[#162438] text-[#64748B] dark:text-slate-400 border-b border-[#E8EDF3] dark:border-[#1F2F46]">
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
              <tbody className="divide-y divide-[#E8EDF3] dark:divide-[#1F2F46]">
                {memberRankings.map((r, index) => (
                  <tr
                    key={r.member.id}
                    className="hover:bg-[#F5F6F3]/65 dark:hover:bg-[#162438]/65 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-[#9A7127] dark:text-[#D6AC62] tabular-nums">
                      #{index + 1}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#172435] dark:text-slate-100">
                      <Link
                        to={`/admin/members/${r.member.id}`}
                        className="hover:text-[#087F70] dark:hover:text-[#34D399]"
                      >
                        {r.member.full_name}
                      </Link>
                      <span className="block text-[10px] text-[#087F70] dark:text-[#34D399] font-normal">
                        {r.member.designation || 'Member'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#172435] dark:text-slate-100">
                      {r.member.member_code}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#64748B] dark:text-slate-300">
                      {formatBDT(r.billed)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-[#087F70] dark:text-[#34D399]">
                      {formatBDT(r.paid)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-rose-700 dark:text-rose-400">
                      {r.outstanding > 0 ? formatBDT(r.outstanding) : '—'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono tabular-nums text-[#172435] dark:text-slate-200">
                      {r.paidMonths} mo
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#172435] dark:text-slate-100">
                      {r.settlementRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageTransition>
  );
};
