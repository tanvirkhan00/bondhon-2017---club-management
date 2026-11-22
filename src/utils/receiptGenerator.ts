import { Member, MonthlyDue } from '../types';
import { calculateDueBreakdown } from './fineCalculator';
import { formatBDT, getMonthName } from './formatters';
import crestImageDefault from '../assets/images/bondhon_club_crest_1793703027252.jpg';

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

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function truncateTextToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let clipped = text;
  while (clipped.length > 3 && ctx.measureText(`${clipped}...`).width > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return `${clipped.trim()}...`;
}

function loadImageSafe(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function triggerPngDownload(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 1500);
            resolve();
            return;
          }
          const fallbackUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = fallbackUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          resolve();
        },
        'image/png',
        1.0
      );
      return;
    }

    const fallbackUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = fallbackUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    resolve();
  });
}

/**
 * Generates and downloads an official high-DPI PNG image receipt
 * using HTML5 Canvas 2D (supports both English & Bangla scripts + Crest logo).
 */
export async function downloadPaymentReceiptImage(
  payload: PaymentReceiptPayload,
  crestSrc: string = crestImageDefault
): Promise<void> {
  const width = 1240;
  const hasBalance = payload.remainingBalance > 0;
  const height = hasBalance ? 1480 : 1400;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const crestImg = await loadImageSafe(crestSrc);

  // 1. Crisp Sheet Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Subtle Outer Border Frame
  ctx.strokeStyle = '#DFE6F0';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, width - 3, height - 3);

  // 2. Sovereign Navy Header Banner (#0F1B33) + Burnished Brass Bottom Accent (#D6AC62)
  const headerH = 240;
  ctx.fillStyle = '#0F1B33';
  ctx.fillRect(0, 0, width, headerH);

  ctx.fillStyle = '#D6AC62';
  ctx.fillRect(0, headerH, width, 8);

  // Crest Emblem (Left)
  const crestCx = 122;
  const crestCy = 120;
  const crestRadius = 60;

  ctx.save();
  ctx.beginPath();
  ctx.arc(crestCx, crestCy, crestRadius + 4, 0, Math.PI * 2);
  ctx.fillStyle = '#D6AC62';
  ctx.fill();
  ctx.closePath();

  ctx.beginPath();
  ctx.arc(crestCx, crestCy, crestRadius, 0, Math.PI * 2);
  ctx.clip();
  if (crestImg) {
    ctx.drawImage(
      crestImg,
      crestCx - crestRadius,
      crestCy - crestRadius,
      crestRadius * 2,
      crestRadius * 2
    );
  } else {
    ctx.fillStyle = '#1D4ED8';
    ctx.fillRect(crestCx - crestRadius, crestCy - crestRadius, crestRadius * 2, crestRadius * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 34px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('B17', crestCx, crestCy);
  }
  ctx.restore();

  // Brand Title & Subtitle
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 44px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
  ctx.fillText('Bondhon 2017', 210, 102);

  ctx.fillStyle = '#D6AC62';
  ctx.font = '600 22px "Plus Jakarta Sans", "Noto Sans Bengali", system-ui, sans-serif';
  ctx.fillText('বন্ধুত্ব সমবায় সমিতি · SSC Batch 2017', 210, 140);

  ctx.fillStyle = '#CBD5E1';
  ctx.font = '500 18px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('Char Chanda Khasmahal Bazar, Shariatpur · Official Digital Ledger', 210, 174);

  // Top-Right Official Receipt Info
  const rightX = width - 64;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#D6AC62';
  ctx.font = '700 18px "JetBrains Mono", monospace';
  ctx.fillText('OFFICIAL PAYMENT RECEIPT', rightX, 78);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 26px "JetBrains Mono", monospace';
  ctx.fillText(payload.receiptNumber, rightX, 118);

  // Status Pill Badge inside Header
  const statusText = payload.statusLabel;
  ctx.font = '700 16px "Plus Jakarta Sans", system-ui, sans-serif';
  const badgeW = ctx.measureText(statusText).width + 36;
  const badgeX = rightX - badgeW;
  const badgeY = 142;
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, 38, 8);
  ctx.fillStyle = payload.remainingBalance > 0 ? '#D97706' : '#1D4ED8';
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.fillText(statusText, badgeX + badgeW / 2, badgeY + 25);

  // 3. Member & Transaction Metadata Card
  const padX = 64;
  const contentW = width - padX * 2;
  let cursorY = 300;

  drawRoundedRect(ctx, padX, cursorY, contentW, 240, 18);
  ctx.fillStyle = '#F6F7FB';
  ctx.fill();
  ctx.strokeStyle = '#DFE6F0';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Left Column: Member Info
  ctx.textAlign = 'left';
  ctx.fillStyle = '#4E5E78';
  ctx.font = '700 16px "JetBrains Mono", monospace';
  ctx.fillText('RECEIVED FROM', padX + 32, cursorY + 44);

  ctx.fillStyle = '#0F1B33';
  ctx.font = '800 32px "Plus Jakarta Sans", "Noto Sans Bengali", system-ui, sans-serif';
  ctx.fillText(
    truncateTextToWidth(ctx, payload.memberName, contentW * 0.52),
    padX + 32,
    cursorY + 90
  );

  ctx.fillStyle = '#1D4ED8';
  ctx.font = '700 20px "JetBrains Mono", "Noto Sans Bengali", monospace';
  ctx.fillText(
    truncateTextToWidth(ctx, `${payload.memberCode} · ${payload.memberDesignation}`, contentW * 0.52),
    padX + 32,
    cursorY + 128
  );

  ctx.fillStyle = '#4E5E78';
  ctx.font = '600 20px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('Billing Purpose:', padX + 32, cursorY + 194);
  ctx.fillStyle = '#0F1B2E';
  ctx.font = '800 22px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(payload.billingPeriod, padX + 196, cursorY + 194);

  // Right Column: Receipt Details
  const metaRightX = width - padX - 32;
  ctx.textAlign = 'right';
  const metaLines: Array<[string, string]> = [
    ['Payment Date', payload.paymentDateFormatted],
    ['Payment Method', payload.paymentMethod],
    ['Txn ID', payload.transactionId.slice(0, 18)],
    ['Recorded By', payload.recordedByName],
  ];

  metaLines.forEach(([label, val], idx) => {
    const lineY = cursorY + 58 + idx * 42;
    ctx.fillStyle = '#4E5E78';
    ctx.font = '600 18px "Plus Jakarta Sans", system-ui, sans-serif';
    const valStr = truncateTextToWidth(ctx, val, 300);
    ctx.fillStyle = '#0F1B2E';
    ctx.font = '700 19px "JetBrains Mono", system-ui, sans-serif';
    ctx.fillText(valStr, metaRightX, lineY);

    const valWidth = ctx.measureText(valStr).width;
    ctx.fillStyle = '#4E5E78';
    ctx.font = '500 18px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(`${label}: `, metaRightX - valWidth - 10, lineY);
  });

  // 4. Amount Breakdown Table
  cursorY += 286;

  // Table Container
  const rowH = 82;
  const tableHeaderH = 62;
  const tableFooterH = 86;
  const totalTableH = tableHeaderH + rowH * 2 + tableFooterH;

  ctx.save();
  drawRoundedRect(ctx, padX, cursorY, contentW, totalTableH, 16);
  ctx.clip();

  // Table Header
  ctx.fillStyle = '#0F1B33';
  ctx.fillRect(padX, cursorY, contentW, tableHeaderH);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 18px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('CONTRIBUTION LINE ITEM', padX + 32, cursorY + 38);
  ctx.fillText('PERIOD', padX + 560, cursorY + 38);
  ctx.textAlign = 'right';
  ctx.fillText('AMOUNT PAID', width - padX - 32, cursorY + 38);

  // Row 1: Monthly Contribution (Principal)
  const r1Y = cursorY + tableHeaderH;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(padX, r1Y, contentW, rowH);
  ctx.fillStyle = '#0F1B2E';
  ctx.font = '600 21px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Monthly Contribution (Principal)', padX + 32, r1Y + 49);

  ctx.fillStyle = '#4E5E78';
  ctx.font = '500 20px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(payload.billingPeriod, padX + 560, r1Y + 49);

  ctx.fillStyle = '#0F1B33';
  ctx.font = '700 24px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(formatBDT(payload.principalPaid), width - padX - 32, r1Y + 49);

  // Divider
  ctx.fillStyle = '#DFE6F0';
  ctx.fillRect(padX, r1Y + rowH - 1.5, contentW, 1.5);

  // Row 2: Late Payment Fine
  const r2Y = r1Y + rowH;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(padX, r2Y, contentW, rowH);
  ctx.fillStyle = '#0F1B2E';
  ctx.font = '600 21px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Late Payment Fine (12th Rule)', padX + 32, r2Y + 49);

  ctx.fillStyle = '#4E5E78';
  ctx.font = '500 20px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(payload.finePaid > 0 ? payload.billingPeriod : 'None / Waived', padX + 560, r2Y + 49);

  ctx.fillStyle = '#92600A';
  ctx.font = '700 24px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(formatBDT(payload.finePaid), width - padX - 32, r2Y + 49);

  // Footer Row: TOTAL PAID
  const ftY = r2Y + rowH;
  ctx.fillStyle = '#EFF3F9';
  ctx.fillRect(padX, ftY, contentW, tableFooterH);
  ctx.fillStyle = '#1D4ED8';
  ctx.fillRect(padX, ftY, contentW, 3);

  ctx.fillStyle = '#0F1B33';
  ctx.font = '800 24px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('TOTAL PAID', padX + 32, ftY + 53);

  ctx.fillStyle = '#1D4ED8';
  ctx.font = '800 34px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(formatBDT(payload.totalPaid), width - padX - 32, ftY + 55);
  ctx.restore();

  // Outer Border for Table
  drawRoundedRect(ctx, padX, cursorY, contentW, totalTableH, 16);
  ctx.strokeStyle = '#DFE6F0';
  ctx.lineWidth = 2;
  ctx.stroke();

  cursorY += totalTableH + 34;

  // 5. Remaining Balance Callout (if partial)
  if (hasBalance) {
    drawRoundedRect(ctx, padX, cursorY, contentW, 64, 14);
    ctx.fillStyle = '#FFF1F2';
    ctx.fill();
    ctx.strokeStyle = '#FECDD3';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#9F1239';
    ctx.font = '700 20px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Remaining Balance for ${payload.billingPeriod}:`, padX + 26, cursorY + 40);

    ctx.font = '800 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(formatBDT(payload.remainingBalance), width - padX - 26, cursorY + 40);

    cursorY += 92;
  }

  // 6. Verified Notes & Timestamp Row
  ctx.strokeStyle = '#DFE6F0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padX, cursorY + 12);
  ctx.lineTo(width - padX, cursorY + 12);
  ctx.stroke();

  cursorY += 56;
  ctx.fillStyle = '#0369A1';
  ctx.font = '700 19px "Plus Jakarta Sans", "Noto Sans Bengali", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(
    truncateTextToWidth(ctx, `Notes: ${payload.notes}`, contentW * 0.58),
    padX,
    cursorY
  );

  ctx.fillStyle = '#4E5E78';
  ctx.font = '600 18px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`Generated: ${payload.generatedAtFormatted}`, width - padX, cursorY);

  // 7. Bottom Verification Strip
  const footerStripY = height - 110;
  ctx.fillStyle = '#0F1B33';
  ctx.fillRect(0, footerStripY, width, 110);
  ctx.fillStyle = '#D6AC62';
  ctx.fillRect(0, footerStripY, width, 4);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#F8FAFC';
  ctx.font = '600 18px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(
    'Verified Official Admin Receipt · Bondhon 2017 Club Management Portal',
    width / 2,
    footerStripY + 46
  );

  ctx.fillStyle = '#93C5FD';
  ctx.font = '600 16px "JetBrains Mono", monospace';
  ctx.fillText('https://bondon2017.netlify.app', width / 2, footerStripY + 78);

  const safeFileCode = payload.memberCode.replace(/[^A-Z0-9-]/gi, '');
  const safePeriod = payload.billingPeriod.replace(/\s+/g, '_');
  await triggerPngDownload(canvas, `Bondhon2017_Receipt_${safeFileCode}_${safePeriod}.png`);
}
