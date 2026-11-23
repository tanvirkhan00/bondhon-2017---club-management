import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useClubData } from '../../hooks/useClubData';
import { useAuth } from '../../hooks/useAuth';
import { MonthlyDue } from '../../types';
import { FISCAL_YEARS, formatBDT, formatDate, getMonthName, MONTH_NAMES } from '../../utils/formatters';
import { calculateDueBreakdown, MonthlyDueWithMeta, parseLocalDate } from '../../utils/fineCalculator';
import { StatusBadge } from '../../components/StatusBadge';
import { MetricCard } from '../../components/MetricCard';
import { Modal } from '../../components/ui/Modal';
import { PageTransition } from '../../components/ui/MotionPrimitives';
import {
  CreditCard,
  PlusCircle,
  Search,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Edit2,
  Trash2,
  AlertTriangle,
  Target,
  Banknote,
  Users,
} from 'lucide-react';
import { RecordPaymentModal } from '../../components/RecordPaymentModal';
import { EditPaymentModal } from '../../components/EditPaymentModal';

export const AdminPayments: React.FC = () => {
  const {
    monthlyDues,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    generateMonthlyDues,
    markAsPaid,
    recordNewPayment,
    deleteDueRecord,
    members,
    clubMonthlyTarget,
  } = useClubData();
  const { canEditAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [targetMemberForRecord, setTargetMemberForRecord] = useState<string | undefined>(undefined);
  const [targetGenMonth, setTargetGenMonth] = useState<number>(selectedMonth);
  const [targetGenYear, setTargetGenYear] = useState<number>(selectedYear);
  const [genMessage, setGenMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [genLoading, setGenLoading] = useState(false);

  // Edit payment modal
  const [editDue, setEditDue] = useState<MonthlyDue | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Active dues for current month and year
  const currentMonthDues = useMemo<MonthlyDueWithMeta[]>(() => {
    const existingByMember = new Map<string, MonthlyDue>();
    monthlyDues.forEach((d) => {
      if (d.month === selectedMonth && d.year === selectedYear) {
        existingByMember.set(d.member_id, d);
      }
    });

    const selectedPeriodKey = selectedYear * 100 + selectedMonth;
    const list: MonthlyDueWithMeta[] = [];

    members
      .filter((m) => m.status === 'active')
      .forEach((m) => {
        const existing = existingByMember.get(m.id);
        if (existing) {
          list.push({ ...existing, isVirtual: false });
          return;
        }
        const joinParsed = parseLocalDate(m.join_date || '2024-04-01');
        const joinPeriodKey = joinParsed.getFullYear() * 100 + (joinParsed.getMonth() + 1);
        if (joinPeriodKey <= selectedPeriodKey) {
          list.push({
            id: `virtual-${selectedYear}-${selectedMonth}-${m.id}`,
            member_id: m.id,
            member: m,
            month: selectedMonth,
            year: selectedYear,
            amount_due: m.monthly_contribution || (m.shares_count || 1) * 500,
            amount_paid: 0,
            fine_due: 0,
            fine_paid: 0,
            status: 'unpaid',
            paid_at: null,
            isVirtual: true,
          });
        }
      });

    monthlyDues.forEach((d) => {
      if (d.month === selectedMonth && d.year === selectedYear && !list.some((x) => x.member_id === d.member_id)) {
        list.push({ ...d, isVirtual: false });
      }
    });

    return list;
  }, [monthlyDues, members, selectedMonth, selectedYear]);

  const filteredDues = useMemo(() => {
    return currentMonthDues.filter((due) => {
      const name = due.member?.full_name || '';
      const code = due.member?.member_code || '';
      const phone = due.member?.phone || '';

      const matchSearch =
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        phone.includes(searchQuery);

      const matchStatus = statusFilter === 'all' || due.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [currentMonthDues, searchQuery, statusFilter]);

  const activeMembersCount = members.filter((m) => m.status === 'active').length;
  const duesTarget = currentMonthDues.reduce((sum, d) => sum + Number(d.amount_due), 0);
  const targetTotal = Math.max(clubMonthlyTarget, duesTarget);
  const collectedTotal = currentMonthDues.reduce((sum, d) => sum + Number(d.amount_paid), 0);
  const outstandingTotal = Math.max(0, targetTotal - collectedTotal);
  const paidCount = currentMonthDues.filter((d) => d.status === 'paid').length;
  const partialCount = currentMonthDues.filter((d) => d.status === 'partial').length;
  const unpaidCount = Math.max(0, activeMembersCount - paidCount - partialCount);

  const handleOpenEdit = (due: MonthlyDueWithMeta) => {
    if (due.isVirtual) {
      setTargetMemberForRecord(due.member_id);
      setRecordModalOpen(true);
      return;
    }
    setEditDue(due);
  };

  const handleExecuteGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenLoading(true);
    setGenMessage(null);

    const res = await generateMonthlyDues(targetGenMonth, targetGenYear);
    setGenLoading(false);

    if (res.success) {
      setGenMessage({
        type: 'success',
        text: `Successfully created ${res.createdCount || 0} dues records for ${getMonthName(targetGenMonth)} ${targetGenYear}. (${res.existingCount || 0} existing skipped)`,
      });
      setTimeout(() => {
        setGenerateModalOpen(false);
        setGenMessage(null);
      }, 1400);
    } else {
      setGenMessage({
        type: 'error',
        text: res.error || 'Failed to generate dues.',
      });
    }
  };

  return (
    <PageTransition className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DFE6F0] dark:border-[#233452]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F1B2E] dark:text-slate-100 flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-[#1D4ED8] dark:text-[#60A5FA]" />
            <span>Monthly Dues Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#4E5E78] dark:text-slate-400 mt-0.5">
            Generate dues, record collections, and reconcile monthly member accounts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#111B2E] border border-[#DFE6F0] dark:border-[#233452] rounded-xl px-3 py-2 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#60A5FA] shrink-0" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-xs font-semibold text-[#0F1B2E] dark:text-slate-100 bg-white dark:bg-[#111B2E] focus:outline-hidden cursor-pointer"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option
                  key={idx + 1}
                  value={idx + 1}
                  className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100"
                >
                  {name}
                </option>
              ))}
            </select>
          </div>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-xs font-semibold font-mono tabular-nums text-[#0F1B2E] dark:text-slate-100 bg-white dark:bg-[#111B2E] border border-[#DFE6F0] dark:border-[#233452] rounded-xl px-3 py-2 shadow-2xs focus:outline-hidden cursor-pointer"
          >
            {FISCAL_YEARS.map((yr) => (
              <option
                key={yr}
                value={yr}
                className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100"
              >
                {yr}
              </option>
            ))}
          </select>

          {canEditAdmin && (
            <>
              <button
                onClick={() => {
                  setTargetMemberForRecord(undefined);
                  setRecordModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-xl shadow-xs transition-all shrink-0 cursor-pointer whitespace-nowrap"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Record Payment</span>
              </button>

              <button
                onClick={() => setGenerateModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0F1B2E] dark:text-slate-200 bg-white dark:bg-[#111B2E] border border-[#DFE6F0] dark:border-[#233452] hover:bg-[#EFF3F9] dark:hover:bg-[#17243C] rounded-xl transition-colors shrink-0 cursor-pointer whitespace-nowrap"
              >
                <PlusCircle className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#60A5FA]" />
                <span>Generate Dues</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label={`${getMonthName(selectedMonth)} Target`}
          value={formatBDT(targetTotal)}
          subLabel={`${activeMembersCount} active members · ${currentMonthDues.length} entries`}
          icon={Target}
          accent="navy"
        />
        <MetricCard
          label="Collected"
          value={formatBDT(collectedTotal)}
          subLabel={`${targetTotal > 0 ? Math.round((collectedTotal / targetTotal) * 100) : 0}% of ${formatBDT(targetTotal)}`}
          icon={Banknote}
          accent="sapphire"
        />
        <MetricCard
          label="Outstanding"
          value={formatBDT(outstandingTotal)}
          subLabel={`${unpaidCount} unpaid · ${partialCount} partial`}
          icon={AlertCircle}
          accent="rose"
        />
        <MetricCard
          label="Paid Ratio"
          value={`${paidCount} / ${activeMembersCount}`}
          subLabel={`${activeMembersCount > 0 ? Math.round((paidCount / activeMembersCount) * 100) : 0}% members paid`}
          icon={Users}
          accent="gold"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#4E5E78] absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search member name, code or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-xs sm:text-sm bg-white dark:bg-[#111B2E] border border-[#DFE6F0] dark:border-[#233452] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8] text-[#0F1B2E] dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-white dark:bg-[#111B2E] border border-[#DFE6F0] dark:border-[#233452] rounded-xl self-start sm:self-auto max-w-full overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-[#0F1B33] dark:bg-[#1D4ED8] text-white font-semibold'
                : 'text-[#4E5E78] hover:text-[#0F1B2E] dark:hover:text-slate-100'
            }`}
          >
            All ({currentMonthDues.length})
          </button>
          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === 'paid'
                ? 'bg-[#1D4ED8] text-white font-semibold'
                : 'text-[#4E5E78] hover:text-[#0F1B2E] dark:hover:text-slate-100'
            }`}
          >
            Paid ({paidCount})
          </button>
          <button
            onClick={() => setStatusFilter('partial')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === 'partial'
                ? 'bg-[#D6AC62] text-[#0F1B33] font-semibold'
                : 'text-[#4E5E78] hover:text-[#0F1B2E] dark:hover:text-slate-100'
            }`}
          >
            Partial ({partialCount})
          </button>
          <button
            onClick={() => setStatusFilter('unpaid')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === 'unpaid'
                ? 'bg-rose-600 text-white font-semibold'
                : 'text-[#4E5E78] hover:text-[#0F1B2E] dark:hover:text-slate-100'
            }`}
          >
            Unpaid ({unpaidCount})
          </button>
        </div>
      </div>

      {/* Dues Table */}
      <div className="surface-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EFF3F9] dark:bg-[#17243C] text-[#4E5E78] dark:text-slate-400 border-b border-[#DFE6F0] dark:border-[#233452]">
              <tr>
                <th className="py-3 px-4 font-semibold">Code</th>
                <th className="py-3 px-4 font-semibold">Member Name</th>
                <th className="py-3 px-4 font-semibold">Phone</th>
                <th className="py-3 px-4 font-semibold text-right">Due (৳)</th>
                <th className="py-3 px-4 font-semibold text-right">Paid (৳)</th>
                <th className="py-3 px-4 font-semibold text-right">Balance (৳)</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold">Paid Date</th>
                {canEditAdmin && <th className="py-3 px-4 font-semibold text-right">Admin Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DFE6F0] dark:divide-[#233452]">
              {filteredDues.length === 0 ? (
                <tr>
                  <td colSpan={canEditAdmin ? 9 : 8} className="py-12 text-center text-[#4E5E78]">
                    {currentMonthDues.length === 0 ? (
                      <div className="space-y-2">
                        <AlertCircle className="w-8 h-8 text-[#4E5E78] mx-auto" />
                        <p className="font-semibold text-[#0F1B2E] dark:text-slate-200">
                          No dues generated for {getMonthName(selectedMonth)} {selectedYear}.
                        </p>
                        {canEditAdmin && (
                          <button
                            onClick={() => setGenerateModalOpen(true)}
                            className="text-xs text-[#1D4ED8] dark:text-[#60A5FA] font-semibold underline cursor-pointer"
                          >
                            Click here to generate monthly dues for all active members
                          </button>
                        )}
                      </div>
                    ) : (
                      'No dues match your filter or search query.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredDues.map((due) => {
                  const bd = calculateDueBreakdown(due, due.member?.shares_count);
                  const balance = bd.totalOutstanding;
                  const isDeleting = deleteConfirmId === due.id;

                  return (
                    <tr
                      key={due.id}
                      className="hover:bg-[#EFF3F9]/65 dark:hover:bg-[#17243C]/65 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-[#0F1B2E] dark:text-slate-100 whitespace-nowrap">
                        {due.member?.member_code}
                      </td>

                      <td className="py-3 px-4 font-medium text-[#0F1B2E] dark:text-slate-100">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            to={`/admin/members/${due.member_id}`}
                            className="font-semibold hover:text-[#1D4ED8] dark:hover:text-[#60A5FA]"
                          >
                            {due.member?.full_name}
                          </Link>
                          {due.member?.shares_count && due.member.shares_count > 1 && (
                            <span className="text-[11px] font-semibold text-[#92600A] dark:text-[#F0C56E] tabular-nums">
                              · {due.member.shares_count} shares
                            </span>
                          )}
                        </div>
                        {due.member?.father_name && (
                          <span className="block text-[11px] text-[#4E5E78] dark:text-slate-400 font-normal">
                            {due.member.father_name}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-[#4E5E78] dark:text-slate-400 whitespace-nowrap">
                        {due.member?.phone || '—'}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#4E5E78] dark:text-slate-300">
                        <span>{formatBDT(due.amount_due)}</span>
                        {bd.fineDue > 0 && (
                          <span className="block text-[10px] font-semibold text-[#92600A] dark:text-[#F0C56E]">
                            +{formatBDT(bd.fineDue)} fine
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-[#0369A1] dark:text-[#38BDF8]">
                        <span>{formatBDT(due.amount_paid)}</span>
                        {bd.finePaid > 0 && (
                          <span className="block text-[10px] font-normal text-[#0369A1] dark:text-[#38BDF8]">
                            +{formatBDT(bd.finePaid)} fine
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-rose-700 dark:text-rose-400">
                        {balance > 0 ? formatBDT(balance) : '—'}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <StatusBadge status={due.status} size="sm" />
                      </td>

                      <td className="py-3 px-4 font-mono text-[#4E5E78] dark:text-slate-400 whitespace-nowrap tabular-nums">
                        {due.paid_at ? formatDate(due.paid_at) : '—'}
                      </td>

                      {canEditAdmin && (
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {(due.status !== 'paid' || bd.fineOutstanding > 0) && (
                              <button
                                onClick={() => {
                                  if (due.isVirtual) {
                                    recordNewPayment({
                                      memberId: due.member_id,
                                      month: due.month,
                                      year: due.year,
                                      amountDue: due.amount_due,
                                      amountPaid: due.amount_due,
                                      fineDue: bd.fineDue,
                                      finePaid: bd.fineDue,
                                      fineWaived: Boolean(due.fine_waived),
                                    });
                                  } else {
                                    markAsPaid(due.id, due.amount_due, undefined, {
                                      fineDue: bd.fineDue,
                                      finePaid: bd.fineDue,
                                      fineWaived: Boolean(due.fine_waived),
                                    });
                                  }
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold text-[#1D4ED8] dark:text-[#60A5FA] bg-[#1D4ED8]/10 hover:bg-[#1D4ED8]/15 rounded-lg border border-[#1D4ED8]/25 dark:border-[#60A5FA]/35 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                title={`Settle total (${formatBDT(due.amount_due + bd.fineDue)})`}
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{bd.fineOutstanding > 0 ? 'Clear All' : 'Mark Paid'}</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenEdit(due)}
                              className="p-1.5 text-[#4E5E78] hover:text-[#1D4ED8] dark:hover:text-[#60A5FA] rounded-lg hover:bg-[#EFF3F9] dark:hover:bg-[#18294A] cursor-pointer"
                              title={due.isVirtual ? 'Record Payment Details' : 'Edit Payment Amount or Date'}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {!due.isVirtual &&
                              (isDeleting ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      deleteDueRecord(due.id);
                                      setDeleteConfirmId(null);
                                    }}
                                    className="px-2 py-0.5 bg-rose-600 text-white rounded text-[11px] font-semibold cursor-pointer"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-1.5 py-0.5 text-[#4E5E78] text-[11px] cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirmId(due.id)}
                                  className="p-1.5 text-[#4E5E78] hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ))}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {canEditAdmin && (
        <>
          {/* Generate Dues Modal */}
          <Modal
            isOpen={generateModalOpen}
            onClose={() => setGenerateModalOpen(false)}
            title="Generate Monthly Dues"
            subtitle="Batch generate ৳500/share billing records"
            icon={<PlusCircle className="w-4 h-4" />}
            lottieSrc="/lottie/dues-generate.json"
            lottieSuccess={genMessage?.type === 'success'}
            lottieSpeed={genLoading ? 1.35 : 1}
            maxWidthClass="max-w-md"
          >
            <div className="space-y-4">
              {genMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                    genMessage.type === 'success'
                      ? 'bg-[#1D4ED8]/10 text-[#1D4ED8] dark:text-[#60A5FA] border-[#1D4ED8]/25 dark:border-[#60A5FA]/35'
                      : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                  }`}
                >
                  {genMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{genMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleExecuteGenerate} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#0F1B2E] dark:text-slate-200 mb-1.5">
                      Month
                    </label>
                    <select
                      value={targetGenMonth}
                      onChange={(e) => setTargetGenMonth(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8] cursor-pointer"
                    >
                      {MONTH_NAMES.map((name, idx) => (
                        <option
                          key={idx + 1}
                          value={idx + 1}
                          className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100"
                        >
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#0F1B2E] dark:text-slate-200 mb-1.5">
                      Fiscal Year
                    </label>
                    <select
                      value={targetGenYear}
                      onChange={(e) => setTargetGenYear(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8] cursor-pointer"
                    >
                      {FISCAL_YEARS.map((yr) => (
                        <option
                          key={yr}
                          value={yr}
                          className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100"
                        >
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-3.5 bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl space-y-1 text-xs text-[#4E5E78] dark:text-slate-400">
                  <p>Creates monthly dues entries (৳500/share) for all active members without duplicating existing records.</p>
                  <p>Collection window ends on the 12th of the following month (৳50/share late fine thereafter).</p>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-[#DFE6F0] dark:border-[#233452]">
                  <button
                    type="button"
                    onClick={() => setGenerateModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#4E5E78] hover:bg-slate-100 dark:hover:bg-[#17243C] rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={genLoading}
                    className="px-5 py-2 text-xs font-bold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-xl disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    {genLoading ? 'Processing...' : 'Run Dues Generation'}
                  </button>
                </div>
              </form>
            </div>
          </Modal>

          {/* Full Edit Payment Modal */}
          <EditPaymentModal due={editDue} onClose={() => setEditDue(null)} />

          {/* Direct Record Payment Modal */}
          <RecordPaymentModal
            isOpen={recordModalOpen}
            onClose={() => setRecordModalOpen(false)}
            initialMemberId={targetMemberForRecord}
            initialMonth={selectedMonth}
            initialYear={selectedYear}
          />
        </>
      )}
    </PageTransition>
  );
};
