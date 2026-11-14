import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useClubData } from '../../hooks/useClubData';
import {
  Lock,
  Mail,
  LogIn,
  AlertCircle,
  FileText,
  UserCheck,
  ShieldCheck,
  Eye,
  EyeOff,
  Info,
} from 'lucide-react';
import crestImage from '../../assets/images/bondhon_club_crest_1793703027252.jpg';

export const Login: React.FC = () => {
  const { signInWithPassword, memberSignIn, resetPassword } = useAuth();
  const { publicMembers, members, logMemberActivity } = useClubData();
  const navigate = useNavigate();

  const [loginRole, setLoginRole] = useState<'member' | 'admin'>('member');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedMemberId) {
      setErrorMessage('অনুগ্রহ করে তালিকা থেকে আপনার নাম নির্বাচন করুন।');
      return;
    }

    const chosenPub = publicMembers.find((m) => m.id === selectedMemberId);
    const chosenFull = members.find(
      (m) => m.id === selectedMemberId || m.member_code === chosenPub?.member_code
    );

    if (!chosenPub && !chosenFull) {
      setErrorMessage('সঠিক সদস্য নির্বাচন করুন।');
      return;
    }

    const memberName = chosenFull?.full_name || chosenPub?.full_name || 'Member';
    const memberCode = chosenFull?.member_code || chosenPub?.member_code || '';

    setLoading(true);
    const res = await memberSignIn({
      memberId: chosenFull?.id || chosenPub?.id || selectedMemberId,
      memberCode,
      memberName,
      localMemberEmail: chosenFull?.email || null,
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (res.success) {
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

      if (email.toLowerCase().trim() === 'kmtanvir1111@gmail.com') {
        navigate('/admin/dashboard');
      } else {
        navigate('/member/profile');
      }
    } else {
      setErrorMessage(res.error || 'নাম, ইমেইল বা পাসওয়ার্ড সঠিক নয়।');
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    const res = await signInWithPassword(email.trim(), password);
    setLoading(false);

    const userEmail = email.toLowerCase().trim();
    if (res.success) {
      if (userEmail === 'kmtanvir1111@gmail.com') {
        navigate('/admin/dashboard');
      } else {
        navigate('/member/profile');
      }
    } else {
      setErrorMessage(res.error || 'ভুল ইমেইল বা পাসওয়ার্ড। পুনরায় চেষ্টা করুন।');
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
    <div className="min-h-[82vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-200">
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
              সদস্য ও অ্যাডমিন লগইন
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              বন্ধুত্ব সমবায় সমিতি (Bondhon 2017) · চরচান্দা খাসমহল বাজার
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          {/* Role Switcher (Member vs Admin) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setLoginRole('member');
                setErrorMessage(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                loginRole === 'member'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>সদস্য লগইন (Member)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginRole('admin');
                setErrorMessage(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                loginRole === 'admin'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>অ্যাডমিন লগইন (Admin)</span>
            </button>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-start gap-2.5 leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {loginRole === 'member' ? (
            <form onSubmit={handleMemberLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  আপনার নাম নির্বাচন করুন (Select Member Name)
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <select
                    required
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-slate-900 dark:text-slate-100 cursor-pointer"
                  >
                    <option value="">-- সদস্য তালিকা থেকে আপনার নাম বেছে নিন --</option>
                    {publicMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.member_code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  আপনার নিবন্ধিত ইমেইল (Email Address)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="yourname@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    পাসওয়ার্ড (Password)
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
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="ডিফল্ট পাসওয়ার্ড: 123456"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 rounded-xl text-[11px] text-emerald-900 dark:text-emerald-300 flex items-start gap-2 leading-relaxed">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-700 dark:text-emerald-400" />
                <span>
                  ডাটাবেজে সংরক্ষিত আপনার নাম ও ইমেইল মিললে প্রথমবার <strong>123456</strong> পাসওয়ার্ড দিয়ে লগইন করতে পারবেন এবং প্রোফাইল থেকে পাসওয়ার্ড পরিবর্তন করে নিতে পারবেন।
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'যাচাই করা হচ্ছে...' : 'সদস্য পোর্টালে লগইন করুন'}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  অ্যাডমিন ইমেইল ঠিকানা (Admin Email)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="admin@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    পাসওয়ার্ড (Password)
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
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-700 dark:hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{loading ? 'যাচাই করা হচ্ছে...' : 'অ্যাডমিন প্যানেলে লগইন করুন'}</span>
              </button>
            </form>
          )}
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
                placeholder="yourname@gmail.com"
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
