import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { useClubData } from '../hooks/useClubData';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  History,
  BarChart3,
  Settings,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Menu,
  X,
  UserCheck,
  Bell,
  CheckCheck,
  RefreshCw,
  KeyRound,
  LogIn,
  Send,
  Phone,
  Trash2,
  AlertTriangle,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  Landmark,
} from 'lucide-react';
import crestImage from '../assets/images/bondhon_club_crest_1793703027252.jpg';
import { WelcomePreloader } from '../components/WelcomePreloader';

const SIDEBAR_COLLAPSED_KEY = 'bondhon_admin_sidebar_collapsed';
const ADMIN_THEME_KEY = 'bondhon_admin_theme';

export const AdminLayout: React.FC = () => {
  const { profile, signOut } = useAuth();
  const {
    notifications,
    unreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications,
    refreshNotifications,
  } = useClubData();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  // Admin Dashboard defaults to sleek Dark Color Scheme
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem(ADMIN_THEME_KEY) !== 'light';
    } catch {
      return true;
    }
  });
  const [notifOpen, setNotifOpen] = useState(false);
  const [refreshingNotif, setRefreshingNotif] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const toggleCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // Ignore storage error
      }
      return next;
    });
  };

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(ADMIN_THEME_KEY, next ? 'dark' : 'light');
      } catch {
        // Ignore storage error
      }
      return next;
    });
  };

  useEffect(() => {
    const prevScheme = document.documentElement.style.colorScheme;
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    return () => {
      document.documentElement.style.colorScheme = prevScheme || 'light';
    };
  }, [isDark]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNotifOpen(false);
        setSidebarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleRefreshNotifs = async () => {
    setRefreshingNotif(true);
    await refreshNotifications();
    setRefreshingNotif(false);
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'member_login':
        return <LogIn className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#60A5FA]" />;
      case 'member_logout':
        return <LogOut className="w-3.5 h-3.5 text-rose-500" />;
      case 'password_changed':
        return <KeyRound className="w-3.5 h-3.5 text-[#92600A] dark:text-[#F0C56E]" />;
      case 'payment_notice':
        return <Send className="w-3.5 h-3.5 text-[#0369A1] dark:text-[#38BDF8]" />;
      default:
        return <Phone className="w-3.5 h-3.5 text-[#18294A] dark:text-slate-300" />;
    }
  };

  const formatTimeAgo = (iso: string) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'এইমাত্র';
    if (mins < 60) return `${mins} মি. আগে`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ঘণ্টা আগে`;
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/members', label: 'Member Directory', icon: Users },
    { to: '/admin/payments', label: 'Monthly Dues', icon: CreditCard },
    { to: '/admin/fines', label: 'Fines Sheet', icon: AlertTriangle },
    { to: '/admin/payment-history', label: 'Payment Ledger', icon: History },
    { to: '/admin/treasury', label: 'Bank & Expenses', icon: Landmark },
    { to: '/admin/reports', label: 'Financial Reports', icon: BarChart3 },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const currentItem = navItems.find((item) => location.pathname === item.to);
  const pageTitle = currentItem
    ? currentItem.label
    : location.pathname.startsWith('/admin/members/')
    ? 'Member Profile & Ledger'
    : 'Admin Console';

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => {
    const collapsed = !isMobile && sidebarCollapsed;

    return (
      <div className="flex flex-col h-full bg-[#0F1B33] dark:bg-[#0C1528] text-slate-200 select-none">
        {/* Sidebar Brand Header */}
        <div
          className={`h-16 flex items-center ${
            collapsed ? 'justify-center px-3' : 'justify-between px-5'
          } border-b border-[#18294A] dark:border-[#233452] shrink-0`}
        >
          <Link to="/" className="flex items-center gap-3 min-w-0">
            <img
              src={crestImage}
              alt="Bondhon 2017 Crest"
              className="w-8 h-8 rounded-full object-cover ring-2 ring-[#D6AC62]/60 shrink-0"
            />
            {!collapsed && (
              <div className="min-w-0">
                <span className="font-bold text-white text-sm block leading-tight truncate">
                  Bondhon 2017
                </span>
                <span className="text-[10px] text-[#D6AC62] font-semibold uppercase tracking-wider block">
                  Admin Console
                </span>
              </div>
            )}
          </Link>

          {isMobile && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#18294A] cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center ${
                    collapsed ? 'justify-center px-2.5' : 'gap-3 px-3.5'
                  } py-2.5 rounded-xl text-xs sm:text-[13px] font-medium transition-all ${
                    isActive
                      ? 'bg-[#1D4ED8] text-white shadow-[0_4px_14px_-4px_rgba(29,78,216,0.55)] font-semibold'
                      : 'text-slate-300/85 hover:text-white hover:bg-[#18294A]'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate whitespace-nowrap">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Shortcuts & Admin Account */}
        <div className="p-3 border-t border-[#18294A] dark:border-[#233452] space-y-3 shrink-0">
          {!collapsed ? (
            <div className="space-y-1 text-xs">
              <Link
                to="/member/profile"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-300/85 hover:text-white hover:bg-[#18294A] transition-colors"
              >
                <span className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-[#60A5FA]" />
                  <span>Member Portal</span>
                </span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </Link>

              <Link
                to="/"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-slate-300/85 hover:text-white hover:bg-[#18294A] transition-colors"
              >
                <span>Public Website</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <Link
                to="/member/profile"
                title="Member Portal"
                className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-[#18294A] transition-colors"
              >
                <UserCheck className="w-4 h-4 text-[#60A5FA]" />
              </Link>
              <Link
                to="/"
                title="Public Website"
                className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-[#18294A] transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          )}

          <div
            className={`pt-2.5 border-t border-[#18294A] dark:border-[#233452] flex items-center ${
              collapsed ? 'justify-center' : 'justify-between px-1'
            }`}
          >
            {!collapsed && (
              <div className="text-left overflow-hidden mr-2">
                <span className="text-xs font-semibold text-white block truncate">
                  {profile?.full_name || 'Admin'}
                </span>
                <span className="text-[10px] text-[#D6AC62] font-mono">Administrator</span>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-300 hover:text-rose-300 hover:bg-[#18294A] transition-colors cursor-pointer"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={isDark ? 'dark' : ''}>
      <WelcomePreloader />
      <div className="min-h-screen flex bg-[#F6F7FB] dark:bg-[#09101D] text-[#0F1B2E] dark:text-[#F3F6FC]">
        {/* Mobile Sidebar Overlay & Slide-out Drawer */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="fixed inset-0 z-40 bg-[#09101D]/70 backdrop-blur-[2px] lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="fixed top-0 bottom-0 left-0 z-50 w-[260px] lg:hidden shadow-2xl"
              >
                <SidebarContent isMobile />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Desktop Sidebar (Smooth collapsible 260px / 76px) */}
        <aside
          className={`hidden lg:flex lg:flex-col shrink-0 border-r border-[#18294A] dark:border-[#233452] transition-[width] duration-200 ease-out sticky top-0 h-screen ${
            sidebarCollapsed ? 'w-[76px]' : 'w-[260px]'
          }`}
        >
          <SidebarContent />
        </aside>

        {/* Main Column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar header */}
          <header className="h-14 sm:h-16 bg-white/95 dark:bg-[#0D172B]/95 backdrop-blur-md border-b border-[#DFE6F0] dark:border-[#233452] px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Mobile Hamburger */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 -ml-1 rounded-lg text-[#0F1B2E] dark:text-slate-200 hover:bg-[#EFF3F9] dark:hover:bg-[#17243C] cursor-pointer"
                aria-label="Open sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Desktop Collapse Toggle */}
              <button
                type="button"
                onClick={toggleCollapsed}
                className="hidden lg:inline-flex p-2 rounded-lg text-[#4E5E78] dark:text-[#9BB0CD] hover:text-[#0F1B2E] dark:hover:text-white hover:bg-[#EFF3F9] dark:hover:bg-[#17243C] transition-colors cursor-pointer"
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </button>

              <div className="flex items-center gap-2 text-xs text-[#4E5E78] dark:text-[#9BB0CD] min-w-0">
                <span className="hidden sm:inline font-medium">Admin</span>
                <span className="hidden sm:inline">/</span>
                <span className="font-bold text-[#0F1B2E] dark:text-[#F3F6FC] text-sm sm:text-base truncate">
                  {pageTitle}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Theme Switcher (Dark Color Scheme default) */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                className="p-2 rounded-xl text-[#4E5E78] dark:text-[#F0C56E] hover:bg-[#EFF3F9] dark:hover:bg-[#17243C] border border-transparent hover:border-[#DFE6F0] dark:hover:border-[#233452] transition-colors cursor-pointer"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Notification Bell Icon & Animated Dropdown */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => {
                    setNotifOpen(!notifOpen);
                    if (!notifOpen) handleRefreshNotifs();
                  }}
                  className="relative p-2 rounded-xl text-[#0F1B2E] dark:text-slate-200 hover:bg-[#EFF3F9] dark:hover:bg-[#17243C] border border-transparent hover:border-[#DFE6F0] dark:hover:border-[#233452] transition-colors cursor-pointer"
                  aria-label="Member Notifications"
                  title="Member Activity & Notifications"
                >
                  <Bell className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                  {unreadNotificationCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs tabular-nums">
                      {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {notifOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.98 }}
                      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#111B2E] border border-[#DFE6F0] dark:border-[#233452] rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.45)] z-50 overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-[#DFE6F0] dark:border-[#233452] flex items-center justify-between bg-[#EFF3F9]/80 dark:bg-[#0F1B33]/75">
                        <div>
                          <h3 className="text-xs font-bold text-[#0F1B2E] dark:text-[#F3F6FC] tabular-nums">
                            Notifications ({unreadNotificationCount} unread)
                          </h3>
                          <p className="text-[10px] text-[#4E5E78] dark:text-[#9BB0CD]">
                            Sign-ins, password updates, and member notices
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={handleRefreshNotifs}
                            className="p-1.5 rounded-lg text-[#4E5E78] dark:text-[#9BB0CD] hover:text-[#1D4ED8] dark:hover:text-[#60A5FA] hover:bg-white dark:hover:bg-[#18294A] cursor-pointer"
                            title="Refresh"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshingNotif ? 'animate-spin' : ''}`} />
                          </button>
                          {unreadNotificationCount > 0 && (
                            <button
                              type="button"
                              onClick={markAllNotificationsAsRead}
                              className="p-1.5 rounded-lg text-[#1D4ED8] dark:text-[#60A5FA] hover:bg-[#1D4ED8]/10 cursor-pointer"
                              title="Mark all as read"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {notifications.length > 0 && (
                            <button
                              type="button"
                              onClick={clearNotifications}
                              className="p-1.5 rounded-lg text-[#4E5E78] dark:text-[#9BB0CD] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                              title="Clear all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="max-h-80 overflow-y-auto divide-y divide-[#DFE6F0] dark:divide-[#233452]">
                        {notifications.length === 0 ? (
                          <div className="py-10 px-4 text-center space-y-1.5">
                            <Bell className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto" />
                            <p className="text-xs font-medium text-[#4E5E78] dark:text-[#9BB0CD]">
                              No notifications yet
                            </p>
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              onClick={() => markNotificationAsRead(n.id)}
                              className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors hover:bg-[#EFF3F9] dark:hover:bg-[#17243C] ${
                                !n.is_read ? 'bg-[#1D4ED8]/6 dark:bg-[#1D4ED8]/14' : ''
                              }`}
                            >
                              <div className="w-7 h-7 rounded-full bg-white dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] flex items-center justify-center shrink-0 mt-0.5">
                                {getEventIcon(n.event_type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-bold text-[#0F1B2E] dark:text-[#F3F6FC] truncate">
                                    {n.title}
                                  </span>
                                  <span className="text-[10px] text-[#4E5E78] dark:text-[#9BB0CD] shrink-0 tabular-nums">
                                    {formatTimeAgo(n.created_at)}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#4E5E78] dark:text-slate-300 mt-0.5 leading-relaxed">
                                  {n.message}
                                </p>
                              </div>
                              {!n.is_read && (
                                <span className="w-2 h-2 rounded-full bg-[#1D4ED8] dark:bg-[#60A5FA] shrink-0 mt-1.5" />
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-medium text-[#1D4ED8] dark:text-[#60A5FA] px-2 whitespace-nowrap">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin Access</span>
              </span>

              <Link
                to="/member/profile"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold py-2 px-3 bg-[#EFF3F9] hover:bg-slate-200/70 dark:bg-[#17243C] dark:hover:bg-[#18294A] text-[#0F1B2E] dark:text-slate-200 border border-[#DFE6F0] dark:border-[#233452] rounded-xl transition-colors whitespace-nowrap shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#60A5FA]" />
                <span>Member Portal</span>
              </Link>
            </div>
          </header>

          {/* Viewport content */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-[1440px] mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
