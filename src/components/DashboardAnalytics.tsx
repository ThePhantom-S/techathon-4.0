import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  AlertTriangle,
  Database,
  Building2,
  Upload,
  Sparkles,
} from 'lucide-react';
import { IndustryProfile, SimulationResult } from '../types';
import { formatINR } from '../engine/calculator';
import { WorkingCapitalPanel } from './WorkingCapitalPanel';
import { BreachProbabilityGauge } from './BreachProbabilityGauge';
import { HorizonCards } from './HorizonCards';
import { Skeleton, DashboardSkeleton } from './ui/Skeleton';
import { IndustryKPICards } from './IndustryKPICards';

export type DashboardTab = 'overview' | 'risk-map' | 'inflows' | 'outflows';

interface DashboardAnalyticsProps {
  simulationResult: SimulationResult;
  cashFloor: number;
  isLoading?: boolean;
  activeSubTab?: string;
  supplierDelayDays?: number;
  industryProfile?: IndustryProfile;
  businessName?: string;
  currentTab?: DashboardTab;
  onTabChange?: (tab: DashboardTab) => void;
  hasData?: boolean;
  onOpenConnector?: () => void;
  onOpenCsvUpload?: () => void;
  onLoadSampleData?: () => void;
}

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0A0A0A] border border-[#222222] rounded-xl p-3 text-xs font-mono shadow-xl text-[#EDEDED]">
        <p className="text-[#71717A] mb-1 font-medium">{label} 2026</p>
        <p className="text-[#22C55E] font-medium">Inflow: ₹{payload[0]?.value}L</p>
        <p className="text-[#EF4444] font-medium">Outflow: ₹{payload[1]?.value}L</p>
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0A0A0A] border border-[#222222] rounded-xl p-3 text-xs font-mono shadow-xl text-[#EDEDED]">
        <p className="font-medium">{payload[0].name}</p>
        <p className="text-[#EDEDED] font-semibold">₹{payload[0].value.toFixed(1)}L</p>
      </div>
    );
  }
  return null;
};

export const DashboardAnalytics: React.FC<DashboardAnalyticsProps> = ({
  simulationResult,
  cashFloor,
  isLoading = false,
  industryProfile,
  businessName = 'Shakti Electronics',
  currentTab: controlledTab,
  onTabChange,
  hasData = true,
  onOpenConnector,
  onOpenCsvUpload,
  onLoadSampleData,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [internalTab, setInternalTab] = useState<DashboardTab>('overview');
  const currentTab = controlledTab ?? internalTab;
  const setCurrentTab = onTabChange ?? setInternalTab;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (hasData === false) {
    return (
      <div className="space-y-6 font-sans">
        {/* Empty State Hero */}
        <div
          className={`p-8 md:p-10 rounded-2xl border text-center relative overflow-hidden transition-all duration-200 ${
            isLight
              ? 'bg-white border-slate-200 shadow-xs'
              : 'bg-[#0A0A0A] border-zinc-800'
          }`}
        >
          <div className="max-w-xl mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 mx-auto flex items-center justify-center">
              <Database className="w-7 h-7" />
            </div>

            <div>
              <h2 className={`text-2xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                No Financial Data Connected
              </h2>
              <p className={`text-sm mt-2 leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Connect your accounting platform or upload a ledger CSV to unlock cash runway forecasts, Monte Carlo stress testing, and supplier shock simulations.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {onOpenConnector && (
                <button
                  onClick={onOpenConnector}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all cursor-pointer flex items-center gap-2 shadow-xs active:scale-95"
                >
                  <Building2 className="w-4 h-4" />
                  Connect Accounting (Zoho / QuickBooks)
                </button>
              )}
              {onOpenCsvUpload && (
                <button
                  onClick={onOpenCsvUpload}
                  className={`px-4 py-2.5 rounded-xl border font-semibold text-xs transition-all cursor-pointer flex items-center gap-2 active:scale-95 ${
                    isLight
                      ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
                      : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Upload CSV Ledger
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Feature Preview Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0A0A0A] border-zinc-800'}`}>
            <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-500 font-semibold">Simulation</span>
            <h3 className="font-semibold text-sm mt-1">90-Day Liquidity Forecast</h3>
            <p className={`text-xs mt-1 leading-relaxed ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Daily projected bank balance vs safety floor thresholds with breach warnings.
            </p>
          </div>
          <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0A0A0A] border-zinc-800'}`}>
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-500 font-semibold">Probability</span>
            <h3 className="font-semibold text-sm mt-1">Monte Carlo Risk Paths</h3>
            <p className={`text-xs mt-1 leading-relaxed ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              1,000 stochastic trials computing P10 (pessimistic) and P90 cash positions.
            </p>
          </div>
          <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0A0A0A] border-zinc-800'}`}>
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-500 font-semibold">Analytics</span>
            <h3 className="font-semibold text-sm mt-1">Working Capital Engine</h3>
            <p className={`text-xs mt-1 leading-relaxed ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              DSO, DPO, and DSI metrics with quick ratio and liquidity health scores.
            </p>
          </div>
          <div className={`p-4 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0A0A0A] border-zinc-800'}`}>
            <span className="text-[10px] font-mono uppercase tracking-wider text-purple-500 font-semibold">Stress Test</span>
            <h3 className="font-semibold text-sm mt-1">Supplier Delay Shock</h3>
            <p className={`text-xs mt-1 leading-relaxed ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Interactive sliders simulating supplier late deliveries and counterfactuals.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const {
    currentCash,
    minProjectedCash,
    hasBreach,
    p10Cash,
    p50Cash,
    p90Cash,
    workingCapital,
    horizons,
    daysUntilBreach,
    driverAnalysis,
    earliestBreachDate,
  } = simulationResult;


  const rawBreachProb =
    simulationResult.breachProbability > 1
      ? simulationResult.breachProbability
      : simulationResult.breachProbability * 100;
  const breachProbability = Math.min(84, Math.max(0, Math.round(rawBreachProb)));

  // Build dynamic monthly cashflow bars from simulation dailyPoints
  const monthlyDataMap = new Map<string, { month: string; inflow: number; outflow: number }>();
  
  // Seed first 3 forecast months from dailyPoints
  if (simulationResult?.dailyPoints?.length) {
    simulationResult.dailyPoints.forEach((pt) => {
      const d = new Date(pt.date);
      const monthName = d.toLocaleString('en-US', { month: 'short' });
      if (!monthlyDataMap.has(monthName) && monthlyDataMap.size < 3) {
        monthlyDataMap.set(monthName, { month: monthName, inflow: 0, outflow: 0 });
      }
      if (monthlyDataMap.has(monthName)) {
        const item = monthlyDataMap.get(monthName)!;
        item.inflow += (pt.inflow || 0) / 100000;
        item.outflow += (pt.outflow || 0) / 100000;
      }
    });
  }

  const chartData = monthlyDataMap.size > 0 
    ? Array.from(monthlyDataMap.values()).map((m) => ({
        month: m.month,
        inflow: parseFloat(m.inflow.toFixed(1)),
        outflow: parseFloat(m.outflow.toFixed(1)),
      }))
    : [
        { month: 'Month 1', inflow: 0, outflow: 0 },
        { month: 'Month 2', inflow: 0, outflow: 0 },
        { month: 'Month 3', inflow: 0, outflow: 0 },
      ];

  const hasAnyChartData = chartData.some((d) => d.inflow > 0 || d.outflow > 0);

  // Build real outflow pie from driver analysis
  const outflowPieData = driverAnalysis.topOutflows.slice(0, 6).map((d, i) => {
    const colors = ['#6366F1', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899'];
    return {
      name: d.entity.split(' ')[0],
      value: parseFloat((d.amount / 100000).toFixed(1)),
      color: colors[i % colors.length],
    };
  });

  // Recent activity from transactions + payables
  const recentActivity = [
    ...(simulationResult.driverAnalysis?.topOutflows || []).slice(0, 4).map((d: any) => ({
      label: d.entity || d.supplier || 'Vendor Bill',
      date: d.date?.substring(5) || d.due_date?.substring(5) || 'Due Soon',
      amount: '-' + formatINR(Number(d.amount || 0)),
      type: 'outflow' as const,
      status: d.statusTag === 'CRITICAL' ? 'CRITICAL' : 'DUE',
    })),
    ...(simulationResult.driverAnalysis?.topInflows || []).slice(0, 4).map((d: any) => ({
      label: d.customer || d.entity || 'Sales Invoice',
      date: d.date?.substring(5) || d.expected_payment_date?.substring(5) || 'Expected',
      amount: '+' + formatINR(Number(d.amount || 0)),
      type: 'inflow' as const,
      status: d.statusTag?.includes('DELAYED') ? 'DELAYED' : 'PENDING',
    })),
  ];

  const topInflows = driverAnalysis.topInflows || [];
  const totalInflowVal = topInflows.reduce((s, t) => s + t.amount, 0);

  const topOutflows = driverAnalysis.topOutflows || [];
  const totalOutflowVal = topOutflows.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6 font-sans">
      {/* ── PAGE TITLE HEADER ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className={`text-xl font-bold tracking-tight flex items-center gap-2 ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            <LayoutDashboard className="w-5 h-5 text-indigo-500" />
            FlowShield — Financial Command Center
          </h2>
          <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
            Real-time liquidity forecasting, shock simulations, and operational risk metrics for {businessName}.
            {industryProfile ? ` ${industryProfile.name} business model.` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className={`px-3 py-1 rounded-full border font-bold transition-all duration-200 ${
            hasBreach 
              ? 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]' 
              : 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]'
          }`}>
            {hasBreach ? 'CRITICAL BREACH' : 'STABLE'}
          </span>
        </div>
      </div>

      {/* ── TAB 1: OVERVIEW ───────────────────────────────────────────── */}
      {currentTab === 'overview' && (
        <div className="space-y-6">
          {/* 4-COLUMN KPI ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Total Cash */}
            <div className={`p-5 rounded-2xl border transition-all duration-200 ease-out hover:-translate-y-0.5 ${
              isLight ? 'bg-white border-slate-200 text-slate-900 shadow-xs hover:border-indigo-300' : 'bg-[#0c0c12] border-zinc-800/80 text-white hover:border-indigo-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Total Opening Cash</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30 font-bold">
                  REAL-TIME
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className={`text-2xl font-bold font-mono tracking-tight ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
                  {isLoading ? <Skeleton className="h-7 w-32 inline-block" /> : formatINR(currentCash)}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Baseline Operational Buffer</span>
              </div>
            </div>

            {/* KPI 2: Projected Min Liquidity */}
            <div className={`p-5 rounded-2xl border transition-all duration-200 ease-out hover:-translate-y-0.5 ${
              isLight ? 'bg-white border-slate-200 text-slate-900 shadow-xs hover:border-slate-300' : 'bg-[#0c0c12] border-zinc-800/80 text-white hover:border-zinc-700'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Min. Projected (90D)</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                  hasBreach 
                    ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30' 
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
                }`}>
                  FLOOR: {formatINR(cashFloor)}
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className={`text-2xl font-bold font-mono tracking-tight ${hasBreach ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {isLoading ? <Skeleton className="h-7 w-32 inline-block" /> : formatINR(minProjectedCash)}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs font-medium">
                {hasBreach ? (
                  <span className="text-red-600 dark:text-red-400 flex items-center gap-1 font-semibold">
                    <ArrowDownRight className="w-3.5 h-3.5" /> Floor Breach on {earliestBreachDate}
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" /> Above Safety Floor
                  </span>
                )}
              </div>
            </div>

            {/* KPI 3: Risk Score / Breach Probability */}
            <div className={`p-5 rounded-2xl border transition-all duration-200 ease-out hover:-translate-y-0.5 ${
              isLight ? 'bg-white border-slate-200 text-slate-900 shadow-xs hover:border-slate-300' : 'bg-[#0c0c12] border-zinc-800/80 text-white hover:border-zinc-700'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Breach Risk Score</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                  breachProbability > 40 
                    ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30' 
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
                }`}>
                  STOCHASTIC
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className={`text-2xl font-bold font-mono tracking-tight ${
                  breachProbability > 50 ? 'text-red-600 dark:text-red-400' : breachProbability > 20 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {isLoading ? <Skeleton className="h-7 w-20 inline-block" /> : `${breachProbability}%`}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs font-medium">
                <span className={isLight ? 'text-slate-600' : 'text-zinc-400'}>
                  Worst-Case Reserve: {isLoading ? <Skeleton className="h-3 w-16 inline-block" /> : <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{formatINR(p10Cash)}</span>}
                </span>
              </div>
            </div>

            {/* KPI 4: Exposure / Days Until Breach */}
            <div className={`p-5 rounded-2xl border transition-all duration-200 ease-out hover:-translate-y-0.5 ${
              isLight ? 'bg-white border-slate-200 text-slate-900 shadow-xs hover:border-slate-300' : 'bg-[#0c0c12] border-zinc-800/80 text-white hover:border-zinc-700'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Breach Horizon</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30 font-bold">
                  STRESS TEST
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className={`text-2xl font-bold font-mono tracking-tight ${hasBreach ? 'text-purple-600 dark:text-purple-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {isLoading ? <Skeleton className="h-7 w-24 inline-block" /> : (daysUntilBreach !== null ? `${daysUntilBreach} Days` : 'No Breach')}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs font-medium">
                <span className={isLight ? 'text-slate-600' : 'text-zinc-400'}>
                  {hasBreach ? 'Supplier delay shock active' : 'Sufficient liquidity buffer'}
                </span>
              </div>
            </div>
          </div>

          {/* MAIN CASH FLOW FORECAST & UPCOMING SCHEDULE ROW */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Monthly Cash Flow Bar Chart */}
            <div className={`lg:col-span-7 p-6 rounded-2xl border ${
              isLight ? 'bg-white border-slate-200 text-slate-900 shadow-xs' : 'bg-[#0c0c12] border-zinc-800/80 text-white'
            }`}>
              <div className={`flex items-center justify-between border-b pb-3 mb-4 ${isLight ? 'border-slate-100' : 'border-zinc-800/60'}`}>
                <div>
                  <h3 className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Monthly Cash Flow Comparison
                  </h3>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Inflow vs Outflow (₹Lakhs)</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] inline-block" />Inflow</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] inline-block" />Outflow</span>
                </div>
              </div>
              <div className="h-[250px] w-full relative">
                {!hasAnyChartData && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <span className={`text-xs font-mono px-3 py-1.5 rounded-lg border ${
                      isLight ? 'bg-white/90 border-slate-200 text-slate-500 shadow-xs' : 'bg-zinc-900/90 border-zinc-800 text-zinc-400'
                    }`}>
                      No cash flow activity in projected months
                    </span>
                  </div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barGap={6} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <XAxis
                      dataKey="month"
                      tick={{ fill: isLight ? '#64748B' : '#A1A1AA', fontSize: 11, fontFamily: 'monospace' }}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => `₹${v}L`}
                      tick={{ fill: isLight ? '#64748B' : '#A1A1AA', fontSize: 10, fontFamily: 'monospace' }}
                      axisLine={false} tickLine={false}
                    />
                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="inflow" radius={[6, 6, 0, 0]} maxBarSize={36}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.outflow > entry.inflow ? '#EAB308' : '#22C55E'} />
                      ))}
                    </Bar>
                    <Bar dataKey="outflow" radius={[6, 6, 0, 0]} maxBarSize={36}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill="#EF4444" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Upcoming Cash Events */}
            <div className={`lg:col-span-5 p-6 rounded-2xl border ${
              isLight ? 'bg-white border-slate-200 text-slate-900 shadow-xs' : 'bg-[#0c0c12] border-zinc-800/80 text-white'
            }`}>
              <div className={`flex items-center justify-between border-b pb-3 mb-3 ${isLight ? 'border-slate-100' : 'border-zinc-800/60'}`}>
                <div>
                  <h3 className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Upcoming Cash Events
                  </h3>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Next 30 Days Forecast</p>
                </div>
                <span className={`text-xs font-mono px-2 py-0.5 rounded-md border ${
                  hasBreach ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400' : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300'
                }`}>
                  {recentActivity.length} Events
                </span>
              </div>
              <div className="space-y-2.5">
                {recentActivity.length > 0 ? (
                  recentActivity.slice(0, 5).map((item, i) => (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all duration-150 ${
                      isLight ? 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70' : 'bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-800/60'
                    }`}>
                      <div className="flex items-center gap-2.5 truncate">
                        <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full border ${
                          item.status === 'CRITICAL' ? 'text-red-600 border-red-200 bg-red-50 dark:bg-red-500/15 dark:border-red-500/30 dark:text-red-400'
                          : item.status === 'DELAYED' ? 'text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-400'
                          : 'text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-400'
                        }`}>{item.status}</span>
                        <span className={`truncate font-medium ${isLight ? 'text-slate-900' : 'text-white'}`}>{item.label}</span>
                      </div>
                      <div className="text-right shrink-0 ml-2 font-mono">
                        <span className={`font-semibold ${item.type === 'inflow' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{item.amount}</span>
                        <span className={`block text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>{item.date}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={`p-6 rounded-xl border border-dashed text-center ${
                    isLight ? 'border-slate-200 text-slate-500' : 'border-zinc-800 text-zinc-400'
                  }`}>
                    <p className="text-xs font-mono">No imminent invoice or payable events scheduled</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* WORKING CAPITAL */}
          <WorkingCapitalPanel
            dso={workingCapital.dso}
            dio={workingCapital.dio}
            dpo={workingCapital.dpo}
            ccc={workingCapital.ccc}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* ── TAB 2: RISK MAP ───────────────────────────────────────────── */}
      {currentTab === 'risk-map' && (
        <div className="space-y-6">
          {/* Risk KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-5 rounded-2xl border ${isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'}`}>
              <span className={`text-xs font-medium ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>Breach Probability</span>
              <div className="mt-2 text-2xl font-semibold font-mono text-[#EF4444]">{breachProbability}%</div>
              <span className={`text-xs mt-1 block ${isLight ? 'text-slate-500' : 'text-[#A1A1AA]'}`}>Monte Carlo Simulation</span>
            </div>
            <div className={`p-5 rounded-2xl border ${isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'}`}>
              <span className={`text-xs font-medium ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>P10 Worst-Case Downside</span>
              <div className="mt-2 text-2xl font-semibold font-mono text-[#EAB308]">{formatINR(p10Cash)}</div>
              <span className={`text-xs mt-1 block ${isLight ? 'text-slate-500' : 'text-[#A1A1AA]'}`}>10th Percentile Reserve</span>
            </div>
            <div className={`p-5 rounded-2xl border ${isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'}`}>
              <span className={`text-xs font-medium ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>Earliest Breach Date</span>
              <div className="mt-2 text-xl font-semibold font-mono text-[#EF4444]">{earliestBreachDate}</div>
              <span className={`text-xs mt-1 block ${isLight ? 'text-slate-500' : 'text-[#A1A1AA]'}`}>{daysUntilBreach !== null ? `${daysUntilBreach} days from start` : 'Safe'}</span>
            </div>
            <div className={`p-5 rounded-2xl border ${isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'}`}>
              <span className={`text-xs font-medium ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>Cash Conversion Velocity</span>
              <div className="mt-2 text-2xl font-semibold font-mono">{workingCapital.ccc} Days</div>
              <span className={`text-xs mt-1 block ${isLight ? 'text-slate-500' : 'text-[#A1A1AA]'}`}>DSO ({workingCapital.dso}d) + DIO ({workingCapital.dio}d) - DPO ({workingCapital.dpo}d)</span>
            </div>
          </div>

          {/* Gauge & Horizon Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5">
              <BreachProbabilityGauge
                breachProbability={breachProbability}
                p10Cash={p10Cash}
                p50Cash={p50Cash}
                p90Cash={p90Cash}
                cashFloor={cashFloor}
                daysUntilBreach={daysUntilBreach}
                hasBreach={hasBreach}
                isLoading={isLoading}
              />
            </div>
            <div className="lg:col-span-7">
              <HorizonCards horizons={horizons} cashFloor={cashFloor} isLoading={isLoading} />
            </div>
          </div>

          {/* High-Risk Commitments & Exposure Table */}
          <div className={`p-5 rounded-2xl border ${isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'}`}>
            <h3 className="text-sm font-semibold mb-3 font-mono uppercase tracking-wider">High Risk Transactions &amp; Commitment Exposure</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-left">
                <thead>
                  <tr className={`border-b ${isLight ? 'border-slate-200 text-slate-500' : 'border-zinc-800 text-zinc-400'}`}>
                    <th className="py-2.5 px-3">Entity / Description</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Due / Payment Date</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Risk Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((act, i) => (
                    <tr key={i} className={`border-b ${isLight ? 'border-slate-100' : 'border-zinc-900'}`}>
                      <td className="py-2.5 px-3 font-semibold">{act.label}</td>
                      <td className="py-2.5 px-3">{act.type === 'inflow' ? 'Customer Collection' : 'Supplier Payable'}</td>
                      <td className="py-2.5 px-3">{act.date}</td>
                      <td className={`py-2.5 px-3 font-bold ${act.type === 'inflow' ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>{act.amount}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] border ${
                          act.status === 'CRITICAL' ? 'bg-red-500/10 text-red-500 border-red-500/30' :
                          act.status === 'DELAYED' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' :
                          'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                        }`}>
                          {act.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: INFLOWS ───────────────────────────────────────────── */}
      {currentTab === 'inflows' && (
        <div className="space-y-6">
          {/* Inflow Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-5 rounded-2xl border ${isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'}`}>
              <span className={`text-xs font-medium ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>Total Expected AR Inflows</span>
              <div className="mt-2 text-2xl font-semibold font-mono text-emerald-500">{formatINR(totalInflowVal)}</div>
              <span className={`text-xs mt-1 block ${isLight ? 'text-slate-500' : 'text-[#A1A1AA]'}`}>Scheduled Collections</span>
            </div>
            <div className={`p-5 rounded-2xl border ${isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'}`}>
              <span className={`text-xs font-medium ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>Avg Collection Probability</span>
              <div className="mt-2 text-2xl font-semibold font-mono text-emerald-500">92.5%</div>
              <span className={`text-xs mt-1 block ${isLight ? 'text-slate-500' : 'text-[#A1A1AA]'}`}>Weighted Aging Score</span>
            </div>
            <div className={`p-5 rounded-2xl border ${isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'}`}>
              <span className={`text-xs font-medium ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>DSO (Days Sales Outstanding)</span>
              <div className="mt-2 text-2xl font-semibold font-mono">{workingCapital.dso} Days</div>
              <span className={`text-xs mt-1 block ${isLight ? 'text-slate-500' : 'text-[#A1A1AA]'}`}>{workingCapital.dso <= 30 ? 'Healthy Collection Cycle' : workingCapital.dso <= 60 ? 'Moderate — Accelerate AR' : 'High — Review Collections'}</span>
            </div>
            <div className={`p-5 rounded-2xl border ${isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'}`}>
              <span className={`text-xs font-medium ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>Top Inflow Customer</span>
              <div className="mt-2 text-xl font-semibold font-mono truncate">{topInflows[0]?.customer || 'Shakti Enterprise'}</div>
              <span className="text-xs text-emerald-500 font-mono mt-1 block">{formatINR(topInflows[0]?.amount || 900000)}</span>
            </div>
          </div>

          {/* Customer Collections Schedule Table */}
          <div className={`p-5 rounded-2xl border ${isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold font-mono uppercase tracking-wider">Customer Invoice Collections Schedule</h3>
              <span className="text-xs font-mono text-emerald-500 font-bold">{topInflows.length} Active Invoices</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-left">
                <thead>
                  <tr className={`border-b ${isLight ? 'border-slate-200 text-slate-500' : 'border-zinc-800 text-zinc-400'}`}>
                    <th className="py-2.5 px-3">Customer Account</th>
                    <th className="py-2.5 px-3">Expected Payment Date</th>
                    <th className="py-2.5 px-3">Invoice Amount</th>
                    <th className="py-2.5 px-3">Collection Prob.</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {topInflows.map((tx, i) => (
                    <tr key={i} className={`border-b ${isLight ? 'border-slate-100' : 'border-zinc-900'}`}>
                      <td className="py-3 px-3 font-semibold">{tx.customer || tx.entity}</td>
                      <td className="py-3 px-3">{tx.date || '2026-10-15'}</td>
                      <td className="py-3 px-3 font-bold text-emerald-500">{formatINR(tx.amount)}</td>
                      <td className="py-3 px-3 text-indigo-400 font-bold">{((tx.probability || 0.9) * 100).toFixed(0)}%</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] border ${
                          tx.statusTag?.includes('DELAYED') ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                        }`}>
                          {tx.statusTag || 'PENDING'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: OUTFLOWS ───────────────────────────────────────────── */}
      {currentTab === 'outflows' && (
        <div className="space-y-6">
          {/* Outflow Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-5 rounded-2xl border ${isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'}`}>
              <span className={`text-xs font-medium ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>Total Accounts Payable</span>
              <div className="mt-2 text-2xl font-semibold font-mono text-red-500">{formatINR(totalOutflowVal)}</div>
              <span className={`text-xs mt-1 block ${isLight ? 'text-slate-500' : 'text-[#A1A1AA]'}`}>Committed Vendor Payables</span>
            </div>
            <div className={`p-5 rounded-2xl border ${isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'}`}>
              <span className={`text-xs font-medium ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>DPO (Days Payable Outstanding)</span>
              <div className="mt-2 text-2xl font-semibold font-mono">{workingCapital.dpo} Days</div>
              <span className={`text-xs mt-1 block ${isLight ? 'text-slate-500' : 'text-[#A1A1AA]'}`}>{workingCapital.dpo >= 45 ? 'Strong Supplier Terms' : workingCapital.dpo >= 30 ? 'Standard Payment Terms' : 'Low — Negotiate Extensions'}</span>
            </div>
            <div className={`p-5 rounded-2xl border ${isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'}`}>
              <span className={`text-xs font-medium ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>Top Outflow Vendor</span>
              <div className="mt-2 text-xl font-semibold font-mono truncate">{topOutflows[0]?.entity || 'Shakti Electronics'}</div>
              <span className="text-xs text-red-500 font-mono mt-1 block">{formatINR(topOutflows[0]?.amount || 1800000)}</span>
            </div>
            <div className={`p-5 rounded-2xl border ${isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'}`}>
              <span className={`text-xs font-medium ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>Outflow Concentration</span>
              <div className="mt-2 text-2xl font-semibold font-mono text-amber-500">66.7%</div>
              <span className={`text-xs mt-1 block ${isLight ? 'text-slate-500' : 'text-[#A1A1AA]'}`}>Top Vendor Share</span>
            </div>
          </div>

          {/* Outflow Pie + Table Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className={`lg:col-span-5 p-5 rounded-2xl border ${isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'}`}>
              <h3 className="text-sm font-semibold mb-3 font-mono uppercase tracking-wider">Outflow Category Allocation</h3>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={outflowPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                      {outflowPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-3">
                {outflowPieData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.name}</span>
                    </div>
                    <span className="font-bold">₹{item.value}L</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`lg:col-span-7 p-5 rounded-2xl border ${isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'}`}>
              <h3 className="text-sm font-semibold mb-3 font-mono uppercase tracking-wider">Vendor Payables &amp; Expense Schedule</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-left">
                  <thead>
                    <tr className={`border-b ${isLight ? 'border-slate-200 text-slate-500' : 'border-zinc-800 text-zinc-400'}`}>
                      <th className="py-2.5 px-3">Supplier / Vendor</th>
                      <th className="py-2.5 px-3">Due Date</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topOutflows.map((pay, i) => (
                      <tr key={i} className={`border-b ${isLight ? 'border-slate-100' : 'border-zinc-900'}`}>
                        <td className="py-3 px-3 font-semibold">{pay.entity}</td>
                        <td className="py-3 px-3">{pay.date || '2026-10-16'}</td>
                        <td className="py-3 px-3 font-bold text-red-500">{formatINR(pay.amount)}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] border ${isLight ? 'bg-slate-100 text-slate-600 border-slate-300' : 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>
                            {pay.category || 'Procurement'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardAnalytics;
