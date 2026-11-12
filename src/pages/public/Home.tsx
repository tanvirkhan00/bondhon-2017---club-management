import React from 'react';
import { Link } from 'react-router-dom';
import { useClubData } from '../../hooks/useClubData';
import { useAuth } from '../../hooks/useAuth';
import {
  Users,
  ShieldCheck,
  Heart,
  Calendar,
  Sparkles,
  ArrowRight,
  Award,
  CheckCircle2,
  HandHeart,
  Trophy,
  FileText,
} from 'lucide-react';
import crestImage from '../../assets/images/bondhon_club_crest_1793703027252.jpg';

export const Home: React.FC = () => {
  const { publicMembers } = useClubData();
  const { isAuthenticated, isAdmin } = useAuth();

  const previewMembers = publicMembers.slice(0, 8);

  return (
    <div className="space-y-16 sm:space-y-24 py-8 sm:py-12 animate-in fade-in duration-200">
      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>বন্ধুত্ব সমবায় সমিতি (এস.এস.সি ব্যাচ ২০১৭) · স্থাপিত: ০১/০৪/২০২৪ ইং</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-slate-100 text-balance leading-tight">
              Bondhon 2017
              <span className="block text-emerald-700 dark:text-emerald-400 text-2xl sm:text-4xl lg:text-5xl font-medium mt-2">
                বন্ধুত্ব সমবায় সমিতি
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              Welcome to the official platform of <strong>বন্ধুত্ব সমবায় সমিতি</strong> (Bondhon 2017), চরচান্দা খাসমহল বাজার। Established by SSC Batch 2017 friends with mutual trust, monthly savings (১২ তারিখের মধ্যে কিস্তি), and transparent financial management in BDT (৳).
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/members"
                className="px-5 py-3 text-sm font-semibold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-all hover:shadow-md flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                <span>সদস্য তালিকা ({publicMembers.length})</span>
              </Link>

              <Link
                to="/constitution"
                className="px-5 py-3 text-sm font-semibold rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors flex items-center gap-2"
              >
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>গঠনতন্ত্র ও নীতিমালা</span>
              </Link>

              <Link
                to={isAuthenticated ? (isAdmin ? '/admin/dashboard' : '/member/profile') : '/login'}
                className="px-5 py-3 text-sm font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-center gap-2"
              >
                <span>{isAuthenticated ? 'অ্যাকাউন্ট পোর্টাল' : 'সদস্য লগইন'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Quick trust metrics */}
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-4 max-w-md">
              <div>
                <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                  {publicMembers.length}+
                </span>
                <p className="text-xs text-slate-500 mt-0.5">Active Members</p>
              </div>
              <div>
                <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                  2017
                </span>
                <p className="text-xs text-slate-500 mt-0.5">Founding Year</p>
              </div>
              <div>
                <span className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
                  100%
                </span>
                <p className="text-xs text-slate-500 mt-0.5">Auditable Dues (৳)</p>
              </div>
            </div>
          </div>

          {/* Crest & Visual Anchor */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative">
              <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-full overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 ring-4 ring-emerald-600/20 bg-emerald-950 flex items-center justify-center p-2">
                <img
                  src={crestImage}
                  alt="Bondhon 2017 Official Logo"
                  className="w-full h-full object-cover rounded-full"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-4 right-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg rounded-xl p-3 flex items-center gap-3">
                <ShieldCheck className="w-8 h-8 text-emerald-600" />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    PostgreSQL RLS Secured
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Zero Private Data Leakage
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT TEASER & CORE VALUES */}
      <section className="bg-white dark:bg-slate-900/60 border-y border-slate-200 dark:border-slate-800 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Our Vision, Mission & Brotherhood
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Preserving friendship across decades while positively contributing to society.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Heart className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Lifelong Friendship
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Formed by friends united in 2017, Bondhon creates a permanent platform for regular meetups, family reunions, and supporting every member through life's milestones.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
                <HandHeart className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Community Welfare
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Beyond brotherhood, we pool collective contributions in BDT (৳) to support flood relief, winter blanket distribution, student stipends, and medical assistance in Bangladesh.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Financial Transparency
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Every member can view real-time monthly collection reports, target reconciliations, and audit histories directly on their personal portal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PUBLIC DIRECTORY PREVIEW */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Active Member Directory
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Proud active members of the Bondhon 2017 fraternity.
            </p>
          </div>

          <Link
            to="/members"
            className="text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 inline-flex items-center gap-1 hover:underline"
          >
            <span>View All {publicMembers.length} Members</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {previewMembers.map((member) => (
            <div
              key={member.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-center shadow-2xs hover:shadow-sm transition-all"
            >
              <div className="w-20 h-20 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-emerald-600/30 flex items-center justify-center text-emerald-800 dark:text-emerald-300 font-bold text-xl mb-3 overflow-hidden shadow-2xs">
                {member.profile_image_url ? (
                  <img
                    src={member.profile_image_url}
                    alt={member.full_name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  member.full_name.substring(0, 2).toUpperCase()
                )}
              </div>

              <span className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold rounded mb-1.5">
                {member.member_code}
              </span>

              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
                {member.full_name}
              </h3>

              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                {member.designation || 'Member'}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* COMMUNITY WELFARE HIGHLIGHTS */}
      <section className="bg-emerald-900 text-white py-16 px-4 sm:px-6 lg:px-8 rounded-3xl max-w-7xl mx-auto shadow-xl">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <Trophy className="w-12 h-12 text-emerald-300 mx-auto" />
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
            10 Years of Bondhon Heritage (2017–2026)
          </h2>
          <p className="text-emerald-100 text-sm sm:text-base leading-relaxed">
            From our founding batch in 2017 to organizing annual Iftar mahfils, picnic tours, relief missions, and mutual welfare funds, Bondhon stands as an emblem of enduring unity.
          </p>
          <div className="pt-2">
            <Link
              to="/about"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-emerald-900 font-semibold text-sm hover:bg-emerald-50 transition-colors shadow-sm"
            >
              <span>Read Full Club History</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
