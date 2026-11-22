import React, { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useClubData } from '../../hooks/useClubData';
import { MonthlyDue } from '../../types';
import { FISCAL_YEARS, formatBDT, formatDate, getMonthName } from '../../utils/formatters';
import {
  buildMemberCompleteLedger,
  calculateDueBreakdown,
  computeMemberFinancialSummary,
  MonthlyDueWithMeta,
} from '../../utils/fineCalculator';
import { StatusBadge } from '../../components/StatusBadge';
import { MetricCard } from '../../components/MetricCard';
import { MemberProfileGreetingHero } from '../../components/MemberProfileGreetingHero';
import { MemberAnalyticsChart } from '../../components/MemberAnalyticsChart';
import { PageTransition } from '../../components/ui/MotionPrimitives';
import { RecordPaymentModal } from '../../components/RecordPaymentModal';
import { EditPaymentModal } from '../../components/EditPaymentModal';
import { PaymentReceiptModal } from '../../components/PaymentReceiptModal';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  PlusCircle,
  Download,
  Banknote,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  Receipt,
  ImageDown,
} from 'lucide-react';
import { downloadClubTablePdf } from '../../utils/reportPdfGenerator';
import { buildPaymentReceiptPayload, downloadPaymentReceiptImage } from '../../utils/receiptGenerator';
import { useAuth } from '../../hooks/useAuth';
import crestImage from '../../assets/images/bondhon_club_crest_1793703027252.jpg';

export const AdminMemberProfile: React.FC = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { members, monthlyDues, deleteDueRecord, myMemberRecord } = useClubData();
  const { profile } = useAuth();

  const [yearFilter, setYearFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editDue, setEditDue] = useState<MonthlyDue | null>(null);
  const [receiptDue, setReceiptDue] = useState<MonthlyDue | null>(null);
  const [recordTarget, setRecordTarget] = useState<{ month?: number; year?: number } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const member = useMemo(
    () => members.find((m) => m.id === memberId) || members[0] || null,
    [members, memberId]
  );

  const memberRealDues = useMemo(() => {
    if (!member) return [];
    return monthlyDues.filter((d) => d.member_id === member.id);
  }, [monthlyDues, member]);

  const completeLedger = useMemo<MonthlyDueWithMeta[]>(() => {
    if (!member) return [];
    return buildMemberCompleteLedger(member, memberRealDues, new Date());
  }, [member, memberRealDues]);

  const summary = useMemo(() => {
    if (!member) return null;
    return computeMemberFinancialSummary(member, memberRealDues, new Date());
  }, [member, memberRealDues]);

  const years = useMemo(() => {
    const set = new Set<number>(FISCAL_YEARS);
    completeLedger.forEach((d) => set.add(d.year));
    return Array.from(set).sort((a, b) => b - a);
  }, [completeLedger]);

  const filteredLedger = useMemo(() => {
    return completeLedger.filter((d) => {
      const matchYear = yearFilter === 'all' || d.year === Number(yearFilter);
      const matchStatus = statusFilter === 'all' || d.status === statusFilter;
      return matchYear && matchStatus;
    });
  }, [completeLedger, yearFilter, statusFilter]);

  if (!member || !summary) {
    return (
      <div className="surface-card p-8 rounded-2xl text-center space-y-3">
        <p className="text-sm font-semibold text-[#0F1B2E] dark:text-slate-200">
          Member record not found.
        </p>
        <Link
          to="/admin/members"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8] dark:text-[#60A5FA] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Member Directory</span>
        </Link>
      </div>
    );
  }

  const handleExportStatement = () => {
    downloadClubTablePdf({
      filename: `${member.member_code}_${member.full_name.replace(/\s+/g, '_')}_Statement.pdf`,
      title: `Member Ledger Statement: ${member.full_name} (${member.member_code})`,
      subtitle: `${member.designation || 'Member'} · ${member.shares_count} Share(s) · BDT ${member.monthly_contribution}/mo`,
      orientation: 'landscape',
      kpis: [
        { label: 'Total Paid', value: `BDT ${Math.round(summary.totalPaid).toLocaleString('en-US')}` },
        { label: 'Total Fines Paid', value: `BDT ${Math.round(summary.totalFinePaid).toLocaleString('en-US')}` },
        { label: 'Outstanding', value: `BDT ${Math.round(summary.totalOutstanding).toLocaleString('en-US')}` },
        { label: 'Paid Months', value: `${summary.totalPaidMonths} mos` },
      ],
      columns: [
        { header: 'Billing Cycle', weight: 1.4, align: 'left' },
        { header: 'Due (BDT)', weight: 1.1, align: 'right', mono: true },
        { header: 'Paid (BDT)', weight: 1.1, align: 'right', mono: true },
        { header: 'Fine Due', weight: 1.0, align: 'right', mono: true },
        { header: 'Fine Paid', weight: 1.0, align: 'right', mono: true },
        { header: 'Outstanding', weight: 1.2, align: 'right', mono: true },
        { header: 'Status', weight: 0.9, align: 'center' },
        { header: 'Payment Date', weight: 1.1, align: 'left', mono: true },
      ],
      rows: filteredLedger.map((d) => {
        const bd = calculateDueBreakdown(d, member.shares_count);
        return [
          `${getMonthName(d.month)} ${d.year}`,
          `BDT ${Math.round(bd.principalDue).toLocaleString('en-US')}`,
          `BDT ${Math.round(bd.principalPaid).toLocaleString('en-US')}`,
          bd.fineDue > 0 ? `BDT ${Math.round(bd.fineDue).toLocaleString('en-US')}` : '-',
          bd.finePaid > 0 ? `BDT ${Math.round(bd.finePaid).toLocaleString('en-US')}` : '-',
          bd.totalOutstanding > 0 ? `BDT ${Math.round(bd.totalOutstanding).toLocaleString('en-US')}` : '-',
          d.status.toUpperCase(),
          d.paid_at ? formatDate(d.paid_at) : 'Unpaid',
        ];
      }),
    });
  };

  return (
    <PageTransition className="space-y-6">
      {/* Top Bar Navigation & Quick Member Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#DFE6F0] dark:border-[#233452]">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/admin/members"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0F1B2E] dark:text-slate-200 bg-white dark:bg-[#111B2E] border border-[#DFE6F0] dark:border-[#233452] rounded-xl hover:bg-[#EFF3F9] dark:hover:bg-[#17243C] transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Directory</span>
          </Link>

          <select
            value={member.id}
            onChange={(e) => navigate(`/admin/members/${e.target.value}`)}
            className="px-3 py-2 text-xs font-semibold bg-white dark:bg-[#111B2E] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-[#0F1B2E] dark:text-slate-100 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
          >
            {members.map((m) => (
              <option
                key={m.id}
                value={m.id}
                className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100"
              >
                {m.member_code} — {m.full_name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportStatement}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0F1B2E] dark:text-slate-200 bg-white dark:bg-[#111B2E] border border-[#DFE6F0] dark:border-[#233452] hover:bg-[#EFF3F9] dark:hover:bg-[#17243C] rounded-xl cursor-pointer transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setRecordTarget({})}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-xl shadow-xs cursor-pointer transition-colors whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Personalized Greeting & Member Identity Card */}
      <MemberProfileGreetingHero
        member={member}
        monthlyContribution={summary.monthlyContribution}
        showEmail
        showPrivateDob
      />

      {/* Real-Time Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Paid"
          value={formatBDT(summary.totalPaid)}
          subLabel={`${summary.totalPaidMonths} months cleared`}
          icon={Banknote}
          accent="sapphire"
        />
        <MetricCard
          label="Total Outstanding"
          value={formatBDT(summary.totalOutstanding)}
          subLabel={`Principal ${formatBDT(summary.principalOutstanding)} · Fine ${formatBDT(summary.totalFinePending)} (${summary.unpaidMonthsCount} mos)`}
          icon={AlertCircle}
          accent="rose"
        />
        <MetricCard
          label="Fines Paid"
          value={formatBDT(summary.totalFinePaid)}
          subLabel={`Total charged: ${formatBDT(summary.totalFineCharged)}`}
          icon={AlertTriangle}
          accent="gold"
        />
        <div className="surface-card surface-card-hover rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[#4E5E78] dark:text-slate-400">
              Account Status
            </span>
            <div className="w-9 h-9 rounded-xl border bg-[#0F1B33]/8 text-[#0F1B33] dark:bg-[#18294A] dark:text-slate-200 border-[#0F1B33]/10 dark:border-[#223862] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <StatusBadge status={summary.currentStatus} />
          </div>
          <div className="mt-3.5 pt-2.5 border-t border-[#DFE6F0] dark:border-[#233452] text-xs text-[#4E5E78] dark:text-slate-400 font-mono tabular-nums">
            Last payment: {summary.lastPaymentDate ? formatDate(summary.lastPaymentDate) : 'None'}
          </div>
        </div>
      </div>

      {/* Interactive Member Profile Analytics */}
      <MemberAnalyticsChart
        member={member}
        ledger={completeLedger}
        summary={summary}
      />

      {/* Filters & Month-by-Month Ledger */}
      <div className="surface-card rounded-2xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#DFE6F0] dark:border-[#233452] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[#0F1B2E] dark:text-slate-100">
              Complete Monthly Ledger ({filteredLedger.length})
            </h2>
            <p className="text-[11px] text-[#4E5E78] dark:text-slate-400">
              Audit, edit, or record entries for any billing cycle
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl font-mono text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden cursor-pointer"
            >
              <option value="all" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">All Years</option>
              {years.map((y) => (
                <option key={y} value={String(y)} className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">
                  {y}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden cursor-pointer"
            >
              <option value="all" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">All Status</option>
              <option value="paid" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">Paid</option>
              <option value="partial" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">Partial</option>
              <option value="unpaid" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">Unpaid</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EFF3F9] dark:bg-[#17243C] text-[#4E5E78] dark:text-slate-400 border-b border-[#DFE6F0] dark:border-[#233452]">
              <tr>
                <th className="py-3 px-4 font-semibold">Billing Cycle</th>
                <th className="py-3 px-4 font-semibold text-right">Due (৳)</th>
                <th className="py-3 px-4 font-semibold text-right">Fine (৳)</th>
                <th className="py-3 px-4 font-semibold text-right">Paid (৳)</th>
                <th className="py-3 px-4 font-semibold text-right">Outstanding (৳)</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold">Payment Date</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DFE6F0] dark:divide-[#233452]">
              {filteredLedger.map((d) => {
                const bd = calculateDueBreakdown(d, member.shares_count);
                const isDeleting = deleteConfirmId === d.id;

                return (
                  <tr
                    key={d.id}
                    className={`hover:bg-[#EFF3F9]/65 dark:hover:bg-[#17243C]/65 transition-colors ${
                      d.isVirtual ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-medium text-[#0F1B2E] dark:text-slate-100 whitespace-nowrap">
                      <span>{getMonthName(d.month)} {d.year}</span>
                      {d.notes && (
                        <span className="block text-[10px] text-[#4E5E78] truncate max-w-[200px]">
                          {d.notes}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#4E5E78] dark:text-slate-300">
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

                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-rose-700 dark:text-rose-400">
                      {bd.totalOutstanding > 0 ? formatBDT(bd.totalOutstanding) : '—'}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <StatusBadge status={d.status} size="sm" />
                    </td>

                    <td className="py-3 px-4 font-mono text-[#4E5E78] dark:text-slate-400 whitespace-nowrap tabular-nums">
                      {d.paid_at ? formatDate(d.paid_at) : '—'}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {d.isVirtual ? (
                        <button
                          type="button"
                          onClick={() => setRecordTarget({ month: d.month, year: d.year })}
                          className="px-2.5 py-1 text-[11px] font-bold text-[#1D4ED8] dark:text-[#60A5FA] bg-[#1D4ED8]/10 hover:bg-[#1D4ED8]/15 rounded-lg border border-[#1D4ED8]/25 dark:border-[#60A5FA]/35 cursor-pointer whitespace-nowrap"
                        >
                          + Record
                        </button>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          {bd.totalPaid > 0 && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  const payload = buildPaymentReceiptPayload(
                                    d,
                                    member,
                                    myMemberRecord?.full_name || profile?.full_name || 'Authorized Club Treasurer'
                                  );
                                  downloadPaymentReceiptImage(payload, crestImage);
                                }}
                                className="p-1.5 text-[#1D4ED8] dark:text-[#60A5FA] hover:bg-[#1D4ED8]/10 dark:hover:bg-[#60A5FA]/15 rounded-lg cursor-pointer"
                                title="Download Receipt Image (PNG)"
                              >
                                <ImageDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setReceiptDue(d)}
                                className="p-1.5 text-[#0369A1] dark:text-[#38BDF8] hover:bg-[#0369A1]/10 dark:hover:bg-[#38BDF8]/15 rounded-lg cursor-pointer"
                                title="Preview / Print Official Receipt"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => setEditDue(d)}
                            className="p-1.5 text-[#4E5E78] hover:text-[#1D4ED8] dark:hover:text-[#60A5FA] hover:bg-[#EFF3F9] dark:hover:bg-[#18294A] rounded-lg cursor-pointer"
                            title="Edit Payment"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {isDeleting ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  deleteDueRecord(d.id);
                                  setDeleteConfirmId(null);
                                }}
                                className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-semibold cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-1.5 py-0.5 text-[#4E5E78] text-[10px] cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(d.id)}
                              className="p-1.5 text-[#4E5E78] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer"
                              title="Delete Entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={Boolean(recordTarget)}
        onClose={() => setRecordTarget(null)}
        initialMemberId={member.id}
        initialMonth={recordTarget?.month}
        initialYear={recordTarget?.year}
      />

      {/* Edit Payment Modal */}
      <EditPaymentModal due={editDue} onClose={() => setEditDue(null)} />

      {/* Printable / PDF Official Payment Receipt */}
      <PaymentReceiptModal
        due={receiptDue}
        member={member}
        onClose={() => setReceiptDue(null)}
      />
    </PageTransition>
  );
};
