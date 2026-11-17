import React, { useState, useEffect, useRef } from 'react';
import { useClubData } from '../hooks/useClubData';
import { FISCAL_YEARS, MONTH_NAMES, formatBDT, getMonthName } from '../utils/formatters';
import {
  FINE_PER_SHARE,
  getBillingPeriodFromPaymentDate,
  getDueDeadline,
  isAfterMonthDeadline,
} from '../utils/fineCalculator';
import { AnimatePresence, motion } from 'motion/react';
import { Modal } from './ui/Modal';
import { ModalLottie } from './ui/ModalLottie';
import { usePrefersReducedMotion } from './LoginLottieStage';
import { CheckCircle2, AlertCircle, CreditCard, Calendar, User, AlertTriangle, Loader2 } from 'lucide-react';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMemberId?: string;
  initialMonth?: number;
  initialYear?: number;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  initialMemberId,
  initialMonth,
  initialYear,
}) => {
  const { members, selectedYear, selectedMonth, recordNewPayment } = useClubData();

  const todayStr = new Date().toISOString().substring(0, 10);
  const initialPeriod = getBillingPeriodFromPaymentDate(todayStr);

  const [memberId, setMemberId] = useState<string>(initialMemberId || (members[0]?.id || ''));
  const [paidDate, setPaidDate] = useState<string>(todayStr);
  const [autoSyncMonth, setAutoSyncMonth] = useState<boolean>(!initialMemberId);
  const [month, setMonth] = useState<number>(initialMonth || selectedMonth || initialPeriod.billingMonth);
  const [year, setYear] = useState<number>(initialYear || selectedYear || initialPeriod.billingYear);
  const [amountPaid, setAmountPaid] = useState<number>(500);
  const [amountDue, setAmountDue] = useState<number>(500);
  const [fineDue, setFineDue] = useState<number>(0);
  const [finePaid, setFinePaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const prefersReducedMotion = usePrefersReducedMotion();
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

  // Sync when modal opens
  useEffect(() => {
    if (!isOpen) {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setLoading(false);
      setMessage(null);
      return;
    }
    const nowStr = new Date().toISOString().substring(0, 10);
    setPaidDate(nowStr);
    setMessage(null);
    setLoading(false);
    const currentMembers = membersRef.current;
    if (initialMemberId) {
      setMemberId(initialMemberId);
      setAutoSyncMonth(false);
      if (initialMonth) setMonth(initialMonth);
      if (initialYear) setYear(initialYear);
    } else {
      if (currentMembers.length > 0) {
        setMemberId((prev) => prev || currentMembers[0].id);
      }
      const period = getBillingPeriodFromPaymentDate(nowStr);
      setMonth(initialMonth || period.billingMonth);
      setYear(initialYear || period.billingYear);
      setAutoSyncMonth(true);
    }
  }, [isOpen, initialMemberId, initialMonth, initialYear]);

  // If autoSyncMonth is enabled and paidDate changes, map payment month -> previous billing month
  const handlePaidDateChange = (nextDate: string) => {
    setPaidDate(nextDate);
    if (autoSyncMonth && nextDate) {
      const period = getBillingPeriodFromPaymentDate(nextDate);
      setMonth(period.billingMonth);
      setYear(period.billingYear);
    }
  };

  const handleToggleAutoSync = (checked: boolean) => {
    setAutoSyncMonth(checked);
    if (checked && paidDate) {
      const period = getBillingPeriodFromPaymentDate(paidDate);
      setMonth(period.billingMonth);
      setYear(period.billingYear);
    }
  };

  // Automatically calculate principal + late fee based on payment date vs 12th of (billingMonth + 1)
  useEffect(() => {
    const sel = members.find((m) => m.id === memberId);
    if (sel) {
      setAmountDue(sel.monthly_contribution);
      setAmountPaid(sel.monthly_contribution);
      const refDate = paidDate || new Date();
      const isLate = isAfterMonthDeadline(month, year, refDate);
      const suggestedFine = isLate ? (sel.shares_count || 1) * FINE_PER_SHARE : 0;
      setFineDue(suggestedFine);
      setFinePaid(suggestedFine);
    }
  }, [memberId, month, year, paidDate, members]);

  const selectedMember = members.find((m) => m.id === memberId);
  const { deadlineMonth, deadlineYear, deadlineDay } = getDueDeadline(month, year);
  const isPaidDateLate = isAfterMonthDeadline(month, year, paidDate || new Date());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || message?.type === 'success') return;
    setLoading(true);
    setMessage(null);

    const res = await recordNewPayment({
      memberId,
      month,
      year,
      amountPaid: Number(amountPaid),
      amountDue: Number(amountDue),
      fineDue: Number(fineDue),
      finePaid: Number(finePaid),
      paidAt: paidDate ? new Date(paidDate).toISOString() : new Date().toISOString(),
      notes: `${paymentMethod}${notes ? ` - ${notes}` : ''}`,
    });

    setLoading(false);

    if (res.success) {
      const totalSaved = Number(amountPaid) + Number(finePaid);
      setMessage({
        type: 'success',
        text: `পেমেন্ট সফলভাবে এন্ট্রি হয়েছে! (${selectedMember?.full_name}: ৳${totalSaved})`,
      });
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
      closeTimerRef.current = window.setTimeout(() => {
        closeTimerRef.current = null;
        onClose();
      }, 1050);
    } else {
      setMessage({
        type: 'error',
        text: res.error || 'পেমেন্ট সংরক্ষণ করতে সমস্যা হয়েছে।',
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Payment"
      subtitle="Treasurer & Admin Ledger Entry"
      icon={<CreditCard className="w-4 h-4" />}
      lottieSrc="/lottie/payment-record.json"
      lottieSuccess={message?.type === 'success'}
      lottieSpeed={loading ? 1.35 : 1}
      maxWidthClass="max-w-lg"
    >
      <div className="space-y-4">
        {/* Live LottieFiles Payment Summary Banner */}
        <div className="flex items-center gap-3.5 p-3 rounded-xl bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46]">
          <div className="w-14 h-14 rounded-xl bg-white dark:bg-slate-100/95 border border-[#E8EDF3] dark:border-[#2B4564] flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-2xs">
            <ModalLottie
              src="/lottie/payment-record.json"
              isSuccess={message?.type === 'success'}
              speed={loading ? 1.4 : 0.95}
              fallbackIcon={<CreditCard className="w-6 h-6 text-[#087F70]" />}
              className="w-full h-full"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#172435] dark:text-slate-100 truncate">
                {selectedMember ? `${selectedMember.full_name} (${selectedMember.member_code})` : 'Select Member'}
              </span>
              <span className="text-sm font-extrabold font-mono tabular-nums text-[#087F70] dark:text-[#34D399] shrink-0">
                {formatBDT(Number(amountPaid) + Number(finePaid))}
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-0.5 truncate">
              {getMonthName(month)} {year} · {paymentMethod}
              {Number(finePaid) > 0 ? ` · Incl. ${formatBDT(finePaid)} fine` : ''}
            </p>
          </div>
        </div>

        <AnimatePresence>
          {message && (
            <motion.div
              key={message.type}
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className={`p-3 rounded-xl text-xs flex items-center gap-2.5 border ${
                message.type === 'success'
                  ? 'bg-[#087F70]/10 text-[#087F70] dark:text-[#34D399] border-[#087F70]/25'
                  : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40'
              }`}
            >
              {message.type === 'success' ? (
                <ModalLottie
                  src="/lottie/payment-success.json"
                  isSuccess={true}
                  fallbackIcon={<CheckCircle2 className="w-4 h-4 shrink-0" />}
                  className="w-7 h-7 shrink-0"
                />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span className="font-semibold">{message.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Member Selection */}
          <div>
            <label className="font-semibold text-[#172435] dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#087F70]" />
              <span>Member</span>
            </label>
            <select
              required
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full px-3 py-2.5 text-xs sm:text-sm bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#087F70] text-[#172435] dark:text-slate-100 cursor-pointer"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.member_code} - {m.full_name} ({m.shares_count > 1 ? `${m.shares_count} shares · ` : ''}৳{m.monthly_contribution}/mo)
                </option>
              ))}
            </select>
            {selectedMember && (
              <div className="mt-1.5 px-3 py-2 bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl text-[11px] text-[#64748B] dark:text-slate-400 flex flex-wrap justify-between gap-2">
                <span>
                  Father: <strong className="text-[#172435] dark:text-slate-200">{selectedMember.father_name || '—'}</strong>
                </span>
                <span className="tabular-nums">
                  Shares: <strong className="text-[#172435] dark:text-slate-200">{selectedMember.shares_count} ({formatBDT(selectedMember.monthly_contribution)}/mo)</strong>
                </span>
              </div>
            )}
          </div>

          {/* Month & Year Selection */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-[#172435] dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#087F70]" />
                  <span>Billing Month</span>
                </label>
                <select
                  value={month}
                  onChange={(e) => {
                    setAutoSyncMonth(false);
                    setMonth(Number(e.target.value));
                  }}
                  className="w-full px-3 py-2.5 bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl text-xs sm:text-sm font-medium text-[#172435] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#087F70]"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>
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
                  onChange={(e) => {
                    setAutoSyncMonth(false);
                    setYear(Number(e.target.value));
                  }}
                  className="w-full px-3 py-2.5 bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl text-xs sm:text-sm font-medium font-mono tabular-nums text-[#172435] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#087F70]"
                >
                  {FISCAL_YEARS.map((yr) => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1 p-3 rounded-xl bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] text-[11px]">
              <label className="flex items-center gap-2 font-medium text-[#172435] dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSyncMonth}
                  onChange={(e) => handleToggleAutoSync(e.target.checked)}
                  className="rounded border-[#E8EDF3] text-[#087F70] focus:ring-[#087F70]"
                />
                <span>Auto-map payment date to prior billing month</span>
              </label>
              <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] pl-5">
                <span className="text-[#64748B] dark:text-slate-400">
                  Due deadline: <strong className="text-[#172435] dark:text-slate-200">{deadlineDay} {getMonthName(deadlineMonth)} {deadlineYear}</strong>
                </span>
                {isPaidDateLate ? (
                  <span className="font-bold text-[#9A7127] dark:text-[#D6AC62]">
                    Past deadline (Late fine applies)
                  </span>
                ) : (
                  <span className="font-bold text-[#087F70] dark:text-[#34D399]">
                    On time (No fine)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Amounts: Due & Paid */}
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

          {/* Quick Amount Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAmountPaid(amountDue)}
              className="flex-1 py-1.5 px-2.5 text-xs font-semibold rounded-lg bg-[#087F70]/10 text-[#087F70] dark:text-[#34D399] hover:bg-[#087F70]/15 border border-[#087F70]/25 transition-colors cursor-pointer whitespace-nowrap"
            >
              Full Principal (৳{amountDue})
            </button>
            <button
              type="button"
              onClick={() => setAmountPaid(500)}
              className="py-1.5 px-3 text-xs font-semibold rounded-lg bg-[#F5F6F3] dark:bg-[#162438] text-[#172435] dark:text-slate-200 border border-[#E8EDF3] dark:border-[#1F2F46] hover:bg-slate-200/70 dark:hover:bg-[#203650] transition-colors cursor-pointer"
            >
              ৳500
            </button>
            <button
              type="button"
              onClick={() => setAmountPaid(0)}
              className="py-1.5 px-3 text-xs font-semibold rounded-lg bg-[#F5F6F3] dark:bg-[#162438] text-[#64748B] dark:text-slate-400 border border-[#E8EDF3] dark:border-[#1F2F46] hover:bg-slate-200/70 dark:hover:bg-[#203650] transition-colors cursor-pointer whitespace-nowrap"
            >
              ৳0 (Unpaid)
            </button>
          </div>

          {/* Late Fine Section (12th of next month rule: 50 BDT per share) */}
          <div className="p-3.5 rounded-xl bg-[#D6AC62]/10 dark:bg-[#D6AC62]/10 border border-[#D6AC62]/30 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-[#9A7127] dark:text-[#D6AC62]">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Late Fine (৳50/share after {deadlineDay} {getMonthName(deadlineMonth)})</span>
              </span>
              <span className="font-mono tabular-nums font-bold text-[#172435] dark:text-slate-100">
                Total: {formatBDT(Number(amountPaid) + Number(finePaid))}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#64748B] dark:text-slate-400 mb-1">
                  Fine Due (৳)
                </label>
                <input
                  type="number"
                  min={0}
                  value={fineDue}
                  onChange={(e) => setFineDue(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-[#111C2D] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-lg font-mono tabular-nums text-xs text-[#172435] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#D6AC62]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#64748B] dark:text-slate-400 mb-1">
                  Fine Paid (৳)
                </label>
                <input
                  type="number"
                  min={0}
                  value={finePaid}
                  onChange={(e) => setFinePaid(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-[#111C2D] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-lg font-mono tabular-nums text-xs font-bold text-[#087F70] dark:text-[#34D399] focus:outline-hidden focus:ring-2 focus:ring-[#087F70]"
                />
              </div>
            </div>
          </div>

          {/* Payment Date & Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#172435] dark:text-slate-200 mb-1.5">
                Payment Date
              </label>
              <input
                type="date"
                required
                value={paidDate}
                onChange={(e) => handlePaidDateChange(e.target.value)}
                className="w-full px-3 py-2 bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl font-mono text-xs text-[#172435] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#087F70]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#172435] dark:text-slate-200 mb-1.5">
                Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl text-xs text-[#172435] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#087F70]"
              >
                <option value="Cash">Cash</option>
                <option value="bKash">bKash</option>
                <option value="Nagad">Nagad</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block font-semibold text-[#172435] dark:text-slate-200 mb-1.5">
              Notes / Reference
            </label>
            <input
              type="text"
              placeholder="Receipt or TrxID (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl text-xs text-[#172435] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#087F70]"
            />
          </div>

          {/* Action buttons */}
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
              disabled={loading || message?.type === 'success'}
              className="px-5 py-2 text-xs font-bold text-white bg-[#087F70] hover:bg-[#06675B] rounded-xl shadow-xs disabled:opacity-60 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>
                {loading
                  ? 'Saving...'
                  : message?.type === 'success'
                  ? 'Payment Saved!'
                  : 'Save Payment'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
