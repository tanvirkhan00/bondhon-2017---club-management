import { jsPDF } from 'jspdf';
import { MonthSummary } from '../types';
import { formatDate, getMonthName } from './formatters';
import { calculateDueBreakdown } from './fineCalculator';
import { MonthlyDue, Member } from '../types';

export interface PdfReportColumn {
  header: string;
  align?: 'left' | 'right' | 'center';
  weight: number;
  mono?: boolean;
}

export interface PdfReportKpi {
  label: string;
  value: string;
}

export interface DownloadClubTablePdfOptions {
  filename: string;
  title: string;
  subtitle: string;
  kpis?: PdfReportKpi[];
  columns: PdfReportColumn[];
  rows: (string | number)[][];
  totalsRow?: (string | number)[];
  orientation?: 'portrait' | 'landscape';
}

function toAsciiSafe(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '—';
  const str = String(val)
    .replace(/৳/g, 'BDT ')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return str || '-';
}

function formatPdfBdt(amount: number): string {
  return `BDT ${Math.round(Number(amount || 0)).toLocaleString('en-US')}`;
}

function getGeneratedTimestampBst(): string {
  return (
    new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Dhaka',
    }).format(new Date()) + ' (BST)'
  );
}

function fitTextToWidth(doc: jsPDF, text: string, maxWidth: number): string {
  if (maxWidth <= 4) return '';
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let clipped = text;
  while (clipped.length > 2 && doc.getTextWidth(`${clipped}..`) > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return `${clipped.trim()}..`;
}

export function downloadClubTablePdf({
  filename,
  title,
  subtitle,
  kpis = [],
  columns,
  rows,
  totalsRow,
  orientation = 'landscape',
}: DownloadClubTablePdfOptions): void {
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentW = pageW - marginX * 2;
  const generatedAt = getGeneratedTimestampBst();

  const totalWeight = columns.reduce((s, c) => s + c.weight, 0) || 1;
  const colWidths = columns.map((c) => (c.weight / totalWeight) * contentW);

  const drawHeaderBanner = (isFirstPage: boolean) => {
    const bannerH = isFirstPage ? 26 : 18;
    doc.setFillColor(15, 27, 51);
    doc.rect(0, 0, pageW, bannerH, 'F');
    doc.setFillColor(214, 172, 98);
    doc.rect(0, bannerH, pageW, 1.4, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isFirstPage ? 15 : 11.5);
    doc.text('BONDHON 2017  |  OFFICIAL FINANCIAL REPORT', marginX, isFirstPage ? 11.5 : 11);

    if (isFirstPage) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(214, 172, 98);
      doc.text(toAsciiSafe(title), marginX, 17.5);

      doc.setTextColor(203, 213, 225);
      doc.setFontSize(8);
      doc.text(toAsciiSafe(subtitle), marginX, 22.5);
    }

    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(147, 197, 253);
    doc.text(`Generated: ${generatedAt}`, pageW - marginX, isFirstPage ? 12 : 11, {
      align: 'right',
    });

    if (isFirstPage) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225);
      doc.text('bondon2017.netlify.app', pageW - marginX, 18.5, { align: 'right' });
    }
  };

  const drawTableHeader = (startY: number): number => {
    const headerH = 8.5;
    doc.setFillColor(15, 27, 51);
    doc.rect(marginX, startY, contentW, headerH, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    let x = marginX;
    columns.forEach((col, idx) => {
      const w = colWidths[idx];
      const pad = 2.5;
      const text = fitTextToWidth(doc, toAsciiSafe(col.header), w - pad * 2);
      if (col.align === 'right') {
        doc.text(text, x + w - pad, startY + 5.7, { align: 'right' });
      } else if (col.align === 'center') {
        doc.text(text, x + w / 2, startY + 5.7, { align: 'center' });
      } else {
        doc.text(text, x + pad, startY + 5.7);
      }
      x += w;
    });

    return startY + headerH;
  };

  // First Page Header
  drawHeaderBanner(true);
  let y = 32;

  // Optional KPI Strip
  if (kpis.length > 0) {
    const gap = 3;
    const cardW = (contentW - gap * (kpis.length - 1)) / kpis.length;
    const cardH = 14.5;

    kpis.forEach((kpi, idx) => {
      const cx = marginX + idx * (cardW + gap);
      doc.setFillColor(246, 247, 251);
      doc.setDrawColor(223, 230, 240);
      doc.roundedRect(cx, y, cardW, cardH, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(78, 94, 120);
      doc.text(fitTextToWidth(doc, toAsciiSafe(kpi.label).toUpperCase(), cardW - 6), cx + 3, y + 5.2);

      doc.setFont('courier', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 27, 51);
      doc.text(fitTextToWidth(doc, toAsciiSafe(kpi.value), cardW - 6), cx + 3, y + 11.4);
    });

    y += cardH + 5;
  }

  y = drawTableHeader(y);

  const rowH = 7.6;
  const bottomLimit = pageH - 18;

  if (rows.length === 0) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(223, 230, 240);
    doc.rect(marginX, y, contentW, 14, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(78, 94, 120);
    doc.text('No financial records available for this report scope.', pageW / 2, y + 8.8, {
      align: 'center',
    });
    y += 14;
  } else {
    rows.forEach((row, rowIdx) => {
      if (y + rowH > bottomLimit) {
        doc.addPage();
        drawHeaderBanner(false);
        y = drawTableHeader(24);
      }

      doc.setFillColor(rowIdx % 2 === 0 ? 255 : 246, rowIdx % 2 === 0 ? 255 : 248, rowIdx % 2 === 0 ? 255 : 252);
      doc.setDrawColor(223, 230, 240);
      doc.rect(marginX, y, contentW, rowH, 'FD');

      let x = marginX;
      columns.forEach((col, colIdx) => {
        const w = colWidths[colIdx];
        const pad = 2.5;
        const cellVal = toAsciiSafe(row[colIdx]);
        doc.setFont(col.mono ? 'courier' : 'helvetica', col.mono ? 'bold' : 'normal');
        doc.setFontSize(8);
        doc.setTextColor(15, 27, 46);

        const text = fitTextToWidth(doc, cellVal, w - pad * 2);
        if (col.align === 'right') {
          doc.text(text, x + w - pad, y + 5.1, { align: 'right' });
        } else if (col.align === 'center') {
          doc.text(text, x + w / 2, y + 5.1, { align: 'center' });
        } else {
          doc.text(text, x + pad, y + 5.1);
        }
        x += w;
      });

      y += rowH;
    });
  }

  // Optional Totals Row
  if (totalsRow && totalsRow.length > 0) {
    if (y + rowH + 2 > bottomLimit) {
      doc.addPage();
      drawHeaderBanner(false);
      y = drawTableHeader(24);
    }

    const totH = 8.8;
    doc.setFillColor(15, 27, 51);
    doc.rect(marginX, y, contentW, totH, 'F');
    doc.setFillColor(214, 172, 98);
    doc.rect(marginX, y, contentW, 0.8, 'F');

    let x = marginX;
    columns.forEach((col, colIdx) => {
      const w = colWidths[colIdx];
      const pad = 2.5;
      const cellVal = toAsciiSafe(totalsRow[colIdx] ?? '');
      doc.setFont(col.mono ? 'courier' : 'helvetica', 'bold');
      doc.setFontSize(8.2);
      doc.setTextColor(colIdx === columns.length - 1 ? 214 : 255, colIdx === columns.length - 1 ? 172 : 255, colIdx === columns.length - 1 ? 98 : 255);

      const text = fitTextToWidth(doc, cellVal, w - pad * 2);
      if (col.align === 'right') {
        doc.text(text, x + w - pad, y + 5.9, { align: 'right' });
      } else if (col.align === 'center') {
        doc.text(text, x + w / 2, y + 5.9, { align: 'center' });
      } else {
        doc.text(text, x + pad, y + 5.9);
      }
      x += w;
    });
  }

  // Page Footer across all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p += 1) {
    doc.setPage(p);
    doc.setDrawColor(223, 230, 240);
    doc.line(marginX, pageH - 12, pageW - marginX, pageH - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(78, 94, 120);
    doc.text(
      'Bondhon 2017 (SSC Batch 2017 Cooperative Society) · Char Chanda Khasmahal Bazar, Shariatpur',
      marginX,
      pageH - 7.5
    );
    doc.setFont('courier', 'bold');
    doc.text(`Page ${p} of ${totalPages}`, pageW - marginX, pageH - 7.5, { align: 'right' });
  }

  const finalName = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
  doc.save(finalName);
}

export function downloadMonthlyReconciliationPdf(params: {
  year: number;
  monthSummaries: MonthSummary[];
  totalYearTarget: number;
  totalYearCollected: number;
  totalYearOutstanding: number;
  yearCollectionRate: number;
}): void {
  const {
    year,
    monthSummaries,
    totalYearTarget,
    totalYearCollected,
    totalYearOutstanding,
    yearCollectionRate,
  } = params;

  downloadClubTablePdf({
    filename: `Bondhon_2017_Monthly_Report_${year}.pdf`,
    title: `Monthly Reconciliation Report - Fiscal Year ${year}`,
    subtitle: 'Month-by-month targets, verified collections, pending balances & collection efficiency',
    orientation: 'landscape',
    kpis: [
      { label: `${year} Annual Target`, value: formatPdfBdt(totalYearTarget) },
      { label: 'Annual Collection', value: formatPdfBdt(totalYearCollected) },
      { label: 'Outstanding Balance', value: formatPdfBdt(totalYearOutstanding) },
      { label: 'Collection Rate', value: `${yearCollectionRate}%` },
    ],
    columns: [
      { header: 'Month', weight: 1.5, align: 'left' },
      { header: 'Target (BDT)', weight: 1.3, align: 'right', mono: true },
      { header: 'Collected (BDT)', weight: 1.4, align: 'right', mono: true },
      { header: 'Outstanding (BDT)', weight: 1.4, align: 'right', mono: true },
      { header: 'Paid Members', weight: 1.0, align: 'center', mono: true },
      { header: 'Unpaid Members', weight: 1.0, align: 'center', mono: true },
      { header: 'Active Roster', weight: 1.0, align: 'center', mono: true },
      { header: 'Efficiency', weight: 0.9, align: 'right', mono: true },
    ],
    rows: monthSummaries.map((m) => [
      m.label,
      formatPdfBdt(m.target),
      formatPdfBdt(m.collected),
      m.outstanding > 0 ? formatPdfBdt(m.outstanding) : '-',
      m.paidCount,
      m.unpaidCount,
      m.totalActive,
      m.target > 0 ? `${m.collectionRate}%` : '-',
    ]),
    totalsRow: [
      `TOTAL ${year}`,
      formatPdfBdt(totalYearTarget),
      formatPdfBdt(totalYearCollected),
      formatPdfBdt(totalYearOutstanding),
      '-',
      '-',
      '-',
      `${yearCollectionRate}%`,
    ],
  });
}

export function downloadMemberRankingsPdf(params: {
  rankings: Array<{
    member: Member;
    billed: number;
    paid: number;
    outstanding: number;
    paidMonths: number;
    unpaidMonths: number;
    settlementRate: number;
  }>;
}): void {
  const { rankings } = params;
  const totalBilled = rankings.reduce((s, r) => s + r.billed, 0);
  const totalPaid = rankings.reduce((s, r) => s + r.paid, 0);
  const totalOutstanding = rankings.reduce((s, r) => s + r.outstanding, 0);
  const avgRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

  downloadClubTablePdf({
    filename: `Bondhon_2017_Member_Rankings_${new Date().toISOString().substring(0, 10)}.pdf`,
    title: 'Member-Wise Contribution Rankings Report',
    subtitle: 'Complete member ledger rankings across billed cycles, verified collections & outstanding dues',
    orientation: 'landscape',
    kpis: [
      { label: 'Ranked Members', value: String(rankings.length) },
      { label: 'Total Billed', value: formatPdfBdt(totalBilled) },
      { label: 'Total Paid', value: formatPdfBdt(totalPaid) },
      { label: 'Total Outstanding', value: formatPdfBdt(totalOutstanding) },
    ],
    columns: [
      { header: 'Rank', weight: 0.6, align: 'center', mono: true },
      { header: 'Code', weight: 0.9, align: 'left', mono: true },
      { header: 'Member Name', weight: 2.0, align: 'left' },
      { header: 'Designation', weight: 1.4, align: 'left' },
      { header: 'Billed (BDT)', weight: 1.2, align: 'right', mono: true },
      { header: 'Paid (BDT)', weight: 1.2, align: 'right', mono: true },
      { header: 'Outstanding (BDT)', weight: 1.3, align: 'right', mono: true },
      { header: 'Paid Mos', weight: 0.8, align: 'center', mono: true },
      { header: 'Unpaid Mos', weight: 0.8, align: 'center', mono: true },
      { header: 'Rate', weight: 0.7, align: 'right', mono: true },
    ],
    rows: rankings.map((r, idx) => [
      `#${idx + 1}`,
      r.member.member_code,
      r.member.full_name,
      r.member.designation || 'Member',
      formatPdfBdt(r.billed),
      formatPdfBdt(r.paid),
      r.outstanding > 0 ? formatPdfBdt(r.outstanding) : '-',
      r.paidMonths,
      r.unpaidMonths,
      `${r.settlementRate}%`,
    ]),
    totalsRow: [
      'TOTAL',
      `${rankings.length}`,
      'All Club Members',
      '-',
      formatPdfBdt(totalBilled),
      formatPdfBdt(totalPaid),
      formatPdfBdt(totalOutstanding),
      '-',
      '-',
      `${avgRate}%`,
    ],
  });
}

export function downloadCustomRangeTransactionsPdf(params: {
  startDate: string;
  endDate: string;
  transactions: MonthlyDue[];
  totals: { principal: number; fine: number; total: number };
}): void {
  const { startDate, endDate, transactions, totals } = params;

  downloadClubTablePdf({
    filename: `Bondhon_2017_Transactions_${startDate || 'start'}_to_${endDate || 'end'}.pdf`,
    title: 'Custom Date Range Transactions Report',
    subtitle: `Settled contributions & late fines between ${startDate || 'beginning'} and ${endDate || 'today'}`,
    orientation: 'landscape',
    kpis: [
      { label: 'Settled Entries', value: String(transactions.length) },
      { label: 'Principal Collected', value: formatPdfBdt(totals.principal) },
      { label: 'Late Fines Collected', value: formatPdfBdt(totals.fine) },
      { label: 'Total Collected', value: formatPdfBdt(totals.total) },
    ],
    columns: [
      { header: 'Paid Date', weight: 1.1, align: 'left', mono: true },
      { header: 'Receipt No', weight: 1.6, align: 'left', mono: true },
      { header: 'Code', weight: 0.9, align: 'left', mono: true },
      { header: 'Member Name', weight: 1.8, align: 'left' },
      { header: 'Billing Cycle', weight: 1.2, align: 'left' },
      { header: 'Principal (BDT)', weight: 1.2, align: 'right', mono: true },
      { header: 'Fine (BDT)', weight: 1.0, align: 'right', mono: true },
      { header: 'Total Paid (BDT)', weight: 1.3, align: 'right', mono: true },
      { header: 'Method', weight: 1.0, align: 'left' },
    ],
    rows: transactions.map((d) => {
      const bd = calculateDueBreakdown(d, d.member?.shares_count);
      return [
        d.paid_at ? formatDate(d.paid_at) : '-',
        d.receipt_number || d.id.slice(0, 14),
        d.member?.member_code || '-',
        d.member?.full_name || 'Member',
        `${getMonthName(d.month)} ${d.year}`,
        formatPdfBdt(bd.principalPaid),
        bd.finePaid > 0 ? formatPdfBdt(bd.finePaid) : '-',
        formatPdfBdt(bd.totalPaid),
        d.payment_method || 'Ledger',
      ];
    }),
    totalsRow: [
      'TOTAL',
      `${transactions.length} txns`,
      '-',
      'Filtered Period Summary',
      '-',
      formatPdfBdt(totals.principal),
      formatPdfBdt(totals.fine),
      formatPdfBdt(totals.total),
      '-',
    ],
  });
}
