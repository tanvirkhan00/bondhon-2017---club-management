import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { Profile, UserRole } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabase/client';
import { INITIAL_PROFILES } from '../lib/mockData';

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
  signUp: (email: string, pass: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  switchDemoRole: (role: UserRole) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(() => {
    const saved = localStorage.getItem('bondhon_demo_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    // In dev mode, initialize with Demo Admin
    return INITIAL_PROFILES[0];
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const configured = isSupabaseConfigured();

  const fetchSupabaseProfile = async (userId: string) => {
    const client = getSupabaseClient();
    if (!client) return;

    try {
      const { data, error: profileErr } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileErr) {
        console.warn('Profile fetch note:', profileErr.message);
        // default fallback if row hasn't synced
        setProfile({
          id: userId,
          full_name: user?.user_metadata?.full_name || 'Club Member',
          role: 'member',
        });
      } else if (data) {
        setProfile(data as Profile);
      }
    } catch (err) {
      console.error('Failed to load Supabase profile:', err);
    }
  };

  useEffect(() => {
    const client = getSupabaseClient();

    if (configured && client) {
      client.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchSupabaseProfile(session.user.id);
        }
        setIsLoading(false);
      });

      const { data: { subscription } } = client.auth.onAuthStateChange(
        async (_event, newSession) => {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          if (newSession?.user) {
            await fetchSupabaseProfile(newSession.user.id);
          } else {
            const saved = localStorage.getItem('bondhon_demo_profile');
            setProfile(saved ? JSON.parse(saved) : null);
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

    // If Supabase not configured, allow testing sign-in with admin@bondhon.com or member@bondhon.com
    if (!client) {
      if (email.toLowerCase().includes('admin')) {
        setProfile(INITIAL_PROFILES[0]);
        localStorage.setItem('bondhon_demo_profile', JSON.stringify(INITIAL_PROFILES[0]));
        return { success: true };
      } else {
        setProfile(INITIAL_PROFILES[1]);
        localStorage.setItem('bondhon_demo_profile', JSON.stringify(INITIAL_PROFILES[1]));
        return { success: true };
      }
    }

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }

      setSession(data.session);
      setUser(data.user);
      if (data.user) {
        await fetchSupabaseProfile(data.user.id);
      }
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const signUp = async (email: string, pass: string, fullName: string) => {
    setError(null);
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, error: 'Supabase is not configured yet. Configure URL and Key in Settings.' };
    }

    try {
      const { data, error } = await client.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }

      setSession(data.session);
      setUser(data.user);
      if (data.user) {
        await fetchSupabaseProfile(data.user.id);
      }
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const resetPassword = async (email: string) => {
    const client = getSupabaseClient();
    if (!client) {
      return { success: true, message: 'In local development mode: password reset simulated.' };
    }

    try {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      return { success: true, message: 'Password reset link sent to your email.' };
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
    const target = newRole === 'admin' ? INITIAL_PROFILES[0] : INITIAL_PROFILES[1];
    setProfile(target);
    localStorage.setItem('bondhon_demo_profile', JSON.stringify(target));
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchSupabaseProfile(user.id);
    }
  };

  const role: UserRole = profile?.role || 'member';
  const isAdmin = role === 'admin';
  const isMember = role === 'member';
  const isAuthenticated = Boolean(user || profile);

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
    [user, profile, role, isAdmin, isMember, isAuthenticated, isLoading, configured, error]
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
