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
import { PageTransition } from '../../components/ui/MotionPrimitives';
import { RecordPaymentModal } from '../../components/RecordPaymentModal';
import { EditPaymentModal } from '../../components/EditPaymentModal';
import {
  ArrowLeft,
  Phone,
  Calendar,
  CreditCard,
  Mail,
  User,
  Edit2,
  Trash2,
  PlusCircle,
  Download,
  Banknote,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { downloadCsv } from '../../utils/csvExport';

export const AdminMemberProfile: React.FC = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { members, monthlyDues, deleteDueRecord } = useClubData();

  const [yearFilter, setYearFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editDue, setEditDue] = useState<MonthlyDue | null>(null);
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
        <p className="text-sm font-semibold text-[#172435] dark:text-slate-200">
          Member record not found.
        </p>
        <Link
          to="/admin/members"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#087F70] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Member Directory</span>
        </Link>
      </div>
    );
  }

  const handleExportStatement = () => {
    const headers = [
      'Month',
      'Year',
      'Principal Due (BDT)',
      'Principal Paid (BDT)',
      'Fine Due (BDT)',
      'Fine Paid (BDT)',
      'Total Outstanding (BDT)',
      'Status',
      'Payment Date',
      'Notes',
    ];
    const rows = filteredLedger.map((d) => {
      const bd = calculateDueBreakdown(d, member.shares_count);
      return [
        getMonthName(d.month),
        d.year,
        bd.principalDue,
        bd.principalPaid,
        bd.fineDue,
        bd.finePaid,
        bd.totalOutstanding,
        d.status.toUpperCase(),
        d.paid_at ? formatDate(d.paid_at) : 'Unpaid',
        d.notes || '',
      ];
    });
    downloadCsv(`${member.member_code}_${member.full_name.replace(/\s+/g, '_')}_Statement.csv`, headers, rows);
  };

  return (
    <PageTransition className="space-y-6">
      {/* Top Bar Navigation & Quick Member Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E8EDF3] dark:border-[#1F2F46]">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/admin/members"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#172435] dark:text-slate-200 bg-white dark:bg-[#111C2D] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl hover:bg-[#F5F6F3] dark:hover:bg-[#162438] transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Directory</span>
          </Link>

          <select
            value={member.id}
            onChange={(e) => navigate(`/admin/members/${e.target.value}`)}
            className="px-3 py-2 text-xs font-semibold bg-white dark:bg-[#111C2D] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl text-[#172435] dark:text-slate-100 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#087F70]"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.member_code} — {m.full_name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportStatement}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#172435] dark:text-slate-200 bg-white dark:bg-[#111C2D] border border-[#E8EDF3] dark:border-[#1F2F46] hover:bg-[#F5F6F3] dark:hover:bg-[#162438] rounded-xl cursor-pointer transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setRecordTarget({})}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#087F70] hover:bg-[#06675B] rounded-xl shadow-xs cursor-pointer transition-colors whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Member Identity Card */}
      <div className="surface-card rounded-2xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-[#14243A] via-[#087F70] to-[#D6AC62]" />
        <div className="p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="w-20 h-20 rounded-full bg-[#F5F6F3] dark:bg-[#162438] ring-3 ring-[#087F70]/25 flex items-center justify-center font-bold text-2xl text-[#087F70] dark:text-[#34D399] overflow-hidden shrink-0">
            {member.profile_image_url ? (
              <img
                src={member.profile_image_url}
                alt={member.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              member.full_name.substring(0, 2).toUpperCase()
            )}
          </div>

          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
              <span className="font-mono font-bold text-[#14243A] dark:text-[#D6AC62]">
                {member.member_code}
              </span>
              <span className="text-[#64748B]">·</span>
              <span className="font-semibold text-[#087F70] dark:text-[#34D399]">
                {member.designation || 'Member'}
              </span>
              <span className="text-[#64748B]">·</span>
              <StatusBadge status={member.status} size="sm" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[#172435] dark:text-slate-100">
              {member.full_name}
            </h1>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 text-xs text-[#64748B] dark:text-slate-400 pt-0.5">
              {member.father_name && (
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#087F70]" />
                  <span>{member.father_name}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5 font-mono text-[#172435] dark:text-slate-200">
                <Phone className="w-3.5 h-3.5 text-[#087F70]" />
                <span>{member.phone || '—'}</span>
              </span>
              {member.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#087F70]" />
                  <span>{member.email}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#087F70]" />
                <span>Joined {formatDate(member.join_date)}</span>
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-[#087F70] dark:text-[#34D399] tabular-nums">
                <CreditCard className="w-3.5 h-3.5" />
                <span>
                  {formatBDT(summary.monthlyContribution)}/month ({member.shares_count}{' '}
                  {member.shares_count > 1 ? 'shares' : 'share'})
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Paid"
          value={formatBDT(summary.totalPaid)}
          subLabel={`${summary.totalPaidMonths} months cleared`}
          icon={Banknote}
          accent="emerald"
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
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[#64748B] dark:text-slate-400">
              Account Status
            </span>
            <div className="w-9 h-9 rounded-xl border bg-[#14243A]/8 text-[#14243A] dark:bg-[#203650] dark:text-slate-200 border-[#14243A]/10 dark:border-[#2B4564] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <StatusBadge status={summary.currentStatus} />
          </div>
          <div className="mt-3.5 pt-2.5 border-t border-[#E8EDF3] dark:border-[#1F2F46] text-xs text-[#64748B] dark:text-slate-400 font-mono tabular-nums">
            Last payment: {summary.lastPaymentDate ? formatDate(summary.lastPaymentDate) : 'None'}
          </div>
        </div>
      </div>

      {/* Filters & Month-by-Month Ledger */}
      <div className="surface-card rounded-2xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E8EDF3] dark:border-[#1F2F46] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[#172435] dark:text-slate-100">
              Complete Monthly Ledger ({filteredLedger.length})
            </h2>
            <p className="text-[11px] text-[#64748B] dark:text-slate-400">
              Audit, edit, or record entries for any billing cycle
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl font-mono text-[#172435] dark:text-slate-100 focus:outline-hidden"
            >
              <option value="all">All Years</option>
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl text-[#172435] dark:text-slate-100 focus:outline-hidden"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F6F3] dark:bg-[#162438] text-[#64748B] dark:text-slate-400 border-b border-[#E8EDF3] dark:border-[#1F2F46]">
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
            <tbody className="divide-y divide-[#E8EDF3] dark:divide-[#1F2F46]">
              {filteredLedger.map((d) => {
                const bd = calculateDueBreakdown(d, member.shares_count);
                const isDeleting = deleteConfirmId === d.id;

                return (
                  <tr
                    key={d.id}
                    className={`hover:bg-[#F5F6F3]/65 dark:hover:bg-[#162438]/65 transition-colors ${
                      d.isVirtual ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-medium text-[#172435] dark:text-slate-100 whitespace-nowrap">
                      <span>{getMonthName(d.month)} {d.year}</span>
                      {d.notes && (
                        <span className="block text-[10px] text-[#64748B] truncate max-w-[200px]">
                          {d.notes}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#64748B] dark:text-slate-300">
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

                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-rose-700 dark:text-rose-400">
                      {bd.totalOutstanding > 0 ? formatBDT(bd.totalOutstanding) : '—'}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <StatusBadge status={d.status} size="sm" />
                    </td>

                    <td className="py-3 px-4 font-mono text-[#64748B] dark:text-slate-400 whitespace-nowrap tabular-nums">
                      {d.paid_at ? formatDate(d.paid_at) : '—'}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {d.isVirtual ? (
                        <button
                          type="button"
                          onClick={() => setRecordTarget({ month: d.month, year: d.year })}
                          className="px-2.5 py-1 text-[11px] font-bold text-[#087F70] dark:text-[#34D399] bg-[#087F70]/10 hover:bg-[#087F70]/15 rounded-lg border border-[#087F70]/25 cursor-pointer whitespace-nowrap"
                        >
                          + Record
                        </button>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditDue(d)}
                            className="p-1.5 text-[#64748B] hover:text-[#087F70] hover:bg-[#F5F6F3] dark:hover:bg-[#203650] rounded-lg cursor-pointer"
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
                                className="px-1.5 py-0.5 text-[#64748B] text-[10px] cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(d.id)}
                              className="p-1.5 text-[#64748B] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer"
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
    </PageTransition>
  );
};
