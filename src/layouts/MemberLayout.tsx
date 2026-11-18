import React from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useClubData } from '../hooks/useClubData';
import { User, History, LogOut, ArrowLeft, ShieldCheck } from 'lucide-react';
import crestImage from '../assets/images/bondhon_club_crest_1793703027252.jpg';

export const MemberLayout: React.FC = () => {
  const { user, profile, isAdmin, signOut } = useAuth();
  const { myMemberRecord, logMemberActivity } = useClubData();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const actorName = myMemberRecord?.full_name || profile?.full_name || user?.email || 'Member';
    const actorCode = myMemberRecord?.member_code || null;
    await logMemberActivity({
      actorUserId: user?.id || null,
      memberId: myMemberRecord?.id || null,
      memberCode: actorCode,
      memberName: actorName,
      eventType: 'member_logout',
      title: 'সদস্য পোর্টাল লগআউট',
      message: `${actorName}${actorCode ? ` (${actorCode})` : ''} সদস্য পোর্টাল থেকে লগআউট করেছেন।`,
    });
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7FB] dark:bg-[#09101D] text-[#0F1B2E] dark:text-[#F3F6FC]">
      {/* Top Banner & Header */}
      <header className="bg-white/95 dark:bg-[#111B2E]/95 backdrop-blur-md border-b border-[#DFE6F0] dark:border-[#233452] sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Left: Brand */}
            <Link to="/" className="flex items-center gap-2.5 group shrink-0">
              <img
                src={crestImage}
                alt="Bondhon 2017"
                className="w-9 h-9 rounded-full object-cover ring-2 ring-[#D6AC62]/50"
              />
              <div className="hidden sm:block">
                <span className="font-extrabold text-[#0F1B33] dark:text-white text-sm block leading-tight">
                  Bondhon 2017
                </span>
                <span className="text-[10px] font-mono text-[#1D4ED8] dark:text-[#60A5FA] font-bold uppercase tracking-wider">
                  Member Portal
                </span>
              </div>
            </Link>

            {/* Right: Member Context & Actions */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="text-right min-w-0">
                <span className="text-xs font-bold text-[#0F1B33] dark:text-white block truncate max-w-[140px] sm:max-w-[220px]">
                  {myMemberRecord?.full_name || profile?.full_name || 'Member'}
                </span>
                <span className="text-[11px] font-mono text-[#0369A1] dark:text-[#38BDF8] block truncate">
                  {myMemberRecord?.member_code || 'Active'} · {myMemberRecord?.designation || 'Member'}
                </span>
              </div>

              {isAdmin && (
                <Link
                  to="/admin/dashboard"
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#0F1B33] text-white rounded-xl hover:bg-[#18294A] transition-colors whitespace-nowrap"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#D6AC62]" />
                  <span>Admin Dashboard</span>
                </Link>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors border border-rose-200/70 dark:border-rose-900/40 cursor-pointer shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 -mb-px overflow-x-auto">
            <NavLink
              to="/member/profile"
              end
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-[#1D4ED8] text-[#1D4ED8] dark:border-[#60A5FA] dark:text-[#60A5FA]'
                    : 'border-transparent text-[#4E5E78] dark:text-[#9BB0CD] hover:text-[#0F1B33] dark:hover:text-white'
                }`
              }
            >
              <User className="w-4 h-4" />
              <span>Personal Profile</span>
            </NavLink>

            <NavLink
              to="/member/payment-history"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-[#1D4ED8] text-[#1D4ED8] dark:border-[#60A5FA] dark:text-[#60A5FA]'
                    : 'border-transparent text-[#4E5E78] dark:text-[#9BB0CD] hover:text-[#0F1B33] dark:hover:text-white'
                }`
              }
            >
              <History className="w-4 h-4" />
              <span>My Payment History</span>
            </NavLink>

            <Link
              to="/"
              className="ml-auto text-xs font-medium text-[#4E5E78] dark:text-[#9BB0CD] hover:text-[#0F1B33] dark:hover:text-white py-3 px-2 flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Public Site</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 min-w-0">
        <Outlet />
      </main>

      {/* Quiet Member Portal Footer */}
      <footer className="border-t border-[#DFE6F0] dark:border-[#233452] bg-white/60 dark:bg-[#111B2E]/60 py-4 text-center text-xs text-[#4E5E78] dark:text-[#9BB0CD]">
        <p>Bondhon 2017 Member Portal · Verified Financial Ledger · BDT (৳)</p>
      </footer>
    </div>
  );
};
