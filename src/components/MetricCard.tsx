import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  subLabel?: string;
  icon?: LucideIcon;
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
  trend,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between gap-3 text-slate-500 dark:text-slate-400">
        <span className="text-xs font-medium tracking-wide uppercase">{label}</span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono tabular-nums">
          {value}
        </div>
        {subValue && (
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {subValue}
          </span>
        )}
      </div>

      {(subLabel || trend) && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          {subLabel && <span>{subLabel}</span>}
          {trend && (
            <span
              className={`font-medium tabular-nums ${
                trend.positive
                  ? 'text-emerald-600 dark:text-emerald-400'
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
