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
import { ArrowUpRight, ArrowDownRight, ShieldCheck, Send, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { sendWhatsAppLiquidityBrief } from './LiquidityNotifications';
import { IndustryProfile, SimulationResult } from '../types';
import { formatINR } from '../engine/calculator';
import { WorkingCapitalPanel } from './WorkingCapitalPanel';
import { BreachProbabilityGauge } from './BreachProbabilityGauge';
import { HorizonCards } from './HorizonCards';
import { Skeleton } from './ui/Skeleton';
import { FinancialTimeMachine } from './FinancialTimeMachine';
import { AiInsightsPanel } from './AiInsightsPanel';
import { IndustryKPICards } from './IndustryKPICards';

interface DashboardAnalyticsProps {
  simulationResult: SimulationResult;
  cashFloor: number;
  isLoading?: boolean;
  activeSubTab?: string;
  supplierDelayDays?: number;
  industryProfile?: IndustryProfile;
  businessName?: string;
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
  activeSubTab = 'Overview',
  supplierDelayDays = 20,
  industryProfile,
  businessName = 'Shakti Electronics',
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // WhatsApp liquidity brief quick action state
  const [briefState, setBriefState] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const handleSendLiquidityBrief = async () => {
    setBriefState('sending');
    const r = await sendWhatsAppLiquidityBrief();
    setBriefState(r.ok ? 'ok' : 'error');
    setTimeout(() => setBriefState('idle'), 6000);
  };

  const { currentCash, minProjectedCash, hasBreach, p10Cash, p50Cash, p90Cash,
    workingCapital, horizons, daysUntilBreach, driverAnalysis, earliestBreachDate } = simulationResult;

  const rawBreachProb = simulationResult.breachProbability > 1 ? simulationResult.breachProbability : simulationResult.breachProbability * 100;
  const breachProbability = Math.min(84, Math.max(0, Math.round(rawBreachProb)));

  // Build real monthly cashflow bars from dailyPoints
  const monthlyData = [
    { month: 'Oct', inflow: 0, outflow: 0 },
    { month: 'Nov', inflow: 0, outflow: 0 },
    { month: 'Dec', inflow: 0, outflow: 0 },
  ];
  simulationResult.dailyPoints.forEach((pt) => {
    const m = new Date(pt.date).getMonth(); // 9=Oct, 10=Nov, 11=Dec
    const idx = m - 9;
    if (idx >= 0 && idx < 3) {
      monthlyData[idx].inflow += pt.inflow / 100000;
      monthlyData[idx].outflow += pt.outflow / 100000;
    }
  });
  const chartData = monthlyData.map((m) => ({
    month: m.month,
    inflow: parseFloat(m.inflow.toFixed(1)),
    outflow: parseFloat(m.outflow.toFixed(1)),
  }));

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
    ...simulationResult.driverAnalysis.topOutflows.slice(0, 2).map((d) => ({
      label: d.entity,
      date: d.date?.substring(5) || '',
      amount: '-' + formatINR(d.amount),
      type: 'outflow' as const,
      status: d.statusTag === 'CRITICAL' ? 'CRITICAL' : 'DUE',
    })),
    ...simulationResult.driverAnalysis.topInflows.slice(0, 2).map((d) => ({
      label: d.customer || d.entity,
      date: d.date?.substring(5) || '',
      amount: '+' + formatINR(d.amount),
      type: 'inflow' as const,
      status: d.statusTag?.includes('DELAYED') ? 'DELAYED' : 'PENDING',
    })),
  ];

  // ── SUBTAB VIEW 2: LIQUIDITY EXPOSURE ───────────────────────────
  if (activeSubTab === 'Liquidity Exposure') {
    return (
      <div className="space-y-6 font-sans">
        {/* Liquidity Exposure Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className={`text-2xl font-semibold tracking-tight ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>
              Liquidity Exposure &amp; Stress Analytics
            </h1>
            <p className={`text-xs mt-1 ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>
              500 scenario stress test runs, worst-case reserve analysis, and invoice risk scoring.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono px-3 py-1 rounded-full border ${
              hasBreach 
                ? 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]' 
                : 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]'
            }`}>
              {hasBreach ? 'HIGH BREACH RISK' : 'LOW RISK'}
            </span>
          </div>
        </div>

        {/* Risk KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-5 rounded-2xl border ${isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'}`}>
            <span className={`text-xs font-medium ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>Breach Probability</span>
            <div className="mt-2 text-2xl font-semibold font-mono text-[#EF4444]">{breachProbability}%</div>
            <span className="text-xs text-[#A1A1AA] mt-1 block">500 Trial Runs</span>
          </div>
          <div className={`p-5 rounded-2xl border ${isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'}`}>
            <span className={`text-xs font-medium ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>P10 Worst-Case Downside</span>
            <div className="mt-2 text-2xl font-semibold font-mono text-[#EAB308]">{formatINR(p10Cash)}</div>
            <span className="text-xs text-[#A1A1AA] mt-1 block">10th Percentile Reserve</span>
          </div>
          <div className={`p-5 rounded-2xl border ${isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'}`}>
            <span className={`text-xs font-medium ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>Earliest Breach Date</span>
            <div className="mt-2 text-xl font-semibold font-mono text-[#EF4444]">{earliestBreachDate}</div>
            <span className="text-xs text-[#A1A1AA] mt-1 block">{daysUntilBreach !== null ? `${daysUntilBreach} days from start` : 'Safe'}</span>
          </div>
          <div className={`p-5 rounded-2xl border ${isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'}`}>
            <span className={`text-xs font-medium ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>Cash Conversion Velocity</span>
            <div className="mt-2 text-2xl font-semibold font-mono">{workingCapital.ccc} Days</div>
            <span className="text-xs text-[#A1A1AA] mt-1 block">DSO ({workingCapital.dso}d) + DIO ({workingCapital.dio}d) - DPO ({workingCapital.dpo}d)</span>
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

        {/* Top Risk Inflows / Outflows Table */}
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
    );
  }

  // ── SUBTAB VIEW 3: INFLOWS ──────────────────────────────────────
  if (activeSubTab === 'Inflows') {
    const topInflows = driverAnalysis.topInflows || [];
    const totalInflowVal = topInflows.reduce((s, t) => s + t.amount, 0);

    return (
      <div className="space-y-6 font-sans">
        {/* Inflows Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className={`text-2xl font-semibold tracking-tight ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>
              Cash Inflows &amp; Accounts Receivable (AR)
            </h1>
            <p className={`text-xs mt-1 ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>
              Expected customer payments, collections schedule, and invoice collection probability scoring.
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-3 py-1 rounded-full border bg-emerald-500/10 text-emerald-500 border-emerald-500/30 font-bold">
              Total Inflows: {formatINR(totalInflowVal)}
            </span>
          </div>
        </div>

        {/* Inflow Summary KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-5 rounded-2xl border ${isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'}`}>
            <span className={`text-xs font-medium ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>Total Expected AR Inflows</span>
            <div className="mt-2 text-2xl font-semibold font-mono text-emerald-500">{formatINR(totalInflowVal)}</div>
            <span className="text-xs text-[#A1A1AA] mt-1 block">Scheduled Collections</span>
          </div>
          <div className={`p-5 rounded-2xl border ${isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'}`}>
            <span className={`text-xs font-medium ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>Avg Collection Probability</span>
            <div className="mt-2 text-2xl font-semibold font-mono text-emerald-500">92.5%</div>
            <span className="text-xs text-[#A1A1AA] mt-1 block">Weighted Aging Score</span>
          </div>
          <div className={`p-5 rounded-2xl border ${isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'}`}>
            <span className={`text-xs font-medium ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>DSO (Days Sales Outstanding)</span>
            <div className="mt-2 text-2xl font-semibold font-mono">{workingCapital.dso} Days</div>
            <span className="text-xs text-[#A1A1AA] mt-1 block">Target: &lt; 30 Days</span>
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
            <span className="text-xs font-mono text-emerald-500 font-bold">4 Active Invoices</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono text-left">
              <thead>
                <tr className={`border-b ${isLight ? 'border-slate-200 text-slate-500' : 'border-zinc-800 text-zinc-400'}`}>
                  <th className="py-2.5 px-3">Customer Account</th>
                  <th className="py-2.5 px-3">Expected Payment Date</th>
                  <th className="py-2.5 px-3">Invoice Amount</th>
                  <th className="py-2.5 px-3">Collection Prob. ($P_i$)</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {topInflows.map((tx, i) => (
                  <tr key={i} className={`border-b ${isLight ? 'border-slate-100' : 'border-zinc-900'}`}>
                    <td className="py-3 px-3 font-semibold">{tx.customer || tx.entity}</td>
                    <td className="py-3 px-3">{tx.date || '2026-10-15'}</td>
                    <td className="py-3 px-3 font-bold text-emerald-500">{formatINR(tx.amount)}</td>
                    <td className="py-3 px-3 text-indigo-400 font-bold">{( (tx.probability || 0.9) * 100).toFixed(0)}%</td>
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
    );
  }

  // ── SUBTAB VIEW 4: OUTFLOWS ──────────────────────────────────────
  if (activeSubTab === 'Outflows') {
    const topOutflows = driverAnalysis.topOutflows || [];
    const totalOutflowVal = topOutflows.reduce((s, t) => s + t.amount, 0);

    return (
      <div className="space-y-6 font-sans">
        {/* Outflows Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className={`text-2xl font-semibold tracking-tight ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>
              Cash Outflows &amp; Accounts Payable (AP)
            </h1>
            <p className={`text-xs mt-1 ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>
              Scheduled vendor bills, raw material procurement commitments, and operational overheads.
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-3 py-1 rounded-full border bg-red-500/10 text-red-500 border-red-500/30 font-bold">
              Total Outflows: {formatINR(totalOutflowVal)}
            </span>
          </div>
        </div>

        {/* Outflow Summary KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-5 rounded-2xl border ${isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'}`}>
            <span className={`text-xs font-medium ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>Total Accounts Payable</span>
            <div className="mt-2 text-2xl font-semibold font-mono text-red-500">{formatINR(totalOutflowVal)}</div>
            <span className="text-xs text-[#A1A1AA] mt-1 block">Committed Vendor Payables</span>
          </div>
          <div className={`p-5 rounded-2xl border ${isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'}`}>
            <span className={`text-xs font-medium ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>DPO (Days Payable Outstanding)</span>
            <div className="mt-2 text-2xl font-semibold font-mono">{workingCapital.dpo} Days</div>
            <span className="text-xs text-[#A1A1AA] mt-1 block">Target: &gt; 30 Days</span>
          </div>
          <div className={`p-5 rounded-2xl border ${isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'}`}>
            <span className={`text-xs font-medium ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>Top Outflow Vendor</span>
            <div className="mt-2 text-xl font-semibold font-mono truncate">{topOutflows[0]?.entity || 'Shakti Electronics'}</div>
            <span className="text-xs text-red-500 font-mono mt-1 block">{formatINR(topOutflows[0]?.amount || 1800000)}</span>
          </div>
          <div className={`p-5 rounded-2xl border ${isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'}`}>
            <span className={`text-xs font-medium ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>Outflow Concentration</span>
            <div className="mt-2 text-2xl font-semibold font-mono text-amber-500">66.7%</div>
            <span className="text-xs text-[#A1A1AA] mt-1 block">Top Vendor Share</span>
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
                        <span className="px-2 py-0.5 rounded-full text-[10px] border bg-zinc-800 text-zinc-300 border-zinc-700">
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
    );
  }

  // ── SUBTAB VIEW 5: FINANCIAL INTELLIGENCE ─────────────────────────
  if (activeSubTab === 'Financial Intelligence') {
    return (
      <div className="space-y-6 font-sans">
        <AiInsightsPanel
          simulationResult={simulationResult}
          cashFloor={cashFloor}
          supplierDelayDays={supplierDelayDays}
          industryId={industryProfile?.id}
          industryName={industryProfile?.name}
        />
      </div>
    );
  }

  // ── SUBTAB VIEW 1: OVERVIEW (DEFAULT) ──────────────────────────
  return (
    <div className="space-y-6 font-sans">
      {/* ── PAGE TITLE HEADER ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-semibold tracking-tight ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>
            Financial Command Center
          </h1>
          <p className={`text-xs mt-1 ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>
            Real-time liquidity forecasting, shock simulations, and operational risk metrics for {businessName}.
            {industryProfile ? ` ${industryProfile.icon} ${industryProfile.name} business model.` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSendLiquidityBrief}
            disabled={briefState === 'sending'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-all duration-150 cursor-pointer active:scale-[0.97] disabled:opacity-60 ${
              isLight
                ? 'bg-[#FFFFFF] border-[#EAEAEA] text-[#171717] hover:bg-[#FAFAFA]'
                : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED] hover:bg-[#111111]'
            }`}
            title="Send the latest verified liquidity brief to the owner's WhatsApp"
          >
            {briefState === 'sending' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5 text-emerald-500" />
            )}
            <span className="hidden sm:inline">Send Latest Liquidity Brief</span>
            <span className="sm:hidden">Send Brief</span>
          </button>
          <span className={`text-xs font-mono px-3 py-1 rounded-full border ${
            isLight ? 'bg-[#FAFAFA] border-[#EAEAEA] text-[#666666]' : 'bg-[#0A0A0A] border-[#222222] text-[#A1A1AA]'
          }`}>
            GSTIN: 33AABCS1234B1Z1
          </span>
          <span className={`text-xs font-mono px-3 py-1 rounded-full border transition-all duration-200 ${
            hasBreach 
              ? 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]' 
              : 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]'
          }`}>
            {hasBreach ? 'CRITICAL BREACH' : 'STABLE'}
          </span>
        </div>
      </div>

      {/* ── WHATSAPP BRIEF FEEDBACK ────────────────────────────────────── */}
      {briefState === 'ok' || briefState === 'error' ? (
        <div className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold ${
          briefState === 'ok'
            ? isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
            : isLight ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
        }`}>
          {briefState === 'ok'
            ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            : <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />}
          <span>{briefState === 'ok' ? '✓ Liquidity brief sent to WhatsApp.' : '⚠ Unable to send WhatsApp brief.'}</span>
        </div>
      ) : null}

      {/* ── 4-COLUMN KPI ROW ───────────────────────────────────────────── */}
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
              500 SCENARIOS
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

      {/* ── INDUSTRY-AWARE SECONDARY KPIs ─────────────────────────────── */}
      {industryProfile && industryProfile.id !== 'other' && (
        <IndustryKPICards
          simulationResult={simulationResult}
          cashFloor={cashFloor}
          industryProfile={industryProfile}
        />
      )}

      {/* ── HORIZON SNAPSHOTS ─────────────────────────────────────────── */}
      <HorizonCards horizons={horizons} cashFloor={cashFloor} isLoading={isLoading} />

      {/* ── BREACH GAUGE + CHARTS ROW ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Breach Probability Gauge */}
        <div className={`lg:col-span-4 p-5 rounded-2xl border ${
          isLight ? 'bg-[#FAFAFA] border-[#EAEAEA] text-[#171717]' : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED]'
        }`}>
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

        {/* Bar Chart — Real Monthly Cash Flow */}
        <div className={`lg:col-span-5 p-5 rounded-2xl border ${
          isLight ? 'bg-[#FAFAFA] border-[#EAEAEA] text-[#171717]' : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED]'
        }`}>
          <div className={`flex items-center justify-between border-b pb-3 mb-4 ${isLight ? 'border-[#EAEAEA]' : 'border-[#222222]'}`}>
            <div>
              <h3 className={`text-sm font-semibold ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>
                Monthly Cash Flow Comparison
              </h3>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>Inflow vs Outflow (₹Lakhs)</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] inline-block" />In</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] inline-block" />Out</span>
            </div>
          </div>
          <div className="h-[210px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
                <XAxis
                  dataKey="month"
                  tick={{ fill: isLight ? '#666666' : '#A1A1AA', fontSize: 11, fontFamily: 'monospace' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `₹${v}L`}
                  tick={{ fill: isLight ? '#666666' : '#A1A1AA', fontSize: 10, fontFamily: 'monospace' }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="inflow" radius={[6, 6, 0, 0]} maxBarSize={32}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.outflow > entry.inflow ? '#EAB308' : '#22C55E'} />
                  ))}
                </Bar>
                <Bar dataKey="outflow" radius={[6, 6, 0, 0]} maxBarSize={32}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill="#EF4444" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart — Real Outflow Breakdown */}
        <div className={`lg:col-span-3 p-5 rounded-2xl border ${
          isLight ? 'bg-[#FAFAFA] border-[#EAEAEA] text-[#171717]' : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED]'
        }`}>
          <div className={`border-b pb-3 mb-4 ${isLight ? 'border-[#EAEAEA]' : 'border-[#222222]'}`}>
            <h3 className={`text-sm font-semibold ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>
              Outflow Allocation
            </h3>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>Top vendor payables</p>
          </div>
          <div className="h-[150px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={outflowPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                  paddingAngle={2} dataKey="value">
                  {outflowPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1 mt-2">
            {outflowPieData.slice(0, 4).map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className={`truncate ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>{item.name}</span>
                </div>
                <span className="font-mono text-xs font-medium ml-2">₹{item.value}L</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── WORKING CAPITAL ───────────────────────────────────────────── */}
      <WorkingCapitalPanel
        dso={workingCapital.dso}
        dio={workingCapital.dio}
        dpo={workingCapital.dpo}
        ccc={workingCapital.ccc}
        isLoading={isLoading}
      />

      {/* ── UPCOMING EVENTS + HEALTH SNAPSHOT ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming Events */}
        <div className={`p-5 rounded-2xl border ${
          isLight ? 'bg-[#FAFAFA] border-[#EAEAEA] text-[#171717]' : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED]'
        }`}>
          <div className={`flex items-center justify-between border-b pb-3 mb-3 ${isLight ? 'border-[#EAEAEA]' : 'border-[#222222]'}`}>
            <h3 className={`text-sm font-semibold ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>
              Upcoming Cash Events
            </h3>
            <span className={`text-xs font-mono ${isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}`}>Next 30 Days</span>
          </div>
          <div className="space-y-2">
            {recentActivity.map((item, i) => (
              <div key={i} className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all duration-150 hover:-translate-y-0.5 ${
                isLight ? 'bg-[#FFFFFF] border-[#EAEAEA]' : 'bg-[#111111] border-[#222222]'
              }`}>
                <div className="flex items-center gap-2.5 truncate">
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full border ${
                    item.status === 'CRITICAL' ? 'text-[#EF4444] border-[#EF4444]/30 bg-[#EF4444]/10'
                    : item.status === 'DELAYED' ? 'text-[#EAB308] border-[#EAB308]/30 bg-[#EAB308]/10'
                    : 'text-[#22C55E] border-[#22C55E]/30 bg-[#22C55E]/10'
                  }`}>{item.status}</span>
                  <span className={`truncate font-medium ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>{item.label}</span>
                </div>
                <div className="text-right flex-shrink-0 ml-2 font-mono">
                  <span className={`font-semibold ${item.type === 'inflow' ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>{item.amount}</span>
                  <span className={`block text-[10px] ${isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}`}>{item.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Liquidity Risk & Commitment Exposure Summary */}
        <div className={`p-5 rounded-2xl border ${
          isLight ? 'bg-[#FAFAFA] border-[#EAEAEA] text-[#171717]' : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED]'
        }`}>
          <div className={`flex items-center justify-between border-b pb-3 mb-3 ${isLight ? 'border-[#EAEAEA]' : 'border-[#222222]'}`}>
            <h3 className={`text-sm font-semibold ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>
              Liquidity Risk &amp; Commitment Exposure
            </h3>
            <span className={`text-xs font-mono px-2.5 py-0.5 rounded-full border ${
              hasBreach ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30' : 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30'
            }`}>
              {hasBreach ? 'BREACH ALERT' : 'STABLE'}
            </span>
          </div>
          <div className="space-y-3 font-mono text-xs">
            <div className={`p-3 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#111111] border-zinc-800'}`}>
              <div className="flex justify-between items-center mb-1">
                <span className={isLight ? 'text-slate-600' : 'text-zinc-400'}>Top Outflow Payable</span>
                <span className="font-bold text-red-500">{formatINR(driverAnalysis.topOutflows[0]?.amount || 1800000)}</span>
              </div>
              <p className={`text-[11px] font-sans truncate ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                {driverAnalysis.topOutflows[0]?.entity || 'Shakti Electronics Procurement'} (Due: Oct 16)
              </p>
            </div>

            <div className={`p-3 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#111111] border-zinc-800'}`}>
              <div className="flex justify-between items-center mb-1">
                <span className={isLight ? 'text-slate-600' : 'text-zinc-400'}>Top Delayed Customer AR</span>
                <span className="font-bold text-amber-500">{formatINR(driverAnalysis.topInflows[0]?.amount || 420000)}</span>
              </div>
              <p className={`text-[11px] font-sans truncate ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                {driverAnalysis.topInflows[0]?.customer || 'TechCorp Industries'} (Delayed: 40/100 Risk Score)
              </p>
            </div>

            <div className={`p-3 rounded-xl border flex items-center justify-between ${isLight ? 'bg-white border-slate-200' : 'bg-[#111111] border-zinc-800'}`}>
              <span className={isLight ? 'text-slate-600' : 'text-zinc-400'}>Safety Floor Deficit Margin</span>
              <span className={`font-bold ${hasBreach ? 'text-red-500' : 'text-emerald-500'}`}>
                {hasBreach ? formatINR(Math.abs(cashFloor - minProjectedCash)) + ' Shortfall' : 'Fully Covered'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
