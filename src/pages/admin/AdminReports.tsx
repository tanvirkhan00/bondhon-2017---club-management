import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useClubData } from '../../hooks/useClubData';
import { FISCAL_YEARS, formatBDT, formatDate, getMonthName } from '../../utils/formatters';
import { calculateDueBreakdown, computeMemberFinancialSummary } from '../../utils/fineCalculator';
import {
  downloadMonthlyReconciliationPdf,
  downloadMemberRankingsPdf,
  downloadCustomRangeTransactionsPdf,
} from '../../utils/reportPdfGenerator';
import { MetricCard } from '../../components/MetricCard';
import { PageTransition } from '../../components/ui/MotionPrimitives';
import { PaymentReceiptModal } from '../../components/PaymentReceiptModal';
import { MonthlyDue } from '../../types';
import {
  BarChart3,
  Download,
  Calendar,
  Target,
  Banknote,
  AlertCircle,
  Users,
  Receipt,
} from 'lucide-react';

export const AdminReports: React.FC = () => {
  const {
    monthSummaries,
    selectedYear,
    setSelectedYear,
    monthlyDues,
    members,
  } = useClubData();

  const [activeTab, setActiveTab] = useState<'monthly' | 'members' | 'custom'>('monthly');
  const [customStartDate, setCustomStartDate] = useState<string>(() => `${new Date().getFullYear()}-01-01`);
  const [customEndDate, setCustomEndDate] = useState<string>(() => new Date().toISOString().substring(0, 10));
  const [receiptDue, setReceiptDue] = useState<MonthlyDue | null>(null);

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

  // Custom Date Range real paid transactions
  const customRangeTransactions = useMemo(() => {
    return monthlyDues
      .filter((d) => {
        const total = Number(d.amount_paid || 0) + Number(d.fine_paid || 0);
        if (total <= 0 || !d.paid_at) return false;
        const iso = d.paid_at.substring(0, 10);
        return (!customStartDate || iso >= customStartDate) && (!customEndDate || iso <= customEndDate);
      })
      .sort((a, b) => (b.paid_at || '').localeCompare(a.paid_at || ''));
  }, [monthlyDues, customStartDate, customEndDate]);

  const customRangeTotals = useMemo(() => {
    return customRangeTransactions.reduce(
      (acc, d) => ({
        principal: acc.principal + Number(d.amount_paid || 0),
        fine: acc.fine + Number(d.fine_paid || 0),
        total: acc.total + Number(d.amount_paid || 0) + Number(d.fine_paid || 0),
      }),
      { principal: 0, fine: 0, total: 0 }
    );
  }, [customRangeTransactions]);

  // Export Yearly Report PDF
  const handleExportYearlyReport = () => {
    downloadMonthlyReconciliationPdf({
      year: selectedYear,
      monthSummaries,
      totalYearTarget,
      totalYearCollected,
      totalYearOutstanding,
      yearCollectionRate,
    });
  };

  // Export Member-Wise Report PDF
  const handleExportMembersReport = () => {
    downloadMemberRankingsPdf({
      rankings: memberRankings,
    });
  };

  // Export Custom Date Range PDF
  const handleExportCustomReport = () => {
    downloadCustomRangeTransactionsPdf({
      startDate: customStartDate,
      endDate: customEndDate,
      transactions: customRangeTransactions,
      totals: customRangeTotals,
    });
  };

  return (
    <PageTransition className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DFE6F0] dark:border-[#233452]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F1B2E] dark:text-slate-100 flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-[#1D4ED8] dark:text-[#60A5FA]" />
            <span>Financial Reports &amp; Backups</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#4E5E78] dark:text-slate-400 mt-0.5">
            Annual reconciliations, member-wise contribution rankings, and A4 PDF report exports
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#111B2E] border border-[#DFE6F0] dark:border-[#233452] rounded-xl px-3 py-2 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#60A5FA] shrink-0" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-xs font-semibold font-mono tabular-nums text-[#0F1B2E] dark:text-slate-100 bg-white dark:bg-[#111B2E] focus:outline-hidden cursor-pointer"
            >
              {FISCAL_YEARS.map((yr) => (
                <option
                  key={yr}
                  value={yr}
                  className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100"
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
          accent="sapphire"
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
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl self-start">
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'monthly'
                ? 'bg-[#0F1B33] dark:bg-[#1D4ED8] text-white shadow-2xs'
                : 'text-[#4E5E78] hover:text-[#0F1B2E] dark:hover:text-white'
            }`}
          >
            Monthly Reconciliation ({selectedYear})
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'members'
                ? 'bg-[#0F1B33] dark:bg-[#1D4ED8] text-white shadow-2xs'
                : 'text-[#4E5E78] hover:text-[#0F1B2E] dark:hover:text-white'
            }`}
          >
            Member-Wise Rankings
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'custom'
                ? 'bg-[#0F1B33] dark:bg-[#1D4ED8] text-white shadow-2xs'
                : 'text-[#4E5E78] hover:text-[#0F1B2E] dark:hover:text-white'
            }`}
          >
            Custom Date Range
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'monthly' ? (
            <button
              onClick={handleExportYearlyReport}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-xl transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Monthly Report PDF</span>
            </button>
          ) : activeTab === 'members' ? (
            <button
              onClick={handleExportMembersReport}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-xl transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Members Ranking PDF</span>
            </button>
          ) : (
            <button
              onClick={handleExportCustomReport}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-xl transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Range PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: Monthly Breakdown */}
      {activeTab === 'monthly' && (
        <div className="surface-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EFF3F9] dark:bg-[#17243C] text-[#4E5E78] dark:text-slate-400 border-b border-[#DFE6F0] dark:border-[#233452]">
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
              <tbody className="divide-y divide-[#DFE6F0] dark:divide-[#233452]">
                {monthSummaries.map((m) => (
                  <tr
                    key={m.month}
                    className="hover:bg-[#EFF3F9]/65 dark:hover:bg-[#17243C]/65 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-[#0F1B2E] dark:text-slate-100 whitespace-nowrap">
                      {m.label}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#4E5E78] dark:text-slate-300">
                      {formatBDT(m.target)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-[#0369A1] dark:text-[#38BDF8]">
                      {formatBDT(m.collected)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-rose-700 dark:text-rose-400">
                      {m.outstanding > 0 ? formatBDT(m.outstanding) : '—'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono tabular-nums text-[#0F1B2E] dark:text-slate-200">
                      {m.paidCount}
                    </td>
                    <td className="py-3 px-4 text-center font-mono tabular-nums text-[#0F1B2E] dark:text-slate-200">
                      {m.unpaidCount}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#0F1B2E] dark:text-slate-100">
                      {m.target > 0 ? `${m.collectionRate}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#0F1B33] dark:bg-[#17243C] dark:border-t dark:border-[#223862] text-white font-bold">
                <tr>
                  <td className="py-3 px-4">TOTAL {selectedYear}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">{formatBDT(totalYearTarget)}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#38BDF8]">{formatBDT(totalYearCollected)}</td>
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
              <thead className="bg-[#EFF3F9] dark:bg-[#17243C] text-[#4E5E78] dark:text-slate-400 border-b border-[#DFE6F0] dark:border-[#233452]">
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
              <tbody className="divide-y divide-[#DFE6F0] dark:divide-[#233452]">
                {memberRankings.map((r, index) => (
                  <tr
                    key={r.member.id}
                    className="hover:bg-[#EFF3F9]/65 dark:hover:bg-[#17243C]/65 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-[#92600A] dark:text-[#F0C56E] tabular-nums">
                      #{index + 1}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#0F1B2E] dark:text-slate-100">
                      <Link
                        to={`/admin/members/${r.member.id}`}
                        className="hover:text-[#1D4ED8] dark:hover:text-[#60A5FA]"
                      >
                        {r.member.full_name}
                      </Link>
                      <span className="block text-[10px] text-[#1D4ED8] dark:text-[#60A5FA] font-normal">
                        {r.member.designation || 'Member'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#0F1B2E] dark:text-slate-100">
                      {r.member.member_code}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#4E5E78] dark:text-slate-300">
                      {formatBDT(r.billed)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-[#0369A1] dark:text-[#38BDF8]">
                      {formatBDT(r.paid)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-rose-700 dark:text-rose-400">
                      {r.outstanding > 0 ? formatBDT(r.outstanding) : '—'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono tabular-nums text-[#0F1B2E] dark:text-slate-200">
                      {r.paidMonths} mo
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#0F1B2E] dark:text-slate-100">
                      {r.settlementRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* TAB 3: Custom Date Range Transactions */}
      {activeTab === 'custom' && (
        <div className="space-y-4">
          <div className="surface-card p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-semibold text-[#0F1B2E] dark:text-slate-200">Paid Date Range:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] font-mono text-[#0F1B2E] dark:text-slate-100"
              />
              <span className="text-[#4E5E78]">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] font-mono text-[#0F1B2E] dark:text-slate-100"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 font-mono tabular-nums">
              <span>
                Entries: <strong className="text-[#0F1B2E] dark:text-white">{customRangeTransactions.length}</strong>
              </span>
              <span>
                Dues: <strong className="text-[#0369A1] dark:text-[#38BDF8]">{formatBDT(customRangeTotals.principal)}</strong>
              </span>
              <span>
                Fines: <strong className="text-[#92600A] dark:text-[#F0C56E]">{formatBDT(customRangeTotals.fine)}</strong>
              </span>
              <span>
                Total: <strong className="text-[#1D4ED8] dark:text-[#60A5FA]">{formatBDT(customRangeTotals.total)}</strong>
              </span>
            </div>
          </div>

          <div className="surface-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#EFF3F9] dark:bg-[#17243C] text-[#4E5E78] dark:text-slate-400 border-b border-[#DFE6F0] dark:border-[#233452]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Paid Date</th>
                    <th className="py-3 px-4 font-semibold">Code</th>
                    <th className="py-3 px-4 font-semibold">Member</th>
                    <th className="py-3 px-4 font-semibold">Billing Cycle</th>
                    <th className="py-3 px-4 font-semibold text-right">Principal Paid</th>
                    <th className="py-3 px-4 font-semibold text-right">Fine Paid</th>
                    <th className="py-3 px-4 font-semibold text-right">Total Paid</th>
                    <th className="py-3 px-4 font-semibold text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DFE6F0] dark:divide-[#233452]">
                  {customRangeTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-[#4E5E78]">
                        No settled payments found inside the selected date range.
                      </td>
                    </tr>
                  ) : (
                    customRangeTransactions.map((d) => {
                      const bd = calculateDueBreakdown(d, d.member?.shares_count);
                      return (
                        <tr
                          key={d.id}
                          className="hover:bg-[#EFF3F9]/65 dark:hover:bg-[#17243C]/65 transition-colors"
                        >
                          <td className="py-3 px-4 font-mono tabular-nums text-[#4E5E78] dark:text-slate-300">
                            {d.paid_at ? formatDate(d.paid_at) : '—'}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-[#0F1B2E] dark:text-slate-100">
                            {d.member?.member_code}
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#0F1B2E] dark:text-slate-100">
                            <Link
                              to={`/admin/members/${d.member_id}`}
                              className="hover:text-[#1D4ED8] dark:hover:text-[#60A5FA]"
                            >
                              {d.member?.full_name}
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-[#4E5E78] dark:text-slate-300">
                            {getMonthName(d.month)} {d.year}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-[#0F1B2E] dark:text-slate-200">
                            {formatBDT(bd.principalPaid)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-[#92600A] dark:text-[#F0C56E]">
                            {bd.finePaid > 0 ? formatBDT(bd.finePaid) : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-[#0369A1] dark:text-[#38BDF8]">
                            {formatBDT(bd.totalPaid)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setReceiptDue(d)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-[#0369A1] dark:text-[#38BDF8] bg-[#0369A1]/10 rounded-lg cursor-pointer"
                            >
                              <Receipt className="w-3 h-3" />
                              <span>Receipt</span>
                            </button>
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
      )}

      <PaymentReceiptModal due={receiptDue} onClose={() => setReceiptDue(null)} />
    </PageTransition>
  );
};
