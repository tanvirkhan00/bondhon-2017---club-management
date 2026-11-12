import React from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useClubData } from '../hooks/useClubData';
import { User, History, LogOut, ArrowLeft, ShieldCheck, CreditCard } from 'lucide-react';
import crestImage from '../assets/images/bondhon_club_crest_1793703027252.jpg';

export const MemberLayout: React.FC = () => {
  const { profile, isAdmin, signOut } = useAuth();
  const { myMemberRecord, myFinancialSummary } = useClubData();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Banner & Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Left: Brand & Return */}
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2.5 group">
                <img
                  src={crestImage}
                  alt="Bondhon 2017"
                  className="w-9 h-9 rounded-full object-cover border border-emerald-600/30"
                />
                <div className="hidden sm:block">
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-sm block leading-tight">
                    Bondhon 2017
                  </span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold uppercase tracking-wider">
                    Member Portal
                  </span>
                </div>
              </Link>
            </div>

            {/* Middle: Member Context */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                  {myMemberRecord?.full_name || profile?.full_name || 'Member'}
                </span>
                <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                  {myMemberRecord?.member_code || 'ID: Active'} · {myMemberRecord?.designation || 'Member'}
                </span>
              </div>

              {isAdmin && (
                <Link
                  to="/admin/dashboard"
                  className="hidden md:flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md hover:bg-emerald-100 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin Dashboard</span>
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors border border-rose-200/60 dark:border-rose-900/40"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 pt-1 -mb-px">
            <NavLink
              to="/member/profile"
              end
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
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
                    ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`
              }
            >
              <History className="w-4 h-4" />
              <span>My Payment History</span>
            </NavLink>

            <Link
              to="/"
              className="ml-auto text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 py-3 px-2 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Public Site</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>

      {/* Quiet Member Portal Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-4 text-center text-xs text-slate-400">
        <p>Bondhon 2017 Private Member Portal · Read-only personal financial records · Currency: BDT (৳)</p>
      </footer>
    </div>
  );
};
