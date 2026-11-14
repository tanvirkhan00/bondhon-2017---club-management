import React, { useState, useMemo } from 'react';
import { useClubData } from '../../hooks/useClubData';
import {
  Search,
  Users,
  ArrowUpDown,
  Shield,
  Info,
  Crown,
  CheckCircle2,
  Phone,
  Sparkles,
  Award,
} from 'lucide-react';
import { PublicMember } from '../../types';

export const PublicMembers: React.FC = () => {
  const { publicMembers } = useClubData();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'executive' | 'general'>('all');
  const [sortOrder, setSortOrder] = useState<'code-asc' | 'alpha-asc' | 'alpha-desc'>('code-asc');

  // Filter & Sort
  const filteredMembers = useMemo(() => {
    return publicMembers
      .filter((m) => {
        // Category filter
        const isExec = m.designation && !m.designation.toLowerCase().startsWith('member');
        if (categoryFilter === 'executive' && !isExec) return false;
        if (categoryFilter === 'general' && isExec) return false;

        // Search query
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        return (
          m.full_name.toLowerCase().includes(query) ||
          m.member_code.toLowerCase().includes(query) ||
          (m.designation && m.designation.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => {
        if (sortOrder === 'alpha-asc') {
          return a.full_name.localeCompare(b.full_name);
        } else if (sortOrder === 'alpha-desc') {
          return b.full_name.localeCompare(a.full_name);
        } else {
          return a.member_code.localeCompare(b.member_code);
        }
      });
  }, [publicMembers, searchQuery, categoryFilter, sortOrder]);

  const execCount = useMemo(() => {
    return publicMembers.filter((m) => m.designation && !m.designation.toLowerCase().startsWith('member')).length;
  }, [publicMembers]);

  const generalCount = publicMembers.length - execCount;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10 animate-in fade-in duration-200">
      {/* Editorial Title & Overview */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>বন্ধুত্ব সমবায় সমিতি · এস.এস.সি ব্যাচ ২০১৭</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <span>সদস্য ডিরেক্টরি</span>
              <span className="text-sm sm:text-base font-normal text-slate-500 dark:text-slate-400 font-mono">
                ({publicMembers.length} Active Members)
              </span>
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              চরচান্দা খাসমহল বাজার ভিত্তিক বন্ধুত্ব সমবায় সমিতির সকল আজীবন সম্মানিত সদস্য ও নির্বাচিত কার্যনির্বাহী পরিষদের পূর্ণাঙ্গ তালিকা।
            </p>
          </div>

          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-slate-800 border border-slate-700/60 text-xs shrink-0 self-start lg:self-auto shadow-sm">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="font-semibold text-slate-100">অফিসিয়াল সদস্য তথ্য</div>
              <div className="text-[10px] text-slate-400">নির্ধারিত মাসিক সঞ্চয়: ৫০০ ৳ · ১২ তারিখ জমাদান</div>
            </div>
          </div>
        </div>

        {/* Filter Badges & Search Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white dark:bg-slate-900/90 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs backdrop-blur-sm">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl overflow-x-auto">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                categoryFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              সকল সদস্য ({publicMembers.length})
            </button>
            <button
              onClick={() => setCategoryFilter('executive')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                categoryFilter === 'executive'
                  ? 'bg-amber-500 text-white shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>নির্বাহী কমিটি ({execCount})</span>
            </button>
            <button
              onClick={() => setCategoryFilter('general')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                categoryFilter === 'general'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              সাধারণ সদস্য ({generalCount})
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64 lg:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="সদস্যের নাম বা কোড খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-slate-900 dark:text-slate-100 placeholder-slate-400"
              />
            </div>

            {/* Sorting Dropdown */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="w-full sm:w-auto text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
              >
                <option value="code-asc">সিরিয়াল কোড (BND-001)</option>
                <option value="alpha-asc">নাম (A → Z)</option>
                <option value="alpha-desc">নাম (Z → A)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Members Grid */}
      {filteredMembers.length === 0 ? (
        <div className="py-20 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
          <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
          <p className="font-semibold text-slate-700 dark:text-slate-300 text-base">কোনো সদস্য খুঁজে পাওয়া যায়নি</p>
          <p className="text-xs text-slate-400 mt-1">অনুগ্রহ করে সঠিক নাম বা কোড দিয়ে পুনরায় চেষ্টা করুন।</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredMembers.map((member) => {
            const isExecutive = member.designation && !member.designation.toLowerCase().startsWith('member');

            return (
              <div
                key={member.id}
                className={`group relative bg-white dark:bg-slate-900 rounded-3xl p-5 border transition-all duration-200 flex flex-col items-center text-center shadow-xs hover:shadow-lg hover:-translate-y-0.5 ${
                  isExecutive
                    ? 'border-amber-300/80 dark:border-amber-500/30 bg-radial-[at_top_right] from-amber-50/40 via-white to-white dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900 ring-1 ring-amber-400/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500/40'
                }`}
              >
                {/* Executive Crown Marker */}
                {isExecutive && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/20">
                    <Crown className="w-3 h-3" />
                    <span>কমিটি</span>
                  </div>
                )}

                {/* Member Photo Frame */}
                <div className="relative mb-4 mt-1">
                  <div
                    className={`w-28 h-28 rounded-full overflow-hidden flex items-center justify-center p-0.5 shadow-md transition-transform duration-300 group-hover:scale-105 ${
                      isExecutive
                        ? 'ring-3 ring-amber-400 bg-linear-to-tr from-amber-400 to-amber-600'
                        : 'ring-2 ring-emerald-600/40 bg-linear-to-tr from-emerald-500 to-teal-400'
                    }`}
                  >
                    <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                      {member.profile_image_url ? (
                        <img
                          src={member.profile_image_url}
                          alt={member.full_name}
                          loading="lazy"
                          className="w-full h-full object-cover object-center"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl font-bold text-slate-600 dark:text-slate-300">
                          {member.full_name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Serial Code Badge */}
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-mono font-bold rounded-full shadow-xs whitespace-nowrap border border-slate-700">
                    {member.member_code}
                  </span>
                </div>

                {/* Name */}
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-snug mt-2 line-clamp-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                  {member.full_name}
                </h3>

                {/* Father's Name */}
                {member.father_name && (
                  <p className="text-[11px] text-slate-400 font-normal mt-0.5 truncate max-w-full">
                    পিতা: {member.father_name}
                  </p>
                )}

                {/* Designation */}
                <div className="mt-1 flex flex-wrap items-center justify-center gap-1">
                  <span
                    className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      isExecutive
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/50'
                        : 'text-emerald-700 dark:text-emerald-400 font-medium'
                    }`}
                  >
                    {member.designation || 'Member (সদস্য)'}
                  </span>
                  {member.shares_count && member.shares_count > 1 && (
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/40">
                      {member.shares_count}টি নাম
                    </span>
                  )}
                </div>

                {/* Card Footer / Details */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 w-full flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-mono text-slate-600 dark:text-slate-400 font-semibold">
                    মাসিক: ৳{((member.shares_count || 1) * 500).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>সক্রিয় সদস্য</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Club Constitution Reference Banner */}
      <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl border border-emerald-800/40">
        <div className="space-y-1.5 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 text-emerald-400 text-xs font-semibold">
            <Award className="w-4 h-4" />
            <span>গঠনতন্ত্র ধারা ২ ও ৩ মোতাবেক পরিচালিত</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            বন্ধুত্ব সমবায় সমিতি (এস.এস.সি ব্যাচ ২০১৭)
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            সকল ২১ জন সদস্য সমবায় নীতিমালা অনুসরণ করে নিয়মিত কিস্তি জমাদান ও পারস্পরিক উন্নয়ন নিশ্চিত করছেন।
          </p>
        </div>

        <a
          href="/constitution"
          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-md transition-colors whitespace-nowrap shrink-0"
        >
          গঠনতন্ত্র বিস্তারিত পড়ুন
        </a>
      </div>
    </div>
  );
};
