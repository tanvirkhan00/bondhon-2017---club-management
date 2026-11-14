export type UserRole = 'admin' | 'member';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type MemberStatus = 'active' | 'inactive';

export interface Member {
  id: string;
  member_code: string;
  full_name: string;
  father_name?: string | null;
  phone?: string | null;
  profile_image_url?: string | null;
  designation?: string | null;
  shares_count: number; // 1, 2, or 3 shares (names)
  join_date: string;
  status: MemberStatus;
  email?: string | null;
  auth_user_id?: string | null;
  monthly_contribution: number; // shares_count * 500
  created_at?: string;
  updated_at?: string;
}

// Public Member Directory interface - Strict Privacy (No phone, join_date, private balance)
export interface PublicMember {
  id: string;
  member_code: string;
  full_name: string;
  father_name?: string | null;
  profile_image_url?: string | null;
  designation?: string | null;
  shares_count?: number;
  status: 'active';
}

export type DueStatus = 'paid' | 'unpaid' | 'partial';

export interface MonthlyDue {
  id: string;
  member_id: string;
  month: number; // 1 - 12
  year: number;  // 2017+
  amount_due: number;
  amount_paid: number;
  fine_due?: number;
  fine_paid?: number;
  fine_paid_at?: string | null;
  fine_waived?: boolean;
  notes?: string | null;
  status: DueStatus;
  paid_at?: string | null;
  recorded_by?: string | null;
  created_at?: string;
  updated_at?: string;
  member?: Member;
}

export interface ClubStats {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  monthlyTarget: number;
  totalCollected: number;
  totalOutstanding: number;
  paidMembersCount: number;
  unpaidMembersCount: number;
  partialMembersCount: number;
  collectionRate: number; // percentage
}

export interface MemberFinancialSummary {
  totalBilled: number;
  totalPaid: number;
  totalPaidMonths: number;
  totalOutstanding: number;
  principalOutstanding: number;
  totalFineCharged: number;
  totalFinePaid: number;
  totalFinePending: number;
  unpaidMonthsCount: number;
  currentStatus: DueStatus;
  lastPaymentDate?: string | null;
  monthlyContribution: number;
}

export interface MonthSummary {
  month: number;
  year: number;
  monthKey: string; // '2026-11'
  label: string;    // 'November 2026'
  shortLabel: string; // 'Nov'
  target: number;
  collected: number;
  outstanding: number;
  paidCount: number;
  unpaidCount: number;
  totalActive: number;
  collectionRate: number;
}

export type NotificationEventType =
  | 'member_login'
  | 'member_logout'
  | 'password_changed'
  | 'profile_updated'
  | 'payment_notice';

export interface ClubNotification {
  id: string;
  actor_user_id?: string | null;
  member_id?: string | null;
  member_code?: string | null;
  member_name: string;
  event_type: NotificationEventType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

