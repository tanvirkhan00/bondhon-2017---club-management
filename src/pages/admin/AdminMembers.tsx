import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useClubData } from '../../hooks/useClubData';
import { useAuth } from '../../hooks/useAuth';
import { Member, MemberStatus } from '../../types';
import { formatBDT, formatDate } from '../../utils/formatters';
import { computeMemberFinancialSummary } from '../../utils/fineCalculator';
import { downloadClubTablePdf } from '../../utils/reportPdfGenerator';
import { StatusBadge } from '../../components/StatusBadge';
import { MetricCard } from '../../components/MetricCard';
import { Modal } from '../../components/ui/Modal';
import { PageTransition } from '../../components/ui/MotionPrimitives';
import { uploadMemberAvatar } from '../../services/supabase/storage';
import { BLOOD_GROUPS } from '../../utils/birthdayUtils';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Upload,
  Image as ImageIcon,
  UserPlus,
  Droplets,
  Lock,
  Download,
  Banknote,
  AlertCircle,
  Layers,
  ArrowUpDown,
} from 'lucide-react';

type BalanceFilter = 'all' | 'due' | 'settled';
type SortOption = 'code' | 'paid_desc' | 'due_desc' | 'shares_desc';

export const AdminMembers: React.FC = () => {
  const { canEditAdmin } = useAuth();
  const { members, addMember, updateMember, toggleMemberStatus, deleteMember, monthlyDues, defaultDueAmount } =
    useClubData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('code');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [memberCode, setMemberCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [sharesCount, setSharesCount] = useState<number>(1);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('Member');
  const [joinDate, setJoinDate] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState<number>(defaultDueAmount);
  const [status, setStatus] = useState<MemberStatus>('active');
  const [authUserId, setAuthUserId] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeCount = members.filter((m) => m.status === 'active').length;
  const inactiveCount = members.filter((m) => m.status === 'inactive').length;

  // Real-time financial summary for each member
  const memberPaymentSummaries = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeMemberFinancialSummary>>();
    const now = new Date();
    members.forEach((m) => {
      const mDues = monthlyDues.filter((d) => d.member_id === m.id);
      map.set(m.id, computeMemberFinancialSummary(m, mDues, now));
    });
    return map;
  }, [members, monthlyDues]);

  // Directory-wide aggregates
  const directoryTotals = useMemo(() => {
    let totalShares = 0;
    let totalMonthlyTarget = 0;
    let totalCollectedAll = 0;
    let totalDueAll = 0;
    let dueMemberCount = 0;

    members.forEach((m) => {
      const shares = m.shares_count || 1;
      const monthlyFee = m.monthly_contribution || shares * defaultDueAmount;
      if (m.status === 'active') {
        totalShares += shares;
        totalMonthlyTarget += monthlyFee;
      }
      const summary = memberPaymentSummaries.get(m.id);
      const paid = summary?.totalPaid || 0;
      const due = summary?.totalOutstanding || 0;
      totalCollectedAll += paid;
      totalDueAll += due;
      if (due > 0) dueMemberCount += 1;
    });

    return {
      totalShares,
      totalMonthlyTarget,
      totalCollectedAll,
      totalDueAll,
      dueMemberCount,
    };
  }, [members, memberPaymentSummaries, defaultDueAmount]);

  // Filtered and sorted members list
  const filteredMembers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    const list = members.filter((m) => {
      const matchSearch =
        !q ||
        m.full_name.toLowerCase().includes(q) ||
        (m.father_name && m.father_name.toLowerCase().includes(q)) ||
        m.member_code.toLowerCase().includes(q) ||
        (m.phone && m.phone.includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.designation && m.designation.toLowerCase().includes(q)) ||
        (m.blood_group && m.blood_group.toLowerCase().includes(q));

      const matchStatus = statusFilter === 'all' || m.status === statusFilter;

      const summary = memberPaymentSummaries.get(m.id);
      const dueAmount = summary?.totalOutstanding || 0;
      const matchBalance =
        balanceFilter === 'all' ||
        (balanceFilter === 'due' && dueAmount > 0) ||
        (balanceFilter === 'settled' && dueAmount <= 0);

      return matchSearch && matchStatus && matchBalance;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'paid_desc') {
        const aPaid = memberPaymentSummaries.get(a.id)?.totalPaid || 0;
        const bPaid = memberPaymentSummaries.get(b.id)?.totalPaid || 0;
        return bPaid - aPaid || a.member_code.localeCompare(b.member_code);
      }
      if (sortBy === 'due_desc') {
        const aDue = memberPaymentSummaries.get(a.id)?.totalOutstanding || 0;
        const bDue = memberPaymentSummaries.get(b.id)?.totalOutstanding || 0;
        return bDue - aDue || a.member_code.localeCompare(b.member_code);
      }
      if (sortBy === 'shares_desc') {
        return (b.shares_count || 1) - (a.shares_count || 1) || a.member_code.localeCompare(b.member_code);
      }
      return a.member_code.localeCompare(b.member_code);
    });
  }, [members, searchQuery, statusFilter, balanceFilter, sortBy, memberPaymentSummaries]);

  const filteredTotals = useMemo(() => {
    return filteredMembers.reduce(
      (acc, m) => {
        const summary = memberPaymentSummaries.get(m.id);
        const monthly = m.monthly_contribution || (m.shares_count || 1) * defaultDueAmount;
        return {
          monthly: acc.monthly + monthly,
          paid: acc.paid + (summary?.totalPaid || 0),
          due: acc.due + (summary?.totalOutstanding || 0),
        };
      },
      { monthly: 0, paid: 0, due: 0 }
    );
  }, [filteredMembers, memberPaymentSummaries, defaultDueAmount]);

  const handleExportPdf = () => {
    downloadClubTablePdf({
      filename: `Bondhon_2017_Member_Roster_${new Date().toISOString().substring(0, 10)}.pdf`,
      title: 'Bondhon 2017 Member Directory & Ledger Summary',
      subtitle: `Registered Shareholders (${filteredMembers.length} members)`,
      orientation: 'landscape',
      kpis: [
        { label: 'Members Listed', value: String(filteredMembers.length) },
        { label: 'Active Shares', value: String(directoryTotals.totalShares) },
        { label: 'Total Paid', value: `BDT ${Math.round(filteredTotals.paid).toLocaleString('en-US')}` },
        { label: 'Total Due', value: `BDT ${Math.round(filteredTotals.due).toLocaleString('en-US')}` },
      ],
      columns: [
        { header: 'Code', weight: 0.85, align: 'left', mono: true },
        { header: 'Member Name', weight: 1.6, align: 'left' },
        { header: 'Designation', weight: 1.4, align: 'left' },
        { header: 'Phone', weight: 1.1, align: 'left', mono: true },
        { header: 'Blood', weight: 0.6, align: 'center', mono: true },
        { header: 'Monthly', weight: 0.9, align: 'right', mono: true },
        { header: 'Total Paid', weight: 1.0, align: 'right', mono: true },
        { header: 'Balance Due', weight: 1.0, align: 'right', mono: true },
        { header: 'Status', weight: 0.75, align: 'center' },
      ],
      rows: filteredMembers.map((m) => {
        const s = memberPaymentSummaries.get(m.id);
        const monthly = m.monthly_contribution || (m.shares_count || 1) * defaultDueAmount;
        const due = s?.totalOutstanding || 0;
        return [
          m.member_code,
          m.full_name,
          m.designation || 'Member',
          m.phone || '-',
          m.blood_group || '-',
          `BDT ${Math.round(monthly).toLocaleString('en-US')}`,
          `BDT ${Math.round(s?.totalPaid || 0).toLocaleString('en-US')}`,
          due > 0 ? `BDT ${Math.round(due).toLocaleString('en-US')}` : 'Settled',
          m.status.toUpperCase(),
        ];
      }),
    });
  };

  const handleOpenAdd = () => {
    setEditingMember(null);
    const nextNum = members.length + 1;
    setMemberCode(`BND-${String(nextNum).padStart(3, '0')}`);
    setFullName('');
    setFatherName('');
    setSharesCount(1);
    setPhone('+880 ');
    setEmail('');
    setDesignation('Member');
    setJoinDate(new Date().toISOString().substring(0, 10));
    setDateOfBirth('');
    setBloodGroup('');
    setMonthlyContribution(defaultDueAmount);
    setStatus('active');
    setAuthUserId('');
    setAvatarUrl('');
    setAvatarFile(null);
    setAvatarPreview('');
    setErrorMessage(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (m: Member) => {
    setEditingMember(m);
    setMemberCode(m.member_code);
    setFullName(m.full_name);
    setFatherName(m.father_name || '');
    setSharesCount(m.shares_count || 1);
    setPhone(m.phone || '');
    setEmail(m.email || '');
    setDesignation(m.designation || 'Member');
    setJoinDate(m.join_date);
    setDateOfBirth(m.date_of_birth || '');
    setBloodGroup(m.blood_group || '');
    setMonthlyContribution(m.monthly_contribution || (m.shares_count || 1) * defaultDueAmount);
    setStatus(m.status);
    setAuthUserId(m.auth_user_id || '');
    setAvatarUrl(m.profile_image_url || '');
    setAvatarFile(null);
    setAvatarPreview(m.profile_image_url || '');
    setErrorMessage(null);
    setModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    let finalImageUrl = avatarUrl;

    if (avatarFile) {
      const uploadRes = await uploadMemberAvatar(memberCode, avatarFile);
      if (uploadRes.success && uploadRes.url) {
        finalImageUrl = uploadRes.url;
      } else if (uploadRes.error) {
        setErrorMessage(uploadRes.error);
        setLoading(false);
        return;
      }
    }

    if (editingMember) {
      const res = await updateMember(editingMember.id, {
        member_code: memberCode.trim().toUpperCase(),
        full_name: fullName.trim(),
        father_name: fatherName.trim() || null,
        shares_count: Number(sharesCount) || 1,
        phone: phone.trim() || null,
        email: email.trim() || null,
        designation: designation.trim() || 'Member',
        join_date: joinDate,
        date_of_birth: dateOfBirth || null,
        blood_group: bloodGroup || null,
        monthly_contribution: Number(monthlyContribution),
        status,
        auth_user_id: authUserId.trim() || null,
        profile_image_url: finalImageUrl || null,
      });

      setLoading(false);
      if (res.success) {
        setModalOpen(false);
      } else {
        setErrorMessage(res.error || 'Failed to update member.');
      }
    } else {
      const res = await addMember({
        member_code: memberCode.trim().toUpperCase(),
        full_name: fullName.trim(),
        father_name: fatherName.trim() || null,
        shares_count: Number(sharesCount) || 1,
        phone: phone.trim() || null,
        email: email.trim() || null,
        designation: designation.trim() || 'Member',
        join_date: joinDate,
        date_of_birth: dateOfBirth || null,
        blood_group: bloodGroup || null,
        monthly_contribution: Number(monthlyContribution),
        status,
        auth_user_id: authUserId.trim() || null,
        profile_image_url: finalImageUrl || null,
      });

      setLoading(false);
      if (res.success) {
        setModalOpen(false);
      } else {
        setErrorMessage(res.error || 'Failed to add member.');
      }
    }
  };

  return (
    <PageTransition className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DFE6F0] dark:border-[#233452]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F1B2E] dark:text-slate-100 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[#1D4ED8] dark:text-[#60A5FA]" />
            <span>Member Directory</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#4E5E78] dark:text-slate-400 mt-0.5">
            Shareholder registry, contact details, and member account standing
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0F1B2E] dark:text-slate-200 bg-white dark:bg-[#111B2E] border border-[#DFE6F0] dark:border-[#233452] hover:bg-[#EFF3F9] dark:hover:bg-[#17243C] rounded-xl transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Roster PDF</span>
          </button>

          {canEditAdmin && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-xl shadow-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Directory Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Registered Members"
          value={members.length}
          subLabel={`${activeCount} active · ${inactiveCount} inactive`}
          icon={Users}
          accent="navy"
        />
        <MetricCard
          label="Share Allocations"
          value={`${directoryTotals.totalShares} Shares`}
          subLabel={`${formatBDT(directoryTotals.totalMonthlyTarget)} monthly target`}
          icon={Layers}
          accent="gold"
        />
        <MetricCard
          label="Lifetime Collected"
          value={formatBDT(directoryTotals.totalCollectedAll)}
          subLabel="Settled contributions & fines"
          icon={Banknote}
          accent="sapphire"
        />
        <MetricCard
          label="Outstanding Balance"
          value={formatBDT(directoryTotals.totalDueAll)}
          subLabel={`${directoryTotals.dueMemberCount} members with dues`}
          icon={AlertCircle}
          accent="rose"
        />
      </div>

      {/* Unified Search, Filter & Sort Toolbar */}
      <div className="surface-card p-3.5 rounded-2xl space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="relative flex-1 lg:max-w-md">
            <Search className="w-4 h-4 text-[#4E5E78] absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search name, code (BND-001), phone, email or blood group..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-xs sm:text-sm bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8] text-[#0F1B2E] dark:text-slate-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Segmented Filter */}
            <div className="flex items-center gap-1 p-1 bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl max-w-full overflow-x-auto">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  statusFilter === 'all'
                    ? 'bg-[#0F1B33] dark:bg-[#1D4ED8] text-white font-semibold'
                    : 'text-[#4E5E78] hover:text-[#0F1B2E] dark:hover:text-slate-100'
                }`}
              >
                All ({members.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  statusFilter === 'active'
                    ? 'bg-[#1D4ED8] text-white font-semibold'
                    : 'text-[#4E5E78] hover:text-[#0F1B2E] dark:hover:text-slate-100'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('inactive')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  statusFilter === 'inactive'
                    ? 'bg-[#4E5E78] text-white font-semibold'
                    : 'text-[#4E5E78] hover:text-[#0F1B2E] dark:hover:text-slate-100'
                }`}
              >
                Inactive ({inactiveCount})
              </button>
            </div>

            {/* Balance Standing Filter */}
            <select
              value={balanceFilter}
              onChange={(e) => setBalanceFilter(e.target.value as BalanceFilter)}
              aria-label="Filter by payment standing"
              className="px-3 py-2 text-xs font-medium bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden cursor-pointer"
            >
              <option value="all" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">
                All Balances
              </option>
              <option value="due" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">
                Due Balance Only
              </option>
              <option value="settled" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">
                Settled Accounts
              </option>
            </select>

            {/* Sort Order */}
            <div className="flex items-center gap-1.5 px-3 py-2 bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#4E5E78] shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort members"
                className="text-xs font-medium bg-transparent text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden cursor-pointer"
              >
                <option value="code" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">
                  Sort: Code
                </option>
                <option value="paid_desc" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">
                  Sort: Highest Paid
                </option>
                <option value="due_desc" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">
                  Sort: Highest Due
                </option>
                <option value="shares_desc" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">
                  Sort: Most Shares
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile & Tablet Card Roster (< lg) */}
      <div className="lg:hidden space-y-3">
        {filteredMembers.length === 0 ? (
          <div className="surface-card rounded-2xl py-12 px-4 text-center text-xs text-[#4E5E78]">
            No members match your search or filter criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredMembers.map((member) => {
              const summary = memberPaymentSummaries.get(member.id);
              const shares = member.shares_count || 1;
              const monthlyFee = member.monthly_contribution || shares * defaultDueAmount;
              const totalPaid = summary?.totalPaid || 0;
              const totalDue = summary?.totalOutstanding || 0;
              const isDeleting = deleteConfirmId === member.id;

              return (
                <div
                  key={member.id}
                  className="surface-card rounded-2xl p-4 flex flex-col justify-between gap-3"
                >
                  {/* Top Identity Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#EFF3F9] dark:bg-[#17243C] ring-1 ring-[#DFE6F0] dark:ring-[#233452] flex items-center justify-center font-bold text-xs text-[#1D4ED8] dark:text-[#60A5FA] overflow-hidden shrink-0">
                        {member.profile_image_url ? (
                          <img
                            src={member.profile_image_url}
                            alt={member.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          member.full_name.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link
                          to={`/admin/members/${member.id}`}
                          className="text-sm font-bold text-[#0F1B2E] dark:text-slate-100 hover:text-[#1D4ED8] dark:hover:text-[#60A5FA] block truncate"
                        >
                          {member.full_name}
                        </Link>
                        <p className="text-[11px] text-[#4E5E78] dark:text-slate-400 truncate">
                          <span className="font-mono font-semibold text-[#0F1B2E] dark:text-slate-300">
                            {member.member_code}
                          </span>
                          <span aria-hidden="true"> · </span>
                          <span>{member.designation || 'Member'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {member.blood_group && (
                        <span className="text-[11px] font-mono font-bold text-rose-600 dark:text-rose-400">
                          {member.blood_group}
                        </span>
                      )}
                      <StatusBadge status={member.status} size="sm" />
                    </div>
                  </div>

                  {/* Contact Line */}
                  <div className="text-xs text-[#4E5E78] dark:text-slate-400 space-y-0.5">
                    <p className="font-mono text-[#0F1B2E] dark:text-slate-200">
                      {member.phone || 'No phone'}
                    </p>
                    <p
                      className={`truncate text-[11px] ${
                        member.email
                          ? 'text-[#1D4ED8] dark:text-[#60A5FA]'
                          : 'text-[#92600A] dark:text-[#F0C56E]'
                      }`}
                    >
                      {member.email || 'No login email linked'}
                    </p>
                  </div>

                  {/* 3-Column Financial Snapshot */}
                  <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-[#DFE6F0] dark:border-[#233452]">
                    <div>
                      <span className="text-[10px] text-[#4E5E78] dark:text-slate-400 block">
                        Monthly ({shares} sh)
                      </span>
                      <span className="text-xs font-mono font-semibold tabular-nums text-[#0F1B2E] dark:text-slate-100">
                        {formatBDT(monthlyFee)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#4E5E78] dark:text-slate-400 block">
                        Total Paid
                      </span>
                      <span className="text-xs font-mono font-bold tabular-nums text-[#0369A1] dark:text-[#38BDF8]">
                        {formatBDT(totalPaid)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[#4E5E78] dark:text-slate-400 block">
                        Balance
                      </span>
                      {totalDue > 0 ? (
                        <span className="text-xs font-mono font-bold tabular-nums text-rose-600 dark:text-rose-400">
                          {formatBDT(totalDue)}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-[#0369A1] dark:text-[#38BDF8]">
                          Settled
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#DFE6F0] dark:border-[#233452]">
                    <Link
                      to={`/admin/members/${member.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8] dark:text-[#60A5FA] hover:underline whitespace-nowrap"
                    >
                      <span>Open Ledger</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>

                    {canEditAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(member)}
                          className="p-1.5 text-[#4E5E78] hover:text-[#1D4ED8] dark:hover:text-[#60A5FA] rounded-lg hover:bg-[#EFF3F9] dark:hover:bg-[#18294A] cursor-pointer"
                          title="Edit Member"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleMemberStatus(member.id)}
                          className="p-1.5 text-[#4E5E78] hover:text-[#92600A] rounded-lg hover:bg-[#EFF3F9] dark:hover:bg-[#18294A] cursor-pointer"
                          title={member.status === 'active' ? 'Deactivate Member' : 'Activate Member'}
                        >
                          {member.status === 'active' ? (
                            <XCircle className="w-3.5 h-3.5 text-[#92600A] dark:text-[#F0C56E]" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#60A5FA]" />
                          )}
                        </button>
                        {isDeleting ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                deleteMember(member.id);
                                setDeleteConfirmId(null);
                              }}
                              className="px-2 py-0.5 bg-rose-600 text-white rounded text-[11px] font-semibold cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-1.5 py-0.5 text-[#4E5E78] text-[11px] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(member.id)}
                            className="p-1.5 text-[#4E5E78] hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                            title="Delete Member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop Enterprise Data Grid (lg+) */}
      <div className="hidden lg:block surface-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#EFF3F9] dark:bg-[#17243C] text-[#4E5E78] dark:text-slate-400 border-b border-[#DFE6F0] dark:border-[#233452]">
              <tr>
                <th className="py-3 px-4 font-semibold">Member</th>
                <th className="py-3 px-4 font-semibold">Contact</th>
                <th className="py-3 px-4 font-semibold text-right">Shares &amp; Monthly</th>
                <th className="py-3 px-4 font-semibold text-right">Total Paid</th>
                <th className="py-3 px-4 font-semibold text-right">Balance Due</th>
                <th className="py-3 px-4 font-semibold">Blood / Joined</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">
                  {canEditAdmin ? 'Actions' : 'Profile'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DFE6F0] dark:divide-[#233452]">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#4E5E78]">
                    No members match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const summary = memberPaymentSummaries.get(member.id);
                  const shares = member.shares_count || 1;
                  const monthlyFee = member.monthly_contribution || shares * defaultDueAmount;
                  const totalPaid = summary?.totalPaid || 0;
                  const totalDue = summary?.totalOutstanding || 0;
                  const paidMonths = summary?.totalPaidMonths || 0;
                  const unpaidMonths = summary?.unpaidMonthsCount || 0;
                  const isDeleting = deleteConfirmId === member.id;

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-[#EFF3F9]/65 dark:hover:bg-[#17243C]/65 transition-colors"
                    >
                      {/* Col 1: Clean 2-Line Identity */}
                      <td className="py-3 px-4 min-w-[230px]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#EFF3F9] dark:bg-[#17243C] ring-1 ring-[#DFE6F0] dark:ring-[#233452] flex items-center justify-center font-bold text-xs text-[#1D4ED8] dark:text-[#60A5FA] overflow-hidden shrink-0">
                            {member.profile_image_url ? (
                              <img
                                src={member.profile_image_url}
                                alt={member.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              member.full_name.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link
                              to={`/admin/members/${member.id}`}
                              className="font-semibold text-[13px] text-[#0F1B2E] dark:text-slate-100 hover:text-[#1D4ED8] dark:hover:text-[#60A5FA] block whitespace-nowrap truncate max-w-[220px]"
                            >
                              {member.full_name}
                            </Link>
                            <div className="text-[11px] text-[#4E5E78] dark:text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
                              <span className="font-mono font-semibold text-[#0F1B2E]/85 dark:text-slate-300">
                                {member.member_code}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="text-[#1D4ED8] dark:text-[#60A5FA] font-medium truncate max-w-[160px]">
                                {member.designation || 'Member'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Col 2: Phone & Email */}
                      <td className="py-3 px-4 min-w-[190px] whitespace-nowrap">
                        <span className="block font-mono text-[#0F1B2E] dark:text-slate-200">
                          {member.phone || '—'}
                        </span>
                        <span
                          className={`block text-[11px] truncate max-w-[210px] ${
                            member.email
                              ? 'text-[#4E5E78] dark:text-slate-400'
                              : 'text-[#92600A] dark:text-[#F0C56E]'
                          }`}
                        >
                          {member.email || 'No login email'}
                        </span>
                      </td>

                      {/* Col 3: Shares & Monthly Rate */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="block font-mono tabular-nums font-semibold text-[#0F1B2E] dark:text-slate-100">
                          {formatBDT(monthlyFee)}
                        </span>
                        <span className="block text-[11px] text-[#4E5E78] dark:text-slate-400 tabular-nums">
                          {shares} {shares > 1 ? 'shares' : 'share'}/mo
                        </span>
                      </td>

                      {/* Col 4: Lifetime Paid */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="block font-mono tabular-nums font-bold text-[#0369A1] dark:text-[#38BDF8]">
                          {formatBDT(totalPaid)}
                        </span>
                        <span className="block text-[11px] text-[#4E5E78] dark:text-slate-400 tabular-nums">
                          {paidMonths} mo settled
                        </span>
                      </td>

                      {/* Col 5: Balance Due */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {totalDue > 0 ? (
                          <>
                            <span className="block font-mono tabular-nums font-bold text-rose-600 dark:text-rose-400">
                              {formatBDT(totalDue)}
                            </span>
                            <span className="block text-[11px] text-rose-600/80 dark:text-rose-400/80 tabular-nums">
                              {unpaidMonths > 0 ? `${unpaidMonths} mo due` : 'Fine due'}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="block font-semibold text-[#0369A1] dark:text-[#38BDF8]">
                              Settled
                            </span>
                            <span className="block text-[11px] text-[#4E5E78] dark:text-slate-400">
                              Up to date
                            </span>
                          </>
                        )}
                      </td>

                      {/* Col 6: Blood Group & Join Date */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {member.blood_group ? (
                          <span className="block font-mono font-bold text-rose-600 dark:text-rose-400">
                            {member.blood_group}
                          </span>
                        ) : (
                          <span className="block text-[#4E5E78] dark:text-slate-500">—</span>
                        )}
                        <span className="block text-[11px] font-mono tabular-nums text-[#4E5E78] dark:text-slate-400">
                          {formatDate(member.join_date)}
                        </span>
                      </td>

                      {/* Col 7: Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <StatusBadge status={member.status} size="sm" />
                      </td>

                      {/* Col 8: Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/admin/members/${member.id}`}
                            className="p-1.5 text-[#4E5E78] hover:text-[#1D4ED8] dark:hover:text-[#60A5FA] rounded-lg hover:bg-[#EFF3F9] dark:hover:bg-[#18294A]"
                            title="Open Member Profile & Ledger"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          {canEditAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(member)}
                                className="p-1.5 text-[#4E5E78] hover:text-[#1D4ED8] dark:hover:text-[#60A5FA] rounded-lg hover:bg-[#EFF3F9] dark:hover:bg-[#18294A] cursor-pointer"
                                title="Edit Member Information"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => toggleMemberStatus(member.id)}
                                className="p-1.5 text-[#4E5E78] hover:text-[#92600A] rounded-lg hover:bg-[#EFF3F9] dark:hover:bg-[#18294A] cursor-pointer"
                                title={member.status === 'active' ? 'Deactivate Member' : 'Activate Member'}
                              >
                                {member.status === 'active' ? (
                                  <XCircle className="w-3.5 h-3.5 text-[#92600A] dark:text-[#F0C56E]" />
                                ) : (
                                  <CheckCircle className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#60A5FA]" />
                                )}
                              </button>

                              {isDeleting ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      deleteMember(member.id);
                                      setDeleteConfirmId(null);
                                    }}
                                    className="px-2 py-0.5 bg-rose-600 text-white rounded text-[11px] font-semibold cursor-pointer"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-1.5 py-0.5 text-[#4E5E78] text-[11px] cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(member.id)}
                                  className="p-1.5 text-[#4E5E78] hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                                  title="Delete Member (Preserves history)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredMembers.length > 0 && (
              <tfoot className="bg-[#EFF3F9] dark:bg-[#17243C] border-t border-[#DFE6F0] dark:border-[#233452] text-xs font-semibold text-[#0F1B2E] dark:text-slate-200">
                <tr>
                  <td colSpan={2} className="py-3 px-4 tabular-nums">
                    Showing {filteredMembers.length} of {members.length} members
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {formatBDT(filteredTotals.monthly)}/mo
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[#0369A1] dark:text-[#38BDF8]">
                    {formatBDT(filteredTotals.paid)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-rose-600 dark:text-rose-400">
                    {filteredTotals.due > 0 ? formatBDT(filteredTotals.due) : '৳0'}
                  </td>
                  <td colSpan={3} className="py-3 px-4" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Add / Edit Member Modal */}
      {canEditAdmin && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingMember ? 'Edit Member Details' : 'Add New Club Member'}
          subtitle={
            editingMember
              ? `Updating profile for ${editingMember.member_code}`
              : 'Register a new Bondhon 2017 shareholder'
          }
          icon={<UserPlus className="w-4 h-4" />}
          lottieSrc="/lottie/member-profile.json"
          lottieSpeed={loading ? 1.35 : 1}
          maxWidthClass="max-w-lg"
        >
          <div>
            {errorMessage && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40 rounded-xl text-xs">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSaveMember} className="space-y-4">
              {/* Profile Photo Upload */}
              <div>
                <label className="block text-xs font-semibold text-[#0F1B2E] dark:text-slate-200 mb-1.5">
                  Member Profile Photo
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] overflow-hidden flex items-center justify-center shrink-0">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-[#4E5E78]" />
                    )}
                  </div>
                  <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] text-xs font-semibold text-[#0F1B2E] dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-[#18294A] flex items-center gap-1.5 transition-colors">
                    <Upload className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#60A5FA]" />
                    <span>Upload Image (Max 3MB)</span>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F1B2E] dark:text-slate-200 mb-1">
                    Member Code
                  </label>
                  <input
                    type="text"
                    required
                    value={memberCode}
                    onChange={(e) => setMemberCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-sm bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl font-mono uppercase text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F1B2E] dark:text-slate-200 mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Member, Executive Member"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F1B2E] dark:text-slate-200 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shaikot Dhali"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F1B2E] dark:text-slate-200 mb-1">
                    Father&apos;s Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mr. Yusuf Dhali"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F1B2E] dark:text-slate-200 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+880 1711-223344"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl font-mono text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F1B2E] dark:text-slate-200 mb-1">
                    Shares
                  </label>
                  <select
                    value={sharesCount}
                    onChange={(e) => {
                      const count = Number(e.target.value) || 1;
                      setSharesCount(count);
                      setMonthlyContribution(count * defaultDueAmount);
                    }}
                    className="w-full px-3 py-2 text-sm bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl font-medium text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8] cursor-pointer"
                  >
                    <option value={1} className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">
                      1 Share (৳{defaultDueAmount})
                    </option>
                    <option value={2} className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">
                      2 Shares (৳{defaultDueAmount * 2})
                    </option>
                    <option value={3} className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">
                      3 Shares (৳{defaultDueAmount * 3})
                    </option>
                    <option value={4} className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">
                      4 Shares (৳{defaultDueAmount * 4})
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F1B2E] dark:text-slate-200 mb-1">
                    Monthly Fee (৳)
                  </label>
                  <input
                    type="number"
                    min={100}
                    step={50}
                    required
                    value={monthlyContribution}
                    onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl font-mono tabular-nums text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F1B2E] dark:text-slate-200 mb-1">
                    Joining Date
                  </label>
                  <input
                    type="date"
                    required
                    value={joinDate}
                    onChange={(e) => setJoinDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl font-mono text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F1B2E] dark:text-slate-200 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as MemberStatus)}
                    className="w-full px-3 py-2 text-sm bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl font-medium text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8] cursor-pointer"
                  >
                    <option value="active" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">
                      Active
                    </option>
                    <option value="inactive" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">
                      Inactive
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-[#0F1B2E] dark:text-slate-200 mb-1">
                    <Lock className="w-3 h-3 text-[#D6AC62]" />
                    <span>Date of Birth (Private)</span>
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl font-mono text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-[#0F1B2E] dark:text-slate-200 mb-1">
                    <Droplets className="w-3 h-3 text-rose-500" />
                    <span>Blood Group</span>
                  </label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl font-mono text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8] cursor-pointer"
                  >
                    <option value="" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">
                      Not specified
                    </option>
                    {BLOOD_GROUPS.map((bg) => (
                      <option
                        key={bg}
                        value={bg}
                        className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100"
                      >
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F1B2E] dark:text-slate-200 mb-1">
                    Login Email
                  </label>
                  <input
                    type="email"
                    placeholder="member@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F1B2E] dark:text-slate-200 mb-1">
                    Account ID
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-linked on login"
                    value={authUserId}
                    onChange={(e) => setAuthUserId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl font-mono text-[#0F1B2E] dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#DFE6F0] dark:border-[#233452]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#4E5E78] hover:bg-slate-100 dark:hover:bg-[#17243C] rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-xl disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  {loading ? 'Saving...' : editingMember ? 'Update Member' : 'Save Member'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </PageTransition>
  );
};
