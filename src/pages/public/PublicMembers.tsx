import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useClubData } from '../../hooks/useClubData';
import { PageTransition } from '../../components/ui/MotionPrimitives';
import {
  Search,
  Users,
  ArrowUpDown,
  Shield,
  Crown,
  CheckCircle2,
  Award,
} from 'lucide-react';

export const PublicMembers: React.FC = () => {
  const { publicMembers } = useClubData();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'executive' | 'general'>('all');
  const [sortOrder, setSortOrder] = useState<'code-asc' | 'alpha-asc' | 'alpha-desc'>('code-asc');

  const filteredMembers = useMemo(() => {
    return publicMembers
      .filter((m) => {
        const isExec = m.designation && !m.designation.toLowerCase().startsWith('member');
        if (categoryFilter === 'executive' && !isExec) return false;
        if (categoryFilter === 'general' && isExec) return false;

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
    <PageTransition className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
      {/* Header & Official Info Banner */}
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#DFE6F0] dark:border-[#233452]">
          <div className="space-y-1.5">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1D4ED8] dark:text-[#60A5FA] block">
              বন্ধুত্ব সমবায় সমিতি · এস.এস.সি ব্যাচ ২০১৭
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0F1B33] dark:text-white flex flex-wrap items-baseline gap-3">
              <span>সদস্য ডিরেক্টরি</span>
              <span className="text-sm sm:text-base font-mono font-semibold text-[#4E5E78]">
                ({publicMembers.length} Active Members)
              </span>
            </h1>
            <p className="text-sm text-[#4E5E78] dark:text-slate-400 max-w-2xl">
              চরচান্দা খাসমহল বাজার ভিত্তিক বন্ধুত্ব সমবায় সমিতির সকল আজীবন সম্মানিত সদস্য ও নির্বাচিত কার্যনির্বাহী পরিষদের পূর্ণাঙ্গ তালিকা।
            </p>
          </div>

          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#0F1B33] text-white border border-[#18294A] text-xs shrink-0 self-start lg:self-auto shadow-sm">
            <Shield className="w-4 h-4 text-[#D6AC62] shrink-0" />
            <div>
              <div className="font-semibold">অফিসিয়াল সদস্য তথ্য</div>
              <div className="text-[11px] font-mono text-slate-300">
                নির্ধারিত মাসিক সঞ্চয়: ৫০০ ৳ · ১২ তারিখ জমাদান
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="surface-card flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 rounded-2xl">
          {/* Category Segmented Controls */}
          <div className="flex items-center gap-1 p-1 bg-[#EFF3F9] dark:bg-[#17243C] rounded-xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                categoryFilter === 'all'
                  ? 'bg-white dark:bg-[#111B2E] text-[#0F1B33] dark:text-white shadow-xs'
                  : 'text-[#4E5E78] hover:text-[#0F1B33] dark:hover:text-white'
              }`}
            >
              সকল সদস্য ({publicMembers.length})
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('executive')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                categoryFilter === 'executive'
                  ? 'bg-[#0F1B33] text-[#D6AC62] shadow-xs font-bold'
                  : 'text-[#4E5E78] hover:text-[#0F1B33] dark:hover:text-white'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>নির্বাহী কমিটি ({execCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('general')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                categoryFilter === 'general'
                  ? 'bg-white dark:bg-[#111B2E] text-[#0F1B33] dark:text-white shadow-xs'
                  : 'text-[#4E5E78] hover:text-[#0F1B33] dark:hover:text-white'
              }`}
            >
              সাধারণ সদস্য ({generalCount})
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative w-full sm:w-64 lg:w-72">
              <Search className="w-4 h-4 text-[#4E5E78] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="সদস্যের নাম বা কোড খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8] text-[#0F1B2E] dark:text-slate-100 placeholder-[#4E5E78]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#4E5E78] shrink-0" />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'code-asc' | 'alpha-asc' | 'alpha-desc')}
                className="w-full sm:w-auto text-xs bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl px-3 py-2 text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden cursor-pointer"
              >
                <option value="code-asc" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">সিরিয়াল কোড (BND-001)</option>
                <option value="alpha-asc" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">নাম (A → Z)</option>
                <option value="alpha-desc" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">নাম (Z → A)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Members Grid (Zero-Pill Clean Cards) */}
      {filteredMembers.length === 0 ? (
        <div className="surface-card py-16 px-4 text-center rounded-3xl border-dashed">
          <Users className="w-12 h-12 mx-auto text-[#4E5E78]/40 mb-3" />
          <p className="font-bold text-[#0F1B33] dark:text-slate-200 text-base">
            কোনো সদস্য খুঁজে পাওয়া যায়নি
          </p>
          <p className="text-xs text-[#4E5E78] mt-1">
            অনুগ্রহ করে সঠিক নাম বা কোড দিয়ে পুনরায় চেষ্টা করুন।
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredMembers.map((member) => {
            const isExecutive =
              member.designation && !member.designation.toLowerCase().startsWith('member');

            return (
              <div
                key={member.id}
                className={`surface-card surface-card-hover group rounded-2xl p-5 flex flex-col items-center text-center ${
                  isExecutive ? 'ring-1 ring-[#D6AC62]/50' : ''
                }`}
              >
                {/* Avatar Portrait */}
                <div className="relative mb-3.5 mt-1">
                  <div
                    className={`w-24 h-24 rounded-full overflow-hidden bg-[#EFF3F9] dark:bg-[#17243C] transition-transform duration-300 group-hover:scale-105 ${
                      isExecutive
                        ? 'ring-3 ring-[#D6AC62]'
                        : 'ring-2 ring-[#1D4ED8]/35 dark:ring-[#60A5FA]/35'
                    }`}
                  >
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
                      <div className="w-full h-full flex items-center justify-center text-xl font-bold text-[#0F1B33] dark:text-slate-300">
                        {member.full_name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Unboxed Monospace Metadata Line */}
                <div className="text-[11px] font-mono font-bold text-[#4E5E78] dark:text-slate-400 flex items-center gap-1.5">
                  <span className="text-[#0F1B33] dark:text-slate-200">{member.member_code}</span>
                </div>

                {/* Name */}
                <h3 className="font-bold text-[#0F1B33] dark:text-white text-base leading-snug mt-1 line-clamp-1 group-hover:text-[#1D4ED8] dark:group-hover:text-[#60A5FA] transition-colors">
                  {member.full_name}
                </h3>

                {/* Role / Designation */}
                <p
                  className={`mt-1.5 text-xs font-semibold flex items-center gap-1 ${
                    isExecutive
                      ? 'text-[#92600A] dark:text-[#F0C56E]'
                      : 'text-[#1D4ED8] dark:text-[#60A5FA]'
                  }`}
                >
                  {isExecutive && <Crown className="w-3 h-3 shrink-0" />}
                  <span>{member.designation || 'Member (সদস্য)'}</span>
                </p>

                {/* Card Footer */}
                <div className="mt-4 pt-3 border-t border-[#DFE6F0] dark:border-[#233452] w-full flex items-center justify-between text-[11px]">
                  <span className="font-mono text-[#4E5E78] dark:text-slate-400">
                    এস.এস.সি ২০১৭
                  </span>
                  <span className="flex items-center gap-1 text-[#1D4ED8] dark:text-[#60A5FA] font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>সক্রিয়</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Club Constitution Reference Banner */}
      <div className="p-6 sm:p-8 bg-[#0F1B33] text-white rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl border border-[#18294A]">
        <div className="space-y-1.5 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 text-[#D6AC62] text-xs font-mono font-semibold">
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

        <Link
          to="/constitution"
          className="px-5 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-bold text-xs shadow-sm transition-colors whitespace-nowrap shrink-0"
        >
          গঠনতন্ত্র বিস্তারিত পড়ুন
        </Link>
      </div>
    </PageTransition>
  );
};
