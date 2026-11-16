import React, { useState } from 'react';
import { useClubData } from '../../hooks/useClubData';
import { useAuth } from '../../hooks/useAuth';
import { PageTransition } from '../../components/ui/MotionPrimitives';
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
  RefreshCw,
  Download,
  ChevronDown,
  ChevronUp,
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
  const { isConfigured } = useAuth();

  const currentCreds = getSupabaseCredentials();
  const [supabaseUrl, setSupabaseUrl] = useState(currentCreds.url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(currentCreds.anonKey);
  const [savingCreds, setSavingCreds] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showAdvancedDb, setShowAdvancedDb] = useState(false);

  const [amountInput, setAmountInput] = useState(defaultDueAmount);
  const [clubEmail, setClubEmail] = useState('contact@bondhon2017.org');
  const [clubPhone, setClubPhone] = useState('+880 1711-223344');
  const [clubAddress, setClubAddress] = useState('চরচান্দা খাসমহল বাজার');
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

  const handleDownloadJsonBackup = () => {
    const backupData = {
      club_name: 'Bondhon 2017 (বন্ধুত্ব সমবায় সমিতি)',
      backup_timestamp: new Date().toISOString(),
      currency: 'BDT (৳)',
      members,
      monthly_dues: monthlyDues,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `Bondhon_2017_Backup_${new Date().toISOString().substring(0, 10)}.json`);
    dlAnchorElem.click();
  };

  return (
    <PageTransition className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-4 border-b border-[#E8EDF3] dark:border-[#1F2F46]">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#172435] dark:text-slate-100 flex items-center gap-2.5">
          <SettingsIcon className="w-6 h-6 text-[#087F70]" />
          <span>Club Administration Settings</span>
        </h1>
        <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 mt-0.5">
          Configure monthly contribution rates, contact details, and data backups
        </p>
      </div>

      {/* SECTION 1: Club Contact & Default Contribution */}
      <div className="surface-card rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-[#172435] dark:text-slate-100">
            Club Details &amp; Monthly Fee
          </h2>
          <p className="text-xs text-[#64748B] dark:text-slate-400">
            Standard monthly contribution per share (BDT ৳)
          </p>
        </div>

        <form onSubmit={handleSaveClubSettings} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#172435] dark:text-slate-200 mb-1.5">
                Club Name
              </label>
              <input
                type="text"
                disabled
                value="বন্ধুত্ব সমবায় সমিতি (Bondhon 2017)"
                className="w-full px-3 py-2 text-sm bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl font-bold text-[#172435] dark:text-slate-200 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#172435] dark:text-slate-200 mb-1.5">
                Monthly Fee Per Share / Name (BDT ৳)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2 text-sm font-bold text-[#64748B]">৳</span>
                <input
                  type="number"
                  min={100}
                  step={50}
                  value={amountInput}
                  onChange={(e) => setAmountInput(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 text-sm bg-white dark:bg-[#111C2D] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl font-mono tabular-nums font-bold focus:outline-hidden focus:ring-2 focus:ring-[#087F70]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-[#172435] dark:text-slate-200 mb-1.5">
                Official Contact Email
              </label>
              <input
                type="email"
                value={clubEmail}
                onChange={(e) => setClubEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#087F70]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#172435] dark:text-slate-200 mb-1.5">
                Treasurer Contact Number
              </label>
              <input
                type="text"
                value={clubPhone}
                onChange={(e) => setClubPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl font-mono focus:outline-hidden focus:ring-2 focus:ring-[#087F70]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#172435] dark:text-slate-200 mb-1.5">
                Office Location
              </label>
              <input
                type="text"
                value={clubAddress}
                onChange={(e) => setClubAddress(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#087F70]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {saveSuccess ? (
              <span className="text-xs text-[#087F70] dark:text-[#34D399] font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Settings saved successfully
              </span>
            ) : (
              <span />
            )}

            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-[#087F70] hover:bg-[#06675B] rounded-xl shadow-2xs cursor-pointer transition-colors whitespace-nowrap"
            >
              Save Club Settings
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: Data Backups */}
      <div className="surface-card rounded-2xl p-6 space-y-3">
        <h2 className="text-sm font-bold text-[#172435] dark:text-slate-100 flex items-center gap-2">
          <Download className="w-4 h-4 text-[#087F70]" />
          <span>Financial Records Backup &amp; Reset</span>
        </h2>
        <p className="text-xs text-[#64748B] dark:text-slate-400">
          Export full JSON backup of member profiles and payment records.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={handleDownloadJsonBackup}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#172435] dark:text-slate-200 bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] hover:bg-slate-200/70 dark:hover:bg-[#203650] rounded-xl transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-[#087F70]" />
            <span>Download Full Backup ({members.length} members · {monthlyDues.length} entries)</span>
          </button>

          <button
            onClick={resetDemoData}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-800/60 cursor-pointer transition-colors whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Clear Payment History &amp; Reset Roster</span>
          </button>
        </div>
      </div>

      {/* SECTION 3: Collapsible Advanced Cloud Sync */}
      <div className="surface-card rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvancedDb(!showAdvancedDb)}
          className="w-full p-5 flex items-center justify-between text-left hover:bg-[#F5F6F3]/70 dark:hover:bg-[#162438]/60 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-[#087F70]" />
            <div>
              <span className="text-sm font-bold text-[#172435] dark:text-slate-100 block">
                Cloud Storage &amp; Sync Configuration
              </span>
              <span className="text-[11px] text-[#64748B] dark:text-slate-400">
                {isConfigured ? 'Connected to Cloud Server' : 'Configured via environment'}
              </span>
            </div>
          </div>
          {showAdvancedDb ? (
            <ChevronUp className="w-4 h-4 text-[#64748B]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#64748B]" />
          )}
        </button>

        {showAdvancedDb && (
          <div className="p-6 pt-0 border-t border-[#E8EDF3] dark:border-[#1F2F46] space-y-4">
            {testResult && (
              <div
                className={`mt-4 p-3.5 rounded-xl text-xs flex items-center gap-2 border ${
                  testResult.success
                    ? 'bg-[#087F70]/10 text-[#087F70] dark:text-[#34D399] border-[#087F70]/25'
                    : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveCredentials} className="space-y-4 text-xs mt-4">
              <div>
                <label className="block font-semibold text-[#172435] dark:text-slate-200 mb-1.5">
                  Project Endpoint URL
                </label>
                <input
                  type="url"
                  placeholder="https://xyzcompany.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl font-mono focus:outline-hidden focus:ring-2 focus:ring-[#087F70]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172435] dark:text-slate-200 mb-1.5">
                  Publishable / Anon Key
                </label>
                <input
                  type="password"
                  placeholder="sb_publishable_..."
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F5F6F3] dark:bg-[#162438] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl font-mono focus:outline-hidden focus:ring-2 focus:ring-[#087F70]"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={savingCreds}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#087F70] hover:bg-[#06675B] rounded-xl shadow-2xs cursor-pointer whitespace-nowrap"
                  >
                    {savingCreds ? 'Testing...' : 'Save & Test Connection'}
                  </button>

                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={savingCreds || !supabaseUrl}
                    className="px-3.5 py-2 text-xs font-semibold bg-[#F5F6F3] hover:bg-slate-200/70 dark:bg-[#162438] dark:hover:bg-[#203650] border border-[#E8EDF3] dark:border-[#1F2F46] rounded-xl cursor-pointer whitespace-nowrap"
                  >
                    Verify Status
                  </button>
                </div>

                {supabaseUrl && (
                  <button
                    type="button"
                    onClick={handleClearCredentials}
                    className="text-xs text-rose-600 hover:underline cursor-pointer"
                  >
                    Reset to Default
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </PageTransition>
  );
};
