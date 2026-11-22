import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useClubData } from '../../hooks/useClubData';
import { useAuth } from '../../hooks/useAuth';
import { formatBDT, formatDate, getMonthName } from '../../utils/formatters';
import { calculateDueBreakdown } from '../../utils/fineCalculator';
import { BLOOD_GROUPS } from '../../utils/birthdayUtils';
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
  Megaphone,
  QrCode,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';

type DeskTab = 'profile' | 'security' | 'treasurer';

export const MemberProfile: React.FC = () => {
  const { user, updatePassword } = useAuth();
  const {
    myMemberRecord,
    myFinancialSummary,
    myDues,
    publicMembers,
    announcements,
    linkMyMemberAccount,
    updateMyMemberProfile,
    logMemberActivity,
  } = useClubData();

  const [selectedCode, setSelectedCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Unified Member Desk Tab
  const [deskTab, setDeskTab] = useState<DeskTab>('profile');

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

  useEffect(() => {
    setPhoneInput(myMemberRecord?.phone || '');
    setDobInput(myMemberRecord?.date_of_birth || '');
    setBloodGroupInput(myMemberRecord?.blood_group || '');
  }, [myMemberRecord?.phone, myMemberRecord?.date_of_birth, myMemberRecord?.blood_group]);

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

  const paidProgress =
    myFinancialSummary.totalBilled > 0
      ? Math.min(100, Math.round((myFinancialSummary.totalPaid / myFinancialSummary.totalBilled) * 100))
      : 100;

  return (
    <PageTransition className="space-y-6 sm:space-y-7">
      {/* 1. Member Workspace Command Bar + Live Local Clock */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#DFE6F0] dark:border-[#233452]">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-wider text-[#1D4ED8] dark:text-[#60A5FA]">
            <span>Bondhon 2017 Member Workspace</span>
            <span className="text-[#4E5E78]" aria-hidden="true">·</span>
            <span className="text-[#92600A] dark:text-[#F0C56E]">{myMemberRecord.member_code}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0F1B33] dark:text-white">
            Personal Dashboard &amp; Financial Ledger
          </h2>
          <p className="text-xs sm:text-sm text-[#4E5E78] dark:text-[#9BB0CD]">
            Track verified monthly contributions, update privacy settings &amp; follow official club notices
          </p>
        </div>
        <DashboardClock />
      </div>

      {/* 2. Elevated Identity Hero + Quick Member Utility Strip */}
      <div className="space-y-3">
        <MemberProfileGreetingHero
          member={myMemberRecord}
          monthlyContribution={myFinancialSummary.monthlyContribution}
          showEmail
          showPrivateDob
        />

        <div className="surface-card rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="font-semibold text-[#0F1B2E] dark:text-slate-200">
              Account Settlement Progress:
            </span>
            <div className="flex items-center gap-2.5">
              <div className="w-32 h-2 rounded-full bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] overflow-hidden">
                <div
                  style={{ width: `${paidProgress}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-[#1D4ED8] to-[#38BDF8]"
                />
              </div>
              <span className="font-mono font-bold tabular-nums text-[#1D4ED8] dark:text-[#38BDF8]">
                {paidProgress}%
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/members/${encodeURIComponent(myMemberRecord.member_code)}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] hover:border-[#1D4ED8] text-[#0F1B2E] dark:text-slate-100 font-semibold transition-colors whitespace-nowrap"
            >
              <QrCode className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#60A5FA]" />
              <span>Public QR Card</span>
            </Link>

            <Link
              to="/member/payment-history"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] hover:border-[#1D4ED8] text-[#0F1B2E] dark:text-slate-100 font-semibold transition-colors whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5 text-[#D6AC62]" />
              <span>Full Payment History</span>
            </Link>

            <Link
              to="/constitution"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1D4ED8]/10 text-[#1D4ED8] dark:text-[#60A5FA] font-bold hover:bg-[#1D4ED8]/15 transition-colors whitespace-nowrap"
            >
              <span>Club Policy</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Personal Financial Summary KPI Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Paid"
          value={formatBDT(myFinancialSummary.totalPaid)}
          subLabel={`${myFinancialSummary.totalPaidMonths} months cleared`}
          icon={Wallet}
          accent="sapphire"
          trend={{
            positive: true,
            text: `${paidProgress}%`,
          }}
        />

        <MetricCard
          label="Total Outstanding"
          value={formatBDT(myFinancialSummary.totalOutstanding)}
          subLabel={`Principal ${formatBDT(myFinancialSummary.principalOutstanding)} · Fine ${formatBDT(myFinancialSummary.totalFinePending)}`}
          icon={AlertCircle}
          accent={myFinancialSummary.totalOutstanding > 0 ? 'rose' : 'navy'}
          trend={{
            positive: myFinancialSummary.totalOutstanding === 0,
            text: myFinancialSummary.totalOutstanding === 0 ? 'Cleared' : `${myFinancialSummary.unpaidMonthsCount} mos`,
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
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[#4E5E78] dark:text-[#9BB0CD]">
              Account Status
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#0F1B33]/8 dark:bg-[#18294A] text-[#0F1B33] dark:text-[#D6AC62] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <StatusBadge status={myFinancialSummary.currentStatus} />
            <span className="text-xs font-mono font-bold tabular-nums text-[#0369A1] dark:text-[#38BDF8]">
              {formatBDT(myFinancialSummary.monthlyContribution)}/mo
            </span>
          </div>
          <div className="mt-3.5 pt-2.5 border-t border-[#DFE6F0] dark:border-[#233452] text-xs text-[#4E5E78] dark:text-[#9BB0CD] font-mono">
            Last payment: {myFinancialSummary.lastPaymentDate ? formatDate(myFinancialSummary.lastPaymentDate) : 'None'}
          </div>
        </div>
      </section>

      {/* 4. Interactive Contribution Analytics + Club Announcements Feed */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 min-w-0">
          <MemberAnalyticsChart
            member={myMemberRecord}
            ledger={myDues}
            summary={myFinancialSummary}
          />
        </div>

        <div className="lg:col-span-4 surface-card rounded-2xl flex flex-col overflow-hidden min-w-0">
          <div className="px-5 py-4 border-b border-[#DFE6F0] dark:border-[#233452] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#D6AC62]/15 text-[#92600A] dark:text-[#F0C56E] flex items-center justify-center shrink-0">
                <Megaphone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#0F1B33] dark:text-white truncate">
                  Club Announcements
                </h3>
                <p className="text-[11px] text-[#4E5E78] dark:text-[#9BB0CD] truncate">
                  Official admin bulletins
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-[#1D4ED8] dark:text-[#60A5FA] tabular-nums shrink-0">
              {announcements.length}
            </span>
          </div>

          {announcements.length === 0 ? (
            <div className="flex-1 py-12 px-5 flex flex-col items-center justify-center text-center text-xs text-[#4E5E78] dark:text-[#9BB0CD] space-y-2">
              <Megaphone className="w-6 h-6 text-[#D6AC62]/60" />
              <p>No announcements published yet.</p>
            </div>
          ) : (
            <div className="flex-1 divide-y divide-[#DFE6F0] dark:divide-[#233452] overflow-y-auto max-h-[380px]">
              {announcements.slice(0, 8).map((ann) => (
                <article
                  key={ann.id}
                  className="p-4 sm:px-5 space-y-1.5 hover:bg-[#EFF3F9]/60 dark:hover:bg-[#17243C]/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                    <span className="font-bold uppercase tracking-wider text-[#92600A] dark:text-[#F0C56E]">
                      {ann.category}
                    </span>
                    <span className="text-[#4E5E78] dark:text-[#9BB0CD]">
                      {formatDate(ann.created_at)}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#0F1B33] dark:text-white leading-snug">
                    {ann.title}
                  </h4>
                  <p className="text-[11px] text-[#4E5E78] dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {ann.body}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 5. Unified Member Desk (Left 5 Cols) & Recent Billing Ledger (Right 7 Cols) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Tabbed Self-Service Desk */}
        <div className="lg:col-span-5 surface-card rounded-2xl overflow-hidden min-w-0">
          <div className="px-5 py-4 border-b border-[#DFE6F0] dark:border-[#233452] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#1D4ED8]/10 text-[#1D4ED8] dark:text-[#60A5FA] flex items-center justify-center shrink-0">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F1B33] dark:text-white">
                    Member Account Desk
                  </h3>
                  <p className="text-[11px] text-[#4E5E78] dark:text-[#9BB0CD]">
                    Profile, privacy, password &amp; treasurer contact
                  </p>
                </div>
              </div>
            </div>

            {/* Segmented Desk Switcher */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setDeskTab('profile')}
                className={`py-1.5 px-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap truncate ${
                  deskTab === 'profile'
                    ? 'bg-white dark:bg-[#1D4ED8] text-[#0F1B33] dark:text-white shadow-2xs font-bold'
                    : 'text-[#4E5E78] dark:text-[#9BB0CD] hover:text-[#0F1B33] dark:hover:text-white'
                }`}
              >
                Profile &amp; Privacy
              </button>
              <button
                type="button"
                onClick={() => setDeskTab('security')}
                className={`py-1.5 px-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap truncate ${
                  deskTab === 'security'
                    ? 'bg-white dark:bg-[#1D4ED8] text-[#0F1B33] dark:text-white shadow-2xs font-bold'
                    : 'text-[#4E5E78] dark:text-[#9BB0CD] hover:text-[#0F1B33] dark:hover:text-white'
                }`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => setDeskTab('treasurer')}
                className={`py-1.5 px-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap truncate ${
                  deskTab === 'treasurer'
                    ? 'bg-white dark:bg-[#1D4ED8] text-[#0F1B33] dark:text-white shadow-2xs font-bold'
                    : 'text-[#4E5E78] dark:text-[#9BB0CD] hover:text-[#0F1B33] dark:hover:text-white'
                }`}
              >
                Message Admin
              </button>
            </div>
          </div>

          <div className="p-5 text-xs">
            {deskTab === 'profile' && (
              <form onSubmit={handleUpdatePersonalProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#0F1B2E] dark:text-slate-300 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="+880 17XX-XXXXXX"
                      className="w-full px-3 py-2.5 bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl font-mono text-xs text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-[#0F1B2E] dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5 text-rose-500" />
                      <span>Blood Group (Public)</span>
                    </label>
                    <select
                      value={bloodGroupInput}
                      onChange={(e) => setBloodGroupInput(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl font-mono text-xs text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8] cursor-pointer"
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
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="font-semibold text-[#0F1B2E] dark:text-slate-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#D6AC62]" />
                      <span>Date of Birth (Private)</span>
                    </label>
                    <span className="text-[10px] font-mono text-[#0369A1] dark:text-[#38BDF8]">
                      Hidden from public &amp; peers
                    </span>
                  </div>
                  <input
                    type="date"
                    value={dobInput}
                    onChange={(e) => setDobInput(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl font-mono text-xs text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
                  />
                </div>

                {profileFeedback && (
                  <div
                    className={`p-3 rounded-xl text-[11px] flex items-start gap-2 ${
                      profileFeedback.type === 'success'
                        ? 'bg-[#1D4ED8]/10 text-[#1D4ED8] dark:text-[#60A5FA] border border-[#1D4ED8]/25'
                        : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                    }`}
                  >
                    {profileFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <span>{profileFeedback.text}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={profileSaving}
                  className="w-full py-2.5 px-4 bg-[#0F1B33] hover:bg-[#18294A] dark:bg-[#1D4ED8] dark:hover:bg-[#1E40AF] text-white font-bold rounded-xl text-xs cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {profileSaving ? 'Saving Profile...' : 'Save Personal Info'}
                </button>
              </form>
            )}

            {deskTab === 'security' && (
              <form onSubmit={handleChangePassword} className="space-y-4">
                {passFeedback && (
                  <div
                    className={`p-3 rounded-xl text-[11px] flex items-start gap-2 ${
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

                <div>
                  <label className="block font-semibold text-[#0F1B2E] dark:text-slate-300 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-3.5 h-3.5 text-[#4E5E78] absolute left-3 top-3" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-xs text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      aria-label="Toggle password visibility"
                      className="absolute right-3 top-2.5 text-[#4E5E78] hover:text-[#0F1B33] dark:hover:text-white cursor-pointer"
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
                      className="w-full pl-9 pr-3 py-2.5 bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-xs text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={passLoading}
                  className="w-full py-2.5 px-4 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {passLoading ? 'Updating...' : 'Update Portal Password'}
                </button>
              </form>
            )}

            {deskTab === 'treasurer' && (
              <form onSubmit={handleSendNotice} className="space-y-4">
                <p className="text-[11px] text-[#4E5E78] dark:text-[#9BB0CD] leading-relaxed">
                  Send a payment confirmation note, bKash/Bank TrxID, or correction request directly to the Club Treasurer dashboard.
                </p>

                <div>
                  <label className="block font-semibold text-[#0F1B2E] dark:text-slate-300 mb-1.5">
                    Message / Transaction Reference
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={noticeMessage}
                    onChange={(e) => setNoticeMessage(e.target.value)}
                    placeholder="e.g. Sent Nov installment ৳500 via bKash TrxID 9X8Y7Z..."
                    className="w-full px-3 py-2.5 bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-xs text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
                  />
                </div>

                {noticeFeedback && (
                  <div
                    className={`p-3 rounded-xl text-[11px] flex items-start gap-2 ${
                      noticeFeedback.type === 'success'
                        ? 'bg-[#1D4ED8]/10 text-[#1D4ED8] dark:text-[#60A5FA] border border-[#1D4ED8]/25'
                        : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{noticeFeedback.text}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={noticeSending}
                  className="w-full py-2.5 px-4 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{noticeSending ? 'Sending...' : 'Send Notice to Treasurer'}</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right: Recent Billing Cycles Table */}
        <div className="lg:col-span-7 surface-card rounded-2xl overflow-hidden min-w-0">
          <div className="px-5 py-4 border-b border-[#DFE6F0] dark:border-[#233452] flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#0F1B33] dark:text-white">
                Recent Billing Cycles
              </h3>
              <p className="text-[11px] text-[#4E5E78] dark:text-[#9BB0CD]">
                Latest 6 monthly contribution &amp; fine periods
              </p>
            </div>
            <Link
              to="/member/payment-history"
              className="text-xs font-semibold text-[#1D4ED8] dark:text-[#60A5FA] hover:underline inline-flex items-center gap-1 whitespace-nowrap"
            >
              <span>Full Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EFF3F9] dark:bg-[#17243C] text-[#4E5E78] dark:text-[#9BB0CD] border-b border-[#DFE6F0] dark:border-[#233452]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Period</th>
                  <th className="py-3 px-4 font-semibold text-right">Due (৳)</th>
                  <th className="py-3 px-4 font-semibold text-right">Fine (৳)</th>
                  <th className="py-3 px-4 font-semibold text-right">Paid (৳)</th>
                  <th className="py-3 px-4 font-semibold text-right">Outstanding</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold">Paid Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DFE6F0] dark:divide-[#233452]">
                {recentDues.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[#4E5E78] dark:text-[#9BB0CD]">
                      No billing records available.
                    </td>
                  </tr>
                ) : (
                  recentDues.map((d) => {
                    const bd = calculateDueBreakdown(d, myMemberRecord.shares_count);
                    return (
                      <tr key={d.id} className="hover:bg-[#EFF3F9]/60 dark:hover:bg-[#17243C]/60 transition-colors">
                        <td className="py-3 px-4 font-semibold text-[#0F1B33] dark:text-white whitespace-nowrap">
                          {getMonthName(d.month)} {d.year}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[#4E5E78] dark:text-slate-300">
                          {formatBDT(bd.principalDue)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[#92600A] dark:text-[#F0C56E]">
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
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-[#0369A1] dark:text-[#38BDF8]">
                          {formatBDT(bd.totalPaid)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-rose-700 dark:text-rose-400">
                          {bd.totalOutstanding > 0 ? formatBDT(bd.totalOutstanding) : '—'}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <StatusBadge status={d.status} size="sm" />
                        </td>
                        <td className="py-3 px-4 font-mono text-[#4E5E78] dark:text-[#9BB0CD] whitespace-nowrap">
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
      </section>
    </PageTransition>
  );
};
