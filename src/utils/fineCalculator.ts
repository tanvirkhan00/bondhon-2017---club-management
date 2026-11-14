import { MonthlyDue } from '../types';

export const FINE_PER_SHARE = 50;
export const MONTHLY_DEADLINE_DAY = 12;

/**
 * Returns true if the 12th of (month, year) has passed relative to referenceDate.
 */
export function isAfterMonthDeadline(
  month: number,
  year: number,
  referenceDate: Date = new Date()
): boolean {
  const curYear = referenceDate.getFullYear();
  const curMonth = referenceDate.getMonth() + 1;
  const curDay = referenceDate.getDate();

  if (year < curYear) return true;
  if (year === curYear && month < curMonth) return true;
  if (year === curYear && month === curMonth && curDay > MONTHLY_DEADLINE_DAY) return true;
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
 * Constitution Clause 4.1: ৳50 fine per share/name if unpaid after the 12th of the month.
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
