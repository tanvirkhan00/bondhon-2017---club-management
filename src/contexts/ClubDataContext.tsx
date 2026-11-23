import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Member,
  PublicMember,
  AuthenticatedMemberDirectoryItem,
  BirthdayHighlight,
  MonthlyDue,
  ClubStats,
  MonthSummary,
  MemberFinancialSummary,
  DueStatus,
  ClubNotification,
  NotificationEventType,
  NotificationAudience,
  ClubAnnouncement,
  AnnouncementCategory,
  BankDeposit,
  BankEntryType,
  ClubExpense,
  ExpenseCategory,
  ExpensePaymentSource,
  TopFineContributor,
  PublicClubHighlights,
} from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabase/client';
import {
  INITIAL_MEMBERS,
  INITIAL_PUBLIC_MEMBERS,
  INITIAL_MONTHLY_DUES,
} from '../lib/mockData';
import { useAuth } from './AuthContext';
import { MONTH_NAMES, SHORT_MONTH_NAMES, formatBDT, getMonthName } from '../utils/formatters';
import {
  buildMemberCompleteLedger,
  computeMemberFinancialSummary,
  getBillingPeriodFromPaymentDate,
  MonthlyDueWithMeta,
} from '../utils/fineCalculator';
import {
  BLOOD_GROUPS,
  extractMonthDayFromDob,
  formatBirthdayMonthDay,
  getUpcomingBirthdayHighlightsFromList,
} from '../utils/birthdayUtils';

interface LogActivityParams {
  actorUserId?: string | null;
  memberId?: string | null;
  targetMemberId?: string | null;
  announcementId?: string | null;
  memberCode?: string | null;
  memberName: string;
  audience?: NotificationAudience;
  eventType: NotificationEventType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  dedupKey?: string | null;
}

interface ClubDataContextType {
  publicMembers: PublicMember[];
  memberDirectory: AuthenticatedMemberDirectoryItem[];
  upcomingBirthdayHighlights: BirthdayHighlight[];
  members: Member[];
  myMemberRecord: Member | null;
  myDues: MonthlyDueWithMeta[];
  myFinancialSummary: MemberFinancialSummary;
  monthlyDues: MonthlyDue[];
  notifications: ClubNotification[];
  announcements: ClubAnnouncement[];
  unreadNotificationCount: number;
  bankDeposits: BankDeposit[];
  clubExpenses: ClubExpense[];
  totalClubPrincipalCollected: number;
  totalClubFineCollected: number;
  totalClubCollected: number;
  totalBankDeposited: number;
  totalBankInterest: number;
  totalBankCharges: number;
  totalBankWithdrawals: number;
  totalClubExpenses: number;
  totalCashExpenses: number;
  totalBankExpenses: number;
  netClubAvailableBalance: number;
  currentBankBalance: number;
  cashInHandBalance: number;
  pendingBankDeposit: number;
  bankDepositProgress: number;
  publicClubHighlights: PublicClubHighlights;
  isLiveSupabaseSynced: boolean;
  isLoading: boolean;
  error: string | null;
  selectedYear: number;
  selectedMonth: number; // 1 - 12
  defaultDueAmount: number;
  clubMonthlyTarget: number;
  stats: ClubStats;
  monthSummaries: MonthSummary[];
  setSelectedYear: (year: number) => void;
  setSelectedMonth: (month: number) => void;
  setDefaultDueAmount: (amount: number) => void;
  refreshData: () => Promise<void>;
  refreshNotifications: () => Promise<void>;

  // Member self-service helpers
  linkMyMemberAccount: (memberCode: string) => Promise<{ success: boolean; error?: string }>;
  updateMyContactPhone: (phone: string) => Promise<{ success: boolean; error?: string }>;
  updateMyMemberProfile: (params: {
    phone?: string;
    date_of_birth?: string | null;
    blood_group?: string | null;
  }) => Promise<{ success: boolean; error?: string }>;
  logMemberActivity: (params: LogActivityParams) => Promise<void>;

  // Notification & Announcement actions
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
  publishAnnouncement: (params: {
    title: string;
    body: string;
    category?: AnnouncementCategory;
  }) => Promise<{ success: boolean; error?: string }>;
  deleteAnnouncement: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Admin member operations
  addMember: (memberData: Omit<Member, 'id' | 'created_at' | 'updated_at'>) => Promise<{ success: boolean; error?: string }>;
  updateMember: (id: string, updates: Partial<Member>) => Promise<{ success: boolean; error?: string }>;
  toggleMemberStatus: (id: string) => Promise<{ success: boolean; error?: string }>;
  deleteMember: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Admin payment operations
  generateMonthlyDues: (month: number, year: number) => Promise<{ success: boolean; createdCount?: number; existingCount?: number; error?: string }>;
  markAsPaid: (
    dueId: string,
    amountPaid?: number,
    paidAt?: string,
    fineOptions?: { fineDue?: number; finePaid?: number; fineWaived?: boolean }
  ) => Promise<{ success: boolean; due?: MonthlyDue; error?: string }>;
  recordNewPayment: (params: {
    memberId: string;
    month: number;
    year: number;
    amountPaid: number;
    amountDue?: number;
    fineDue?: number;
    finePaid?: number;
    fineWaived?: boolean;
    paidAt?: string;
    paymentMethod?: string;
    notes?: string;
  }) => Promise<{ success: boolean; due?: MonthlyDue; error?: string }>;
  updateDueRecord: (
    dueId: string,
    updates: {
      member_id?: string;
      month?: number;
      year?: number;
      amount_paid: number;
      amount_due?: number;
      paid_at?: string | null;
      fine_due?: number;
      fine_paid?: number;
      fine_paid_at?: string | null;
      fine_waived?: boolean;
      notes?: string | null;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  recordFinePayment: (params: {
    memberId: string;
    month: number;
    year: number;
    fineDue: number;
    finePaid: number;
    clearPrincipal?: boolean;
    principalPaid?: number;
    waiveFine?: boolean;
    paidAt?: string;
    notes?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  waiveMemberFine: (
    dueId: string,
    fallback?: { memberId: string; month: number; year: number }
  ) => Promise<{ success: boolean; error?: string }>;
  deleteDueRecord: (dueId: string) => Promise<{ success: boolean; error?: string }>;

  // Admin bank ledger operations (Sonali Bank PLC: deposits, interest, charges, withdrawals)
  addBankDeposit: (params: {
    amount: number;
    deposited_at: string;
    entry_type?: BankEntryType;
    reference_no?: string;
    notes?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  updateBankDeposit: (
    id: string,
    updates: {
      amount: number;
      deposited_at: string;
      entry_type?: BankEntryType;
      reference_no?: string | null;
      notes?: string | null;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  deleteBankDeposit: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Admin club expenses & fee deductions
  addClubExpense: (params: {
    title: string;
    category: ExpenseCategory;
    amount: number;
    expense_date: string;
    payment_source: ExpensePaymentSource;
    reference_no?: string;
    notes?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  updateClubExpense: (
    id: string,
    updates: {
      title: string;
      category: ExpenseCategory;
      amount: number;
      expense_date: string;
      payment_source: ExpensePaymentSource;
      reference_no?: string | null;
      notes?: string | null;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  deleteClubExpense: (id: string) => Promise<{ success: boolean; error?: string }>;

  resetDemoData: () => void;
}

const ClubDataContext = createContext<ClubDataContextType | undefined>(undefined);

const MEMBERS_STORAGE_KEY = 'bondhon_local_members_v5';
const DUES_STORAGE_KEY = 'bondhon_local_dues_v5';
const NOTIFICATIONS_STORAGE_KEY = 'bondhon_local_notifications_v2';
const ANNOUNCEMENTS_STORAGE_KEY = 'bondhon_local_announcements_v1';
const NOTIF_READS_STORAGE_KEY = 'bondhon_local_notif_reads_v1';
const BANK_DEPOSITS_STORAGE_KEY = 'bondhon_local_bank_deposits_v1';
const BANK_LOCAL_EXTRAS_KEY = 'bondhon_local_bank_extras_v1';
const CLUB_EXPENSES_STORAGE_KEY = 'bondhon_local_club_expenses_v1';
const PUBLIC_HIGHLIGHTS_CACHE_KEY = 'bondhon_public_highlights_v1';

const buildReceiptNumber = (memberCode: string, month: number, year: number, suffix?: string) => {
  const cleanCode = (memberCode || 'BND').replace(/[^A-Z0-9]/gi, '').replace(/^BND/i, '');
  const period = `${year}${String(month).padStart(2, '0')}`;
  const tail = (suffix || Math.random().toString(36).slice(2, 6)).slice(-4).toUpperCase();
  return `BND-RCT-${period}-${cleanCode || '000'}-${tail}`;
};

const DEFAULT_PUBLIC_HIGHLIGHTS: PublicClubHighlights = {
  totalPrincipalCollected: 0,
  totalFineCollected: 0,
  totalCollected: 0,
  totalBankDeposited: 0,
  totalBankInterest: 0,
  totalBankCharges: 0,
  totalBankWithdrawals: 0,
  totalClubExpenses: 0,
  totalCashExpenses: 0,
  totalBankExpenses: 0,
  netClubAvailableBalance: 0,
  currentBankBalance: 0,
  cashInHandBalance: 0,
  topFineContributors: [],
};

export const ClubDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, canAccessAdmin, user, profile } = useAuth();

  const defaultPeriod = getBillingPeriodFromPaymentDate(new Date());
  const [selectedYear, setSelectedYear] = useState<number>(defaultPeriod.billingYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(defaultPeriod.billingMonth);
  const [defaultDueAmount, setDefaultDueAmount] = useState<number>(() => {
    const saved = localStorage.getItem('bondhon_default_due_amount');
    return saved ? Number(saved) : 500;
  });

  const [members, setMembers] = useState<Member[]>(() => {
    const saved = localStorage.getItem(MEMBERS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch { /* ignore */ }
    }
    return INITIAL_MEMBERS;
  });

  const [monthlyDues, setMonthlyDues] = useState<MonthlyDue[]>(() => {
    const saved = localStorage.getItem(DUES_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch { /* ignore */ }
    }
    return INITIAL_MONTHLY_DUES;
  });

  const [publicMembers, setPublicMembers] = useState<PublicMember[]>(() => {
    return INITIAL_PUBLIC_MEMBERS;
  });

  const [rpcDirectory, setRpcDirectory] = useState<AuthenticatedMemberDirectoryItem[] | null>(null);
  const [rpcBirthdayHighlights, setRpcBirthdayHighlights] = useState<BirthdayHighlight[] | null>(null);

  const [notifications, setNotifications] = useState<ClubNotification[]>(() => {
    const saved = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* ignore */ }
    }
    return [];
  });

  const [announcements, setAnnouncements] = useState<ClubAnnouncement[]>(() => {
    const saved = localStorage.getItem(ANNOUNCEMENTS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* ignore */ }
    }
    return [];
  });

  const [readNotifIds, setReadNotifIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(NOTIF_READS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch { /* ignore */ }
    return new Set();
  });

  const [bankDeposits, setBankDeposits] = useState<BankDeposit[]>(() => {
    const saved = localStorage.getItem(BANK_DEPOSITS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* ignore */ }
    }
    return [];
  });

  const [clubExpenses, setClubExpenses] = useState<ClubExpense[]>(() => {
    const saved = localStorage.getItem(CLUB_EXPENSES_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* ignore */ }
    }
    return [];
  });

  const [rpcPublicHighlights, setRpcPublicHighlights] = useState<PublicClubHighlights | null>(() => {
    const saved = localStorage.getItem(PUBLIC_HIGHLIGHTS_CACHE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const totalCol = Number(parsed.totalCollected || 0);
          const totalDep = Number(parsed.totalBankDeposited || 0);
          const totalInt = Number(parsed.totalBankInterest || 0);
          const totalChg = Number(parsed.totalBankCharges || 0);
          const totalWd = Number(parsed.totalBankWithdrawals || 0);
          const totalExp = Number(parsed.totalClubExpenses || 0);
          const totalBankExp = Number(parsed.totalBankExpenses || 0);
          const netAvail =
            parsed.netClubAvailableBalance !== undefined
              ? Number(parsed.netClubAvailableBalance)
              : totalCol + totalInt - totalChg - totalExp;
          const curBank =
            parsed.currentBankBalance !== undefined
              ? Number(parsed.currentBankBalance)
              : totalDep + totalInt - totalChg - totalWd - totalBankExp;
          return {
            ...(parsed as PublicClubHighlights),
            totalBankInterest: totalInt,
            totalBankCharges: totalChg,
            totalBankWithdrawals: totalWd,
            totalClubExpenses: totalExp,
            totalCashExpenses: Number(parsed.totalCashExpenses || 0),
            totalBankExpenses: totalBankExp,
            netClubAvailableBalance: netAvail,
            currentBankBalance: curBank,
            cashInHandBalance:
              parsed.cashInHandBalance !== undefined
                ? Number(parsed.cashInHandBalance)
                : netAvail - curBank,
          };
        }
      } catch { /* ignore */ }
    }
    return null;
  });

  // Tracks whether Supabase actually has seeded rows in `members`
  const [supabaseSyncedMembers, setSupabaseSyncedMembers] = useState<boolean>(false);
  const [supabaseNotificationsAvailable, setSupabaseNotificationsAvailable] = useState<boolean>(false);
  const [supabaseAnnouncementsAvailable, setSupabaseAnnouncementsAvailable] = useState<boolean>(false);
  const [supabaseBankAvailable, setSupabaseBankAvailable] = useState<boolean>(false);
  const [supabaseExpensesAvailable, setSupabaseExpensesAvailable] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const birthdaySyncedSessionRef = useRef<string | null>(null);

  const isConfigured = isSupabaseConfigured();

  const readStorageKey = `${NOTIF_READS_STORAGE_KEY}_${user?.id || 'guest'}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(readStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setReadNotifIds(new Set(parsed));
          return;
        }
      }
    } catch { /* ignore */ }
    setReadNotifIds(new Set());
  }, [readStorageKey]);

  const persistReadIds = useCallback(
    (nextSet: Set<string>) => {
      try {
        localStorage.setItem(readStorageKey, JSON.stringify(Array.from(nextSet)));
      } catch { /* ignore */ }
    },
    [readStorageKey]
  );

  // Always keep local backup synced when not using live populated Supabase tables
  useEffect(() => {
    if (!supabaseSyncedMembers) {
      localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(members));
    }
  }, [members, supabaseSyncedMembers]);

  useEffect(() => {
    if (!supabaseSyncedMembers) {
      localStorage.setItem(DUES_STORAGE_KEY, JSON.stringify(monthlyDues));
    }
  }, [monthlyDues, supabaseSyncedMembers]);

  useEffect(() => {
    if (!supabaseNotificationsAvailable) {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
    }
  }, [notifications, supabaseNotificationsAvailable]);

  useEffect(() => {
    if (!supabaseAnnouncementsAvailable) {
      localStorage.setItem(ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(announcements));
    }
  }, [announcements, supabaseAnnouncementsAvailable]);

  useEffect(() => {
    if (!supabaseBankAvailable) {
      localStorage.setItem(BANK_DEPOSITS_STORAGE_KEY, JSON.stringify(bankDeposits));
    }
  }, [bankDeposits, supabaseBankAvailable]);

  useEffect(() => {
    if (!supabaseExpensesAvailable) {
      localStorage.setItem(CLUB_EXPENSES_STORAGE_KEY, JSON.stringify(clubExpenses));
    }
  }, [clubExpenses, supabaseExpensesAvailable]);

  useEffect(() => {
    localStorage.setItem('bondhon_default_due_amount', String(defaultDueAmount));
  }, [defaultDueAmount]);

  // Keep publicMembers derived from active members cleanly WITHOUT father_name or shares_count
  useEffect(() => {
    if (!supabaseSyncedMembers) {
      const activePubs: PublicMember[] = members
        .filter(m => m.status === 'active')
        .map(m => ({
          id: m.id,
          member_code: m.member_code,
          full_name: m.full_name,
          profile_image_url: m.profile_image_url,
          designation: m.designation,
          blood_group: m.blood_group || null,
          status: 'active',
        }));
      setPublicMembers(activePubs);
    }
  }, [members, supabaseSyncedMembers]);

  const refreshNotifications = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client || !user) return;

    try {
      const [{ data: notifData, error: notifErr }, { data: readsData }] = await Promise.all([
        client
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(80),
        client
          .from('notification_reads')
          .select('notification_id')
          .eq('user_id', user.id),
      ]);

      if (!notifErr && Array.isArray(notifData)) {
        setSupabaseNotificationsAvailable(true);
        setNotifications(notifData as ClubNotification[]);
      }

      if (Array.isArray(readsData)) {
        const dbReads = new Set<string>(
          readsData.map((r: { notification_id: string }) => r.notification_id)
        );
        setReadNotifIds((prev) => {
          const merged = new Set([...prev, ...dbReads]);
          persistReadIds(merged);
          return merged;
        });
      }

      const { data: annData, error: annErr } = await client
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(40);

      if (!annErr && Array.isArray(annData)) {
        setSupabaseAnnouncementsAvailable(true);
        setAnnouncements(annData as ClubAnnouncement[]);
      }
    } catch {
      // keep local fallback
    }
  }, [user, persistReadIds]);

  // Load from Supabase (handles Public, Authenticated Member RLS, and Full Admin access)
  const loadSupabaseData = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch public directory view (strictly stripped of father_name, shares/fees, DOB, phone)
      let { data: pubData, error: pubErr } = await client
        .from('public_members')
        .select('id, member_code, full_name, profile_image_url, designation, blood_group, status')
        .order('member_code', { ascending: true });

      // Fallback cleanly if remote public_members view hasn't been updated with blood_group yet
      if (pubErr) {
        const legacyPub = await client
          .from('public_members')
          .select('id, member_code, full_name, profile_image_url, designation, status')
          .order('member_code', { ascending: true });
        pubData = legacyPub.data as typeof pubData;
        pubErr = legacyPub.error;
      }

      const resolvedPubs: PublicMember[] =
        !pubErr && Array.isArray(pubData) && pubData.length > 0
          ? (pubData as PublicMember[]).map((pm) => ({
              id: pm.id,
              member_code: pm.member_code,
              full_name: pm.full_name,
              profile_image_url: pm.profile_image_url || null,
              designation: pm.designation || 'Member',
              blood_group: pm.blood_group || null,
              status: 'active',
            }))
          : INITIAL_PUBLIC_MEMBERS;

      if (!pubErr && Array.isArray(pubData) && pubData.length > 0) {
        setPublicMembers(resolvedPubs);
      }

      // 1B. Fetch upcoming birthday highlights (-2..0 days in Asia/Dhaka, zero birth year)
      try {
        const { data: bdayData, error: bdayErr } = await client.rpc(
          'get_upcoming_birthday_highlights',
          { p_days_ahead: 2 }
        );
        if (!bdayErr && Array.isArray(bdayData)) {
          setRpcBirthdayHighlights(bdayData as BirthdayHighlight[]);
        }
      } catch {
        // RPC may not be migrated yet; client fallback handles it safely
      }

      // 1C. If authenticated, fetch safe Club Member Directory (blood_group + birth month/day ONLY)
      if (user) {
        try {
          const { data: dirData, error: dirErr } = await client.rpc(
            'get_authenticated_member_directory'
          );
          if (!dirErr && Array.isArray(dirData) && dirData.length > 0) {
            setRpcDirectory(dirData as AuthenticatedMemberDirectoryItem[]);
          }
        } catch {
          // RPC not deployed yet
        }
      } else {
        setRpcDirectory(null);
      }

      // 2. Fetch full members table (Admin gets all rows; Member gets ONLY their own row via RLS)
      const { data: membersData, error: membersErr } = await client
        .from('members')
        .select('*')
        .order('member_code', { ascending: true });

      if (!membersErr && Array.isArray(membersData) && membersData.length > 0) {
        if (membersData.length > 1 || canAccessAdmin) {
          setMembers(membersData as Member[]);
        } else {
          // Non-admin member: store ONLY their own full DB row (never backfill peer private data!)
          setMembers([membersData[0] as Member]);
        }
        setSupabaseSyncedMembers(true);

        // 3. Fetch monthly dues from Supabase (RLS restricts member to own dues only)
        const { data: duesData, error: duesErr } = await client
          .from('monthly_dues')
          .select('*')
          .order('year', { ascending: false })
          .order('month', { ascending: false });

        if (!duesErr && Array.isArray(duesData)) {
          setMonthlyDues(duesData as MonthlyDue[]);
        }
      } else {
        setSupabaseSyncedMembers(false);
      }

      // 4. Fetch aggregated public club highlights (safe RPC accessible to anon & authenticated)
      try {
        const { data: pubStats, error: pubStatsErr } = await client.rpc('get_public_club_highlights');
        if (!pubStatsErr && pubStats && typeof pubStats === 'object') {
          const raw = pubStats as Record<string, unknown>;
          const totalCollectedVal = Number(raw.totalCollected || 0);
          const totalDepositedVal = Number(raw.totalBankDeposited || 0);
          const totalInterestVal = Number(raw.totalBankInterest || 0);
          const totalChargesVal = Number(raw.totalBankCharges || 0);
          const totalWithdrawalsVal = Number(raw.totalBankWithdrawals || 0);
          const totalExpensesVal = Number(raw.totalClubExpenses || 0);
          const totalCashExpensesVal = Number(raw.totalCashExpenses || 0);
          const totalBankExpensesVal = Number(raw.totalBankExpenses || 0);
          const netClubAvailVal =
            raw.netClubAvailableBalance !== undefined
              ? Number(raw.netClubAvailableBalance)
              : totalCollectedVal + totalInterestVal - totalChargesVal - totalExpensesVal;
          const curBankVal =
            raw.currentBankBalance !== undefined
              ? Number(raw.currentBankBalance)
              : totalDepositedVal + totalInterestVal - totalChargesVal - totalWithdrawalsVal - totalBankExpensesVal;
          const cashInHandVal =
            raw.cashInHandBalance !== undefined
              ? Number(raw.cashInHandBalance)
              : netClubAvailVal - curBankVal;

          const normalized: PublicClubHighlights = {
            totalPrincipalCollected: Number(raw.totalPrincipalCollected || 0),
            totalFineCollected: Number(raw.totalFineCollected || 0),
            totalCollected: totalCollectedVal,
            totalActiveShares: raw.totalActiveShares !== undefined ? Number(raw.totalActiveShares) : undefined,
            totalBankDeposited: totalDepositedVal,
            totalBankInterest: totalInterestVal,
            totalBankCharges: totalChargesVal,
            totalBankWithdrawals: totalWithdrawalsVal,
            totalClubExpenses: totalExpensesVal,
            totalCashExpenses: totalCashExpensesVal,
            totalBankExpenses: totalBankExpensesVal,
            netClubAvailableBalance: netClubAvailVal,
            currentBankBalance: curBankVal,
            cashInHandBalance: cashInHandVal,
            topFineContributors: Array.isArray(raw.topFineContributors)
              ? (raw.topFineContributors as TopFineContributor[]).map((c) => ({
                  ...c,
                  total_fine_paid: Number(c.total_fine_paid || 0),
                  fined_months: Number(c.fined_months || 0),
                }))
              : [],
            updatedAt: new Date().toISOString(),
          };
          setRpcPublicHighlights(normalized);
          localStorage.setItem(PUBLIC_HIGHLIGHTS_CACHE_KEY, JSON.stringify(normalized));
        }
      } catch {
        // RPC may not be deployed yet; fallback gracefully
      }

      // 5. Fetch notifications & announcements for ANY authenticated user (Admin & Member)
      if (user) {
        await refreshNotifications();
      }

      // 6. Fetch Sonali Bank ledger & Club Expenses if Admin or President Viewer
      if (canAccessAdmin) {
        try {
          const { data: bankData, error: bankErr } = await client
            .from('bank_deposits')
            .select('*')
            .order('deposited_at', { ascending: false })
            .order('created_at', { ascending: false });

          if (!bankErr && Array.isArray(bankData)) {
            setSupabaseBankAvailable(true);
            const remoteRows: BankDeposit[] = bankData.map((row) => ({
              ...(row as BankDeposit),
              entry_type: ((row as BankDeposit).entry_type || 'deposit') as BankEntryType,
              amount: Number((row as BankDeposit).amount || 0),
            }));
            // Merge any local-only extras saved when Supabase entry_type column wasn't migrated yet
            let localExtras: BankDeposit[] = [];
            try {
              const rawExtras = localStorage.getItem(BANK_LOCAL_EXTRAS_KEY);
              if (rawExtras) {
                const parsed = JSON.parse(rawExtras);
                if (Array.isArray(parsed)) localExtras = parsed;
              }
            } catch { /* ignore */ }
            const merged = [...localExtras, ...remoteRows].sort((a, b) =>
              (b.deposited_at || '').localeCompare(a.deposited_at || '')
            );
            setBankDeposits(merged);
          }
        } catch {
          // keep local bankDeposits fallback
        }

        try {
          const { data: expData, error: expErr } = await client
            .from('club_expenses')
            .select('*')
            .order('expense_date', { ascending: false })
            .order('created_at', { ascending: false });

          if (!expErr && Array.isArray(expData)) {
            setSupabaseExpensesAvailable(true);
            setClubExpenses(
              expData.map((row) => ({
                ...(row as ClubExpense),
                amount: Number((row as ClubExpense).amount || 0),
              }))
            );
          }
        } catch {
          // keep local clubExpenses fallback
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSupabaseSyncedMembers(false);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [canAccessAdmin, user, refreshNotifications]);

  useEffect(() => {
    if (isConfigured) {
      loadSupabaseData();
    } else {
      setIsLoading(false);
    }
  }, [isConfigured, user?.id, loadSupabaseData]);

  // Subscribe to Realtime notifications & announcements + 15s poll + focus refresh when logged in
  useEffect(() => {
    const client = getSupabaseClient();
    if (!user || !isConfigured || !client) return;

    const channel = client
      .channel(`portal-notifications-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const incoming = payload.new as ClubNotification;
          setSupabaseNotificationsAvailable(true);
          setNotifications(prev => {
            if (prev.some(n => n.id === incoming.id)) return prev;
            return [incoming, ...prev].slice(0, 80);
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        () => {
          refreshNotifications();
        }
      )
      .subscribe();

    const timer = setInterval(() => {
      refreshNotifications();
    }, 15000);

    const handleFocus = () => {
      refreshNotifications();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', handleFocus);
      client.removeChannel(channel);
    };
  }, [user, isConfigured, refreshNotifications]);

  // Combine dues with member details for convenience
  const enrichedDues = useMemo(() => {
    const memberMap = new Map<string, Member>();
    members.forEach(m => memberMap.set(m.id, m));

    return monthlyDues.map(due => ({
      ...due,
      member: memberMap.get(due.member_id),
    }));
  }, [members, monthlyDues]);

  // Active Member Private Record (strict matching — never exposes another member's data)
  const myMemberRecord = useMemo<Member | null>(() => {
    if (!user && !profile) return null;

    const userEmail = (user?.email || '').toLowerCase().trim();
    const metaCode = (user?.user_metadata?.member_code || '').toUpperCase().trim();

    // 1. Match by auth_user_id
    let matched = members.find(m => user && m.auth_user_id === user.id);

    // 2. Match by registered email
    if (!matched && userEmail) {
      matched = members.find(m => m.email && m.email.toLowerCase().trim() === userEmail);
    }

    // 3. Match by member_code in Supabase Auth metadata
    if (!matched && metaCode) {
      matched = members.find(m => m.member_code.toUpperCase() === metaCode);
    }

    // 4. Known treasurer admin account
    if (!matched && userEmail === 'kmtanvir1111@gmail.com') {
      matched = members.find(m => m.member_code === 'BND-007');
    }

    // 5. Exact full_name match
    if (!matched && profile?.full_name) {
      const pName = profile.full_name.toLowerCase().trim();
      matched = members.find(m => m.full_name.toLowerCase().trim() === pName);
    }

    return matched || null;
  }, [members, user, profile]);

  // Allow an authenticated member to link their own member_code to their profile
  const linkMyMemberAccount = async (memberCode: string) => {
    if (!user) {
      return { success: false, error: 'অনুগ্রহ করে আগে লগইন করুন।' };
    }

    const codeUpper = memberCode.toUpperCase().trim();
    const target = members.find(m => m.member_code.toUpperCase() === codeUpper);
    if (!target) {
      return { success: false, error: 'সঠিক সদস্য কোড নির্বাচন করুন।' };
    }

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.auth.updateUser({
          data: {
            full_name: target.full_name,
            member_code: target.member_code,
          },
        });
      } catch {
        // continue to local update
      }
    }

    setMembers(prev =>
      prev.map(m =>
        m.member_code.toUpperCase() === codeUpper
          ? {
              ...m,
              auth_user_id: user.id,
              email: m.email || user.email || null,
            }
          : m
      )
    );

    return { success: true };
  };

  // Authenticated Safe Directory (strips private DOB/birth year/father/phone/fees)
  const memberDirectory = useMemo<AuthenticatedMemberDirectoryItem[]>(() => {
    if (rpcDirectory && rpcDirectory.length > 0) {
      return rpcDirectory;
    }
    if (canAccessAdmin || !supabaseSyncedMembers) {
      return members
        .filter((m) => m.status === 'active')
        .map((m) => {
          const md = extractMonthDayFromDob(m.date_of_birth);
          return {
            id: m.id,
            member_code: m.member_code,
            full_name: m.full_name,
            profile_image_url: m.profile_image_url || null,
            designation: m.designation || 'Member',
            status: m.status,
            blood_group: m.blood_group || null,
            birth_month: md?.month ?? null,
            birth_day: md?.day ?? null,
          };
        });
    }
    return publicMembers.map((pm) => {
      const md =
        myMemberRecord && myMemberRecord.id === pm.id
          ? extractMonthDayFromDob(myMemberRecord.date_of_birth)
          : null;
      return {
        id: pm.id,
        member_code: pm.member_code,
        full_name: pm.full_name,
        profile_image_url: pm.profile_image_url || null,
        designation: pm.designation || 'Member',
        status: pm.status,
        blood_group: myMemberRecord && myMemberRecord.id === pm.id ? myMemberRecord.blood_group || null : null,
        birth_month: md?.month ?? null,
        birth_day: md?.day ?? null,
      };
    });
  }, [rpcDirectory, canAccessAdmin, supabaseSyncedMembers, members, publicMembers, myMemberRecord]);

  // Upcoming Birthday Highlights (-2 .. 0 days in Asia/Dhaka, ZERO birth year exposed)
  const upcomingBirthdayHighlights = useMemo<BirthdayHighlight[]>(() => {
    const rawList: BirthdayHighlight[] =
      rpcBirthdayHighlights !== null
        ? rpcBirthdayHighlights
        : canAccessAdmin || !supabaseSyncedMembers
        ? getUpcomingBirthdayHighlightsFromList(members, 2)
        : getUpcomingBirthdayHighlightsFromList(memberDirectory, 2);

    const avatarById = new Map<string, string>();
    const avatarByCode = new Map<string, string>();
    const registerAvatar = (id?: string, code?: string, url?: string | null) => {
      const clean = (url || '').trim();
      if (!clean) return;
      if (id && !avatarById.has(id)) avatarById.set(id, clean);
      if (code && !avatarByCode.has(code.toUpperCase())) avatarByCode.set(code.toUpperCase(), clean);
    };

    members.forEach((m) => registerAvatar(m.id, m.member_code, m.profile_image_url));
    memberDirectory.forEach((m) => registerAvatar(m.id, m.member_code, m.profile_image_url));
    publicMembers.forEach((m) => registerAvatar(m.id, m.member_code, m.profile_image_url));
    INITIAL_MEMBERS.forEach((m) => registerAvatar(m.id, m.member_code, m.profile_image_url));

    return rawList.map((item) => {
      const resolvedUrl =
        (item.profile_image_url || '').trim() ||
        avatarById.get(item.id) ||
        avatarByCode.get((item.member_code || '').toUpperCase()) ||
        null;
      return {
        ...item,
        profile_image_url: resolvedUrl,
      };
    });
  }, [rpcBirthdayHighlights, canAccessAdmin, supabaseSyncedMembers, members, memberDirectory, publicMembers]);

  // Update member's own phone number & notify admin
  const updateMyContactPhone = async (phone: string) => {
    return updateMyMemberProfile({ phone });
  };

  // Update member's own phone, private date_of_birth, and blood_group
  const updateMyMemberProfile = async (params: {
    phone?: string;
    date_of_birth?: string | null;
    blood_group?: string | null;
  }) => {
    if (!user || !myMemberRecord) {
      return { success: false, error: 'Member profile not found.' };
    }

    const cleanPhone = params.phone !== undefined ? params.phone.trim() : myMemberRecord.phone || '';
    const rawBlood =
      params.blood_group !== undefined
        ? (params.blood_group || '').trim().toUpperCase()
        : myMemberRecord.blood_group || '';
    const cleanBlood = rawBlood || null;

    if (cleanBlood && !BLOOD_GROUPS.includes(cleanBlood as (typeof BLOOD_GROUPS)[number])) {
      return { success: false, error: 'Invalid blood group selected.' };
    }

    const clearDob = params.date_of_birth === null || params.date_of_birth === '';
    const nextDob =
      params.date_of_birth === undefined
        ? myMemberRecord.date_of_birth || null
        : clearDob
        ? null
        : params.date_of_birth;

    const client = getSupabaseClient();
    if (client && supabaseSyncedMembers) {
      try {
        const { error: rpcErr } = await client.rpc('update_my_member_profile', {
          p_phone: cleanPhone || null,
          p_date_of_birth: nextDob,
          p_blood_group: cleanBlood,
          p_clear_dob: clearDob,
        });
        if (rpcErr) {
          // Fallback to legacy phone RPC if new migration is pending
          if (cleanPhone) {
            await client.rpc('update_my_member_phone', { p_phone: cleanPhone });
          }
        }
      } catch {
        // continue with optimistic local update
      }
    }

    setMembers(prev =>
      prev.map(m =>
        m.id === myMemberRecord.id
          ? {
              ...m,
              phone: cleanPhone || null,
              date_of_birth: nextDob,
              blood_group: cleanBlood,
              updated_at: new Date().toISOString(),
            }
          : m
      )
    );

    const md = extractMonthDayFromDob(nextDob);
    setPublicMembers((prev) =>
      prev.map((pm) =>
        pm.id === myMemberRecord.id ? { ...pm, blood_group: cleanBlood } : pm
      )
    );
    setRpcDirectory((prev) =>
      prev
        ? prev.map((item) =>
            item.id === myMemberRecord.id
              ? {
                  ...item,
                  blood_group: cleanBlood,
                  birth_month: md?.month ?? null,
                  birth_day: md?.day ?? null,
                }
              : item
          )
        : prev
    );

    await logMemberActivity({
      actorUserId: user.id,
      memberId: myMemberRecord.id,
      memberCode: myMemberRecord.member_code,
      memberName: myMemberRecord.full_name,
      audience: 'admin',
      eventType: 'profile_updated',
      title: 'Member Profile Updated',
      message: `${myMemberRecord.full_name} (${myMemberRecord.member_code}) updated their personal profile details.`,
    });

    return { success: true };
  };

  // Log scoped activity / announcement / payment / birthday notification
  const logMemberActivity = useCallback(async (params: LogActivityParams) => {
    const client = getSupabaseClient();
    let resolvedActorId = params.actorUserId ?? user?.id ?? null;

    if (client && !resolvedActorId) {
      try {
        const { data: sessionData } = await client.auth.getSession();
        resolvedActorId = sessionData.session?.user?.id ?? null;
      } catch {
        // ignore
      }
    }

    const audience: NotificationAudience = params.audience || 'admin';
    const newNotif: ClubNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      actor_user_id: resolvedActorId,
      member_id: params.memberId ?? null,
      target_member_id: params.targetMemberId ?? null,
      announcement_id: params.announcementId ?? null,
      member_code: params.memberCode ?? null,
      member_name: params.memberName,
      audience,
      event_type: params.eventType,
      title: params.title,
      message: params.message,
      metadata: params.metadata || {},
      dedup_key: params.dedupKey ?? null,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    if (client && resolvedActorId) {
      try {
        const payload = {
          actor_user_id: resolvedActorId,
          member_id: params.memberId ?? null,
          target_member_id: params.targetMemberId ?? null,
          announcement_id: params.announcementId ?? null,
          member_code: params.memberCode ?? null,
          member_name: params.memberName,
          audience,
          event_type: params.eventType,
          title: params.title,
          message: params.message,
          metadata: params.metadata || {},
          dedup_key: params.dedupKey ?? null,
          is_read: false,
        };

        let { error: insErr } = await client.from('notifications').insert([payload]);

        // Graceful fallback if new columns haven't been migrated yet
        if (insErr && (insErr.code === '42703' || insErr.code === 'PGRST204' || (insErr.message || '').toLowerCase().includes('audience'))) {
          if (audience === 'admin') {
            const legacyRetry = await client.from('notifications').insert([{
              actor_user_id: resolvedActorId,
              member_id: params.memberId ?? null,
              member_code: params.memberCode ?? null,
              member_name: params.memberName,
              event_type: params.eventType,
              title: params.title,
              message: params.message,
              is_read: false,
            }]);
            insErr = legacyRetry.error;
          }
        }

        if (!insErr) {
          setSupabaseNotificationsAvailable(true);
          setNotifications(prev => {
            if (params.dedupKey && prev.some(n => n.dedup_key === params.dedupKey)) return prev;
            return [newNotif, ...prev].slice(0, 80);
          });
          return;
        }
      } catch {
        // fallback to local notifications
      }
    }

    setNotifications(prev => {
      if (params.dedupKey && prev.some(n => n.dedup_key === params.dedupKey)) return prev;
      const next = [newNotif, ...prev].slice(0, 80);
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [user?.id]);

  // Idempotent Birthday Reminder Notification Sync (Upcoming 7 days in Asia/Dhaka, zero birth year)
  useEffect(() => {
    if (!user) return;
    const sessionTag = `${user.id}-${canAccessAdmin ? 'executive' : 'member'}`;
    if (birthdaySyncedSessionRef.current === sessionTag) return;
    birthdaySyncedSessionRef.current = sessionTag;

    const runSync = async () => {
      const client = getSupabaseClient();
      if (client && isConfigured && supabaseSyncedMembers) {
        try {
          const { data: insertedCount, error: rpcErr } = await client.rpc(
            'sync_upcoming_birthday_notifications',
            { p_days_ahead: 7 }
          );
          if (!rpcErr && Number(insertedCount || 0) > 0) {
            await refreshNotifications();
            return;
          }
        } catch {
          // continue to client-side idempotent sync
        }
      }

      const sourceList = canAccessAdmin || !supabaseSyncedMembers ? members : memberDirectory;
      const candidates = getUpcomingBirthdayHighlightsFromList(sourceList, 7);
      if (candidates.length === 0) return;

      const existingKeys = new Set(notifications.map((n) => n.dedup_key).filter(Boolean));
      const newLocalNotifs: ClubNotification[] = [];

      candidates.forEach((b) => {
        const dedupKey = `bday-${b.id}-${b.target_year || new Date().getFullYear()}`;
        if (existingKeys.has(dedupKey)) return;
        const dateLabel = formatBirthdayMonthDay(b.birth_month, b.birth_day, false);
        const title =
          b.days_until === 0
            ? `Happy Birthday, ${b.full_name}!`
            : `Upcoming Birthday: ${b.full_name}`;
        const message =
          b.days_until === 0
            ? `Today (${dateLabel}) is ${b.full_name} (${b.member_code})'s birthday. Warm wishes from Bondhon 2017!`
            : `${b.full_name} (${b.member_code}) has an upcoming birthday on ${dateLabel}.`;

        newLocalNotifs.push({
          id: `notif-bday-${b.id}-${b.target_year || new Date().getFullYear()}`,
          member_id: b.id,
          member_code: b.member_code,
          member_name: b.full_name,
          audience: 'all_members',
          event_type: 'birthday_reminder',
          title,
          message,
          metadata: {
            birth_month: b.birth_month,
            birth_day: b.birth_day,
            date_label: dateLabel,
          },
          dedup_key: dedupKey,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      });

      if (newLocalNotifs.length > 0) {
        setNotifications((prev) => {
          const prevKeys = new Set(prev.map((n) => n.dedup_key).filter(Boolean));
          const unique = newLocalNotifs.filter((n) => !prevKeys.has(n.dedup_key));
          if (unique.length === 0) return prev;
          const next = [...unique, ...prev].slice(0, 80);
          if (!supabaseNotificationsAvailable) {
            localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(next));
          }
          return next;
        });
      }
    };

    runSync();
  }, [user, canAccessAdmin, isConfigured, supabaseSyncedMembers, supabaseNotificationsAvailable, members, memberDirectory, notifications, refreshNotifications]);

  // Scoped visible notifications (enforces client-side privacy mirror of PostgreSQL RLS)
  const scopedNotifications = useMemo<ClubNotification[]>(() => {
    if (!user) return [];
    return notifications
      .filter((n) => {
        const aud = n.audience || 'admin';
        if (canAccessAdmin) return true;
        if (aud === 'all_members') return true;
        if (aud === 'member' && myMemberRecord && n.target_member_id === myMemberRecord.id) {
          return true;
        }
        return false;
      })
      .map((n) => ({
        ...n,
        is_read: Boolean(n.is_read) || readNotifIds.has(n.id),
      }));
  }, [user, canAccessAdmin, notifications, myMemberRecord, readNotifIds]);

  const markNotificationAsRead = async (id: string) => {
    setReadNotifIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      persistReadIds(next);
      return next;
    });
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));

    const client = getSupabaseClient();
    if (client && supabaseNotificationsAvailable && user) {
      try {
        await client
          .from('notification_reads')
          .upsert([{ notification_id: id, user_id: user.id }], {
            onConflict: 'notification_id,user_id',
          });
      } catch { /* ignore */ }
      if (isAdmin) {
        try {
          await client.from('notifications').update({ is_read: true }).eq('id', id);
        } catch { /* ignore */ }
      }
    }
  };

  const markAllNotificationsAsRead = async () => {
    const idsToMark = scopedNotifications.filter((n) => !n.is_read).map((n) => n.id);
    if (idsToMark.length === 0) return;

    setReadNotifIds((prev) => {
      const next = new Set(prev);
      idsToMark.forEach((id) => next.add(id));
      persistReadIds(next);
      return next;
    });
    setNotifications(prev => prev.map(n => (idsToMark.includes(n.id) ? { ...n, is_read: true } : n)));

    const client = getSupabaseClient();
    if (client && supabaseNotificationsAvailable && user) {
      try {
        await client
          .from('notification_reads')
          .upsert(
            idsToMark.map((notification_id) => ({ notification_id, user_id: user.id })),
            { onConflict: 'notification_id,user_id' }
          );
      } catch { /* ignore */ }
      if (isAdmin) {
        try {
          await client.from('notifications').update({ is_read: true }).eq('is_read', false);
        } catch { /* ignore */ }
      }
    }
  };

  const clearNotifications = async () => {
    if (!isAdmin) return;
    setNotifications([]);
    localStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
    const client = getSupabaseClient();
    if (client && supabaseNotificationsAvailable && isAdmin) {
      try {
        await client.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      } catch { /* ignore */ }
    }
  };

  const unreadNotificationCount = useMemo(
    () => scopedNotifications.filter(n => !n.is_read).length,
    [scopedNotifications]
  );

  // Admin: Publish Official Club Announcement + Broadcast Notification
  const publishAnnouncement = async (params: {
    title: string;
    body: string;
    category?: AnnouncementCategory;
  }) => {
    if (!isAdmin || !user) {
      return { success: false, error: 'Unauthorized: Only Admins can publish announcements.' };
    }
    const cleanTitle = params.title.trim();
    const cleanBody = params.body.trim();
    if (!cleanTitle || !cleanBody) {
      return { success: false, error: 'Announcement title and description are required.' };
    }

    const authorName =
      myMemberRecord?.full_name || profile?.full_name || 'Club Admin';
    const category: AnnouncementCategory = params.category || 'general';
    const client = getSupabaseClient();

    let createdAnnouncement: ClubAnnouncement = {
      id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: cleanTitle,
      body: cleanBody,
      category,
      created_by: user.id,
      author_name: authorName,
      created_at: new Date().toISOString(),
    };

    if (client && supabaseSyncedMembers) {
      try {
        const { data, error: insErr } = await client
          .from('announcements')
          .insert([{
            title: cleanTitle,
            body: cleanBody,
            category,
            created_by: user.id,
            author_name: authorName,
          }])
          .select()
          .single();

        if (!insErr && data) {
          setSupabaseAnnouncementsAvailable(true);
          createdAnnouncement = data as ClubAnnouncement;
        }
      } catch {
        // fallback to local announcement
      }
    }

    setAnnouncements((prev) => [createdAnnouncement, ...prev]);

    const excerpt =
      cleanBody.length > 140 ? `${cleanBody.slice(0, 137)}...` : cleanBody;

    await logMemberActivity({
      actorUserId: user.id,
      announcementId: createdAnnouncement.id,
      memberName: authorName,
      audience: 'all_members',
      eventType: 'announcement',
      title: cleanTitle,
      message: excerpt,
      metadata: {
        announcementId: createdAnnouncement.id,
        category,
        fullBody: cleanBody,
        authorName,
      },
    });

    return { success: true };
  };

  const deleteAnnouncement = async (id: string) => {
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Only Admins can delete announcements.' };
    }
    const client = getSupabaseClient();
    if (client && supabaseAnnouncementsAvailable) {
      try {
        const { error: delErr } = await client.from('announcements').delete().eq('id', id);
        if (delErr) throw delErr;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      }
    }
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    setNotifications((prev) => prev.filter((n) => n.announcement_id !== id));
    return { success: true };
  };

  // Complete month-by-month personal ledger (synthesizes unentered months from join_date to current billing cycle)
  const myDues = useMemo<MonthlyDueWithMeta[]>(() => {
    if (!myMemberRecord) return [];
    const realDues = enrichedDues.filter((d) => d.member_id === myMemberRecord.id);
    return buildMemberCompleteLedger(myMemberRecord, realDues, new Date());
  }, [enrichedDues, myMemberRecord]);

  // Real-time Personal Financial Summary (includes unentered months & automatic late fines after 12th)
  const myFinancialSummary = useMemo<MemberFinancialSummary>(() => {
    if (!myMemberRecord) {
      return {
        totalBilled: 0,
        totalPaid: 0,
        totalPaidMonths: 0,
        totalOutstanding: 0,
        principalOutstanding: 0,
        totalFineCharged: 0,
        totalFinePaid: 0,
        totalFinePending: 0,
        unpaidMonthsCount: 0,
        currentStatus: 'unpaid',
        lastPaymentDate: null,
        monthlyContribution: defaultDueAmount,
      };
    }
    const realDues = enrichedDues.filter((d) => d.member_id === myMemberRecord.id);
    return computeMemberFinancialSummary(myMemberRecord, realDues, new Date());
  }, [enrichedDues, myMemberRecord, defaultDueAmount]);

  // Club-wide standard monthly target across all active shares (34 shares × 500 = ৳17,000)
  const clubMonthlyTarget = useMemo<number>(() => {
    const activeTotal = members
      .filter(m => m.status === 'active')
      .reduce((sum, m) => sum + Number(m.monthly_contribution || (m.shares_count || 1) * defaultDueAmount), 0);
    return activeTotal > 0 ? activeTotal : 17000;
  }, [members, defaultDueAmount]);

  // Admin Dashboard Global Stats (always anchored to ৳17,000 monthly target)
  const stats = useMemo<ClubStats>(() => {
    const active = members.filter(m => m.status === 'active');
    const inactive = members.filter(m => m.status === 'inactive');

    const monthDues = enrichedDues.filter(
      d => d.month === selectedMonth && d.year === selectedYear
    );

    const duesTarget = monthDues.reduce((sum, d) => sum + Number(d.amount_due), 0);
    const monthlyTarget = Math.max(clubMonthlyTarget, duesTarget);
    const totalCollected = monthDues.reduce((sum, d) => sum + Number(d.amount_paid), 0);
    const totalOutstanding = Math.max(0, monthlyTarget - totalCollected);

    const paidMembersCount = monthDues.filter(d => d.status === 'paid').length;
    const partialMembersCount = monthDues.filter(d => d.status === 'partial').length;
    const unpaidMembersCount = Math.max(0, active.length - paidMembersCount - partialMembersCount);

    const collectionRate = monthlyTarget > 0 ? Math.round((totalCollected / monthlyTarget) * 100) : 0;

    return {
      totalMembers: members.length,
      activeMembers: active.length,
      inactiveMembers: inactive.length,
      monthlyTarget,
      totalCollected,
      totalOutstanding,
      paidMembersCount,
      unpaidMembersCount,
      partialMembersCount,
      collectionRate,
    };
  }, [members, enrichedDues, selectedMonth, selectedYear, clubMonthlyTarget]);

  // 12-Month Summaries for Selected Fiscal Year (anchored to ৳17,000/month target)
  const monthSummaries = useMemo<MonthSummary[]>(() => {
    const activeCount = members.filter(m => m.status === 'active').length;

    return MONTH_NAMES.map((name, idx) => {
      const monthNum = idx + 1;
      const duesForMonth = enrichedDues.filter(
        d => d.month === monthNum && d.year === selectedYear
      );

      const duesTarget = duesForMonth.reduce((acc, d) => acc + Number(d.amount_due), 0);
      const target = Math.max(clubMonthlyTarget, duesTarget);
      const collected = duesForMonth.reduce((acc, d) => acc + Number(d.amount_paid), 0);
      const outstanding = Math.max(0, target - collected);
      const paidCount = duesForMonth.filter(d => d.status === 'paid').length;
      const partialCount = duesForMonth.filter(d => d.status === 'partial').length;
      const unpaidCount = Math.max(0, activeCount - paidCount - partialCount);
      const collectionRate = target > 0 ? Math.round((collected / target) * 100) : 0;

      return {
        month: monthNum,
        year: selectedYear,
        monthKey: `${selectedYear}-${String(monthNum).padStart(2, '0')}`,
        label: `${name} ${selectedYear}`,
        shortLabel: SHORT_MONTH_NAMES[idx],
        target,
        collected,
        outstanding,
        paidCount,
        unpaidCount,
        totalActive: activeCount,
        collectionRate,
      };
    });
  }, [selectedYear, enrichedDues, members, clubMonthlyTarget]);

  // Full-club collection, fine, Sonali Bank ledger, and Club Expenses reconciliation
  const liveComputedHighlights = useMemo<PublicClubHighlights>(() => {
    let totalPrincipalCollected = 0;
    let totalFineCollected = 0;

    const fineByMember = new Map<
      string,
      { totalFine: number; finedMonths: Set<string>; member?: Member }
    >();

    enrichedDues.forEach((d) => {
      const paid = Number(d.amount_paid || 0);
      const finePaid = Number(d.fine_paid || 0);
      totalPrincipalCollected += paid;
      totalFineCollected += finePaid;

      if (finePaid > 0) {
        const entry = fineByMember.get(d.member_id) || {
          totalFine: 0,
          finedMonths: new Set<string>(),
          member: d.member || members.find((m) => m.id === d.member_id),
        };
        entry.totalFine += finePaid;
        entry.finedMonths.add(`${d.year}-${d.month}`);
        fineByMember.set(d.member_id, entry);
      }
    });

    const topFineContributors: TopFineContributor[] = Array.from(fineByMember.entries())
      .map(([memberId, info]) => {
        const mem = info.member || members.find((m) => m.id === memberId);
        return {
          member_id: memberId,
          member_code: mem?.member_code || '—',
          full_name: mem?.full_name || 'Member',
          profile_image_url: mem?.profile_image_url || null,
          designation: mem?.designation || 'Member',
          total_fine_paid: info.totalFine,
          fined_months: info.finedMonths.size,
        };
      })
      .filter((c) => c.total_fine_paid > 0)
      .sort(
        (a, b) =>
          b.total_fine_paid - a.total_fine_paid ||
          b.fined_months - a.fined_months ||
          a.member_code.localeCompare(b.member_code)
      )
      .slice(0, 5);

    let totalBankDepositedLocal = 0;
    let totalBankInterestLocal = 0;
    let totalBankChargesLocal = 0;
    let totalBankWithdrawalsLocal = 0;

    bankDeposits.forEach((b) => {
      const amt = Number(b.amount || 0);
      const type = b.entry_type || 'deposit';
      if (type === 'interest') totalBankInterestLocal += amt;
      else if (type === 'charge') totalBankChargesLocal += amt;
      else if (type === 'withdrawal') totalBankWithdrawalsLocal += amt;
      else totalBankDepositedLocal += amt;
    });

    let totalCashExpensesLocal = 0;
    let totalBankExpensesLocal = 0;
    clubExpenses.forEach((e) => {
      const amt = Number(e.amount || 0);
      if (e.payment_source === 'bank') totalBankExpensesLocal += amt;
      else totalCashExpensesLocal += amt;
    });
    const totalClubExpensesLocal = totalCashExpensesLocal + totalBankExpensesLocal;

    const totalCollected = totalPrincipalCollected + totalFineCollected;
    const netClubAvailableBalance =
      totalCollected + totalBankInterestLocal - totalBankChargesLocal - totalClubExpensesLocal;
    const currentBankBalance =
      totalBankDepositedLocal +
      totalBankInterestLocal -
      totalBankChargesLocal -
      totalBankWithdrawalsLocal -
      totalBankExpensesLocal;
    const cashInHandBalance = netClubAvailableBalance - currentBankBalance;

    return {
      totalPrincipalCollected,
      totalFineCollected,
      totalCollected,
      totalBankDeposited: totalBankDepositedLocal,
      totalBankInterest: totalBankInterestLocal,
      totalBankCharges: totalBankChargesLocal,
      totalBankWithdrawals: totalBankWithdrawalsLocal,
      totalClubExpenses: totalClubExpensesLocal,
      totalCashExpenses: totalCashExpensesLocal,
      totalBankExpenses: totalBankExpensesLocal,
      netClubAvailableBalance,
      currentBankBalance,
      cashInHandBalance,
      topFineContributors,
    };
  }, [enrichedDues, members, bankDeposits, clubExpenses]);

  // Cache full highlights whenever Executive/Admin or local demo mode holds full club records
  useEffect(() => {
    if (canAccessAdmin || !supabaseSyncedMembers) {
      if (
        liveComputedHighlights.totalCollected > 0 ||
        liveComputedHighlights.totalBankDeposited > 0 ||
        liveComputedHighlights.totalClubExpenses > 0
      ) {
        localStorage.setItem(
          PUBLIC_HIGHLIGHTS_CACHE_KEY,
          JSON.stringify({
            ...liveComputedHighlights,
            updatedAt: new Date().toISOString(),
          })
        );
      }
    }
  }, [canAccessAdmin, supabaseSyncedMembers, liveComputedHighlights]);

  const publicClubHighlights = useMemo<PublicClubHighlights>(() => {
    if (canAccessAdmin || !supabaseSyncedMembers) {
      return liveComputedHighlights;
    }
    return rpcPublicHighlights || DEFAULT_PUBLIC_HIGHLIGHTS;
  }, [canAccessAdmin, supabaseSyncedMembers, liveComputedHighlights, rpcPublicHighlights]);

  const totalClubPrincipalCollected = publicClubHighlights.totalPrincipalCollected;
  const totalClubFineCollected = publicClubHighlights.totalFineCollected;
  const totalClubCollected = publicClubHighlights.totalCollected;
  const totalBankDeposited = publicClubHighlights.totalBankDeposited;
  const totalBankInterest = publicClubHighlights.totalBankInterest;
  const totalBankCharges = publicClubHighlights.totalBankCharges;
  const totalBankWithdrawals = publicClubHighlights.totalBankWithdrawals;
  const totalClubExpenses = publicClubHighlights.totalClubExpenses;
  const totalCashExpenses = publicClubHighlights.totalCashExpenses;
  const totalBankExpenses = publicClubHighlights.totalBankExpenses;
  const netClubAvailableBalance = publicClubHighlights.netClubAvailableBalance;
  const currentBankBalance = publicClubHighlights.currentBankBalance;
  const cashInHandBalance = publicClubHighlights.cashInHandBalance;

  const depositableFunds = Math.max(
    0,
    totalClubCollected - totalCashExpenses + totalBankWithdrawals
  );
  const pendingBankDeposit = Math.max(0, cashInHandBalance);
  const bankDepositProgress =
    depositableFunds > 0
      ? Math.min(100, Math.round((totalBankDeposited / depositableFunds) * 100))
      : 0;
  // ==========================================
  // ADMIN MEMBER ACTIONS
  // ==========================================

  const addMember = async (memberData: Omit<Member, 'id' | 'created_at' | 'updated_at'>) => {
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Only Admins can add new members.' };
    }

    const codeExists = members.some(
      m => m.member_code.toUpperCase() === memberData.member_code.trim().toUpperCase()
    );
    if (codeExists) {
      return { success: false, error: `Member code ${memberData.member_code} is already assigned.` };
    }

    const client = getSupabaseClient();
    if (supabaseSyncedMembers && client) {
      try {
        const basePayload = {
          member_code: memberData.member_code.trim().toUpperCase(),
          full_name: memberData.full_name.trim(),
          father_name: memberData.father_name?.trim() || null,
          shares_count: memberData.shares_count || 1,
          phone: memberData.phone?.trim() || null,
          email: memberData.email?.trim() || null,
          designation: memberData.designation || 'Member',
          profile_image_url: memberData.profile_image_url || null,
          join_date: memberData.join_date,
          status: memberData.status,
          auth_user_id: memberData.auth_user_id || null,
          monthly_contribution: memberData.monthly_contribution || defaultDueAmount,
        };
        const extPayload = {
          ...basePayload,
          date_of_birth: memberData.date_of_birth || null,
          blood_group: memberData.blood_group || null,
        };

        let { data, error: insErr } = await client
          .from('members')
          .insert([extPayload])
          .select()
          .single();

        if (insErr && isMissingColumnError(insErr)) {
          const retry = await client.from('members').insert([basePayload]).select().single();
          data = retry.data;
          insErr = retry.error;
        }

        if (insErr) throw insErr;
        setMembers(prev => [...prev, data as Member]);
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      }
    }

    const newMember: Member = {
      ...memberData,
      id: crypto.randomUUID ? crypto.randomUUID() : `m-${Date.now()}`,
      member_code: memberData.member_code.trim().toUpperCase(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setMembers(prev => [...prev, newMember]);
    return { success: true };
  };

  const updateMember = async (id: string, updates: Partial<Member>) => {
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Only Admins can edit members.' };
    }

    const client = getSupabaseClient();
    if (supabaseSyncedMembers && client) {
      try {
        let { error: updErr } = await client
          .from('members')
          .update(updates)
          .eq('id', id);

        if (updErr && isMissingColumnError(updErr)) {
          const { date_of_birth: _dob, blood_group: _bg, ...legacyUpdates } = updates;
          const retry = await client.from('members').update(legacyUpdates).eq('id', id);
          updErr = retry.error;
        }

        if (updErr) throw updErr;
        setMembers(prev => prev.map(m => (m.id === id ? { ...m, ...updates, updated_at: new Date().toISOString() } : m)));
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      }
    }

    setMembers(prev => prev.map(m => (m.id === id ? { ...m, ...updates, updated_at: new Date().toISOString() } : m)));
    return { success: true };
  };

  const toggleMemberStatus = async (id: string) => {
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Only Admins can change member status.' };
    }
    const target = members.find(m => m.id === id);
    if (!target) return { success: false, error: 'Member not found' };
    const nextStatus = target.status === 'active' ? 'inactive' : 'active';
    return updateMember(id, { status: nextStatus });
  };

  const deleteMember = async (id: string) => {
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Only Admins can delete members.' };
    }

    const client = getSupabaseClient();
    if (supabaseSyncedMembers && client) {
      try {
        const { error: delErr } = await client.from('members').delete().eq('id', id);
        if (delErr) throw delErr;
        setMembers(prev => prev.filter(m => m.id !== id));
        setMonthlyDues(prev => prev.filter(d => d.member_id !== id));
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      }
    }

    setMembers(prev => prev.filter(m => m.id !== id));
    setMonthlyDues(prev => prev.filter(d => d.member_id !== id));
    return { success: true };
  };

  // ==========================================
  // ADMIN PAYMENT ACTIONS
  // ==========================================

  const generateMonthlyDues = async (month: number, year: number) => {
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Only Admins can generate monthly dues.' };
    }

    const activeMembers = members.filter(m => m.status === 'active');
    if (activeMembers.length === 0) {
      return { success: false, error: 'No active members found to generate dues for.' };
    }

    const existing = monthlyDues.filter(d => d.month === month && d.year === year);
    const existingIds = new Set(existing.map(d => d.member_id));
    const membersNeedingDues = activeMembers.filter(m => !existingIds.has(m.id));

    if (membersNeedingDues.length === 0) {
      return {
        success: false,
        createdCount: 0,
        existingCount: existing.length,
        error: `Monthly dues for ${MONTH_NAMES[month - 1]} ${year} already exist for all ${activeMembers.length} active members.`,
      };
    }

    const client = getSupabaseClient();
    if (supabaseSyncedMembers && client) {
      try {
        const newRecords = membersNeedingDues.map(m => ({
          member_id: m.id,
          month,
          year,
          amount_due: m.monthly_contribution || (m.shares_count || 1) * defaultDueAmount,
          amount_paid: 0,
          status: 'unpaid' as const,
          recorded_by: user?.id || null,
        }));

        const { data, error: insErr } = await client
          .from('monthly_dues')
          .insert(newRecords)
          .select();

        if (insErr) throw insErr;

        setMonthlyDues(prev => [...(data as MonthlyDue[]), ...prev]);
        return {
          success: true,
          createdCount: newRecords.length,
          existingCount: existing.length,
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      }
    }

    const formatted: MonthlyDue[] = membersNeedingDues.map((m, i) => ({
      id: `due-${year}-${month}-${m.id}-${i}`,
      member_id: m.id,
      month,
      year,
      amount_due: m.monthly_contribution || (m.shares_count || 1) * defaultDueAmount,
      amount_paid: 0,
      status: 'unpaid',
      recorded_by: user?.id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    setMonthlyDues(prev => [...formatted, ...prev]);
    return {
      success: true,
      createdCount: formatted.length,
      existingCount: existing.length,
    };
  };

  const isMissingColumnError = (err: { message?: string; code?: string } | null | undefined) => {
    if (!err) return false;
    const msg = (err.message || '').toLowerCase();
    return (
      err.code === '42703' ||
      err.code === 'PGRST204' ||
      msg.includes('fine_due') ||
      msg.includes('fine_paid') ||
      msg.includes('fine_waived') ||
      msg.includes('notes') ||
      msg.includes('receipt_number') ||
      msg.includes('payment_method') ||
      msg.includes('recorded_by_name') ||
      msg.includes('date_of_birth') ||
      msg.includes('blood_group') ||
      msg.includes('schema cache')
    );
  };

  const notifyMemberOfPayment = async (params: {
    targetMember: Member;
    due: MonthlyDue;
    totalPaid: number;
  }) => {
    if (params.totalPaid <= 0) return;
    const periodLabel = `${getMonthName(params.due.month)} ${params.due.year}`;
    const receiptNo =
      params.due.receipt_number ||
      buildReceiptNumber(params.targetMember.member_code, params.due.month, params.due.year, params.due.id);

    await logMemberActivity({
      actorUserId: user?.id || null,
      memberId: params.targetMember.id,
      targetMemberId: params.targetMember.id,
      memberCode: params.targetMember.member_code,
      memberName: params.targetMember.full_name,
      audience: 'member',
      eventType: 'payment_recorded',
      title: `Payment Recorded: ${periodLabel}`,
      message: `Your payment of ${formatBDT(params.totalPaid)} for ${periodLabel} has been confirmed. Receipt #${receiptNo} is ready to download.`,
      metadata: {
        dueId: params.due.id,
        month: params.due.month,
        year: params.due.year,
        amountPaid: params.due.amount_paid,
        finePaid: params.due.fine_paid || 0,
        totalPaid: params.totalPaid,
        receiptNumber: receiptNo,
        paymentMethod: params.due.payment_method || 'Cash',
      },
    });
  };

  const markAsPaid = async (
    dueId: string,
    amountPaid?: number,
    paidAt?: string,
    fineOptions?: { fineDue?: number; finePaid?: number; fineWaived?: boolean }
  ) => {
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Only Admins can record payments.' };
    }

    const targetDue = monthlyDues.find(d => d.id === dueId);
    if (!targetDue) return { success: false, error: 'Record not found.' };
    const targetMember = members.find(m => m.id === targetDue.member_id);

    const finalPaid = amountPaid !== undefined ? amountPaid : targetDue.amount_due;
    const finalPaidAt = paidAt || new Date().toISOString();

    let finalStatus: DueStatus = 'paid';
    if (finalPaid >= targetDue.amount_due && targetDue.amount_due > 0) {
      finalStatus = 'paid';
    } else if (finalPaid > 0) {
      finalStatus = 'partial';
    } else {
      finalStatus = 'unpaid';
    }

    const fineDueVal = fineOptions?.fineDue !== undefined ? fineOptions.fineDue : Number(targetDue.fine_due || 0);
    const finePaidVal = fineOptions?.finePaid !== undefined ? fineOptions.finePaid : Number(targetDue.fine_paid || 0);
    const fineWaivedVal = fineOptions?.fineWaived !== undefined ? fineOptions.fineWaived : Boolean(targetDue.fine_waived);

    const adminName = myMemberRecord?.full_name || profile?.full_name || 'Admin';
    const receiptNo =
      targetDue.receipt_number ||
      buildReceiptNumber(targetMember?.member_code || 'BND', targetDue.month, targetDue.year, targetDue.id);

    const baseUpdates = {
      amount_paid: finalPaid,
      status: finalStatus,
      paid_at: finalPaid > 0 ? finalPaidAt : null,
      recorded_by: user?.id || null,
      updated_at: new Date().toISOString(),
    };

    const extendedUpdates = {
      ...baseUpdates,
      fine_due: fineDueVal,
      fine_paid: finePaidVal,
      fine_paid_at: finePaidVal > 0 ? (targetDue.fine_paid_at || finalPaidAt) : null,
      fine_waived: fineWaivedVal,
      receipt_number: receiptNo,
      payment_method: targetDue.payment_method || 'Cash',
      recorded_by_name: adminName,
    };

    const updatedRecord: MonthlyDue = { ...targetDue, ...extendedUpdates, member: targetMember || targetDue.member };

    const client = getSupabaseClient();
    if (supabaseSyncedMembers && client) {
      try {
        let { error: updErr } = await client
          .from('monthly_dues')
          .update(extendedUpdates)
          .eq('id', dueId);

        if (updErr && isMissingColumnError(updErr)) {
          const { receipt_number: _r, payment_method: _pm, recorded_by_name: _rbn, ...compatUpdates } = extendedUpdates;
          const retry1 = await client.from('monthly_dues').update(compatUpdates).eq('id', dueId);
          updErr = retry1.error;
          if (updErr && isMissingColumnError(updErr)) {
            const retry2 = await client.from('monthly_dues').update(baseUpdates).eq('id', dueId);
            updErr = retry2.error;
          }
        }

        if (updErr) throw updErr;
        setMonthlyDues(prev => prev.map(d => (d.id === dueId ? updatedRecord : d)));
        if (targetMember && finalPaid + finePaidVal > 0) {
          await notifyMemberOfPayment({
            targetMember,
            due: updatedRecord,
            totalPaid: finalPaid + finePaidVal,
          });
        }
        return { success: true, due: updatedRecord };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      }
    }

    setMonthlyDues(prev => prev.map(d => (d.id === dueId ? updatedRecord : d)));
    if (targetMember && finalPaid + finePaidVal > 0) {
      await notifyMemberOfPayment({
        targetMember,
        due: updatedRecord,
        totalPaid: finalPaid + finePaidVal,
      });
    }
    return { success: true, due: updatedRecord };
  };

  const recordNewPayment = async (params: {
    memberId: string;
    month: number;
    year: number;
    amountPaid: number;
    amountDue?: number;
    fineDue?: number;
    finePaid?: number;
    fineWaived?: boolean;
    paidAt?: string;
    paymentMethod?: string;
    notes?: string;
  }) => {
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Only Admins can record payments.' };
    }

    const targetMember = members.find(m => m.id === params.memberId);
    if (!targetMember) {
      return { success: false, error: 'Member not found.' };
    }

    const calculatedDue = params.amountDue !== undefined ? params.amountDue : targetMember.monthly_contribution;
    const finalPaid = Number(params.amountPaid);

    let status: DueStatus = 'unpaid';
    if (finalPaid >= calculatedDue && calculatedDue > 0) {
      status = 'paid';
    } else if (finalPaid > 0) {
      status = 'partial';
    } else {
      status = 'unpaid';
    }

    const finalPaidAt = finalPaid > 0 ? (params.paidAt || new Date().toISOString()) : null;
    const fineDueVal = Number(params.fineDue || 0);
    const finePaidVal = Number(params.finePaid || 0);
    const fineWaivedVal = Boolean(params.fineWaived);
    const finePaidAtVal = finePaidVal > 0 ? (params.paidAt || new Date().toISOString()) : null;
    const adminName = myMemberRecord?.full_name || profile?.full_name || 'Admin';
    const methodLabel = params.paymentMethod || (params.notes?.split(' - ')[0]) || 'Cash';
    const existingDue = monthlyDues.find(
      d => d.member_id === params.memberId && d.month === params.month && d.year === params.year
    );
    const receiptNo =
      existingDue?.receipt_number ||
      buildReceiptNumber(targetMember.member_code, params.month, params.year);

    const client = getSupabaseClient();
    if (supabaseSyncedMembers && client) {
      try {
        const basePayload = {
          member_id: params.memberId,
          month: params.month,
          year: params.year,
          amount_due: calculatedDue,
          amount_paid: finalPaid,
          status,
          paid_at: finalPaidAt,
          recorded_by: user?.id || null,
        };

        const compatPayload = {
          ...basePayload,
          fine_due: fineDueVal,
          fine_paid: finePaidVal,
          fine_paid_at: finePaidAtVal,
          fine_waived: fineWaivedVal,
          notes: params.notes || null,
        };

        const fullPayload = {
          ...compatPayload,
          receipt_number: receiptNo,
          payment_method: methodLabel,
          recorded_by_name: adminName,
        };

        let { data, error: upsertErr } = await client
          .from('monthly_dues')
          .upsert(fullPayload, { onConflict: 'member_id,month,year' })
          .select()
          .single();

        if (upsertErr && isMissingColumnError(upsertErr)) {
          const retryCompat = await client
            .from('monthly_dues')
            .upsert(compatPayload, { onConflict: 'member_id,month,year' })
            .select()
            .single();
          data = retryCompat.data;
          upsertErr = retryCompat.error;

          if (upsertErr && isMissingColumnError(upsertErr)) {
            const retryCols = await client
              .from('monthly_dues')
              .upsert(basePayload, { onConflict: 'member_id,month,year' })
              .select()
              .single();
            data = retryCols.data;
            upsertErr = retryCols.error;
          }
        }

        // Retry with recorded_by = null if profiles FK has not been created yet
        if (upsertErr && upsertErr.message.toLowerCase().includes('recorded_by')) {
          const retryFk = await client
            .from('monthly_dues')
            .upsert({ ...basePayload, recorded_by: null }, { onConflict: 'member_id,month,year' })
            .select()
            .single();
          data = retryFk.data;
          upsertErr = retryFk.error;
        }

        if (upsertErr) throw upsertErr;

        const updated: MonthlyDue = {
          ...(data as MonthlyDue),
          fine_due: (data as MonthlyDue).fine_due ?? fineDueVal,
          fine_paid: (data as MonthlyDue).fine_paid ?? finePaidVal,
          fine_paid_at: (data as MonthlyDue).fine_paid_at ?? finePaidAtVal,
          fine_waived: (data as MonthlyDue).fine_waived ?? fineWaivedVal,
          notes: (data as MonthlyDue).notes ?? params.notes ?? null,
          receipt_number: (data as MonthlyDue).receipt_number ?? receiptNo,
          payment_method: (data as MonthlyDue).payment_method ?? methodLabel,
          recorded_by_name: (data as MonthlyDue).recorded_by_name ?? adminName,
          member: targetMember,
        };
        setMonthlyDues(prev => {
          const idx = prev.findIndex(d => d.member_id === params.memberId && d.month === params.month && d.year === params.year);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = updated;
            return next;
          }
          return [updated, ...prev];
        });

        if (finalPaid + finePaidVal > 0) {
          await notifyMemberOfPayment({
            targetMember,
            due: updated,
            totalPaid: finalPaid + finePaidVal,
          });
        }

        return { success: true, due: updated };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      }
    }

    const existingIdx = monthlyDues.findIndex(
      d => d.member_id === params.memberId && d.month === params.month && d.year === params.year
    );

    let savedLocalDue: MonthlyDue;
    if (existingIdx >= 0) {
      savedLocalDue = {
        ...monthlyDues[existingIdx],
        amount_due: calculatedDue,
        amount_paid: finalPaid,
        fine_due: fineDueVal,
        fine_paid: finePaidVal,
        fine_paid_at: finePaidAtVal,
        fine_waived: fineWaivedVal,
        notes: params.notes || monthlyDues[existingIdx].notes || null,
        receipt_number: receiptNo,
        payment_method: methodLabel,
        recorded_by_name: adminName,
        status,
        paid_at: finalPaidAt,
        updated_at: new Date().toISOString(),
        member: targetMember,
      };
      setMonthlyDues(prev => {
        const next = [...prev];
        next[existingIdx] = savedLocalDue;
        return next;
      });
    } else {
      savedLocalDue = {
        id: `due-${params.year}-${params.month}-${params.memberId}-${Date.now()}`,
        member_id: params.memberId,
        month: params.month,
        year: params.year,
        amount_due: calculatedDue,
        amount_paid: finalPaid,
        fine_due: fineDueVal,
        fine_paid: finePaidVal,
        fine_paid_at: finePaidAtVal,
        fine_waived: fineWaivedVal,
        notes: params.notes || null,
        receipt_number: receiptNo,
        payment_method: methodLabel,
        recorded_by_name: adminName,
        status,
        paid_at: finalPaidAt,
        recorded_by: user?.id || 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        member: targetMember,
      };
      setMonthlyDues(prev => [savedLocalDue, ...prev]);
    }

    if (finalPaid + finePaidVal > 0) {
      await notifyMemberOfPayment({
        targetMember,
        due: savedLocalDue,
        totalPaid: finalPaid + finePaidVal,
      });
    }
    return { success: true, due: savedLocalDue };
  };

  const updateDueRecord = async (
    dueId: string,
    updates: {
      member_id?: string;
      month?: number;
      year?: number;
      amount_paid: number;
      amount_due?: number;
      paid_at?: string | null;
      fine_due?: number;
      fine_paid?: number;
      fine_paid_at?: string | null;
      fine_waived?: boolean;
      notes?: string | null;
    }
  ) => {
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Only Admins can modify financial records.' };
    }

    const target = monthlyDues.find(d => d.id === dueId);
    if (!target) return { success: false, error: 'Record not found.' };

    const nextMemberId = updates.member_id || target.member_id;
    const nextMonth = updates.month !== undefined ? updates.month : target.month;
    const nextYear = updates.year !== undefined ? updates.year : target.year;
    const keyChanged =
      nextMemberId !== target.member_id ||
      nextMonth !== target.month ||
      nextYear !== target.year;

    const dueAmount = updates.amount_due !== undefined ? updates.amount_due : target.amount_due;
    const paidAmount = updates.amount_paid;

    let status: DueStatus = 'unpaid';
    if (paidAmount >= dueAmount && dueAmount > 0) {
      status = 'paid';
    } else if (paidAmount > 0) {
      status = 'partial';
    } else {
      status = 'unpaid';
    }

    const basePayload = {
      member_id: nextMemberId,
      month: nextMonth,
      year: nextYear,
      amount_due: dueAmount,
      amount_paid: paidAmount,
      status,
      paid_at: updates.paid_at !== undefined ? updates.paid_at : (paidAmount > 0 ? (target.paid_at || new Date().toISOString()) : null),
      recorded_by: user?.id || null,
      updated_at: new Date().toISOString(),
    };

    const fullPayload = {
      ...basePayload,
      fine_due: updates.fine_due !== undefined ? updates.fine_due : Number(target.fine_due || 0),
      fine_paid: updates.fine_paid !== undefined ? updates.fine_paid : Number(target.fine_paid || 0),
      fine_paid_at: updates.fine_paid_at !== undefined ? updates.fine_paid_at : (target.fine_paid_at || null),
      fine_waived: updates.fine_waived !== undefined ? updates.fine_waived : Boolean(target.fine_waived),
      notes: updates.notes !== undefined ? updates.notes : (target.notes || null),
    };

    const conflicting = keyChanged
      ? monthlyDues.find(
          d =>
            d.id !== dueId &&
            d.member_id === nextMemberId &&
            d.month === nextMonth &&
            d.year === nextYear
        )
      : undefined;

    const client = getSupabaseClient();
    if (supabaseSyncedMembers && client) {
      try {
        if (conflicting) {
          // Move/merge onto the existing (member_id, month, year) row and remove the wrong entry
          let { data: mergedData, error: mergeErr } = await client
            .from('monthly_dues')
            .update(fullPayload)
            .eq('id', conflicting.id)
            .select()
            .single();

          if (mergeErr && isMissingColumnError(mergeErr)) {
            const retry = await client
              .from('monthly_dues')
              .update(basePayload)
              .eq('id', conflicting.id)
              .select()
              .single();
            mergedData = retry.data;
            mergeErr = retry.error;
          }
          if (mergeErr) throw mergeErr;

          const { error: delErr } = await client.from('monthly_dues').delete().eq('id', dueId);
          if (delErr) throw delErr;

          setMonthlyDues(prev =>
            prev
              .filter(d => d.id !== dueId)
              .map(d => (d.id === conflicting.id ? { ...(mergedData as MonthlyDue), ...fullPayload } : d))
          );
          return { success: true };
        }

        let { error: updErr } = await client
          .from('monthly_dues')
          .update(fullPayload)
          .eq('id', dueId);

        if (updErr && isMissingColumnError(updErr)) {
          const retry = await client
            .from('monthly_dues')
            .update(basePayload)
            .eq('id', dueId);
          updErr = retry.error;
        }

        if (updErr) throw updErr;
        setMonthlyDues(prev => prev.map(d => (d.id === dueId ? { ...d, ...fullPayload } : d)));
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      }
    }

    if (conflicting) {
      setMonthlyDues(prev =>
        prev
          .filter(d => d.id !== dueId)
          .map(d => (d.id === conflicting.id ? { ...d, ...fullPayload } : d))
      );
    } else {
      setMonthlyDues(prev => prev.map(d => (d.id === dueId ? { ...d, ...fullPayload } : d)));
    }
    return { success: true };
  };

  const recordFinePayment = async (params: {
    memberId: string;
    month: number;
    year: number;
    fineDue: number;
    finePaid: number;
    clearPrincipal?: boolean;
    principalPaid?: number;
    waiveFine?: boolean;
    paidAt?: string;
    notes?: string;
  }) => {
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Only Admins can record fine payments.' };
    }

    const targetMember = members.find(m => m.id === params.memberId);
    if (!targetMember) {
      return { success: false, error: 'Member not found.' };
    }

    const existing = monthlyDues.find(
      d => d.member_id === params.memberId && d.month === params.month && d.year === params.year
    );

    const amountDue = existing?.amount_due ?? targetMember.monthly_contribution;
    const timestamp = params.paidAt || new Date().toISOString();

    let nextAmountPaid = existing?.amount_paid ?? 0;
    if (params.clearPrincipal) {
      nextAmountPaid = amountDue;
    } else if (params.principalPaid !== undefined) {
      nextAmountPaid = params.principalPaid;
    }

    const nextFineDue = params.waiveFine ? 0 : Math.max(Number(params.fineDue || 0), Number(params.finePaid || 0));
    const nextFinePaid = params.waiveFine ? 0 : Number(params.finePaid || 0);

    return recordNewPayment({
      memberId: params.memberId,
      month: params.month,
      year: params.year,
      amountDue,
      amountPaid: nextAmountPaid,
      fineDue: nextFineDue,
      finePaid: nextFinePaid,
      fineWaived: Boolean(params.waiveFine),
      paidAt: timestamp,
      notes: params.notes,
    });
  };

  const waiveMemberFine = async (
    dueId: string,
    fallback?: { memberId: string; month: number; year: number }
  ) => {
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Only Admins can waive fines.' };
    }
    const target = monthlyDues.find(d => d.id === dueId);
    if (!target) {
      if (fallback) {
        return recordFinePayment({
          memberId: fallback.memberId,
          month: fallback.month,
          year: fallback.year,
          fineDue: 0,
          finePaid: 0,
          waiveFine: true,
          clearPrincipal: false,
          notes: 'জরিমানা মওকুফ',
        });
      }
      return { success: false, error: 'Record not found.' };
    }
    return updateDueRecord(dueId, {
      amount_paid: target.amount_paid,
      amount_due: target.amount_due,
      fine_due: Number(target.fine_paid || 0),
      fine_waived: true,
    });
  };

  const deleteDueRecord = async (dueId: string) => {
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Only Admins can delete financial records.' };
    }

    const client = getSupabaseClient();
    if (supabaseSyncedMembers && client) {
      try {
        const { error: delErr } = await client.from('monthly_dues').delete().eq('id', dueId);
        if (delErr) throw delErr;
        setMonthlyDues(prev => prev.filter(d => d.id !== dueId));
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      }
    }

    setMonthlyDues(prev => prev.filter(d => d.id !== dueId));
    return { success: true };
  };

  // ==========================================
  // ADMIN BANK LEDGER ACTIONS (Sonali Bank PLC)
  // ==========================================

  const isMissingBankTableError = (err: { message?: string; code?: string } | null | undefined) => {
    if (!err) return false;
    const msg = (err.message || '').toLowerCase();
    return (
      err.code === '42P01' ||
      err.code === 'PGRST205' ||
      msg.includes('bank_deposits') ||
      msg.includes('schema cache')
    );
  };

  const isMissingEntryTypeColumnError = (err: { message?: string; code?: string } | null | undefined) => {
    if (!err) return false;
    const msg = (err.message || '').toLowerCase();
    return err.code === '42703' || err.code === 'PGRST204' || msg.includes('entry_type');
  };

  const isMissingExpenseTableError = (err: { message?: string; code?: string } | null | undefined) => {
    if (!err) return false;
    const msg = (err.message || '').toLowerCase();
    return (
      err.code === '42P01' ||
      err.code === 'PGRST205' ||
      msg.includes('club_expenses') ||
      msg.includes('schema cache')
    );
  };

  const persistLocalBankExtras = (list: BankDeposit[]) => {
    const extras = list.filter((item) => item.id.startsWith('bank-extra-'));
    localStorage.setItem(BANK_LOCAL_EXTRAS_KEY, JSON.stringify(extras));
  };

  const addBankDeposit = async (params: {
    amount: number;
    deposited_at: string;
    entry_type?: BankEntryType;
    reference_no?: string;
    notes?: string;
  }) => {
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Only Admins can record bank entries.' };
    }
    const cleanAmount = Number(params.amount);
    if (!cleanAmount || cleanAmount <= 0) {
      return { success: false, error: 'Please enter a valid amount greater than ৳0.' };
    }

    const entryType: BankEntryType = params.entry_type || 'deposit';
    const basePayload = {
      bank_name: 'Sonali Bank PLC',
      branch_name: 'Bhedarganj Branch, Shariatpur',
      account_number: '2102201027292',
      account_name: 'jafor saikot dhali tanvir khan',
      entry_type: entryType,
      amount: cleanAmount,
      deposited_at: params.deposited_at || new Date().toISOString().substring(0, 10),
      reference_no: params.reference_no?.trim() || null,
      notes: params.notes?.trim() || null,
      recorded_by: user?.id || null,
    };

    const client = getSupabaseClient();
    if (supabaseSyncedMembers && client) {
      try {
        let { data, error: insErr } = await client
          .from('bank_deposits')
          .insert([basePayload])
          .select()
          .single();

        if (insErr && insErr.message.toLowerCase().includes('recorded_by')) {
          const retry = await client
            .from('bank_deposits')
            .insert([{ ...basePayload, recorded_by: null }])
            .select()
            .single();
          data = retry.data;
          insErr = retry.error;
        }

        // Backward-compatibility if DB hasn't added entry_type column yet
        if (insErr && isMissingEntryTypeColumnError(insErr)) {
          if (entryType === 'deposit') {
            const { entry_type: _omit, ...legacyPayload } = basePayload;
            const legacyRetry = await client
              .from('bank_deposits')
              .insert([legacyPayload])
              .select()
              .single();
            if (!legacyRetry.error && legacyRetry.data) {
              setSupabaseBankAvailable(true);
              const created: BankDeposit = {
                ...(legacyRetry.data as BankDeposit),
                entry_type: 'deposit',
                amount: Number((legacyRetry.data as BankDeposit).amount || cleanAmount),
              };
              setBankDeposits((prev) => [created, ...prev]);
              return { success: true };
            }
          } else {
            // Save non-deposit bank adjustments (interest/charge/withdrawal) locally until migration runs
            const localExtra: BankDeposit = {
              ...basePayload,
              id: `bank-extra-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            setBankDeposits((prev) => {
              const next = [localExtra, ...prev];
              persistLocalBankExtras(next);
              return next;
            });
            return { success: true };
          }
        }

        if (insErr) {
          if (isMissingBankTableError(insErr)) {
            setSupabaseBankAvailable(false);
          } else {
            throw insErr;
          }
        } else if (data) {
          setSupabaseBankAvailable(true);
          const created: BankDeposit = {
            ...(data as BankDeposit),
            entry_type: ((data as BankDeposit).entry_type || entryType) as BankEntryType,
            amount: Number((data as BankDeposit).amount || cleanAmount),
          };
          setBankDeposits((prev) => [created, ...prev]);
          return { success: true };
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      }
    }

    const localDeposit: BankDeposit = {
      ...basePayload,
      id: `bank-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setBankDeposits((prev) => [localDeposit, ...prev]);
    return { success: true };
  };

  const updateBankDeposit = async (
    id: string,
    updates: {
      amount: number;
      deposited_at: string;
      entry_type?: BankEntryType;
      reference_no?: string | null;
      notes?: string | null;
    }
  ) => {
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Only Admins can edit bank ledger entries.' };
    }
    const cleanAmount = Number(updates.amount);
    if (!cleanAmount || cleanAmount <= 0) {
      return { success: false, error: 'Amount must be greater than ৳0.' };
    }

    const existing = bankDeposits.find((d) => d.id === id);
    const nextType: BankEntryType = updates.entry_type || existing?.entry_type || 'deposit';

    const payload = {
      entry_type: nextType,
      amount: cleanAmount,
      deposited_at: updates.deposited_at,
      reference_no: updates.reference_no?.trim() || null,
      notes: updates.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const isLocalExtra = id.startsWith('bank-extra-');
    const client = getSupabaseClient();
    if (!isLocalExtra && supabaseSyncedMembers && supabaseBankAvailable && client) {
      try {
        let { error: updErr } = await client
          .from('bank_deposits')
          .update(payload)
          .eq('id', id);

        if (updErr && isMissingEntryTypeColumnError(updErr)) {
          const { entry_type: _omit, ...legacyPayload } = payload;
          const retry = await client.from('bank_deposits').update(legacyPayload).eq('id', id);
          updErr = retry.error;
        }
        if (updErr) throw updErr;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      }
    }

    setBankDeposits((prev) => {
      const next = prev.map((d) => (d.id === id ? { ...d, ...payload } : d));
      if (isLocalExtra) persistLocalBankExtras(next);
      return next;
    });
    return { success: true };
  };

  const deleteBankDeposit = async (id: string) => {
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Only Admins can delete bank entries.' };
    }

    const isLocalExtra = id.startsWith('bank-extra-');
    const client = getSupabaseClient();
    if (!isLocalExtra && supabaseSyncedMembers && supabaseBankAvailable && client) {
      try {
        const { error: delErr } = await client
          .from('bank_deposits')
          .delete()
          .eq('id', id);
        if (delErr) throw delErr;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      }
    }

    setBankDeposits((prev) => {
      const next = prev.filter((d) => d.id !== id);
      if (isLocalExtra) persistLocalBankExtras(next);
      return next;
    });
    return { success: true };
  };

  // ==========================================
  // ADMIN CLUB EXPENSES ACTIONS
  // ==========================================

  const addClubExpense = async (params: {
    title: string;
    category: ExpenseCategory;
    amount: number;
    expense_date: string;
    payment_source: ExpensePaymentSource;
    reference_no?: string;
    notes?: string;
  }) => {
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Only Admins can record club expenses.' };
    }
    const cleanAmount = Number(params.amount);
    if (!params.title.trim()) {
      return { success: false, error: 'Please enter an expense title or description.' };
    }
    if (!cleanAmount || cleanAmount <= 0) {
      return { success: false, error: 'Please enter a valid expense amount greater than ৳0.' };
    }

    const basePayload = {
      title: params.title.trim(),
      category: params.category || 'operational',
      amount: cleanAmount,
      expense_date: params.expense_date || new Date().toISOString().substring(0, 10),
      payment_source: params.payment_source || 'cash',
      reference_no: params.reference_no?.trim() || null,
      notes: params.notes?.trim() || null,
      recorded_by: user?.id || null,
    };

    const client = getSupabaseClient();
    if (supabaseSyncedMembers && client) {
      try {
        let { data, error: insErr } = await client
          .from('club_expenses')
          .insert([basePayload])
          .select()
          .single();

        if (insErr && insErr.message.toLowerCase().includes('recorded_by')) {
          const retry = await client
            .from('club_expenses')
            .insert([{ ...basePayload, recorded_by: null }])
            .select()
            .single();
          data = retry.data;
          insErr = retry.error;
        }

        if (insErr) {
          if (isMissingExpenseTableError(insErr)) {
            setSupabaseExpensesAvailable(false);
          } else {
            throw insErr;
          }
        } else if (data) {
          setSupabaseExpensesAvailable(true);
          const created: ClubExpense = {
            ...(data as ClubExpense),
            amount: Number((data as ClubExpense).amount || cleanAmount),
          };
          setClubExpenses((prev) => [created, ...prev]);
          return { success: true };
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      }
    }

    const localExpense: ClubExpense = {
      ...basePayload,
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setClubExpenses((prev) => [localExpense, ...prev]);
    return { success: true };
  };

  const updateClubExpense = async (
    id: string,
    updates: {
      title: string;
      category: ExpenseCategory;
      amount: number;
      expense_date: string;
      payment_source: ExpensePaymentSource;
      reference_no?: string | null;
      notes?: string | null;
    }
  ) => {
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Only Admins can edit club expenses.' };
    }
    const cleanAmount = Number(updates.amount);
    if (!updates.title.trim() || !cleanAmount || cleanAmount <= 0) {
      return { success: false, error: 'Valid expense title and positive amount are required.' };
    }

    const payload = {
      title: updates.title.trim(),
      category: updates.category,
      amount: cleanAmount,
      expense_date: updates.expense_date,
      payment_source: updates.payment_source,
      reference_no: updates.reference_no?.trim() || null,
      notes: updates.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const client = getSupabaseClient();
    if (supabaseSyncedMembers && supabaseExpensesAvailable && client) {
      try {
        const { error: updErr } = await client
          .from('club_expenses')
          .update(payload)
          .eq('id', id);
        if (updErr) throw updErr;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      }
    }

    setClubExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...payload } : e))
    );
    return { success: true };
  };

  const deleteClubExpense = async (id: string) => {
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Only Admins can delete club expenses.' };
    }

    const client = getSupabaseClient();
    if (supabaseSyncedMembers && supabaseExpensesAvailable && client) {
      try {
        const { error: delErr } = await client
          .from('club_expenses')
          .delete()
          .eq('id', id);
        if (delErr) throw delErr;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      }
    }

    setClubExpenses((prev) => prev.filter((e) => e.id !== id));
    return { success: true };
  };

  const resetDemoData = () => {
    if (!isAdmin) return;
    localStorage.removeItem(MEMBERS_STORAGE_KEY);
    localStorage.removeItem(DUES_STORAGE_KEY);
    localStorage.removeItem(BANK_DEPOSITS_STORAGE_KEY);
    localStorage.removeItem(BANK_LOCAL_EXTRAS_KEY);
    localStorage.removeItem(CLUB_EXPENSES_STORAGE_KEY);
    setMembers(INITIAL_MEMBERS);
    setMonthlyDues(INITIAL_MONTHLY_DUES);
    setPublicMembers(INITIAL_PUBLIC_MEMBERS);
    setBankDeposits([]);
    setClubExpenses([]);
  };

  const enrichedPublicMembers = useMemo(() => {
    const dirById = new Map(memberDirectory.map((d) => [d.id, d]));
    const fullById = new Map(members.map((m) => [m.id, m]));
    return publicMembers.map((pm) => {
      const dir = dirById.get(pm.id);
      const full = fullById.get(pm.id);
      const selfRecord = myMemberRecord?.id === pm.id ? myMemberRecord : null;
      return {
        ...pm,
        blood_group: pm.blood_group ?? selfRecord?.blood_group ?? dir?.blood_group ?? full?.blood_group ?? null,
      };
    });
  }, [publicMembers, memberDirectory, members, myMemberRecord]);

  const value = useMemo(
    () => ({
      publicMembers: enrichedPublicMembers,
      memberDirectory,
      upcomingBirthdayHighlights,
      members,
      myMemberRecord,
      myDues,
      myFinancialSummary,
      monthlyDues: enrichedDues,
      notifications: scopedNotifications,
      announcements,
      unreadNotificationCount,
      bankDeposits,
      clubExpenses,
      totalClubPrincipalCollected,
      totalClubFineCollected,
      totalClubCollected,
      totalBankDeposited,
      totalBankInterest,
      totalBankCharges,
      totalBankWithdrawals,
      totalClubExpenses,
      totalCashExpenses,
      totalBankExpenses,
      netClubAvailableBalance,
      currentBankBalance,
      cashInHandBalance,
      pendingBankDeposit,
      bankDepositProgress,
      publicClubHighlights,
      isLiveSupabaseSynced: supabaseSyncedMembers,
      isLoading,
      error,
      selectedYear,
      selectedMonth,
      defaultDueAmount,
      clubMonthlyTarget,
      stats,
      monthSummaries,
      setSelectedYear,
      setSelectedMonth,
      setDefaultDueAmount,
      refreshData: loadSupabaseData,
      refreshNotifications,
      linkMyMemberAccount,
      updateMyContactPhone,
      updateMyMemberProfile,
      logMemberActivity,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      clearNotifications,
      publishAnnouncement,
      deleteAnnouncement,
      addMember,
      updateMember,
      toggleMemberStatus,
      deleteMember,
      generateMonthlyDues,
      markAsPaid,
      recordNewPayment,
      updateDueRecord,
      recordFinePayment,
      waiveMemberFine,
      deleteDueRecord,
      addBankDeposit,
      updateBankDeposit,
      deleteBankDeposit,
      addClubExpense,
      updateClubExpense,
      deleteClubExpense,
      resetDemoData,
    }),
    [
      enrichedPublicMembers,
      memberDirectory,
      upcomingBirthdayHighlights,
      members,
      myMemberRecord,
      myDues,
      myFinancialSummary,
      enrichedDues,
      scopedNotifications,
      announcements,
      unreadNotificationCount,
      bankDeposits,
      clubExpenses,
      totalClubPrincipalCollected,
      totalClubFineCollected,
      totalClubCollected,
      totalBankDeposited,
      totalBankInterest,
      totalBankCharges,
      totalBankWithdrawals,
      totalClubExpenses,
      totalCashExpenses,
      totalBankExpenses,
      netClubAvailableBalance,
      currentBankBalance,
      cashInHandBalance,
      pendingBankDeposit,
      bankDepositProgress,
      publicClubHighlights,
      supabaseSyncedMembers,
      isLoading,
      error,
      selectedYear,
      selectedMonth,
      defaultDueAmount,
      clubMonthlyTarget,
      stats,
      monthSummaries,
      loadSupabaseData,
      refreshNotifications,
      logMemberActivity,
      isAdmin,
      canAccessAdmin,
      user,
    ]
  );

  return <ClubDataContext.Provider value={value}>{children}</ClubDataContext.Provider>;
};

export const useClubData = () => {
  const context = useContext(ClubDataContext);
  if (!context) {
    throw new Error('useClubData must be used within a ClubDataProvider');
  }
  return context;
};
