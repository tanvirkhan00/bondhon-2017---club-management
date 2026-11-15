import { DueStatus, Member, MemberFinancialSummary, MonthlyDue } from '../types';

export const FINE_PER_SHARE = 50;
export const MONTHLY_DEADLINE_DAY = 12;

export type MonthlyDueWithMeta = MonthlyDue & {
  isVirtual?: boolean;
};

/**
 * Parses a Date or YYYY-MM-DD string into local year/month/day without UTC timezone drift.
 */
export function parseLocalDate(dateInput: Date | string = new Date()): Date {
  if (dateInput instanceof Date) {
    return dateInput;
  }
  const datePart = String(dateInput).substring(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const parsed = new Date(dateInput);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Club Collection Rule:
 * Installments for a billing month (e.g. January) are paid during the following month
 * (e.g. February), and the deadline without fine is the 12th of that following month (Feb 12).
 */
export function getDueDeadline(
  billingMonth: number,
  billingYear: number
): { deadlineMonth: number; deadlineYear: number; deadlineDay: number } {
  const deadlineMonth = billingMonth === 12 ? 1 : billingMonth + 1;
  const deadlineYear = billingMonth === 12 ? billingYear + 1 : billingYear;
  return {
    deadlineMonth,
    deadlineYear,
    deadlineDay: MONTHLY_DEADLINE_DAY,
  };
}

/**
 * Given a payment date (e.g. in February 2026), returns the billing period it settles (January 2026).
 */
export function getBillingPeriodFromPaymentDate(
  paymentDate: Date | string = new Date()
): { billingMonth: number; billingYear: number } {
  const d = parseLocalDate(paymentDate);
  const payMonth = d.getMonth() + 1;
  const payYear = d.getFullYear();
  if (payMonth === 1) {
    return { billingMonth: 12, billingYear: payYear - 1 };
  }
  return { billingMonth: payMonth - 1, billingYear: payYear };
}

/**
 * Returns true if the 12th of the FOLLOWING month (e.g. Feb 12 for January's due)
 * has passed relative to referenceDate.
 */
export function isAfterMonthDeadline(
  billingMonth: number,
  billingYear: number,
  referenceDate: Date | string = new Date()
): boolean {
  const ref = parseLocalDate(referenceDate);
  const curYear = ref.getFullYear();
  const curMonth = ref.getMonth() + 1;
  const curDay = ref.getDate();

  const { deadlineMonth, deadlineYear } = getDueDeadline(billingMonth, billingYear);

  if (deadlineYear < curYear) return true;
  if (deadlineYear === curYear && deadlineMonth < curMonth) return true;
  if (deadlineYear === curYear && deadlineMonth === curMonth && curDay > MONTHLY_DEADLINE_DAY) {
    return true;
  }
  return false;
}

export interface DueBreakdown {
  sharesCount: number;
  principalDue: number;
  principalPaid: number;
  principalOutstanding: number;
  fineDue: number;
  finePaid: number;
  fineOutstanding: number;
  totalDue: number;
  totalPaid: number;
  totalOutstanding: number;
  isLate: boolean;
  isFullySettled: boolean;
}

/**
 * Calculates principal + late fine breakdown for a monthly due record.
 * Rule: ৳50 fine per share/name if unpaid after the 12th of the following month (e.g. Jan due -> Feb 12).
 * Example: 1 name = 500 + 50 = 550৳; 2 names = 1000 + 100 = 1100৳; 3 names = 1500 + 150 = 1650৳.
 */
export function calculateDueBreakdown(
  due: MonthlyDue,
  sharesCountInput?: number,
  referenceDate: Date = new Date()
): DueBreakdown {
  const sharesCount = Math.max(
    1,
    sharesCountInput || due.member?.shares_count || Math.round(Number(due.amount_due || 500) / 500) || 1
  );

  const principalDue = Number(due.amount_due || 0);
  const principalPaid = Number(due.amount_paid || 0);
  const principalOutstanding = Math.max(0, principalDue - principalPaid);

  const isLate = isAfterMonthDeadline(due.month, due.year, referenceDate);
  const standardFine = sharesCount * FINE_PER_SHARE;
  const recordedFineDue = Number(due.fine_due || 0);
  const finePaid = Number(due.fine_paid || 0);

  let effectiveFineDue = 0;
  if (due.fine_waived) {
    effectiveFineDue = finePaid;
  } else if (recordedFineDue > 0) {
    effectiveFineDue = Math.max(recordedFineDue, finePaid);
  } else if (due.status !== 'paid' && isLate) {
    effectiveFineDue = standardFine;
  } else if (finePaid > 0) {
    effectiveFineDue = finePaid;
  }

  const fineOutstanding = Math.max(0, effectiveFineDue - finePaid);
  const totalDue = principalDue + effectiveFineDue;
  const totalPaid = principalPaid + finePaid;
  const totalOutstanding = principalOutstanding + fineOutstanding;

  return {
    sharesCount,
    principalDue,
    principalPaid,
    principalOutstanding,
    fineDue: effectiveFineDue,
    finePaid,
    fineOutstanding,
    totalDue,
    totalPaid,
    totalOutstanding,
    isLate: effectiveFineDue > 0,
    isFullySettled: totalOutstanding === 0,
  };
}

/**
 * Builds a complete month-by-month ledger for a member from their join date (default 2024-04)
 * through the current active collection period (previous calendar month of referenceDate).
 * Missing months for active members are dynamically represented as unpaid rows with auto-fines.
 */
export function buildMemberCompleteLedger(
  member: Member,
  existingDues: MonthlyDue[],
  referenceDate: Date = new Date()
): MonthlyDueWithMeta[] {
  const existingMap = new Map<string, MonthlyDue>();
  let minExistingKey = Infinity;

  existingDues.forEach((d) => {
    const key = d.year * 100 + d.month;
    if (key < minExistingKey) minExistingKey = key;
    existingMap.set(`${d.year}-${d.month}`, { ...d, member });
  });

  const joinParsed = parseLocalDate(member.join_date || '2024-04-01');
  const joinYear = joinParsed.getFullYear();
  const joinMonth = joinParsed.getMonth() + 1;
  const joinKey = joinYear * 100 + joinMonth;

  const startKey = Math.min(joinKey, minExistingKey);
  let startYear = Math.floor(startKey / 100);
  let startMonth = startKey % 100;

  const { billingMonth: activeEndMonth, billingYear: activeEndYear } =
    getBillingPeriodFromPaymentDate(referenceDate);
  const activeEndKey = activeEndYear * 100 + activeEndMonth;

  const result: MonthlyDueWithMeta[] = [];
  const includedKeys = new Set<string>();

  if (member.status === 'active' && startKey <= activeEndKey) {
    let y = startYear;
    let m = startMonth;
    const defaultMonthly = member.monthly_contribution || (member.shares_count || 1) * 500;

    while (y * 100 + m <= activeEndKey) {
      const keyStr = `${y}-${m}`;
      includedKeys.add(keyStr);
      const real = existingMap.get(keyStr);
      if (real) {
        result.push({ ...real, isVirtual: false });
      } else {
        result.push({
          id: `virtual-${member.id}-${y}-${m}`,
          member_id: member.id,
          member,
          month: m,
          year: y,
          amount_due: defaultMonthly,
          amount_paid: 0,
          fine_due: 0,
          fine_paid: 0,
          status: 'unpaid',
          paid_at: null,
          isVirtual: true,
        });
      }

      if (m === 12) {
        m = 1;
        y += 1;
      } else {
        m += 1;
      }
    }
  }

  // Append any existing records outside the active window (e.g. advance payments or inactive member records)
  existingDues.forEach((d) => {
    const keyStr = `${d.year}-${d.month}`;
    if (!includedKeys.has(keyStr)) {
      result.push({ ...d, member, isVirtual: false });
    }
  });

  return result.sort((a, b) => b.year * 100 + b.month - (a.year * 100 + a.month));
}

/**
 * Computes real-time financial summary across all expected & recorded billing months.
 */
export function computeMemberFinancialSummary(
  member: Member,
  existingDues: MonthlyDue[],
  referenceDate: Date = new Date()
): MemberFinancialSummary {
  const ledger = buildMemberCompleteLedger(member, existingDues, referenceDate);
  const shares = member.shares_count || 1;

  let totalPrincipalBilled = 0;
  let totalPaid = 0;
  let principalOutstanding = 0;
  let totalFineCharged = 0;
  let totalFinePaid = 0;
  let totalFinePending = 0;
  let totalPaidMonths = 0;
  let unpaidMonthsCount = 0;

  ledger.forEach((d) => {
    const bd = calculateDueBreakdown(d, shares, referenceDate);
    totalPrincipalBilled += bd.principalDue;
    totalPaid += bd.principalPaid;
    principalOutstanding += bd.principalOutstanding;
    totalFineCharged += bd.fineDue;
    totalFinePaid += bd.finePaid;
    totalFinePending += bd.fineOutstanding;

    if (d.status === 'paid' && bd.fineOutstanding === 0) {
      totalPaidMonths += 1;
    } else {
      unpaidMonthsCount += 1;
    }
  });

  const totalBilled = totalPrincipalBilled + totalFineCharged;
  const totalOutstanding = principalOutstanding + totalFinePending;

  const { billingMonth: activeMonth, billingYear: activeYear } =
    getBillingPeriodFromPaymentDate(referenceDate);
  const activeCycleDue = ledger.find((d) => d.month === activeMonth && d.year === activeYear);

  let currentStatus: DueStatus = 'paid';
  if (activeCycleDue) {
    const activeBd = calculateDueBreakdown(activeCycleDue, shares, referenceDate);
    if (!activeBd.isFullySettled) {
      currentStatus = activeBd.totalPaid > 0 ? 'partial' : 'unpaid';
    } else if (totalOutstanding > 0) {
      currentStatus = 'partial';
    } else {
      currentStatus = 'paid';
    }
  } else if (totalOutstanding > 0) {
    currentStatus = totalPaid > 0 ? 'partial' : 'unpaid';
  }

  const lastPaymentDate =
    existingDues
      .filter((d) => d.paid_at && Number(d.amount_paid) > 0)
      .sort((a, b) => (b.paid_at || '').localeCompare(a.paid_at || ''))[0]?.paid_at || null;

  return {
    totalBilled,
    totalPaid,
    totalPaidMonths,
    totalOutstanding,
    principalOutstanding,
    totalFineCharged,
    totalFinePaid,
    totalFinePending,
    unpaidMonthsCount,
    currentStatus,
    lastPaymentDate,
    monthlyContribution: member.monthly_contribution || shares * 500,
  };
}
