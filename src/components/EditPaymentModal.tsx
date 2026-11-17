import React, { useState, useEffect, useRef } from 'react';
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
import { Modal } from './ui/Modal';
import {
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

  const membersRef = useRef(members);
  membersRef.current = members;
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!due) {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setLoading(false);
      setFeedback(null);
      return;
    }
    const mem = membersRef.current.find((m) => m.id === due.member_id) || due.member;
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
    setLoading(false);
  }, [due]);

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
    if (!due || loading || feedback?.type === 'success') return;
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
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
      closeTimerRef.current = window.setTimeout(() => {
        closeTimerRef.current = null;
        onClose();
      }, 850);
    } else {
      setFeedback({
        type: 'error',
        text: res.error || 'পেমেন্ট আপডেট করতে সমস্যা হয়েছে।',
      });
    }
  };

  return (
    <Modal
      isOpen={Boolean(due)}
      onClose={onClose}
      title="Edit Payment Entry"
      subtitle="Update member, billing cycle, principal, or fine details"
      icon={<Edit2 className="w-4 h-4" />}
      lottieSrc="/lottie/payment-edit.json"
      lottieSuccess={feedback?.type === 'success'}
      lottieSpeed={loading ? 1.35 : 1}
      maxWidthClass="max-w-lg"
    >
      <div className="space-y-4">
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
              feedback.type === 'success'
                ? 'bg-[#087F70]/10 text-[#087F70] dark:text-[#34D399] border-[#087F70]/25'
                : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span className="font-medium">{feedback.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Member */}
          <div>
            <label className="font-semibold text-[#172435] dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#087F70]" />
              <span>Member</span>
            </label>
            <select
              required
              value={memberId}
              onChange={(e) => handleMemberChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl text-xs sm:text-sm text-[#172435] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#087F70] cursor-pointer"
            >
              {members.map((m) => (
                <option
                  key={m.id}
                  value={m.id}
                  className="bg-white text-[#172435] dark:bg-[#111C2D] dark:text-slate-100"
                >
                  {m.member_code} - {m.full_name} ({m.shares_count} share{m.shares_count > 1 ? 's' : ''} · ৳{m.monthly_contribution})
                </option>
              ))}
            </select>
          </div>

          {/* Month & Year */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-[#172435] dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#087F70]" />
                  <span>Billing Month</span>
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl text-xs sm:text-sm text-[#172435] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#087F70] cursor-pointer"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option
                      key={idx + 1}
                      value={idx + 1}
                      className="bg-white text-[#172435] dark:bg-[#111C2D] dark:text-slate-100"
                    >
                      {idx + 1}. {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#172435] dark:text-slate-200 mb-1.5">
                  Fiscal Year
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl font-mono tabular-nums text-xs sm:text-sm text-[#172435] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#087F70] cursor-pointer"
                >
                  {FISCAL_YEARS.map((yr) => (
                    <option
                      key={yr}
                      value={yr}
                      className="bg-white text-[#172435] dark:bg-[#111C2D] dark:text-slate-100"
                    >
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-[#F5F6F3] dark:bg-[#162438] rounded-xl border border-[#E8EDF3] dark:border-[#1F2F46] text-[10px]">
              <span className="text-[#64748B] dark:text-slate-400">
                Deadline: <strong className="text-[#172435] dark:text-slate-200">{deadlineDay} {getMonthName(deadlineMonth)} {deadlineYear}</strong> ·{' '}
                {isPaidDateLate ? (
                  <span className="text-[#9A7127] dark:text-[#D6AC62] font-bold">Late payment</span>
                ) : (
                  <span className="text-[#087F70] dark:text-[#34D399] font-bold">On time</span>
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
                  className="px-2.5 py-1 rounded-md bg-[#087F70]/10 text-[#087F70] dark:text-[#34D399] font-semibold hover:bg-[#087F70]/20 transition-colors cursor-pointer"
                >
                  Match Prior Month
                </button>
              )}
            </div>
          </div>

          {/* Principal Amounts */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#172435] dark:text-slate-200 mb-1.5">
                Principal Due (৳)
              </label>
              <input
                type="number"
                min={0}
                required
                value={amountDue}
                onChange={(e) => setAmountDue(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl font-mono tabular-nums text-sm text-[#172435] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#087F70]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#172435] dark:text-slate-200 mb-1.5">
                Principal Paid (৳)
              </label>
              <input
                type="number"
                min={0}
                required
                value={amountPaid}
                onChange={(e) => setAmountPaid(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl font-mono tabular-nums text-sm font-bold text-[#087F70] dark:text-[#34D399] focus:outline-hidden focus:ring-2 focus:ring-[#087F70]"
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
              className="flex-1 py-1.5 px-2.5 text-xs font-semibold bg-[#087F70]/10 text-[#087F70] dark:text-[#34D399] rounded-lg hover:bg-[#087F70]/15 border border-[#087F70]/25 transition-colors cursor-pointer whitespace-nowrap"
            >
              Full Principal (৳{standardDue})
            </button>
            <button
              type="button"
              onClick={() => {
                setAmountPaid(0);
                setFinePaid(0);
              }}
              className="py-1.5 px-3 text-xs font-semibold bg-[#F5F6F3] dark:bg-[#162438] text-[#64748B] dark:text-slate-300 border border-[#E8EDF3] dark:border-[#1F2F46] rounded-lg hover:bg-slate-200/70 dark:hover:bg-[#203650] transition-colors cursor-pointer whitespace-nowrap"
            >
              ৳0 (Unpaid)
            </button>
          </div>

          {/* Fine Edit Section */}
          <div className="p-3.5 bg-[#D6AC62]/10 rounded-xl border border-[#D6AC62]/30 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#9A7127] dark:text-[#D6AC62]">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Late Fine Adjustment</span>
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={applyWithFine}
                  className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-[#D6AC62] text-[#14243A] hover:bg-[#c59a50] transition-colors cursor-pointer whitespace-nowrap"
                >
                  Apply Fine (৳{standardFine})
                </button>
                <button
                  type="button"
                  onClick={applyWithoutFine}
                  className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-[#14243A] dark:bg-[#203650] dark:border dark:border-[#2B4564] text-white hover:bg-[#203650] dark:hover:bg-[#2B4564] transition-colors cursor-pointer whitespace-nowrap"
                >
                  No Fine (৳0)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#64748B] dark:text-slate-300 mb-1">
                  Fine Due (৳)
                </label>
                <input
                  type="number"
                  min={0}
                  disabled={fineWaived}
                  value={fineWaived ? 0 : fineDue}
                  onChange={(e) => setFineDue(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-[#111C2D] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-lg font-mono tabular-nums disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#64748B] dark:text-slate-300 mb-1">
                  Fine Paid (৳)
                </label>
                <input
                  type="number"
                  min={0}
                  disabled={fineWaived}
                  value={fineWaived ? 0 : finePaid}
                  onChange={(e) => setFinePaid(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-[#111C2D] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-lg font-mono tabular-nums font-bold text-[#087F70] dark:text-[#34D399] disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1">
              <label className="flex items-center gap-2 font-semibold text-[#172435] dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fineWaived}
                  onChange={(e) => setFineWaived(e.target.checked)}
                  className="rounded border-[#E8EDF3] text-[#087F70]"
                />
                <span>Waive Late Fine</span>
              </label>

              <span className="font-mono tabular-nums font-bold text-[#087F70] dark:text-[#34D399]">
                Total Paid: {formatBDT(Number(amountPaid) + (fineWaived ? 0 : Number(finePaid)))}
              </span>
            </div>
          </div>

          {/* Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#172435] dark:text-slate-200 mb-1.5">
                Payment Date
              </label>
              <input
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl font-mono text-[#172435] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#087F70]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#172435] dark:text-slate-200 mb-1.5">
                Notes
              </label>
              <input
                type="text"
                placeholder="Cash / bKash / TrxID"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl text-[#172435] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#087F70]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[#E8EDF3] dark:border-[#1F2F46]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#64748B] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#162438] rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || feedback?.type === 'success'}
              className="px-5 py-2 text-xs font-bold text-white bg-[#087F70] hover:bg-[#06675B] rounded-xl disabled:opacity-50 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Updating...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
