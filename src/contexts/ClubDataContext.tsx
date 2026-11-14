import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  Member,
  PublicMember,
  MonthlyDue,
  ClubStats,
  MonthSummary,
  MemberFinancialSummary,
  DueStatus,
  ClubNotification,
  NotificationEventType,
} from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabase/client';
import {
  INITIAL_MEMBERS,
  INITIAL_PUBLIC_MEMBERS,
  INITIAL_MONTHLY_DUES,
} from '../lib/mockData';
import { useAuth } from './AuthContext';
import { MONTH_NAMES, SHORT_MONTH_NAMES } from '../utils/formatters';
import { calculateDueBreakdown } from '../utils/fineCalculator';

interface LogActivityParams {
  actorUserId?: string | null;
  memberId?: string | null;
  memberCode?: string | null;
  memberName: string;
  eventType: NotificationEventType;
  title: string;
  message: string;
}

interface ClubDataContextType {
  publicMembers: PublicMember[];
  members: Member[];
  myMemberRecord: Member | null;
  myDues: MonthlyDue[];
  myFinancialSummary: MemberFinancialSummary;
  monthlyDues: MonthlyDue[];
  notifications: ClubNotification[];
  unreadNotificationCount: number;
  isLiveSupabaseSynced: boolean;
  isLoading: boolean;
  error: string | null;
  selectedYear: number;
  selectedMonth: number; // 1 - 12
  defaultDueAmount: number;
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
  logMemberActivity: (params: LogActivityParams) => Promise<void>;

  // Admin notification actions
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;

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
  ) => Promise<{ success: boolean; error?: string }>;
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
    notes?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  updateDueRecord: (
    dueId: string,
    updates: {
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
  waiveMemberFine: (dueId: string) => Promise<{ success: boolean; error?: string }>;
  deleteDueRecord: (dueId: string) => Promise<{ success: boolean; error?: string }>;

  resetDemoData: () => void;
}

const ClubDataContext = createContext<ClubDataContextType | undefined>(undefined);

const MEMBERS_STORAGE_KEY = 'bondhon_local_members_v5';
const DUES_STORAGE_KEY = 'bondhon_local_dues_v5';
const NOTIFICATIONS_STORAGE_KEY = 'bondhon_local_notifications_v1';

export const ClubDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, user, profile } = useAuth();

  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
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

  // Tracks whether Supabase actually has seeded rows in `members`
  const [supabaseSyncedMembers, setSupabaseSyncedMembers] = useState<boolean>(false);
  const [supabaseNotificationsAvailable, setSupabaseNotificationsAvailable] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = isSupabaseConfigured();

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
    localStorage.setItem('bondhon_default_due_amount', String(defaultDueAmount));
  }, [defaultDueAmount]);

  // Keep publicMembers derived from active members unless populated directly from Supabase view
  useEffect(() => {
    if (!supabaseSyncedMembers) {
      const activePubs: PublicMember[] = members
        .filter(m => m.status === 'active')
        .map(m => ({
          id: m.id,
          member_code: m.member_code,
          full_name: m.full_name,
          father_name: m.father_name,
          shares_count: m.shares_count,
          profile_image_url: m.profile_image_url,
          designation: m.designation,
          status: 'active',
        }));
      setPublicMembers(activePubs);
    }
  }, [members, supabaseSyncedMembers]);

  const refreshNotifications = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client || !isAdmin) return;

    try {
      const { data, error: notifErr } = await client
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!notifErr && Array.isArray(data)) {
        setSupabaseNotificationsAvailable(true);
        setNotifications(data as ClubNotification[]);
      }
    } catch {
      // keep local fallback
    }
  }, [isAdmin]);

  // Load from Supabase (handles both Admin full access & Member single-row RLS access)
  const loadSupabaseData = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch public directory view (all 21 active members)
      const { data: pubData, error: pubErr } = await client
        .from('public_members')
        .select('*')
        .order('member_code', { ascending: true });

      const resolvedPubs = (!pubErr && Array.isArray(pubData) && pubData.length > 0)
        ? (pubData as PublicMember[])
        : INITIAL_PUBLIC_MEMBERS;

      if (!pubErr && Array.isArray(pubData) && pubData.length > 0) {
        setPublicMembers(resolvedPubs);
      }

      // 2. Fetch full members table (Admin gets all rows; Member gets their own row via RLS)
      const { data: membersData, error: membersErr } = await client
        .from('members')
        .select('*')
        .order('member_code', { ascending: true });

      if (!membersErr && Array.isArray(membersData) && membersData.length > 0) {
        if (membersData.length > 1 || isAdmin) {
          setMembers(membersData as Member[]);
        } else {
          // Non-admin member: preserve all 21 directory members and overlay their own private DB row
          const ownRow = membersData[0] as Member;
          setMembers(() =>
            resolvedPubs.map(pm => {
              if (pm.id === ownRow.id || pm.member_code === ownRow.member_code) {
                return ownRow;
              }
              const fallback = INITIAL_MEMBERS.find(im => im.id === pm.id || im.member_code === pm.member_code);
              return {
                id: pm.id,
                member_code: pm.member_code,
                full_name: pm.full_name,
                father_name: pm.father_name || fallback?.father_name || null,
                phone: fallback?.phone || null,
                profile_image_url: pm.profile_image_url || fallback?.profile_image_url || null,
                designation: pm.designation || fallback?.designation || 'Member',
                shares_count: pm.shares_count || fallback?.shares_count || 1,
                join_date: fallback?.join_date || '2024-04-01',
                status: 'active',
                monthly_contribution: ((pm.shares_count || fallback?.shares_count || 1) * 500),
              };
            })
          );
        }
        setSupabaseSyncedMembers(true);

        // 3. Fetch monthly dues from Supabase
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

      // 4. Fetch notifications if admin
      if (isAdmin) {
        await refreshNotifications();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSupabaseSyncedMembers(false);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, refreshNotifications]);

  useEffect(() => {
    if (isConfigured) {
      loadSupabaseData();
    } else {
      setIsLoading(false);
    }
  }, [isConfigured, user?.id, loadSupabaseData]);

  // Subscribe to Realtime notifications + 10s poll + focus refresh when Admin is active
  useEffect(() => {
    const client = getSupabaseClient();
    if (!isAdmin || !isConfigured || !client) return;

    const channel = client
      .channel('admin-notifications-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const incoming = payload.new as ClubNotification;
          setSupabaseNotificationsAvailable(true);
          setNotifications(prev => {
            if (prev.some(n => n.id === incoming.id)) return prev;
            return [incoming, ...prev].slice(0, 50);
          });
        }
      )
      .subscribe();

    const timer = setInterval(() => {
      refreshNotifications();
    }, 10000);

    const handleFocus = () => {
      refreshNotifications();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', handleFocus);
      client.removeChannel(channel);
    };
  }, [isAdmin, isConfigured, refreshNotifications]);

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

  // Update member's own phone number & notify admin
  const updateMyContactPhone = async (phone: string) => {
    if (!user || !myMemberRecord) {
      return { success: false, error: 'সদস্য প্রোফাইল পাওয়া যায়নি।' };
    }

    const cleanPhone = phone.trim();
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.rpc('update_my_member_phone', { p_phone: cleanPhone });
      } catch {
        // ignore if RPC not deployed yet
      }
    }

    setMembers(prev =>
      prev.map(m => (m.id === myMemberRecord.id ? { ...m, phone: cleanPhone } : m))
    );

    await logMemberActivity({
      actorUserId: user.id,
      memberId: myMemberRecord.id,
      memberCode: myMemberRecord.member_code,
      memberName: myMemberRecord.full_name,
      eventType: 'profile_updated',
      title: 'মোবাইল নম্বর আপডেট',
      message: `${myMemberRecord.full_name} (${myMemberRecord.member_code}) তার মোবাইল নম্বর আপডেট করেছেন (${cleanPhone})।`,
    });

    return { success: true };
  };

  // Log member activity notification for Admin Dashboard
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

    const newNotif: ClubNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      actor_user_id: resolvedActorId,
      member_id: params.memberId ?? null,
      member_code: params.memberCode ?? null,
      member_name: params.memberName,
      event_type: params.eventType,
      title: params.title,
      message: params.message,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    if (client && resolvedActorId) {
      try {
        // Note: Do NOT chain .select() here because non-admin members insert notifications
        // and PostgREST .select() requires SELECT policy to return inserted rows.
        const { error: insErr } = await client
          .from('notifications')
          .insert([{
            actor_user_id: resolvedActorId,
            member_id: params.memberId ?? null,
            member_code: params.memberCode ?? null,
            member_name: params.memberName,
            event_type: params.eventType,
            title: params.title,
            message: params.message,
            is_read: false,
          }]);

        if (!insErr) {
          setSupabaseNotificationsAvailable(true);
          setNotifications(prev => [newNotif, ...prev].slice(0, 50));
          return;
        }
      } catch {
        // fallback to local notifications
      }
    }

    setNotifications(prev => {
      const next = [newNotif, ...prev].slice(0, 50);
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [user?.id]);

  const markNotificationAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
    const client = getSupabaseClient();
    if (client && supabaseNotificationsAvailable) {
      try {
        await client.from('notifications').update({ is_read: true }).eq('id', id);
      } catch { /* ignore */ }
    }
  };

  const markAllNotificationsAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    const client = getSupabaseClient();
    if (client && supabaseNotificationsAvailable) {
      try {
        await client.from('notifications').update({ is_read: true }).eq('is_read', false);
      } catch { /* ignore */ }
    }
  };

  const clearNotifications = async () => {
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
    () => notifications.filter(n => !n.is_read).length,
    [notifications]
  );

  // My personal monthly dues
  const myDues = useMemo<MonthlyDue[]>(() => {
    if (!myMemberRecord) return [];
    return enrichedDues.filter(d => d.member_id === myMemberRecord.id);
  }, [enrichedDues, myMemberRecord]);

  // My Personal Financial Summary (includes automatic late fee after 12th per share)
  const myFinancialSummary = useMemo<MemberFinancialSummary>(() => {
    const shares = myMemberRecord?.shares_count || 1;
    let totalPrincipalBilled = 0;
    let totalPaid = 0;
    let principalOutstanding = 0;
    let totalFineCharged = 0;
    let totalFinePaid = 0;
    let totalFinePending = 0;
    let totalPaidMonths = 0;
    let unpaidMonthsCount = 0;

    myDues.forEach((d) => {
      const bd = calculateDueBreakdown(d, shares);
      totalPrincipalBilled += bd.principalDue;
      totalPaid += bd.principalPaid;
      principalOutstanding += bd.principalOutstanding;
      totalFineCharged += bd.fineDue;
      totalFinePaid += bd.finePaid;
      totalFinePending += bd.fineOutstanding;

      if (d.status === 'paid' && bd.fineOutstanding === 0) {
        totalPaidMonths += 1;
      } else {
        unpaidMonthsCount += 1;
      }
    });

    const totalBilled = totalPrincipalBilled + totalFineCharged;
    const totalOutstanding = principalOutstanding + totalFinePending;

    const sorted = [...myDues].sort((a, b) => b.year - a.year || b.month - a.month);
    let currentStatus: DueStatus = 'paid';
    if (sorted.length > 0) {
      const latestBd = calculateDueBreakdown(sorted[0], shares);
      if (sorted[0].status === 'paid' && latestBd.fineOutstanding > 0) {
        currentStatus = 'partial';
      } else {
        currentStatus = sorted[0].status;
      }
    }
    const lastPaymentDate = sorted.find(d => d.paid_at)?.paid_at || null;

    return {
      totalBilled,
      totalPaid,
      totalPaidMonths,
      totalOutstanding,
      principalOutstanding,
      totalFineCharged,
      totalFinePaid,
      totalFinePending,
      unpaidMonthsCount,
      currentStatus,
      lastPaymentDate,
      monthlyContribution: myMemberRecord?.monthly_contribution || defaultDueAmount,
    };
  }, [myDues, myMemberRecord, defaultDueAmount]);

  // Admin Dashboard Global Stats
  const stats = useMemo<ClubStats>(() => {
    const active = members.filter(m => m.status === 'active');
    const inactive = members.filter(m => m.status === 'inactive');

    const monthDues = enrichedDues.filter(
      d => d.month === selectedMonth && d.year === selectedYear
    );

    const monthlyTarget = monthDues.reduce((sum, d) => sum + Number(d.amount_due), 0);
    const totalCollected = monthDues.reduce((sum, d) => sum + Number(d.amount_paid), 0);
    const totalOutstanding = Math.max(0, monthlyTarget - totalCollected);

    const paidMembersCount = monthDues.filter(d => d.status === 'paid').length;
    const unpaidMembersCount = monthDues.filter(d => d.status === 'unpaid').length;
    const partialMembersCount = monthDues.filter(d => d.status === 'partial').length;

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
  }, [members, enrichedDues, selectedMonth, selectedYear]);

  // 12-Month Summaries for Selected Fiscal Year
  const monthSummaries = useMemo<MonthSummary[]>(() => {
    const activeCount = members.filter(m => m.status === 'active').length;

    return MONTH_NAMES.map((name, idx) => {
      const monthNum = idx + 1;
      const duesForMonth = enrichedDues.filter(
        d => d.month === monthNum && d.year === selectedYear
      );

      const target = duesForMonth.reduce((acc, d) => acc + Number(d.amount_due), 0);
      const collected = duesForMonth.reduce((acc, d) => acc + Number(d.amount_paid), 0);
      const outstanding = Math.max(0, target - collected);
      const paidCount = duesForMonth.filter(d => d.status === 'paid').length;
      const unpaidCount = duesForMonth.filter(d => d.status === 'unpaid').length;
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
  }, [selectedYear, enrichedDues, members]);

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
        const { data, error: insErr } = await client
          .from('members')
          .insert([{
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
          }])
          .select()
          .single();

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
        const { error: updErr } = await client
          .from('members')
          .update(updates)
          .eq('id', id);

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
      msg.includes('schema cache')
    );
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
    };

    const client = getSupabaseClient();
    if (supabaseSyncedMembers && client) {
      try {
        let { error: updErr } = await client
          .from('monthly_dues')
          .update(extendedUpdates)
          .eq('id', dueId);

        if (updErr && isMissingColumnError(updErr)) {
          const retry = await client
            .from('monthly_dues')
            .update(baseUpdates)
            .eq('id', dueId);
          updErr = retry.error;
        }

        if (updErr) throw updErr;
        setMonthlyDues(prev => prev.map(d => (d.id === dueId ? { ...d, ...extendedUpdates } : d)));
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      }
    }

    setMonthlyDues(prev => prev.map(d => (d.id === dueId ? { ...d, ...extendedUpdates } : d)));
    return { success: true };
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

        const fullPayload = {
          ...basePayload,
          fine_due: fineDueVal,
          fine_paid: finePaidVal,
          fine_paid_at: finePaidAtVal,
          fine_waived: fineWaivedVal,
          notes: params.notes || null,
        };

        let { data, error: upsertErr } = await client
          .from('monthly_dues')
          .upsert(fullPayload, { onConflict: 'member_id,month,year' })
          .select()
          .single();

        if (upsertErr && isMissingColumnError(upsertErr)) {
          const retryCols = await client
            .from('monthly_dues')
            .upsert(basePayload, { onConflict: 'member_id,month,year' })
            .select()
            .single();
          data = retryCols.data;
          upsertErr = retryCols.error;
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

        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      }
    }

    const existingIdx = monthlyDues.findIndex(
      d => d.member_id === params.memberId && d.month === params.month && d.year === params.year
    );

    if (existingIdx >= 0) {
      setMonthlyDues(prev => {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          amount_due: calculatedDue,
          amount_paid: finalPaid,
          fine_due: fineDueVal,
          fine_paid: finePaidVal,
          fine_paid_at: finePaidAtVal,
          fine_waived: fineWaivedVal,
          notes: params.notes || next[existingIdx].notes || null,
          status,
          paid_at: finalPaidAt,
          updated_at: new Date().toISOString(),
        };
        return next;
      });
    } else {
      const newDue: MonthlyDue = {
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
        status,
        paid_at: finalPaidAt,
        recorded_by: user?.id || 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setMonthlyDues(prev => [newDue, ...prev]);
    }
    return { success: true };
  };

  const updateDueRecord = async (
    dueId: string,
    updates: {
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

    const client = getSupabaseClient();
    if (supabaseSyncedMembers && client) {
      try {
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

    setMonthlyDues(prev => prev.map(d => (d.id === dueId ? { ...d, ...fullPayload } : d)));
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

  const waiveMemberFine = async (dueId: string) => {
    const target = monthlyDues.find(d => d.id === dueId);
    if (!target) return { success: false, error: 'Record not found.' };
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

  const resetDemoData = () => {
    localStorage.removeItem(MEMBERS_STORAGE_KEY);
    localStorage.removeItem(DUES_STORAGE_KEY);
    setMembers(INITIAL_MEMBERS);
    setMonthlyDues(INITIAL_MONTHLY_DUES);
    setPublicMembers(INITIAL_PUBLIC_MEMBERS);
  };

  const value = useMemo(
    () => ({
      publicMembers,
      members,
      myMemberRecord,
      myDues,
      myFinancialSummary,
      monthlyDues: enrichedDues,
      notifications,
      unreadNotificationCount,
      isLiveSupabaseSynced: supabaseSyncedMembers,
      isLoading,
      error,
      selectedYear,
      selectedMonth,
      defaultDueAmount,
      stats,
      monthSummaries,
      setSelectedYear,
      setSelectedMonth,
      setDefaultDueAmount,
      refreshData: loadSupabaseData,
      refreshNotifications,
      linkMyMemberAccount,
      updateMyContactPhone,
      logMemberActivity,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      clearNotifications,
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
      resetDemoData,
    }),
    [
      publicMembers,
      members,
      myMemberRecord,
      myDues,
      myFinancialSummary,
      enrichedDues,
      notifications,
      unreadNotificationCount,
      supabaseSyncedMembers,
      isLoading,
      error,
      selectedYear,
      selectedMonth,
      defaultDueAmount,
      stats,
      monthSummaries,
      loadSupabaseData,
      refreshNotifications,
      logMemberActivity,
      isAdmin,
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
