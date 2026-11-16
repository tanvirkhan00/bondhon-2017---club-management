import React from 'react';
import { DueStatus, MemberStatus } from '../types/database';

interface StatusBadgeProps {
  status: DueStatus | MemberStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const normalized = status.toLowerCase();

  const getStyle = () => {
    switch (normalized) {
      case 'paid':
      case 'active':
        return 'text-[#087F70] bg-[#087F70]/10 border border-[#087F70]/25 dark:bg-[#087F70]/20 dark:text-[#34D399] dark:border-[#087F70]/40';
      case 'partial':
        return 'text-[#9A7127] bg-[#D6AC62]/15 border border-[#D6AC62]/40 dark:bg-[#D6AC62]/15 dark:text-[#D6AC62] dark:border-[#D6AC62]/30';
      case 'unpaid':
        return 'text-rose-700 bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60';
      case 'inactive':
        return 'text-[#64748B] bg-slate-100 border border-[#E8EDF3] dark:bg-[#162438] dark:text-slate-400 dark:border-[#1F2F46]';
      default:
        return 'text-[#64748B] bg-slate-50 border border-[#E8EDF3]';
    }
  };

  const getLabel = () => {
    switch (normalized) {
      case 'paid':
        return 'Paid';
      case 'partial':
        return 'Partial';
      case 'unpaid':
        return 'Unpaid';
      case 'active':
        return 'Active';
      case 'inactive':
        return 'Inactive';
      default:
        return status;
    }
  };

  const pad = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-md whitespace-nowrap tabular-nums leading-none ${pad} ${getStyle()}`}
    >
      {getLabel()}
    </span>
  );
};
