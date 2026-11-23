import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { Profile, UserRole, isPresidentIdentity } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabase/client';
import { INITIAL_PROFILES } from '../lib/mockData';
import {
  clearWelcomePreloaderSession,
  markWelcomePreloaderPending,
} from '../components/WelcomePreloader';

const RAW_SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim() || '';
const IS_LOCAL_SITE_URL = /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(RAW_SITE_URL);
const PRODUCTION_SITE_URL = (
  !RAW_SITE_URL || IS_LOCAL_SITE_URL ? 'https://bondon2017.netlify.app' : RAW_SITE_URL
).replace(/\/+$/, '');

interface MemberLoginParams {
  memberId: string;
  memberCode: string;
  memberName: string;
  localMemberEmail?: string | null;
  email: string;
  password: string;
}

interface AuthResult {
  success: boolean;
  user?: User | null;
  role?: UserRole;
  isFirstActivation?: boolean;
  needsEmailConfirmation?: boolean;
  unconfirmedEmail?: string;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: UserRole;
  isAdmin: boolean;
  isViewer: boolean;
  canAccessAdmin: boolean;
  canEditAdmin: boolean;
  isMember: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  isPasswordRecovery: boolean;
  error: string | null;
  signInWithPassword: (email: string, pass: string) => Promise<AuthResult>;
  memberSignIn: (params: MemberLoginParams) => Promise<AuthResult>;
  resendConfirmationEmail: (
    email: string
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  updatePassword: (newPassword: string) => Promise<AuthResult>;
  clearPasswordRecovery: () => void;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  switchDemoRole: (role: UserRole) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAILS = ['kmtanvir1111@gmail.com'];

function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.location.hash.includes('type=recovery');
  });
  const [error, setError] = useState<string | null>(null);

  const configured = isSupabaseConfigured();

  const resolvePresidentViewerFallback = async (
    authUser: User,
    currentRole: UserRole
  ): Promise<UserRole> => {
    if (currentRole === 'admin' || currentRole === 'viewer') {
      return currentRole;
    }

    // Check metadata hint first
    const metaCode = String(authUser.user_metadata?.member_code || '').trim().toUpperCase();
    if (metaCode === 'BND-005') {
      return 'viewer';
    }

    const client = getSupabaseClient();
    if (!client) return currentRole;

    try {
      const { data: ownRows } = await client
        .from('members')
        .select('member_code, designation, auth_user_id, email')
        .limit(5);

      if (Array.isArray(ownRows)) {
        const userEmail = (authUser.email || '').toLowerCase().trim();
        const ownMatch = ownRows.find(
          (m) =>
            m.auth_user_id === authUser.id ||
            (userEmail && (m.email || '').toLowerCase().trim() === userEmail)
        );
        if (ownMatch && isPresidentIdentity(ownMatch)) {
          return 'viewer';
        }
      }
    } catch {
      // ignore if members row is unavailable
    }

    return currentRole;
  };

  const fetchSupabaseProfile = async (authUser: User): Promise<UserRole> => {
    const client = getSupabaseClient();
    const userEmail = (authUser.email || '').toLowerCase().trim();
    const knownAdmin = isAdminEmail(userEmail);
    const metaFullName =
      authUser.user_metadata?.full_name ||
      (knownAdmin ? 'Tanvir Khan' : userEmail.split('@')[0] || 'Club Member');

    if (!client) {
      const r: UserRole = knownAdmin ? 'admin' : 'member';
      return r;
    }

    try {
      const { data, error: profileErr } = await client
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileErr || !data) {
        const baseRole: UserRole = knownAdmin ? 'admin' : 'member';
        const resolvedRole = await resolvePresidentViewerFallback(authUser, baseRole);
        // Best-effort profile sync so foreign keys like monthly_dues.recorded_by remain valid
        try {
          await client.from('profiles').upsert(
            {
              id: authUser.id,
              full_name: metaFullName,
              role: resolvedRole,
            },
            { onConflict: 'id', ignoreDuplicates: true }
          );
        } catch {
          // ignore RLS insert failures if already managed by trigger
        }
        setProfile({
          id: authUser.id,
          full_name: metaFullName,
          role: resolvedRole,
        });
        return resolvedRole;
      } else {
        const dbProfile = data as Profile;
        const baseRole: UserRole = knownAdmin
          ? 'admin'
          : dbProfile.role === 'admin'
          ? 'admin'
          : dbProfile.role === 'viewer'
          ? 'viewer'
          : 'member';
        const resolvedRole = await resolvePresidentViewerFallback(authUser, baseRole);
        setProfile({
          ...dbProfile,
          full_name: dbProfile.full_name || metaFullName,
          role: resolvedRole,
        });
        return resolvedRole;
      }
    } catch {
      const fallbackRole: UserRole = knownAdmin ? 'admin' : 'member';
      const resolvedRole = await resolvePresidentViewerFallback(authUser, fallbackRole);
      setProfile({
        id: authUser.id,
        full_name: metaFullName,
        role: resolvedRole,
      });
      return resolvedRole;
    }
  };

  useEffect(() => {
    const client = getSupabaseClient();

    if (configured && client) {
      client.auth.getSession().then(async ({ data: { session: activeSession } }) => {
        setSession(activeSession);
        setUser(activeSession?.user ?? null);
        if (activeSession?.user) {
          await fetchSupabaseProfile(activeSession.user);
        } else {
          setProfile(null);
        }
        setIsLoading(false);
      });

      const { data: { subscription } } = client.auth.onAuthStateChange(
        async (event, newSession) => {
          if (event === 'PASSWORD_RECOVERY') {
            setIsPasswordRecovery(true);
          } else if (event === 'SIGNED_OUT') {
            setIsPasswordRecovery(false);
          }

          setSession(newSession);
          setUser(newSession?.user ?? null);
          if (newSession?.user) {
            await fetchSupabaseProfile(newSession.user);
          } else {
            setProfile(null);
          }
          setIsLoading(false);
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    } else {
      setIsLoading(false);
    }
  }, [configured]);

  const signInWithPassword = async (email: string, pass: string): Promise<AuthResult> => {
    setError(null);
    const client = getSupabaseClient();
    const cleanEmail = email.replace(/\s+/g, '').toLowerCase();

    if (!client) {
      const msg = 'অথেনটিকেশন সার্ভিস সংযুক্ত নয়। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।';
      setError(msg);
      return { success: false, error: msg };
    }

    try {
      const { data, error: authErr } = await client.auth.signInWithPassword({
        email: cleanEmail,
        password: pass,
      });

      if (authErr) {
        let friendlyMsg = authErr.message;
        const lower = authErr.message.toLowerCase();
        if (lower.includes('invalid login credentials')) {
          friendlyMsg = 'ইমেইল বা পাসওয়ার্ড সঠিক নয়। অনুগ্রহ করে সঠিক তথ্য দিন।';
        } else if (lower.includes('email not confirmed')) {
          friendlyMsg =
            'আপনার ইমেইল এখনো কনফার্ম করা হয়নি। Gmail-এর Inbox বা Spam ফোল্ডার চেক করে লিংকে ক্লিক করুন অথবা নিচ থেকে নতুন কনফার্মেশন মেইল পাঠান।';
          setError(friendlyMsg);
          return {
            success: false,
            needsEmailConfirmation: true,
            unconfirmedEmail: cleanEmail,
            error: friendlyMsg,
          };
        }
        setError(friendlyMsg);
        return { success: false, error: friendlyMsg };
      }

      setIsPasswordRecovery(false);
      setSession(data.session);
      setUser(data.user);
      let resolvedRole: UserRole = isAdminEmail(cleanEmail) ? 'admin' : 'member';
      if (data.user) {
        try {
          await client.rpc('link_my_member_by_auth');
        } catch {
          // ignore if RPC not created yet
        }
        resolvedRole = await fetchSupabaseProfile(data.user);
      }
      markWelcomePreloaderPending();
      return { success: true, user: data.user, role: resolvedRole };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const memberSignIn = async (params: MemberLoginParams): Promise<AuthResult> => {
    setError(null);
    const client = getSupabaseClient();
    if (!client) {
      const msg = 'সার্ভারের সাথে সংযোগ স্থাপন করা যাচ্ছে না।';
      setError(msg);
      return { success: false, error: msg };
    }

    const cleanEmail = params.email.replace(/\s+/g, '').toLowerCase();
    const localEmail = (params.localMemberEmail || '').replace(/\s+/g, '').toLowerCase();

    // 1. Verify Name (memberId) + Email match against Supabase RPC
    let rpcVerified: boolean | null = null;
    try {
      const { data: matchData, error: rpcErr } = await client.rpc('verify_member_login_match', {
        p_member_id: params.memberId,
        p_email: cleanEmail,
      });

      if (!rpcErr && typeof matchData === 'boolean') {
        rpcVerified = matchData;
        if (!matchData) {
          const msg =
            'নির্বাচিত সদস্যের নামের সাথে প্রদত্ত ইমেইল মিলছে না! ডাটাবেজে আপনার ইমেইল আপডেট করা আছে কিনা নিশ্চিত করতে কোষাধ্যক্ষ / অ্যাডমিনের সাথে যোগাযোগ করুন।';
          setError(msg);
          return { success: false, error: msg };
        }
      }
    } catch {
      rpcVerified = null;
    }

    // Fallback check when RPC is not yet installed in Supabase
    if (rpcVerified === null && localEmail && localEmail !== cleanEmail) {
      const msg = 'নির্বাচিত সদস্যের নামের সাথে প্রদত্ত ইমেইল মিলছে না।';
      setError(msg);
      return { success: false, error: msg };
    }

    // 2. Try regular password sign in
    try {
      const { data, error: signInErr } = await client.auth.signInWithPassword({
        email: cleanEmail,
        password: params.password,
      });

      if (!signInErr && data.user && data.session) {
        // Post-auth verification in case RPC wasn't present yet
        if (rpcVerified === null) {
          const { data: ownRow } = await client
            .from('members')
            .select('id, email')
            .eq('id', params.memberId)
            .maybeSingle();

          const isKnownAdminSelf = isAdminEmail(cleanEmail) && params.memberCode.toUpperCase() === 'BND-007';
          if (!isKnownAdminSelf && (!ownRow || (ownRow.email && ownRow.email.toLowerCase().trim() !== cleanEmail))) {
            await client.auth.signOut();
            const msg = 'নির্বাচিত সদস্যের নামের সাথে প্রদত্ত ইমেইল মিলছে না!';
            setError(msg);
            return { success: false, error: msg };
          }
        }

        try {
          await client.rpc('link_my_member_by_auth');
        } catch {
          // ignore if RPC not installed
        }

        // Persist selected member code in auth metadata for seamless matching
        try {
          if (data.user.user_metadata?.member_code !== params.memberCode) {
            await client.auth.updateUser({
              data: {
                full_name: params.memberName,
                member_code: params.memberCode,
              },
            });
          }
        } catch {
          // ignore metadata sync error
        }

        setIsPasswordRecovery(false);
        setSession(data.session);
        setUser(data.user);
        let resolvedRole = await fetchSupabaseProfile(data.user);
        if (resolvedRole === 'member' && params.memberCode.toUpperCase() === 'BND-005') {
          resolvedRole = 'viewer';
          setProfile((prev) => (prev ? { ...prev, role: 'viewer' } : prev));
        }
        markWelcomePreloaderPending();
        return { success: true, user: data.user, role: resolvedRole };
      }

      const errLower = (signInErr?.message || '').toLowerCase();

      if (errLower.includes('email not confirmed')) {
        const msg =
          'আপনার ইমেইল এখনো কনফার্ম করা হয়নি। Gmail-এর Inbox বা Spam ফোল্ডারে পাঠানো ভেরিফিকেশন লিংকে ক্লিক করুন অথবা নিচের বাটন থেকে মেইলটি আবার পাঠান।';
        setError(msg);
        return {
          success: false,
          needsEmailConfirmation: true,
          unconfirmedEmail: cleanEmail,
          error: msg,
        };
      }

      // 3. First-time activation using default password "123456" when name & email matched
      if (params.password === '123456' && (rpcVerified === true || (localEmail && localEmail === cleanEmail))) {
        const { data: signUpData, error: signUpErr } = await client.auth.signUp({
          email: cleanEmail,
          password: '123456',
          options: {
            emailRedirectTo: `${PRODUCTION_SITE_URL}/login`,
            data: {
              full_name: params.memberName,
              member_code: params.memberCode,
            },
          },
        });

        if (signUpErr) {
          const suLower = signUpErr.message.toLowerCase();
          const msg = suLower.includes('already registered')
            ? 'পাসওয়ার্ড সঠিক নয়। আপনি ইতিপূর্বে পাসওয়ার্ড পরিবর্তন করে থাকলে নতুন পাসওয়ার্ড দিয়ে লগইন করুন।'
            : signUpErr.message;
          setError(msg);
          return { success: false, error: msg };
        }

        if (signUpData.session && signUpData.user) {
          try {
            await client.rpc('link_my_member_by_auth');
          } catch {
            // ignore
          }
          setIsPasswordRecovery(false);
          setSession(signUpData.session);
          setUser(signUpData.user);
          let resolvedRole = await fetchSupabaseProfile(signUpData.user);
          if (resolvedRole === 'member' && params.memberCode.toUpperCase() === 'BND-005') {
            resolvedRole = 'viewer';
            setProfile((prev) => (prev ? { ...prev, role: 'viewer' } : prev));
          }
          markWelcomePreloaderPending();
          return { success: true, user: signUpData.user, role: resolvedRole, isFirstActivation: true };
        }

        const confirmMsg =
          'আপনার সদস্য অ্যাকাউন্ট চালু করা হয়েছে! অনুগ্রহ করে এখনই আপনার Gmail-এ পাঠানো কনফার্মেশন লিংকে ক্লিক করে তারপর 123456 দিয়ে লগইন করুন।';
        setError(confirmMsg);
        return {
          success: false,
          needsEmailConfirmation: true,
          unconfirmedEmail: cleanEmail,
          error: confirmMsg,
        };
      }

      const fallbackMsg =
        rpcVerified === true
          ? 'পাসওয়ার্ড সঠিক নয়। প্রথমবার লগইনের জন্য "123456" অথবা আপনার পরিবর্তিত পাসওয়ার্ড ব্যবহার করুন।'
          : 'ইমেইল বা পাসওয়ার্ড সঠিক নয়, অথবা আপনার ইমেইল এখনো সদস্য তালিকায় যুক্ত করা হয়নি।';
      setError(fallbackMsg);
      return { success: false, error: fallbackMsg };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const resendConfirmationEmail = async (
    email: string
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    const client = getSupabaseClient();
    const cleanEmail = email.replace(/\s+/g, '').toLowerCase();
    if (!client) {
      return { success: false, error: 'অথেনটিকেশন সার্ভিস সংযুক্ত নয়।' };
    }
    if (!cleanEmail) {
      return { success: false, error: 'সঠিক ইমেইল ঠিকানা প্রদান করুন।' };
    }

    try {
      const { error: resendErr } = await client.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: {
          emailRedirectTo: `${PRODUCTION_SITE_URL}/login`,
        },
      });

      if (resendErr) {
        const lower = resendErr.message.toLowerCase();
        if (lower.includes('rate limit') || lower.includes('security purposes') || lower.includes('seconds')) {
          return {
            success: false,
            error: 'নিরাপত্তার জন্য কিছুক্ষণ (প্রায় ৬০ সেকেন্ড) অপেক্ষা করে আবার কনফার্মেশন মেইল পাঠান।',
          };
        }
        return { success: false, error: resendErr.message };
      }

      return {
        success: true,
        message: `${cleanEmail} ঠিকানায় নতুন কনফার্মেশন লিংক পাঠানো হয়েছে! অনুগ্রহ করে Gmail-এর Inbox বা Spam ফোল্ডার চেক করুন।`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  };

  const updatePassword = async (newPassword: string): Promise<AuthResult> => {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, error: 'অথেনটিকেশন সার্ভিস সংযুক্ত নয়।' };
    }

    if (/[\sA-Z]/.test(newPassword)) {
      return { success: false, error: 'পাসওয়ার্ডে বড় হাতের অক্ষর (Capital Letter) বা স্পেস ব্যবহার করা যাবে না।' };
    }

    if (newPassword.length < 6) {
      return { success: false, error: 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' };
    }

    try {
      const { data, error: updErr } = await client.auth.updateUser({ password: newPassword });
      if (updErr) throw updErr;

      let resolvedRole: UserRole = 'member';
      if (data.user) {
        try {
          await client.rpc('link_my_member_by_auth');
        } catch {
          // ignore if RPC not installed
        }
        resolvedRole = await fetchSupabaseProfile(data.user);
      }

      setIsPasswordRecovery(false);
      return { success: true, user: data.user, role: resolvedRole };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  };

  const clearPasswordRecovery = () => {
    setIsPasswordRecovery(false);
  };

  const resetPassword = async (email: string) => {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, error: 'অথেনটিকেশন সার্ভিস সংযুক্ত নয়।' };
    }

    try {
      const { error: resetErr } = await client.auth.resetPasswordForEmail(
        email.replace(/\s+/g, '').toLowerCase(),
        {
          redirectTo: `${PRODUCTION_SITE_URL}/login`,
        }
      );
      if (resetErr) throw resetErr;
      return { success: true, message: 'পাসওয়ার্ড রিসেট লিঙ্ক আপনার ইমেইলে পাঠানো হয়েছে।' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  };

  const signOut = async () => {
    const client = getSupabaseClient();
    if (client) {
      await client.auth.signOut();
    }
    setIsPasswordRecovery(false);
    setSession(null);
    setUser(null);
    setProfile(null);
    clearWelcomePreloaderSession();
    localStorage.removeItem('bondhon_demo_profile');
  };

  const switchDemoRole = (newRole: UserRole) => {
    const target = INITIAL_PROFILES[0];
    setProfile({ ...target, role: newRole });
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchSupabaseProfile(user);
    }
  };

  const userEmail = (user?.email || '').toLowerCase();
  const knownAdminEmail = isAdminEmail(userEmail);
  const role: UserRole = knownAdminEmail
    ? 'admin'
    : profile?.role === 'admin'
    ? 'admin'
    : profile?.role === 'viewer'
    ? 'viewer'
    : 'member';
  const isAdmin = role === 'admin';
  const isViewer = role === 'viewer';
  const canAccessAdmin = role === 'admin' || role === 'viewer';
  const canEditAdmin = role === 'admin';
  const isMember = role === 'member';
  const isAuthenticated = Boolean(user && session);

  const value = useMemo(
    () => ({
      user,
      profile,
      role,
      isAdmin,
      isViewer,
      canAccessAdmin,
      canEditAdmin,
      isMember,
      isAuthenticated,
      isLoading,
      isConfigured: configured,
      isPasswordRecovery,
      error,
      signInWithPassword,
      memberSignIn,
      resendConfirmationEmail,
      updatePassword,
      clearPasswordRecovery,
      signOut,
      resetPassword,
      switchDemoRole,
      refreshProfile,
    }),
    [
      user,
      session,
      profile,
      role,
      isAdmin,
      isViewer,
      canAccessAdmin,
      canEditAdmin,
      isMember,
      isAuthenticated,
      isLoading,
      configured,
      isPasswordRecovery,
      error,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
