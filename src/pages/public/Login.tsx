import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { useClubData } from '../../hooks/useClubData';
import { PageTransition } from '../../components/ui/MotionPrimitives';
import {
  LoginLottieStage,
  AnimatedLoginButton,
  LoginAuthState,
} from '../../components/LoginLottieStage';
import {
  Lock,
  Mail,
  AlertCircle,
  FileText,
  UserCheck,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  KeyRound,
  ArrowLeft,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import crestImage from '../../assets/images/bondhon_club_crest_1793703027252.jpg';

const REMEMBER_STORAGE_KEY = 'bondhon_remembered_login';

interface RememberedLoginPrefs {
  role: 'member' | 'admin';
  email: string;
  memberId?: string;
}

export const Login: React.FC = () => {
  const { signInWithPassword, memberSignIn, resetPassword } = useAuth();
  const { publicMembers, members, logMemberActivity } = useClubData();
  const navigate = useNavigate();

  const [loginRole, setLoginRole] = useState<'member' | 'admin'>('member');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authState, setAuthState] = useState<LoginAuthState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Smooth inline switch between Sign In and Password Reset
  const [formView, setFormView] = useState<'login' | 'reset'>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Restore remembered login preference (email, role, and member selection only; never passwords)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(REMEMBER_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as RememberedLoginPrefs;
      if (parsed.email) {
        setEmail(parsed.email);
        setRememberMe(true);
      }
      if (parsed.role === 'member' || parsed.role === 'admin') {
        setLoginRole(parsed.role);
      }
      if (parsed.memberId) {
        setSelectedMemberId(parsed.memberId);
      }
    } catch {
      // Ignore malformed storage
    }
  }, []);

  const persistRememberPreference = (
    role: 'member' | 'admin',
    userEmail: string,
    memberId?: string
  ) => {
    try {
      if (rememberMe) {
        const payload: RememberedLoginPrefs = {
          role,
          email: userEmail,
          memberId: role === 'member' ? memberId : undefined,
        };
        localStorage.setItem(REMEMBER_STORAGE_KEY, JSON.stringify(payload));
      } else {
        localStorage.removeItem(REMEMBER_STORAGE_KEY);
      }
    } catch {
      // Ignore storage failures
    }
  };

  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedMemberId) {
      setAuthState('error');
      setErrorMessage('অনুগ্রহ করে তালিকা থেকে আপনার নাম নির্বাচন করুন।');
      return;
    }

    const chosenPub = publicMembers.find((m) => m.id === selectedMemberId);
    const chosenFull = members.find(
      (m) => m.id === selectedMemberId || m.member_code === chosenPub?.member_code
    );

    if (!chosenPub && !chosenFull) {
      setAuthState('error');
      setErrorMessage('সঠিক সদস্য নির্বাচন করুন।');
      return;
    }

    const memberName = chosenFull?.full_name || chosenPub?.full_name || 'Member';
    const memberCode = chosenFull?.member_code || chosenPub?.member_code || '';
    const trimmedEmail = email.trim();

    setLoading(true);
    setAuthState('loading');
    const res = await memberSignIn({
      memberId: chosenFull?.id || chosenPub?.id || selectedMemberId,
      memberCode,
      memberName,
      localMemberEmail: chosenFull?.email || null,
      email: trimmedEmail,
      password,
    });
    setLoading(false);

    if (res.success) {
      persistRememberPreference('member', trimmedEmail, selectedMemberId);
      setAuthState('success');
      await logMemberActivity({
        actorUserId: res.user?.id || null,
        memberId: chosenFull?.id || chosenPub?.id || selectedMemberId,
        memberCode,
        memberName,
        eventType: 'member_login',
        title: res.isFirstActivation ? 'সদস্য পোর্টাল প্রথমবার চালু' : 'সদস্য পোর্টালে লগইন',
        message: res.isFirstActivation
          ? `${memberName} (${memberCode}) ডিফল্ট পাসওয়ার্ড দিয়ে প্রথমবার পোর্টালে লগইন করেছেন।`
          : `${memberName} (${memberCode}) সদস্য পোর্টালে লগইন করেছেন।`,
      });

      const targetPath =
        trimmedEmail.toLowerCase() === 'kmtanvir1111@gmail.com'
          ? '/admin/dashboard'
          : '/member/profile';
      setTimeout(() => navigate(targetPath), 650);
    } else {
      setAuthState('error');
      setErrorMessage(res.error || 'নাম, ইমেইল বা পাসওয়ার্ড সঠিক নয়।');
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const trimmedEmail = email.trim();

    setLoading(true);
    setAuthState('loading');

    const res = await signInWithPassword(trimmedEmail, password);
    setLoading(false);

    const userEmail = trimmedEmail.toLowerCase();
    if (res.success) {
      persistRememberPreference('admin', trimmedEmail);
      setAuthState('success');
      const targetPath =
        userEmail === 'kmtanvir1111@gmail.com' ? '/admin/dashboard' : '/member/profile';
      setTimeout(() => navigate(targetPath), 650);
    } else {
      setAuthState('error');
      setErrorMessage(res.error || 'ভুল ইমেইল বা পাসওয়ার্ড। পুনরায় চেষ্টা করুন।');
    }
  };

  const openResetView = () => {
    setResetFeedback(null);
    setResetEmail(email.trim());
    setFormView('reset');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetFeedback(null);
    setResetLoading(true);

    const res = await resetPassword(resetEmail.trim());
    setResetLoading(false);

    if (res.success) {
      setResetFeedback({
        type: 'success',
        text: res.message || 'পাসওয়ার্ড রিসেট লিঙ্ক আপনার ইমেইলে পাঠানো হয়েছে।',
      });
    } else {
      setResetFeedback({
        type: 'error',
        text: res.error || 'পাসওয়ার্ড রিসেট করতে ব্যর্থ হয়েছে।',
      });
    }
  };

  const inputBaseClass =
    'w-full min-h-[44px] pl-10 pr-3.5 py-2.5 text-sm bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl text-[#172435] dark:text-slate-100 placeholder:text-[#64748B]/75 transition-all duration-150 focus:outline-hidden focus:bg-white dark:focus:bg-[#111C2D] focus:border-[#087F70] focus:ring-3 focus:ring-[#087F70]/15';

  return (
    <PageTransition className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-6 sm:py-10 px-3 sm:px-6 lg:px-8 bg-[#F5F6F3] dark:bg-[#0B1320]">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 bg-white dark:bg-[#111C2D] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-3xl overflow-hidden shadow-[0_24px_60px_-22px_rgba(20,36,58,0.18)]">
        {/* Left Section: LottieFiles Animation Showcase & Bondhon 2017 Brand Identity */}
        <div className="lg:col-span-6 bg-gradient-to-br from-[#14243A] via-[#192D47] to-[#0E1A2B] text-white p-5 sm:p-7 lg:p-9 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle architectural grid lines */}
          <svg
            aria-hidden="true"
            className="absolute inset-0 w-full h-full opacity-[0.045] pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="bondhon-login-grid" width="36" height="36" patternUnits="userSpaceOnUse">
                <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#D6AC62" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#bondhon-login-grid)" />
          </svg>

          {/* Brand Header */}
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden ring-2 ring-[#D6AC62]/80 bg-[#0B1320] shrink-0">
                <img
                  src={crestImage}
                  alt="Bondhon 2017 Official Crest"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <span className="text-base sm:text-lg font-bold tracking-tight block leading-tight truncate">
                  Bondhon 2017
                </span>
                <span className="text-xs text-[#D6AC62] font-medium block truncate">
                  বন্ধুত্ব সমবায় সমিতি
                </span>
              </div>
            </div>
          </div>

          {/* Mobile compact layout: Animation + Title side-by-side on small widths, vertical hero on lg+ */}
          <div className="relative z-10 my-4 lg:my-2 flex flex-col sm:flex-row lg:flex-col items-center gap-4 lg:gap-5">
            <div className="w-full flex justify-center">
              <LoginLottieStage role={loginRole} authState={authState} />
            </div>

            <div className="text-center sm:text-left lg:text-center space-y-1.5 max-w-md mx-auto">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-white [text-wrap:balance]">
                স্বচ্ছ সমবায় ও সদস্য পোর্টাল
              </h2>
              <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed">
                এস.এস.সি ব্যাচ ২০১৭ · চরচান্দা খাসমহল বাজার। আপনার মাসিক সঞ্চয়, কিস্তি ও জরিমানার সম্পূর্ণ হিসাব দেখতে নিরাপদ সাইন-ইন করুন।
              </p>
            </div>
          </div>

          {/* Unboxed institutional metadata footer */}
          <div className="relative z-10 hidden sm:flex flex-wrap items-center justify-center lg:justify-between gap-x-3 gap-y-1 pt-4 border-t border-white/10 text-[11px] text-slate-300/90">
            <span>মাসিক কিস্তি ও জরিমানা লেজার</span>
            <span aria-hidden="true" className="text-[#D6AC62]">
              ·
            </span>
            <span>সোনালী ব্যাংক পিএলসি যাচাইকৃত তহবিল</span>
            <span aria-hidden="true" className="text-[#D6AC62] hidden xl:inline">
              ·
            </span>
            <span className="hidden xl:inline">স্থাপিত: ০১/০৪/২০২৪</span>
          </div>
        </div>

        {/* Right Section: Authentication Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6 p-5 sm:p-8 lg:p-10 flex flex-col justify-center"
        >
          <AnimatePresence mode="wait">
            {formView === 'login' ? (
              <motion.div
                key="login-panel"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-5"
              >
                {/* Heading */}
                <div className="space-y-1">
                  <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-[#14243A] dark:text-white">
                    Welcome Back
                  </h1>
                  <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400">
                    Sign in to access your Bondhon 2017 portal
                  </p>
                </div>

                {/* Role Switcher */}
                <div
                  role="tablist"
                  aria-label="Portal role selection"
                  className="grid grid-cols-2 gap-1.5 p-1 bg-[#F5F6F3] dark:bg-[#162438] rounded-xl border border-[#E8EDF3] dark:border-[#1F2F46]"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={loginRole === 'member'}
                    onClick={() => {
                      setLoginRole('member');
                      setErrorMessage(null);
                      setAuthState('idle');
                    }}
                    className={`min-h-[40px] px-3 rounded-lg text-xs sm:text-[13px] font-semibold transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      loginRole === 'member'
                        ? 'bg-white dark:bg-[#111C2D] text-[#087F70] dark:text-[#34D399] shadow-xs border border-[#E8EDF3]/80 dark:border-[#2B4564]'
                        : 'text-[#64748B] hover:text-[#14243A] dark:hover:text-white'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 shrink-0" />
                    <span>Member Portal</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={loginRole === 'admin'}
                    onClick={() => {
                      setLoginRole('admin');
                      setErrorMessage(null);
                      setAuthState('idle');
                    }}
                    className={`min-h-[40px] px-3 rounded-lg text-xs sm:text-[13px] font-semibold transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      loginRole === 'admin'
                        ? 'bg-[#14243A] dark:bg-[#087F70] text-white shadow-xs'
                        : 'text-[#64748B] hover:text-[#14243A] dark:hover:text-white'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>Admin Console</span>
                  </button>
                </div>

                {/* Error & Success Feedback */}
                <AnimatePresence mode="wait">
                  {errorMessage && (
                    <motion.div
                      key="login-error"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.16 }}
                      role="alert"
                      className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 text-rose-700 dark:text-rose-300 rounded-xl text-xs sm:text-[13px] flex items-start gap-2.5 leading-relaxed"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </motion.div>
                  )}

                  {authState === 'success' && (
                    <motion.div
                      key="login-success"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.16 }}
                      role="status"
                      className="p-3.5 bg-[#087F70]/10 border border-[#087F70]/30 text-[#087F70] dark:text-[#34D399] rounded-xl text-xs sm:text-[13px] flex items-center gap-2.5 font-semibold"
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>
                        {loginRole === 'admin'
                          ? 'যাচাই সম্পন্ন হয়েছে! অ্যাডমিন ড্যাশবোর্ডে প্রবেশ করছেন...'
                          : 'স্বাগতম! আপনার ব্যক্তিগত সদস্য প্রোফাইলে প্রবেশ করছেন...'}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Role-Specific Form */}
                {loginRole === 'member' ? (
                  <form onSubmit={handleMemberLogin} className="space-y-4">
                    <div>
                      <label
                        htmlFor="member-select"
                        className="block text-xs font-semibold text-[#172435] dark:text-slate-300 mb-1.5"
                      >
                        Member Name
                      </label>
                      <div className="relative">
                        <UserCheck className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <select
                          id="member-select"
                          required
                          value={selectedMemberId}
                          onChange={(e) => {
                            setSelectedMemberId(e.target.value);
                            if (authState === 'error') setAuthState('idle');
                            if (errorMessage) setErrorMessage(null);
                          }}
                          className={`${inputBaseClass} pr-9 appearance-none cursor-pointer`}
                        >
                          <option value="" className="bg-white text-[#172435] dark:bg-[#111C2D] dark:text-slate-100">
                            Select your name...
                          </option>
                          {publicMembers.map((m) => (
                            <option
                              key={m.id}
                              value={m.id}
                              className="bg-white text-[#172435] dark:bg-[#111C2D] dark:text-slate-100"
                            >
                              {m.full_name} ({m.member_code})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-[#64748B] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="member-email"
                        className="block text-xs font-semibold text-[#172435] dark:text-slate-300 mb-1.5"
                      >
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="member-email"
                          type="email"
                          required
                          autoComplete="email"
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (authState === 'error') setAuthState('idle');
                            if (errorMessage) setErrorMessage(null);
                          }}
                          className={inputBaseClass}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor="member-password"
                          className="block text-xs font-semibold text-[#172435] dark:text-slate-300"
                        >
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={openResetView}
                          className="text-xs text-[#087F70] dark:text-[#34D399] font-semibold hover:underline cursor-pointer whitespace-nowrap"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="member-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="current-password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (authState === 'error') setAuthState('idle');
                            if (errorMessage) setErrorMessage(null);
                          }}
                          className={`${inputBaseClass} pr-11`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg text-[#64748B] hover:text-[#14243A] dark:hover:text-white transition-colors cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Remember Me */}
                    <div className="flex items-center justify-between pt-0.5">
                      <label className="inline-flex items-center gap-2 text-xs text-[#64748B] dark:text-slate-400 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded border-[#CBD5E1] dark:border-[#2B4564] text-[#087F70] focus:ring-[#087F70] cursor-pointer accent-[#087F70]"
                        />
                        <span>Remember me on this device</span>
                      </label>
                    </div>

                    {/* Animated LottieFiles Submit CTA */}
                    <AnimatedLoginButton
                      variant="member"
                      loading={loading}
                      authState={authState}
                      idleLabel="Sign In"
                    />
                  </form>
                ) : (
                  <form onSubmit={handleAdminLogin} className="space-y-4">
                    <div>
                      <label
                        htmlFor="admin-email"
                        className="block text-xs font-semibold text-[#172435] dark:text-slate-300 mb-1.5"
                      >
                        Admin Email
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="admin-email"
                          type="email"
                          required
                          autoComplete="email"
                          placeholder="admin@example.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (authState === 'error') setAuthState('idle');
                            if (errorMessage) setErrorMessage(null);
                          }}
                          className={inputBaseClass}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor="admin-password"
                          className="block text-xs font-semibold text-[#172435] dark:text-slate-300"
                        >
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={openResetView}
                          className="text-xs text-[#087F70] dark:text-[#34D399] font-semibold hover:underline cursor-pointer whitespace-nowrap"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="admin-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="current-password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (authState === 'error') setAuthState('idle');
                            if (errorMessage) setErrorMessage(null);
                          }}
                          className={`${inputBaseClass} pr-11`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg text-[#64748B] hover:text-[#14243A] dark:hover:text-white transition-colors cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Remember Me */}
                    <div className="flex items-center justify-between pt-0.5">
                      <label className="inline-flex items-center gap-2 text-xs text-[#64748B] dark:text-slate-400 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded border-[#CBD5E1] dark:border-[#2B4564] text-[#087F70] focus:ring-[#087F70] cursor-pointer accent-[#087F70]"
                        />
                        <span>Remember me on this device</span>
                      </label>
                    </div>

                    {/* Animated LottieFiles Admin Submit CTA */}
                    <AnimatedLoginButton
                      variant="admin"
                      loading={loading}
                      authState={authState}
                      idleLabel="Sign In to Admin Console"
                    />
                  </form>
                )}

                {/* Quick Footer Links */}
                <div className="pt-4 border-t border-[#E8EDF3] dark:border-[#1F2F46] flex items-center justify-between gap-4 text-xs text-[#64748B] dark:text-slate-400">
                  <Link
                    to="/constitution"
                    className="hover:text-[#087F70] dark:hover:text-[#34D399] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Club Constitution</span>
                  </Link>
                  <Link
                    to="/members"
                    className="hover:text-[#087F70] dark:hover:text-[#34D399] transition-colors whitespace-nowrap"
                  >
                    Member Directory
                  </Link>
                </div>
              </motion.div>
            ) : (
              /* Smooth Inline Password Reset Panel */
              <motion.div
                key="reset-panel"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-5"
              >
                <button
                  type="button"
                  onClick={() => {
                    setFormView('login');
                    setResetFeedback(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#14243A] dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>

                <div className="space-y-1.5">
                  <div className="w-10 h-10 rounded-xl bg-[#087F70]/10 border border-[#087F70]/25 text-[#087F70] dark:text-[#34D399] flex items-center justify-center">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#14243A] dark:text-white pt-1">
                    পাসওয়ার্ড রিসেট করুন
                  </h1>
                  <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 leading-relaxed">
                    আপনার নিবন্ধিত ইমেইল ঠিকানা লিখুন। পাসওয়ার্ড রিকভারি লিঙ্ক ইমেইলে পাঠানো হবে।
                  </p>
                </div>

                <AnimatePresence mode="wait">
                  {resetFeedback && (
                    <motion.div
                      key="reset-feedback"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.16 }}
                      role="status"
                      className={`p-3.5 rounded-xl text-xs sm:text-[13px] flex items-start gap-2.5 border ${
                        resetFeedback.type === 'success'
                          ? 'bg-[#087F70]/10 text-[#087F70] dark:text-[#34D399] border-[#087F70]/30'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/70'
                      }`}
                    >
                      {resetFeedback.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      )}
                      <span>{resetFeedback.text}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label
                      htmlFor="reset-email"
                      className="block text-xs font-semibold text-[#172435] dark:text-slate-300 mb-1.5"
                    >
                      Registered Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="reset-email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="yourname@gmail.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className={inputBaseClass}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setFormView('login');
                        setResetFeedback(null);
                      }}
                      className="min-h-[44px] px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#64748B] hover:bg-[#F5F6F3] dark:hover:bg-[#162438] rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                    >
                      বাতিল
                    </button>
                    <motion.button
                      type="submit"
                      disabled={resetLoading}
                      whileHover={resetLoading ? undefined : { y: -1 }}
                      whileTap={resetLoading ? undefined : { scale: 0.99 }}
                      className="flex-1 min-h-[44px] px-5 py-2.5 text-xs sm:text-sm font-semibold bg-[#087F70] hover:bg-[#06675B] text-white rounded-xl shadow-xs transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                    >
                      {resetLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <KeyRound className="w-4 h-4" />
                      )}
                      <span>{resetLoading ? 'পাঠানো হচ্ছে...' : 'রিসেট লিঙ্ক পাঠান'}</span>
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </PageTransition>
  );
};
