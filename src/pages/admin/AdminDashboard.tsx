import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useClubData } from '../../hooks/useClubData';
import { BankDeposit, BankEntryType, ClubExpense, MonthlyDue } from '../../types';
import { FISCAL_YEARS, formatBDT, formatDate, getMonthName, MONTH_NAMES } from '../../utils/formatters';
import { calculateDueBreakdown, parseLocalDate } from '../../utils/fineCalculator';
import { MetricCard } from '../../components/MetricCard';
import { DashboardClock } from '../../components/DashboardClock';
import {
  CollectionTrendStudio,
  PeriodStatusDonut,
  HistoryPieAnalyticsRow,
} from '../../components/DashboardCharts';
import { PageTransition } from '../../components/ui/MotionPrimitives';
import {
  Users,
  Target,
  Banknote,
  AlertCircle,
  PlusCircle,
  Calendar,
  CheckCircle2,
  ArrowRight,
  CreditCard,
  Landmark,
  Edit2,
  Trash2,
  Receipt,
  ChevronDown,
  ChevronUp,
  Search,
} from 'lucide-react';
import { RecordPaymentModal } from '../../components/RecordPaymentModal';
import { BankEntryModal } from '../../components/BankEntryModal';
import { ClubExpenseModal } from '../../components/ClubExpenseModal';

export const AdminDashboard: React.FC = () => {
  const {
    stats,
    members,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    monthlyDues,
    monthSummaries,
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
    pendingBankDeposit,
    bankDepositProgress,
    deleteBankDeposit,
    deleteClubExpense,
  } = useClubData();

  const [recordPaymentModalOpen, setRecordPaymentModalOpen] = useState(false);
  const [selectedMemberForPayment, setSelectedMemberForPayment] = useState<string | undefined>(undefined);

  // Sonali Bank Ledger & Club Expense Modal State
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [bankModalType, setBankModalType] = useState<BankEntryType>('deposit');
  const [editingDeposit, setEditingDeposit] = useState<BankDeposit | null>(null);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ClubExpense | null>(null);
  const [deleteEntryKey, setDeleteEntryKey] = useState<string | null>(null);

  // UI Organization States
  const [showCollectionBreakdown, setShowCollectionBreakdown] = useState(false);
  const [activityTab, setActivityTab] = useState<'payments' | 'treasury'>('payments');
  const [pendingSearch, setPendingSearch] = useState('');

  // Yearly cumulative member collections
  const yearlyMemberCollections = useMemo(() => {
    const byYear = new Map<number, { principal: number; fine: number; total: number }>();
    monthlyDues.forEach((d) => {
      const principal = Number(d.amount_paid || 0);
      const fine = Number(d.fine_paid || 0);
      if (principal <= 0 && fine <= 0) return;
      const cur = byYear.get(d.year) || { principal: 0, fine: 0, total: 0 };
      cur.principal += principal;
      cur.fine += fine;
      cur.total += principal + fine;
      byYear.set(d.year, cur);
    });
    return Array.from(byYear.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, vals]) => ({ year, ...vals }));
  }, [monthlyDues]);

  // Selected-year monthly fines collected array (index 0..11)
  const monthlyFinesByMonth = useMemo(() => {
    const totals = Array<number>(12).fill(0);
    monthlyDues.forEach((d) => {
      if (d.year === selectedYear && d.month >= 1 && d.month <= 12) {
        totals[d.month - 1] += Number(d.fine_paid || 0);
      }
    });
    return totals;
  }, [monthlyDues, selectedYear]);

  // Evaluate ALL active members eligible in (selectedYear, selectedMonth)
  const effectiveMonthDues = useMemo<MonthlyDue[]>(() => {
    const existingByMember = new Map<string, MonthlyDue>();
    monthlyDues.forEach((d) => {
      if (d.month === selectedMonth && d.year === selectedYear) {
        existingByMember.set(d.member_id, d);
      }
    });

    const selectedPeriodKey = selectedYear * 100 + selectedMonth;
    const list: MonthlyDue[] = [];

    members
      .filter((m) => m.status === 'active')
      .forEach((m) => {
        const existing = existingByMember.get(m.id);
        if (existing) {
          list.push(existing);
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
          });
        }
      });

    return list;
  }, [members, monthlyDues, selectedMonth, selectedYear]);

  const unpaidDues = useMemo(() => {
    const now = new Date();
    const q = pendingSearch.trim().toLowerCase();
    return effectiveMonthDues.filter((d) => {
      const bd = calculateDueBreakdown(d, d.member?.shares_count, now);
      if (bd.isFullySettled) return false;
      if (!q) return true;
      const name = (d.member?.full_name || '').toLowerCase();
      const code = (d.member?.member_code || '').toLowerCase();
      const phone = (d.member?.phone || '').toLowerCase();
      return name.includes(q) || code.includes(q) || phone.includes(q);
    });
  }, [effectiveMonthDues, pendingSearch]);

  const recentPayments = useMemo(
    () =>
      [...monthlyDues]
        .filter((d) => d.amount_paid > 0 && d.paid_at)
        .sort((a, b) => (b.paid_at || '').localeCompare(a.paid_at || ''))
        .slice(0, 12),
    [monthlyDues]
  );

  const openAddDepositModal = (type: BankEntryType = 'deposit') => {
    setEditingDeposit(null);
    setBankModalType(type);
    setBankModalOpen(true);
  };

  const openEditDepositModal = (deposit: BankDeposit) => {
    setEditingDeposit(deposit);
    setBankModalType((deposit.entry_type || 'deposit') as BankEntryType);
    setBankModalOpen(true);
  };

  const openAddExpenseModal = () => {
    setEditingExpense(null);
    setExpenseModalOpen(true);
  };

  const openEditExpenseModal = (exp: ClubExpense) => {
    setEditingExpense(exp);
    setExpenseModalOpen(true);
  };

  // Unified recent Treasury activity (Bank Deposits/Charges/Interest + Club Expenses)
  const treasuryActivity = useMemo(() => {
    const items: Array<{
      key: string;
      date: string;
      title: string;
      subtitle: string;
      typeLabel: string;
      typeTone: string;
      signedAmount: number;
      kind: 'bank' | 'expense';
      rawBank?: BankDeposit;
      rawExpense?: ClubExpense;
    }> = [];

    bankDeposits.forEach((b) => {
      const t = (b.entry_type || 'deposit') as BankEntryType;
      const amt = Number(b.amount || 0);
      const isCredit = t === 'deposit' || t === 'interest';
      const typeMap: Record<BankEntryType, { label: string; tone: string }> = {
        deposit: {
          label: 'Bank Deposit',
          tone: 'text-[#0369A1] dark:text-[#38BDF8]',
        },
        interest: {
          label: 'Bank Interest',
          tone: 'text-[#92600A] dark:text-[#F0C56E]',
        },
        charge: {
          label: 'Bank Charge',
          tone: 'text-rose-600 dark:text-rose-400',
        },
        withdrawal: {
          label: 'Withdrawal',
          tone: 'text-[#1D4ED8] dark:text-[#60A5FA]',
        },
      };
      items.push({
        key: `b-${b.id}`,
        date: (b.deposited_at || '').substring(0, 10),
        title: b.notes || typeMap[t].label,
        subtitle: b.reference_no ? `Ref ${b.reference_no}` : 'Sonali Bank PLC',
        typeLabel: typeMap[t].label,
        typeTone: typeMap[t].tone,
        signedAmount: isCredit ? amt : -amt,
        kind: 'bank',
        rawBank: b,
      });
    });

    clubExpenses.forEach((e) => {
      items.push({
        key: `e-${e.id}`,
        date: (e.expense_date || '').substring(0, 10),
        title: e.title,
        subtitle: e.payment_source === 'bank' ? 'Sonali Bank A/C' : 'Cash in Hand',
        typeLabel: 'Club Expense',
        typeTone: 'text-rose-600 dark:text-rose-400',
        signedAmount: -Number(e.amount || 0),
        kind: 'expense',
        rawExpense: e,
      });
    });

    return items.sort((a, b) => b.date.localeCompare(a.date));
  }, [bankDeposits, clubExpenses]);

  const totalOutflows = totalBankCharges + totalClubExpenses;

  return (
    <PageTransition className="space-y-6">
      {/* 1. UNIFIED COMMAND HEADER WITH LIVE DHAKA CLOCK */}
      <div className="space-y-4 pb-5 border-b border-[#DFE6F0] dark:border-[#233452]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F1B2E] dark:text-[#F3F6FC]">
              Financial Overview
            </h1>
            <p className="text-xs sm:text-sm text-[#4E5E78] dark:text-[#9BB0CD] mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span>Bondhon 2017</span>
              <span aria-hidden="true">·</span>
              <span>
                Viewing {getMonthName(selectedMonth)} {selectedYear}
              </span>
              <span aria-hidden="true">·</span>
              <span>Currency: BDT (৳)</span>
            </p>
          </div>

          <DashboardClock />
        </div>

        {/* Responsive Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Joined Period Selector */}
            <div className="inline-flex items-center bg-white dark:bg-[#111B2E] border border-[#DFE6F0] dark:border-[#233452] rounded-xl divide-x divide-[#DFE6F0] dark:divide-[#233452] shadow-2xs overflow-hidden">
              <label className="flex items-center gap-1.5 pl-3 pr-2 py-2 bg-white dark:bg-[#111B2E] cursor-pointer">
                <Calendar className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#60A5FA] shrink-0" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  aria-label="Select month"
                  className="text-xs font-semibold text-[#0F1B2E] dark:text-[#F3F6FC] bg-white dark:bg-[#111B2E] focus:outline-hidden cursor-pointer pr-1"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option
                      key={idx + 1}
                      value={idx + 1}
                      className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-[#F3F6FC]"
                    >
                      {name}
                    </option>
                  ))}
                </select>
              </label>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                aria-label="Select year"
                className="px-3 py-2 text-xs font-semibold font-mono tabular-nums text-[#0F1B2E] dark:text-[#F3F6FC] bg-white dark:bg-[#111B2E] focus:outline-hidden cursor-pointer"
              >
                {FISCAL_YEARS.map((yr) => (
                  <option
                    key={yr}
                    value={yr}
                    className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-[#F3F6FC]"
                  >
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Secondary Quick Sheet Links */}
            <div className="hidden sm:inline-flex items-center bg-white dark:bg-[#111B2E] border border-[#DFE6F0] dark:border-[#233452] rounded-xl p-0.5 text-xs font-semibold">
              <Link
                to="/admin/payments"
                className="px-3 py-1.5 rounded-lg text-[#4E5E78] dark:text-[#9BB0CD] hover:text-[#0F1B2E] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                Dues Sheet
              </Link>
              <Link
                to="/admin/fines"
                className="px-3 py-1.5 rounded-lg text-[#4E5E78] dark:text-[#9BB0CD] hover:text-[#0F1B2E] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                Fines Sheet
              </Link>
            </div>
          </div>

          {/* Primary Action */}
          <button
            type="button"
            onClick={() => {
              setSelectedMemberForPayment(undefined);
              setRecordPaymentModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer whitespace-nowrap w-full sm:w-auto"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* 2. EXECUTIVE TREASURY & BANK SUMMARY (Single Elevation, Hairline Dividers) */}
      <section className="surface-card rounded-2xl overflow-hidden">
        {/* Card Header */}
        <div className="px-5 py-4 sm:px-6 border-b border-[#DFE6F0] dark:border-[#233452] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#0F1B33] dark:bg-[#17243C] border border-[#18294A] dark:border-[#223862] text-[#D6AC62] flex items-center justify-center shrink-0">
              <Landmark className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-[#0F1B2E] dark:text-[#F3F6FC] truncate">
                Club Treasury &amp; Sonali Bank PLC
              </h2>
              <p className="text-xs text-[#4E5E78] dark:text-[#9BB0CD] truncate font-mono tabular-nums">
                A/C 2102201027292 · Bhedarganj Branch
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openAddDepositModal('deposit')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-xl transition-colors shrink-0 cursor-pointer whitespace-nowrap"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Bank Entry</span>
            </button>

            <button
              type="button"
              onClick={openAddExpenseModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#0F1B2E] dark:text-slate-100 bg-[#EFF3F9] dark:bg-[#17243C] hover:bg-slate-200/80 dark:hover:bg-[#1E314A] border border-[#DFE6F0] dark:border-[#233452] rounded-xl transition-colors shrink-0 cursor-pointer whitespace-nowrap"
            >
              <Receipt className="w-3.5 h-3.5 text-rose-500" />
              <span>Add Expense</span>
            </button>

            <Link
              to="/admin/treasury"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#1D4ED8] dark:text-[#60A5FA] hover:underline shrink-0 whitespace-nowrap"
            >
              <span>Bank Statement</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 4 Divided Treasury Figures (No Nested Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 border-[#DFE6F0] dark:border-[#233452]">
          {/* Col 1: Net Available Balance (Focal Anchor) */}
          <div className="p-5 sm:p-6 sm:border-r sm:border-b xl:border-b-0 border-[#DFE6F0] dark:border-[#233452]">
            <span className="text-xs font-semibold text-[#0369A1] dark:text-[#38BDF8] block">
              Club Net Available Balance
            </span>
            <div className="text-2xl sm:text-[28px] font-bold font-mono text-[#0F1B2E] dark:text-white tabular-nums mt-1.5 tracking-tight">
              {formatBDT(netClubAvailableBalance)}
            </div>
            <span className="text-[11px] text-[#4E5E78] dark:text-[#9BB0CD] mt-1.5 block font-mono tabular-nums">
              Collections + Interest − Charges &amp; Exp
            </span>
          </div>

          {/* Col 2: Total Collected from Members */}
          <div className="p-5 sm:p-6 sm:border-b xl:border-b-0 xl:border-r border-[#DFE6F0] dark:border-[#233452]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#4E5E78] dark:text-slate-300">
                Total Member Collection
              </span>
              <button
                type="button"
                onClick={() => setShowCollectionBreakdown((v) => !v)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1D4ED8] dark:text-[#60A5FA] hover:underline cursor-pointer shrink-0 whitespace-nowrap"
              >
                <span>{showCollectionBreakdown ? 'Hide Years' : 'By Year'}</span>
                {showCollectionBreakdown ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <div className="text-2xl sm:text-[28px] font-bold font-mono text-[#0F1B2E] dark:text-[#F3F6FC] tabular-nums mt-1.5 tracking-tight">
              {formatBDT(totalClubCollected)}
            </div>
            <span className="text-[11px] text-[#4E5E78] dark:text-[#9BB0CD] mt-1.5 block font-mono tabular-nums">
              Dues {formatBDT(totalClubPrincipalCollected)} · Fine {formatBDT(totalClubFineCollected)}
            </span>
          </div>

          {/* Col 3: Current Sonali Bank Balance */}
          <div className="p-5 sm:p-6 sm:border-r border-[#DFE6F0] dark:border-[#233452]">
            <span className="text-xs font-semibold text-[#4E5E78] dark:text-slate-300 block">
              Current Bank Account Cash
            </span>
            <div className="text-2xl sm:text-[28px] font-bold font-mono text-[#0F1B2E] dark:text-[#F3F6FC] tabular-nums mt-1.5 tracking-tight">
              {formatBDT(currentBankBalance)}
            </div>
            <span className="text-[11px] text-[#4E5E78] dark:text-[#9BB0CD] mt-1.5 block font-mono tabular-nums">
              Deposited {formatBDT(totalBankDeposited)} · Interest +{formatBDT(totalBankInterest)}
            </span>
          </div>

          {/* Col 4: Bank Charges & Club Expenses */}
          <div className="p-5 sm:p-6">
            <span className="text-xs font-semibold text-[#4E5E78] dark:text-slate-300 block">
              Bank Charges &amp; Club Expenses
            </span>
            <div className="text-2xl sm:text-[28px] font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums mt-1.5 tracking-tight">
              -{formatBDT(totalOutflows)}
            </div>
            <span className="text-[11px] text-[#4E5E78] dark:text-[#9BB0CD] mt-1.5 block font-mono tabular-nums">
              Bank Fees {formatBDT(totalBankCharges)} · Club Exp {formatBDT(totalClubExpenses)}
            </span>
          </div>
        </div>

        {/* Expandable Year-by-Year Member Collection Breakdown (Clean flat drawer) */}
        {showCollectionBreakdown && (
          <div className="px-5 py-4 sm:px-6 bg-[#EFF3F9] dark:bg-[#0D1726]/70 border-t border-[#DFE6F0] dark:border-[#233452] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-[#0F1B2E] dark:text-[#F3F6FC]">
                  Member Collection Breakdown by Year
                </h3>
                <p className="text-[11px] text-[#4E5E78] dark:text-[#9BB0CD]">
                  Gross member dues and late fines collected before bank charges &amp; club expenses
                </p>
              </div>
              <Link
                to="/admin/payment-history"
                className="text-xs font-semibold text-[#1D4ED8] dark:text-[#60A5FA] hover:underline inline-flex items-center gap-1 whitespace-nowrap"
              >
                <span>Full Payment Ledger</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {yearlyMemberCollections.length === 0 ? (
              <p className="text-xs text-[#4E5E78] dark:text-[#9BB0CD]">
                No member contributions recorded yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#DFE6F0] dark:border-[#233452] text-[#4E5E78] dark:text-[#9BB0CD]">
                      <th className="py-2 pr-4 font-semibold">Fiscal Year</th>
                      <th className="py-2 px-4 font-semibold text-right">Monthly Dues</th>
                      <th className="py-2 px-4 font-semibold text-right">Fines Collected</th>
                      <th className="py-2 pl-4 font-semibold text-right">Total Collected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DFE6F0] dark:divide-[#233452] font-mono tabular-nums">
                    {yearlyMemberCollections.map((yr) => (
                      <tr key={yr.year}>
                        <td className="py-2 pr-4 font-bold text-[#0F1B2E] dark:text-[#F3F6FC]">
                          {yr.year}
                        </td>
                        <td className="py-2 px-4 text-right text-[#0F1B2E] dark:text-slate-200">
                          {formatBDT(yr.principal)}
                        </td>
                        <td className="py-2 px-4 text-right text-[#92600A] dark:text-[#F0C56E]">
                          {formatBDT(yr.fine)}
                        </td>
                        <td className="py-2 pl-4 text-right font-bold text-[#0369A1] dark:text-[#38BDF8]">
                          {formatBDT(yr.total)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-[#1D4ED8]/8 dark:bg-[#1D4ED8]/15 font-bold">
                      <td className="py-2.5 pr-4 text-[#1D4ED8] dark:text-[#60A5FA] font-sans">
                        All-Time Total
                      </td>
                      <td className="py-2.5 px-4 text-right text-[#0F1B2E] dark:text-[#F3F6FC]">
                        {formatBDT(totalClubPrincipalCollected)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-[#92600A] dark:text-[#F0C56E]">
                        {formatBDT(totalClubFineCollected)}
                      </td>
                      <td className="py-2.5 pl-4 text-right text-[#0369A1] dark:text-[#38BDF8]">
                        {formatBDT(totalClubCollected)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Footer Progress Strip: Cash in Hand vs Banked */}
        <div className="px-5 py-3.5 sm:px-6 bg-[#EFF3F9]/75 dark:bg-[#0D1726]/45 border-t border-[#DFE6F0] dark:border-[#233452] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="font-semibold text-[#0F1B2E] dark:text-slate-200">
              Bank Deposit Progress
            </span>
            <span className="text-[#4E5E78] dark:text-[#9BB0CD]">·</span>
            <span className="font-mono tabular-nums text-[#92600A] dark:text-[#F0C56E] font-semibold">
              Cash in Hand: {formatBDT(pendingBankDeposit)}
            </span>
          </div>

          <div className="flex items-center gap-3 sm:w-72">
            <div className="flex-1 h-2 bg-white dark:bg-[#17243C] rounded-full overflow-hidden border border-[#DFE6F0] dark:border-[#233452]">
              <div
                style={{ width: `${bankDepositProgress}%` }}
                className="h-full bg-[#1D4ED8] dark:bg-[#38BDF8] rounded-full transition-all duration-300"
              />
            </div>
            <span className="text-xs font-mono font-bold text-[#1D4ED8] dark:text-[#60A5FA] tabular-nums shrink-0">
              {bankDepositProgress}%
            </span>
          </div>
        </div>
      </section>

      {/* 3. MONTHLY PERIOD SNAPSHOT (4 Balanced KPI Cards) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#0F1B2E] dark:text-[#F3F6FC]">
            Period Snapshot — {getMonthName(selectedMonth)} {selectedYear}
          </h2>
          <Link
            to="/admin/reports"
            className="text-xs font-semibold text-[#1D4ED8] dark:text-[#60A5FA] hover:underline inline-flex items-center gap-1 whitespace-nowrap"
          >
            <span>Financial Reports</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            label="Monthly Collected"
            value={formatBDT(stats.totalCollected)}
            subLabel={`${stats.paidMembersCount} members paid in full`}
            icon={Banknote}
            accent="sapphire"
            trend={{
              positive: stats.collectionRate >= 70,
              text: `${stats.collectionRate}% rate`,
            }}
          />
          <MetricCard
            label="Monthly Target"
            value={formatBDT(stats.monthlyTarget)}
            subLabel={`${getMonthName(selectedMonth)} ${selectedYear}`}
            icon={Target}
            accent="gold"
          />
          <MetricCard
            label="Outstanding Dues"
            value={formatBDT(stats.totalOutstanding)}
            subLabel={`${stats.unpaidMembersCount} unpaid · ${stats.partialMembersCount} partial`}
            icon={AlertCircle}
            accent="rose"
            trend={{
              positive: stats.totalOutstanding === 0,
              text: stats.totalOutstanding === 0 ? 'Settled' : 'Pending',
            }}
          />
          <MetricCard
            label="Active Members"
            value={stats.activeMembers}
            subLabel={`${stats.totalMembers} registered · ${stats.inactiveMembers} inactive`}
            icon={Users}
            accent="navy"
          />
        </div>
      </section>

      {/* 4. PRIMARY ANALYTICS ROW (8 + 4 Bento) */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <CollectionTrendStudio
          selectedYear={selectedYear}
          monthSummaries={monthSummaries}
          monthlyFinesByMonth={monthlyFinesByMonth}
          yearlyCollections={yearlyMemberCollections}
        />

        <PeriodStatusDonut
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          collectionRate={stats.collectionRate}
          paidCount={stats.paidMembersCount}
          partialCount={stats.partialMembersCount}
          unpaidCount={stats.unpaidMembersCount}
        />
      </section>

      {/* 4B. HISTORICAL FINANCIAL BREAKDOWN PIES (6 + 6) */}
      <HistoryPieAnalyticsRow
        currentBankBalance={currentBankBalance}
        cashInHandBalance={pendingBankDeposit}
        totalClubExpenses={totalClubExpenses}
        totalBankCharges={totalBankCharges}
        totalClubPrincipalCollected={totalClubPrincipalCollected}
        totalClubFineCollected={totalClubFineCollected}
        totalBankInterest={totalBankInterest}
        yearlyCollections={yearlyMemberCollections}
      />

      {/* 5. OPERATIONAL WORKBENCH (Pending Dues + Tabbed Activity Feed) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Panel 1: Pending Contributions */}
        <div className="lg:col-span-6 surface-card rounded-2xl flex flex-col overflow-hidden min-w-0">
          <div className="px-5 py-4 border-b border-[#DFE6F0] dark:border-[#233452] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#0F1B2E] dark:text-[#F3F6FC]">
                Pending Contributions ({unpaidDues.length})
              </h3>
              <p className="text-xs text-[#4E5E78] dark:text-[#9BB0CD]">
                Unpaid members for {getMonthName(selectedMonth)} {selectedYear}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-44">
                <Search className="w-3.5 h-3.5 text-[#4E5E78] dark:text-[#9BB0CD] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={pendingSearch}
                  onChange={(e) => setPendingSearch(e.target.value)}
                  placeholder="Filter member..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-lg text-[#0F1B2E] dark:text-[#F3F6FC] placeholder:text-[#4E5E78] dark:placeholder:text-[#9BB0CD] focus:outline-hidden focus:border-[#1D4ED8]"
                />
              </div>
              <Link
                to="/admin/payments"
                className="text-xs font-semibold text-[#1D4ED8] dark:text-[#60A5FA] hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <span>Reconcile</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-80 divide-y divide-[#DFE6F0] dark:divide-[#233452]">
            {unpaidDues.length === 0 ? (
              <div className="py-12 px-4 text-center text-xs text-[#4E5E78] dark:text-[#9BB0CD]">
                <CheckCircle2 className="w-8 h-8 text-[#1D4ED8] dark:text-[#60A5FA] mx-auto mb-2" />
                <p className="font-semibold text-[#0F1B2E] dark:text-slate-200">
                  {pendingSearch
                    ? 'No matching unpaid members found.'
                    : `All active members have settled ${getMonthName(selectedMonth)}!`}
                </p>
              </div>
            ) : (
              unpaidDues.map((due) => {
                const bd = calculateDueBreakdown(due, due.member?.shares_count);
                return (
                  <div
                    key={due.id}
                    className="px-5 py-3 flex items-center justify-between text-xs gap-3 hover:bg-[#EFF3F9]/70 dark:hover:bg-[#17243C]/60 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-mono text-[11px] font-semibold text-[#4E5E78] dark:text-[#9BB0CD]">
                          {due.member?.member_code}
                        </span>
                        <span className="text-[#4E5E78] dark:text-[#9BB0CD]" aria-hidden="true">
                          ·
                        </span>
                        <Link
                          to={`/admin/members/${due.member_id}`}
                          className="font-semibold text-[#0F1B2E] dark:text-[#F3F6FC] hover:text-[#1D4ED8] dark:hover:text-[#60A5FA] truncate"
                        >
                          {due.member?.full_name}
                        </Link>
                      </div>
                      <span className="block text-[11px] text-[#4E5E78] dark:text-[#9BB0CD] mt-0.5 font-mono truncate">
                        {due.member?.phone || 'No phone'} · {due.member?.shares_count || 1}{' '}
                        {(due.member?.shares_count || 1) > 1 ? 'shares' : 'share'}
                        {bd.fineOutstanding > 0 && ` · Fine +${formatBDT(bd.fineOutstanding)}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400 block tabular-nums">
                          {formatBDT(bd.totalOutstanding)}
                        </span>
                        <span className="text-[10px] font-medium text-[#4E5E78] dark:text-[#9BB0CD] capitalize">
                          {due.status}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMemberForPayment(due.member_id);
                          setRecordPaymentModalOpen(true);
                        }}
                        className="px-3 py-1.5 text-[11px] font-bold text-[#1D4ED8] dark:text-[#7EB6FF] bg-[#1D4ED8]/10 hover:bg-[#1D4ED8]/20 rounded-lg border border-[#1D4ED8]/25 dark:border-[#60A5FA]/35 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        + Pay
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Panel 2: Unified Recent Activity Switcher (Member Payments | Bank & Expenses) */}
        <div className="lg:col-span-6 surface-card rounded-2xl flex flex-col overflow-hidden min-w-0">
          <div className="px-5 py-3.5 border-b border-[#DFE6F0] dark:border-[#233452] flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center p-1 bg-[#EFF3F9] dark:bg-[#17243C] rounded-xl border border-[#DFE6F0] dark:border-[#233452]">
              <button
                type="button"
                onClick={() => setActivityTab('payments')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  activityTab === 'payments'
                    ? 'bg-white dark:bg-[#1D4ED8] text-[#0F1B2E] dark:text-white shadow-2xs'
                    : 'text-[#4E5E78] dark:text-[#9BB0CD] hover:text-[#0F1B2E] dark:hover:text-white'
                }`}
              >
                Member Payments ({recentPayments.length})
              </button>
              <button
                type="button"
                onClick={() => setActivityTab('treasury')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  activityTab === 'treasury'
                    ? 'bg-white dark:bg-[#1D4ED8] text-[#0F1B2E] dark:text-white shadow-2xs'
                    : 'text-[#4E5E78] dark:text-[#9BB0CD] hover:text-[#0F1B2E] dark:hover:text-white'
                }`}
              >
                Bank &amp; Expenses ({treasuryActivity.length})
              </button>
            </div>

            <Link
              to={activityTab === 'payments' ? '/admin/payment-history' : '/admin/treasury'}
              className="text-xs font-semibold text-[#1D4ED8] dark:text-[#60A5FA] hover:underline inline-flex items-center gap-1 whitespace-nowrap"
            >
              <span>{activityTab === 'payments' ? 'Full Ledger' : 'Full Statement'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto max-h-80 divide-y divide-[#DFE6F0] dark:divide-[#233452]">
            {activityTab === 'payments' ? (
              recentPayments.length === 0 ? (
                <div className="py-12 px-4 text-center text-xs text-[#4E5E78] dark:text-[#9BB0CD]">
                  No recent member payments recorded yet.
                </div>
              ) : (
                recentPayments.map((due) => (
                  <div
                    key={due.id}
                    className="px-5 py-3 flex items-center justify-between text-xs gap-3 hover:bg-[#EFF3F9]/70 dark:hover:bg-[#17243C]/60 transition-colors"
                  >
                    <div className="min-w-0">
                      <Link
                        to={`/admin/members/${due.member_id}`}
                        className="font-semibold text-[#0F1B2E] dark:text-[#F3F6FC] hover:text-[#1D4ED8] dark:hover:text-[#60A5FA] block truncate"
                      >
                        {due.member?.full_name || 'Member'}
                      </Link>
                      <span className="text-[11px] text-[#4E5E78] dark:text-[#9BB0CD] font-mono">
                        {due.member?.member_code} · {getMonthName(due.month)} {due.year} ·{' '}
                        {due.paid_at ? formatDate(due.paid_at) : 'Paid'}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-[#0369A1] dark:text-[#38BDF8] text-sm block tabular-nums">
                        +{formatBDT(due.amount_paid)}
                      </span>
                      {Number(due.fine_paid || 0) > 0 && (
                        <span className="text-[10px] font-mono text-[#92600A] dark:text-[#F0C56E] tabular-nums">
                          +{formatBDT(due.fine_paid)} fine
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )
            ) : treasuryActivity.length === 0 ? (
              <div className="py-12 px-4 text-center text-xs text-[#4E5E78] dark:text-[#9BB0CD]">
                No bank deposits, fees, interest, or club expenses recorded yet.
              </div>
            ) : (
              treasuryActivity.map((item) => {
                const isDeleting = deleteEntryKey === item.key;
                return (
                  <div
                    key={item.key}
                    className="px-5 py-3 flex items-center justify-between text-xs gap-3 hover:bg-[#EFF3F9]/70 dark:hover:bg-[#17243C]/60 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-semibold text-[#0F1B2E] dark:text-[#F3F6FC] truncate">
                          {item.title}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#4E5E78] dark:text-[#9BB0CD] mt-0.5 flex items-center gap-1.5 truncate font-mono">
                        <span>{formatDate(item.date)}</span>
                        <span aria-hidden="true">·</span>
                        <span className={`font-sans font-semibold ${item.typeTone}`}>
                          {item.typeLabel}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{item.subtitle}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`font-mono font-bold text-sm tabular-nums whitespace-nowrap ${
                          item.signedAmount >= 0
                            ? 'text-[#0369A1] dark:text-[#38BDF8]'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {item.signedAmount >= 0
                          ? `+${formatBDT(item.signedAmount)}`
                          : `-${formatBDT(Math.abs(item.signedAmount))}`}
                      </span>

                      <div className="inline-flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            item.kind === 'bank' && item.rawBank
                              ? openEditDepositModal(item.rawBank)
                              : item.rawExpense && openEditExpenseModal(item.rawExpense)
                          }
                          className="p-1.5 text-[#4E5E78] dark:text-[#9BB0CD] hover:text-[#1D4ED8] dark:hover:text-[#60A5FA] rounded-lg hover:bg-[#EFF3F9] dark:hover:bg-[#18294A] cursor-pointer"
                          title="Edit Entry"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {isDeleting ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (item.kind === 'bank' && item.rawBank) {
                                  deleteBankDeposit(item.rawBank.id);
                                } else if (item.rawExpense) {
                                  deleteClubExpense(item.rawExpense.id);
                                }
                                setDeleteEntryKey(null);
                              }}
                              className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold cursor-pointer"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteEntryKey(null)}
                              className="px-1.5 py-0.5 text-[#4E5E78] dark:text-[#9BB0CD] text-[10px] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteEntryKey(item.key)}
                            className="p-1.5 text-[#4E5E78] dark:text-[#9BB0CD] hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                            title="Remove Entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Modals */}
      <BankEntryModal
        isOpen={bankModalOpen}
        onClose={() => setBankModalOpen(false)}
        editingEntry={editingDeposit}
        defaultEntryType={bankModalType}
      />

      <ClubExpenseModal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        editingExpense={editingExpense}
      />

      <RecordPaymentModal
        isOpen={recordPaymentModalOpen}
        onClose={() => setRecordPaymentModalOpen(false)}
        initialMemberId={selectedMemberForPayment}
        initialMonth={selectedMonth}
        initialYear={selectedYear}
      />
    </PageTransition>
  );
};
