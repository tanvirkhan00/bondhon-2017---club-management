import React, { useState, useEffect } from 'react';
import { useClubData } from '../hooks/useClubData';
import { MONTH_NAMES, formatBDT } from '../utils/formatters';
import { FINE_PER_SHARE, isAfterMonthDeadline } from '../utils/fineCalculator';
import { X, CheckCircle2, AlertCircle, CreditCard, Calendar, User, AlertTriangle } from 'lucide-react';

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

  const [memberId, setMemberId] = useState<string>(initialMemberId || (members[0]?.id || ''));
  const [month, setMonth] = useState<number>(initialMonth || selectedMonth || 6);
  const [year, setYear] = useState<number>(initialYear || selectedYear || 2026);
  const [amountPaid, setAmountPaid] = useState<number>(500);
  const [amountDue, setAmountDue] = useState<number>(500);
  const [fineDue, setFineDue] = useState<number>(0);
  const [finePaid, setFinePaid] = useState<number>(0);
  const [paidDate, setPaidDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash (নগদ)');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // When selected member, month, or year changes, automatically calculate principal + late fee after 12th
  useEffect(() => {
    const sel = members.find((m) => m.id === memberId);
    if (sel) {
      setAmountDue(sel.monthly_contribution);
      setAmountPaid(sel.monthly_contribution);
      const isLate = isAfterMonthDeadline(month, year);
      const suggestedFine = isLate ? (sel.shares_count || 1) * FINE_PER_SHARE : 0;
      setFineDue(suggestedFine);
      setFinePaid(suggestedFine);
    }
  }, [memberId, month, year, members]);

  useEffect(() => {
    if (isOpen) {
      if (initialMemberId) {
        setMemberId(initialMemberId);
      } else if (!memberId && members.length > 0) {
        setMemberId(members[0].id);
      }
      if (initialMonth) setMonth(initialMonth);
      if (initialYear) setYear(initialYear);
    }
  }, [isOpen, initialMemberId, initialMonth, initialYear, members, memberId]);

  if (!isOpen) return null;

  const selectedMember = members.find((m) => m.id === memberId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setTimeout(() => {
        onClose();
        setMessage(null);
      }, 1400);
    } else {
      setMessage({
        type: 'error',
        text: res.error || 'পেমেন্ট সংরক্ষণ করতে সমস্যা হয়েছে।',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                নতুন পেমেন্ট এন্ট্রি (Record Member Payment)
              </h2>
              <span className="text-[10px] text-slate-500">
                শুধুমাত্র কোষাধ্যক্ষ / অ্যাডমিনদের জন্য
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {message && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Member Selection */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <span>সদস্য নির্বাচন করুন (Select Member)</span>
            </label>
            <select
              required
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-slate-900 dark:text-slate-100 cursor-pointer"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.member_code} - {m.full_name} ({m.shares_count > 1 ? `${m.shares_count}টি নাম/শেয়ার · ` : ''}মাসিক: ৳{m.monthly_contribution})
                </option>
              ))}
            </select>
            {selectedMember && (
              <div className="mt-1.5 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-[11px] text-slate-500 flex justify-between">
                <span>পিতার নাম: <strong>{selectedMember.father_name || '—'}</strong></span>
                <span>শেয়ার সংখ্যা: <strong>{selectedMember.shares_count}টি ({formatBDT(selectedMember.monthly_contribution)}/মাস)</strong></span>
              </div>
            )}
          </div>

          {/* Month & Year Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>মাসের নাম (Month)</span>
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium"
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
                সাল (Fiscal Year)
              </label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium font-mono"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
              </select>
            </div>
          </div>

          {/* Amounts: Due & Paid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                নির্ধারিত কিস্তি (Due ৳)
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
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>পরিশোধিত টাকা (Paid ৳)</span>
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

          {/* Quick Amount Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAmountPaid(amountDue)}
              className="flex-1 py-1 px-2 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              পূর্ণ কিস্তি (৳{amountDue})
            </button>
            <button
              type="button"
              onClick={() => setAmountPaid(500)}
              className="py-1 px-3 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
            >
              ৳৫০০
            </button>
            <button
              type="button"
              onClick={() => setAmountPaid(0)}
              className="py-1 px-3 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
            >
              ৳০ (Unpaid)
            </button>
          </div>

          {/* Late Fine Section (12th deadline rule: 50 BDT per share) */}
          <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/50 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-amber-900 dark:text-amber-300">
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>বিলম্ব জরিমানা (১২ তারিখের পর ৫০৳/নাম)</span>
              </span>
              <span className="font-mono">মোট জমা: {formatBDT(Number(amountPaid) + Number(finePaid))}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  আরোপিত জরিমানা (Fine Due ৳)
                </label>
                <input
                  type="number"
                  min={0}
                  value={fineDue}
                  onChange={(e) => setFineDue(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  পরিশোধিত জরিমানা (Fine Paid ৳)
                </label>
                <input
                  type="number"
                  min={0}
                  value={finePaid}
                  onChange={(e) => setFinePaid(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* Payment Date & Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                পরিশোধের তারিখ (Date)
              </label>
              <input
                type="date"
                required
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                পেমেন্ট মাধ্যম (Method)
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              >
                <option value="Cash (নগদ)">Cash (নগদ)</option>
                <option value="bKash (বিকাশ)">bKash (বিকাশ)</option>
                <option value="Nagad (নগদ)">Nagad (নগদ অ্যাপ)</option>
                <option value="Bank Transfer (ব্যাংক)">Bank Transfer (ব্যাংক)</option>
              </select>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              মন্তব্য / রসিদ রেফারেন্স (ঐচ্ছিক)
            </label>
            <input
              type="text"
              placeholder="যেমন: TrxID বা হাতেনাতে জমা..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'সংরক্ষণ হচ্ছে...' : 'পেমেন্ট সংরক্ষণ করুন (Save Payment)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
