import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useClubData } from '../../hooks/useClubData';
import { useAuth } from '../../hooks/useAuth';
import { formatBDT, formatDate, getMonthName } from '../../utils/formatters';
import { calculateDueBreakdown } from '../../utils/fineCalculator';
import { StatusBadge } from '../../components/StatusBadge';
import { MetricCard } from '../../components/MetricCard';
import { PageTransition } from '../../components/ui/MotionPrimitives';
import {
  User,
  Phone,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Lock,
  Eye,
  EyeOff,
  Send,
  KeyRound,
  Wallet,
  Coins,
  ShieldCheck,
} from 'lucide-react';

export const MemberProfile: React.FC = () => {
  const { user, updatePassword } = useAuth();
  const {
    myMemberRecord,
    myFinancialSummary,
    myDues,
    publicMembers,
    linkMyMemberAccount,
    updateMyContactPhone,
    logMemberActivity,
  } = useClubData();

  const [selectedCode, setSelectedCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Change password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passFeedback, setPassFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Contact phone & notice to admin state
  const [phoneInput, setPhoneInput] = useState(myMemberRecord?.phone || '');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneFeedback, setPhoneFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [noticeMessage, setNoticeMessage] = useState('');
  const [noticeSending, setNoticeSending] = useState(false);
  const [noticeFeedback, setNoticeFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (myMemberRecord?.phone) {
      setPhoneInput(myMemberRecord.phone);
    }
  }, [myMemberRecord?.phone]);

  const recentDues = [...myDues]
    .sort((a, b) => b.year - a.year || b.month - a.month)
    .slice(0, 6);

  const handleLinkProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCode) return;
    setLinking(true);
    setLinkError(null);
    const res = await linkMyMemberAccount(selectedCode);
    setLinking(false);
    if (!res.success && res.error) {
      setLinkError(res.error);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassFeedback(null);

    if (newPassword.length < 6) {
      setPassFeedback({ type: 'error', text: 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassFeedback({ type: 'error', text: 'দুটি পাসওয়ার্ড একরকম হয়নি। অনুগ্রহ করে আবার লিখুন।' });
      return;
    }

    setPassLoading(true);
    const res = await updatePassword(newPassword);
    setPassLoading(false);

    if (res.success) {
      if (myMemberRecord) {
        await logMemberActivity({
          actorUserId: user?.id || null,
          memberId: myMemberRecord.id,
          memberCode: myMemberRecord.member_code,
          memberName: myMemberRecord.full_name,
          eventType: 'password_changed',
          title: 'পাসওয়ার্ড পরিবর্তন',
          message: `${myMemberRecord.full_name} (${myMemberRecord.member_code}) তার পোর্টাল পাসওয়ার্ড পরিবর্তন করেছেন।`,
        });
      }
      setNewPassword('');
      setConfirmPassword('');
      setPassFeedback({
        type: 'success',
        text: 'পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে! পরবর্তী লগইনে এই নতুন পাসওয়ার্ড ব্যবহার করুন।',
      });
    } else {
      setPassFeedback({
        type: 'error',
        text: res.error || 'পাসওয়ার্ড পরিবর্তন করতে সমস্যা হয়েছে।',
      });
    }
  };

  const handleUpdatePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput.trim()) return;
    setPhoneSaving(true);
    setPhoneFeedback(null);

    const res = await updateMyContactPhone(phoneInput);
    setPhoneSaving(false);
    if (res.success) {
      setPhoneFeedback({ type: 'success', text: 'মোবাইল নম্বর আপডেট হয়েছে এবং অ্যাডমিনকে জানানো হয়েছে।' });
    } else {
      setPhoneFeedback({ type: 'error', text: res.error || 'নম্বর আপডেট ব্যর্থ হয়েছে।' });
    }
  };

  const handleSendNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeMessage.trim() || !myMemberRecord) return;
    setNoticeSending(true);
    setNoticeFeedback(null);

    await logMemberActivity({
      actorUserId: user?.id || null,
      memberId: myMemberRecord.id,
      memberCode: myMemberRecord.member_code,
      memberName: myMemberRecord.full_name,
      eventType: 'payment_notice',
      title: 'সদস্যের পেমেন্ট / তথ্য বার্তা',
      message: `${myMemberRecord.full_name} (${myMemberRecord.member_code}): "${noticeMessage.trim()}"`,
    });

    setNoticeSending(false);
    setNoticeMessage('');
    setNoticeFeedback({
      type: 'success',
      text: 'আপনার বার্তাটি সফলভাবে কোষাধ্যক্ষ / অ্যাডমিন ড্যাশবোর্ডে পাঠানো হয়েছে!',
    });
  };

  if (!myMemberRecord) {
    return (
      <PageTransition>
        <div className="surface-card max-w-md mx-auto py-10 px-6 rounded-3xl text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#087F70]/10 text-[#087F70] dark:text-[#34D399] flex items-center justify-center">
            <User className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#14243A] dark:text-white">
              Link Member Profile
            </h2>
            <p className="text-xs text-[#64748B] mt-1">
              Select your profile to view contribution records for {user?.email}.
            </p>
          </div>

          {linkError && (
            <div className="p-2.5 bg-rose-50 text-rose-700 border border-rose-200 text-xs rounded-xl">
              {linkError}
            </div>
          )}

          <form onSubmit={handleLinkProfile} className="space-y-3 text-left">
            <select
              required
              value={selectedCode}
              onChange={(e) => setSelectedCode(e.target.value)}
              className="w-full px-3 py-2.5 text-xs sm:text-sm bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl text-[#172435] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#087F70] cursor-pointer"
            >
              <option value="" className="bg-white text-[#172435] dark:bg-[#111C2D] dark:text-slate-100">
                Select member...
              </option>
              {publicMembers.map((m) => (
                <option
                  key={m.id}
                  value={m.member_code}
                  className="bg-white text-[#172435] dark:bg-[#111C2D] dark:text-slate-100"
                >
                  {m.member_code} — {m.full_name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={linking || !selectedCode}
              className="w-full py-2.5 px-4 bg-[#087F70] hover:bg-[#06675B] text-white font-semibold text-xs rounded-xl disabled:opacity-50 cursor-pointer"
            >
              {linking ? 'Linking...' : 'Link Profile'}
            </button>
          </form>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="space-y-8">
      {/* Member Identity Card */}
      <div className="surface-card rounded-3xl overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-[#14243A] via-[#087F70] to-[#D6AC62]" />
        <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <div className="w-24 h-24 rounded-full bg-[#F5F6F3] dark:bg-[#162438] ring-3 ring-[#D6AC62]/70 flex items-center justify-center text-[#14243A] dark:text-slate-200 font-bold text-3xl shrink-0 overflow-hidden shadow-sm">
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

          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 text-xs">
              <span className="font-mono font-bold text-[#14243A] dark:text-slate-200">
                {myMemberRecord.member_code}
              </span>
              <span className="text-[#64748B]">·</span>
              <span className="font-semibold text-[#087F70] dark:text-[#34D399]">
                {myMemberRecord.designation || 'Active Member'}
              </span>
              <StatusBadge status={myMemberRecord.status} size="sm" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#14243A] dark:text-white">
              {myMemberRecord.full_name}
            </h1>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-2 text-xs text-[#64748B] pt-1">
              {myMemberRecord.father_name && (
                <span className="flex items-center gap-1.5 text-[#172435]/80 dark:text-slate-300">
                  <User className="w-3.5 h-3.5 text-[#64748B]" />
                  {myMemberRecord.father_name}
                </span>
              )}
              <span className="flex items-center gap-1.5 font-mono text-[#172435] dark:text-slate-200">
                <Phone className="w-3.5 h-3.5 text-[#64748B]" />
                {myMemberRecord.phone || '—'}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
                Joined {formatDate(myMemberRecord.join_date)}
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-[#087F70] dark:text-[#34D399] font-mono">
                <CreditCard className="w-3.5 h-3.5" />
                {formatBDT(myFinancialSummary.monthlyContribution)}/mo
                {myMemberRecord.shares_count > 1 ? ` (${myMemberRecord.shares_count} shares)` : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Financial Summary */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-bold text-[#64748B] uppercase tracking-wider">
            Contribution Summary
          </h2>
          <Link
            to="/constitution"
            className="text-xs font-semibold text-[#087F70] dark:text-[#34D399] hover:underline"
          >
            Club Policy
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total Paid"
            value={formatBDT(myFinancialSummary.totalPaid)}
            subLabel={`${myFinancialSummary.totalPaidMonths} months cleared`}
            icon={Wallet}
            accent="emerald"
          />

          <MetricCard
            label="Total Outstanding"
            value={formatBDT(myFinancialSummary.totalOutstanding)}
            subLabel={`Principal ${formatBDT(myFinancialSummary.principalOutstanding)} · Fine ${formatBDT(myFinancialSummary.totalFinePending)}`}
            icon={AlertCircle}
            accent={myFinancialSummary.totalOutstanding > 0 ? 'rose' : 'navy'}
            trend={{
              positive: myFinancialSummary.totalOutstanding === 0,
              text: `${myFinancialSummary.unpaidMonthsCount} mos`,
            }}
          />

          <MetricCard
            label="Fines Paid"
            value={formatBDT(myFinancialSummary.totalFinePaid)}
            subLabel={`Total charged: ${formatBDT(myFinancialSummary.totalFineCharged)}`}
            icon={Coins}
            accent="gold"
          />

          <div className="surface-card surface-card-hover rounded-2xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-[#64748B]">
                Account Status
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#14243A]/8 dark:bg-[#203650] text-[#14243A] dark:text-[#D6AC62] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <StatusBadge status={myFinancialSummary.currentStatus} />
            </div>
            <div className="mt-3.5 pt-2.5 border-t border-[#E8EDF3] dark:border-[#1F2F46] text-xs text-[#64748B] font-mono">
              Last payment: {myFinancialSummary.lastPaymentDate ? formatDate(myFinancialSummary.lastPaymentDate) : 'None'}
            </div>
          </div>
        </div>
      </div>

      {/* Member Security & Communication */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Change Password */}
        <div className="surface-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E8EDF3] dark:border-[#1F2F46]">
            <div className="w-9 h-9 rounded-xl bg-[#087F70]/10 text-[#087F70] dark:text-[#34D399] flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#14243A] dark:text-white">
                Account Security
              </h3>
              <p className="text-[11px] text-[#64748B]">
                Update your portal password
              </p>
            </div>
          </div>

          {passFeedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                passFeedback.type === 'success'
                  ? 'bg-[#087F70]/10 text-[#087F70] dark:text-[#34D399] border border-[#087F70]/25'
                  : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
              }`}
            >
              {passFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              )}
              <span>{passFeedback.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-[#172435] dark:text-slate-300 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-3" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#087F70]"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  aria-label="Toggle password visibility"
                  className="absolute right-3 top-2.5 text-[#64748B] hover:text-[#14243A] cursor-pointer"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#172435] dark:text-slate-300 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-3" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#087F70]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={passLoading}
              className="w-full py-2.5 px-4 bg-[#087F70] hover:bg-[#06675B] text-white font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {passLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Card 2: Contact & Treasurer Notice */}
        <div className="surface-card rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E8EDF3] dark:border-[#1F2F46]">
            <div className="w-9 h-9 rounded-xl bg-[#14243A]/8 dark:bg-[#203650] text-[#14243A] dark:text-[#D6AC62] flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#14243A] dark:text-white">
                Contact &amp; Treasurer Notice
              </h3>
              <p className="text-[11px] text-[#64748B]">
                Update contact phone or notify the treasurer
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdatePhone} className="space-y-2 text-xs">
            <label className="block font-semibold text-[#172435] dark:text-slate-300">
              Phone Number
            </label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+880 17XX-XXXXXX"
                className="flex-1 min-w-0 px-3 py-2.5 bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-[#087F70]"
              />
              <button
                type="submit"
                disabled={phoneSaving}
                className="px-4 py-2.5 bg-[#14243A] hover:bg-[#203650] text-white font-semibold rounded-xl text-xs cursor-pointer disabled:opacity-50 shrink-0"
              >
                {phoneSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
            {phoneFeedback && (
              <p className={`text-[11px] ${phoneFeedback.type === 'success' ? 'text-[#087F70]' : 'text-rose-600'}`}>
                {phoneFeedback.text}
              </p>
            )}
          </form>

          <form onSubmit={handleSendNotice} className="space-y-2 text-xs pt-3 border-t border-[#E8EDF3] dark:border-[#1F2F46]">
            <label className="block font-semibold text-[#172435] dark:text-slate-300">
              Message to Treasurer
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={noticeMessage}
                onChange={(e) => setNoticeMessage(e.target.value)}
                placeholder="Payment reference or TrxID..."
                className="flex-1 min-w-0 px-3 py-2.5 bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-[#087F70]"
              />
              <button
                type="submit"
                disabled={noticeSending}
                className="px-4 py-2.5 bg-[#087F70] hover:bg-[#06675B] text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{noticeSending ? 'Sending...' : 'Send'}</span>
              </button>
            </div>
            {noticeFeedback && (
              <p className={`text-[11px] ${noticeFeedback.type === 'success' ? 'text-[#087F70]' : 'text-rose-600'}`}>
                {noticeFeedback.text}
              </p>
            )}
          </form>
        </div>
      </div>

      {/* Recent Dues Preview */}
      <div className="surface-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E8EDF3] dark:border-[#1F2F46]">
          <h3 className="text-sm font-bold text-[#14243A] dark:text-white">
            Recent Billing Cycles
          </h3>
          <Link
            to="/member/payment-history"
            className="text-xs font-semibold text-[#087F70] dark:text-[#34D399] hover:underline flex items-center gap-1"
          >
            <span>Full Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F6F3] dark:bg-[#162438] text-[#64748B] border-b border-[#E8EDF3] dark:border-[#1F2F46]">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Period</th>
                <th className="py-2.5 px-3 font-semibold text-right">Due (৳)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Fine (৳)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Paid (৳)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Outstanding (৳)</th>
                <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                <th className="py-2.5 px-3 font-semibold">Payment Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EDF3] dark:divide-[#1F2F46]">
              {recentDues.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#64748B]">
                    No billing records available.
                  </td>
                </tr>
              ) : (
                recentDues.map((d) => {
                  const bd = calculateDueBreakdown(d, myMemberRecord.shares_count);
                  return (
                    <tr key={d.id} className="hover:bg-[#F5F6F3]/60 dark:hover:bg-[#162438]/60 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-[#14243A] dark:text-white whitespace-nowrap">
                        {getMonthName(d.month)} {d.year}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#64748B]">
                        {formatBDT(bd.principalDue)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#9A7127] dark:text-[#D6AC62]">
                        {bd.fineDue > 0 ? (
                          <span>
                            {formatBDT(bd.fineDue)}
                            {bd.finePaid > 0 && (
                              <span className="block text-[10px] text-[#087F70] dark:text-[#34D399]">
                                Paid: {formatBDT(bd.finePaid)}
                              </span>
                            )}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-[#087F70] dark:text-[#34D399]">
                        {formatBDT(bd.totalPaid)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-rose-700 dark:text-rose-400">
                        {bd.totalOutstanding > 0 ? formatBDT(bd.totalOutstanding) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <StatusBadge status={d.status} size="sm" />
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#64748B] whitespace-nowrap">
                        {d.paid_at ? formatDate(d.paid_at) : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageTransition>
  );
};
