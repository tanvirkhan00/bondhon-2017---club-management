import React, { useState, useMemo } from 'react';
import { useClubData } from '../../hooks/useClubData';
import { Search, Users, ArrowUpDown, Shield, Info } from 'lucide-react';
import { PublicMember } from '../../types';

export const PublicMembers: React.FC = () => {
  const { publicMembers } = useClubData();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'alpha-asc' | 'alpha-desc' | 'code-asc'>('code-asc');

  // Filter & Sort
  const filteredMembers = useMemo(() => {
    return publicMembers
      .filter((m) => {
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
          // by member code
          return a.member_code.localeCompare(b.member_code);
        }
      });
  }, [publicMembers, searchQuery, sortOrder]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8 animate-in fade-in duration-200">
      {/* Title & Privacy Policy Note */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <Users className="w-8 h-8 text-emerald-700 dark:text-emerald-400" />
              <span>Public Member Directory</span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Active members of the Bondhon 2017 community ({publicMembers.length} active members)
            </p>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs self-start sm:self-auto">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>Strict Privacy Protected · Verified Active Roster</span>
          </div>
        </div>

        {/* Privacy Notice Banner */}
        <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            In accordance with club privacy governance, personal contact details, residential addresses, and private financial records are never displayed publicly. Logged-in members can access their own private statement through their account.
          </p>
        </div>
      </div>

      {/* Search and Sort Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search member by name or code (e.g. BND-001)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-slate-900 dark:text-slate-100 placeholder-slate-400"
          />
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
          >
            <option value="code-asc">Sort by Member Code (BND-001)</option>
            <option value="alpha-asc">Sort Alphabetically (A → Z)</option>
            <option value="alpha-desc">Sort Alphabetically (Z → A)</option>
          </select>
        </div>
      </div>

      {/* Members Grid */}
      {filteredMembers.length === 0 ? (
        <div className="py-16 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
          <p className="font-semibold text-slate-700 dark:text-slate-300">No members found</p>
          <p className="text-xs text-slate-400 mt-1">Try searching with a different name or clear your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-center shadow-2xs hover:shadow-md transition-all group flex flex-col items-center"
            >
              {/* Member Photo with Lazy Loading & Default Avatar Fallback */}
              <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-emerald-600/30 flex items-center justify-center text-emerald-800 dark:text-emerald-300 font-bold text-2xl mb-4 overflow-hidden shadow-2xs group-hover:scale-105 transition-transform">
                {member.profile_image_url ? (
                  <img
                    src={member.profile_image_url}
                    alt={member.full_name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback on image error
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  member.full_name.substring(0, 2).toUpperCase()
                )}
              </div>

              {/* Member ID Tag */}
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-mono font-bold tracking-wider mb-2">
                {member.member_code}
              </span>

              {/* Full Name */}
              <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-snug line-clamp-2 px-1">
                {member.full_name}
              </h2>

              {/* Designation */}
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-1">
                {member.designation || 'Active Member'}
              </p>

              {/* Clean Active Badge */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 w-full flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                <span>Verified Member</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
