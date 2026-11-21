import React, { useMemo, useState } from 'react';
import { Member, MonthlyDue } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useClubData } from '../hooks/useClubData';
import { formatBDT } from '../utils/formatters';
import {
  buildPaymentReceiptPayload,
  downloadPaymentReceiptPdf,
} from '../utils/receiptGenerator';
import { Modal } from './ui/Modal';
import crestImage from '../assets/images/bondhon_club_crest_1793703027252.jpg';
import {
  Receipt,
  Download,
  Printer,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

interface PaymentReceiptModalProps {
  due: MonthlyDue | null;
  member?: Member | null;
  onClose: () => void;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  due,
  member,
  onClose,
}) => {
  const { isAdmin, profile } = useAuth();
  const { members, myMemberRecord } = useClubData();
  const [downloading, setDownloading] = useState(false);

  const resolvedMember = useMemo(() => {
    if (!due) return null;
    return (
      member ||
      due.member ||
      members.find((m) => m.id === due.member_id) ||
      (myMemberRecord && myMemberRecord.id === due.member_id ? myMemberRecord : null)
    );
  }, [due, member, members, myMemberRecord]);

  // Strict ownership check
  const isAuthorized = useMemo(() => {
    if (!due) return false;
    if (isAdmin) return true;
    return Boolean(myMemberRecord && due.member_id === myMemberRecord.id);
  }, [due, isAdmin, myMemberRecord]);

  const hasSettledAmount = useMemo(() => {
    if (!due) return false;
    const total = Number(due.amount_paid || 0) + Number(due.fine_paid || 0);
    return total > 0 && !(due as { isVirtual?: boolean }).isVirtual;
  }, [due]);

  const payload = useMemo(() => {
    if (!due || !isAuthorized || !hasSettledAmount) return null;
    return buildPaymentReceiptPayload(
      due,
      resolvedMember,
      profile?.full_name || 'Authorized Club Treasurer'
    );
  }, [due, isAuthorized, hasSettledAmount, resolvedMember, profile?.full_name]);

  const handleDownloadPdf = () => {
    if (!payload) return;
    setDownloading(true);
    try {
      downloadPaymentReceiptPdf(payload);
    } finally {
      setTimeout(() => setDownloading(false), 300);
    }
  };

  const handlePrint = () => {
    if (!payload) return;
    document.body.classList.add('printing-receipt');
    const cleanup = () => {
      document.body.classList.remove('printing-receipt');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    setTimeout(cleanup, 1200);
  };

  return (
    <Modal
      isOpen={Boolean(due)}
      onClose={onClose}
      title="Official Payment Receipt"
      subtitle={payload ? `Receipt #${payload.receiptNumber}` : 'Receipt Verification'}
      icon={<Receipt className="w-4 h-4" />}
      maxWidthClass="max-w-2xl"
    >
      {!payload ? (
        <div className="p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-sm font-semibold text-[#0F1B2E] dark:text-[#F3F6FC]">
            {!isAuthorized
              ? 'Unauthorized: You can only view or download receipts for your own payments.'
              : 'Receipt unavailable for unpaid billing cycles.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Action Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#DFE6F0] dark:border-[#233452]">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0369A1] dark:text-[#38BDF8]">
              <CheckCircle2 className="w-4 h-4" />
              <span>Verified Club Ledger Receipt</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0F1B2E] dark:text-slate-200 bg-[#EFF3F9] dark:bg-[#17243C] hover:bg-slate-200/80 dark:hover:bg-[#18294A] border border-[#DFE6F0] dark:border-[#233452] rounded-xl cursor-pointer transition-colors whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-xl shadow-xs cursor-pointer transition-colors disabled:opacity-60 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloading ? 'Generating PDF...' : 'Download PDF'}</span>
              </button>
            </div>
          </div>

          {/* Printable Receipt Sheet */}
          <div
            id="bondhon-printable-receipt"
            className="bg-white text-[#0F1B2E] rounded-2xl border border-[#DFE6F0] overflow-hidden shadow-sm"
          >
            {/* Header */}
            <div className="bg-[#0F1B33] text-white px-6 py-5 border-b-4 border-[#D6AC62] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <img
                  src={crestImage}
                  alt="Bondhon 2017 Crest"
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-[#D6AC62]"
                />
                <div>
                  <h3 className="text-lg font-extrabold tracking-tight text-white">
                    Bondhon 2017
                  </h3>
                  <p className="text-[11px] font-semibold text-[#D6AC62]">
                    বন্ধুত্ব সমবায় সমিতি · SSC Batch 2017
                  </p>
                  <p className="text-[10px] text-slate-300">
                    Char Chanda Khasmahal Bazar, Shariatpur
                  </p>
                </div>
              </div>

              <div className="sm:text-right">
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#D6AC62] block">
                  Official Receipt
                </span>
                <span className="text-sm font-mono font-bold text-white block mt-0.5 tabular-nums">
                  {payload.receiptNumber}
                </span>
                <span className="inline-block mt-1 px-2 py-0.5 rounded bg-[#1D4ED8] text-white text-[10px] font-bold tracking-wide">
                  {payload.statusLabel}
                </span>
              </div>
            </div>

            {/* Member & Transaction Metadata */}
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#F6F7FB] border border-[#DFE6F0] text-xs">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#4E5E78] block">
                    Received From
                  </span>
                  <div className="text-base font-extrabold text-[#0F1B33]">
                    {payload.memberName}
                  </div>
                  <div className="font-mono font-bold text-[#1D4ED8] text-xs">
                    {payload.memberCode} · {payload.memberDesignation}
                  </div>
                  <div className="text-[11px] text-[#4E5E78] pt-1">
                    Billing Purpose:{' '}
                    <strong className="text-[#0F1B2E]">{payload.billingPeriod}</strong>
                  </div>
                </div>

                <div className="space-y-1.5 sm:text-right font-mono text-[11px] text-[#4E5E78]">
                  <div>
                    Payment Date:{' '}
                    <strong className="text-[#0F1B2E]">{payload.paymentDateFormatted}</strong>
                  </div>
                  <div>
                    Method:{' '}
                    <strong className="text-[#0F1B2E] font-sans">{payload.paymentMethod}</strong>
                  </div>
                  <div>
                    Txn ID:{' '}
                    <strong className="text-[#0F1B2E]">{payload.transactionId.slice(0, 18)}</strong>
                  </div>
                  <div>
                    Recorded By:{' '}
                    <strong className="text-[#0F1B2E] font-sans">{payload.recordedByName}</strong>
                  </div>
                </div>
              </div>

              {/* Amount Breakdown Table */}
              <div className="rounded-xl border border-[#DFE6F0] overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0F1B33] text-white">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Contribution Line Item</th>
                      <th className="py-2.5 px-4 font-semibold">Period</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DFE6F0]">
                    <tr>
                      <td className="py-3 px-4 font-medium text-[#0F1B2E]">
                        Monthly Contribution (Principal)
                      </td>
                      <td className="py-3 px-4 text-[#4E5E78]">{payload.billingPeriod}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-[#0F1B33]">
                        {formatBDT(payload.principalPaid)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-medium text-[#0F1B2E]">
                        Late Payment Fine (12th Rule)
                      </td>
                      <td className="py-3 px-4 text-[#4E5E78]">
                        {payload.finePaid > 0 ? payload.billingPeriod : 'None / Waived'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-[#92600A]">
                        {formatBDT(payload.finePaid)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-[#EFF3F9] border-t-2 border-[#1D4ED8]/30">
                    <tr>
                      <td colSpan={2} className="py-3 px-4 font-extrabold text-[#0F1B33]">
                        TOTAL PAID
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-base font-extrabold tabular-nums text-[#1D4ED8]">
                        {formatBDT(payload.totalPaid)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {payload.remainingBalance > 0 && (
                <div className="px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between font-mono tabular-nums">
                  <span className="font-sans font-semibold">Remaining Balance for {payload.billingPeriod}:</span>
                  <span className="font-bold">{formatBDT(payload.remainingBalance)}</span>
                </div>
              )}

              {/* Footer Verification */}
              <div className="pt-3 border-t border-[#DFE6F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#4E5E78]">
                <span className="inline-flex items-center gap-1.5 text-[#0369A1] font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Notes: {payload.notes}</span>
                </span>
                <span className="font-mono tabular-nums">
                  Generated: {payload.generatedAtFormatted}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
