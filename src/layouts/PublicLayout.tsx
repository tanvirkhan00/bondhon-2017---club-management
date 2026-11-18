import React, { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { Menu, X, LogIn, ShieldCheck, User as UserIcon, LogOut, MapPin } from 'lucide-react';
import crestImage from '../assets/images/bondhon_club_crest_1793703027252.jpg';

export const PublicLayout: React.FC = () => {
  const { isAuthenticated, isAdmin, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/about', label: 'About Club' },
    { to: '/members', label: 'Member Directory' },
    { to: '/constitution', label: 'Constitution' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7FB] dark:bg-[#09101D] text-[#0F1B2E] dark:text-[#F3F6FC]">
      {/* Top Bar Contract (3 cleanly separated zones) */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#111B2E]/95 backdrop-blur-md border-b border-[#DFE6F0] dark:border-[#233452] print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-6 h-16">
            {/* Zone 1: Single-line Brand Wordmark */}
            <Link
              to="/"
              className="flex items-center gap-2.5 text-left focus:outline-hidden group shrink-0"
            >
              <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-[#D6AC62]/50 shrink-0 bg-[#0F1B33] shadow-xs transition-transform duration-200 group-hover:scale-105">
                <img
                  src={crestImage}
                  alt="Bondhon 2017 Official Logo"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="text-base sm:text-lg font-extrabold tracking-tight text-[#0F1B33] dark:text-white whitespace-nowrap shrink-0 group-hover:text-[#1D4ED8] dark:group-hover:text-[#60A5FA] transition-colors">
                Bondhon 2017
              </span>
            </Link>

            {/* Zone 2: Single-line Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) =>
                    `relative px-3.5 py-2 rounded-lg text-xs lg:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'text-[#1D4ED8] dark:text-[#60A5FA] bg-[#1D4ED8]/10 dark:bg-[#60A5FA]/15'
                        : 'text-[#4E5E78] dark:text-slate-300 hover:text-[#0F1B33] dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-[#18294A]/60'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            {/* Zone 3: Auth Primary Action & Mobile Drawer Trigger */}
            <div className="flex items-center gap-2.5 shrink-0">
              {isAuthenticated ? (
                <div className="hidden sm:flex items-center gap-2">
                  <Link
                    to={isAdmin ? '/admin/dashboard' : '/member/profile'}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white transition-colors shadow-xs whitespace-nowrap"
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
                    type="button"
                    onClick={() => signOut()}
                    title="Logout"
                    aria-label="Logout"
                    className="p-2 rounded-xl text-[#4E5E78] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-xl shadow-xs transition-all hover:shadow-sm whitespace-nowrap shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Member Login</span>
                </Link>
              )}

              {/* Mobile hamburger */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[#0F1B33] dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#18294A] transition-colors cursor-pointer"
                aria-label="Toggle navigation menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="md:hidden overflow-hidden border-t border-[#DFE6F0] dark:border-[#233452] bg-white dark:bg-[#111B2E]"
            >
              <div className="px-4 py-3 space-y-1">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === '/'}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center min-h-[44px] px-3.5 rounded-xl text-sm font-semibold transition-colors ${
                        isActive
                          ? 'bg-[#1D4ED8]/10 text-[#1D4ED8] dark:text-[#60A5FA]'
                          : 'text-[#4E5E78] dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#18294A]/50'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}

                <div className="pt-2.5 mt-2 border-t border-[#DFE6F0] dark:border-[#233452] flex flex-col gap-2">
                  {isAuthenticated ? (
                    <>
                      <Link
                        to={isAdmin ? '/admin/dashboard' : '/member/profile'}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-center gap-2 min-h-[44px] px-4 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-xl"
                      >
                        {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                        <span>{isAdmin ? 'Admin Dashboard' : 'My Member Portal'}</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          signOut();
                        }}
                        className="min-h-[44px] px-4 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/30 rounded-xl"
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-2 min-h-[44px] px-4 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-xl"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Member Login</span>
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Public Viewport */}
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>

      {/* Institutional Navy Footer */}
      <footer className="bg-[#0F1B33] text-slate-300 border-t border-[#18294A] py-12 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-[#18294A]">
            <div className="md:col-span-5 space-y-3.5">
              <div className="flex items-center gap-3">
                <img
                  src={crestImage}
                  alt="Bondhon 2017 Crest"
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-[#D6AC62]/60"
                />
                <div>
                  <span className="text-base font-bold text-white block leading-tight">
                    Bondhon 2017
                  </span>
                  <span className="text-xs text-[#D6AC62] font-medium">
                    বন্ধুত্ব সমবায় সমিতি · এস.এস.সি ব্যাচ ২০১৭
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-300/85 max-w-md leading-relaxed">
                চরচান্দা খাসমহল বাজার ভিত্তিক একটি নিবন্ধিত যৌথ সঞ্চয় ও সামাজিক কল্যাণমূলক সমবায় সংগঠন। স্থাপিত: ০১/০৪/২০২৪ ইং।
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-slate-400">
                <span>মাসিক কিস্তি: <strong className="text-white">৳৫০০ / শেয়ার</strong></span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#D6AC62]" />
                  চরচান্দা খাসমহল বাজার
                </span>
              </div>
            </div>

            <div className="md:col-span-2 sm:col-span-6">
              <h3 className="text-[11px] font-bold text-[#D6AC62] uppercase tracking-wider mb-3">
                Navigation
              </h3>
              <ul className="space-y-2 text-xs">
                <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
                <li><Link to="/about" className="hover:text-white transition-colors">About Club</Link></li>
                <li><Link to="/members" className="hover:text-white transition-colors">Member Directory</Link></li>
                <li><Link to="/constitution" className="hover:text-white transition-colors">Constitution</Link></li>
              </ul>
            </div>

            <div className="md:col-span-2 sm:col-span-6">
              <h3 className="text-[11px] font-bold text-[#D6AC62] uppercase tracking-wider mb-3">
                Portals
              </h3>
              <ul className="space-y-2 text-xs">
                <li><Link to="/login" className="hover:text-white transition-colors">Member Sign In</Link></li>
                <li><Link to="/member/profile" className="hover:text-white transition-colors">Personal Profile</Link></li>
                <li><Link to="/member/payment-history" className="hover:text-white transition-colors">Payment Ledger</Link></li>
                <li><Link to="/admin/dashboard" className="text-slate-400 hover:text-white transition-colors">Admin Console</Link></li>
              </ul>
            </div>

            <div className="md:col-span-3 space-y-2 text-xs">
              <h3 className="text-[11px] font-bold text-[#D6AC62] uppercase tracking-wider mb-3">
                Treasury &amp; Bank
              </h3>
              <p className="text-slate-300 font-semibold">Sonali Bank PLC</p>
              <p className="font-mono text-white">A/C: 2102201027292</p>
              <p className="text-slate-400">Bhedarganj Branch, Shariatpur</p>
              <p className="text-slate-400 font-mono pt-1">Treasurer: 01959948542</p>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <p>© {new Date().getFullYear()} Bondhon 2017 · বন্ধুত্ব সমবায় সমিতি। সর্বস্বত্ব সংরক্ষিত।</p>
            <p className="font-mono text-[11px] text-slate-400">
              Batch SSC 2017 · Cooperative Ledger Platform
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
