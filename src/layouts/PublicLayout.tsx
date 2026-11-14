import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Menu, X, LogIn, ShieldCheck, User as UserIcon, Heart, ExternalLink } from 'lucide-react';
import crestImage from '../assets/images/bondhon_club_crest_1793703027252.jpg';

export const PublicLayout: React.FC = () => {
  const { isAuthenticated, isAdmin, profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/about', label: 'About Club' },
    { to: '/members', label: 'Member Directory' },
    { to: '/constitution', label: 'Constitution' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Bar Contract (3 zones) */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-8 h-16">
            {/* Zone 1: Brand Wordmark */}
            <Link to="/" className="flex items-center gap-3 text-left focus:outline-hidden group">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-emerald-600/30 shrink-0 bg-emerald-900 shadow-xs">
                <img
                  src={crestImage}
                  alt="Bondhon 2017 Official Logo"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                  Bondhon 2017
                </span>
                <span className="text-[10px] text-slate-500 font-medium tracking-wider uppercase -mt-1 hidden sm:block">
                  বন্ধুত্ব সমবায় সমিতি · চরচান্দা
                </span>
              </div>
            </Link>

            {/* Zone 2: Navigation Links (Single-line) */}
            <nav className="hidden md:flex items-center gap-2 text-sm font-medium">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            {/* Zone 3: Primary Action / Auth */}
            <div className="flex items-center gap-3 shrink-0">
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <Link
                    to={isAdmin ? '/admin/dashboard' : '/member/profile'}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors shadow-2xs whitespace-nowrap"
                  >
                    {isAdmin ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Admin Dashboard</span>
                      </>
                    ) : (
                      <>
                        <UserIcon className="w-3.5 h-3.5" />
                        <span>My Portal</span>
                      </>
                    )}
                  </Link>

                  <button
                    onClick={() => signOut()}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs transition-colors whitespace-nowrap shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Member Login</span>
                </Link>
              )}

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile drawer */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-slate-200 dark:border-slate-800 py-3 space-y-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-center px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
                >
                  {isAuthenticated ? 'Go to Account Portal' : 'Member Login'}
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Public Viewport */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Public Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src={crestImage}
                  alt="Bondhon 2017 Crest"
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Bondhon 2017
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
                <strong>বন্ধুত্ব সমবায় সমিতি</strong> (Bondhon 2017) · এস.এস.সি ব্যাচ ২০১৭। চরচান্দা খাসমহল বাজার। স্থাপিত: ০১/০৪/২০২৪ ইং। পারস্পরিক সঞ্চয়, আর্থিক স্বচ্ছতা ও সামাজিক কল্যাণ।
              </p>
              <div className="text-xs text-slate-400">
                মাসিক সঞ্চয় কিস্তি: <span className="font-semibold text-emerald-700 dark:text-emerald-400">৫০০ ৳</span> (প্রতি মাসের ১২ তারিখের মধ্যে জমাদান বাধ্যতামূলক, বিলম্ব ফি ৫০ ৳)
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3">
                Public Navigation
              </h3>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <li><Link to="/" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">Home Page</Link></li>
                <li><Link to="/about" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">About History & Mission</Link></li>
                <li><Link to="/members" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">Public Member Directory</Link></li>
                <li><Link to="/constitution" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors font-medium text-emerald-600">গঠনতন্ত্র ও নীতিমালা (Constitution)</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3">
                Member Access
              </h3>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <li><Link to="/login" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">Member Sign In</Link></li>
                <li><Link to="/member/profile" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">Personal Profile</Link></li>
                <li><Link to="/member/payment-history" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">Payment Ledger</Link></li>
                <li><Link to="/admin/dashboard" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">Admin Console</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <p>© {new Date().getFullYear()} Bondhon 2017 · বন্ধুত্ব সমবায় সমিতি। সর্বস্বত্ব সংরক্ষিত।</p>
            <p className="flex items-center gap-1">
              চরচান্দা খাসমহল বাজার · এস.এস.সি ব্যাচ ২০১৭
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
