import React, { useState, useMemo } from 'react';
import { useClubData } from '../../hooks/useClubData';
import { MonthlyDue } from '../../types';
import { formatBDT, formatDate, getMonthName, MONTH_NAMES } from '../../utils/formatters';
import { calculateDueBreakdown } from '../../utils/fineCalculator';
import { StatusBadge } from '../../components/StatusBadge';
import {
  CreditCard,
  PlusCircle,
  Search,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Edit2,
  Trash2,
  DollarSign,
  X,
  AlertTriangle,
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
    deleteDueRecord,
    members,
    clubMonthlyTarget,
  } = useClubData();

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
  const currentMonthDues = useMemo(
    () => monthlyDues.filter(d => d.month === selectedMonth && d.year === selectedYear),
    [monthlyDues, selectedMonth, selectedYear]
  );

  const filteredDues = useMemo(() => {
    return currentMonthDues.filter(due => {
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

  const activeMembersCount = members.filter(m => m.status === 'active').length;
  const duesTarget = currentMonthDues.reduce((sum, d) => sum + Number(d.amount_due), 0);
  const targetTotal = Math.max(clubMonthlyTarget, duesTarget);
  const collectedTotal = currentMonthDues.reduce((sum, d) => sum + Number(d.amount_paid), 0);
  const outstandingTotal = Math.max(0, targetTotal - collectedTotal);
  const paidCount = currentMonthDues.filter(d => d.status === 'paid').length;
  const partialCount = currentMonthDues.filter(d => d.status === 'partial').length;
  const unpaidCount = Math.max(0, activeMembersCount - paidCount - partialCount);

  const handleOpenEdit = (due: MonthlyDue) => {
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
      }, 1500);
    } else {
      setGenMessage({
        type: 'error',
        text: res.error || 'Failed to generate dues.',
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
            <span>Monthly Dues Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Generate dues, record collections, and reconcile monthly member accounts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Selector */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-transparent focus:outline-hidden cursor-pointer"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 shadow-2xs focus:outline-hidden cursor-pointer"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
            <option value={2024}>2024</option>
          </select>

          <button
            onClick={() => {
              setTargetMemberForRecord(undefined);
              setRecordModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all shrink-0 cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>+ Record Payment</span>
          </button>

          <button
            onClick={() => setGenerateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg shadow-2xs transition-colors shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Generate Dues</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-500 uppercase">{getMonthName(selectedMonth)} Target</span>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums mt-1">
            {formatBDT(targetTotal)}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">{activeMembersCount} active members · {currentMonthDues.length} entries</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 uppercase">Collected</span>
          <div className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400 tabular-nums mt-1">
            {formatBDT(collectedTotal)}
          </div>
          <span className="text-[11px] text-emerald-600 mt-0.5 block">
            {targetTotal > 0 ? Math.round((collectedTotal / targetTotal) * 100) : 0}% of {formatBDT(targetTotal)}
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-rose-700 dark:text-rose-400 uppercase">Outstanding</span>
          <div className="text-xl font-bold font-mono text-rose-700 dark:text-rose-400 tabular-nums mt-1">
            {formatBDT(outstandingTotal)}
          </div>
          <span className="text-[11px] text-rose-600 mt-0.5 block">{unpaidCount} unpaid · {partialCount} partial</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-slate-500 uppercase">Paid Ratio</span>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums mt-1">
            {paidCount} / {activeMembersCount}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {activeMembersCount > 0 ? Math.round((paidCount / activeMembersCount) * 100) : 0}% members paid
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search member name, code or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg self-start sm:self-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              statusFilter === 'all' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            All ({currentMonthDues.length})
          </button>
          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              statusFilter === 'paid' ? 'bg-slate-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Paid ({paidCount})
          </button>
          <button
            onClick={() => setStatusFilter('partial')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              statusFilter === 'partial' ? 'bg-slate-100 dark:bg-slate-800 text-amber-700 dark:text-amber-400 font-semibold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Partial ({partialCount})
          </button>
          <button
            onClick={() => setStatusFilter('unpaid')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              statusFilter === 'unpaid' ? 'bg-slate-100 dark:bg-slate-800 text-rose-700 dark:text-rose-400 font-semibold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Unpaid ({unpaidCount})
          </button>
        </div>
      </div>

      {/* Dues Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Code</th>
                <th className="py-3 px-4 font-semibold">Member Name</th>
                <th className="py-3 px-4 font-semibold">Phone</th>
                <th className="py-3 px-4 font-semibold text-right">Due (৳)</th>
                <th className="py-3 px-4 font-semibold text-right">Paid (৳)</th>
                <th className="py-3 px-4 font-semibold text-right">Balance (৳)</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold">Paid Date</th>
                <th className="py-3 px-4 font-semibold text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDues.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    {currentMonthDues.length === 0 ? (
                      <div className="space-y-2">
                        <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                          No dues generated for {getMonthName(selectedMonth)} {selectedYear}.
                        </p>
                        <button
                          onClick={() => setGenerateModalOpen(true)}
                          className="text-xs text-emerald-700 font-semibold underline"
                        >
                          Click here to generate monthly dues for all active members
                        </button>
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
                    <tr key={due.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {due.member?.member_code}
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold">{due.member?.full_name}</span>
                          {due.member?.shares_count && due.member.shares_count > 1 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-[9px] shrink-0">
                              {due.member.shares_count}টি নাম
                            </span>
                          )}
                        </div>
                        {due.member?.father_name && (
                          <span className="block text-[11px] text-slate-400 font-normal">
                            পিতা: {due.member.father_name}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {due.member?.phone || '—'}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                        <span>{formatBDT(due.amount_due)}</span>
                        {bd.fineDue > 0 && (
                          <span className="block text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                            +{formatBDT(bd.fineDue)} জরিমানা
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                        <span>{formatBDT(due.amount_paid)}</span>
                        {bd.finePaid > 0 && (
                          <span className="block text-[10px] font-normal text-emerald-600">
                            +{formatBDT(bd.finePaid)} জরিমানা
                          </span>
                        )}
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

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {(due.status !== 'paid' || bd.fineOutstanding > 0) && (
                            <button
                              onClick={() =>
                                markAsPaid(due.id, due.amount_due, undefined, {
                                  fineDue: bd.fineDue,
                                  finePaid: bd.fineDue,
                                  fineWaived: Boolean(due.fine_waived),
                                })
                              }
                              className="px-2 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 rounded border border-emerald-200 transition-colors flex items-center gap-1"
                              title={`সব বকেয়া ক্লিয়ার করুন (${formatBDT(due.amount_due + bd.fineDue)})`}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{bd.fineOutstanding > 0 ? 'Clear All' : 'Mark Paid'}</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenEdit(due)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Edit Payment Amount or Date"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {isDeleting ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  deleteDueRecord(due.id);
                                  setDeleteConfirmId(null);
                                }}
                                className="px-2 py-0.5 bg-rose-600 text-white rounded text-[11px] font-semibold"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-1.5 py-0.5 text-slate-500 text-[11px]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(due.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Dues Modal */}
      {generateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Generate Monthly Dues
              </h2>
              <button onClick={() => setGenerateModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {genMessage && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  genMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                }`}
              >
                {genMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{genMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleExecuteGenerate} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Month
                  </label>
                  <select
                    value={targetGenMonth}
                    onChange={(e) => setTargetGenMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={idx + 1} value={idx + 1}>{name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Fiscal Year
                  </label>
                  <select
                    value={targetGenYear}
                    onChange={(e) => setTargetGenYear(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <option value={2026}>2026</option>
                    <option value={2025}>2025</option>
                    <option value={2024}>2024</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <p>• সকল সক্রিয় সদস্যের জন্য নির্ধারিত মাসিক কিস্তি হিসাব তৈরি হবে।</p>
                <p>• <strong>গঠনতন্ত্রের ধারা ৪.১.১:</strong> প্রতি মাসের ১২ তারিখের মধ্যে সঞ্চয় জমা দেওয়া বাধ্যতামূলক।</p>
                <p>• <strong>গঠনতন্ত্রের ধারা ৪.১.২:</strong> ১২ তারিখের পরে কিস্তিতে ৫০ টাকা বিলম্ব জরিমানা কার্যকর হবে।</p>
                <p>• একই সদস্য ও একই মাসের জন্য দ্বৈত এন্ট্রি স্বয়ংক্রিয়ভাবে রোধ করা হয়।</p>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setGenerateModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={genLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-50"
                >
                  {genLoading ? 'Processing...' : 'Run Dues Generation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
    </div>
  );
};
