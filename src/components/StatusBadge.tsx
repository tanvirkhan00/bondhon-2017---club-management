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
        return 'text-emerald-700 bg-emerald-50 border border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60';
      case 'partial':
        return 'text-amber-700 bg-amber-50 border border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60';
      case 'unpaid':
        return 'text-rose-700 bg-rose-50 border border-rose-200/70 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60';
      case 'active':
        return 'text-emerald-700 bg-emerald-50 border border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60';
      case 'inactive':
        return 'text-slate-600 bg-slate-100 border border-slate-200/70 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
      default:
        return 'text-slate-600 bg-slate-50 border border-slate-200';
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

  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md whitespace-nowrap tabular-nums ${pad} ${getStyle()}`}
    >
      {getLabel()}
    </span>
  );
};
