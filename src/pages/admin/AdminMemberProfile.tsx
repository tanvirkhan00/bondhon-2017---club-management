import React, { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useClubData } from '../../hooks/useClubData';
import { MonthlyDue } from '../../types';
import { formatBDT, formatDate, getMonthName } from '../../utils/formatters';
import {
  buildMemberCompleteLedger,
  calculateDueBreakdown,
  computeMemberFinancialSummary,
  MonthlyDueWithMeta,
} from '../../utils/fineCalculator';
import { StatusBadge } from '../../components/StatusBadge';
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
    const set = new Set<number>([2026, 2025, 2024]);
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
      <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Member record not found.</p>
        <Link
          to="/admin/members"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline"
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
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Bar Navigation & Quick Member Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/members"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Directory</span>
          </Link>

          <select
            value={member.id}
            onChange={(e) => navigate(`/admin/members/${e.target.value}`)}
            className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 cursor-pointer"
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 rounded-lg cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setRecordTarget({})}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Member Identity Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-emerald-600/30 flex items-center justify-center font-bold text-2xl text-emerald-800 dark:text-emerald-300 overflow-hidden shrink-0">
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

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono font-bold">
                {member.member_code}
              </span>
              <StatusBadge status={member.status} size="sm" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                {member.designation || 'Member'}
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {member.full_name}
            </h1>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-500 pt-0.5">
              {member.father_name && (
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{member.father_name}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-300">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{member.phone || '—'}</span>
              </span>
              {member.email && (
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{member.email}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Joined {formatDate(member.join_date)}</span>
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Paid
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400 tabular-nums mt-1">
            {formatBDT(summary.totalPaid)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {summary.totalPaidMonths} months cleared
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Outstanding
          </span>
          <div className="text-2xl font-bold font-mono text-rose-700 dark:text-rose-400 tabular-nums mt-1">
            {formatBDT(summary.totalOutstanding)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Principal {formatBDT(summary.principalOutstanding)} · Fine {formatBDT(summary.totalFinePending)} ({summary.unpaidMonthsCount} mos)
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
            Fines Paid
          </span>
          <div className="text-2xl font-bold font-mono text-amber-700 dark:text-amber-400 tabular-nums mt-1">
            {formatBDT(summary.totalFinePaid)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Total charged: {formatBDT(summary.totalFineCharged)}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Account Status
          </span>
          <div className="mt-1.5">
            <StatusBadge status={summary.currentStatus} />
          </div>
          <span className="text-[11px] text-slate-500 mt-1.5 block font-mono">
            Last payment: {summary.lastPaymentDate ? formatDate(summary.lastPaymentDate) : 'None'}
          </span>
        </div>
      </div>

      {/* Filters & Month-by-Month Ledger */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Complete Monthly Ledger ({filteredLedger.length})
            </h2>
            <p className="text-[11px] text-slate-500">
              Audit, edit, or record entries for any billing cycle
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
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
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
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
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
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
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLedger.map((d) => {
                const bd = calculateDueBreakdown(d, member.shares_count);
                const isDeleting = deleteConfirmId === d.id;

                return (
                  <tr
                    key={d.id}
                    className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                      d.isVirtual ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      <span>{getMonthName(d.month)} {d.year}</span>
                      {d.notes && (
                        <span className="block text-[10px] text-slate-400 truncate max-w-[200px]">
                          {d.notes}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {formatBDT(bd.principalDue)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono tabular-nums text-amber-700 dark:text-amber-400">
                      {bd.fineDue > 0 ? (
                        <span>
                          {formatBDT(bd.fineDue)}
                          {bd.finePaid > 0 && (
                            <span className="block text-[10px] text-emerald-600">
                              Paid: {formatBDT(bd.finePaid)}
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

                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-rose-700 dark:text-rose-400">
                      {bd.totalOutstanding > 0 ? formatBDT(bd.totalOutstanding) : '—'}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <StatusBadge status={d.status} size="sm" />
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {d.paid_at ? formatDate(d.paid_at) : '—'}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {d.isVirtual ? (
                        <button
                          type="button"
                          onClick={() => setRecordTarget({ month: d.month, year: d.year })}
                          className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg border border-emerald-200 cursor-pointer"
                        >
                          + Record
                        </button>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditDue(d)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md cursor-pointer"
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
                                className="px-1.5 py-0.5 text-slate-500 text-[10px] cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(d.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md cursor-pointer"
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
    </div>
  );
};
