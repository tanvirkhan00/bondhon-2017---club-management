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
    <div className="space-y-6 animate-in fade-in duration-150 max-w-4xl">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <SettingsIcon className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
          <span>Club Administration Settings</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          সমিতির তথ্য, মাসিক কিস্তির হার এবং আর্থিক ব্যাকআপ পরিচালনা করুন
        </p>
      </div>

      {/* SECTION 1: Club Contact & Default Contribution */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Club Details &amp; Monthly Fee
          </h2>
          <p className="text-xs text-slate-500">
            প্রতি শেয়ার/নামের বিপরীতে নির্ধারিত মাসিক সঞ্চয় কিস্তি (BDT ৳)
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
                value="বন্ধুত্ব সমবায় সমিতি (Bondhon 2017)"
                className="w-full px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-200 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Monthly Fee Per Share / Name (BDT ৳)
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
                Official Contact Email
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
                Treasurer Contact Number
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
                Office Location
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
                <CheckCircle2 className="w-4 h-4" /> Settings saved successfully
              </span>
            ) : <span />}

            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs cursor-pointer"
            >
              Save Club Settings
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: Data Backups */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Download className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          <span>Financial Records Backup &amp; Reset</span>
        </h2>
        <p className="text-xs text-slate-500">
          সদস্য তালিকা ও সকল পেমেন্ট রেকর্ডের সম্পূর্ণ ব্যাকআপ ডাউনলোড করুন।
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={handleDownloadJsonBackup}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Full Backup ({members.length} members · {monthlyDues.length} entries)</span>
          </button>

          <button
            onClick={resetDemoData}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg border border-rose-200 dark:border-rose-800 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Clear Payment History &amp; Reset Roster</span>
          </button>
        </div>
      </div>

      {/* SECTION 3: Collapsible Advanced Cloud Sync */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setShowAdvancedDb(!showAdvancedDb)}
          className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <div>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 block">
                Cloud Storage &amp; Sync Configuration
              </span>
              <span className="text-[11px] text-slate-500">
                {isConfigured ? 'Connected to Cloud Server' : 'Configured via environment'}
              </span>
            </div>
          </div>
          {showAdvancedDb ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showAdvancedDb && (
          <div className="p-6 pt-0 border-t border-slate-100 dark:border-slate-800 space-y-4">
            {testResult && (
              <div
                className={`mt-4 p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />}
                <span>{testResult.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveCredentials} className="space-y-4 text-xs mt-4">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Project Endpoint URL
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
                  Publishable / Anon Key
                </label>
                <input
                  type="password"
                  placeholder="sb_publishable_..."
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={savingCreds}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs"
                  >
                    {savingCreds ? 'Testing...' : 'Save & Test Connection'}
                  </button>

                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={savingCreds || !supabaseUrl}
                    className="px-3 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg"
                  >
                    Verify Status
                  </button>
                </div>

                {supabaseUrl && (
                  <button
                    type="button"
                    onClick={handleClearCredentials}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    Reset to Default
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
