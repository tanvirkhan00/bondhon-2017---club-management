import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useClubData } from '../../hooks/useClubData';
import { useAuth } from '../../hooks/useAuth';
import { formatBDT } from '../../utils/formatters';
import { PageTransition, RevealSection, AnimatedNumber } from '../../components/ui/MotionPrimitives';
import {
  Users,
  ShieldCheck,
  ArrowRight,
  AlertTriangle,
  FileText,
  MapPin,
  TrendingUp,
  Coins,
  Crown,
  ChevronRight,
  Calculator,
  Lock,
  Banknote,
  Landmark,
  Smartphone,
  Trophy,
  Copy,
  Check,
  Info,
} from 'lucide-react';
import crestImage from '../../assets/images/bondhon_club_crest_1793703027252.jpg';

export const Home: React.FC = () => {
  const { publicMembers, publicClubHighlights } = useClubData();
  const { isAuthenticated, isAdmin } = useAuth();
  const [copiedField, setCopiedField] = useState<'mobile' | 'bank' | null>(null);

  const handleCopyText = async (text: string, field: 'mobile' | 'bank') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField((prev) => (prev === field ? null : prev)), 2000);
    } catch {
      // ignore clipboard denial in restricted iframe
    }
  };

  // Joint savings calculator duration state (in months)
  const [calcMonths, setCalcMonths] = useState<number>(12);

  // Executive Committee members
  const executiveMembers = useMemo(() => {
    return publicMembers.filter(
      (m) => m.designation && !m.designation.toLowerCase().startsWith('member')
    );
  }, [publicMembers]);

  // Savings projection calculation based on 34 shares across 21 members
  const totalMembers = publicMembers.length || 21;
  const totalShares = useMemo(() => {
    return publicMembers.reduce((sum, m) => sum + (m.shares_count || 1), 0);
  }, [publicMembers]);
  const monthlyFeePerShare = 500;
  const monthlyTotal = (totalShares || 34) * monthlyFeePerShare;
  const projectedTotal = monthlyTotal * calcMonths;
  const investmentPool = Math.round(projectedTotal * 0.7);
  const welfarePool = Math.round(projectedTotal * 0.2);
  const reservePool = Math.round(projectedTotal * 0.1);

  return (
    <PageTransition className="space-y-16 sm:space-y-24 pb-16">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-white dark:bg-[#111B2E] border-b border-[#DFE6F0] dark:border-[#233452] pt-10 sm:pt-16 pb-12 sm:pb-20">
        {/* Subtle architectural dot/grid line overlay */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.035] dark:opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(#0F1B33 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[#1D4ED8] dark:text-[#60A5FA] flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span>বন্ধুত্ব সমবায় সমিতি</span>
                <span className="text-[#D6AC62]">·</span>
                <span>এস.এস.সি ব্যাচ ২০১৭</span>
                <span className="text-[#D6AC62]">·</span>
                <span>স্থাপিত: ০১/০৪/২০২৪ ইং</span>
              </div>

              <div className="space-y-2">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0F1B33] dark:text-white leading-[1.08]">
                  Bondhon 2017
                </h1>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1D4ED8] dark:text-[#60A5FA]">
                  বন্ধুত্ব সমবায় সমিতি
                </p>
              </div>

              <p className="text-base sm:text-lg text-[#4E5E78] dark:text-slate-300 leading-relaxed max-w-2xl">
                চরচান্দা খাসমহল বাজার ভিত্তিক এস.এস.সি ব্যাচ ২০১৭-এর সমবায় ও সামাজিক উন্নয়ন প্ল্যাটফর্ম। নিয়মিত সঞ্চয়, স্বচ্ছ ডিজিটাল হিসাবরক্ষণ ও পারস্পরিক আস্থার সম্মিলিত উদ্যোগ।
              </p>

              {/* CTA Group */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  to="/members"
                  className="px-6 py-3.5 text-sm font-bold rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white shadow-sm hover:shadow-md transition-all flex items-center gap-2 group whitespace-nowrap"
                >
                  <Users className="w-4 h-4" />
                  <span>সদস্য তালিকা ({totalMembers})</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  to="/constitution"
                  className="px-5 py-3.5 text-sm font-semibold rounded-xl bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] text-[#0F1B2E] dark:text-slate-100 hover:border-[#0F1B33]/30 transition-all flex items-center gap-2 whitespace-nowrap"
                >
                  <FileText className="w-4 h-4 text-[#1D4ED8] dark:text-[#60A5FA]" />
                  <span>গঠনতন্ত্র ও নীতিমালা</span>
                </Link>

                <Link
                  to={isAuthenticated ? (isAdmin ? '/admin/dashboard' : '/member/profile') : '/login'}
                  className="px-5 py-3.5 text-sm font-semibold rounded-xl bg-[#0F1B33] hover:bg-[#18294A] text-white transition-all flex items-center gap-2 whitespace-nowrap"
                >
                  <Lock className="w-4 h-4 text-[#D6AC62]" />
                  <span>{isAuthenticated ? 'পোর্টাল ড্যাশবোর্ড' : 'সদস্য লগইন'}</span>
                </Link>
              </div>

              {/* 4 Quantitative Key Metrics */}
              <div className="pt-6 border-t border-[#DFE6F0] dark:border-[#233452] grid grid-cols-2 sm:grid-cols-4 gap-5">
                <div>
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono text-[#0F1B33] dark:text-white tabular-nums block">
                    <AnimatedNumber value={totalMembers} />
                  </span>
                  <span className="text-xs text-[#4E5E78] dark:text-slate-400 font-medium">সক্রিয় সদস্য</span>
                </div>

                <div>
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono text-[#0369A1] dark:text-[#38BDF8] tabular-nums block">
                    ৳৫০০
                  </span>
                  <span className="text-xs text-[#4E5E78] dark:text-slate-400 font-medium">মাসিক কিস্তি / নাম</span>
                </div>

                <div>
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono text-[#0F1B33] dark:text-white tabular-nums block">
                    ১২ তারিখ
                  </span>
                  <span className="text-xs text-[#4E5E78] dark:text-slate-400 font-medium">জমার শেষ সময়</span>
                </div>

                <div>
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono text-[#92600A] dark:text-[#F0C56E] tabular-nums block">
                    ১০০%
                  </span>
                  <span className="text-xs text-[#4E5E78] dark:text-slate-400 font-medium">স্বচ্ছ ডিজিটাল অডিট</span>
                </div>
              </div>
            </div>

            {/* Right Framed Crest Showcase */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative p-6 sm:p-8">
                {/* Geometric Navy & Gold Medallion Ring */}
                <div className="relative w-60 h-60 sm:w-76 sm:h-76 rounded-full p-2.5 bg-gradient-to-br from-[#0F1B33] via-[#18294A] to-[#1D4ED8] ring-4 ring-[#D6AC62]/35 shadow-[0_24px_60px_-15px_rgba(20,36,58,0.28)]">
                  <div className="w-full h-full rounded-full overflow-hidden bg-[#0F1B33] p-1">
                    <img
                      src={crestImage}
                      alt="Bondhon 2017 Official Emblem"
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                </div>

                {/* Floating Office Location Card */}
                <div className="surface-card absolute bottom-1 -left-2 sm:left-0 rounded-2xl p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1D4ED8]/10 text-[#1D4ED8] dark:text-[#60A5FA] flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#0F1B33] dark:text-white block">
                      চরচান্দা খাসমহল বাজার
                    </span>
                    <span className="text-[11px] text-[#4E5E78] block">
                      সমিতির স্থায়ী কার্যালয়
                    </span>
                  </div>
                </div>

                {/* Floating Verified Ledger Card */}
                <div className="surface-card absolute top-2 -right-2 sm:right-0 rounded-2xl p-3 flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-[#1D4ED8] dark:text-[#60A5FA] shrink-0" />
                  <div>
                    <span className="text-[11px] font-bold text-[#0F1B33] dark:text-white block">
                      স্বচ্ছ আর্থিক হিসাব
                    </span>
                    <span className="text-[10px] text-[#4E5E78] block">
                      যাচাইকৃত ডিজিটাল লেজার
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. LIVE FINANCIAL HIGHLIGHTS & TOP FINE CONTRIBUTOR */}
      <RevealSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1D4ED8] dark:text-[#60A5FA] block mb-1">
              স্বচ্ছ তহবিল বিবরণী · লাইভ পরিসংখ্যান
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F1B33] dark:text-white tracking-tight">
              সমিতির মোট সংগ্রহ ও জরিমানা হিসাব
            </h2>
          </div>
          <Link
            to={isAuthenticated ? (isAdmin ? '/admin/fines' : '/member/payment-history') : '/login'}
            className="text-xs sm:text-sm font-semibold text-[#1D4ED8] dark:text-[#60A5FA] hover:underline inline-flex items-center gap-1 self-start sm:self-auto"
          >
            <span>বিস্তারিত লেজার দেখুন</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Net Club Available Balance */}
          <div className="surface-card surface-card-hover rounded-2xl p-6 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#4E5E78] dark:text-slate-400">
                নিট বর্তমান তহবিল (Available Balance)
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#1D4ED8]/10 text-[#1D4ED8] dark:text-[#60A5FA] flex items-center justify-center shrink-0">
                <Banknote className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono text-[#0369A1] dark:text-[#38BDF8] tabular-nums">
                {formatBDT(publicClubHighlights.netClubAvailableBalance)}
              </div>
              <p className="text-xs text-[#4E5E78] dark:text-slate-400 mt-2 font-mono tabular-nums">
                মোট সংগ্রহ: {formatBDT(publicClubHighlights.totalCollected)} (মূল:{' '}
                {formatBDT(publicClubHighlights.totalPrincipalCollected)} · জরিমানা:{' '}
                {formatBDT(publicClubHighlights.totalFineCollected)})
              </p>
              {(publicClubHighlights.totalBankCharges > 0 ||
                publicClubHighlights.totalClubExpenses > 0 ||
                publicClubHighlights.totalBankInterest > 0) && (
                <p className="text-[11px] text-[#4E5E78] dark:text-slate-400 mt-1 font-mono tabular-nums">
                  {publicClubHighlights.totalBankInterest > 0 && (
                    <span className="text-[#0369A1] dark:text-[#38BDF8] font-semibold">
                      +মুনাফা: {formatBDT(publicClubHighlights.totalBankInterest)}
                    </span>
                  )}
                  {publicClubHighlights.totalBankInterest > 0 &&
                    (publicClubHighlights.totalBankCharges > 0 ||
                      publicClubHighlights.totalClubExpenses > 0) &&
                    ' · '}
                  {(publicClubHighlights.totalBankCharges > 0 ||
                    publicClubHighlights.totalClubExpenses > 0) && (
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                      -চার্জ ও খরচ:{' '}
                      {formatBDT(
                        publicClubHighlights.totalBankCharges +
                          publicClubHighlights.totalClubExpenses
                      )}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Card 2: Total Fine Collections */}
          <div className="surface-card surface-card-hover rounded-2xl p-6 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#4E5E78] dark:text-slate-400">
                মোট জরিমানা আদায় (Fine Collections)
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#D6AC62]/15 text-[#92600A] dark:text-[#F0C56E] flex items-center justify-center shrink-0">
                <Coins className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono text-[#92600A] dark:text-[#F0C56E] tabular-nums">
                {formatBDT(publicClubHighlights.totalFineCollected)}
              </div>
              <p className="text-xs text-[#4E5E78] dark:text-slate-400 mt-2">
                ১২ তারিখের পর বিলম্ব পরিশোধের জরিমানা (৳৫০/নাম) থেকে সংগৃহীত
              </p>
            </div>
          </div>

          {/* Card 3: Top Fine Contributor */}
          <div className="surface-card surface-card-hover rounded-2xl p-6 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#4E5E78] dark:text-slate-400">
                সর্বোচ্চ জরিমানা প্রদানকারী (Top Contributor)
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#0F1B33]/10 dark:bg-[#18294A] text-[#0F1B33] dark:text-[#D6AC62] flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
            </div>

            {publicClubHighlights.topFineContributors.length > 0 ? (
              <div className="space-y-3">
                {(() => {
                  const top = publicClubHighlights.topFineContributors[0];
                  return (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-100 dark:bg-[#18294A] ring-2 ring-[#D6AC62]/50 shrink-0 flex items-center justify-center">
                          {top.profile_image_url ? (
                            <img
                              src={top.profile_image_url}
                              alt={top.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs font-bold text-[#0F1B33] dark:text-slate-200">
                              {top.full_name.substring(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-[#0F1B33] dark:text-white truncate">
                            {top.full_name}
                          </h3>
                          <span className="text-[11px] font-mono text-[#4E5E78] block">
                            {top.member_code} · {top.fined_months} মাস
                          </span>
                        </div>
                      </div>
                      <span className="font-mono font-extrabold text-lg text-[#0F1B33] dark:text-[#D6AC62] tabular-nums shrink-0">
                        {formatBDT(top.total_fine_paid)}
                      </span>
                    </div>
                  );
                })()}

                {publicClubHighlights.topFineContributors.length > 1 && (
                  <div className="pt-2.5 border-t border-[#DFE6F0] dark:border-[#233452] space-y-1 text-[11px] text-[#4E5E78] dark:text-slate-400">
                    {publicClubHighlights.topFineContributors.slice(1, 3).map((runner, idx) => (
                      <div key={runner.member_id} className="flex items-center justify-between gap-2">
                        <span className="truncate">
                          {idx + 2}. {runner.full_name} ({runner.member_code})
                        </span>
                        <span className="font-mono font-semibold text-[#0F1B2E] dark:text-slate-200 tabular-nums shrink-0">
                          {formatBDT(runner.total_fine_paid)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="text-base font-bold text-[#0F1B33] dark:text-slate-200">
                  এখনো কোনো জরিমানা রেকর্ড নেই
                </div>
                <p className="text-xs text-[#4E5E78] dark:text-slate-400 mt-1">
                  সকল সদস্য সময়মতো মাসিক সঞ্চয় কিস্তি পরিশোধ করেছেন।
                </p>
              </div>
            )}
          </div>
        </div>
      </RevealSection>

      {/* 3. EXECUTIVE COMMITTEE BOARD */}
      <RevealSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#92600A] dark:text-[#F0C56E] mb-1">
              <Crown className="w-4 h-4" />
              <span>ব্যবস্থাপনা কমিটি · ধারা ৩.১</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F1B33] dark:text-white tracking-tight">
              কার্যনির্বাহী পরিষদ
            </h2>
            <p className="text-sm text-[#4E5E78] dark:text-slate-400 mt-1">
              বন্ধুত্ব সমবায় সমিতির নীতি নির্ধারণ ও আর্থিক পরিচালনা পরিষদ
            </p>
          </div>

          <Link
            to="/about"
            className="text-xs sm:text-sm font-semibold text-[#1D4ED8] dark:text-[#60A5FA] flex items-center gap-1 self-start sm:self-auto hover:underline"
          >
            <span>কমিটির দায়িত্ব ও বিবরণ</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Clean Executive Cards (Zero pill sandwiches) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {executiveMembers.map((officer) => (
            <div
              key={officer.id}
              className="surface-card surface-card-hover rounded-2xl p-5 flex items-center gap-4 group"
            >
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full overflow-hidden ring-2 ring-[#D6AC62] bg-[#0F1B33] shrink-0">
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

              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-[11px] font-mono font-bold text-[#92600A] dark:text-[#F0C56E] truncate">
                  {officer.member_code} · {officer.designation}
                </div>
                <h3 className="font-bold text-[#0F1B33] dark:text-white text-base truncate group-hover:text-[#1D4ED8] dark:group-hover:text-[#60A5FA] transition-colors">
                  {officer.full_name}
                </h3>
                <p className="text-xs text-[#4E5E78] dark:text-slate-400 font-mono tabular-nums">
                  সঞ্চয়: {formatBDT((officer.shares_count || 1) * 500)}/মাস
                  {(officer.shares_count || 1) > 1 ? ` · ${officer.shares_count}টি নাম` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      </RevealSection>

      {/* 4. INTERACTIVE JOINT SAVINGS PROJECTION CALCULATOR */}
      <RevealSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-[#0F1B33] text-white p-6 sm:p-10 shadow-[0_24px_60px_-20px_rgba(20,36,58,0.45)] border border-[#18294A]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Controls */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 text-[#D6AC62] text-xs font-mono font-bold uppercase tracking-wider">
                <Calculator className="w-4 h-4" />
                <span>যৌথ সঞ্চয় ও মূলধন প্রক্ষেপণ ক্যালকুলেটর</span>
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  ২১ সদস্যের সম্মিলিত সঞ্চয়ের শক্তি
                </h2>
                <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                  প্রতি শেয়ারে মাসে <strong className="text-white">৫০০ ৳</strong> সঞ্চয়ের মাধ্যমে ৩৪টি নামে কীভাবে একটি সমৃদ্ধ ও শক্তিশালী সমবায় মূলধন গঠন করা সম্ভব, তা নিচে সময়কাল নির্বাচন করে দেখুন।
                </p>
              </div>

              {/* Timeframe Selector */}
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
                      type="button"
                      onClick={() => setCalcMonths(item.months)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        calcMonths === item.months
                          ? 'bg-[#1D4ED8] text-white ring-2 ring-[#D6AC62]/60 shadow-md'
                          : 'bg-[#18294A] hover:bg-[#223862] text-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 bg-[#09101D]/60 rounded-xl border border-[#223862] text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2">
                <span>মাসিক যৌথ জমা: ৩৪টি নাম/শেয়ার × ৫০০ ৳ =</span>
                <span className="font-mono font-bold text-[#D6AC62] text-sm tabular-nums">
                  ৳১৭,০০০ / মাস
                </span>
              </div>
            </div>

            {/* Right Projected Capital Card */}
            <div className="lg:col-span-5 bg-[#09101D]/90 rounded-2xl p-6 border border-[#18294A] space-y-5">
              <div className="border-b border-[#18294A] pb-4">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                  {calcMonths} মাসে আনুমানিক মোট সংগৃহীত মূলধন
                </span>
                <div className="text-3xl sm:text-4xl font-extrabold font-mono text-[#38BDF8] mt-1 tabular-nums">
                  {formatBDT(projectedTotal)}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  (২১ জন সদস্যের মোট ৩৪টি নামের নিয়মিত কিস্তির ভিত্তিতে)
                </span>
              </div>

              <div className="space-y-3">
                <span className="text-xs font-semibold text-slate-300 block">
                  পরিকল্পিত তহবিল বণ্টন রূপরেখা:
                </span>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-200">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#1D4ED8]" />
                      <span>উৎপাদনমুখী যৌথ বিনিয়োগ (৭০%)</span>
                    </span>
                    <span className="font-mono font-bold tabular-nums">{formatBDT(investmentPool)}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-200">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#D6AC62]" />
                      <span>জরুরি সামাজিক কল্যাণ তহবিল (২০%)</span>
                    </span>
                    <span className="font-mono font-bold tabular-nums">{formatBDT(welfarePool)}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-200">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm bg-slate-400" />
                      <span>রিজার্ভ ও জরুরি ব্যাকআপ (১০%)</span>
                    </span>
                    <span className="font-mono font-bold tabular-nums">{formatBDT(reservePool)}</span>
                  </div>
                </div>

                <div className="w-full bg-[#18294A] rounded-full h-2.5 flex overflow-hidden mt-2">
                  <div style={{ width: '70%' }} className="bg-[#1D4ED8]" />
                  <div style={{ width: '20%' }} className="bg-[#D6AC62]" />
                  <div style={{ width: '10%' }} className="bg-slate-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </RevealSection>

      {/* 5. PUBLIC MEMBER ROSTER PREVIEW */}
      <RevealSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#1D4ED8] dark:text-[#60A5FA] mb-1">
              <Users className="w-4 h-4" />
              <span>আজ ও আগামী · এস.এস.সি ব্যাচ ২০১৭</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F1B33] dark:text-white tracking-tight">
              সম্মানিত সদস্যবৃন্দ ({totalMembers})
            </h2>
            <p className="text-sm text-[#4E5E78] dark:text-slate-400 mt-1">
              বন্ধুত্ব সমবায় সমিতি (এস.এস.সি ব্যাচ ২০১৭)-এর সকল {totalMembers} জন সম্মানিত ও সক্রিয় সদস্যের পরিচিতি
            </p>
          </div>

          <Link
            to="/members"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#111B2E] border border-[#DFE6F0] dark:border-[#233452] text-[#0F1B33] dark:text-slate-100 text-xs font-bold hover:border-[#1D4ED8] transition-colors self-start sm:self-auto"
          >
            <span>সম্পূর্ণ ডিরেক্টরি দেখুন ({totalMembers})</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#60A5FA]" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {publicMembers.slice(0, 12).map((member) => {
            const isExec = member.designation && !member.designation.toLowerCase().startsWith('member');

            return (
              <div
                key={member.id}
                className="surface-card surface-card-hover rounded-2xl p-4 text-center flex flex-col items-center"
              >
                <div
                  className={`w-16 h-16 rounded-full overflow-hidden mb-3 bg-slate-100 dark:bg-[#17243C] ${
                    isExec ? 'ring-2 ring-[#D6AC62]' : 'ring-1 ring-[#1D4ED8]/40'
                  }`}
                >
                  {member.profile_image_url ? (
                    <img
                      src={member.profile_image_url}
                      alt={member.full_name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[#0F1B33] dark:text-slate-200">
                      {member.full_name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                <span className="font-mono text-[10px] text-[#4E5E78] font-bold">
                  {member.member_code}
                </span>

                <h4 className="font-bold text-[#0F1B33] dark:text-slate-100 text-xs truncate max-w-full mt-0.5">
                  {member.full_name}
                </h4>

                <span
                  className={`text-[10px] font-semibold truncate max-w-full mt-0.5 ${
                    isExec ? 'text-[#92600A] dark:text-[#F0C56E]' : 'text-[#1D4ED8] dark:text-[#60A5FA]'
                  }`}
                >
                  {isExec ? member.designation?.split('(')[0] : 'সদস্য'}
                </span>
              </div>
            );
          })}
        </div>
      </RevealSection>

      {/* 6. CONSTITUTION FINANCIAL PILLARS */}
      <RevealSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="surface-card rounded-3xl p-6 sm:p-10 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1D4ED8] dark:text-[#60A5FA]">
              গঠনতন্ত্র ও শৃঙ্খলা
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F1B33] dark:text-white tracking-tight">
              সমিতির মূল আর্থিক বিধিমালা
            </h2>
            <p className="text-xs sm:text-sm text-[#4E5E78] dark:text-slate-400">
              সকল সদস্যের জন্য সমভাবে প্রযোজ্য এবং শতভাগ বাধ্যতামূলক নিয়মসমূহ
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#1D4ED8]/10 text-[#1D4ED8] dark:text-[#60A5FA] flex items-center justify-center">
                  <Coins className="w-5 h-5" />
                </div>
                <span className="text-xs font-mono font-bold text-[#1D4ED8] dark:text-[#60A5FA]">
                  ধারা ৪.১.১
                </span>
              </div>
              <h3 className="text-base font-bold text-[#0F1B33] dark:text-white">
                মাসিক কিস্তি ৫০০ ৳
              </h3>
              <p className="text-xs text-[#4E5E78] dark:text-slate-300 leading-relaxed">
                প্রতি মাসের <strong className="text-[#0F1B2E] dark:text-white">১২ তারিখের মধ্যে</strong> প্রত্যেক সদস্যের জন্য নির্ধারিত সঞ্চয় কিস্তি ৫০০ টাকা ব্যাংকে বা কোষাধ্যক্ষের নিকট জমাদান বাধ্যতামূলক।
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-400 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <span className="text-xs font-mono font-bold text-rose-700 dark:text-rose-400">
                  ধারা ৪.১.২
                </span>
              </div>
              <h3 className="text-base font-bold text-[#0F1B33] dark:text-white">
                বিলম্ব জরিমানা ৫০ ৳
              </h3>
              <p className="text-xs text-[#4E5E78] dark:text-slate-300 leading-relaxed">
                ১২ তারিখের পরে কোনো সদস্য কিস্তি জমা দিলে মূল কিস্তির সাথে অতিরিক্ত <strong className="text-[#0F1B2E] dark:text-white">৫০ টাকা বিলম্ব জরিমানা</strong> বাধ্যতামূলকভাবে কার্যকর হইবে।
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#D6AC62]/15 text-[#92600A] dark:text-[#F0C56E] flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-xs font-mono font-bold text-[#92600A] dark:text-[#F0C56E]">
                  ধারা ১.৩ ও ৩.৩
                </span>
              </div>
              <h3 className="text-base font-bold text-[#0F1B33] dark:text-white">
                স্বচ্ছ হিসাব ও যৌথ কল্যাণ
              </h3>
              <p className="text-xs text-[#4E5E78] dark:text-slate-300 leading-relaxed">
                সকল জমার হিসাব ক্লাবের সুরক্ষিত পোর্টালে রিয়েলটাইমে সংরক্ষিত থাকে, যা প্রত্যেক সদস্য ব্যক্তিগত আইডি দিয়ে লগইন করে যাচাই করতে পারেন।
              </p>
            </div>
          </div>
        </div>
      </RevealSection>

      {/* 7. HOW TO SUBMIT CLUB CONTRIBUTIONS */}
      <RevealSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1D4ED8] dark:text-[#60A5FA] block mb-1">
            অফিসিয়াল পেমেন্ট নির্দেশিকা · কোষাধ্যক্ষ ও ব্যাংক
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F1B33] dark:text-white tracking-tight">
            সমিতির টাকা জমাদানের মাধ্যম ও নিয়মাবলি
          </h2>
          <p className="text-xs sm:text-sm text-[#4E5E78] dark:text-slate-400 mt-1">
            মাসিক কিস্তি ও জরিমানার টাকা নিচের নির্ধারিত মোবাইল ব্যাংকিং বা সোনালী ব্যাংক অ্যাকাউন্টে জমা দিন
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mobile Banking Card */}
          <div className="surface-card rounded-2xl p-6 flex flex-col justify-between gap-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 block">
                  bKash · Nagad · Rocket (Personal)
                </span>
                <h3 className="text-lg font-bold text-[#0F1B33] dark:text-white">
                  Tanvir Khan (Treasurer)
                </h3>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] flex items-center justify-between gap-3">
              <div>
                <span className="text-[11px] text-[#4E5E78] block">মোবাইল ব্যাংকিং নম্বর</span>
                <span className="text-xl sm:text-2xl font-extrabold font-mono text-[#0F1B33] dark:text-white tracking-wide tabular-nums">
                  01959948542
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyText('01959948542', 'mobile')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-[#111B2E] border border-[#DFE6F0] dark:border-[#233452] text-[#0F1B2E] dark:text-slate-200 hover:border-[#1D4ED8] transition-colors cursor-pointer shrink-0"
              >
                {copiedField === 'mobile' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#60A5FA]" />
                    <span className="text-[#1D4ED8] dark:text-[#60A5FA]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-[#4E5E78] dark:text-slate-400 leading-relaxed">
              <strong className="text-[#0F1B2E] dark:text-slate-200">bKash / Nagad / Rocket</strong>-এ Send Money বা Cash In করার সময় অবশ্যই উত্তোলন খরচসহ পাঠাবেন।
            </p>
          </div>

          {/* Sonali Bank PLC Card */}
          <div className="surface-card rounded-2xl p-6 flex flex-col justify-between gap-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#1D4ED8]/10 text-[#1D4ED8] dark:text-[#60A5FA] flex items-center justify-center shrink-0">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#1D4ED8] dark:text-[#60A5FA] block">
                  Official Bank Deposit Account
                </span>
                <h3 className="text-lg font-bold text-[#0F1B33] dark:text-white">
                  Sonali Bank PLC
                </h3>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[11px] text-[#4E5E78] block">ব্যাংক অ্যাকাউন্ট নম্বর</span>
                <span className="text-xl sm:text-2xl font-extrabold font-mono text-[#0369A1] dark:text-[#38BDF8] tracking-wide tabular-nums block truncate">
                  2102201027292
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyText('2102201027292', 'bank')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-[#111B2E] border border-[#DFE6F0] dark:border-[#233452] text-[#0F1B2E] dark:text-slate-200 hover:border-[#1D4ED8] transition-colors cursor-pointer shrink-0"
              >
                {copiedField === 'bank' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#60A5FA]" />
                    <span className="text-[#1D4ED8] dark:text-[#60A5FA]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#4E5E78] dark:text-slate-400">
              <div>
                <span className="text-[#4E5E78] block text-[11px]">শাখা (Branch)</span>
                <span className="font-semibold text-[#0F1B2E] dark:text-slate-200">
                  Bhedarganj Branch, Shariatpur
                </span>
              </div>
              <div>
                <span className="text-[#4E5E78] block text-[11px]">অ্যাকাউন্ট নাম (Account Name)</span>
                <span className="font-semibold text-[#0F1B2E] dark:text-slate-200">
                  jafor saikot dhali tanvir khan
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mandatory Payment Notes */}
        <div className="rounded-2xl bg-[#D6AC62]/12 dark:bg-[#D6AC62]/10 border border-[#D6AC62]/40 p-5 flex items-start gap-3.5">
          <Info className="w-5 h-5 text-[#92600A] dark:text-[#F0C56E] shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-xs sm:text-sm text-[#0F1B2E] dark:text-slate-200">
            <p className="font-bold text-[#0F1B33] dark:text-[#D6AC62]">গুরুত্বপূর্ণ নির্দেশনা (Note):</p>
            <ul className="space-y-1 list-disc list-inside text-[#0F1B2E]/90 dark:text-slate-300">
              <li>
                টাকা পাঠানোর (Send) পর অবশ্যই <strong>Treasurer (কোষাধ্যক্ষ)-এর সাথে inbox-এ confirm</strong> করতে হবে।
              </li>
              <li>
                <strong>bKash / Nagad / Rocket</strong>-এ টাকা পাঠালে অবশ্যই <strong>খরচসহ (Send Charge সহ)</strong> পাঠাতে হবে, অন্যথায় তা বকেয়া হিসেবে consider করা হবে।
              </li>
            </ul>
          </div>
        </div>
      </RevealSection>

      {/* 8. BOTTOM CALL TO ACTION */}
      <RevealSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 bg-gradient-to-br from-[#0F1B33] via-[#18294A] to-[#0F1B33] text-white rounded-3xl shadow-xl border border-[#223862] flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center md:text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              আপনার সদস্য হিসাব বিবরণী দেখুন
            </h2>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              বন্ধুত্ব সমবায় সমিতির নিবন্ধিত সদস্যরা নিজস্ব পাসওয়ার্ড দিয়ে লগইন করে মাসিক কিস্তি স্থিতি, পরিশোধিত রসিদ ও বাৎসরিক বিবরণী যাচাই করতে পারেন।
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
            <Link
              to="/login"
              className="px-6 py-3 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-bold text-sm transition-colors shadow-md"
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
      </RevealSection>
    </PageTransition>
  );
};
