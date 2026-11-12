import React, { useState, useMemo } from 'react';
import { useClubData } from '../../hooks/useClubData';
import { MonthlyDue } from '../../types';
import { formatBDT, formatDate, getMonthName, MONTH_NAMES } from '../../utils/formatters';
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

export const AdminPayments: React.FC = () => {
  const {
    monthlyDues,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    generateMonthlyDues,
    markAsPaid,
    updateDueRecord,
    deleteDueRecord,
    members,
    defaultDueAmount,
  } = useClubData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [targetGenMonth, setTargetGenMonth] = useState<number>(selectedMonth);
  const [targetGenYear, setTargetGenYear] = useState<number>(selectedYear);
  const [genMessage, setGenMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [genLoading, setGenLoading] = useState(false);

  // Edit payment modal
  const [editDue, setEditDue] = useState<MonthlyDue | null>(null);
  const [editAmountPaid, setEditAmountPaid] = useState<number>(0);
  const [editAmountDue, setEditAmountDue] = useState<number>(1000);
  const [editPaidDate, setEditPaidDate] = useState<string>('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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

  const targetTotal = currentMonthDues.reduce((sum, d) => sum + Number(d.amount_due), 0);
  const collectedTotal = currentMonthDues.reduce((sum, d) => sum + Number(d.amount_paid), 0);
  const outstandingTotal = Math.max(0, targetTotal - collectedTotal);
  const paidCount = currentMonthDues.filter(d => d.status === 'paid').length;
  const unpaidCount = currentMonthDues.filter(d => d.status === 'unpaid').length;
  const partialCount = currentMonthDues.filter(d => d.status === 'partial').length;

  const handleOpenEdit = (due: MonthlyDue) => {
    setEditDue(due);
    setEditAmountPaid(due.amount_paid);
    setEditAmountDue(due.amount_due);
    setEditPaidDate(due.paid_at ? due.paid_at.substring(0, 10) : new Date().toISOString().substring(0, 10));
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDue) return;
    setEditLoading(true);
    setEditError(null);

    const paidAtTimestamp = editAmountPaid > 0 && editPaidDate ? new Date(editPaidDate).toISOString() : null;

    const res = await updateDueRecord(editDue.id, {
      amount_paid: Number(editAmountPaid),
      amount_due: Number(editAmountDue),
      paid_at: paidAtTimestamp,
    });

    setEditLoading(false);
    if (res.success) {
      setEditDue(null);
    } else {
      setEditError(res.error || 'Failed to update payment.');
    }
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
            onClick={() => setGenerateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs transition-colors shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Generate Monthly Dues</span>
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
          <span className="text-[11px] text-slate-500 mt-0.5 block">{currentMonthDues.length} members billed</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 uppercase">Collected</span>
          <div className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400 tabular-nums mt-1">
            {formatBDT(collectedTotal)}
          </div>
          <span className="text-[11px] text-emerald-600 mt-0.5 block">
            {targetTotal > 0 ? Math.round((collectedTotal / targetTotal) * 100) : 0}% settled
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
            {paidCount} / {currentMonthDues.length}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Total active: {members.filter(m => m.status === 'active').length}</span>
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
                  const balance = Math.max(0, Number(due.amount_due) - Number(due.amount_paid));
                  const isDeleting = deleteConfirmId === due.id;

                  return (
                    <tr key={due.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {due.member?.member_code}
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        {due.member?.full_name}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {due.member?.phone || '—'}
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

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {due.status !== 'paid' && (
                            <button
                              onClick={() => markAsPaid(due.id, due.amount_due)}
                              className="px-2 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 rounded border border-emerald-200 transition-colors flex items-center gap-1"
                              title="Mark Full Paid (৳1,000)"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Mark Paid</span>
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
                <p>• ডাটাবেস ইউনিক নিয়ম <code className="font-mono text-emerald-600">UNIQUE(member_id, month, year)</code> দ্বৈত এন্ট্রি রোধ করে।</p>
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

      {/* Edit Payment Modal */}
      {editDue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Edit Payment Record
              </h2>
              <button onClick={() => setEditDue(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs space-y-1">
              <div className="flex justify-between font-bold text-slate-900 dark:text-slate-100">
                <span>{editDue.member?.full_name}</span>
                <span className="font-mono text-emerald-700">{editDue.member?.member_code}</span>
              </div>
              <p className="text-slate-500">
                Billing Cycle: {getMonthName(editDue.month)} {editDue.year}
              </p>
            </div>

            {editError && (
              <div className="p-3 bg-rose-50 text-rose-800 rounded-lg text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Amount Due (BDT ৳)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editAmountDue}
                    onChange={(e) => setEditAmountDue(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Amount Paid (BDT ৳)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editAmountPaid}
                    onChange={(e) => setEditAmountPaid(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Quick shortcuts */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditAmountPaid(editAmountDue)}
                  className="flex-1 py-1 px-2 text-xs font-semibold bg-emerald-50 text-emerald-800 rounded-lg hover:bg-emerald-100"
                >
                  Full (৳{editAmountDue})
                </button>
                <button
                  type="button"
                  onClick={() => setEditAmountPaid(editAmountDue / 2)}
                  className="flex-1 py-1 px-2 text-xs font-semibold bg-amber-50 text-amber-800 rounded-lg hover:bg-amber-100"
                >
                  Half (৳{editAmountDue / 2})
                </button>
                <button
                  type="button"
                  onClick={() => setEditAmountPaid(0)}
                  className="py-1 px-3 text-xs font-semibold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                >
                  Clear (৳0)
                </button>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={editPaidDate}
                  onChange={(e) => setEditPaidDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditDue(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-50"
                >
                  {editLoading ? 'Saving...' : 'Update Payment Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
