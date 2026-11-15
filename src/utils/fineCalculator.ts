import { MonthlyDue } from '../types';

export const FINE_PER_SHARE = 50;
export const MONTHLY_DEADLINE_DAY = 12;

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
