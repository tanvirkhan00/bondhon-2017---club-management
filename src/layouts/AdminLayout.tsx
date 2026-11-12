import React, { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
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
} from 'lucide-react';
import crestImage from '../assets/images/bondhon_club_crest_1793703027252.jpg';

export const AdminLayout: React.FC = () => {
  const { profile, signOut, switchDemoRole, isConfigured } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/members', label: 'Member Directory', icon: Users },
    { to: '/admin/payments', label: 'Monthly Dues', icon: CreditCard },
    { to: '/admin/payment-history', label: 'Payment Ledger', icon: History },
    { to: '/admin/reports', label: 'Financial Reports', icon: BarChart3 },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  // Get active page title
  const currentItem = navItems.find(item => location.pathname === item.to);
  const pageTitle = currentItem ? currentItem.label : 'Admin Console';

  return (
    <div className="min-h-screen flex bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar (Desktop 260px & Mobile Drawer) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={crestImage}
              alt="Bondhon 2017 Crest"
              className="w-8 h-8 rounded-full object-cover border border-emerald-500/40"
            />
            <div>
              <span className="font-bold text-white text-sm block leading-tight">Bondhon 2017</span>
              <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                Admin Console
              </span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-xs font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          {/* Quick links to public & member portal */}
          <div className="space-y-1 text-xs">
            <Link
              to="/member/profile"
              className="flex items-center justify-between px-2.5 py-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <span className="flex items-center gap-2">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Member Portal</span>
              </span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </Link>

            <Link
              to="/"
              className="flex items-center justify-between px-2.5 py-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <span>Public Website</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </Link>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <div className="text-left overflow-hidden mr-2">
              <span className="text-xs font-semibold text-white block truncate">
                {profile?.full_name || 'Admin'}
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">Role: Administrator</span>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="hidden sm:inline">Admin</span>
              <span className="hidden sm:inline">/</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                {pageTitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Admin status pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-semibold">Admin Access Verified</span>
            </div>

            <Link
              to="/member/profile"
              className="hidden sm:flex items-center gap-1.5 text-xs py-1 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Member Portal</span>
            </Link>
          </div>
        </header>

        {/* Viewport content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
