import React from 'react';
import { Link } from 'react-router-dom';
import { useClubData } from '../../hooks/useClubData';
import { useAuth } from '../../hooks/useAuth';
import { formatBDT, formatDate, getMonthName } from '../../utils/formatters';
import { StatusBadge } from '../../components/StatusBadge';
import {
  User,
  Phone,
  Calendar,
  Hash,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Shield,
  DollarSign,
} from 'lucide-react';

export const MemberProfile: React.FC = () => {
  const { profile } = useAuth();
  const { myMemberRecord, myFinancialSummary, myDues } = useClubData();

  const recentDues = [...myDues]
    .sort((a, b) => b.year - a.year || b.month - a.month)
    .slice(0, 5);

  if (!myMemberRecord) {
    return (
      <div className="py-16 text-center text-slate-500">
        <User className="w-12 h-12 mx-auto text-slate-400 mb-2" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
          Member Profile Not Linked
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Your account is authenticated, but not yet linked to a club member directory record.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Profile Overview Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          {/* Avatar with Lazy Loading */}
          <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-emerald-600/40 flex items-center justify-center text-emerald-800 dark:text-emerald-300 font-bold text-3xl shrink-0 overflow-hidden shadow-xs">
            {myMemberRecord.profile_image_url ? (
              <img
                src={myMemberRecord.profile_image_url}
                alt={myMemberRecord.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              myMemberRecord.full_name.substring(0, 2).toUpperCase()
            )}
          </div>

          {/* Details */}
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono font-bold">
                {myMemberRecord.member_code}
              </span>
              <StatusBadge status={myMemberRecord.status} size="sm" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                {myMemberRecord.designation || 'Active Member'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {myMemberRecord.full_name}
            </h1>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-300">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {myMemberRecord.phone || 'Phone not registered'}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Member Since: {formatDate(myMemberRecord.join_date)}
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                <CreditCard className="w-3.5 h-3.5" />
                Monthly Dues: {formatBDT(myFinancialSummary.monthlyContribution)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Constitution Financial Policy Alert */}
      <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-slate-800 dark:text-slate-200">
            <span className="font-bold text-amber-900 dark:text-amber-300">গঠনতন্ত্রের ধারা ৪.১ (সঞ্চয় জমাদান নিয়মাবলী): </span>
            সদস্যরা প্রতি মাসের <strong>১২ তারিখের মধ্যে</strong> নিয়মিত সঞ্চয় কিস্তি জমা দেবেন। ১২ তারিখের মধ্যে জমা না দিলে ৫০ টাকা জরিমানা প্রযোজ্য।
          </div>
        </div>
        <Link
          to="/constitution"
          className="px-3 py-1 bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 text-amber-900 dark:text-amber-200 rounded-lg font-semibold shrink-0 text-center"
        >
          গঠনতন্ত্র দেখুন
        </Link>
      </div>

      {/* Personal Financial Summary */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
          Personal Contribution Summary
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 uppercase">Total Amount Paid</span>
            <div className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400 tabular-nums mt-1">
              {formatBDT(myFinancialSummary.totalPaid)}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              {myFinancialSummary.totalPaidMonths} months settled
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 uppercase">Total Outstanding</span>
            <div className="text-2xl font-bold font-mono text-rose-700 dark:text-rose-400 tabular-nums mt-1">
              {formatBDT(myFinancialSummary.totalOutstanding)}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              {myFinancialSummary.unpaidMonthsCount} months pending
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 uppercase">Current Dues Status</span>
            <div className="mt-2">
              <StatusBadge status={myFinancialSummary.currentStatus} />
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Latest billing cycle
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 uppercase">Last Payment Recorded</span>
            <div className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums mt-2">
              {myFinancialSummary.lastPaymentDate ? formatDate(myFinancialSummary.lastPaymentDate) : 'No recent payment'}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Verified by club administration
            </span>
          </div>
        </div>
      </div>

      {/* Recent Dues Preview */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Recent Monthly Contributions
            </h3>
            <p className="text-xs text-slate-500">
              Showing your latest 5 billing cycles
            </p>
          </div>
          <Link
            to="/member/payment-history"
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>View Full Payment History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Month & Year</th>
                <th className="py-2.5 px-3 font-semibold text-right">Due (৳)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Paid (৳)</th>
                <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                <th className="py-2.5 px-3 font-semibold">Date Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentDues.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                    {getMonthName(d.month)} {d.year}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                    {formatBDT(d.amount_due)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                    {formatBDT(d.amount_paid)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <StatusBadge status={d.status} size="sm" />
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-500">
                    {d.paid_at ? formatDate(d.paid_at) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
