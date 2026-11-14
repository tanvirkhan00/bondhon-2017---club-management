import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  // Support Vite and Next.js / Netlify environment variable naming
  const envUrl =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
    (typeof import.meta !== 'undefined' && (import.meta.env as any)?.NEXT_PUBLIC_SUPABASE_URL) ||
    '';

  const envKey =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
    (typeof import.meta !== 'undefined' && (import.meta.env as any)?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    '';

  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('bondhon_supabase_url') || '' : '';
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('bondhon_supabase_anon_key') || '' : '';

  // Default to user's configured Supabase project
  const url = (localUrl || envUrl || 'https://xzltkdbfeunoqnkowcap.supabase.co').trim();
  const anonKey = (localKey || envKey || 'sb_publishable_0G7QiIlBZNYcvOApQS8iyA_jQq6GrnV').trim();

  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(
    url &&
    url.startsWith('https://') &&
    url.includes('.supabase.co') &&
    anonKey &&
    anonKey.length > 20
  );
}

let supabaseInstance: SupabaseClient | null = null;
let currentUrl = '';
let currentKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();

  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!supabaseInstance || currentUrl !== url || currentKey !== anonKey) {
    currentUrl = url;
    currentKey = anonKey;
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return supabaseInstance;
}

export function saveCustomSupabaseCredentials(url: string, anonKey: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('bondhon_supabase_url', url.trim());
    localStorage.setItem('bondhon_supabase_anon_key', anonKey.trim());
    supabaseInstance = null;
  }
}

export function clearCustomSupabaseCredentials() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('bondhon_supabase_url');
    localStorage.removeItem('bondhon_supabase_anon_key');
    supabaseInstance = null;
  }
}

export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase URL or Anon Key is missing or invalid.' };
  }

  try {
    const { error } = await client.from('members').select('id').limit(1);
    if (error) {
      return { success: false, message: `Connected to Supabase, but query failed: ${error.message}. Make sure schema.sql was executed.` };
    }
    return { success: true, message: 'Successfully connected to Supabase database!' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Connection error: ${msg}` };
  }
}
