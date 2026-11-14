import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useClubData } from '../../hooks/useClubData';
import { useAuth } from '../../hooks/useAuth';
import { formatBDT } from '../../utils/formatters';
import {
  Users,
  ShieldCheck,
  Calendar,
  Sparkles,
  ArrowRight,
  Award,
  CheckCircle2,
  AlertTriangle,
  FileText,
  MapPin,
  TrendingUp,
  Coins,
  Crown,
  ChevronRight,
  Calculator,
  Lock,
} from 'lucide-react';
import crestImage from '../../assets/images/bondhon_club_crest_1793703027252.jpg';

export const Home: React.FC = () => {
  const { publicMembers } = useClubData();
  const { isAuthenticated, isAdmin } = useAuth();

  // Joint savings calculator duration state (in months)
  const [calcMonths, setCalcMonths] = useState<number>(12);

  // Executive Committee members
  const executiveMembers = useMemo(() => {
    return publicMembers.filter(
      (m) => m.designation && !m.designation.toLowerCase().startsWith('member')
    );
  }, [publicMembers]);

  // Preview of general members
  const previewGeneralMembers = useMemo(() => {
    return publicMembers
      .filter((m) => !m.designation || m.designation.toLowerCase().startsWith('member'))
      .slice(0, 10);
  }, [publicMembers]);

  // Savings projection calculation based on 34 shares across 21 members
  const totalMembers = publicMembers.length || 21;
  const totalShares = useMemo(() => {
    return publicMembers.reduce((sum, m) => sum + (m.shares_count || 1), 0);
  }, [publicMembers]);
  const monthlyFeePerShare = 500;
  const monthlyTotal = (totalShares || 34) * monthlyFeePerShare; // 34 * 500 = 17,000 Tk/month
  const projectedTotal = monthlyTotal * calcMonths;
  const investmentPool = Math.round(projectedTotal * 0.7);
  const welfarePool = Math.round(projectedTotal * 0.2);
  const reservePool = Math.round(projectedTotal * 0.1);

  return (
    <div className="space-y-16 sm:space-y-24 pb-16 animate-in fade-in duration-300">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-8 sm:pt-14 pb-12 sm:pb-16 bg-gradient-to-b from-emerald-950/20 via-slate-900/10 to-transparent">
        {/* Glow ambient spots */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[360px] bg-emerald-500/10 dark:bg-emerald-500/15 blur-3xl rounded-full pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-left">
              {/* Official Tag */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold backdrop-blur-md">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>বন্ধুত্ব সমবায় সমিতি · এস.এস.সি ব্যাচ ২০১৭ · স্থাপিত: ০১/০৪/২০২৪ ইং</span>
              </div>

              {/* Main Headline */}
              <div className="space-y-2">
                <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12]">
                  Bondhon 2017
                </h1>
                <p className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-emerald-700 via-teal-600 to-emerald-500 dark:from-emerald-400 dark:via-teal-300 dark:to-emerald-200 bg-clip-text text-transparent">
                  বন্ধুত্ব সমবায় সমিতি
                </p>
              </div>

              {/* Tagline / Subtitle */}
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                চরচান্দা খাসমহল বাজার ভিত্তিক এসএসসি ব্যাচ ২০১৭ বন্ধুদের ঐক্যবদ্ধ সমবায় প্ল্যাটফর্ম। পারস্পরিক সঞ্চয় <strong>(মাসিক ৫০০ ৳)</strong>, ১২ তারিখের মধ্যে নিয়মতান্ত্রিক কিস্তি জমাদান এবং সম্পূর্ণ ডিজিটাল হিসাব ব্যবস্থাপনার আধুনিক রূপরেখা।
              </p>

              {/* CTA Group */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to="/members"
                  className="px-6 py-3.5 text-sm font-bold rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:shadow-emerald-600/30 transition-all flex items-center gap-2 group"
                >
                  <Users className="w-4 h-4" />
                  <span>সদস্য তালিকা ({totalMembers})</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  to="/constitution"
                  className="px-5 py-3.5 text-sm font-semibold rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all flex items-center gap-2 shadow-xs"
                >
                  <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>গঠনতন্ত্র ও নীতিমালা</span>
                </Link>

                <Link
                  to={isAuthenticated ? (isAdmin ? '/admin/dashboard' : '/member/profile') : '/login'}
                  className="px-5 py-3.5 text-sm font-semibold rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all flex items-center gap-2"
                >
                  <Lock className="w-4 h-4 text-slate-500" />
                  <span>{isAuthenticated ? 'পোর্টাল ড্যাশবোর্ড' : 'সদস্য লগইন'}</span>
                </Link>
              </div>

              {/* 4 Quantitative Key Metrics */}
              <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-0.5">
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                    {totalMembers}
                  </span>
                  <p className="text-xs text-slate-500 font-medium">সক্রিয় সদস্য সংখ্যা</p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                    ৳৫০০
                  </span>
                  <p className="text-xs text-slate-500 font-medium">মাসিক সঞ্চয় কিস্তি</p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                    ১২ তারিখ
                  </span>
                  <p className="text-xs text-slate-500 font-medium">কিস্তি জমার শেষ দিন</p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-600 dark:text-amber-400 tabular-nums">
                    ১০০%
                  </span>
                  <p className="text-xs text-slate-500 font-medium">স্বচ্ছ ডিজিটাল অডিট</p>
                </div>
              </div>
            </div>

            {/* Right Emblem Showcase */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative">
                {/* Glowing ring under emblem */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-500 to-amber-400 blur-2xl opacity-30 animate-pulse" />

                <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-full p-2 bg-gradient-to-tr from-emerald-600 via-teal-500 to-amber-400 shadow-2xl">
                  <div className="w-full h-full rounded-full overflow-hidden bg-slate-950 p-1 flex items-center justify-center">
                    <img
                      src={crestImage}
                      alt="Bondhon 2017 Official Emblem"
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                </div>

                {/* Floating Location Card */}
                <div className="absolute -bottom-4 -left-4 sm:left-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl p-3 sm:p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      চরচান্দা খাসমহল বাজার
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      সমিতির স্থায়ী কার্যালয়
                    </span>
                  </div>
                </div>

                {/* Floating Verification Badge */}
                <div className="absolute -top-3 -right-3 sm:right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5">
                  <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 block">
                      স্বচ্ছ আর্থিক হিসাব
                    </span>
                    <span className="text-[9px] text-slate-500 block">
                      যাচাইকৃত ডিজিটাল লেজার
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. EXECUTIVE COMMITTEE BOARD (কার্যনির্বাহী পরিষদ) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
              <Crown className="w-4 h-4" />
              <span>ব্যবস্থাপনা কমিটি · ধারা ৩.১</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              কার্যনির্বাহী পরিষদ
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              বন্ধুত্ব সমবায় সমিতির নীতি নির্ধারণ ও আর্থিক পরিচালনা পরিষদ
            </p>
          </div>

          <Link
            to="/about"
            className="text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 flex items-center gap-1 self-start sm:self-auto hover:underline"
          >
            <span>কমিটির দায়িত্ব ও বিবরণ</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Executive Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {executiveMembers.map((officer) => (
            <div
              key={officer.id}
              className="group relative bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800/90 shadow-xs hover:shadow-lg hover:border-amber-400/50 transition-all flex items-center gap-4"
            >
              <div className="relative shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden p-0.5 bg-gradient-to-tr from-amber-400 to-amber-600 shadow-md">
                  <div className="w-full h-full rounded-full overflow-hidden bg-slate-900">
                    {officer.profile_image_url ? (
                      <img
                        src={officer.profile_image_url}
                        alt={officer.full_name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-white">
                        {officer.full_name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-slate-900 text-white font-mono text-[9px] font-bold border border-slate-700">
                  {officer.member_code}
                </span>
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px] font-bold leading-none">
                  {officer.designation}
                </span>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                  {officer.full_name}
                </h3>
                <p className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                  <span>
                    সঞ্চয়: {formatBDT((officer.shares_count || 1) * 500)}/মাস
                    {(officer.shares_count || 1) > 1 ? ` (${officer.shares_count}টি নাম)` : ''}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. INTERACTIVE JOINT SAVINGS & CAPITAL PROJECTION CALCULATOR */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white p-6 sm:p-10 shadow-2xl border border-emerald-800/40">
          {/* Subtle decoration aura */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Controls */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
                <Calculator className="w-3.5 h-3.5" />
                <span>যৌথ সঞ্চয় ও মূলধন প্রক্ষেপণ ক্যালকুলেটর</span>
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  ২১ সদস্যের সম্মিলিত সঞ্চয়ের শক্তি
                </h2>
                <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                  প্রতি শেয়ারে মাসে <strong>৫০০ ৳</strong> সঞ্চয়ের মাধ্যমে ৩৪টি নামে কীভাবে একটি সমৃদ্ধ ও শক্তিশালী সমবায় মূলধন গঠন করা সম্ভব, তা নিচে সময়কাল নির্বাচন করে দেখুন।
                </p>
              </div>

              {/* Timeframe Selector Buttons */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  সময়কাল নির্বাচন করুন:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { label: '৬ মাস', months: 6 },
                    { label: '১ বছর (১২ মাস)', months: 12 },
                    { label: '২ বছর (২৪ মাস)', months: 24 },
                    { label: '৩ বছর (৩৬ মাস)', months: 36 },
                    { label: '৫ বছর (৬০ মাস)', months: 60 },
                  ].map((item) => (
                    <button
                      key={item.months}
                      onClick={() => setCalcMonths(item.months)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        calcMonths === item.months
                          ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold scale-[1.02]'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Key Formula Footnote */}
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-xs text-slate-300 flex items-center justify-between">
                <span>মাসিক যৌথ জমা: ৩৪টি নাম/শেয়ার × ৫০০ ৳ =</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">৳১৭,০০০ / মাস</span>
              </div>
            </div>

            {/* Right Projected Capital Card */}
            <div className="lg:col-span-5 bg-slate-950/80 rounded-2xl p-6 border border-emerald-500/30 backdrop-blur-md shadow-xl space-y-5">
              <div className="border-b border-slate-800 pb-4">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                  {calcMonths} মাসে আনুমানিক মোট সংগৃহীত মূলধন
                </span>
                <div className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-400 mt-1 tabular-nums">
                  {formatBDT(projectedTotal)}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  (২১ জন সদস্যের মোট ৩৪টি নামের নিয়মিত কিস্তির ভিত্তিতে)
                </span>
              </div>

              {/* Fund Distribution Breakdown */}
              <div className="space-y-3">
                <span className="text-xs font-semibold text-slate-300 block">
                  পরিকল্পিত তহবিল বণ্টন রূপরেখা:
                </span>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-200">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <span>উৎপাদনমুখী যৌথ বিনিয়োগ (৭০%)</span>
                    </span>
                    <span className="font-mono font-bold">{formatBDT(investmentPool)}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-200">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
                      <span>জরুরি সামাজিক কল্যাণ তহবিল (২০%)</span>
                    </span>
                    <span className="font-mono font-bold">{formatBDT(welfarePool)}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-200">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span>রিজার্ভ ও জরুরি ব্যাকআপ (১০%)</span>
                    </span>
                    <span className="font-mono font-bold">{formatBDT(reservePool)}</span>
                  </div>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-2 flex overflow-hidden mt-2">
                  <div style={{ width: '70%' }} className="bg-emerald-400" />
                  <div style={{ width: '20%' }} className="bg-teal-400" />
                  <div style={{ width: '10%' }} className="bg-amber-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PUBLIC MEMBER ROSTER PREVIEW (সহ সকল ২১ সদস্য) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">
              <Users className="w-4 h-4" />
              <span>আজ ও আগামী · এস.এস.সি ব্যাচ ২০১৭</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              সম্মানিত সদস্যবৃন্দ ({totalMembers})
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              বন্ধুত্ব সমবায় সমিতি (এস.এস.সি ব্যাচ ২০১৭)-এর সকল {totalMembers} জন সম্মানিত ও সক্রিয় সদস্যের পরিচিতি
            </p>
          </div>

          <Link
            to="/members"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition-colors"
          >
            <span>সম্পূর্ণ ডিরেক্টরি দেখুন ({totalMembers})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Members Grid Preview */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {publicMembers.slice(0, 12).map((member) => {
            const isExec = member.designation && !member.designation.toLowerCase().startsWith('member');

            return (
              <div
                key={member.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-center shadow-2xs hover:shadow-md transition-all group flex flex-col items-center"
              >
                <div className="relative mb-2">
                  <div
                    className={`w-16 h-16 rounded-full overflow-hidden flex items-center justify-center p-0.5 ${
                      isExec
                        ? 'ring-2 ring-amber-400 bg-amber-400'
                        : 'ring-1 ring-emerald-500/40 bg-emerald-600/30'
                    }`}
                  >
                    <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                      {member.profile_image_url ? (
                        <img
                          src={member.profile_image_url}
                          alt={member.full_name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-600">
                          {member.full_name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 font-bold block">
                  {member.member_code}
                </span>

                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate max-w-full mt-0.5">
                  {member.full_name}
                </h4>

                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate max-w-full block mt-0.5">
                  {isExec ? member.designation?.split('(')[0] : 'সদস্য'}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. CONSTITUTION PILLARS & FINANCIAL DISCIPLINE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              গঠনতন্ত্রের মূল আর্থিক বিধিমালা
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              সকল সদস্যের জন্য সমভাবে প্রযোজ্য এবং শতভাগ বাধ্যতামূলক নিয়মসমূহ
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Coins className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">ধারা ৪.১.১</span>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                মাসিক কিস্তি ৫০০ ৳
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                প্রতি মাসের <strong>১২ তারিখের মধ্যে</strong> প্রত্যেক সদস্যের জন্য নির্ধারিত সঞ্চয় কিস্তি ৫০০ টাকা ব্যাংকে বা কোষাধ্যক্ষের নিকট জমাদান বাধ্যতামূলক।
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-bold text-rose-700 dark:text-rose-400">ধারা ৪.১.২</span>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                বিলম্ব জরিমানা ৫০ ৳
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                ১২ তারিখের পরে কোনো সদস্য কিস্তি জমা দিলে মূল কিস্তির সাথে অতিরিক্ত <strong>৫০ টাকা বিলম্ব জরিমানা</strong> বাধ্যতামূলকভাবে কার্যকর হইবে।
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-400">ধারা ১.৩ ও ৩.৩</span>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                স্বচ্ছ হিসাব ও যৌথ কল্যাণ
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                সকল জমার হিসাব ক্লাবের সুরক্ষিত পোর্টালে রিয়েলটাইমে সংরক্ষিত থাকে, যা প্রত্যেক সদস্য ব্যক্তিগত আইডি দিয়ে লগইন করে যাচাই করতে পারেন।
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. BOTTOM BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-950 text-white rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center md:text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              আপনার সদস্য হিসাব বিবরণী দেখুন
            </h2>
            <p className="text-sm text-emerald-100 max-w-xl leading-relaxed">
              বন্ধুত্ব সমবায় সমিতির নিবন্ধিত সদস্যরা নিজস্ব পাসওয়ার্ড দিয়ে লগইন করে মাসিক কিস্তি স্থিতি, পরিশোধিত রসিদ ও বাৎসরিক বিবরণী ডাউনলোড করতে পারেন।
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
            <Link
              to="/login"
              className="px-6 py-3 rounded-xl bg-white text-emerald-950 font-bold text-sm hover:bg-emerald-50 transition-colors shadow-md"
            >
              সদস্য লগইন করুন
            </Link>
            <Link
              to="/constitution"
              className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-colors border border-white/20"
            >
              গঠনতন্ত্র দেখুন
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
