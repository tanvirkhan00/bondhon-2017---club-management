import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  subLabel?: string;
  icon?: LucideIcon;
  accent?: 'navy' | 'sapphire' | 'emerald' | 'gold' | 'rose';
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
  accent = 'sapphire',
  trend,
}) => {
  const sapphireClass =
    'bg-[#1D4ED8]/10 text-[#1D4ED8] dark:bg-[#60A5FA]/15 dark:text-[#60A5FA]';
  const iconToneMap: Record<NonNullable<MetricCardProps['accent']>, string> = {
    navy: 'bg-[#0F1B33]/8 text-[#0F1B33] dark:bg-[#1E3254] dark:text-slate-200',
    sapphire: sapphireClass,
    emerald: sapphireClass,
    gold: 'bg-[#D6AC62]/15 text-[#92600A] dark:bg-[#D6AC62]/20 dark:text-[#F0C56E]',
    rose: 'bg-rose-500/10 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400',
  };

  return (
    <div className="surface-card surface-card-hover rounded-2xl p-4 sm:p-5 flex flex-col justify-between min-w-0">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-[#4E5E78] dark:text-[#9BB0CD] truncate">
          {label}
        </span>
        {Icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconToneMap[accent]}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2 min-w-0">
        <div className="text-2xl font-bold tracking-tight text-[#0F1B2E] dark:text-[#F3F6FC] font-mono tabular-nums leading-none truncate">
          {value}
        </div>
        {subValue && (
          <span className="text-xs text-[#4E5E78] dark:text-[#9BB0CD] font-mono tabular-nums shrink-0">
            {subValue}
          </span>
        )}
      </div>

      {(subLabel || trend) && (
        <div className="mt-3.5 pt-2.5 border-t border-[#DFE6F0] dark:border-[#233452] flex items-center justify-between gap-2 text-[11px] sm:text-xs text-[#4E5E78] dark:text-[#9BB0CD]">
          {subLabel && <span className="truncate">{subLabel}</span>}
          {trend && (
            <span
              className={`font-semibold font-mono tabular-nums whitespace-nowrap shrink-0 ${
                trend.positive
                  ? 'text-[#0369A1] dark:text-[#38BDF8]'
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
