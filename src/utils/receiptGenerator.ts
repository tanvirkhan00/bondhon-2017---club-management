import { jsPDF } from 'jspdf';
import { Member, MonthlyDue } from '../types';
import { calculateDueBreakdown } from './fineCalculator';
import { getMonthName } from './formatters';

export interface PaymentReceiptPayload {
  receiptNumber: string;
  transactionId: string;
  clubName: string;
  clubSubtitle: string;
  memberName: string;
  memberCode: string;
  memberDesignation: string;
  billingPeriod: string;
  principalDue: number;
  principalPaid: number;
  fineDue: number;
  finePaid: number;
  totalPaid: number;
  remainingBalance: number;
  statusLabel: string;
  paymentDateFormatted: string;
  paymentMethod: string;
  recordedByName: string;
  generatedAtFormatted: string;
  notes: string;
}

export function resolveReceiptNumber(due: MonthlyDue, memberCode?: string | null): string {
  if (due.receipt_number && due.receipt_number.trim()) {
    return due.receipt_number.trim();
  }
  const cleanCode = (memberCode || due.member?.member_code || 'BND')
    .replace(/[^A-Z0-9]/gi, '')
    .replace(/^BND/i, '');
  const period = `${due.year}${String(due.month).padStart(2, '0')}`;
  const rawId = (due.id || '0000').replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const tail = rawId.slice(-4).padStart(4, '0');
  return `BND-RCT-${period}-${cleanCode || '000'}-${tail}`;
}

export function resolvePaymentMethod(due: MonthlyDue): string {
  if (due.payment_method && due.payment_method.trim()) {
    return due.payment_method.trim();
  }
  if (due.notes) {
    const firstSegment = due.notes.split(' - ')[0]?.trim();
    if (firstSegment && firstSegment.length <= 24) {
      return firstSegment;
    }
  }
  return 'Cash / Verified';
}

export function buildPaymentReceiptPayload(
  due: MonthlyDue,
  member: Member | undefined | null,
  fallbackAdminName?: string
): PaymentReceiptPayload {
  const shares = member?.shares_count || due.member?.shares_count || 1;
  const bd = calculateDueBreakdown(due, shares);
  const memberCode = member?.member_code || due.member?.member_code || 'BND-000';
  const memberName = member?.full_name || due.member?.full_name || 'Club Member';
  const memberDesignation = member?.designation || due.member?.designation || 'Member';
  const receiptNumber = resolveReceiptNumber(due, memberCode);
  const paymentDateSrc = due.paid_at || due.fine_paid_at || due.updated_at || new Date().toISOString();
  const paymentDateFormatted = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Dhaka',
  }).format(new Date(paymentDateSrc));

  const generatedAtFormatted = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Dhaka',
  }).format(new Date());

  return {
    receiptNumber,
    transactionId: due.id,
    clubName: 'Bondhon 2017',
    clubSubtitle: 'Friends Cooperative Society · SSC Batch 2017',
    memberName,
    memberCode,
    memberDesignation,
    billingPeriod: `${getMonthName(due.month)} ${due.year}`,
    principalDue: bd.principalDue,
    principalPaid: bd.principalPaid,
    fineDue: bd.fineDue,
    finePaid: bd.finePaid,
    totalPaid: bd.totalPaid,
    remainingBalance: bd.totalOutstanding,
    statusLabel: bd.isFullySettled
      ? 'PAID IN FULL'
      : bd.totalPaid > 0
      ? 'PARTIAL PAYMENT'
      : 'UNPAID',
    paymentDateFormatted,
    paymentMethod: resolvePaymentMethod(due),
    recordedByName: due.recorded_by_name?.trim() || fallbackAdminName || 'Authorized Club Treasurer',
    generatedAtFormatted: `${generatedAtFormatted} (BST)`,
    notes: due.notes?.trim() || 'Monthly club contribution receipt',
  };
}

function toAsciiSafe(text: string): string {
  // Helvetica built into jsPDF supports Latin-1; strip unsupported Unicode glyphs cleanly
  const cleaned = text.replace(/[^\x20-\x7E]/g, '').trim();
  return cleaned || 'Verified Club Record';
}

function formatPdfBdt(amount: number): string {
  return `BDT ${Math.round(Number(amount || 0)).toLocaleString('en-US')}`;
}

export function downloadPaymentReceiptPdf(payload: PaymentReceiptPayload): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 18;
  const contentW = pageW - marginX * 2;

  // Header Banner (Navy #0F1B33 + Burnished Brass #D6AC62 accent stripe)
  doc.setFillColor(15, 27, 51);
  doc.rect(0, 0, pageW, 44, 'F');
  doc.setFillColor(214, 172, 98);
  doc.rect(0, 44, pageW, 2.2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('BONDHON 2017', marginX, 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(214, 172, 98);
  doc.text('FRIENDS COOPERATIVE SOCIETY  |  SSC BATCH 2017', marginX, 26);

  doc.setTextColor(203, 213, 225);
  doc.setFontSize(8.5);
  doc.text('Char Chanda Khasmahal Bazar, Shariatpur  |  Official Digital Ledger', marginX, 33);

  // Top-right Receipt Title & Number
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('PAYMENT RECEIPT', pageW - marginX, 18, { align: 'right' });

  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(147, 197, 253);
  doc.text(toAsciiSafe(payload.receiptNumber), pageW - marginX, 26, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(214, 172, 98);
  doc.text(payload.statusLabel, pageW - marginX, 33, { align: 'right' });

  // Meta Info Box
  let y = 58;
  doc.setFillColor(246, 247, 251);
  doc.setDrawColor(223, 230, 240);
  doc.roundedRect(marginX, y, contentW, 42, 3, 3, 'FD');

  const col2X = marginX + contentW / 2 + 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(78, 94, 120);
  doc.text('RECEIVED FROM', marginX + 6, y + 8);
  doc.text('RECEIPT DETAILS', col2X, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(15, 27, 51);
  doc.text(toAsciiSafe(payload.memberName), marginX + 6, y + 16);

  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(29, 78, 216);
  doc.text(`${toAsciiSafe(payload.memberCode)}  |  ${toAsciiSafe(payload.memberDesignation)}`, marginX + 6, y + 23);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(78, 94, 120);
  doc.text(`Billing Purpose: ${toAsciiSafe(payload.billingPeriod)}`, marginX + 6, y + 32);

  // Right column of meta box
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 27, 46);
  doc.text(`Payment Date:   ${payload.paymentDateFormatted}`, col2X, y + 16);
  doc.text(`Payment Method: ${toAsciiSafe(payload.paymentMethod)}`, col2X, y + 23);
  doc.text(`Transaction ID: ${toAsciiSafe(payload.transactionId).slice(0, 24)}`, col2X, y + 30);
  doc.text(`Recorded By:    ${toAsciiSafe(payload.recordedByName)}`, col2X, y + 37);

  // Payment Breakdown Table
  y += 52;
  doc.setFillColor(15, 27, 51);
  doc.rect(marginX, y, contentW, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DESCRIPTION', marginX + 5, y + 6.7);
  doc.text('PERIOD', marginX + 95, y + 6.7);
  doc.text('AMOUNT', pageW - marginX - 5, y + 6.7, { align: 'right' });

  y += 10;
  const rows: Array<{ label: string; period: string; amount: string }> = [
    {
      label: 'Monthly Contribution (Principal)',
      period: payload.billingPeriod,
      amount: formatPdfBdt(payload.principalPaid),
    },
    {
      label: 'Late Payment Fine (12th Rule)',
      period: payload.finePaid > 0 ? payload.billingPeriod : 'Waived / None',
      amount: formatPdfBdt(payload.finePaid),
    },
  ];

  rows.forEach((r, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.setDrawColor(223, 230, 240);
    doc.rect(marginX, y, contentW, 12, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 27, 46);
    doc.text(r.label, marginX + 5, y + 7.7);

    doc.setTextColor(78, 94, 120);
    doc.text(toAsciiSafe(r.period), marginX + 95, y + 7.7);

    doc.setFont('courier', 'bold');
    doc.setTextColor(15, 27, 51);
    doc.text(r.amount, pageW - marginX - 5, y + 7.7, { align: 'right' });
    y += 12;
  });

  // Total Paid Summary Box
  y += 6;
  doc.setFillColor(239, 243, 249);
  doc.setDrawColor(29, 78, 216);
  doc.roundedRect(marginX + contentW * 0.42, y, contentW * 0.58, 22, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(78, 94, 120);
  doc.text('TOTAL AMOUNT PAID', marginX + contentW * 0.42 + 6, y + 8);

  doc.setFont('courier', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(29, 78, 216);
  doc.text(formatPdfBdt(payload.totalPaid), pageW - marginX - 6, y + 10, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(78, 94, 120);
  const remLabel =
    payload.remainingBalance > 0
      ? `Remaining Balance: ${formatPdfBdt(payload.remainingBalance)}`
      : 'Cycle Balance: Settled in Full (BDT 0 due)';
  doc.text(remLabel, pageW - marginX - 6, y + 17.5, { align: 'right' });

  // Notes & Verification Section
  y += 34;
  doc.setDrawColor(223, 230, 240);
  doc.line(marginX, y, pageW - marginX, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 27, 51);
  doc.text('Notes / Reference:', marginX, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(78, 94, 120);
  doc.text(toAsciiSafe(payload.notes), marginX + 34, y);

  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Receipt Generated: ${payload.generatedAtFormatted}`, marginX, y);
  doc.text(`Authorized Admin: ${toAsciiSafe(payload.recordedByName)}`, pageW - marginX, y, {
    align: 'right',
  });

  // Footer
  doc.setDrawColor(214, 172, 98);
  doc.line(marginX, 272, pageW - marginX, 272);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(78, 94, 120);
  doc.text(
    'This is a computer-generated official receipt from Bondhon 2017 Club Management Portal (https://bondon2017.netlify.app).',
    pageW / 2,
    278,
    { align: 'center' }
  );

  const safeFileCode = payload.memberCode.replace(/[^A-Z0-9-]/gi, '');
  const safePeriod = payload.billingPeriod.replace(/\s+/g, '_');
  doc.save(`Bondhon2017_Receipt_${safeFileCode}_${safePeriod}.pdf`);
}
