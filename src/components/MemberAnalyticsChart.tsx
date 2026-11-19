import React, { memo, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { Member, MemberFinancialSummary } from '../types';
import { calculateDueBreakdown, MonthlyDueWithMeta } from '../utils/fineCalculator';
import { formatBDT } from '../utils/formatters';
import { PieChart as PieChartIcon } from 'lucide-react';

interface MemberAnalyticsChartProps {
  member: Member;
  ledger: MonthlyDueWithMeta[];
  summary: MemberFinancialSummary;
}

interface ChartSlice {
  name: string;
  value: number;
  color: string;
  description: string;
}

const MemberChartTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ payload?: ChartSlice }>;
  totalMonths: number;
}> = ({ active, payload, totalMonths }) => {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0]?.payload;
  if (!item) return null;
  const pct = totalMonths > 0 ? ((item.value / totalMonths) * 100).toFixed(2).replace(/\.00$/, '') : '0';

  return (
    <div className="rounded-xl bg-[#09101D]/95 backdrop-blur-md border border-[#233452] shadow-xl px-3.5 py-2.5 text-xs text-[#F3F6FC]">
      <div className="flex items-center gap-2 font-bold text-white">
        <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: item.color }} />
        <span>{item.name}</span>
      </div>
      <div className="mt-1 font-mono tabular-nums text-[#38BDF8] font-bold">
        {item.value} {item.value === 1 ? 'month' : 'months'}{' '}
        <span className="text-[#9BB0CD] font-normal">({pct}%)</span>
      </div>
      <p className="text-[11px] text-[#9BB0CD] mt-0.5">{item.description}</p>
    </div>
  );
};

export const MemberAnalyticsChart: React.FC<MemberAnalyticsChartProps> = memo(
  ({ member, ledger, summary }) => {
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

    const analytics = useMemo(() => {
      const shares = member.shares_count || 1;
      let paidMonths = 0;
      let partialMonths = 0;
      let unpaidOnlyMonths = 0;

      ledger.forEach((d) => {
        const bd = calculateDueBreakdown(d, shares);
        if (d.status === 'paid' && bd.fineOutstanding === 0) {
          paidMonths += 1;
        } else if (Number(d.amount_paid || 0) > 0) {
          partialMonths += 1;
        } else {
          unpaidOnlyMonths += 1;
        }
      });

      const totalMonths = ledger.length;
      const totalUnpaidCombined = partialMonths + unpaidOnlyMonths;
      const completionNum = totalMonths > 0 ? (paidMonths / totalMonths) * 100 : 0;
      const completionLabel =
        totalMonths > 0 ? `${Number(completionNum.toFixed(2))}%` : '0%';

      const totalPaymentsMade = summary.totalPaid + summary.totalFinePaid;

      const slices: ChartSlice[] = [
        {
          name: 'Paid Months',
          value: paidMonths,
          color: '#1D4ED8',
          description: 'Fully settled monthly cycles',
        },
        ...(partialMonths > 0
          ? [
              {
                name: 'Partial Months',
                value: partialMonths,
                color: '#D6AC62',
                description: 'Partially settled or fine pending',
              },
            ]
          : []),
        {
          name: 'Unpaid Months',
          value: partialMonths > 0 ? unpaidOnlyMonths : totalUnpaidCombined,
          color: '#E11D48',
          description: 'Pending monthly installments',
        },
      ].filter((s) => s.value > 0);

      return {
        totalMonths,
        paidMonths,
        partialMonths,
        unpaidOnlyMonths,
        totalUnpaidCombined,
        completionNum,
        completionLabel,
        totalPaymentsMade,
        slices,
      };
    }, [member.shares_count, ledger, summary.totalPaid, summary.totalFinePaid]);

    const hoveredSlice = hoveredIdx !== null ? analytics.slices[hoveredIdx] : null;

    return (
      <section className="surface-card rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-[#DFE6F0] dark:border-[#233452]">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#0F1B2E] dark:text-[#F3F6FC] flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-[#1D4ED8] dark:text-[#60A5FA]" />
              <span>Contribution Analytics &amp; Payment Completion</span>
            </h2>
            <p className="text-xs text-[#4E5E78] dark:text-[#9BB0CD] mt-0.5">
              Verified monthly dues completion for {member.full_name} ({analytics.totalMonths}{' '}
              {analytics.totalMonths === 1 ? 'cycle' : 'cycles'})
            </p>
          </div>

          {analytics.totalMonths > 0 && (
            <span className="text-xs font-mono font-bold text-[#0369A1] dark:text-[#38BDF8] tabular-nums">
              Paid: {analytics.paidMonths} / {analytics.totalMonths} months ({analytics.completionLabel})
            </span>
          )}
        </div>

        {analytics.totalMonths === 0 || analytics.slices.length === 0 ? (
          <div className="py-10 px-4 text-center space-y-1.5">
            <p className="text-sm font-semibold text-[#0F1B2E] dark:text-[#F3F6FC]">
              No billing cycles recorded yet
            </p>
            <p className="text-xs text-[#4E5E78] dark:text-[#9BB0CD] max-w-md mx-auto">
              Payment analytics will appear here once monthly dues or contributions are recorded for{' '}
              {member.full_name}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-6">
            {/* Left: Interactive Donut Chart */}
            <div className="lg:col-span-5 relative h-56 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.slices}
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={88}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                    isAnimationActive={true}
                    animationDuration={550}
                    onMouseEnter={(_, idx) => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    {analytics.slices.map((entry, idx) => (
                      <Cell
                        key={`member-pie-${entry.name}`}
                        fill={entry.color}
                        opacity={hoveredIdx === null || hoveredIdx === idx ? 1 : 0.4}
                        className="transition-opacity duration-150 cursor-pointer"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<MemberChartTooltip totalMonths={analytics.totalMonths} />}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Metric Readout */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 text-center">
                <span className="text-2xl font-extrabold font-mono tabular-nums text-[#0F1B2E] dark:text-white leading-none">
                  {hoveredSlice ? `${hoveredSlice.value} mo` : analytics.completionLabel}
                </span>
                <span className="text-[11px] text-[#4E5E78] dark:text-[#9BB0CD] mt-1 truncate max-w-[104px]">
                  {hoveredSlice ? hoveredSlice.name : 'Completed'}
                </span>
              </div>
            </div>

            {/* Right: Legend + Compact Financial Breakdown */}
            <div className="lg:col-span-7 space-y-4">
              {/* Interactive Legend Rows */}
              <div className="divide-y divide-[#DFE6F0] dark:divide-[#233452] text-xs">
                {analytics.slices.map((slice, idx) => {
                  const pct =
                    analytics.totalMonths > 0
                      ? Number(((slice.value / analytics.totalMonths) * 100).toFixed(2))
                      : 0;
                  return (
                    <div
                      key={slice.name}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      className="py-2.5 flex items-center justify-between gap-3 cursor-default"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-3 h-3 rounded-xs shrink-0"
                          style={{ backgroundColor: slice.color }}
                        />
                        <div className="min-w-0">
                          <span className="font-semibold text-[#0F1B2E] dark:text-[#F3F6FC] block truncate">
                            {slice.name}
                          </span>
                          <span className="text-[11px] text-[#4E5E78] dark:text-[#9BB0CD] block truncate">
                            {slice.description}
                          </span>
                        </div>
                      </div>

                      <div className="text-right font-mono tabular-nums shrink-0">
                        <span className="font-bold text-[#0F1B2E] dark:text-white">
                          {slice.value} {slice.value === 1 ? 'month' : 'months'}
                        </span>
                        <span className="block text-[11px] text-[#4E5E78] dark:text-[#9BB0CD]">
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Compact 4-Stat Strip (Zero Card-in-Card Nesting) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#DFE6F0] dark:border-[#233452] text-xs">
                <div>
                  <span className="text-[11px] text-[#4E5E78] dark:text-[#9BB0CD] block">
                    Total Payments
                  </span>
                  <span className="font-mono font-bold text-[#0369A1] dark:text-[#38BDF8] tabular-nums mt-0.5 block">
                    {formatBDT(analytics.totalPaymentsMade)}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-[#4E5E78] dark:text-[#9BB0CD] block">
                    Outstanding Due
                  </span>
                  <span
                    className={`font-mono font-bold tabular-nums mt-0.5 block ${
                      summary.totalOutstanding > 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-[#0F1B2E] dark:text-slate-200'
                    }`}
                  >
                    {formatBDT(summary.totalOutstanding)}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-[#4E5E78] dark:text-[#9BB0CD] block">
                    Paid / Unpaid
                  </span>
                  <span className="font-mono font-bold text-[#0F1B2E] dark:text-[#F3F6FC] tabular-nums mt-0.5 block">
                    {analytics.paidMonths} / {analytics.totalUnpaidCombined} mos
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-[#4E5E78] dark:text-[#9BB0CD] block">
                    Completion
                  </span>
                  <span className="font-mono font-bold text-[#1D4ED8] dark:text-[#60A5FA] tabular-nums mt-0.5 block">
                    {analytics.completionLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }
);

MemberAnalyticsChart.displayName = 'MemberAnalyticsChart';
