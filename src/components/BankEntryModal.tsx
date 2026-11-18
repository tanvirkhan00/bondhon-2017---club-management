import React, { useState, useEffect, useRef } from 'react';
import { BankDeposit, BankEntryType } from '../types';
import { useClubData } from '../hooks/useClubData';
import { formatBDT } from '../utils/formatters';
import { Modal } from './ui/Modal';
import {
  Landmark,
  CheckCircle2,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Percent,
  Receipt,
} from 'lucide-react';

interface BankEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingEntry?: BankDeposit | null;
  defaultEntryType?: BankEntryType;
}

const ENTRY_TYPE_META: Record<
  BankEntryType,
  {
    label: string;
    shortLabel: string;
    sign: '+' | '-';
    badgeClass: string;
    impactHint: string;
  }
> = {
  deposit: {
    label: 'Cash Deposit to Bank',
    shortLabel: 'Deposit (+)',
    sign: '+',
    badgeClass: 'bg-[#0369A1]/15 text-[#0369A1] dark:text-[#38BDF8] border-[#0369A1]/30 dark:border-[#38BDF8]/35',
    impactHint: 'Increases Bank Balance & transfers funds from Cash in Hand (no change to Club Net Balance).',
  },
  charge: {
    label: 'Bank Service Charge / Fee / Tax',
    shortLabel: 'Bank Charge (-)',
    sign: '-',
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
    impactHint: 'Deducts from BOTH Sonali Bank Balance AND Club Net Available Balance.',
  },
  interest: {
    label: 'Bank Interest Credited',
    shortLabel: 'Interest (+)',
    sign: '+',
    badgeClass: 'bg-[#D6AC62]/20 text-[#92600A] dark:text-[#F0C56E] border-[#D6AC62]/40',
    impactHint: 'Adds to BOTH Sonali Bank Balance AND Club Net Available Balance.',
  },
  withdrawal: {
    label: 'Bank Cash Withdrawal',
    shortLabel: 'Withdrawal (-)',
    sign: '-',
    badgeClass: 'bg-[#1D4ED8]/15 text-[#1D4ED8] dark:text-[#60A5FA] border-[#1D4ED8]/30 dark:border-[#60A5FA]/35',
    impactHint: 'Withdraws funds from Bank back to Treasurer Cash in Hand (no change to Club Net Balance).',
  },
};

const CHARGE_PRESETS = [
  'SMS Charge',
  'Maintenance Charge',
  'VAT',
  'Debited for TDS on interest',
  'Yearly Service Fee',
];

export const BankEntryModal: React.FC<BankEntryModalProps> = ({
  isOpen,
  onClose,
  editingEntry = null,
  defaultEntryType = 'deposit',
}) => {
  const { pendingBankDeposit, addBankDeposit, updateBankDeposit } = useClubData();

  const [entryType, setEntryType] = useState<BankEntryType>(defaultEntryType);
  const [amount, setAmount] = useState<number>(0);
  const [depositedAt, setDepositedAt] = useState<string>(new Date().toISOString().substring(0, 10));
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const pendingDepositRef = useRef(pendingBankDeposit);
  pendingDepositRef.current = pendingBankDeposit;
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
    const currentCashInHand = pendingDepositRef.current;
    if (editingEntry) {
      setEntryType((editingEntry.entry_type || 'deposit') as BankEntryType);
      setAmount(Number(editingEntry.amount || 0));
      setDepositedAt((editingEntry.deposited_at || new Date().toISOString()).substring(0, 10));
      setReferenceNo(editingEntry.reference_no || '');
      setNotes(editingEntry.notes || '');
    } else {
      setEntryType(defaultEntryType);
      setAmount(defaultEntryType === 'deposit' && currentCashInHand > 0 ? currentCashInHand : 0);
      setDepositedAt(new Date().toISOString().substring(0, 10));
      setReferenceNo('');
      setNotes(
        defaultEntryType === 'interest'
          ? 'Credit from Interest'
          : defaultEntryType === 'charge'
          ? 'Maintenance Charge'
          : ''
      );
    }
  }, [isOpen, editingEntry, defaultEntryType]);

  const handleSelectType = (nextType: BankEntryType) => {
    setEntryType(nextType);
    if (!editingEntry) {
      if (nextType === 'deposit') {
        setAmount(pendingBankDeposit > 0 ? pendingBankDeposit : 0);
        if (notes === 'Credit from Interest' || CHARGE_PRESETS.includes(notes)) setNotes('');
      } else if (nextType === 'interest') {
        if (!notes || CHARGE_PRESETS.includes(notes)) setNotes('Credit from Interest');
        if (amount === pendingBankDeposit) setAmount(0);
      } else if (nextType === 'charge') {
        if (!notes || notes === 'Credit from Interest') setNotes('SMS Charge');
        if (amount === pendingBankDeposit) setAmount(0);
      } else if (nextType === 'withdrawal') {
        if (notes === 'Credit from Interest' || CHARGE_PRESETS.includes(notes)) setNotes('');
        if (amount === pendingBankDeposit) setAmount(0);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || feedback?.type === 'success') return;
    setSaving(true);
    setFeedback(null);

    const res = editingEntry
      ? await updateBankDeposit(editingEntry.id, {
          entry_type: entryType,
          amount: Number(amount),
          deposited_at: depositedAt,
          reference_no: referenceNo || null,
          notes: notes || null,
        })
      : await addBankDeposit({
          entry_type: entryType,
          amount: Number(amount),
          deposited_at: depositedAt,
          reference_no: referenceNo,
          notes: notes,
        });

    setSaving(false);

    if (res.success) {
      setFeedback({
        type: 'success',
        text: editingEntry
          ? 'Sonali Bank ledger entry updated.'
          : 'Sonali Bank ledger entry recorded successfully.',
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
        text: res.error || 'Failed to save Sonali Bank entry.',
      });
    }
  };

  const activeMeta = ENTRY_TYPE_META[entryType];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingEntry ? 'Edit Sonali Bank Entry' : 'Sonali Bank PLC — Ledger Entry'}
      subtitle="A/C: 2102201027292 · Bhedarganj Branch, Shariatpur"
      icon={<Landmark className="w-4 h-4" />}
      lottieSrc="/lottie/bank-deposit.json"
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
          {/* Entry Type Selector */}
          <div>
            <label className="block font-semibold text-[#0F1B2E] dark:text-slate-200 mb-2">
              Transaction Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { type: 'deposit', icon: ArrowDownLeft },
                  { type: 'charge', icon: Receipt },
                  { type: 'interest', icon: Percent },
                  { type: 'withdrawal', icon: ArrowUpRight },
                ] as const
              ).map(({ type, icon: Icon }) => {
                const selected = entryType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleSelectType(type)}
                    className={`px-2.5 py-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      selected
                        ? `${ENTRY_TYPE_META[type].badgeClass} ring-1 ring-current shadow-2xs`
                        : 'bg-[#EFF3F9] dark:bg-[#17243C] text-[#4E5E78] dark:text-[#9BB0CD] border-[#DFE6F0] dark:border-[#233452] hover:text-[#0F1B2E] dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{ENTRY_TYPE_META[type].shortLabel}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 px-3 py-2 rounded-lg bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] text-[11px] text-[#4E5E78] dark:text-slate-300">
              {activeMeta.impactHint}
            </p>
          </div>

          {/* Quick Presets for Bank Charge */}
          {entryType === 'charge' && (
            <div>
              <span className="block text-[11px] font-medium text-[#4E5E78] dark:text-[#9BB0CD] mb-1.5">
                Quick Bank Fee Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {CHARGE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setNotes(preset)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                      notes === preset
                        ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40'
                        : 'bg-[#EFF3F9] dark:bg-[#17243C] text-[#4E5E78] dark:text-slate-300 border-[#DFE6F0] dark:border-[#233452] hover:border-rose-400/50'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-[#0F1B2E] dark:text-slate-200">
                Amount (৳) — {activeMeta.label}
              </label>
              {entryType === 'deposit' && pendingBankDeposit > 0 && !editingEntry && (
                <button
                  type="button"
                  onClick={() => setAmount(pendingBankDeposit)}
                  className="text-[11px] font-semibold text-[#1D4ED8] dark:text-[#60A5FA] hover:underline cursor-pointer"
                >
                  Use Cash in Hand ({formatBDT(pendingBankDeposit)})
                </button>
              )}
            </div>
            <input
              type="number"
              min={1}
              step="any"
              required
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              className={`w-full px-3 py-2.5 bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl font-mono tabular-nums text-sm font-bold focus:outline-hidden focus:ring-2 ${
                entryType === 'charge' || entryType === 'withdrawal'
                  ? 'text-rose-600 dark:text-rose-400 focus:ring-rose-500'
                  : 'text-[#0369A1] dark:text-[#38BDF8] focus:ring-[#1D4ED8]'
              }`}
              placeholder={entryType === 'charge' ? 'e.g. 250' : 'e.g. 20000'}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#0F1B2E] dark:text-slate-200 mb-1.5">
                Transaction Date
              </label>
              <input
                type="date"
                required
                value={depositedAt}
                onChange={(e) => setDepositedAt(e.target.value)}
                className="w-full px-3 py-2 bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl font-mono text-[#0F1B2E] dark:text-[#F3F6FC] focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#0F1B2E] dark:text-slate-200 mb-1.5">
                Slip / Ref No.
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="Optional receipt / TrxID"
                className="w-full px-3 py-2 bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-[#0F1B2E] dark:text-[#F3F6FC] focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#0F1B2E] dark:text-slate-200 mb-1.5">
              Statement Note / Particular
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                entryType === 'deposit'
                  ? 'e.g. Credit by Tanvir'
                  : entryType === 'charge'
                  ? 'e.g. SMS Charge / VAT / Maintenance Charge'
                  : entryType === 'interest'
                  ? 'e.g. Credit from Interest'
                  : 'e.g. Cash withdrawal for club event'
              }
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
              className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                entryType === 'charge'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-[#1D4ED8] hover:bg-[#1E40AF]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {saving
                  ? 'Saving...'
                  : editingEntry
                  ? 'Update Entry'
                  : `Save ${activeMeta.shortLabel}`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
