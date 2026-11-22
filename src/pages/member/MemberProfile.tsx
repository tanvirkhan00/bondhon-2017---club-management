import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useClubData } from '../../hooks/useClubData';
import { useAuth } from '../../hooks/useAuth';
import { formatBDT, formatDate, getMonthName } from '../../utils/formatters';
import { calculateDueBreakdown } from '../../utils/fineCalculator';
import {
  BLOOD_GROUPS,
  computeDaysUntilBirthday,
  formatBirthdayMonthDay,
} from '../../utils/birthdayUtils';
import { StatusBadge } from '../../components/StatusBadge';
import { MetricCard } from '../../components/MetricCard';
import { MemberProfileGreetingHero } from '../../components/MemberProfileGreetingHero';
import { MemberAnalyticsChart } from '../../components/MemberAnalyticsChart';
import { DashboardClock } from '../../components/DashboardClock';
import { PageTransition } from '../../components/ui/MotionPrimitives';
import {
  User,
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
  Droplets,
  Cake,
  Search,
  Megaphone,
} from 'lucide-react';

export const MemberProfile: React.FC = () => {
  const { user, updatePassword } = useAuth();
  const {
    myMemberRecord,
    myFinancialSummary,
    myDues,
    publicMembers,
    memberDirectory,
    announcements,
    linkMyMemberAccount,
    updateMyMemberProfile,
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

  // Personal Profile (Phone, Private DOB, Public Blood Group) & Treasurer Notice state
  const [phoneInput, setPhoneInput] = useState(myMemberRecord?.phone || '');
  const [dobInput, setDobInput] = useState(myMemberRecord?.date_of_birth || '');
  const [bloodGroupInput, setBloodGroupInput] = useState(myMemberRecord?.blood_group || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [noticeMessage, setNoticeMessage] = useState('');
  const [noticeSending, setNoticeSending] = useState(false);
  const [noticeFeedback, setNoticeFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Member Directory Filter state
  const [dirSearch, setDirSearch] = useState('');
  const [bloodFilter, setBloodFilter] = useState<string>('all');

  useEffect(() => {
    setPhoneInput(myMemberRecord?.phone || '');
    setDobInput(myMemberRecord?.date_of_birth || '');
    setBloodGroupInput(myMemberRecord?.blood_group || '');
  }, [myMemberRecord?.phone, myMemberRecord?.date_of_birth, myMemberRecord?.blood_group]);

  const filteredDirectory = useMemo(() => {
    const q = dirSearch.trim().toLowerCase();
    return memberDirectory.filter((item) => {
      if (bloodFilter !== 'all' && item.blood_group !== bloodFilter) return false;
      if (!q) return true;
      return (
        item.full_name.toLowerCase().includes(q) ||
        item.member_code.toLowerCase().includes(q) ||
        (item.blood_group || '').toLowerCase().includes(q)
      );
    });
  }, [memberDirectory, dirSearch, bloodFilter]);

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

  const handleUpdatePersonalProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileFeedback(null);

    const res = await updateMyMemberProfile({
      phone: phoneInput,
      date_of_birth: dobInput.trim() || null,
      blood_group: bloodGroupInput || null,
    });
    setProfileSaving(false);
    if (res.success) {
      setProfileFeedback({
        type: 'success',
        text: 'আপনার প্রোফাইল তথ্য (ফোন, জন্মতারিখ ও রক্তের গ্রুপ) সফলভাবে আপডেট হয়েছে।',
      });
    } else {
      setProfileFeedback({
        type: 'error',
        text: res.error || 'প্রোফাইল তথ্য আপডেট ব্যর্থ হয়েছে।',
      });
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
          <div className="w-14 h-14 mx-auto rounded-full bg-[#1D4ED8]/10 text-[#1D4ED8] dark:text-[#60A5FA] flex items-center justify-center">
            <User className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#0F1B33] dark:text-white">
              Link Member Profile
            </h2>
            <p className="text-xs text-[#4E5E78] mt-1">
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
              className="w-full px-3 py-2.5 text-xs sm:text-sm bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8] cursor-pointer"
            >
              <option value="" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">
                Select member...
              </option>
              {publicMembers.map((m) => (
                <option
                  key={m.id}
                  value={m.member_code}
                  className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100"
                >
                  {m.member_code} — {m.full_name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={linking || !selectedCode}
              className="w-full py-2.5 px-4 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-semibold text-xs rounded-xl disabled:opacity-50 cursor-pointer"
            >
              {linking ? 'Linking...' : 'Link Profile'}
            </button>
          </form>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="space-y-6 sm:space-y-8">
      {/* Member Portal Top Overview Bar with Live Clock & Weather */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-[#0F1B33] dark:text-white">
            Member Overview
          </h2>
          <p className="text-xs sm:text-sm text-[#4E5E78] dark:text-[#9BB0CD] mt-0.5">
            Live local time, weather &amp; your verified contribution ledger
          </p>
        </div>
        <DashboardClock />
      </div>

      {/* Personalized Greeting & Member Identity Card */}
      <MemberProfileGreetingHero
        member={myMemberRecord}
        monthlyContribution={myFinancialSummary.monthlyContribution}
        showEmail
        showPrivateDob
      />

      {/* Personal Financial Summary */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-bold text-[#4E5E78] uppercase tracking-wider">
            Contribution Summary
          </h2>
          <Link
            to="/constitution"
            className="text-xs font-semibold text-[#1D4ED8] dark:text-[#60A5FA] hover:underline"
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
            accent="sapphire"
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
              <span className="text-[11px] font-semibold tracking-wider uppercase text-[#4E5E78]">
                Account Status
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#0F1B33]/8 dark:bg-[#18294A] text-[#0F1B33] dark:text-[#D6AC62] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <StatusBadge status={myFinancialSummary.currentStatus} />
            </div>
            <div className="mt-3.5 pt-2.5 border-t border-[#DFE6F0] dark:border-[#233452] text-xs text-[#4E5E78] font-mono">
              Last payment: {myFinancialSummary.lastPaymentDate ? formatDate(myFinancialSummary.lastPaymentDate) : 'None'}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Member Profile Analytics */}
      <MemberAnalyticsChart
        member={myMemberRecord}
        ledger={myDues}
        summary={myFinancialSummary}
      />

      {/* Member Security & Communication */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Change Password */}
        <div className="surface-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#DFE6F0] dark:border-[#233452]">
            <div className="w-9 h-9 rounded-xl bg-[#1D4ED8]/10 text-[#1D4ED8] dark:text-[#60A5FA] flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F1B33] dark:text-white">
                Account Security
              </h3>
              <p className="text-[11px] text-[#4E5E78]">
                Update your portal password
              </p>
            </div>
          </div>

          {passFeedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                passFeedback.type === 'success'
                  ? 'bg-[#1D4ED8]/10 text-[#1D4ED8] dark:text-[#60A5FA] border border-[#1D4ED8]/25 dark:border-[#60A5FA]/35'
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
              <label className="block font-semibold text-[#0F1B2E] dark:text-slate-300 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-[#4E5E78] absolute left-3 top-3" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  aria-label="Toggle password visibility"
                  className="absolute right-3 top-2.5 text-[#4E5E78] hover:text-[#0F1B33] cursor-pointer"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#0F1B2E] dark:text-slate-300 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-[#4E5E78] absolute left-3 top-3" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={passLoading}
              className="w-full py-2.5 px-4 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {passLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Card 2: Personal Details (Phone, Private DOB, Public Blood Group) & Treasurer Notice */}
        <div className="surface-card rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#DFE6F0] dark:border-[#233452]">
            <div className="w-9 h-9 rounded-xl bg-[#0F1B33]/8 dark:bg-[#18294A] text-[#0F1B33] dark:text-[#D6AC62] flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F1B33] dark:text-white">
                Personal Info &amp; Privacy Settings
              </h3>
              <p className="text-[11px] text-[#4E5E78]">
                Manage phone, private Date of Birth &amp; public Blood Group
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdatePersonalProfile} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#0F1B2E] dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+880 17XX-XXXXXX"
                  className="w-full px-3 py-2 bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#0F1B2E] dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-rose-500" />
                  <span>Blood Group (Members Visible)</span>
                </label>
                <select
                  value={bloodGroupInput}
                  onChange={(e) => setBloodGroupInput(e.target.value)}
                  className="w-full px-3 py-2 bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl font-mono text-xs text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8] cursor-pointer"
                >
                  <option value="">Not specified</option>
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="font-semibold text-[#0F1B2E] dark:text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#D6AC62]" />
                  <span>Date of Birth (Strictly Private)</span>
                </label>
                <span className="text-[10px] font-mono text-[#0369A1] dark:text-[#38BDF8]">
                  Only visible to you &amp; admins
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dobInput}
                  onChange={(e) => setDobInput(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
                />
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-4 py-2 bg-[#0F1B33] hover:bg-[#18294A] text-white font-semibold rounded-xl text-xs cursor-pointer disabled:opacity-50 shrink-0 whitespace-nowrap"
                >
                  {profileSaving ? 'Saving...' : 'Save Info'}
                </button>
              </div>
            </div>

            {profileFeedback && (
              <p className={`text-[11px] ${profileFeedback.type === 'success' ? 'text-[#1D4ED8] dark:text-[#60A5FA]' : 'text-rose-600'}`}>
                {profileFeedback.text}
              </p>
            )}
          </form>

          <form onSubmit={handleSendNotice} className="space-y-2 text-xs pt-3 border-t border-[#DFE6F0] dark:border-[#233452]">
            <label className="block font-semibold text-[#0F1B2E] dark:text-slate-300">
              Message to Treasurer
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={noticeMessage}
                onChange={(e) => setNoticeMessage(e.target.value)}
                placeholder="Payment reference or TrxID..."
                className="flex-1 min-w-0 px-3 py-2.5 bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
              />
              <button
                type="submit"
                disabled={noticeSending}
                className="px-4 py-2.5 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{noticeSending ? 'Sending...' : 'Send'}</span>
              </button>
            </div>
            {noticeFeedback && (
              <p className={`text-[11px] ${noticeFeedback.type === 'success' ? 'text-[#1D4ED8] dark:text-[#60A5FA]' : 'text-rose-600'}`}>
                {noticeFeedback.text}
              </p>
            )}
          </form>
        </div>
      </div>

      {/* Club Announcements & Peer Blood Group Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Club Announcements */}
        <div className="lg:col-span-5 surface-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#DFE6F0] dark:border-[#233452]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#D6AC62]/15 text-[#92600A] dark:text-[#F0C56E] flex items-center justify-center">
                <Megaphone className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0F1B33] dark:text-white">
                  Club Announcements
                </h3>
                <p className="text-[11px] text-[#4E5E78]">
                  Official notices from club admins
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold text-[#1D4ED8] dark:text-[#60A5FA] tabular-nums">
              {announcements.length}
            </span>
          </div>

          {announcements.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#4E5E78]">
              No announcements published yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {announcements.slice(0, 8).map((ann) => (
                <div
                  key={ann.id}
                  className="p-3.5 rounded-xl bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#92600A] dark:text-[#F0C56E]">
                      {ann.category}
                    </span>
                    <span className="text-[10px] font-mono text-[#4E5E78]">
                      {formatDate(ann.created_at)}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#0F1B33] dark:text-white">
                    {ann.title}
                  </h4>
                  <p className="text-[11px] text-[#4E5E78] dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {ann.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Authenticated Blood Group & Upcoming Birthday Directory */}
        <div className="lg:col-span-7 surface-card rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#DFE6F0] dark:border-[#233452]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Droplets className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0F1B33] dark:text-white">
                  Club Blood Group &amp; Birthday Directory
                </h3>
                <p className="text-[11px] text-[#4E5E78]">
                  Authenticated members only · Birth years &amp; private dates stay hidden
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#4E5E78] absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={dirSearch}
                  onChange={(e) => setDirSearch(e.target.value)}
                  placeholder="Search member..."
                  className="pl-8 pr-2.5 py-1.5 text-xs bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl w-36 focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
                />
              </div>

              <select
                value={bloodFilter}
                onChange={(e) => setBloodFilter(e.target.value)}
                aria-label="Filter by blood group"
                className="px-2.5 py-1.5 text-xs bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl font-mono cursor-pointer"
              >
                <option value="all">All Blood</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
            {filteredDirectory.length === 0 ? (
              <div className="col-span-full py-8 text-center text-xs text-[#4E5E78]">
                No matching club members found.
              </div>
            ) : (
              filteredDirectory.map((peer) => {
                const hasMonthDay = Boolean(peer.birth_month && peer.birth_day);
                const daysUntil =
                  hasMonthDay && peer.birth_month && peer.birth_day
                    ? computeDaysUntilBirthday(peer.birth_month, peer.birth_day).daysUntil
                    : null;
                const isUpcoming = daysUntil !== null && daysUntil >= 0 && daysUntil <= 7;

                return (
                  <div
                    key={peer.id}
                    className="p-3 rounded-xl bg-[#EFF3F9]/80 dark:bg-[#17243C]/80 border border-[#DFE6F0] dark:border-[#233452] flex items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-white dark:bg-[#111B2E] ring-1 ring-[#D6AC62]/50 shrink-0 flex items-center justify-center text-[11px] font-bold text-[#0F1B33] dark:text-slate-200">
                        {peer.profile_image_url ? (
                          <img
                            src={peer.profile_image_url}
                            alt={peer.full_name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          peer.full_name.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[#0F1B33] dark:text-white block truncate">
                          {peer.full_name}
                        </span>
                        <span className="text-[10px] font-mono text-[#4E5E78] block truncate">
                          {peer.member_code} · {peer.designation || 'Member'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-0.5">
                      <span
                        className={`text-xs font-mono font-extrabold block ${
                          peer.blood_group
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-[#4E5E78]'
                        }`}
                      >
                        {peer.blood_group || '—'}
                      </span>
                      {isUpcoming && peer.birth_month && peer.birth_day && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#92600A] dark:text-[#F0C56E]">
                          <Cake className="w-3 h-3" />
                          <span>
                            {daysUntil === 0
                              ? 'Today'
                              : formatBirthdayMonthDay(peer.birth_month, peer.birth_day)}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Recent Dues Preview */}
      <div className="surface-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#DFE6F0] dark:border-[#233452]">
          <h3 className="text-sm font-bold text-[#0F1B33] dark:text-white">
            Recent Billing Cycles
          </h3>
          <Link
            to="/member/payment-history"
            className="text-xs font-semibold text-[#1D4ED8] dark:text-[#60A5FA] hover:underline flex items-center gap-1"
          >
            <span>Full Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EFF3F9] dark:bg-[#17243C] text-[#4E5E78] border-b border-[#DFE6F0] dark:border-[#233452]">
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
            <tbody className="divide-y divide-[#DFE6F0] dark:divide-[#233452]">
              {recentDues.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#4E5E78]">
                    No billing records available.
                  </td>
                </tr>
              ) : (
                recentDues.map((d) => {
                  const bd = calculateDueBreakdown(d, myMemberRecord.shares_count);
                  return (
                    <tr key={d.id} className="hover:bg-[#EFF3F9]/60 dark:hover:bg-[#17243C]/60 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-[#0F1B33] dark:text-white whitespace-nowrap">
                        {getMonthName(d.month)} {d.year}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#4E5E78]">
                        {formatBDT(bd.principalDue)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#92600A] dark:text-[#F0C56E]">
                        {bd.fineDue > 0 ? (
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
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-[#0369A1] dark:text-[#38BDF8]">
                        {formatBDT(bd.totalPaid)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-rose-700 dark:text-rose-400">
                        {bd.totalOutstanding > 0 ? formatBDT(bd.totalOutstanding) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <StatusBadge status={d.status} size="sm" />
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#4E5E78] whitespace-nowrap">
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
