import React, { useState, useEffect, useRef } from 'react';
import { ClubExpense, ExpenseCategory, ExpensePaymentSource } from '../types';
import { useClubData } from '../hooks/useClubData';
import { formatBDT } from '../utils/formatters';
import { Modal } from './ui/Modal';
import { Receipt, CheckCircle2, AlertCircle, Wallet, Landmark } from 'lucide-react';

interface ClubExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingExpense?: ClubExpense | null;
}

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'account_opening', label: 'Account Opening / Bank Paperwork' },
  { value: 'bank_charge', label: 'Bank Fee / Misc Charge' },
  { value: 'operational', label: 'Club Operations & Stationary' },
  { value: 'event', label: 'Meetings & Events' },
  { value: 'welfare', label: 'Social Welfare & Support' },
  { value: 'other', label: 'Other Expense' },
];

const EXPENSE_PRESETS: { title: string; category: ExpenseCategory }[] = [
  { title: 'Account kholar khoros (Bank)', category: 'account_opening' },
  { title: 'Meeting & Refreshment', category: 'event' },
  { title: 'Receipt Book & Printing', category: 'operational' },
  { title: 'Welfare Assistance', category: 'welfare' },
];

export const ClubExpenseModal: React.FC<ClubExpenseModalProps> = ({
  isOpen,
  onClose,
  editingExpense = null,
}) => {
  const { cashInHandBalance, currentBankBalance, addClubExpense, updateClubExpense } = useClubData();

  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>('operational');
  const [amount, setAmount] = useState<number>(0);
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [paymentSource, setPaymentSource] = useState<ExpensePaymentSource>('cash');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setSaving(false);
      setFeedback(null);
      return;
    }
    setFeedback(null);
    setSaving(false);
    if (editingExpense) {
      setTitle(editingExpense.title);
      setCategory(editingExpense.category);
      setAmount(Number(editingExpense.amount || 0));
      setExpenseDate((editingExpense.expense_date || new Date().toISOString()).substring(0, 10));
      setPaymentSource(editingExpense.payment_source || 'cash');
      setReferenceNo(editingExpense.reference_no || '');
      setNotes(editingExpense.notes || '');
    } else {
      setTitle('');
      setCategory('operational');
      setAmount(0);
      setExpenseDate(new Date().toISOString().substring(0, 10));
      setPaymentSource('cash');
      setReferenceNo('');
      setNotes('');
    }
  }, [isOpen, editingExpense]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || feedback?.type === 'success') return;
    setSaving(true);
    setFeedback(null);

    const res = editingExpense
      ? await updateClubExpense(editingExpense.id, {
          title,
          category,
          amount: Number(amount),
          expense_date: expenseDate,
          payment_source: paymentSource,
          reference_no: referenceNo || null,
          notes: notes || null,
        })
      : await addClubExpense({
          title,
          category,
          amount: Number(amount),
          expense_date: expenseDate,
          payment_source: paymentSource,
          reference_no: referenceNo,
          notes,
        });

    setSaving(false);

    if (res.success) {
      setFeedback({
        type: 'success',
        text: editingExpense
          ? 'Club expense updated successfully.'
          : 'Club expense recorded & deducted from available balance.',
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
        text: res.error || 'Failed to save club expense.',
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingExpense ? 'Edit Club Expense' : 'Record Club Expense'}
      subtitle="Deduct club expenditure from Net Available Balance"
      icon={<Receipt className="w-4 h-4" />}
      lottieSrc="/lottie/club-expense.json"
      lottieSuccess={feedback?.type === 'success'}
      lottieSpeed={saving ? 1.35 : 1}
      maxWidthClass="max-w-lg"
    >
      <div className="space-y-4">
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
              feedback.type === 'success'
                ? 'bg-[#0369A1]/10 text-[#0369A1] dark:text-[#38BDF8] border-[#0369A1]/25 dark:border-[#38BDF8]/35'
                : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
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
          {/* Quick Presets */}
          {!editingExpense && (
            <div>
              <span className="block text-[11px] font-medium text-[#4E5E78] dark:text-[#9BB0CD] mb-1.5">
                Common Expense Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {EXPENSE_PRESETS.map((preset) => (
                  <button
                    key={preset.title}
                    type="button"
                    onClick={() => {
                      setTitle(preset.title);
                      setCategory(preset.category);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                      title === preset.title
                        ? 'bg-[#D6AC62]/20 text-[#92600A] dark:text-[#F0C56E] border-[#D6AC62]/50'
                        : 'bg-[#EFF3F9] dark:bg-[#17243C] text-[#4E5E78] dark:text-slate-300 border-[#DFE6F0] dark:border-[#233452] hover:border-[#D6AC62]/40'
                    }`}
                  >
                    {preset.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Expense Title */}
          <div>
            <label className="block font-semibold text-[#0F1B2E] dark:text-slate-200 mb-1.5">
              Expense Title / Particular
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Account kholar khoros, Meeting expense..."
              className="w-full px-3 py-2.5 bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-xs sm:text-sm text-[#0F1B2E] dark:text-[#F3F6FC] focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
            />
          </div>

          {/* Payment Source (Cash vs Bank) */}
          <div>
            <label className="block font-semibold text-[#0F1B2E] dark:text-slate-200 mb-1.5">
              Deduct From (Payment Source)
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPaymentSource('cash')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  paymentSource === 'cash'
                    ? 'bg-[#D6AC62]/15 border-[#D6AC62]/60 text-[#0F1B2E] dark:text-white ring-1 ring-[#D6AC62]/50'
                    : 'bg-[#EFF3F9] dark:bg-[#17243C] border-[#DFE6F0] dark:border-[#233452] text-[#4E5E78] dark:text-[#9BB0CD]'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Wallet className="w-3.5 h-3.5 text-[#92600A] dark:text-[#F0C56E]" />
                  <span>Cash in Hand</span>
                </div>
                <span className="block text-[10px] mt-1 font-mono tabular-nums opacity-85">
                  Available: {formatBDT(cashInHandBalance)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentSource('bank')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  paymentSource === 'bank'
                    ? 'bg-[#1D4ED8]/15 border-[#1D4ED8]/60 text-[#0F1B2E] dark:text-white ring-1 ring-[#1D4ED8]/50 dark:border-[#60A5FA]/60 dark:ring-[#60A5FA]/50'
                    : 'bg-[#EFF3F9] dark:bg-[#17243C] border-[#DFE6F0] dark:border-[#233452] text-[#4E5E78] dark:text-[#9BB0CD]'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Landmark className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#60A5FA]" />
                  <span>Sonali Bank A/C</span>
                </div>
                <span className="block text-[10px] mt-1 font-mono tabular-nums opacity-85">
                  Balance: {formatBDT(currentBankBalance)}
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#0F1B2E] dark:text-slate-200 mb-1.5">
                Expense Amount (৳)
              </label>
              <input
                type="number"
                min={1}
                step="any"
                required
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl font-mono tabular-nums text-sm font-bold text-rose-600 dark:text-rose-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                placeholder="e.g. 100"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#0F1B2E] dark:text-slate-200 mb-1.5">
                Expense Date
              </label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl font-mono text-[#0F1B2E] dark:text-[#F3F6FC] focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#0F1B2E] dark:text-slate-200 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-xs text-[#0F1B2E] dark:text-[#F3F6FC] focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8] cursor-pointer"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option
                    key={c.value}
                    value={c.value}
                    className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-[#F3F6FC]"
                  >
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#0F1B2E] dark:text-slate-200 mb-1.5">
                Voucher / Ref No.
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="Optional voucher no."
                className="w-full px-3 py-2 bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-[#0F1B2E] dark:text-[#F3F6FC] focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#0F1B2E] dark:text-slate-200 mb-1.5">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional explanation or committee approval note"
              className="w-full px-3 py-2 bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-[#0F1B2E] dark:text-[#F3F6FC] focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[#DFE6F0] dark:border-[#233452]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#4E5E78] hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#17243C] rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || feedback?.type === 'success'}
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'Saving...' : editingExpense ? 'Update Expense' : 'Record Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
