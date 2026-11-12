import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  Lock,
  Mail,
  LogIn,
  AlertCircle,
  ShieldCheck,
  FileText,
  KeyRound,
} from 'lucide-react';
import crestImage from '../../assets/images/bondhon_club_crest_1793703027252.jpg';

export const Login: React.FC = () => {
  const { signInWithPassword, resetPassword } = useAuth();
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
      if (email.toLowerCase().includes('admin') || email.toLowerCase().includes('treasurer')) {
        navigate('/admin/dashboard');
      } else {
        navigate('/member/profile');
      }
    } else {
      setErrorMessage(res.error || 'ভুল ইমেইল বা পাসওয়ার্ড। পুনরায় চেষ্টা করুন।');
    }
  };

  const handleFillCredentials = (type: 'admin' | 'member') => {
    if (type === 'admin') {
      setEmail('admin@bondhon.com');
      setPassword('admin123');
    } else {
      setEmail('member@bondhon.com');
      setPassword('member123');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage(null);

    const res = await resetPassword(resetEmail.trim());
    if (res.success) {
      setResetMessage(res.message || 'পাসওয়ার্ড রিসেট লিঙ্ক আপনার ইমেইলে পাঠানো হয়েছে।');
    } else {
      setResetMessage(res.error || 'পাসওয়ার্ড রিসেট করতে ব্যর্থ হয়েছে।');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-200">
      <div className="w-full max-w-md space-y-6">
        {/* Crest & Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full overflow-hidden shadow-md border-2 border-emerald-600/30 bg-emerald-950">
            <img
              src={crestImage}
              alt="Bondhon 2017 Official Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              সদস্য ও অ্যাডমিন প্রবেশদ্বার
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              বন্ধুত্ব সমবায় সমিতি (Bondhon 2017) · চরচান্দা খাসমহল বাজার
            </p>
          </div>
        </div>

        {/* Real Production Login Card */}
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                অফিসিয়াল ইমেইল (Email Address)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="name@bondhon.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  গোপন পাসওয়ার্ড (Password)
                </label>
                <button
                  type="button"
                  onClick={() => setResetModalOpen(true)}
                  className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium hover:underline"
                >
                  পাসওয়ার্ড ভুলে গেছেন?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'যাচাই করা হচ্ছে...' : 'লগইন করুন (Secure Sign In)'}</span>
            </button>
          </form>

          {/* Quick Credential Pre-fill Helpers (Subtle, unobtrusive) */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>দ্রুত পূরণ:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleFillCredentials('admin')}
                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:text-emerald-700 font-mono text-[10px]"
              >
                কোষাধ্যক্ষ/অ্যাডমিন
              </button>
              <button
                type="button"
                onClick={() => handleFillCredentials('member')}
                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:text-emerald-700 font-mono text-[10px]"
              >
                সাধারণ সদস্য
              </button>
            </div>
          </div>
        </div>

        {/* Policy & Directory links */}
        <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
          <Link to="/constitution" className="hover:text-emerald-700 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            <span>গঠনতন্ত্র ও নীতিমালা</span>
          </Link>
          <span>·</span>
          <Link to="/members" className="hover:text-emerald-700">
            সদস্য ডিরেক্টরি
          </Link>
        </div>
      </div>

      {/* Password Reset Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              পাসওয়ার্ড রিসেট করুন
            </h3>
            <p className="text-xs text-slate-500">
              আপনার নিবন্ধিত ইমেইল ঠিকানা দিন। আমরা পাসওয়ার্ড পুনরুদ্ধারের লিঙ্ক পাঠাব।
            </p>

            {resetMessage && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs">
                {resetMessage}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3">
              <input
                type="email"
                required
                placeholder="name@bondhon.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800"
                >
                  লিঙ্ক পাঠান
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
