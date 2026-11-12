import React, { useState } from 'react';
import { useClubData } from '../../hooks/useClubData';
import { useAuth } from '../../hooks/useAuth';
import {
  getSupabaseCredentials,
  saveCustomSupabaseCredentials,
  clearCustomSupabaseCredentials,
  testSupabaseConnection,
} from '../../services/supabase/client';
import {
  Settings as SettingsIcon,
  Database,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  Download,
  Shield,
  Key,
  Users,
} from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const {
    defaultDueAmount,
    setDefaultDueAmount,
    members,
    monthlyDues,
    resetDemoData,
    refreshData,
  } = useClubData();
  const { profile, role, switchDemoRole, isConfigured } = useAuth();

  const currentCreds = getSupabaseCredentials();
  const [supabaseUrl, setSupabaseUrl] = useState(currentCreds.url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(currentCreds.anonKey);
  const [savingCreds, setSavingCreds] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [amountInput, setAmountInput] = useState(defaultDueAmount);
  const [clubEmail, setClubEmail] = useState('contact@bondhon2017.org');
  const [clubPhone, setClubPhone] = useState('+880 1711-223344');
  const [clubAddress, setClubAddress] = useState('Dhaka, Bangladesh');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveClubSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setDefaultDueAmount(amountInput);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCreds(true);
    setTestResult(null);

    saveCustomSupabaseCredentials(supabaseUrl, supabaseAnonKey);
    const test = await testSupabaseConnection();
    setTestResult(test);
    setSavingCreds(false);

    if (test.success) {
      await refreshData();
    }
  };

  const handleClearCredentials = () => {
    clearCustomSupabaseCredentials();
    setSupabaseUrl('');
    setSupabaseAnonKey('');
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setSavingCreds(true);
    const test = await testSupabaseConnection();
    setTestResult(test);
    setSavingCreds(false);
  };

  const handleCopySchemaSql = () => {
    const sql = `-- BONDHON 2017 FULLSTACK SUPABASE SCHEMA & RLS
-- Please run this SQL in your Supabase Project -> SQL Editor
create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz default now() not null
);

create table if not exists public.members (
  id uuid default gen_random_uuid() primary key,
  member_code text not null unique,
  full_name text not null,
  phone text,
  profile_image_url text,
  designation text default 'Member',
  join_date date not null default '2017-01-01',
  status text not null default 'active' check (status in ('active', 'inactive')),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  monthly_contribution numeric(12, 2) not null default 1000.00 check (monthly_contribution >= 0),
  created_at timestamptz default now() not null
);

create or replace view public.public_members as
select id, member_code, full_name, profile_image_url, designation, status
from public.members
where status = 'active';

grant select on public.public_members to anon, authenticated;

create table if not exists public.monthly_dues (
  id uuid default gen_random_uuid() primary key,
  member_id uuid not null references public.members(id) on delete cascade,
  month smallint not null check (month between 1 and 12),
  year smallint not null check (year >= 2017),
  amount_due numeric(12, 2) not null default 1000.00 check (amount_due >= 0),
  amount_paid numeric(12, 2) not null default 0.00 check (amount_paid >= 0),
  status text not null default 'unpaid' check (status in ('paid', 'unpaid', 'partial')),
  paid_at timestamptz,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null,
  constraint unique_member_month_year unique (member_id, month, year)
);

alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.monthly_dues enable row level security;

create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create policy "Profiles read" on public.profiles for select to authenticated using (auth.uid() = id or public.is_admin());
create policy "Members read" on public.members for select to authenticated using (auth_user_id = auth.uid() or public.is_admin());
create policy "Members admin write" on public.members for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Dues read" on public.monthly_dues for select to authenticated using (public.is_admin() or member_id in (select id from public.members where auth_user_id = auth.uid()));
create policy "Dues admin write" on public.monthly_dues for all to authenticated using (public.is_admin()) with check (public.is_admin());`;

    navigator.clipboard.writeText(sql);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  const handleDownloadJsonBackup = () => {
    const backupData = {
      club_name: 'Bondhon 2017',
      backup_timestamp: new Date().toISOString(),
      currency: 'BDT (৳)',
      members,
      monthly_dues: monthlyDues,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `Bondhon_2017_Full_Backup_${new Date().toISOString().substring(0, 10)}.json`);
    dlAnchorElem.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150 max-w-4xl">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <SettingsIcon className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
          <span>Club Administration Settings</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Configure club defaults, Supabase backend credentials, RBAC policies, and full backups
        </p>
      </div>

      {/* SECTION 1: Club Contact & Default Contribution */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Club Details & Contribution Schedule
          </h2>
          <p className="text-xs text-slate-500">
            Official club identity and baseline monthly membership dues in BDT (৳)
          </p>
        </div>

        <form onSubmit={handleSaveClubSettings} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Club Name
              </label>
              <input
                type="text"
                disabled
                value="Bondhon 2017"
                className="w-full px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-200 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Default Monthly Contribution (BDT ৳)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm font-bold text-slate-400">৳</span>
                <input
                  type="number"
                  min={100}
                  step={50}
                  value={amountInput}
                  onChange={(e) => setAmountInput(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Club Official Email
              </label>
              <input
                type="email"
                value={clubEmail}
                onChange={(e) => setClubEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Official Helpline Phone
              </label>
              <input
                type="text"
                value={clubPhone}
                onChange={(e) => setClubPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Location / District
              </label>
              <input
                type="text"
                value={clubAddress}
                onChange={(e) => setClubAddress(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {saveSuccess ? (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Settings updated
              </span>
            ) : <span />}

            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs"
            >
              Save Club Information
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: Supabase Backend Connection */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>Supabase Backend & PostgreSQL Connection</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configured via Netlify environment variables or custom runtime credentials
            </p>
          </div>

          <span
            className={`px-2.5 py-1 text-xs font-semibold rounded-md ${
              isConfigured
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
            }`}
          >
            {isConfigured ? 'Connected to Supabase' : 'Local Development Cache'}
          </span>
        </div>

        {testResult && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
              testResult.success
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />}
            <span>{testResult.message}</span>
          </div>
        )}

        <form onSubmit={handleSaveCredentials} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Supabase Project URL
            </label>
            <input
              type="url"
              placeholder="https://xyzcompany.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Supabase Public Anon Key
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={supabaseAnonKey}
              onChange={(e) => setSupabaseAnonKey(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              *Never expose your Supabase service_role secret key in the frontend. Public anon key is safe with RLS.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={savingCreds}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs"
              >
                {savingCreds ? 'Testing...' : 'Save & Verify Supabase'}
              </button>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={savingCreds || !supabaseUrl}
                className="px-3 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg"
              >
                Test Query
              </button>
            </div>

            {supabaseUrl && (
              <button
                type="button"
                onClick={handleClearCredentials}
                className="text-xs text-rose-600 hover:underline"
              >
                Clear Runtime Credentials
              </button>
            )}
          </div>
        </form>

        {/* Copy SQL Schema button */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Supabase PostgreSQL Schema SQL
            </h3>
            <p className="text-[11px] text-slate-400">
              Execute once in your Supabase SQL Editor (`supabase/schema.sql`).
            </p>
          </div>

          <button
            onClick={handleCopySchemaSql}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg hover:bg-emerald-100"
          >
            {copiedSchema ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSchema ? 'SQL Copied!' : 'Copy Migration SQL'}</span>
          </button>
        </div>
      </div>

      {/* SECTION 3: Admin Bootstrapping & Security Rules */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          <span>Admin Account Initialization & RLS Security</span>
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Bondhon 2017 enforces database-level authorization. Public users can never self-register as Admin:
        </p>

        <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 list-disc pl-5 leading-relaxed">
          <li><strong>First Admin Initialization:</strong> The trigger <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">public.handle_new_user()</code> promotes the very first account registered to <code className="font-mono text-emerald-600">admin</code>.</li>
          <li><strong>Subsequent Users:</strong> All future signups receive <code className="font-mono">member</code> role automatically.</li>
          <li><strong>Promoting Additional Admins:</strong> Only existing Admins can promote other members in the database, or execute:
            <pre className="mt-1 p-2 bg-slate-900 text-slate-100 rounded text-[11px] font-mono overflow-x-auto">
              update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'admin2@bondhon.com');
            </pre>
          </li>
          <li><strong>Row Level Security:</strong> Members cannot modify financial records or elevate their role.</li>
        </ul>
      </div>

      {/* SECTION 4: Data Backups */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Download className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          <span>Full Database JSON Backup</span>
        </h2>
        <p className="text-xs text-slate-500">
          Download a complete snapshot of all club members and monthly dues.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={handleDownloadJsonBackup}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Full Backup ({members.length} members · {monthlyDues.length} dues)</span>
          </button>

          {!isConfigured && (
            <button
              onClick={resetDemoData}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Clean Development Seed</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
