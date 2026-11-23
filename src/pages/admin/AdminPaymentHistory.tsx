import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useClubData } from '../../hooks/useClubData';
import { FISCAL_YEARS, formatBDT, formatDate, getMonthName, MONTH_NAMES } from '../../utils/formatters';
import { calculateDueBreakdown } from '../../utils/fineCalculator';
import { StatusBadge } from '../../components/StatusBadge';
import { MetricCard } from '../../components/MetricCard';
import { PageTransition } from '../../components/ui/MotionPrimitives';
import { downloadClubTablePdf } from '../../utils/reportPdfGenerator';
import { buildPaymentReceiptPayload, downloadPaymentReceiptImage } from '../../utils/receiptGenerator';
import { useAuth } from '../../hooks/useAuth';
import crestImage from '../../assets/images/bondhon_club_crest_1793703027252.jpg';
import { MonthlyDue } from '../../types';
import {
  History,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Edit2,
  Trash2,
  Target,
  Banknote,
  AlertTriangle,
  AlertCircle,
  Receipt,
  ImageDown,
} from 'lucide-react';
import { RecordPaymentModal } from '../../components/RecordPaymentModal';
import { EditPaymentModal } from '../../components/EditPaymentModal';
import { PaymentReceiptModal } from '../../components/PaymentReceiptModal';

export const AdminPaymentHistory: React.FC = () => {
  const { monthlyDues, members, selectedMonth, selectedYear, clubMonthlyTarget, deleteDueRecord, myMemberRecord } = useClubData();
  const { profile, canEditAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('all');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [editDue, setEditDue] = useState<MonthlyDue | null>(null);
  const [receiptDue, setReceiptDue] = useState<MonthlyDue | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const pageSize = 15;

  // Extract unique years
  const years = useMemo(() => {
    const set = new Set<number>(FISCAL_YEARS);
    monthlyDues.forEach((d) => {
      const yr = Number(d.year);
      if (yr && !isNaN(yr) && yr > 2000) {
        set.add(yr);
      }
    });
    set.add(new Date().getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [monthlyDues]);

  // Filtered & Sorted Records
  const filteredRecords = useMemo(() => {
    return monthlyDues
      .filter((due) => {
        const name = due.member?.full_name || '';
        const code = due.member?.member_code || '';
        const phone = due.member?.phone || '';

        const matchSearch =
          name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          phone.includes(searchQuery);

        const matchYear = selectedYearFilter === 'all' || due.year === Number(selectedYearFilter);
        const matchMonth = selectedMonthFilter === 'all' || due.month === Number(selectedMonthFilter);
        const matchStatus = selectedStatusFilter === 'all' || due.status === selectedStatusFilter;
        const matchMember = selectedMemberFilter === 'all' || due.member_id === selectedMemberFilter;

        return matchSearch && matchYear && matchMonth && matchStatus && matchMember;
      })
      .sort((a, b) => {
        if (a.paid_at && b.paid_at) {
          return b.paid_at.localeCompare(a.paid_at);
        }
        return b.year * 100 + b.month - (a.year * 100 + a.month);
      });
  }, [
    monthlyDues,
    searchQuery,
    selectedYearFilter,
    selectedMonthFilter,
    selectedStatusFilter,
    selectedMemberFilter,
  ]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage]);

  const ledgerSummary = filteredRecords.reduce(
    (acc, d) => {
      const bd = calculateDueBreakdown(d, d.member?.shares_count);
      return {
        due: acc.due + bd.totalDue,
        paid: acc.paid + bd.totalPaid,
        finePaid: acc.finePaid + bd.finePaid,
        outstanding: acc.outstanding + bd.totalOutstanding,
      };
    },
    { due: 0, paid: 0, finePaid: 0, outstanding: 0 }
  );

  const handleExportPdf = () => {
    downloadClubTablePdf({
      filename: `Bondhon_2017_Payment_Ledger_${new Date().toISOString().substring(0, 10)}.pdf`,
      title: 'Payment Ledger & History Report',
      subtitle: `Filtered payment records (${filteredRecords.length} entries)`,
      orientation: 'landscape',
      kpis: [
        { label: 'Records Count', value: String(filteredRecords.length) },
        { label: 'Total Collected', value: `BDT ${Math.round(ledgerSummary.paid).toLocaleString('en-US')}` },
        { label: 'Fines Collected', value: `BDT ${Math.round(ledgerSummary.finePaid).toLocaleString('en-US')}` },
        { label: 'Outstanding', value: `BDT ${Math.round(ledgerSummary.outstanding).toLocaleString('en-US')}` },
      ],
      columns: [
        { header: 'Billing Cycle', weight: 1.2, align: 'left' },
        { header: 'Code', weight: 0.9, align: 'left', mono: true },
        { header: 'Member Name', weight: 1.8, align: 'left' },
        { header: 'Due (BDT)', weight: 1.0, align: 'right', mono: true },
        { header: 'Paid (BDT)', weight: 1.1, align: 'right', mono: true },
        { header: 'Fine Paid', weight: 0.9, align: 'right', mono: true },
        { header: 'Outstanding', weight: 1.1, align: 'right', mono: true },
        { header: 'Status', weight: 0.8, align: 'center' },
        { header: 'Paid Date', weight: 1.0, align: 'left', mono: true },
      ],
      rows: filteredRecords.map((d) => {
        const bd = calculateDueBreakdown(d, d.member?.shares_count);
        return [
          `${getMonthName(d.month)} ${d.year}`,
          d.member?.member_code || '-',
          d.member?.full_name || 'Member',
          `BDT ${Math.round(bd.principalDue).toLocaleString('en-US')}`,
          `BDT ${Math.round(bd.totalPaid).toLocaleString('en-US')}`,
          bd.finePaid > 0 ? `BDT ${Math.round(bd.finePaid).toLocaleString('en-US')}` : '-',
          bd.totalOutstanding > 0 ? `BDT ${Math.round(bd.totalOutstanding).toLocaleString('en-US')}` : '-',
          d.status.toUpperCase(),
          d.paid_at ? formatDate(d.paid_at) : 'Unpaid',
        ];
      }),
    });
  };

  const isSingleMonthScope =
    selectedMonthFilter !== 'all' &&
    selectedMemberFilter === 'all' &&
    selectedStatusFilter === 'all' &&
    !searchQuery.trim();

  const effectiveTarget = isSingleMonthScope
    ? Math.max(clubMonthlyTarget, ledgerSummary.due)
    : ledgerSummary.due;

  const effectiveOutstanding = isSingleMonthScope
    ? Math.max(0, effectiveTarget - ledgerSummary.paid)
    : ledgerSummary.outstanding;

  return (
    <PageTransition className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DFE6F0] dark:border-[#233452]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F1B2E] dark:text-slate-100 flex items-center gap-2.5">
            <History className="w-6 h-6 text-[#1D4ED8] dark:text-[#60A5FA]" />
            <span>Payment Ledger &amp; History</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#4E5E78] dark:text-slate-400 mt-0.5">
            Complete contribution history and audit trail · Monthly Target: {formatBDT(clubMonthlyTarget)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
          {canEditAdmin && (
            <button
              onClick={() => setRecordModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-xl shadow-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </button>
          )}

          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0F1B2E] dark:text-slate-200 bg-white dark:bg-[#111B2E] border border-[#DFE6F0] dark:border-[#233452] hover:bg-[#EFF3F9] dark:hover:bg-[#17243C] rounded-xl transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label={isSingleMonthScope ? 'Monthly Target' : 'Filtered Target (incl. Fine)'}
          value={formatBDT(effectiveTarget)}
          subLabel={`${filteredRecords.length} entries · Target ${formatBDT(clubMonthlyTarget)}/mo`}
          icon={Target}
          accent="navy"
        />
        <MetricCard
          label="Total Collected"
          value={formatBDT(ledgerSummary.paid)}
          subLabel={`${effectiveTarget > 0 ? Math.round((ledgerSummary.paid / effectiveTarget) * 100) : 0}% of ${formatBDT(effectiveTarget)}`}
          icon={Banknote}
          accent="sapphire"
        />
        <MetricCard
          label="Fines Collected"
          value={formatBDT(ledgerSummary.finePaid)}
          subLabel="Late fees settled"
          icon={AlertTriangle}
          accent="gold"
        />
        <MetricCard
          label="Outstanding Balance"
          value={formatBDT(effectiveOutstanding)}
          subLabel="Pending settlement"
          icon={AlertCircle}
          accent="rose"
        />
      </div>

      {/* Advanced Filter Toolbar */}
      <div className="surface-card p-4 rounded-2xl space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#4E5E78] absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search member name, code or phone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-3 py-2 text-xs bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <select
              value={selectedYearFilter}
              onChange={(e) => {
                setSelectedYearFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden cursor-pointer"
            >
              <option key="year-all" value="all" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">All Fiscal Years</option>
              {years.map((y) => (
                <option key={`year-${y}`} value={String(y)} className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">{y}</option>
              ))}
            </select>

            <select
              value={selectedMonthFilter}
              onChange={(e) => {
                setSelectedMonthFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden cursor-pointer"
            >
              <option key="month-all" value="all" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">All Months</option>
              {MONTH_NAMES.map((name, idx) => (
                <option key={`month-${idx + 1}`} value={String(idx + 1)} className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">{name}</option>
              ))}
            </select>

            <select
              value={selectedStatusFilter}
              onChange={(e) => {
                setSelectedStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden cursor-pointer"
            >
              <option key="status-all" value="all" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">All Statuses</option>
              <option key="status-paid" value="paid" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">Paid Only</option>
              <option key="status-partial" value="partial" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">Partial Only</option>
              <option key="status-unpaid" value="unpaid" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">Unpaid Only</option>
            </select>

            <select
              value={selectedMemberFilter}
              onChange={(e) => {
                setSelectedMemberFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-[#0F1B2E] dark:text-slate-100 truncate focus:outline-hidden cursor-pointer"
            >
              <option key="member-all" value="all" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">All Members ({members.length})</option>
              {members.map((m, idx) => (
                <option key={`member-${m.id || idx}`} value={m.id} className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">{m.member_code} - {m.full_name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="surface-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EFF3F9] dark:bg-[#17243C] text-[#4E5E78] dark:text-slate-400 border-b border-[#DFE6F0] dark:border-[#233452]">
              <tr>
                <th className="py-3 px-4 font-semibold">Month &amp; Year</th>
                <th className="py-3 px-4 font-semibold">Code</th>
                <th className="py-3 px-4 font-semibold">Member Name</th>
                <th className="py-3 px-4 font-semibold text-right">Due (৳)</th>
                <th className="py-3 px-4 font-semibold text-right">Fine (৳)</th>
                <th className="py-3 px-4 font-semibold text-right">Paid (৳)</th>
                <th className="py-3 px-4 font-semibold text-right">Outstanding (৳)</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold">Paid Date</th>
                <th className="py-3 px-4 font-semibold text-right">{canEditAdmin ? 'Actions' : 'Receipt'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DFE6F0] dark:divide-[#233452]">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#4E5E78]">
                    {monthlyDues.length === 0 ? (
                      <div className="space-y-2">
                        <p className="font-semibold text-[#0F1B2E] dark:text-slate-200">
                          No payment records yet.
                        </p>
                        {canEditAdmin && (
                          <button
                            onClick={() => setRecordModalOpen(true)}
                            className="text-xs text-[#1D4ED8] dark:text-[#60A5FA] font-semibold underline cursor-pointer"
                          >
                            + Record First Payment
                          </button>
                        )}
                      </div>
                    ) : (
                      'No payment records match your filters.'
                    )}
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((due, idx) => {
                  const bd = calculateDueBreakdown(due, due.member?.shares_count);
                  const isDeleting = deleteConfirmId === due.id;

                  return (
                    <tr
                      key={due.id || `due-${due.member_id || idx}-${due.year}-${due.month}`}
                      className="hover:bg-[#EFF3F9]/65 dark:hover:bg-[#17243C]/65 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-[#0F1B2E] dark:text-slate-100 whitespace-nowrap">
                        {getMonthName(due.month)} {due.year}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-[#0F1B2E] dark:text-slate-100 whitespace-nowrap">
                        {due.member?.member_code}
                      </td>

                      <td className="py-3 px-4 font-medium text-[#0F1B2E] dark:text-slate-100">
                        <Link
                          to={`/admin/members/${due.member_id}`}
                          className="hover:text-[#1D4ED8] dark:hover:text-[#60A5FA] font-semibold"
                        >
                          {due.member?.full_name}
                        </Link>
                        {due.notes && (
                          <span className="block text-[10px] text-[#4E5E78] truncate max-w-[180px]">
                            {due.notes}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#4E5E78] dark:text-slate-300">
                        {formatBDT(bd.principalDue)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#92600A] dark:text-[#F0C56E]">
                        {due.fine_waived ? (
                          <span className="text-[10px] text-[#4E5E78]">Waived</span>
                        ) : bd.fineDue > 0 ? (
                          <span>
                            {formatBDT(bd.fineDue)}
                            {bd.finePaid > 0 && (
                              <span className="block text-[10px] text-[#0369A1] dark:text-[#38BDF8]">
                                Paid: {formatBDT(bd.finePaid)}
                              </span>
                            )}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-[#0369A1] dark:text-[#38BDF8]">
                        {formatBDT(bd.totalPaid)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-rose-700 dark:text-rose-400">
                        {bd.totalOutstanding > 0 ? formatBDT(bd.totalOutstanding) : '—'}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <StatusBadge status={due.status} size="sm" />
                      </td>

                      <td className="py-3 px-4 font-mono text-[#4E5E78] dark:text-slate-400 whitespace-nowrap tabular-nums">
                        {due.paid_at ? formatDate(due.paid_at) : '—'}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {bd.totalPaid > 0 && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  const payload = buildPaymentReceiptPayload(
                                    due,
                                    due.member || members.find((m) => m.id === due.member_id) || null,
                                    myMemberRecord?.full_name || profile?.full_name || 'Authorized Club Treasurer'
                                  );
                                  downloadPaymentReceiptImage(payload, crestImage);
                                }}
                                className="p-1.5 text-[#1D4ED8] dark:text-[#60A5FA] hover:bg-[#1D4ED8]/10 dark:hover:bg-[#60A5FA]/15 rounded-lg cursor-pointer"
                                title="Download Receipt Image (PNG)"
                              >
                                <ImageDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setReceiptDue(due)}
                                className="p-1.5 text-[#0369A1] dark:text-[#38BDF8] hover:bg-[#0369A1]/10 dark:hover:bg-[#38BDF8]/15 rounded-lg cursor-pointer"
                                title="Preview / Print Official Receipt"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {!canEditAdmin && bd.totalPaid <= 0 && (
                            <span className="text-[#4E5E78] dark:text-slate-500">—</span>
                          )}

                          {canEditAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => setEditDue(due)}
                                className="p-1.5 text-[#4E5E78] hover:text-[#1D4ED8] dark:hover:text-[#60A5FA] rounded-lg hover:bg-[#EFF3F9] dark:hover:bg-[#18294A] cursor-pointer"
                                title="Edit Payment"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {isDeleting ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      deleteDueRecord(due.id);
                                      setDeleteConfirmId(null);
                                    }}
                                    className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-semibold cursor-pointer"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-1.5 py-0.5 text-[#4E5E78] text-[10px] cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(due.id)}
                                  className="p-1.5 text-[#4E5E78] hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
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

        {/* Pagination Bar */}
        <div className="p-4 border-t border-[#DFE6F0] dark:border-[#233452] flex flex-wrap items-center justify-between gap-2 text-xs text-[#4E5E78] dark:text-slate-400">
          <span className="tabular-nums">
            Showing {filteredRecords.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
            {Math.min(currentPage * pageSize, filteredRecords.length)} of {filteredRecords.length} records
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-[#DFE6F0] dark:border-[#233452] disabled:opacity-40 hover:bg-[#EFF3F9] dark:hover:bg-[#17243C] cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono font-semibold tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-[#DFE6F0] dark:border-[#233452] disabled:opacity-40 hover:bg-[#EFF3F9] dark:hover:bg-[#17243C] cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {canEditAdmin && (
        <>
          {/* Record Payment Modal */}
          <RecordPaymentModal
            isOpen={recordModalOpen}
            onClose={() => setRecordModalOpen(false)}
            initialMonth={selectedMonth}
            initialYear={selectedYear}
          />

          {/* Full Edit Payment Modal */}
          <EditPaymentModal due={editDue} onClose={() => setEditDue(null)} />
        </>
      )}

      {/* Printable / PDF Official Payment Receipt */}
      <PaymentReceiptModal due={receiptDue} onClose={() => setReceiptDue(null)} />
    </PageTransition>
  );
};
