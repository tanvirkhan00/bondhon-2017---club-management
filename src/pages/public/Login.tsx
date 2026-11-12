import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  Lock,
  Mail,
  LogIn,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  User,
  HelpCircle,
  ArrowRight,
  Database,
} from 'lucide-react';
import crestImage from '../../assets/images/bondhon_club_crest_1793703027252.jpg';

export const Login: React.FC = () => {
  const { signInWithPassword, resetPassword, switchDemoRole, isConfigured } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    const res = await signInWithPassword(email.trim(), password);
    setLoading(false);

    if (res.success) {
      if (email.toLowerCase().includes('admin')) {
        navigate('/admin/dashboard');
      } else {
        navigate('/member/profile');
      }
    } else {
      setErrorMessage(res.error || 'Invalid email or password.');
    }
  };

  const handleQuickDemoLogin = (role: 'admin' | 'member') => {
    switchDemoRole(role);
    if (role === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/member/profile');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage(null);
    const res = await resetPassword(resetEmail.trim());
    if (res.success) {
      setResetMessage(res.message || 'Password reset link sent to your email.');
      setTimeout(() => {
        setResetModalOpen(false);
        setResetMessage(null);
      }, 2500);
    } else {
      setResetMessage(res.error || 'Failed to send reset email.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-200">
      <div className="w-full max-w-md space-y-6">
        {/* Crest & Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full overflow-hidden shadow-md border-2 border-emerald-600/30">
            <img
              src={crestImage}
              alt="Bondhon 2017"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Member & Admin Sign In
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Access your private Bondhon 2017 portal and financial records
          </p>
        </div>

        {/* Demo Mode Quick Access Banner */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Instant Review Testing</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">1-Click Login</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('admin')}
              className="py-2 px-3 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Test Admin Login</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('member')}
              className="py-2 px-3 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <User className="w-3.5 h-3.5" />
              <span>Test Member Login</span>
            </button>
          </div>
        </div>

        {/* Real Login Form */}
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Account Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="admin@bondhon.com or member@bondhon.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setResetModalOpen(true)}
                  className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Verifying Credentials...' : 'Sign In with Supabase Auth'}</span>
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-slate-500">
            <span>Don't have an authorized member account? </span>
            <Link to="/about" className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline">
              Contact Club Admin
            </Link>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Reset Your Password
            </h3>
            <p className="text-xs text-slate-500">
              Enter your email address and we will send you a Supabase password recovery link.
            </p>

            {resetMessage && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs">
                {resetMessage}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3">
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800"
                >
                  Send Reset Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
