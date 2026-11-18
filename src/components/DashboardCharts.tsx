import React, { memo, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Area,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { MonthSummary } from '../types';
import { formatBDT, getMonthName } from '../utils/formatters';

export interface YearlyCollectionItem {
  year: number;
  principal: number;
  fine: number;
  total: number;
}

interface CollectionTrendStudioProps {
  selectedYear: number;
  monthSummaries: MonthSummary[];
  monthlyFinesByMonth: number[];
  yearlyCollections: YearlyCollectionItem[];
}

interface TooltipPayloadItem {
  name?: string;
  value?: number;
  dataKey?: string;
  color?: string;
  payload?: {
    name: string;
    Collected?: number;
    Target?: number;
    Fines?: number;
    rate?: number;
    principal?: number;
    fine?: number;
    total?: number;
  };
}

const MonthlyCustomTooltip: React.FC<{
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  const collected = Number(row.Collected || 0);
  const target = Number(row.Target || 0);
  const fines = Number(row.Fines || 0);
  const rate = target > 0 ? Math.round((collected / target) * 100) : 0;
  const variance = collected - target;

  return (
    <div className="rounded-xl bg-[#09101D]/95 backdrop-blur-md border border-[#233452] shadow-xl px-3.5 py-2.5 text-xs text-[#F3F6FC] min-w-[190px]">
      <div className="flex items-center justify-between gap-4 pb-1.5 mb-1.5 border-b border-[#233452]">
        <span className="font-bold text-white">{label}</span>
        <span
          className={`font-mono font-bold tabular-nums ${
            rate >= 80 ? 'text-[#38BDF8]' : rate >= 50 ? 'text-[#F0C56E]' : 'text-rose-400'
          }`}
        >
          {rate}% attained
        </span>
      </div>

      <div className="space-y-1 font-mono tabular-nums">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-[#9BB0CD] font-sans">
            <span className="w-2 h-2 rounded-xs bg-[#2563EB]" />
            Collected
          </span>
          <span className="font-bold text-[#38BDF8]">{formatBDT(collected)}</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-[#9BB0CD] font-sans">
            <span className="w-2 h-2 rounded-xs bg-[#D6AC62]" />
            Target
          </span>
          <span className="font-semibold text-slate-200">{formatBDT(target)}</span>
        </div>

        {fines > 0 && (
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[#9BB0CD] font-sans">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
              Fines
            </span>
            <span className="font-semibold text-[#F0C56E]">+{formatBDT(fines)}</span>
          </div>
        )}

        <div className="pt-1 mt-1 border-t border-[#233452]/80 flex items-center justify-between gap-4 text-[11px]">
          <span className="text-[#9BB0CD] font-sans">Variance</span>
          <span className={variance >= 0 ? 'text-[#38BDF8] font-bold' : 'text-rose-400 font-semibold'}>
            {variance >= 0 ? `+${formatBDT(variance)}` : `-${formatBDT(Math.abs(variance))}`}
          </span>
        </div>
      </div>
    </div>
  );
};

const YearlyCustomTooltip: React.FC<{
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="rounded-xl bg-[#09101D]/95 backdrop-blur-md border border-[#233452] shadow-xl px-3.5 py-2.5 text-xs text-[#F3F6FC] min-w-[180px]">
      <div className="pb-1.5 mb-1.5 border-b border-[#233452] font-bold text-white">
        Fiscal Year {label}
      </div>
      <div className="space-y-1 font-mono tabular-nums">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-[#9BB0CD] font-sans">
            <span className="w-2 h-2 rounded-xs bg-[#2563EB]" />
            Monthly Dues
          </span>
          <span className="font-bold text-[#38BDF8]">{formatBDT(Number(row.principal || 0))}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-[#9BB0CD] font-sans">
            <span className="w-2 h-2 rounded-xs bg-[#D6AC62]" />
            Late Fines
          </span>
          <span className="font-semibold text-[#F0C56E]">{formatBDT(Number(row.fine || 0))}</span>
        </div>
        <div className="pt-1 mt-1 border-t border-[#233452]/80 flex items-center justify-between gap-4">
          <span className="text-[#9BB0CD] font-sans">Total Collected</span>
          <span className="font-extrabold text-white">{formatBDT(Number(row.total || 0))}</span>
        </div>
      </div>
    </div>
  );
};

export const CollectionTrendStudio: React.FC<CollectionTrendStudioProps> = memo(
  ({ selectedYear, monthSummaries, monthlyFinesByMonth, yearlyCollections }) => {
    const [chartView, setChartView] = useState<'monthly' | 'yearly'>('monthly');

    const monthlyData = useMemo(
      () =>
        monthSummaries.map((m, idx) => ({
          name: m.shortLabel,
          Target: m.target,
          Collected: m.collected,
          Fines: monthlyFinesByMonth[idx] || 0,
          rate: m.collectionRate,
        })),
      [monthSummaries, monthlyFinesByMonth]
    );

    const yearlyData = useMemo(
      () =>
        yearlyCollections.map((yr) => ({
          name: String(yr.year),
          principal: yr.principal,
          fine: yr.fine,
          total: yr.total,
        })),
      [yearlyCollections]
    );

    const annualSummary = useMemo(() => {
      let target = 0;
      let collected = 0;
      let peakMonth = '—';
      let peakAmount = 0;
      let activeMonths = 0;

      monthSummaries.forEach((m) => {
        target += m.target;
        collected += m.collected;
        if (m.collected > 0) activeMonths += 1;
        if (m.collected > peakAmount) {
          peakAmount = m.collected;
          peakMonth = m.shortLabel;
        }
      });

      const rate = target > 0 ? Math.round((collected / target) * 100) : 0;
      const avgMonthly = activeMonths > 0 ? Math.round(collected / activeMonths) : 0;
      const hasFines = monthlyFinesByMonth.some((f) => f > 0);
      const allTimeTotal = yearlyCollections.reduce((s, y) => s + y.total, 0);

      return { target, collected, rate, peakMonth, peakAmount, avgMonthly, hasFines, allTimeTotal };
    }, [monthSummaries, monthlyFinesByMonth, yearlyCollections]);

    return (
      <div className="xl:col-span-8 surface-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between min-w-0">
        {/* Top Header + Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-[#DFE6F0] dark:border-[#233452]">
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-[#0F1B2E] dark:text-[#F3F6FC]">
              {chartView === 'monthly'
                ? `Collection vs Target Analytics (${selectedYear})`
                : 'Multi-Year Collection History'}
            </h2>
            <p className="text-xs text-[#4E5E78] dark:text-[#9BB0CD] mt-0.5">
              {chartView === 'monthly'
                ? 'Monthly dues intake benchmarked against club collection horizon'
                : 'All-time annual principal dues and late fine comparison across fiscal years'}
            </p>
          </div>

          <div className="inline-flex items-center p-1 bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl self-start shrink-0">
            <button
              type="button"
              onClick={() => setChartView('monthly')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                chartView === 'monthly'
                  ? 'bg-white dark:bg-[#1D4ED8] text-[#0F1B2E] dark:text-white shadow-2xs'
                  : 'text-[#4E5E78] dark:text-[#9BB0CD] hover:text-[#0F1B2E] dark:hover:text-white'
              }`}
            >
              Monthly ({selectedYear})
            </button>
            <button
              type="button"
              onClick={() => setChartView('yearly')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                chartView === 'yearly'
                  ? 'bg-white dark:bg-[#1D4ED8] text-[#0F1B2E] dark:text-white shadow-2xs'
                  : 'text-[#4E5E78] dark:text-[#9BB0CD] hover:text-[#0F1B2E] dark:hover:text-white'
              }`}
            >
              Yearly History
            </button>
          </div>
        </div>

        {/* Inline KPI Strip & Legend (Zero-Pill Unboxed Style) */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3 text-xs">
          {chartView === 'monthly' ? (
            <>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono tabular-nums">
                <div>
                  <span className="text-[#4E5E78] dark:text-[#9BB0CD] mr-1.5 font-sans">Collected:</span>
                  <span className="font-bold text-[#0369A1] dark:text-[#38BDF8]">
                    {formatBDT(annualSummary.collected)}
                  </span>
                </div>
                <div>
                  <span className="text-[#4E5E78] dark:text-[#9BB0CD] mr-1.5 font-sans">Target:</span>
                  <span className="font-semibold text-[#0F1B2E] dark:text-slate-200">
                    {formatBDT(annualSummary.target)}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <span className="text-[#4E5E78] dark:text-[#9BB0CD] mr-1.5 font-sans">Avg/mo:</span>
                  <span className="font-semibold text-[#0F1B2E] dark:text-slate-200">
                    {formatBDT(annualSummary.avgMonthly)}
                  </span>
                </div>
                <div className="hidden md:block">
                  <span className="text-[#4E5E78] dark:text-[#9BB0CD] mr-1.5 font-sans">Peak:</span>
                  <span className="font-bold text-[#92600A] dark:text-[#F0C56E]">
                    {annualSummary.peakAmount > 0 ? `${annualSummary.peakMonth} (${formatBDT(annualSummary.peakAmount)})` : '—'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3.5 text-[11px] text-[#4E5E78] dark:text-[#9BB0CD]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-linear-to-b from-[#38BDF8] to-[#1D4ED8]" />
                  Collected
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 border-t-2 border-dashed border-[#D6AC62]" />
                  Target
                </span>
                {annualSummary.hasFines && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                    Fines
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono tabular-nums">
                <div>
                  <span className="text-[#4E5E78] dark:text-[#9BB0CD] mr-1.5 font-sans">All-Time Total:</span>
                  <span className="font-bold text-[#0369A1] dark:text-[#38BDF8]">
                    {formatBDT(annualSummary.allTimeTotal)}
                  </span>
                </div>
                <div>
                  <span className="text-[#4E5E78] dark:text-[#9BB0CD] mr-1.5 font-sans">Fiscal Years:</span>
                  <span className="font-semibold text-[#0F1B2E] dark:text-slate-200">
                    {yearlyData.length}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3.5 text-[11px] text-[#4E5E78] dark:text-[#9BB0CD]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#1D4ED8]" />
                  Monthly Dues
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#D6AC62]" />
                  Late Fines
                </span>
              </div>
            </>
          )}
        </div>

        {/* Main Chart Canvas */}
        <div className="h-64 sm:h-72 w-full mt-1">
          {chartView === 'monthly' ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="sapphireCollectedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#1D4ED8" stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="brassTargetAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D6AC62" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#D6AC62" stopOpacity={0.01} />
                  </linearGradient>
                </defs>

                <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="var(--text-secondary)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dy={4}
                />
                <YAxis
                  stroke="var(--text-secondary)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `৳${val >= 1000 ? `${Math.round(val / 1000)}k` : val}`}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(29, 78, 216, 0.08)' }}
                  content={<MonthlyCustomTooltip />}
                />
                <Area
                  type="monotone"
                  dataKey="Target"
                  stroke="#D6AC62"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  fill="url(#brassTargetAreaGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#D6AC62', strokeWidth: 0 }}
                />
                <Bar
                  dataKey="Collected"
                  fill="url(#sapphireCollectedGrad)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                />
                {annualSummary.hasFines && (
                  <Line
                    type="monotone"
                    dataKey="Fines"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#F59E0B', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#F0C56E' }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          ) : yearlyData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-[#4E5E78] dark:text-[#9BB0CD]">
              No historical yearly collections recorded yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="yearlyPrincipalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#1D4ED8" stopOpacity={0.88} />
                  </linearGradient>
                  <linearGradient id="yearlyFineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F0C56E" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#D6AC62" stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="var(--text-secondary)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={4}
                />
                <YAxis
                  stroke="var(--text-secondary)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `৳${val >= 1000 ? `${Math.round(val / 1000)}k` : val}`}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(29, 78, 216, 0.08)' }}
                  content={<YearlyCustomTooltip />}
                />
                <Bar
                  dataKey="principal"
                  stackId="yearCol"
                  fill="url(#yearlyPrincipalGrad)"
                  radius={[0, 0, 0, 0]}
                  maxBarSize={48}
                />
                <Bar
                  dataKey="fine"
                  stackId="yearCol"
                  fill="url(#yearlyFineGrad)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    );
  }
);

CollectionTrendStudio.displayName = 'CollectionTrendStudio';

interface SliceItem {
  name: string;
  value: number;
  color: string;
}

const PieTooltipBox: React.FC<{
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; payload?: SliceItem }>;
  unit?: 'members' | 'currency';
  total?: number;
}> = ({ active, payload, unit = 'currency', total = 0 }) => {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0]?.payload;
  if (!item) return null;
  const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;

  return (
    <div className="rounded-xl bg-[#09101D]/95 backdrop-blur-md border border-[#233452] shadow-xl px-3 py-2 text-xs text-[#F3F6FC]">
      <div className="flex items-center gap-2 font-semibold text-white">
        <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: item.color }} />
        <span>{item.name}</span>
      </div>
      <div className="mt-1 font-mono tabular-nums text-[#38BDF8] font-bold">
        {unit === 'members' ? `${item.value} members` : formatBDT(item.value)}{' '}
        <span className="text-[#9BB0CD] font-normal">({pct}%)</span>
      </div>
    </div>
  );
};

interface PeriodStatusDonutProps {
  selectedMonth: number;
  selectedYear: number;
  collectionRate: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
}

export const PeriodStatusDonut: React.FC<PeriodStatusDonutProps> = memo(
  ({ selectedMonth, selectedYear, collectionRate, paidCount, partialCount, unpaidCount }) => {
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

    const rows = useMemo<SliceItem[]>(
      () => [
        { name: 'Paid in Full', value: paidCount, color: '#2563EB' },
        { name: 'Partial', value: partialCount, color: '#D6AC62' },
        { name: 'Unpaid', value: unpaidCount, color: '#E11D48' },
      ],
      [paidCount, partialCount, unpaidCount]
    );

    const pieData = useMemo(() => rows.filter((r) => r.value > 0), [rows]);
    const totalMembers = paidCount + partialCount + unpaidCount;
    const hoveredSlice = hoveredIdx !== null ? pieData[hoveredIdx] : null;

    return (
      <div className="xl:col-span-4 surface-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between min-w-0">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-[#0F1B2E] dark:text-[#F3F6FC]">
            Payment Status Ratio
          </h2>
          <p className="text-xs text-[#4E5E78] dark:text-[#9BB0CD] mt-0.5">
            {getMonthName(selectedMonth)} {selectedYear} · {totalMembers} eligible members
          </p>
        </div>

        <div className="relative h-52 w-full my-2 flex items-center justify-center">
          {pieData.length === 0 ? (
            <div className="text-xs text-[#4E5E78] dark:text-[#9BB0CD] text-center">
              No dues generated for this month.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                    onMouseEnter={(_, idx) => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`status-${entry.name}`}
                        fill={entry.color}
                        opacity={hoveredIdx === null || hoveredIdx === index ? 1 : 0.4}
                        className="transition-opacity duration-150 cursor-pointer"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltipBox unit="members" total={totalMembers} />} />
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 text-center">
                <span className="text-2xl font-bold font-mono tabular-nums text-[#0F1B2E] dark:text-white leading-none">
                  {hoveredSlice ? hoveredSlice.value : `${collectionRate}%`}
                </span>
                <span className="text-[11px] text-[#4E5E78] dark:text-[#9BB0CD] mt-1 truncate max-w-[96px]">
                  {hoveredSlice ? hoveredSlice.name : 'Collected'}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="space-y-2 pt-3 border-t border-[#DFE6F0] dark:border-[#233452] text-xs">
          {rows.map((r) => {
            const pct = totalMembers > 0 ? Math.round((r.value / totalMembers) * 100) : 0;
            return (
              <div key={r.name} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[#4E5E78] dark:text-[#9BB0CD]">
                  <span
                    className="w-2.5 h-2.5 rounded-xs inline-block shrink-0"
                    style={{ backgroundColor: r.color }}
                  />
                  <span>{r.name}</span>
                </span>
                <span className="font-mono tabular-nums text-[#0F1B2E] dark:text-[#F3F6FC] font-bold">
                  {r.value}{' '}
                  <span className="text-[11px] font-normal text-[#4E5E78] dark:text-[#9BB0CD]">
                    ({pct}%)
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

PeriodStatusDonut.displayName = 'PeriodStatusDonut';

interface HistoryPieAnalyticsRowProps {
  currentBankBalance: number;
  cashInHandBalance: number;
  totalClubExpenses: number;
  totalBankCharges: number;
  totalClubPrincipalCollected: number;
  totalClubFineCollected: number;
  totalBankInterest: number;
  yearlyCollections: YearlyCollectionItem[];
}

const YEAR_PALETTE = ['#1D4ED8', '#0EA5E9', '#D6AC62', '#6366F1', '#14B8A6', '#F43F5E'];

export const HistoryPieAnalyticsRow: React.FC<HistoryPieAnalyticsRowProps> = memo(
  ({
    currentBankBalance,
    cashInHandBalance,
    totalClubExpenses,
    totalBankCharges,
    totalClubPrincipalCollected,
    totalClubFineCollected,
    totalBankInterest,
    yearlyCollections,
  }) => {
    const [fundHoverIdx, setFundHoverIdx] = useState<number | null>(null);
    const [historyHoverIdx, setHistoryHoverIdx] = useState<number | null>(null);
    const [historyMode, setHistoryMode] = useState<'years' | 'revenue'>('years');

    // Left Donut: All-Time Fund Position & Deduction History
    const fundSlices = useMemo<SliceItem[]>(
      () =>
        [
          { name: 'Sonali Bank Cash', value: Math.max(0, currentBankBalance), color: '#1D4ED8' },
          { name: 'Cash in Hand', value: Math.max(0, cashInHandBalance), color: '#0EA5E9' },
          { name: 'Club Expenses', value: Math.max(0, totalClubExpenses), color: '#D6AC62' },
          { name: 'Bank Fees & VAT', value: Math.max(0, totalBankCharges), color: '#E11D48' },
        ].filter((s) => s.value > 0),
      [currentBankBalance, cashInHandBalance, totalClubExpenses, totalBankCharges]
    );

    const fundTotal = useMemo(
      () => fundSlices.reduce((sum, s) => sum + s.value, 0),
      [fundSlices]
    );

    // Right Donut: Collection History by Fiscal Year OR All-Time Revenue Mix
    const yearSlices = useMemo<SliceItem[]>(
      () =>
        yearlyCollections
          .filter((y) => y.total > 0)
          .map((y, idx) => ({
            name: `FY ${y.year}`,
            value: y.total,
            color: YEAR_PALETTE[idx % YEAR_PALETTE.length],
          })),
      [yearlyCollections]
    );

    const revenueMixSlices = useMemo<SliceItem[]>(
      () =>
        [
          { name: 'Monthly Dues', value: totalClubPrincipalCollected, color: '#1D4ED8' },
          { name: 'Late Fines', value: totalClubFineCollected, color: '#D6AC62' },
          { name: 'Bank Interest', value: totalBankInterest, color: '#0EA5E9' },
        ].filter((s) => s.value > 0),
      [totalClubPrincipalCollected, totalClubFineCollected, totalBankInterest]
    );

    const activeHistorySlices = historyMode === 'years' ? yearSlices : revenueMixSlices;
    const activeHistoryTotal = useMemo(
      () => activeHistorySlices.reduce((sum, s) => sum + s.value, 0),
      [activeHistorySlices]
    );

    const hoveredFund = fundHoverIdx !== null ? fundSlices[fundHoverIdx] : null;
    const hoveredHistory = historyHoverIdx !== null ? activeHistorySlices[historyHoverIdx] : null;

    return (
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Card 1: Treasury Fund & Deduction History Donut */}
        <div className="lg:col-span-6 surface-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between min-w-0">
          <div className="pb-3 border-b border-[#DFE6F0] dark:border-[#233452]">
            <h2 className="text-sm sm:text-base font-bold text-[#0F1B2E] dark:text-[#F3F6FC]">
              Fund Allocation &amp; Expense History
            </h2>
            <p className="text-xs text-[#4E5E78] dark:text-[#9BB0CD] mt-0.5">
              Distribution across bank reserves, cash in hand, charges &amp; club outflows
            </p>
          </div>

          {fundSlices.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#4E5E78] dark:text-[#9BB0CD]">
              No fund history recorded yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-4 pt-4">
              <div className="sm:col-span-5 relative h-48 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={fundSlices}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={74}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                      onMouseEnter={(_, idx) => setFundHoverIdx(idx)}
                      onMouseLeave={() => setFundHoverIdx(null)}
                    >
                      {fundSlices.map((entry, index) => (
                        <Cell
                          key={`fund-${entry.name}`}
                          fill={entry.color}
                          opacity={fundHoverIdx === null || fundHoverIdx === index ? 1 : 0.4}
                          className="transition-opacity duration-150 cursor-pointer"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltipBox unit="currency" total={fundTotal} />} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-2 text-center">
                  <span className="text-xs sm:text-sm font-bold font-mono tabular-nums text-[#0F1B2E] dark:text-white leading-tight">
                    {hoveredFund
                      ? `${fundTotal > 0 ? Math.round((hoveredFund.value / fundTotal) * 100) : 0}%`
                      : formatBDT(fundTotal)}
                  </span>
                  <span className="text-[10px] text-[#4E5E78] dark:text-[#9BB0CD] mt-0.5 truncate max-w-[84px]">
                    {hoveredFund ? hoveredFund.name : 'Gross Tracked'}
                  </span>
                </div>
              </div>

              <div className="sm:col-span-7 divide-y divide-[#DFE6F0] dark:divide-[#233452] text-xs">
                {fundSlices.map((item, idx) => {
                  const pct = fundTotal > 0 ? ((item.value / fundTotal) * 100).toFixed(1) : '0.0';
                  return (
                    <div
                      key={item.name}
                      onMouseEnter={() => setFundHoverIdx(idx)}
                      onMouseLeave={() => setFundHoverIdx(null)}
                      className="py-2.5 flex items-center justify-between gap-3 cursor-default"
                    >
                      <span className="flex items-center gap-2 min-w-0 text-[#4E5E78] dark:text-[#9BB0CD]">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate font-medium text-[#0F1B2E] dark:text-slate-200">
                          {item.name}
                        </span>
                      </span>
                      <span className="font-mono tabular-nums font-bold text-[#0F1B2E] dark:text-[#F3F6FC] shrink-0">
                        {formatBDT(item.value)}{' '}
                        <span className="text-[11px] font-normal text-[#4E5E78] dark:text-[#9BB0CD]">
                          ({pct}%)
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Multi-Year Collection & Revenue Source History Donut */}
        <div className="lg:col-span-6 surface-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between min-w-0">
          <div className="pb-3 border-b border-[#DFE6F0] dark:border-[#233452] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-[#0F1B2E] dark:text-[#F3F6FC]">
                Historical Collection &amp; Revenue Mix
              </h2>
              <p className="text-xs text-[#4E5E78] dark:text-[#9BB0CD] mt-0.5">
                {historyMode === 'years'
                  ? 'Cumulative member collections split by fiscal year'
                  : 'All-time club inflows split by dues, fines & bank interest'}
              </p>
            </div>

            <div className="inline-flex items-center p-1 bg-[#EFF3F9] dark:bg-[#17243C] border border-[#DFE6F0] dark:border-[#233452] rounded-xl self-start shrink-0">
              <button
                type="button"
                onClick={() => {
                  setHistoryMode('years');
                  setHistoryHoverIdx(null);
                }}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  historyMode === 'years'
                    ? 'bg-white dark:bg-[#1D4ED8] text-[#0F1B2E] dark:text-white shadow-2xs'
                    : 'text-[#4E5E78] dark:text-[#9BB0CD] hover:text-[#0F1B2E] dark:hover:text-white'
                }`}
              >
                By Year
              </button>
              <button
                type="button"
                onClick={() => {
                  setHistoryMode('revenue');
                  setHistoryHoverIdx(null);
                }}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  historyMode === 'revenue'
                    ? 'bg-white dark:bg-[#1D4ED8] text-[#0F1B2E] dark:text-white shadow-2xs'
                    : 'text-[#4E5E78] dark:text-[#9BB0CD] hover:text-[#0F1B2E] dark:hover:text-white'
                }`}
              >
                Revenue Mix
              </button>
            </div>
          </div>

          {activeHistorySlices.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#4E5E78] dark:text-[#9BB0CD]">
              No collection history recorded yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-4 pt-4">
              <div className="sm:col-span-5 relative h-48 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={activeHistorySlices}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={74}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                      onMouseEnter={(_, idx) => setHistoryHoverIdx(idx)}
                      onMouseLeave={() => setHistoryHoverIdx(null)}
                    >
                      {activeHistorySlices.map((entry, index) => (
                        <Cell
                          key={`hist-${entry.name}`}
                          fill={entry.color}
                          opacity={historyHoverIdx === null || historyHoverIdx === index ? 1 : 0.4}
                          className="transition-opacity duration-150 cursor-pointer"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={<PieTooltipBox unit="currency" total={activeHistoryTotal} />}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-2 text-center">
                  <span className="text-xs sm:text-sm font-bold font-mono tabular-nums text-[#0F1B2E] dark:text-white leading-tight">
                    {hoveredHistory
                      ? `${
                          activeHistoryTotal > 0
                            ? Math.round((hoveredHistory.value / activeHistoryTotal) * 100)
                            : 0
                        }%`
                      : formatBDT(activeHistoryTotal)}
                  </span>
                  <span className="text-[10px] text-[#4E5E78] dark:text-[#9BB0CD] mt-0.5 truncate max-w-[84px]">
                    {hoveredHistory
                      ? hoveredHistory.name
                      : historyMode === 'years'
                      ? 'Member Total'
                      : 'Gross Inflow'}
                  </span>
                </div>
              </div>

              <div className="sm:col-span-7 divide-y divide-[#DFE6F0] dark:divide-[#233452] text-xs">
                {activeHistorySlices.map((item, idx) => {
                  const pct =
                    activeHistoryTotal > 0
                      ? ((item.value / activeHistoryTotal) * 100).toFixed(1)
                      : '0.0';
                  return (
                    <div
                      key={item.name}
                      onMouseEnter={() => setHistoryHoverIdx(idx)}
                      onMouseLeave={() => setHistoryHoverIdx(null)}
                      className="py-2.5 flex items-center justify-between gap-3 cursor-default"
                    >
                      <span className="flex items-center gap-2 min-w-0 text-[#4E5E78] dark:text-[#9BB0CD]">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate font-medium text-[#0F1B2E] dark:text-slate-200">
                          {item.name}
                        </span>
                      </span>
                      <span className="font-mono tabular-nums font-bold text-[#0F1B2E] dark:text-[#F3F6FC] shrink-0">
                        {formatBDT(item.value)}{' '}
                        <span className="text-[11px] font-normal text-[#4E5E78] dark:text-[#9BB0CD]">
                          ({pct}%)
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }
);

HistoryPieAnalyticsRow.displayName = 'HistoryPieAnalyticsRow';
