import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useClubData } from '../../hooks/useClubData';
import { INITIAL_PUBLIC_MEMBERS } from '../../lib/mockData';
import { PublicMember } from '../../types';
import { MemberQrCode, getPublicMemberProfileUrl } from '../../components/MemberQrCode';
import { exportQrPngDataUrl } from '../../utils/qrCodeGenerator';
import { PageTransition } from '../../components/ui/MotionPrimitives';
import crestImage from '../../assets/images/bondhon_club_crest_1793703027252.jpg';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  Crown,
  Download,
  Droplets,
  MapPin,
  Share2,
  ShieldCheck,
  Users,
} from 'lucide-react';

function normalizeCodeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export const PublicMemberProfile: React.FC = () => {
  const { memberKey } = useParams<{ memberKey: string }>();
  const { publicMembers, memberDirectory, members, isLoading } = useClubData();
  const [imgFailed, setImgFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Strictly extract ONLY public-safe fields (never father_name, shares/fees, DOB, phone, email, or balance)
  const member = useMemo<PublicMember | null>(() => {
    const rawKey = decodeURIComponent(memberKey || '').trim().toLowerCase();
    const compactKey = normalizeCodeKey(rawKey);
    if (!rawKey) return null;

    const matchIn = (
      list: Array<{
        id: string;
        member_code: string;
        full_name: string;
        profile_image_url?: string | null;
        designation?: string | null;
        blood_group?: string | null;
        status?: string;
      }>
    ): PublicMember | null => {
      const found = list.find(
        (m) =>
          m.id.toLowerCase() === rawKey ||
          m.member_code.toLowerCase() === rawKey ||
          (compactKey.length > 0 && normalizeCodeKey(m.member_code) === compactKey)
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

    const pub = matchIn(publicMembers) || matchIn(members.filter((m) => m.status === 'active'));
    if (pub) {
      const dirMatch = memberDirectory.find(
        (d) => d.id === pub.id || d.member_code.toLowerCase() === pub.member_code.toLowerCase()
      );
      return {
        ...pub,
        blood_group: pub.blood_group || dirMatch?.blood_group || null,
      };
    }

    return matchIn(INITIAL_PUBLIC_MEMBERS);
  }, [memberKey, publicMembers, memberDirectory, members]);

  const profileUrl = useMemo(() => {
    if (!member) return '';
    return getPublicMemberProfileUrl(member.member_code);
  }, [member]);

  const handleCopyLink = async () => {
    if (!profileUrl) return;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore clipboard errors cleanly
    }
  };

  const handleShare = async () => {
    if (!member || !profileUrl) return;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `${member.full_name} (${member.member_code}) · Bondhon 2017`,
          text: `${member.full_name} — ${member.designation || 'Member'} · Bondhon 2017 Verified Member Profile`,
          url: profileUrl,
        });
        return;
      } catch {
        // Fallback to copy if share sheet dismissed or unsupported
      }
    }
    await handleCopyLink();
  };

  const handleDownloadQr = () => {
    if (!member || !profileUrl) return;
    try {
      const dataUrl = exportQrPngDataUrl(profileUrl);
      const anchor = document.createElement('a');
      anchor.href = dataUrl;
      anchor.download = `bondhon-${member.member_code.toLowerCase()}-qr.png`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } catch {
      // ignore download cancellation
    }
  };

  // Loading state while Supabase directory resolves on cold mobile QR scan
  if (!member && isLoading) {
    return (
      <PageTransition className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="surface-card rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 animate-pulse">
          <div className="lg:col-span-7 p-6 sm:p-10 space-y-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="w-36 h-44 rounded-2xl bg-[#EFF3F9] dark:bg-[#17243C]" />
              <div className="flex-1 space-y-3 py-2">
                <div className="h-3 w-40 rounded bg-[#EFF3F9] dark:bg-[#17243C]" />
                <div className="h-8 w-56 rounded bg-[#EFF3F9] dark:bg-[#17243C]" />
                <div className="h-4 w-36 rounded bg-[#EFF3F9] dark:bg-[#17243C]" />
              </div>
            </div>
            <div className="space-y-3 pt-4 border-t border-[#DFE6F0] dark:border-[#233452]">
              <div className="h-10 rounded bg-[#EFF3F9] dark:bg-[#17243C]" />
              <div className="h-10 rounded bg-[#EFF3F9] dark:bg-[#17243C]" />
            </div>
          </div>
          <div className="lg:col-span-5 bg-[#0F1B33] p-8 min-h-[320px]" />
        </div>
      </PageTransition>
    );
  }

  if (!member) {
    return (
      <PageTransition className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="surface-card rounded-3xl p-8 sm:p-12 text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#EFF3F9] dark:bg-[#17243C] text-[#1D4ED8] dark:text-[#60A5FA] flex items-center justify-center">
            <Users className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-mono tracking-widest uppercase text-[#4E5E78] dark:text-[#9BB0CD]">
              Bondhon 2017 · Registry Lookup
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#0F1B33] dark:text-white">
              Member Profile Not Found
            </h1>
            <p className="text-sm text-[#4E5E78] dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              The scanned QR code or member serial does not match an active public record in the Bondhon 2017 registry.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/members"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold transition-colors whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Browse Member Directory</span>
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
    <PageTransition className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 space-y-6">
      {/* Minimal Editorial Top Strip (Zero Pills) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#DFE6F0] dark:border-[#233452]">
        <Link
          to="/members"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#4E5E78] dark:text-slate-300 hover:text-[#1D4ED8] dark:hover:text-[#60A5FA] transition-colors whitespace-nowrap"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Member Directory</span>
        </Link>

        <div className="flex items-center gap-2 text-xs text-[#4E5E78] dark:text-[#9BB0CD]">
          <ShieldCheck className="w-4 h-4 text-[#D6AC62] shrink-0" />
          <span>Official Registry</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono font-semibold text-[#0F1B33] dark:text-white tabular-nums">
            {member.member_code}
          </span>
        </div>
      </div>

      {/* Institutional Two-Column Digital Credential Dossier */}
      <article className="surface-card rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
        {/* Left: Editorial Portrait & Accession Metadata Dossier */}
        <div className="lg:col-span-7 p-6 sm:p-9 lg:p-10 flex flex-col justify-between gap-8">
          <div className="space-y-7">
            {/* Portrait + Lead Identity */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
              <div
                className={`relative w-36 h-44 sm:w-40 sm:h-48 rounded-2xl overflow-hidden bg-[#EFF3F9] dark:bg-[#17243C] shrink-0 flex items-center justify-center border ${
                  isExecutive
                    ? 'border-[#D6AC62]/70 shadow-[0_12px_30px_-14px_rgba(214,172,98,0.45)]'
                    : 'border-[#DFE6F0] dark:border-[#233452]'
                }`}
              >
                {member.profile_image_url && !imgFailed ? (
                  <img
                    src={member.profile_image_url}
                    alt={member.full_name}
                    referrerPolicy="no-referrer"
                    onError={() => setImgFailed(true)}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1 text-[#1D4ED8] dark:text-[#60A5FA]">
                    <span className="text-4xl font-extrabold font-mono tracking-tight">
                      {initials}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#4E5E78] dark:text-[#9BB0CD]">
                      {member.member_code}
                    </span>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-2.5 pt-1">
                <p className="text-xs font-mono text-[#4E5E78] dark:text-[#9BB0CD] flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="font-bold text-[#1D4ED8] dark:text-[#60A5FA] tabular-nums">
                    {member.member_code}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Batch SSC 2017</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                    Verified Active
                  </span>
                </p>

                <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold tracking-tight text-[#0F1B33] dark:text-white leading-tight [text-wrap:balance]">
                  {member.full_name}
                </h1>

                <p
                  className={`text-sm sm:text-base font-bold flex items-center justify-center sm:justify-start gap-1.5 ${
                    isExecutive
                      ? 'text-[#92600A] dark:text-[#F0C56E]'
                      : 'text-[#1D4ED8] dark:text-[#60A5FA]'
                  }`}
                >
                  {isExecutive && <Crown className="w-4 h-4 shrink-0" />}
                  <span>{member.designation || 'Member (সদস্য)'}</span>
                </p>

                <p className="text-xs sm:text-sm text-[#4E5E78] dark:text-slate-400 leading-relaxed max-w-md pt-1">
                  বন্ধুত্ব সমবায় সমিতি (Bondhon 2017)-এর নিবন্ধিত সম্মানিত সদস্য। প্রতিষ্ঠালগ্ন ০১/০৪/২০২৪ ইং হতে সক্রিয়ভাবে সংগঠনের সাথে যুক্ত।
                </p>
              </div>
            </div>

            {/* Clean Hairline Accession Definition List (Zero Nested Boxes) */}
            <dl className="divide-y divide-[#DFE6F0] dark:divide-[#233452] border-y border-[#DFE6F0] dark:border-[#233452]">
              <div className="py-3.5 grid grid-cols-12 gap-2 items-center">
                <dt className="col-span-5 text-xs uppercase tracking-wider font-mono text-[#4E5E78] dark:text-[#9BB0CD]">
                  Member Serial
                </dt>
                <dd className="col-span-7 text-sm font-mono font-bold text-[#0F1B33] dark:text-white tabular-nums text-right sm:text-left">
                  {member.member_code}
                </dd>
              </div>

              <div className="py-3.5 grid grid-cols-12 gap-2 items-center">
                <dt className="col-span-5 text-xs uppercase tracking-wider font-mono text-[#4E5E78] dark:text-[#9BB0CD]">
                  Blood Group
                </dt>
                <dd className="col-span-7 text-right sm:text-left">
                  <span className="inline-flex items-center gap-1.5 text-sm font-mono font-extrabold text-rose-600 dark:text-rose-400">
                    <Droplets className="w-4 h-4 shrink-0" />
                    <span>{member.blood_group || 'Not Listed'}</span>
                  </span>
                </dd>
              </div>

              <div className="py-3.5 grid grid-cols-12 gap-2 items-center">
                <dt className="col-span-5 text-xs uppercase tracking-wider font-mono text-[#4E5E78] dark:text-[#9BB0CD]">
                  Committee Wing
                </dt>
                <dd className="col-span-7 text-sm font-semibold text-[#0F1B33] dark:text-slate-100 text-right sm:text-left">
                  {isExecutive ? 'Executive Committee (নির্বাহী পরিষদ)' : 'General Member (সাধারণ সদস্য)'}
                </dd>
              </div>

              <div className="py-3.5 grid grid-cols-12 gap-2 items-center">
                <dt className="col-span-5 text-xs uppercase tracking-wider font-mono text-[#4E5E78] dark:text-[#9BB0CD]">
                  Chapter Location
                </dt>
                <dd className="col-span-7 text-sm font-medium text-[#0F1B33] dark:text-slate-200 inline-flex items-center justify-end sm:justify-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#D6AC62] shrink-0 hidden sm:inline" />
                  <span>Char Chanda Khasmahal Bazar, Shariatpur</span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Action Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] text-[#0F1B33] dark:text-white hover:border-[#1D4ED8] transition-colors cursor-pointer whitespace-nowrap"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Link Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#60A5FA]" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] text-[#0F1B33] dark:text-white hover:border-[#1D4ED8] transition-colors cursor-pointer whitespace-nowrap"
              >
                <Share2 className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#60A5FA]" />
                <span>Share Card</span>
              </button>
            </div>

            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white transition-colors whitespace-nowrap"
            >
              <span>Member Portal</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right: Sovereign Navy QR Verification Pass Plate */}
        <aside className="lg:col-span-5 bg-[#0F1B33] text-white p-6 sm:p-9 flex flex-col justify-between gap-7 border-t lg:border-t-0 lg:border-l border-[#18294A]">
          {/* Society Crest Header */}
          <div className="flex items-center gap-3 pb-5 border-b border-white/10">
            <img
              src={crestImage}
              alt="Bondhon 2017 Crest"
              referrerPolicy="no-referrer"
              className="w-11 h-11 rounded-full object-cover ring-2 ring-[#D6AC62]/70 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#D6AC62] font-bold">
                Bondhon 2017
              </p>
              <p className="text-sm font-bold text-white truncate">
                বন্ধুত্ব সমবায় সমিতি
              </p>
            </div>
          </div>

          {/* Crisp High-Contrast QR Plaque */}
          <div className="flex flex-col items-center text-center space-y-4 py-2">
            <div className="p-3 rounded-2xl bg-white shadow-[0_18px_40px_-14px_rgba(0,0,0,0.65)]">
              <MemberQrCode
                value={profileUrl}
                size={172}
                marginModules={4}
                label={`Verification QR code for ${member.full_name} (${member.member_code})`}
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-mono font-bold text-[#F0C56E] tracking-wide tabular-nums">
                {member.member_code}
              </p>
              <p className="text-xs text-slate-300 max-w-[24ch] mx-auto leading-relaxed">
                Scan this QR code with any camera to open {member.full_name}&apos;s live club credential.
              </p>
            </div>
          </div>

          {/* QR Utility & Privacy Footer */}
          <div className="space-y-3 pt-5 border-t border-white/10">
            <button
              type="button"
              onClick={handleDownloadQr}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-white/10 hover:bg-white/16 border border-white/15 text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-[#D6AC62]" />
              <span>Save QR Pass (PNG)</span>
            </button>

            <p className="text-[11px] text-center text-slate-400 leading-relaxed">
              Private member fields (DOB, father&apos;s name, contact &amp; shares) remain protected.
            </p>
          </div>
        </aside>
      </article>
    </PageTransition>
  );
};
