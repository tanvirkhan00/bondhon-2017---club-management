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
        return 'text-[#0369A1] bg-[#0369A1]/10 border border-[#0369A1]/25 dark:bg-[#38BDF8]/15 dark:text-[#38BDF8] dark:border-[#38BDF8]/35';
      case 'partial':
        return 'text-[#92600A] bg-[#D6AC62]/15 border border-[#D6AC62]/40 dark:bg-[#D6AC62]/15 dark:text-[#F0C56E] dark:border-[#D6AC62]/30';
      case 'unpaid':
        return 'text-rose-700 bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60';
      case 'inactive':
        return 'text-[#4E5E78] bg-slate-100 border border-[#DFE6F0] dark:bg-[#17243C] dark:text-[#9BB0CD] dark:border-[#233452]';
      default:
        return 'text-[#4E5E78] bg-slate-50 border border-[#DFE6F0]';
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
