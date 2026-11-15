import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useClubData } from '../../hooks/useClubData';
import { Member, MemberStatus } from '../../types';
import { formatBDT, formatDate } from '../../utils/formatters';
import { computeMemberFinancialSummary } from '../../utils/fineCalculator';
import { StatusBadge } from '../../components/StatusBadge';
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
  X,
  Image as ImageIcon,
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

  const activeCount = members.filter(m => m.status === 'active').length;
  const inactiveCount = members.filter(m => m.status === 'inactive').length;

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

    // Upload to Supabase storage if new file picked
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
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
            <span>Member Directory</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Member profiles, share allocations, and contribution balances
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs transition-colors self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Member</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, code (BND-001) or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg self-start sm:self-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              statusFilter === 'all'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            All ({members.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              statusFilter === 'active'
                ? 'bg-slate-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              statusFilter === 'inactive'
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Inactive ({inactiveCount})
          </button>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Member</th>
                <th className="py-3 px-4 font-semibold">Code</th>
                <th className="py-3 px-4 font-semibold">Designation</th>
                <th className="py-3 px-4 font-semibold">Phone Number</th>
                <th className="py-3 px-4 font-semibold">Join Date</th>
                <th className="py-3 px-4 font-semibold text-right">Monthly Due (৳)</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No members match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const summary = memberPaymentSummaries.get(member.id);
                  const isDeleting = deleteConfirmId === member.id;

                  return (
                    <tr key={member.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-3 px-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-emerald-600/30 flex items-center justify-center font-bold text-xs text-emerald-800 dark:text-emerald-300 overflow-hidden shrink-0">
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
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/admin/members/${member.id}`}
                              className="font-semibold text-slate-900 dark:text-slate-100 hover:text-emerald-700 dark:hover:text-emerald-400 text-left block"
                            >
                              {member.full_name}
                            </Link>
                            {(member.shares_count || 1) > 1 && (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded">
                                {member.shares_count} Shares
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 block">
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
                      </td>

                      {/* Code */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {member.member_code}
                      </td>

                      {/* Designation */}
                      <td className="py-3 px-4 text-emerald-700 dark:text-emerald-400 font-medium whitespace-nowrap">
                        {member.designation || 'Member'}
                      </td>

                      {/* Phone & Portal Email */}
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <span className="block">{member.phone || '—'}</span>
                        <span className={`block text-[10px] font-sans ${member.email ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-600'}`}>
                          {member.email || 'No email'}
                        </span>
                      </td>

                      {/* Join Date */}
                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {formatDate(member.join_date)}
                      </td>

                      {/* Monthly Contribution */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {formatBDT(member.monthly_contribution || (member.shares_count || 1) * defaultDueAmount)}
                        <span className="block text-[10px] font-normal text-slate-400">
                          {member.shares_count || 1} {(member.shares_count || 1) > 1 ? 'shares' : 'share'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <StatusBadge status={member.status} size="sm" />
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/admin/members/${member.id}`}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Open Member Profile & Ledger"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            onClick={() => handleOpenEdit(member)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Edit Member Information"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => toggleMemberStatus(member.id)}
                            className="p-1.5 text-slate-500 hover:text-amber-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                            title={member.status === 'active' ? 'Deactivate Member' : 'Activate Member'}
                          >
                            {member.status === 'active' ? (
                              <XCircle className="w-3.5 h-3.5 text-amber-600" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                          </button>

                          {isDeleting ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  deleteMember(member.id);
                                  setDeleteConfirmId(null);
                                }}
                                className="px-2 py-0.5 bg-rose-600 text-white rounded text-[11px] font-semibold"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-1.5 py-0.5 text-slate-500 text-[11px]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(member.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
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
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {editingMember ? 'Edit Member Details' : 'Add New Club Member'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mt-3 p-3 bg-rose-50 text-rose-800 rounded-lg text-xs">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSaveMember} className="mt-4 space-y-4">
              {/* Profile Photo Upload */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Member Profile Photo
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <label className="cursor-pointer px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image (Max 3MB)</span>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Member Code
                  </label>
                  <input
                    type="text"
                    required
                    value={memberCode}
                    onChange={(e) => setMemberCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Member, Executive Member"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shaikot Dhali"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Father&apos;s Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mr. Yusuf Dhali"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+880 1711-223344"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Shares
                  </label>
                  <select
                    value={sharesCount}
                    onChange={(e) => {
                      const count = Number(e.target.value) || 1;
                      setSharesCount(count);
                      setMonthlyContribution(count * defaultDueAmount);
                    }}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium"
                  >
                    <option value={1}>1 Share (৳{defaultDueAmount})</option>
                    <option value={2}>2 Shares (৳{defaultDueAmount * 2})</option>
                    <option value={3}>3 Shares (৳{defaultDueAmount * 3})</option>
                    <option value={4}>4 Shares (৳{defaultDueAmount * 4})</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Monthly Fee (৳)
                  </label>
                  <input
                    type="number"
                    min={100}
                    step={50}
                    required
                    value={monthlyContribution}
                    onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Joining Date
                  </label>
                  <input
                    type="date"
                    required
                    value={joinDate}
                    onChange={(e) => setJoinDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as MemberStatus)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Login Email
                  </label>
                  <input
                    type="email"
                    placeholder="member@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Account ID
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-linked on login"
                    value={authUserId}
                    onChange={(e) => setAuthUserId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingMember ? 'Update Member' : 'Save Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
