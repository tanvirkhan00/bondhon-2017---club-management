import React, { useMemo, useState } from 'react';
import { useClubData } from '../../hooks/useClubData';
import { BankDeposit, BankEntryType, ClubExpense } from '../../types';
import { formatBDT, formatDate } from '../../utils/formatters';
import { downloadCsv } from '../../utils/csvExport';
import { MetricCard } from '../../components/MetricCard';
import { BankEntryModal } from '../../components/BankEntryModal';
import { ClubExpenseModal } from '../../components/ClubExpenseModal';
import { PageTransition } from '../../components/ui/MotionPrimitives';
import {
  Landmark,
  Wallet,
  Receipt,
  TrendingUp,
  PlusCircle,
  Download,
  Edit2,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  Percent,
  CheckCircle2,
  Scale,
  Coins,
} from 'lucide-react';

const BANK_TYPE_LABELS: Record<BankEntryType, { label: string; isCredit: boolean; badge: string }> = {
  deposit: {
    label: 'Cash Deposit',
    isCredit: true,
    badge: 'bg-[#1D4ED8]/12 text-[#1D4ED8] dark:text-[#60A5FA] border-[#1D4ED8]/30 dark:border-[#60A5FA]/35',
  },
  interest: {
    label: 'Bank Interest',
    isCredit: true,
    badge: 'bg-[#D6AC62]/15 text-[#92600A] dark:text-[#F0C56E] border-[#D6AC62]/35',
  },
  charge: {
    label: 'Bank Charge / Fee',
    isCredit: false,
    badge: 'bg-rose-500/12 text-rose-700 dark:text-rose-400 border-rose-500/30',
  },
  withdrawal: {
    label: 'Withdrawal',
    isCredit: false,
    badge: 'bg-sky-500/12 text-sky-700 dark:text-sky-400 border-sky-500/30',
  },
};

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  account_opening: 'Account Opening',
  bank_charge: 'Bank Fee',
  operational: 'Operations',
  event: 'Meeting / Event',
  welfare: 'Welfare',
  other: 'Other',
};

interface UnifiedBankRow {
  id: string;
  date: string;
  sortKey: string;
  kind: 'bank_entry' | 'bank_expense';
  entryType: BankEntryType | 'bank_expense';
  label: string;
  note: string;
  refNo: string;
  signedAmount: number;
  runningBalance: number;
  rawBank?: BankDeposit;
  rawExpense?: ClubExpense;
}

export const AdminTreasury: React.FC = () => {
  const {
    monthlyDues,
    bankDeposits,
    clubExpenses,
    totalClubPrincipalCollected,
    totalClubFineCollected,
    totalClubCollected,
    totalBankDeposited,
    totalBankInterest,
    totalBankCharges,
    totalClubExpenses,
    netClubAvailableBalance,
    currentBankBalance,
    cashInHandBalance,
    bankDepositProgress,
    deleteBankDeposit,
    deleteClubExpense,
  } = useClubData();

  const [activeTab, setActiveTab] = useState<'bank' | 'club'>('bank');
  const [bankFilter, setBankFilter] = useState<'all' | BankEntryType | 'bank_expense'>('all');

  // Modals
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [bankModalDefaultType, setBankModalDefaultType] = useState<BankEntryType>('deposit');
  const [editingBank, setEditingBank] = useState<BankDeposit | null>(null);

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ClubExpense | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Build chronological Sonali Bank Account Statement (including bank-paid club expenses)
  const bankStatementRows = useMemo<UnifiedBankRow[]>(() => {
    const combined: Omit<UnifiedBankRow, 'runningBalance'>[] = [];

    bankDeposits.forEach((b) => {
      const type = (b.entry_type || 'deposit') as BankEntryType;
      const amt = Number(b.amount || 0);
      const isCredit = type === 'deposit' || type === 'interest';
      combined.push({
        id: `bank-${b.id}`,
        date: (b.deposited_at || '').substring(0, 10),
        sortKey: `${(b.deposited_at || '').substring(0, 10)}_${b.created_at || ''}`,
        kind: 'bank_entry',
        entryType: type,
        label: BANK_TYPE_LABELS[type].label,
        note: b.notes || (type === 'deposit' ? 'Sonali Bank Deposit' : BANK_TYPE_LABELS[type].label),
        refNo: b.reference_no || '—',
        signedAmount: isCredit ? amt : -amt,
        rawBank: b,
      });
    });

    clubExpenses
      .filter((e) => e.payment_source === 'bank')
      .forEach((e) => {
        const amt = Number(e.amount || 0);
        combined.push({
          id: `exp-${e.id}`,
          date: (e.expense_date || '').substring(0, 10),
          sortKey: `${(e.expense_date || '').substring(0, 10)}_${e.created_at || ''}`,
          kind: 'bank_expense',
          entryType: 'bank_expense',
          label: 'Club Expense (Bank)',
          note: e.title + (e.notes ? ` — ${e.notes}` : ''),
          refNo: e.reference_no || '—',
          signedAmount: -amt,
          rawExpense: e,
        });
      });

    // Sort oldest -> newest to compute exact running bank balance
    combined.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    let running = 0;
    const withBalance: UnifiedBankRow[] = combined.map((row) => {
      running += row.signedAmount;
      return { ...row, runningBalance: running };
    });

    // Display newest -> oldest in table
    return withBalance.reverse();
  }, [bankDeposits, clubExpenses]);

  const filteredBankRows = useMemo(() => {
    if (bankFilter === 'all') return bankStatementRows;
    return bankStatementRows.filter((r) => r.entryType === bankFilter);
  }, [bankStatementRows, bankFilter]);

  // Yearly Collection Summary rows (mirrors Club Total Cash breakdown)
  const yearlyCollectionRows = useMemo(() => {
    const byYear = new Map<number, { principal: number; fine: number }>();
    monthlyDues.forEach((d) => {
      const paid = Number(d.amount_paid || 0);
      const fine = Number(d.fine_paid || 0);
      if (paid <= 0 && fine <= 0) return;
      const cur = byYear.get(d.year) || { principal: 0, fine: 0 };
      cur.principal += paid;
      cur.fine += fine;
      byYear.set(d.year, cur);
    });
    return Array.from(byYear.entries())
      .sort(([yA], [yB]) => yA - yB)
      .map(([year, vals]) => ({
        year,
        principal: vals.principal,
        fine: vals.fine,
      }));
  }, [monthlyDues]);

  const totalDeductions = totalBankCharges + totalClubExpenses;

  const openBankModal = (type: BankEntryType, entry: BankDeposit | null = null) => {
    setEditingBank(entry);
    setBankModalDefaultType(type);
    setBankModalOpen(true);
  };

  const openExpenseModal = (expense: ClubExpense | null = null) => {
    setEditingExpense(expense);
    setExpenseModalOpen(true);
  };

  const handleExportBankStatementCsv = () => {
    const headers = [
      'Date',
      'Transaction Type',
      'Note / Particular',
      'Reference No',
      'Credit / Debit (BDT)',
      'Running Bank Balance (BDT)',
    ];
    const rows = [...bankStatementRows]
      .reverse()
      .map((r) => [
        r.date,
        r.label,
        r.note,
        r.refNo === '—' ? '' : r.refNo,
        r.signedAmount,
        r.runningBalance,
      ]);
    rows.push(['', 'CURRENT SONALI BANK BALANCE', '', '', '', currentBankBalance]);
    downloadCsv(`Bondhon_2017_Sonali_Bank_Statement_${new Date().toISOString().substring(0, 10)}.csv`, headers, rows);
  };

  const handleExportClubStatementCsv = () => {
    const headers = ['Date', 'Category', 'Particular / Description', 'Source', 'Ref No', 'Amount (BDT)'];
    const rows: (string | number)[][] = [];

    yearlyCollectionRows.forEach((yr) => {
      if (yr.principal > 0) rows.push(['', 'Collection', `${yr.year} Principal Collection`, 'Member Dues', '', yr.principal]);
      if (yr.fine > 0) rows.push(['', 'Fine', `${yr.year} Jorimana Collection`, 'Member Fines', '', yr.fine]);
    });

    bankDeposits
      .filter((b) => b.entry_type === 'interest' || b.entry_type === 'charge')
      .forEach((b) => {
        const isInt = b.entry_type === 'interest';
        rows.push([
          (b.deposited_at || '').substring(0, 10),
          isInt ? 'Bank Interest' : 'Bank Charge',
          b.notes || (isInt ? 'Credit from Interest' : 'Bank Charge'),
          'Sonali Bank PLC',
          b.reference_no || '',
          isInt ? Number(b.amount) : -Number(b.amount),
        ]);
      });

    clubExpenses.forEach((e) => {
      rows.push([
        (e.expense_date || '').substring(0, 10),
        EXPENSE_CATEGORY_LABELS[e.category] || e.category,
        e.title,
        e.payment_source === 'bank' ? 'Sonali Bank A/C' : 'Cash in Hand',
        e.reference_no || '',
        -Number(e.amount),
      ]);
    });

    rows.push(['', 'NET SUMMARY', 'Club Net Available Balance', '', '', netClubAvailableBalance]);
    downloadCsv(`Bondhon_2017_Club_Treasury_Cashbook_${new Date().toISOString().substring(0, 10)}.csv`, headers, rows);
  };

  return (
    <PageTransition className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DFE6F0] dark:border-[#233452]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F1B2E] dark:text-slate-100 flex items-center gap-2.5">
            <Landmark className="w-6 h-6 text-[#1D4ED8] dark:text-[#60A5FA]" />
            <span>Sonali Bank &amp; Club Expense Ledger</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#4E5E78] dark:text-slate-400 mt-0.5">
            Track Bank Deposits, Interest, Service Charges (SMS/VAT/TDS), and Club Expenses to maintain exact Net Available Balance
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openBankModal('deposit')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-xl shadow-xs transition-colors cursor-pointer whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Bank Entry</span>
          </button>

          <button
            type="button"
            onClick={() => openBankModal('charge')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/30 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>+ Bank Fee / VAT</span>
          </button>

          <button
            type="button"
            onClick={() => openExpenseModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#92600A] dark:text-[#F0C56E] bg-[#D6AC62]/15 hover:bg-[#D6AC62]/25 border border-[#D6AC62]/35 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>+ Club Expense</span>
          </button>
        </div>
      </div>

      {/* 5 Primary Treasury & Collection Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <MetricCard
          label="Total Member Collection"
          value={formatBDT(totalClubCollected)}
          subLabel={`Dues: ${formatBDT(totalClubPrincipalCollected)} · Fine: ${formatBDT(totalClubFineCollected)}`}
          icon={Coins}
          accent="sapphire"
          trend={{
            positive: true,
            text: `${yearlyCollectionRows.length} fiscal ${yearlyCollectionRows.length === 1 ? 'year' : 'years'}`,
          }}
        />
        <MetricCard
          label="Club Net Available Balance"
          value={formatBDT(netClubAvailableBalance)}
          subLabel={`Int: +${formatBDT(totalBankInterest)} · Ded: -${formatBDT(totalDeductions)}`}
          icon={Scale}
          accent="sapphire"
          trend={{
            positive: netClubAvailableBalance >= totalClubCollected - totalDeductions,
            text: totalDeductions > 0 ? `-${formatBDT(totalDeductions)} deducted` : 'No deductions',
          }}
        />
        <MetricCard
          label="Current Bank Account Cash"
          value={formatBDT(currentBankBalance)}
          subLabel={`Sonali Bank A/C 2102201027292`}
          icon={Landmark}
          accent="navy"
          trend={{
            positive: true,
            text: `${formatBDT(totalBankDeposited)} deposited`,
          }}
        />
        <MetricCard
          label="Cash in Hand (Undeposited)"
          value={formatBDT(cashInHandBalance)}
          subLabel={`${bankDepositProgress}% depositable cash banked`}
          icon={Wallet}
          accent="gold"
        />
        <MetricCard
          label="Fees, Charges & Expenses"
          value={formatBDT(totalDeductions)}
          subLabel={`Bank fees: ${formatBDT(totalBankCharges)} · Club exp: ${formatBDT(totalClubExpenses)}`}
          icon={Receipt}
          accent="rose"
          trend={{
            positive: totalBankInterest >= totalDeductions,
            text: `Interest: +${formatBDT(totalBankInterest)}`,
          }}
        />
      </div>

      {/* Reconciliation Formula Banner */}
      <div className="surface-card rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
          <span className="font-bold text-[#0F1B2E] dark:text-slate-100 uppercase tracking-wider text-[11px]">
            Available Balance Formula:
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-[#EFF3F9] dark:bg-[#17243C] font-mono tabular-nums font-semibold text-[#0F1B2E] dark:text-slate-200">
            Member Collections ({formatBDT(totalClubCollected)})
          </span>
          <span className="text-[#1D4ED8] dark:text-[#60A5FA] font-bold">+</span>
          <span className="px-2.5 py-1 rounded-lg bg-[#D6AC62]/15 font-mono tabular-nums font-semibold text-[#92600A] dark:text-[#F0C56E]">
            Bank Interest ({formatBDT(totalBankInterest)})
          </span>
          <span className="text-rose-500 font-bold">−</span>
          <span className="px-2.5 py-1 rounded-lg bg-rose-500/12 font-mono tabular-nums font-semibold text-rose-700 dark:text-rose-400">
            Bank Charges ({formatBDT(totalBankCharges)})
          </span>
          <span className="text-rose-500 font-bold">−</span>
          <span className="px-2.5 py-1 rounded-lg bg-rose-500/12 font-mono tabular-nums font-semibold text-rose-700 dark:text-rose-400">
            Club Expenses ({formatBDT(totalClubExpenses)})
          </span>
          <span className="text-[#4E5E78] font-bold">=</span>
          <span className="px-3 py-1 rounded-lg bg-[#1D4ED8] text-white font-mono tabular-nums font-extrabold">
            {formatBDT(netClubAvailableBalance)}
          </span>
        </div>
      </div>

      {/* View Switcher & Export */}
      <div className="surface-card p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl self-start">
          <button
            type="button"
            onClick={() => setActiveTab('bank')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'bank'
                ? 'bg-[#0F1B33] dark:bg-[#1D4ED8] text-white shadow-2xs'
                : 'text-[#4E5E78] hover:text-[#0F1B2E] dark:hover:text-white'
            }`}
          >
            Sonali Bank Account Statement ({bankStatementRows.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('club')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'club'
                ? 'bg-[#0F1B33] dark:bg-[#1D4ED8] text-white shadow-2xs'
                : 'text-[#4E5E78] hover:text-[#0F1B2E] dark:hover:text-white'
            }`}
          >
            Club Cashbook &amp; Expenses ({clubExpenses.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'bank' && (
            <select
              value={bankFilter}
              onChange={(e) => setBankFilter(e.target.value as typeof bankFilter)}
              className="px-3 py-2 text-xs font-semibold bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden cursor-pointer"
            >
              <option value="all" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">All Bank Entries</option>
              <option value="deposit" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">Deposits Only (+)</option>
              <option value="interest" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">Bank Interest Only (+)</option>
              <option value="charge" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">Bank Charges / VAT / TDS (-)</option>
              <option value="withdrawal" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">Withdrawals (-)</option>
              <option value="bank_expense" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">Expenses Paid via Bank (-)</option>
            </select>
          )}

          <button
            type="button"
            onClick={activeTab === 'bank' ? handleExportBankStatementCsv : handleExportClubStatementCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#0F1B2E] dark:text-slate-100 bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] hover:border-[#1D4ED8] dark:hover:border-[#60A5FA] rounded-xl transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#60A5FA]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SONALI BANK STATEMENT */}
      {activeTab === 'bank' && (
        <div className="surface-card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#DFE6F0] dark:border-[#233452] flex flex-wrap items-center justify-between gap-3 bg-[#EFF3F9]/70 dark:bg-[#0F1B33]/40">
            <div>
              <h2 className="text-sm font-bold text-[#0F1B2E] dark:text-slate-100">
                Bank Account Statement — Sonali Bank PLC (A/C 2102201027292)
              </h2>
              <p className="text-[11px] text-[#4E5E78] dark:text-slate-400">
                Chronological ledger with running bank cash balance
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-[#4E5E78] dark:text-slate-400 block">
                Current Account Cash
              </span>
              <span className="text-base font-extrabold font-mono text-[#0369A1] dark:text-[#38BDF8] tabular-nums">
                {formatBDT(currentBankBalance)}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EFF3F9] dark:bg-[#17243C] text-[#4E5E78] dark:text-slate-400 border-b border-[#DFE6F0] dark:border-[#233452]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold">Note / Particular</th>
                  <th className="py-3 px-4 font-semibold">Slip / Ref</th>
                  <th className="py-3 px-4 font-semibold text-right">Amount (৳)</th>
                  <th className="py-3 px-4 font-semibold text-right">Running Balance</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DFE6F0] dark:divide-[#233452]">
                {filteredBankRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[#4E5E78] dark:text-slate-400">
                      No Sonali Bank entries match this filter yet. Click "+ Bank Entry" or "+ Bank Fee / VAT" to add a record.
                    </td>
                  </tr>
                ) : (
                  filteredBankRows.map((row) => {
                    const isDeleting = confirmDeleteId === row.id;
                    const badgeClass =
                      row.entryType === 'bank_expense'
                        ? 'bg-rose-500/12 text-rose-700 dark:text-rose-400 border-rose-500/30'
                        : BANK_TYPE_LABELS[row.entryType].badge;

                    return (
                      <tr key={row.id} className="hover:bg-[#EFF3F9]/60 dark:hover:bg-[#17243C]/60 transition-colors">
                        <td className="py-3 px-4 font-mono text-[#0F1B2E] dark:text-slate-200 whitespace-nowrap tabular-nums">
                          {formatDate(row.date)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${badgeClass}`}>
                            {row.entryType === 'interest' ? (
                              <Percent className="w-3 h-3" />
                            ) : row.signedAmount >= 0 ? (
                              <ArrowDownLeft className="w-3 h-3" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3" />
                            )}
                            <span>{row.label}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-[#0F1B2E] dark:text-slate-100 max-w-xs truncate">
                          {row.note}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#4E5E78] dark:text-slate-400 whitespace-nowrap">
                          {row.refNo}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono font-bold tabular-nums whitespace-nowrap ${
                            row.signedAmount >= 0
                              ? 'text-[#0369A1] dark:text-[#38BDF8]'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {row.signedAmount >= 0 ? `+${formatBDT(row.signedAmount)}` : `-${formatBDT(Math.abs(row.signedAmount))}`}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-[#0F1B2E] dark:text-slate-200 tabular-nums whitespace-nowrap">
                          {formatBDT(row.runningBalance)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                row.kind === 'bank_entry' && row.rawBank
                                  ? openBankModal((row.rawBank.entry_type || 'deposit') as BankEntryType, row.rawBank)
                                  : row.rawExpense && openExpenseModal(row.rawExpense)
                              }
                              className="p-1.5 text-[#4E5E78] hover:text-[#1D4ED8] dark:hover:text-[#60A5FA] rounded-lg hover:bg-[#EFF3F9] dark:hover:bg-[#18294A] cursor-pointer"
                              title="Edit Entry"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {isDeleting ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (row.kind === 'bank_entry' && row.rawBank) {
                                      deleteBankDeposit(row.rawBank.id);
                                    } else if (row.rawExpense) {
                                      deleteClubExpense(row.rawExpense.id);
                                    }
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold cursor-pointer"
                                >
                                  Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-1.5 py-0.5 text-[#4E5E78] text-[10px] cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(row.id)}
                                className="p-1.5 text-[#4E5E78] hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                                title="Delete Entry"
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
      )}

      {/* TAB 2: CLUB CASHBOOK RECONCILIATION & EXPENSES */}
      {activeTab === 'club' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Club Total Cash Reconciliation Sheet (like user's right-hand Excel table) */}
          <div className="lg:col-span-5 surface-card rounded-2xl overflow-hidden self-start">
            <div className="px-5 py-4 border-b border-[#DFE6F0] dark:border-[#233452] flex items-center justify-between bg-[#EFF3F9]/70 dark:bg-[#0F1B33]/40">
              <div>
                <h2 className="text-sm font-bold text-[#0F1B2E] dark:text-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#1D4ED8] dark:text-[#60A5FA]" />
                  <span>Club Total Cash Statement</span>
                </h2>
                <p className="text-[11px] text-[#4E5E78] dark:text-slate-400">
                  Net Available Balance Calculation
                </p>
              </div>
              <span className="text-base font-extrabold font-mono text-[#0369A1] dark:text-[#38BDF8] tabular-nums">
                {formatBDT(netClubAvailableBalance)}
              </span>
            </div>

            <div className="divide-y divide-[#DFE6F0] dark:divide-[#233452] text-xs">
              {yearlyCollectionRows.map((yr) => (
                <React.Fragment key={yr.year}>
                  {yr.principal > 0 && (
                    <div className="px-5 py-2.5 flex items-center justify-between">
                      <span className="font-medium text-[#0F1B2E] dark:text-slate-200">
                        {yr.year} Principal Collection
                      </span>
                      <span className="font-mono font-bold text-[#0369A1] dark:text-[#38BDF8] tabular-nums">
                        +{formatBDT(yr.principal)}
                      </span>
                    </div>
                  )}
                  {yr.fine > 0 && (
                    <div className="px-5 py-2.5 flex items-center justify-between">
                      <span className="font-medium text-[#0F1B2E] dark:text-slate-200">
                        {yr.year} Jorimana Collection
                      </span>
                      <span className="font-mono font-bold text-[#92600A] dark:text-[#F0C56E] tabular-nums">
                        +{formatBDT(yr.fine)}
                      </span>
                    </div>
                  )}
                </React.Fragment>
              ))}

              {totalBankInterest > 0 && (
                <div className="px-5 py-2.5 flex items-center justify-between bg-[#D6AC62]/8">
                  <span className="font-semibold text-[#92600A] dark:text-[#F0C56E]">
                    Bank Interest Credited
                  </span>
                  <span className="font-mono font-bold text-[#92600A] dark:text-[#F0C56E] tabular-nums">
                    +{formatBDT(totalBankInterest)}
                  </span>
                </div>
              )}

              {totalBankCharges > 0 && (
                <div className="px-5 py-2.5 flex items-center justify-between bg-rose-500/8">
                  <span className="font-semibold text-rose-700 dark:text-rose-400">
                    Bank Charges, VAT &amp; TDS
                  </span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                    -{formatBDT(totalBankCharges)}
                  </span>
                </div>
              )}

              {totalClubExpenses > 0 && (
                <div className="px-5 py-2.5 flex items-center justify-between bg-rose-500/8">
                  <span className="font-semibold text-rose-700 dark:text-rose-400">
                    Club Expenses ({clubExpenses.length} items)
                  </span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                    -{formatBDT(totalClubExpenses)}
                  </span>
                </div>
              )}

              <div className="px-5 py-3.5 flex items-center justify-between bg-[#0F1B33] dark:bg-[#17243C] text-white font-bold">
                <span>Club Net Available Balance</span>
                <span className="font-mono text-sm text-[#38BDF8] tabular-nums">
                  {formatBDT(netClubAvailableBalance)}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Club Expenses Ledger Table */}
          <div className="lg:col-span-7 surface-card rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#DFE6F0] dark:border-[#233452] flex items-center justify-between bg-[#EFF3F9]/70 dark:bg-[#0F1B33]/40">
              <div>
                <h2 className="text-sm font-bold text-[#0F1B2E] dark:text-slate-100">
                  Club Expenses &amp; Non-Bank Deductions
                </h2>
                <p className="text-[11px] text-[#4E5E78] dark:text-slate-400">
                  Account opening fees, operations, events &amp; welfare costs
                </p>
              </div>
              <button
                type="button"
                onClick={() => openExpenseModal()}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer whitespace-nowrap"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Expense</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#EFF3F9] dark:bg-[#17243C] text-[#4E5E78] dark:text-slate-400 border-b border-[#DFE6F0] dark:border-[#233452]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Date</th>
                    <th className="py-3 px-4 font-semibold">Particular</th>
                    <th className="py-3 px-4 font-semibold">Source</th>
                    <th className="py-3 px-4 font-semibold text-right">Amount</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DFE6F0] dark:divide-[#233452]">
                  {clubExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-[#4E5E78] dark:text-slate-400 space-y-2">
                        <CheckCircle2 className="w-7 h-7 text-[#1D4ED8] dark:text-[#60A5FA] mx-auto" />
                        <p>No club expenses recorded yet.</p>
                      </td>
                    </tr>
                  ) : (
                    clubExpenses.map((exp) => {
                      const delKey = `clubexp-${exp.id}`;
                      const isDeleting = confirmDeleteId === delKey;
                      return (
                        <tr key={exp.id} className="hover:bg-[#EFF3F9]/60 dark:hover:bg-[#17243C]/60 transition-colors">
                          <td className="py-3 px-4 font-mono text-[#0F1B2E] dark:text-slate-200 whitespace-nowrap tabular-nums">
                            {formatDate(exp.expense_date)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-[#0F1B2E] dark:text-slate-100 block">
                              {exp.title}
                            </span>
                            <span className="text-[10px] text-[#4E5E78] dark:text-slate-400">
                              {EXPENSE_CATEGORY_LABELS[exp.category] || exp.category}
                              {exp.reference_no ? ` · Ref: ${exp.reference_no}` : ''}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold ${
                                exp.payment_source === 'bank'
                                  ? 'bg-[#1D4ED8]/12 text-[#1D4ED8] dark:text-[#60A5FA] border-[#1D4ED8]/30 dark:border-[#60A5FA]/35'
                                  : 'bg-[#D6AC62]/15 text-[#92600A] dark:text-[#F0C56E] border-[#D6AC62]/35'
                              }`}
                            >
                              {exp.payment_source === 'bank' ? 'Sonali Bank A/C' : 'Cash in Hand'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums whitespace-nowrap">
                            -{formatBDT(exp.amount)}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openExpenseModal(exp)}
                                className="p-1.5 text-[#4E5E78] hover:text-[#1D4ED8] dark:hover:text-[#60A5FA] rounded-lg hover:bg-[#EFF3F9] dark:hover:bg-[#18294A] cursor-pointer"
                                title="Edit Expense"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {isDeleting ? (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      deleteClubExpense(exp.id);
                                      setConfirmDeleteId(null);
                                    }}
                                    className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-1.5 py-0.5 text-[#4E5E78] text-[10px] cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(delKey)}
                                  className="p-1.5 text-[#4E5E78] hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                                  title="Delete Expense"
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
        </div>
      )}

      {/* Modals */}
      <BankEntryModal
        isOpen={bankModalOpen}
        onClose={() => setBankModalOpen(false)}
        editingEntry={editingBank}
        defaultEntryType={bankModalDefaultType}
      />

      <ClubExpenseModal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        editingExpense={editingExpense}
      />
    </PageTransition>
  );
};
