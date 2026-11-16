import React, { useState, useEffect } from 'react';
import { MonthlyDue } from '../types';
import { useClubData } from '../hooks/useClubData';
import { FISCAL_YEARS, MONTH_NAMES, formatBDT, getMonthName } from '../utils/formatters';
import {
  calculateDueBreakdown,
  FINE_PER_SHARE,
  getBillingPeriodFromPaymentDate,
  getDueDeadline,
  isAfterMonthDeadline,
} from '../utils/fineCalculator';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Edit2,
  AlertTriangle,
  Calendar,
  User,
} from 'lucide-react';

interface EditPaymentModalProps {
  due: MonthlyDue | null;
  onClose: () => void;
}

export const EditPaymentModal: React.FC<EditPaymentModalProps> = ({ due, onClose }) => {
  const { members, updateDueRecord } = useClubData();

  const [memberId, setMemberId] = useState<string>('');
  const [month, setMonth] = useState<number>(1);
  const [year, setYear] = useState<number>(2026);
  const [amountDue, setAmountDue] = useState<number>(500);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [fineDue, setFineDue] = useState<number>(0);
  const [finePaid, setFinePaid] = useState<number>(0);
  const [fineWaived, setFineWaived] = useState<boolean>(false);
  const [paidDate, setPaidDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!due) return;
    const mem = members.find((m) => m.id === due.member_id) || due.member;
    const bd = calculateDueBreakdown(due, mem?.shares_count);

    setMemberId(due.member_id);
    setMonth(due.month);
    setYear(due.year);
    setAmountDue(Number(due.amount_due || mem?.monthly_contribution || 500));
    setAmountPaid(Number(due.amount_paid || 0));
    setFineDue(Number(due.fine_due ?? bd.fineDue ?? 0));
    setFinePaid(Number(due.fine_paid ?? 0));
    setFineWaived(Boolean(due.fine_waived));
    setPaidDate(
      due.paid_at ? due.paid_at.substring(0, 10) : new Date().toISOString().substring(0, 10)
    );
    setNotes(due.notes || '');
    setFeedback(null);
  }, [due, members]);

  if (!due) return null;

  const selectedMember = members.find((m) => m.id === memberId);
  const standardFine = (selectedMember?.shares_count || 1) * FINE_PER_SHARE;
  const standardDue = selectedMember?.monthly_contribution || 500;
  const { deadlineMonth, deadlineYear, deadlineDay } = getDueDeadline(month, year);
  const isPaidDateLate = isAfterMonthDeadline(month, year, paidDate || new Date());

  const handleMemberChange = (newMemberId: string) => {
    setMemberId(newMemberId);
    const nextMem = members.find((m) => m.id === newMemberId);
    if (nextMem) {
      setAmountDue(nextMem.monthly_contribution);
    }
  };

  const applyWithFine = () => {
    setFineWaived(false);
    setFineDue(standardFine);
    setFinePaid(standardFine);
  };

  const applyWithoutFine = () => {
    setFineWaived(true);
    setFineDue(0);
    setFinePaid(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    const paidAtTimestamp =
      Number(amountPaid) > 0 && paidDate ? new Date(paidDate).toISOString() : null;
    const finePaidTimestamp =
      !fineWaived && Number(finePaid) > 0 && paidDate ? new Date(paidDate).toISOString() : null;

    const res = await updateDueRecord(due.id, {
      member_id: memberId,
      month,
      year,
      amount_due: Number(amountDue),
      amount_paid: Number(amountPaid),
      paid_at: paidAtTimestamp,
      fine_due: fineWaived ? 0 : Number(fineDue),
      fine_paid: fineWaived ? 0 : Number(finePaid),
      fine_paid_at: finePaidTimestamp,
      fine_waived: fineWaived,
      notes: notes.trim() || null,
    });

    setLoading(false);

    if (res.success) {
      setFeedback({
        type: 'success',
        text: 'পেমেন্ট তথ্য সফলভাবে আপডেট হয়েছে!',
      });
      setTimeout(() => {
        onClose();
      }, 900);
    } else {
      setFeedback({
        type: 'error',
        text: res.error || 'পেমেন্ট আপডেট করতে সমস্যা হয়েছে।',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <Edit2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Edit Payment Entry
              </h2>
              <p className="text-[11px] text-slate-500">
                Update member, billing cycle, principal, or fine details
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Member */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <span>Member</span>
            </label>
            <select
              required
              value={memberId}
              onChange={(e) => handleMemberChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.member_code} - {m.full_name} ({m.shares_count} share{m.shares_count > 1 ? 's' : ''} · ৳{m.monthly_contribution})
                </option>
              ))}
            </select>
          </div>

          {/* Month & Year */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Billing Month</span>
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {idx + 1}. {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Fiscal Year
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs sm:text-sm"
                >
                  {FISCAL_YEARS.map((yr) => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200/70 dark:border-slate-700 text-[10px]">
              <span className="text-slate-600 dark:text-slate-400">
                Deadline: <strong>{deadlineDay} {getMonthName(deadlineMonth)} {deadlineYear}</strong> ·{' '}
                {isPaidDateLate ? (
                  <span className="text-amber-700 dark:text-amber-400 font-bold">Late payment</span>
                ) : (
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">On time</span>
                )}
              </span>
              {paidDate && (
                <button
                  type="button"
                  onClick={() => {
                    const p = getBillingPeriodFromPaymentDate(paidDate);
                    setMonth(p.billingMonth);
                    setYear(p.billingYear);
                  }}
                  className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold hover:bg-emerald-200 cursor-pointer"
                >
                  Match Prior Month
                </button>
              )}
            </div>
          </div>

          {/* Principal Amounts */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Principal Due (৳)
              </label>
              <input
                type="number"
                min={0}
                required
                value={amountDue}
                onChange={(e) => setAmountDue(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Principal Paid (৳)
              </label>
              <input
                type="number"
                min={0}
                required
                value={amountPaid}
                onChange={(e) => setAmountPaid(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400"
              />
            </div>
          </div>

          {/* Quick Principal Shortcuts */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setAmountDue(standardDue);
                setAmountPaid(standardDue);
              }}
              className="flex-1 py-1 px-2 text-xs font-semibold bg-emerald-50 text-emerald-800 rounded-lg hover:bg-emerald-100 border border-emerald-200"
            >
              Full Principal (৳{standardDue})
            </button>
            <button
              type="button"
              onClick={() => {
                setAmountPaid(0);
                setFinePaid(0);
              }}
              className="py-1 px-3 text-xs font-semibold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
            >
              ৳0 (Unpaid)
            </button>
          </div>

          {/* Fine Edit Section */}
          <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 rounded-xl border border-amber-200/70 dark:border-amber-800/40 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900 dark:text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Late Fine Adjustment</span>
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={applyWithFine}
                  className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-600 text-white hover:bg-amber-700 cursor-pointer"
                >
                  Apply Fine (৳{standardFine})
                </button>
                <button
                  type="button"
                  onClick={applyWithoutFine}
                  className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-700 text-white hover:bg-slate-800 cursor-pointer"
                >
                  No Fine (৳0)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Fine Due (৳)
                </label>
                <input
                  type="number"
                  min={0}
                  disabled={fineWaived}
                  value={fineWaived ? 0 : fineDue}
                  onChange={(e) => setFineDue(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Fine Paid (৳)
                </label>
                <input
                  type="number"
                  min={0}
                  disabled={fineWaived}
                  value={fineWaived ? 0 : finePaid}
                  onChange={(e) => setFinePaid(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-emerald-700 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1">
              <label className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fineWaived}
                  onChange={(e) => setFineWaived(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600"
                />
                <span>Waive Late Fine</span>
              </label>

              <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300">
                Total Paid: {formatBDT(Number(amountPaid) + (fineWaived ? 0 : Number(finePaid)))}
              </span>
            </div>
          </div>

          {/* Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Date
              </label>
              <input
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Notes
              </label>
              <input
                type="text"
                placeholder="Cash / bKash / TrxID"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Updating...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
