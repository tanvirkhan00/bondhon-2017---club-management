import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  subLabel?: string;
  icon?: LucideIcon;
  accent?: 'navy' | 'emerald' | 'gold' | 'rose';
  trend?: {
    positive?: boolean;
    text: string;
  };
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subValue,
  subLabel,
  icon: Icon,
  accent = 'emerald',
  trend,
}) => {
  const iconToneMap: Record<NonNullable<MetricCardProps['accent']>, string> = {
    navy: 'bg-[#14243A]/8 text-[#14243A] dark:bg-[#203650] dark:text-slate-200 border-[#14243A]/10 dark:border-[#2B4564]',
    emerald: 'bg-[#087F70]/10 text-[#087F70] dark:bg-[#087F70]/20 dark:text-[#34D399] border-[#087F70]/15',
    gold: 'bg-[#D6AC62]/15 text-[#9A7127] dark:bg-[#D6AC62]/20 dark:text-[#D6AC62] border-[#D6AC62]/25',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200/70 dark:border-rose-800/40',
  };

  return (
    <div className="surface-card surface-card-hover rounded-2xl p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-[#64748B] dark:text-slate-400">
          {label}
        </span>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${iconToneMap[accent]}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <div className="text-2xl sm:text-[26px] font-bold tracking-tight text-[#172435] dark:text-slate-100 font-mono tabular-nums leading-none">
          {value}
        </div>
        {subValue && (
          <span className="text-xs text-[#64748B] dark:text-slate-400 font-mono tabular-nums">
            {subValue}
          </span>
        )}
      </div>

      {(subLabel || trend) && (
        <div className="mt-3.5 pt-2.5 border-t border-[#E8EDF3] dark:border-[#1F2F46] flex items-center justify-between gap-2 text-xs text-[#64748B] dark:text-slate-400">
          {subLabel && <span className="truncate">{subLabel}</span>}
          {trend && (
            <span
              className={`font-semibold font-mono tabular-nums whitespace-nowrap ${
                trend.positive
                  ? 'text-[#087F70] dark:text-[#34D399]'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {trend.text}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
