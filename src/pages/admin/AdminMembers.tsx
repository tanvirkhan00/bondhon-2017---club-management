import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useClubData } from '../../hooks/useClubData';
import { Member, MemberStatus } from '../../types';
import { formatBDT, formatDate } from '../../utils/formatters';
import { computeMemberFinancialSummary } from '../../utils/fineCalculator';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { PageTransition } from '../../components/ui/MotionPrimitives';
import { uploadMemberAvatar } from '../../services/supabase/storage';
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
} from 'lucide-react';

export const AdminMembers: React.FC = () => {
  const { members, addMember, updateMember, toggleMemberStatus, deleteMember, monthlyDues, defaultDueAmount } = useClubData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
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

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchSearch =
        m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.father_name && m.father_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        m.member_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.phone && m.phone.includes(searchQuery)) ||
        (m.designation && m.designation.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = statusFilter === 'all' || m.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [members, searchQuery, statusFilter]);

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
            Member profiles, share allocations, and contribution balances
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-xl shadow-xs transition-colors self-start sm:self-auto shrink-0 cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Member</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#4E5E78] absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, code (BND-001) or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-xs sm:text-sm bg-white dark:bg-[#111B2E] border border-[#DFE6F0] dark:border-[#233452] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8] text-[#0F1B2E] dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-white dark:bg-[#111B2E] border border-[#DFE6F0] dark:border-[#233452] rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-[#0F1B33] dark:bg-[#1D4ED8] text-white font-semibold'
                : 'text-[#4E5E78] hover:text-[#0F1B2E] dark:hover:text-slate-100'
            }`}
          >
            All ({members.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === 'active'
                ? 'bg-[#1D4ED8] text-white font-semibold'
                : 'text-[#4E5E78] hover:text-[#0F1B2E] dark:hover:text-slate-100'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === 'inactive'
                ? 'bg-[#4E5E78] text-white font-semibold'
                : 'text-[#4E5E78] hover:text-[#0F1B2E] dark:hover:text-slate-100'
            }`}
          >
            Inactive ({inactiveCount})
          </button>
        </div>
      </div>

      {/* Members Table */}
      <div className="surface-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EFF3F9] dark:bg-[#17243C] text-[#4E5E78] dark:text-slate-400 border-b border-[#DFE6F0] dark:border-[#233452]">
              <tr>
                <th className="py-3 px-4 font-semibold">Member</th>
                <th className="py-3 px-4 font-semibold">Code</th>
                <th className="py-3 px-4 font-semibold">Designation</th>
                <th className="py-3 px-4 font-semibold">Phone &amp; Email</th>
                <th className="py-3 px-4 font-semibold">Join Date</th>
                <th className="py-3 px-4 font-semibold text-right">Monthly Due (৳)</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
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
                  const isDeleting = deleteConfirmId === member.id;

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-[#EFF3F9]/65 dark:hover:bg-[#17243C]/65 transition-colors"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#EFF3F9] dark:bg-[#17243C] ring-2 ring-[#1D4ED8]/25 dark:ring-[#60A5FA]/30 flex items-center justify-center font-bold text-xs text-[#1D4ED8] dark:text-[#60A5FA] overflow-hidden shrink-0">
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
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Link
                                to={`/admin/members/${member.id}`}
                                className="font-semibold text-[#0F1B2E] dark:text-slate-100 hover:text-[#1D4ED8] dark:hover:text-[#60A5FA]"
                              >
                                {member.full_name}
                              </Link>
                              {(member.shares_count || 1) > 1 && (
                                <span className="text-[11px] font-semibold text-[#92600A] dark:text-[#F0C56E] tabular-nums">
                                  · {member.shares_count} Shares
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-[#4E5E78] dark:text-slate-400 block tabular-nums">
                              Paid {formatBDT(summary?.totalPaid || 0)}
                              {(summary?.totalOutstanding || 0) > 0 ? (
                                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                                  {' · '}Due {formatBDT(summary?.totalOutstanding || 0)}
                                </span>
                              ) : (
                                ' · Settled'
                              )}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Code */}
                      <td className="py-3 px-4 font-mono font-bold text-[#0F1B2E] dark:text-slate-100 whitespace-nowrap">
                        {member.member_code}
                      </td>

                      {/* Designation */}
                      <td className="py-3 px-4 text-[#1D4ED8] dark:text-[#60A5FA] font-medium whitespace-nowrap">
                        {member.designation || 'Member'}
                      </td>

                      {/* Phone & Portal Email */}
                      <td className="py-3 px-4 font-mono text-[#4E5E78] dark:text-slate-400 whitespace-nowrap">
                        <span className="block text-[#0F1B2E] dark:text-slate-200">{member.phone || '—'}</span>
                        <span
                          className={`block text-[10px] font-sans ${
                            member.email ? 'text-[#1D4ED8] dark:text-[#60A5FA]' : 'text-[#92600A] dark:text-[#F0C56E]'
                          }`}
                        >
                          {member.email || 'No email'}
                        </span>
                      </td>

                      {/* Join Date */}
                      <td className="py-3 px-4 font-mono text-[#4E5E78] dark:text-slate-400 whitespace-nowrap tabular-nums">
                        {formatDate(member.join_date)}
                      </td>

                      {/* Monthly Contribution */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#0F1B2E] dark:text-slate-200 whitespace-nowrap">
                        {formatBDT(member.monthly_contribution || (member.shares_count || 1) * defaultDueAmount)}
                        <span className="block text-[10px] font-normal text-[#4E5E78]">
                          {member.shares_count || 1} {(member.shares_count || 1) > 1 ? 'shares' : 'share'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <StatusBadge status={member.status} size="sm" />
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/admin/members/${member.id}`}
                            className="p-1.5 text-[#4E5E78] hover:text-[#1D4ED8] dark:hover:text-[#60A5FA] rounded-lg hover:bg-[#EFF3F9] dark:hover:bg-[#18294A]"
                            title="Open Member Profile & Ledger"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            onClick={() => handleOpenEdit(member)}
                            className="p-1.5 text-[#4E5E78] hover:text-[#1D4ED8] dark:hover:text-[#60A5FA] rounded-lg hover:bg-[#EFF3F9] dark:hover:bg-[#18294A] cursor-pointer"
                            title="Edit Member Information"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
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
                                onClick={() => {
                                  deleteMember(member.id);
                                  setDeleteConfirmId(null);
                                }}
                                className="px-2 py-0.5 bg-rose-600 text-white rounded text-[11px] font-semibold cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-1.5 py-0.5 text-[#4E5E78] text-[11px] cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(member.id)}
                              className="p-1.5 text-[#4E5E78] hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                              title="Delete Member (Preserves history)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Member Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingMember ? 'Edit Member Details' : 'Add New Club Member'}
        subtitle={editingMember ? `Updating profile for ${editingMember.member_code}` : 'Register a new Bondhon 2017 shareholder'}
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
                  <option value={1} className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">1 Share (৳{defaultDueAmount})</option>
                  <option value={2} className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">2 Shares (৳{defaultDueAmount * 2})</option>
                  <option value={3} className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">3 Shares (৳{defaultDueAmount * 3})</option>
                  <option value={4} className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">4 Shares (৳{defaultDueAmount * 4})</option>
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
                  <option value="active" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">Active</option>
                  <option value="inactive" className="bg-white text-[#0F1B2E] dark:bg-[#111B2E] dark:text-slate-100">Inactive</option>
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
    </PageTransition>
  );
};
