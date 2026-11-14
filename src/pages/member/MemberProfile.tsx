import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useClubData } from '../../hooks/useClubData';
import { useAuth } from '../../hooks/useAuth';
import { formatBDT, formatDate, getMonthName } from '../../utils/formatters';
import { StatusBadge } from '../../components/StatusBadge';
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
    .slice(0, 5);

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
      <div className="max-w-md mx-auto py-12 px-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
          <User className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            আপনার সদস্য প্রোফাইল যুক্ত করুন
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            আপনার অ্যাকাউন্ট ({user?.email}) সফলভাবে যাচাই হয়েছে। আপনার ব্যক্তিগত সঞ্চয় ও জমার হিসাব দেখতে ক্লাবের তালিকা থেকে আপনার নাম ও কোড নির্বাচন করুন।
          </p>
        </div>

        {linkError && (
          <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-xl">
            {linkError}
          </div>
        )}

        <form onSubmit={handleLinkProfile} className="space-y-3 text-left">
          <select
            required
            value={selectedCode}
            onChange={(e) => setSelectedCode(e.target.value)}
            className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
          >
            <option value="">-- আপনার নাম ও কোড নির্বাচন করুন --</option>
            {publicMembers.map((m) => (
              <option key={m.id} value={m.member_code}>
                {m.member_code} — {m.full_name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={linking || !selectedCode}
            className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl disabled:opacity-50 cursor-pointer"
          >
            {linking ? 'যুক্ত করা হচ্ছে...' : 'প্রোফাইল যুক্ত করুন'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Profile Overview Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          {/* Avatar */}
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
              {myMemberRecord.father_name && (
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  পিতার নাম: {myMemberRecord.father_name}
                </span>
              )}
              <span className="flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-300">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {myMemberRecord.phone || 'Phone not registered'}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                সদস্য সাল: {formatDate(myMemberRecord.join_date)}
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                <CreditCard className="w-3.5 h-3.5" />
                মাসিক কিস্তি: {formatBDT(myFinancialSummary.monthlyContribution)} {myMemberRecord.shares_count > 1 ? `(${myMemberRecord.shares_count}টি নাম)` : ''}
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

      {/* Member Security & Communication: Change Password + Notify Admin */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Change Password */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                পাসওয়ার্ড পরিবর্তন করুন (Change Password)
              </h3>
              <p className="text-[11px] text-slate-500">
                ডিফল্ট পাসওয়ার্ড (123456) পরিবর্তন করে আপনার নিজস্ব গোপন পাসওয়ার্ড সেট করুন
              </p>
            </div>
          </div>

          {passFeedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                passFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
              }`}
            >
              {passFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              )}
              <span>{passFeedback.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                নতুন পাসওয়ার্ড (New Password)
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                পাসওয়ার্ড নিশ্চিত করুন (Confirm Password)
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="পুনরায় নতুন পাসওয়ার্ড লিখুন"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={passLoading}
              className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {passLoading ? 'আপডেট হচ্ছে...' : 'পাসওয়ার্ড আপডেট করুন (Update Password)'}
            </button>
          </form>
        </div>

        {/* Card 2: Update Phone & Send Payment Notice to Admin */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                তথ্য আপডেট ও অ্যাডমিনকে বার্তা (Notify Treasurer)
              </h3>
              <p className="text-[11px] text-slate-500">
                মোবাইল নম্বর আপডেট করুন অথবা কিস্তি পরিশোধের তথ্য অ্যাডমিনকে জানান
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdatePhone} className="space-y-2 text-xs">
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              মোবাইল নম্বর (Contact Phone)
            </label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+880 17XX-XXXXXX"
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs"
              />
              <button
                type="submit"
                disabled={phoneSaving}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 text-white font-semibold rounded-xl text-xs cursor-pointer disabled:opacity-50"
              >
                {phoneSaving ? 'সেভ...' : 'নম্বর সেভ'}
              </button>
            </div>
            {phoneFeedback && (
              <p className={`text-[11px] ${phoneFeedback.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {phoneFeedback.text}
              </p>
            )}
          </form>

          <form onSubmit={handleSendNotice} className="space-y-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              কোষাধ্যক্ষ / অ্যাডমিনকে পেমেন্ট বার্তা পাঠান
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={noticeMessage}
                onChange={(e) => setNoticeMessage(e.target.value)}
                placeholder="যেমন: চলতি মাসের ৫০০৳ বিকাশ করেছি (TrxID...)"
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
              <button
                type="submit"
                disabled={noticeSending}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{noticeSending ? 'পাঠাচ্ছে...' : 'পাঠান'}</span>
              </button>
            </div>
            {noticeFeedback && (
              <p className={`text-[11px] ${noticeFeedback.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {noticeFeedback.text}
              </p>
            )}
          </form>
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
              {recentDues.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    এখনো কোনো পেমেন্ট এন্ট্রি করা হয়নি।
                  </td>
                </tr>
              ) : (
                recentDues.map((d) => (
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
