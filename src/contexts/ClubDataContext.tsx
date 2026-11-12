import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  Member,
  PublicMember,
  MonthlyDue,
  ClubStats,
  MonthSummary,
  MemberFinancialSummary,
  DueStatus,
} from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabase/client';
import {
  INITIAL_MEMBERS,
  INITIAL_PUBLIC_MEMBERS,
  INITIAL_MONTHLY_DUES,
} from '../lib/mockData';
import { useAuth } from './AuthContext';
import { MONTH_NAMES, SHORT_MONTH_NAMES } from '../utils/formatters';

interface ClubDataContextType {
  publicMembers: PublicMember[];
  members: Member[];
  myMemberRecord: Member | null;
  myDues: MonthlyDue[];
  myFinancialSummary: MemberFinancialSummary;
  monthlyDues: MonthlyDue[];
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

  // Admin member operations
  addMember: (memberData: Omit<Member, 'id' | 'created_at' | 'updated_at'>) => Promise<{ success: boolean; error?: string }>;
  updateMember: (id: string, updates: Partial<Member>) => Promise<{ success: boolean; error?: string }>;
  toggleMemberStatus: (id: string) => Promise<{ success: boolean; error?: string }>;
  deleteMember: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Admin payment operations
  generateMonthlyDues: (month: number, year: number) => Promise<{ success: boolean; createdCount?: number; existingCount?: number; error?: string }>;
  markAsPaid: (dueId: string, amountPaid?: number, paidAt?: string) => Promise<{ success: boolean; error?: string }>;
  updateDueRecord: (dueId: string, updates: { amount_paid: number; amount_due?: number; paid_at?: string | null }) => Promise<{ success: boolean; error?: string }>;
  deleteDueRecord: (dueId: string) => Promise<{ success: boolean; error?: string }>;

  resetDemoData: () => void;
}

const ClubDataContext = createContext<ClubDataContextType | undefined>(undefined);

export const ClubDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, user, profile } = useAuth();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1; // 1-12

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthNum);
  const [defaultDueAmount, setDefaultDueAmount] = useState<number>(() => {
    const saved = localStorage.getItem('bondhon_default_due_amount');
    return saved ? Number(saved) : 1000;
  });

  const [members, setMembers] = useState<Member[]>(() => {
    const saved = localStorage.getItem('bondhon_local_members');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_MEMBERS;
  });

  const [monthlyDues, setMonthlyDues] = useState<MonthlyDue[]>(() => {
    const saved = localStorage.getItem('bondhon_local_dues');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((item: any, idx: number) => {
            let yr = Number(item.year);
            let mo = Number(item.month);
            if (isNaN(yr) || !yr) {
              if (typeof item.month === 'string' && item.month.includes('-')) {
                const parts = item.month.split('-');
                yr = parseInt(parts[0], 10);
                mo = parseInt(parts[1], 10);
              } else {
                yr = 2026;
              }
            }
            if (isNaN(mo) || !mo) mo = 11;
            return {
              ...item,
              id: item.id || `due-local-${idx}`,
              year: yr,
              month: mo,
            };
          });
        }
      } catch { /* ignore */ }
    }
    return INITIAL_MONTHLY_DUES;
  });

  const [publicMembers, setPublicMembers] = useState<PublicMember[]>(() => {
    return INITIAL_PUBLIC_MEMBERS;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = isSupabaseConfigured();

  // Persist local state for smooth testing without requiring Supabase keys immediately
  useEffect(() => {
    if (!isConfigured) {
      localStorage.setItem('bondhon_local_members', JSON.stringify(members));
    }
  }, [members, isConfigured]);

  useEffect(() => {
    if (!isConfigured) {
      localStorage.setItem('bondhon_local_dues', JSON.stringify(monthlyDues));
    }
  }, [monthlyDues, isConfigured]);

  useEffect(() => {
    localStorage.setItem('bondhon_default_due_amount', String(defaultDueAmount));
  }, [defaultDueAmount]);

  // Load from Supabase
  const loadSupabaseData = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch public directory view
      const { data: pubData, error: pubErr } = await client
        .from('public_members')
        .select('*')
        .order('member_code', { ascending: true });

      if (!pubErr && pubData) {
        setPublicMembers(pubData as PublicMember[]);
      }

      // 2. Fetch full members table (permitted if Admin or authenticated)
      const { data: membersData, error: membersErr } = await client
        .from('members')
        .select('*')
        .order('member_code', { ascending: true });

      if (!membersErr && membersData) {
        setMembers(membersData as Member[]);
      }

      // 3. Fetch monthly dues
      const { data: duesData, error: duesErr } = await client
        .from('monthly_dues')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (!duesErr && duesData) {
        setMonthlyDues(duesData as MonthlyDue[]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('Supabase data query note:', msg);
      setError(`Supabase: ${msg}. Showing cached data.`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isConfigured) {
      loadSupabaseData();
    } else {
      setIsLoading(false);
    }
  }, [isConfigured, loadSupabaseData]);

  // Combine dues with member details for convenience
  const enrichedDues = useMemo(() => {
    const memberMap = new Map<string, Member>();
    members.forEach(m => memberMap.set(m.id, m));

    return monthlyDues.map(due => ({
      ...due,
      member: memberMap.get(due.member_id),
    }));
  }, [members, monthlyDues]);

  // Update public members if in demo mode
  useEffect(() => {
    if (!isConfigured) {
      const activePubs: PublicMember[] = members
        .filter(m => m.status === 'active')
        .map(m => ({
          id: m.id,
          member_code: m.member_code,
          full_name: m.full_name,
          profile_image_url: m.profile_image_url,
          designation: m.designation,
          status: 'active',
        }));
      setPublicMembers(activePubs);
    }
  }, [members, isConfigured]);

  // Active Member Private Record (for Member Portal)
  const myMemberRecord = useMemo<Member | null>(() => {
    if (!profile) return null;
    // Match by auth_user_id or by email/name fallback in demo mode
    const matched = members.find(
      m => (user && m.auth_user_id === user.id) ||
           (profile && m.auth_user_id === profile.id) ||
           (profile && m.full_name.toLowerCase().includes(profile.full_name.toLowerCase().split(' ')[0]))
    );
    return matched || members[1] || members[0]; // fallback to Rana or Tanvir in demo mode
  }, [members, user, profile]);

  // My personal monthly dues
  const myDues = useMemo<MonthlyDue[]>(() => {
    if (!myMemberRecord) return [];
    return enrichedDues.filter(d => d.member_id === myMemberRecord.id);
  }, [enrichedDues, myMemberRecord]);

  // My Personal Financial Summary
  const myFinancialSummary = useMemo<MemberFinancialSummary>(() => {
    const totalBilled = myDues.reduce((sum, d) => sum + Number(d.amount_due), 0);
    const totalPaid = myDues.reduce((sum, d) => sum + Number(d.amount_paid), 0);
    const totalPaidMonths = myDues.filter(d => d.status === 'paid').length;
    const unpaidMonthsCount = myDues.filter(d => d.status === 'unpaid' || d.status === 'partial').length;
    const totalOutstanding = Math.max(0, totalBilled - totalPaid);

    // Latest month status
    const sorted = [...myDues].sort((a, b) => b.year - a.year || b.month - a.month);
    const currentStatus: DueStatus = sorted.length > 0 ? sorted[0].status : 'paid';
    const lastPaymentDate = sorted.find(d => d.paid_at)?.paid_at || null;

    return {
      totalBilled,
      totalPaid,
      totalPaidMonths,
      totalOutstanding,
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
    if (isConfigured && client) {
      try {
        const { data, error } = await client
          .from('members')
          .insert([{
            member_code: memberData.member_code.trim().toUpperCase(),
            full_name: memberData.full_name.trim(),
            phone: memberData.phone?.trim() || null,
            designation: memberData.designation || 'Member',
            profile_image_url: memberData.profile_image_url || null,
            join_date: memberData.join_date,
            status: memberData.status,
            auth_user_id: memberData.auth_user_id || null,
            monthly_contribution: memberData.monthly_contribution || defaultDueAmount,
          }])
          .select()
          .single();

        if (error) throw error;
        setMembers(prev => [...prev, data as Member]);
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      }
    } else {
      const newMember: Member = {
        ...memberData,
        id: `m-${Date.now()}`,
        member_code: memberData.member_code.trim().toUpperCase(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setMembers(prev => [...prev, newMember]);
      return { success: true };
    }
  };

  const updateMember = async (id: string, updates: Partial<Member>) => {
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Only Admins can edit members.' };
    }

    const client = getSupabaseClient();
    if (isConfigured && client) {
      try {
        const { error } = await client
          .from('members')
          .update(updates)
          .eq('id', id);

        if (error) throw error;
        setMembers(prev => prev.map(m => (m.id === id ? { ...m, ...updates, updated_at: new Date().toISOString() } : m)));
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      }
    } else {
      setMembers(prev => prev.map(m => (m.id === id ? { ...m, ...updates, updated_at: new Date().toISOString() } : m)));
      return { success: true };
    }
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
    if (isConfigured && client) {
      try {
        const { error } = await client.from('members').delete().eq('id', id);
        if (error) throw error;
        setMembers(prev => prev.filter(m => m.id !== id));
        setMonthlyDues(prev => prev.filter(d => d.member_id !== id));
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      }
    } else {
      setMembers(prev => prev.filter(m => m.id !== id));
      setMonthlyDues(prev => prev.filter(d => d.member_id !== id));
      return { success: true };
    }
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

    // Check which active members already have dues for this month and year
    const existing = monthlyDues.filter(d => d.month === month && d.year === year);
    const existingIds = new Set(existing.map(d => d.member_id));
    const membersNeedingDues = activeMembers.filter(m => !existingIds.has(m.id));

    if (membersNeedingDues.length === 0) {
      return {
        success: false,
        createdCount: 0,
        existingCount: existing.length,
        error: `Monthly dues for ${MONTH_NAMES[month - 1]} ${year} already exist for all ${activeMembers.length} active members. Zero duplicate records generated.`,
      };
    }

    const client = getSupabaseClient();
    if (isConfigured && client) {
      try {
        // Use RPC function if present, or direct batch insert
        const newRecords = membersNeedingDues.map(m => ({
          member_id: m.id,
          month,
          year,
          amount_due: m.monthly_contribution || defaultDueAmount,
          amount_paid: 0,
          status: 'unpaid' as const,
          recorded_by: user?.id || null,
        }));

        const { data, error } = await client
          .from('monthly_dues')
          .insert(newRecords)
          .select();

        if (error) throw error;

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
    } else {
      const formatted: MonthlyDue[] = membersNeedingDues.map((m, i) => ({
        id: `due-${year}-${month}-${m.id}-${i}`,
        member_id: m.id,
        month,
        year,
        amount_due: m.monthly_contribution || defaultDueAmount,
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
    }
  };

  const markAsPaid = async (dueId: string, amountPaid?: number, paidAt?: string) => {
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

    const updates = {
      amount_paid: finalPaid,
      status: finalStatus,
      paid_at: finalPaid > 0 ? finalPaidAt : null,
      recorded_by: user?.id || null,
      updated_at: new Date().toISOString(),
    };

    const client = getSupabaseClient();
    if (isConfigured && client) {
      try {
        const { error } = await client
          .from('monthly_dues')
          .update(updates)
          .eq('id', dueId);

        if (error) throw error;
        setMonthlyDues(prev => prev.map(d => (d.id === dueId ? { ...d, ...updates } : d)));
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      }
    } else {
      setMonthlyDues(prev => prev.map(d => (d.id === dueId ? { ...d, ...updates } : d)));
      return { success: true };
    }
  };

  const updateDueRecord = async (
    dueId: string,
    updates: { amount_paid: number; amount_due?: number; paid_at?: string | null }
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

    const finalPayload = {
      amount_due: dueAmount,
      amount_paid: paidAmount,
      status,
      paid_at: updates.paid_at !== undefined ? updates.paid_at : (paidAmount > 0 ? (target.paid_at || new Date().toISOString()) : null),
      recorded_by: user?.id || null,
      updated_at: new Date().toISOString(),
    };

    const client = getSupabaseClient();
    if (isConfigured && client) {
      try {
        const { error } = await client
          .from('monthly_dues')
          .update(finalPayload)
          .eq('id', dueId);

        if (error) throw error;
        setMonthlyDues(prev => prev.map(d => (d.id === dueId ? { ...d, ...finalPayload } : d)));
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      }
    } else {
      setMonthlyDues(prev => prev.map(d => (d.id === dueId ? { ...d, ...finalPayload } : d)));
      return { success: true };
    }
  };

  const deleteDueRecord = async (dueId: string) => {
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized: Only Admins can delete financial records.' };
    }

    const client = getSupabaseClient();
    if (isConfigured && client) {
      try {
        const { error } = await client.from('monthly_dues').delete().eq('id', dueId);
        if (error) throw error;
        setMonthlyDues(prev => prev.filter(d => d.id !== dueId));
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      }
    } else {
      setMonthlyDues(prev => prev.filter(d => d.id !== dueId));
      return { success: true };
    }
  };

  const resetDemoData = () => {
    localStorage.removeItem('bondhon_local_members');
    localStorage.removeItem('bondhon_local_dues');
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
      addMember,
      updateMember,
      toggleMemberStatus,
      deleteMember,
      generateMonthlyDues,
      markAsPaid,
      updateDueRecord,
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
      isLoading,
      error,
      selectedYear,
      selectedMonth,
      defaultDueAmount,
      stats,
      monthSummaries,
      loadSupabaseData,
      isAdmin,
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
