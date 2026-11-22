import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useClubData } from '../../hooks/useClubData';
import { INITIAL_PUBLIC_MEMBERS } from '../../lib/mockData';
import { PublicMember } from '../../types';
import { MemberQrCode } from '../../components/MemberQrCode';
import { PageTransition } from '../../components/ui/MotionPrimitives';
import crestImage from '../../assets/images/bondhon_club_crest_1793703027252.jpg';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Check,
  Crown,
  Droplets,
  QrCode,
  ShieldCheck,
  Award,
  UserCheck,
  Users,
} from 'lucide-react';

export const PublicMemberProfile: React.FC = () => {
  const { memberKey } = useParams<{ memberKey: string }>();
  const { publicMembers, memberDirectory } = useClubData();
  const [imgFailed, setImgFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Strictly resolve ONLY public safe fields (never father_name, shares/fees, DOB, phone, email, or balance)
  const member = useMemo<PublicMember | null>(() => {
    const rawKey = decodeURIComponent(memberKey || '').trim().toLowerCase();
    if (!rawKey) return null;

    const matchIn = (list: Array<{
      id: string;
      member_code: string;
      full_name: string;
      profile_image_url?: string | null;
      designation?: string | null;
      blood_group?: string | null;
      status: string;
    }>): PublicMember | null => {
      const found = list.find(
        (m) =>
          m.id.toLowerCase() === rawKey ||
          m.member_code.toLowerCase() === rawKey
      );
      if (!found) return null;
      return {
        id: found.id,
        member_code: found.member_code,
        full_name: found.full_name,
        profile_image_url: found.profile_image_url || null,
        designation: found.designation || 'Member (সদস্য)',
        blood_group: found.blood_group || null,
        status: 'active',
      };
    };

    const pub = matchIn(publicMembers);
    if (pub) {
      // Enrich blood_group from authenticated safe directory if already logged in
      const dirMatch = memberDirectory.find(
        (d) =>
          d.id === pub.id ||
          d.member_code.toLowerCase() === pub.member_code.toLowerCase()
      );
      return {
        ...pub,
        blood_group: pub.blood_group || dirMatch?.blood_group || null,
      };
    }

    return matchIn(INITIAL_PUBLIC_MEMBERS);
  }, [memberKey, publicMembers, memberDirectory]);

  const profileUrl = useMemo(() => {
    if (!member) return '';
    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : '';
    return `${origin}/members/${encodeURIComponent(member.member_code)}`;
  }, [member]);

  const handleCopyLink = async () => {
    if (!profileUrl) return;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore clipboard errors silently
    }
  };

  if (!member) {
    return (
      <PageTransition className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="surface-card rounded-3xl p-8 sm:p-12 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#EFF3F9] dark:bg-[#17243C] text-[#1D4ED8] dark:text-[#60A5FA] flex items-center justify-center">
            <Users className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F1B33] dark:text-white">
            Member Profile Not Found
          </h1>
          <p className="text-xs sm:text-sm text-[#4E5E78] dark:text-slate-400 max-w-md mx-auto">
            The scanned QR code or link does not match an active member in the Bondhon 2017 public directory.
          </p>
          <div className="pt-2">
            <Link
              to="/members"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-bold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Member Directory</span>
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  const isExecutive =
    Boolean(member.designation) &&
    !member.designation!.toLowerCase().startsWith('member');

  const initials =
    member.full_name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || '')
      .join('') || 'BM';

  return (
    <PageTransition className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-6">
      {/* Top Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/members"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#4E5E78] dark:text-slate-300 hover:text-[#1D4ED8] dark:hover:text-[#60A5FA] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Public Directory</span>
        </Link>

        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-[#0369A1] dark:text-[#38BDF8]">
          <ShieldCheck className="w-4 h-4 text-[#D6AC62]" />
          <span>Verified Bondhon 2017 Member Card</span>
        </span>
      </div>

      {/* Main Verified Digital Member Card */}
      <section className="surface-card rounded-3xl overflow-hidden shadow-xl">
        {/* Sovereign Navy & Brass Top Crest Header */}
        <div className="bg-gradient-to-r from-[#0F1B33] via-[#132548] to-[#0F1B33] px-6 py-5 border-b border-[#D6AC62]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white">
          <div className="flex items-center gap-3">
            <img
              src={crestImage}
              alt="Bondhon 2017 Crest"
              className="w-11 h-11 rounded-full object-cover ring-2 ring-[#D6AC62]/70 shrink-0"
            />
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D6AC62] font-bold">
                Bondhon 2017 · বন্ধুত্ব সমবায় সমিতি
              </p>
              <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-white">
                Official Member Verification Profile
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-3 py-1 rounded-lg bg-[#1D4ED8]/25 border border-[#60A5FA]/35 text-[#93C5FD] font-bold">
              {member.member_code}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Active</span>
            </span>
          </div>
        </div>

        {/* Body: Profile Identity Left + QR Code Card Right */}
        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Identity Showcase */}
          <div className="md:col-span-7 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            <div
              className={`w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-[#EFF3F9] dark:bg-[#17243C] shrink-0 flex items-center justify-center shadow-md ${
                isExecutive
                  ? 'ring-3 ring-[#D6AC62]'
                  : 'ring-2 ring-[#1D4ED8]/45 dark:ring-[#60A5FA]/45'
              }`}
            >
              {member.profile_image_url && !imgFailed ? (
                <img
                  src={member.profile_image_url}
                  alt={member.full_name}
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-extrabold font-mono text-[#1D4ED8] dark:text-[#60A5FA]">
                  {initials}
                </span>
              )}
            </div>

            <div className="space-y-3 min-w-0 flex-1">
              <div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs font-mono text-[#4E5E78] dark:text-slate-400">
                  <span className="font-bold text-[#0F1B33] dark:text-white">{member.member_code}</span>
                  <span aria-hidden="true">·</span>
                  <span>SSC Batch 2017</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F1B33] dark:text-white mt-1">
                  {member.full_name}
                </h1>
                <p
                  className={`mt-1 text-sm font-bold flex items-center justify-center sm:justify-start gap-1.5 ${
                    isExecutive
                      ? 'text-[#92600A] dark:text-[#F0C56E]'
                      : 'text-[#1D4ED8] dark:text-[#60A5FA]'
                  }`}
                >
                  {isExecutive && <Crown className="w-4 h-4 shrink-0" />}
                  <span>{member.designation || 'Member (সদস্য)'}</span>
                </p>
              </div>

              {/* Public Safe Attributes Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2 text-left">
                <div className="p-3 rounded-xl bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452]">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#4E5E78] dark:text-[#9BB0CD] block">
                    Blood Group
                  </span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Droplets className="w-4 h-4 text-rose-500 shrink-0" />
                    <span className="text-sm sm:text-base font-extrabold font-mono text-[#0F1B33] dark:text-white">
                      {member.blood_group || 'Not Set'}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452]">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#4E5E78] dark:text-[#9BB0CD] block">
                    Membership
                  </span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-[#1D4ED8] dark:text-[#60A5FA] shrink-0" />
                    <span className="text-xs sm:text-sm font-bold text-[#0F1B33] dark:text-white">
                      Verified Active
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2.5 text-xs text-[#4E5E78] dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[#D6AC62]" />
                  <span>Char Chanda Khasmahal Bazar, Shariatpur</span>
                </span>
              </div>
            </div>
          </div>

          {/* Digital QR Verification Panel */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-5 rounded-2xl bg-[#EFF3F9]/85 dark:bg-[#17243C]/80 border border-[#DFE6F0] dark:border-[#233452] space-y-3 text-center">
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-[#1D4ED8] dark:text-[#60A5FA]">
              <QrCode className="w-3.5 h-3.5" />
              <span>Scan to Verify Member</span>
            </div>

            <div className="p-3 rounded-2xl bg-white shadow-sm border border-[#DFE6F0]">
              <MemberQrCode
                value={profileUrl}
                size={148}
                label={`Verification QR code for ${member.full_name} (${member.member_code})`}
              />
            </div>

            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-[#0F1B33] dark:text-slate-200">
                {member.member_code} · {member.full_name}
              </p>
              <p className="text-[10px] text-[#4E5E78] dark:text-[#9BB0CD]">
                Private details (DOB, father&apos;s name, contact &amp; shares) remain protected.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1 w-full">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-[#0F1B33] border border-[#DFE6F0] dark:border-[#233452] text-[#0F1B33] dark:text-white hover:border-[#1D4ED8] transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Link Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#60A5FA]" />
                    <span>Copy Profile URL</span>
                  </>
                )}
              </button>

              <Link
                to="/login"
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white transition-colors whitespace-nowrap"
              >
                Member Portal
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageTransition>
  );
};
