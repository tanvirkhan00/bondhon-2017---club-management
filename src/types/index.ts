export type UserRole = 'admin' | 'viewer' | 'member';

export function isPresidentDesignation(designation?: string | null): boolean {
  const d = (designation || '').toLowerCase();
  return (
    (d.includes('president') && !d.includes('vice')) ||
    (d.includes('সভাপতি') && !d.includes('সহ'))
  );
}

export function isPresidentIdentity(
  member?: { member_code?: string | null; designation?: string | null } | null
): boolean {
  if (!member) return false;
  const code = (member.member_code || '').trim().toUpperCase();
  return code === 'BND-005' || isPresidentDesignation(member.designation);
}

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
  date_of_birth?: string | null; // STRICTLY PRIVATE (Own profile + Admin only)
  blood_group?: string | null; // Public to authenticated members
  status: MemberStatus;
  email?: string | null;
  auth_user_id?: string | null;
  monthly_contribution: number; // shares_count * 500
  created_at?: string;
  updated_at?: string;
}

// Public Member Directory interface - Strict Privacy
// Never exposes father_name, shares/fee, DOB, phone, join_date, or private balance
export interface PublicMember {
  id: string;
  member_code: string;
  full_name: string;
  profile_image_url?: string | null;
  designation?: string | null;
  blood_group?: string | null;
  status: 'active';
}

// Authenticated Club Member Directory (exposes blood_group & birthday month/day ONLY — NEVER birth year/DOB/father/fee)
export interface AuthenticatedMemberDirectoryItem {
  id: string;
  member_code: string;
  full_name: string;
  profile_image_url?: string | null;
  designation?: string | null;
  status: 'active' | 'inactive';
  blood_group?: string | null;
  birth_month?: number | null;
  birth_day?: number | null;
}

// Safe Upcoming Birthday Highlight (NEVER contains date_of_birth or birth year)
export interface BirthdayHighlight {
  id: string;
  member_code: string;
  full_name: string;
  profile_image_url?: string | null;
  designation?: string | null;
  birth_month: number; // 1 - 12
  birth_day: number; // 1 - 31
  days_until: number; // 0 = today, 1 = tomorrow, 2 = day after
  target_year?: number;
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
  receipt_number?: string | null;
  payment_method?: string | null;
  recorded_by_name?: string | null;
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

export type AnnouncementCategory = 'general' | 'finance' | 'event' | 'urgent';

export interface ClubAnnouncement {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  created_by?: string | null;
  author_name: string;
  created_at: string;
  updated_at?: string;
}

export type NotificationAudience = 'admin' | 'member' | 'all_members';

export type NotificationEventType =
  | 'member_login'
  | 'member_logout'
  | 'password_changed'
  | 'profile_updated'
  | 'payment_notice'
  | 'payment_recorded'
  | 'announcement'
  | 'birthday_reminder';

export interface ClubNotification {
  id: string;
  actor_user_id?: string | null;
  member_id?: string | null;
  target_member_id?: string | null;
  announcement_id?: string | null;
  member_code?: string | null;
  member_name: string;
  audience?: NotificationAudience;
  event_type: NotificationEventType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  dedup_key?: string | null;
  is_read: boolean;
  created_at: string;
}

export type BankEntryType = 'deposit' | 'interest' | 'charge' | 'withdrawal';

export interface BankDeposit {
  id: string;
  bank_name: string;
  branch_name: string;
  account_number: string;
  account_name: string;
  entry_type?: BankEntryType;
  amount: number;
  deposited_at: string;
  reference_no?: string | null;
  notes?: string | null;
  recorded_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type ExpenseCategory =
  | 'bank_charge'
  | 'account_opening'
  | 'operational'
  | 'event'
  | 'welfare'
  | 'other';

export type ExpensePaymentSource = 'cash' | 'bank';

export interface ClubExpense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  expense_date: string;
  payment_source: ExpensePaymentSource;
  reference_no?: string | null;
  notes?: string | null;
  recorded_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TopFineContributor {
  member_id: string;
  member_code: string;
  full_name: string;
  profile_image_url?: string | null;
  designation?: string | null;
  total_fine_paid: number;
  fined_months: number;
}

export interface PublicClubHighlights {
  totalPrincipalCollected: number;
  totalFineCollected: number;
  totalCollected: number;
  totalActiveShares?: number;
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
  topFineContributors: TopFineContributor[];
  updatedAt?: string;
}
