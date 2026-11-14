import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { Profile, UserRole } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabase/client';
import { INITIAL_PROFILES } from '../lib/mockData';

interface SignUpResult {
  success: boolean;
  needsEmailConfirmation?: boolean;
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
  signInWithPassword: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, pass: string, fullName: string, memberCode?: string) => Promise<SignUpResult>;
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

    const userEmail = (authUser.email || '').toLowerCase();
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
        setProfile({
          id: authUser.id,
          full_name: metaFullName,
          role: knownAdmin ? 'admin' : 'member',
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

  const signInWithPassword = async (email: string, pass: string) => {
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
          friendlyMsg =
            'ইমেইল বা পাসওয়ার্ড সঠিক নয়। আপনি যদি নতুন সদস্য হন, তবে "নতুন অ্যাকাউন্ট (Sign Up)" ট্যাব থেকে আগে নিবন্ধন করুন।';
        } else if (lower.includes('email not confirmed')) {
          friendlyMsg =
            'আপনার ইমেইল এখনো ভেরিফাই করা হয়নি। ইমেইলের ইনবক্স বা স্প্যাম ফোল্ডারে পাঠানো কনফার্মেশন লিঙ্কে ক্লিক করুন।';
        }
        setError(friendlyMsg);
        return { success: false, error: friendlyMsg };
      }

      setSession(data.session);
      setUser(data.user);
      if (data.user) {
        await fetchSupabaseProfile(data.user);
      }
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const signUp = async (email: string, pass: string, fullName: string, memberCode?: string): Promise<SignUpResult> => {
    setError(null);
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, error: 'অথেনটিকেশন সার্ভিস সংযুক্ত নয়।' };
    }

    try {
      const { data, error: signUpErr } = await client.auth.signUp({
        email: email.trim(),
        password: pass,
        options: {
          data: {
            full_name: fullName.trim(),
            member_code: memberCode || null,
          },
        },
      });

      if (signUpErr) {
        let friendlyMsg = signUpErr.message;
        if (signUpErr.message.toLowerCase().includes('already registered')) {
          friendlyMsg = 'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট তৈরি করা হয়েছে। অনুগ্রহ করে লগইন করুন।';
        }
        setError(friendlyMsg);
        return { success: false, error: friendlyMsg };
      }

      if (data.session && data.user) {
        setSession(data.session);
        setUser(data.user);
        await fetchSupabaseProfile(data.user);
        return { success: true, needsEmailConfirmation: false };
      }

      // Account created, waiting for email confirmation
      return { success: true, needsEmailConfirmation: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
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
      signUp,
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
