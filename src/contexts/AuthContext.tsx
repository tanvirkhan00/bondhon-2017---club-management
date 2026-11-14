import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { Profile, UserRole } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabase/client';
import { INITIAL_PROFILES } from '../lib/mockData';

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
  isFirstActivation?: boolean;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: UserRole;
  isAdmin: boolean;
  isMember: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  error: string | null;
  signInWithPassword: (email: string, pass: string) => Promise<AuthResult>;
  memberSignIn: (params: MemberLoginParams) => Promise<AuthResult>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
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
  const [error, setError] = useState<string | null>(null);

  const configured = isSupabaseConfigured();

  const fetchSupabaseProfile = async (authUser: User) => {
    const client = getSupabaseClient();
    if (!client) return;

    const userEmail = (authUser.email || '').toLowerCase().trim();
    const knownAdmin = isAdminEmail(userEmail);
    const metaFullName =
      authUser.user_metadata?.full_name ||
      (knownAdmin ? 'Tanvir Khan' : userEmail.split('@')[0] || 'Club Member');

    try {
      const { data, error: profileErr } = await client
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileErr || !data) {
        const fallbackRole: UserRole = knownAdmin ? 'admin' : 'member';
        // Best-effort profile sync so foreign keys like monthly_dues.recorded_by remain valid
        try {
          await client.from('profiles').upsert(
            {
              id: authUser.id,
              full_name: metaFullName,
              role: fallbackRole,
            },
            { onConflict: 'id', ignoreDuplicates: true }
          );
        } catch {
          // ignore RLS insert failures if already managed by trigger
        }
        setProfile({
          id: authUser.id,
          full_name: metaFullName,
          role: fallbackRole,
        });
      } else {
        const dbProfile = data as Profile;
        setProfile({
          ...dbProfile,
          full_name: dbProfile.full_name || metaFullName,
          role: knownAdmin ? 'admin' : (dbProfile.role || 'member'),
        });
      }
    } catch {
      setProfile({
        id: authUser.id,
        full_name: metaFullName,
        role: knownAdmin ? 'admin' : 'member',
      });
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
        async (_event, newSession) => {
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

    if (!client) {
      const msg = 'অথেনটিকেশন সার্ভিস সংযুক্ত নয়। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।';
      setError(msg);
      return { success: false, error: msg };
    }

    try {
      const { data, error: authErr } = await client.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });

      if (authErr) {
        let friendlyMsg = authErr.message;
        const lower = authErr.message.toLowerCase();
        if (lower.includes('invalid login credentials')) {
          friendlyMsg = 'ইমেইল বা পাসওয়ার্ড সঠিক নয়। অনুগ্রহ করে সঠিক তথ্য দিন।';
        } else if (lower.includes('email not confirmed')) {
          friendlyMsg = 'আপনার ইমেইল এখনো ভেরিফাই করা হয়নি। ইমেইলের ইনবক্স চেক করুন।';
        }
        setError(friendlyMsg);
        return { success: false, error: friendlyMsg };
      }

      setSession(data.session);
      setUser(data.user);
      if (data.user) {
        try {
          await client.rpc('link_my_member_by_auth');
        } catch {
          // ignore if RPC not created yet
        }
        await fetchSupabaseProfile(data.user);
      }
      return { success: true, user: data.user };
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

    const cleanEmail = params.email.trim().toLowerCase();
    const localEmail = (params.localMemberEmail || '').trim().toLowerCase();

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

        setSession(data.session);
        setUser(data.user);
        await fetchSupabaseProfile(data.user);
        return { success: true, user: data.user };
      }

      const errLower = (signInErr?.message || '').toLowerCase();

      if (errLower.includes('email not confirmed')) {
        const msg = 'আপনার ইমেইল এখনো কনফার্ম করা হয়নি। ইমেইলের ইনবক্স বা স্প্যাম ফোল্ডার চেক করে ভেরিফিকেশন লিঙ্কে ক্লিক করুন।';
        setError(msg);
        return { success: false, error: msg };
      }

      // 3. First-time activation using default password "123456" when name & email matched
      if (params.password === '123456' && (rpcVerified === true || (localEmail && localEmail === cleanEmail))) {
        const { data: signUpData, error: signUpErr } = await client.auth.signUp({
          email: cleanEmail,
          password: '123456',
          options: {
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
          setSession(signUpData.session);
          setUser(signUpData.user);
          await fetchSupabaseProfile(signUpData.user);
          return { success: true, user: signUpData.user, isFirstActivation: true };
        }

        const confirmMsg =
          'আপনার সদস্য অ্যাকাউন্ট চালু করা হয়েছে! অনুগ্রহ করে আপনার ইমেইলে পাঠানো কনফার্মেশন লিঙ্কে ক্লিক করে তারপর 123456 দিয়ে লগইন করুন।';
        setError(confirmMsg);
        return { success: false, error: confirmMsg };
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

  const updatePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, error: 'অথেনটিকেশন সার্ভিস সংযুক্ত নয়।' };
    }

    if (newPassword.length < 6) {
      return { success: false, error: 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' };
    }

    try {
      const { error: updErr } = await client.auth.updateUser({ password: newPassword });
      if (updErr) throw updErr;
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  };

  const resetPassword = async (email: string) => {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, error: 'অথেনটিকেশন সার্ভিস সংযুক্ত নয়।' };
    }

    try {
      const { error: resetErr } = await client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });
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
    setSession(null);
    setUser(null);
    setProfile(null);
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
  const role: UserRole = profile?.role === 'admin' || knownAdminEmail ? 'admin' : (profile?.role || 'member');
  const isAdmin = role === 'admin';
  const isMember = role === 'member';
  const isAuthenticated = Boolean(user && session);

  const value = useMemo(
    () => ({
      user,
      profile,
      role,
      isAdmin,
      isMember,
      isAuthenticated,
      isLoading,
      isConfigured: configured,
      error,
      signInWithPassword,
      memberSignIn,
      updatePassword,
      signOut,
      resetPassword,
      switchDemoRole,
      refreshProfile,
    }),
    [user, session, profile, role, isAdmin, isMember, isAuthenticated, isLoading, configured, error]
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
