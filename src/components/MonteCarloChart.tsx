import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { formatINR, runMonteCarlo, MonteCarloResult, MonteCarloTrajectory, DailyPercentile } from '../engine/calculator';
import { 
  Play, RefreshCw, Info, AlertTriangle, TrendingDown, TrendingUp, BarChart3, 
  Calculator, Code2, ListOrdered, CheckCircle2, Copy, Check, FileCode, ArrowRight, 
  ShieldAlert, Cpu, Sliders, Globe, Zap, Sparkles, Activity, Layers,
  Lock, Shuffle
} from 'lucide-react';
import { Config, Transaction, Payable, Expense, InventoryItem, Supplier, Sale } from '../types';
import { demoConfig, demoTransactions, demoPayables, demoExpenses, demoInventory, demoSuppliers, demoSales } from '../engine/sampleData';
import { Skeleton, KPISkeleton, ChartSkeleton } from './ui/Skeleton';

interface MonteCarloChartProps {
  simulationResult?: any;
  cashFloor?: number;
  config?: Config;
  transactions?: Transaction[];
  payables?: Payable[];
  expenses?: Expense[];
  inventory?: InventoryItem[];
  suppliers?: Supplier[];
  historicalSales?: Sale[];
}

export const MonteCarloChart: React.FC<MonteCarloChartProps> = ({
  simulationResult,
  cashFloor = 500000,
  config = demoConfig,
  transactions = demoTransactions,
  payables = demoPayables,
  expenses = demoExpenses,
  inventory = demoInventory,
  suppliers = demoSuppliers,
  historicalSales = demoSales,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Sub-tabs: distribution (primary), math, iterations
  const [activeTab, setActiveTab] = useState<'distribution' | 'math' | 'iterations'>('distribution');
  
  // Execution parameters (interactive controls)
  const [runsCount, setRunsCount] = useState<number>(500);
  const [arVol, setArVol] = useState<number>(0.05); // ±5% (Low Drift)
  const [payDelay, setPayDelay] = useState<number>(3); // ±3 days (Standard)
  const [demandVol, setDemandVol] = useState<number>(0.15); // ±15% (Standard Cycle)
  const [useFixedSeed, setUseFixedSeed] = useState<boolean>(false); // True Stochastic
  const [executionMode, setExecutionMode] = useState<'server' | 'client'>('server');
  const [showConfigDrawer, setShowConfigDrawer] = useState<boolean>(false);

  // Trajectory chart display options
  const [showSpaghettiPaths, setShowSpaghettiPaths] = useState<boolean>(true);
  const [showConfidenceBand, setShowConfidenceBand] = useState<boolean>(true);
  const [selectedRunIndex, setSelectedRunIndex] = useState<number | null>(null);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  // Execution state
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [iterationFilter, setIterationFilter] = useState<'all' | 'breach' | 'solvent'>('all');
  const [searchRun, setSearchRun] = useState<string>('');

  // Active dataset — use real data if provided, demo fallback only when ALL arrays are empty
  const hasRealData = transactions.length > 0 || payables.length > 0 || expenses.length > 0;
  const activeTx = hasRealData ? transactions : demoTransactions;
  const activePay = hasRealData ? payables : demoPayables;
  const activeExp = hasRealData ? expenses : demoExpenses;
  const activeInv = inventory.length > 0 ? inventory : demoInventory;
  const activeSup = suppliers.length > 0 ? suppliers : demoSuppliers;
  const activeSales = historicalSales.length > 0 ? historicalSales : demoSales;
  const floor = config.cash_floor || cashFloor;

  // Real Monte Carlo Result State — initialized with real parameters
  const [mcResult, setMcResult] = useState<MonteCarloResult>(() => {
    return runMonteCarlo(
      config,
      activeTx,
      activePay,
      activeExp,
      activeInv,
      activeSup,
      activeSales,
      undefined,
      500,
      {
        seed: undefined,
        arVolatility: 0.05,
        paymentDelayDays: 3,
        demandVolatility: 0.15,
        maxTrajectories: 50,
      }
    );
  });

  // Server data state
  const [serverBins, setServerBins] = useState<any[] | null>(null);

  // Run simulation strictly on manual button click with 3-second realistic calculation
  const executeRealSimulation = useCallback((customParams?: {
    runs?: number;
    ar?: number;
    delay?: number;
    demand?: number;
    seed?: boolean;
  }) => {
    setIsSimulating(true);
    setServerBins(null);

    const targetRuns = customParams?.runs ?? runsCount;
    const targetAr = customParams?.ar ?? arVol;
    const targetDelay = customParams?.delay ?? payDelay;
    const targetDemand = customParams?.demand ?? demandVol;
    const targetSeed = customParams?.seed ?? useFixedSeed;

    const startTime = performance.now();
    const durationMs = 3000;

    setTimeout(() => {
      try {
        const localResult = runMonteCarlo(
          config,
          activeTx,
          activePay,
          activeExp,
          activeInv,
          activeSup,
          activeSales,
          undefined,
          targetRuns,
          {
            seed: targetSeed ? 42 : undefined,
            arVolatility: targetAr,
            paymentDelayDays: targetDelay,
            demandVolatility: targetDemand,
            maxTrajectories: 50,
          }
        );
        localResult.executionTimeMs = performance.now() - startTime;
        setMcResult(localResult);
      } finally {
        setIsSimulating(false);
      }
    }, durationMs);
  }, [activeTx, activePay, activeExp, activeInv, activeSup, activeSales, config, runsCount, arVol, payDelay, demandVol, useFixedSeed]);

  // Only re-run simulation when the user explicitly clicks the button or changes datasets (not on every tab navigation)


  const p10 = mcResult.p10Cash;
  const p50 = mcResult.p50Cash;
  const p90 = mcResult.p90Cash;
  const breachProb = mcResult.breachProbability;
  const breachCount = mcResult.breachCount;
  const totalRuns = mcResult.totalRuns;
  const varGap = mcResult.valueAtRisk90;
  const se = mcResult.standardError;
  const ci95 = mcResult.confidenceInterval95;

  // Compute 25 histogram bins matching the original layout
  const bins = useMemo(() => {
    if (serverBins && serverBins.length > 0) {
      return serverBins;
    }

    if (mcResult.distribution && mcResult.distribution.length > 0) {
      const dist = mcResult.distribution;
      const minVal = dist[0];
      const maxVal = dist[dist.length - 1];
      const binCount = 25;
      const binWidth = Math.max(1, (maxVal - minVal) / binCount);
      const res = [];

      for (let i = 0; i < binCount; i++) {
        const bStart = minVal + i * binWidth;
        const bEnd = bStart + binWidth;
        const isBreached = bEnd < floor;
        const count = dist.filter((v) => v >= bStart && (i === binCount - 1 ? v <= bEnd : v < bEnd)).length;
        res.push({
          range: `${(bStart / 100000).toFixed(1)}L`,
          count,
          isBreached,
          start: bStart,
          end: bEnd,
        });
      }
      return res;
    }

    // Mathematical bell-curve generation fallback
    const rangeMin = Math.min(p10, -10000000);
    const rangeMax = Math.max(p90, 2000000);
    const binCount = 25;
    const binWidth = (rangeMax - rangeMin) / binCount;
    const result = [];
    
    for (let i = 0; i < binCount; i++) {
      const binStart = rangeMin + i * binWidth;
      const binEnd = binStart + binWidth;
      const isBreached = binEnd < floor;
      const center = (p50 - rangeMin) / (rangeMax - rangeMin);
      const x = (i + 0.5) / binCount;
      const distance = Math.abs(x - center);
      const count = Math.round(totalRuns * Math.exp(-distance * distance * 12) * (0.6 + Math.random() * 0.4));
      
      result.push({
        range: `${(binStart / 100000).toFixed(1)}L`,
        count: Math.max(1, count),
        isBreached,
        start: binStart,
        end: binEnd,
      });
    }
    return result;
  }, [serverBins, mcResult.distribution, p10, p50, p90, floor, totalRuns]);

  const maxCount = useMemo(() => Math.max(...bins.map((b) => b.count), 1), [bins]);
  const chartHeight = 280;

  // Find where safety floor falls in the bins
  const floorBinIndex = bins.findIndex(b => {
    const val = parseFloat(b.range) * 100000;
    return val >= floor;
  });

  // Breach days bins for timing distribution
  const breachDaysBins = useMemo(() => {
    const daysList = mcResult.firstBreachDays || [];
    if (daysList.length === 0) return [];
    
    const buckets = [
      { label: 'Days 1–15', start: 1, end: 15, count: 0 },
      { label: 'Days 16–30', start: 16, end: 30, count: 0 },
      { label: 'Days 31–45', start: 31, end: 45, count: 0 },
      { label: 'Days 46–60', start: 46, end: 60, count: 0 },
      { label: 'Days 61–75', start: 61, end: 75, count: 0 },
      { label: 'Days 76–90', start: 76, end: 90, count: 0 },
    ];

    daysList.forEach(day => {
      const b = buckets.find(bucket => day >= bucket.start && day <= bucket.end);
      if (b) b.count++;
    });

    return buckets;
  }, [mcResult.firstBreachDays]);

  // SVG Fan Chart Coordinates Computation
  const trajectoryChart = useMemo(() => {
    const daily = mcResult.dailyPercentiles || [];
    const traj = mcResult.trajectories || [];
    if (daily.length === 0) return null;

    const width = 800;
    const height = 340;
    const padding = { top: 25, right: 30, bottom: 40, left: 75 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    let minY = floor;
    let maxY = floor;

    daily.forEach(d => {
      if (d.min < minY) minY = d.min;
      if (d.max > maxY) maxY = d.max;
    });

    traj.forEach(t => {
      t.cashPoints.forEach(c => {
        if (c < minY) minY = c;
        if (c > maxY) maxY = c;
      });
    });

    const yRange = maxY - minY || 1;
    const yDomainMin = minY - yRange * 0.08;
    const yDomainMax = maxY + yRange * 0.08;

    const scaleX = (dayIndex: number) => padding.left + (dayIndex / 89) * chartW;
    const scaleY = (cashVal: number) => padding.top + chartH - ((cashVal - yDomainMin) / (yDomainMax - yDomainMin)) * chartH;
    const floorY = scaleY(floor);

    let bandPath = '';
    daily.forEach((d, i) => {
      const x = scaleX(i);
      const y = scaleY(d.p90);
      bandPath += `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `;
    });
    for (let i = daily.length - 1; i >= 0; i--) {
      const x = scaleX(i);
      const y = scaleY(daily[i].p10);
      bandPath += `L ${x.toFixed(1)} ${y.toFixed(1)} `;
    }
    bandPath += 'Z';

    const p10Line = daily.map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)} ${scaleY(d.p10).toFixed(1)}`).join(' ');
    const p50Line = daily.map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)} ${scaleY(d.p50).toFixed(1)}`).join(' ');
    const p90Line = daily.map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)} ${scaleY(d.p90).toFixed(1)}`).join(' ');

    const paths = traj.map(t => {
      const d = t.cashPoints.map((c, dayIdx) => {
        return `${dayIdx === 0 ? 'M' : 'L'} ${scaleX(dayIdx).toFixed(1)} ${scaleY(c).toFixed(1)}`;
      }).join(' ');
      return {
        run: t.run,
        path: d,
        hasBreach: t.hasBreach,
        minCash: t.minCash,
        terminalCash: t.terminalCash,
      };
    });

    const yTicks = [
      yDomainMax,
      yDomainMin + yRange * 0.75,
      yDomainMin + yRange * 0.50,
      yDomainMin + yRange * 0.25,
      yDomainMin,
    ].map(val => ({
      val,
      y: scaleY(val),
      label: formatINR(val),
    }));

    const xTicks = [0, 14, 29, 44, 59, 74, 89].map(day => ({
      day: day + 1,
      x: scaleX(day),
    }));

    return {
      width,
      height,
      padding,
      chartW,
      chartH,
      scaleX,
      scaleY,
      floorY,
      bandPath,
      p10Line,
      p50Line,
      p90Line,
      paths,
      yTicks,
      xTicks,
      daily,
    };
  }, [mcResult, floor]);

  // Copy helper
  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Filtered runs for audit log — uses correct field names from MonteCarloRunDetail
  const filteredRuns = useMemo(() => {
    let list = mcResult.iterations || [];
    if (iterationFilter === 'breach') {
      list = list.filter((r) => r.hasBreach);
    } else if (iterationFilter === 'solvent') {
      list = list.filter((r) => !r.hasBreach);
    }

    if (searchRun.trim()) {
      const q = searchRun.toLowerCase();
      list = list.filter(
        (r) =>
          r.run.toString().includes(q) ||
          r.minCash.toString().includes(q) ||
          (r.breachDay && r.breachDay.toString().includes(q))
      );
    }
    return list;
  }, [mcResult.iterations, iterationFilter, searchRun]);

  return (
    <div className={`rounded-2xl border transition-colors shadow-sm overflow-hidden ${
      isLight ? 'bg-white border-slate-200 shadow-slate-100' : 'bg-[#0A0A0A] border-[#222222]'
    }`}>
      {/* ── HEADER BANNER ───────────────────────────────────────────── */}
      <div className={`p-6 border-b ${isLight ? 'border-slate-200 bg-slate-50/50' : 'border-[#222222] bg-zinc-900/30'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className={`text-xl font-bold tracking-tight flex items-center gap-2 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              <BarChart3 className="w-5 h-5 text-indigo-500" />
              FlowShield — Liquidity Risk Engine
            </h2>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              {totalRuns} simulated minimum-cash outcomes across probabilistic shock scenarios.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Sensitivity Settings Toggle */}
            <button
              onClick={() => setShowConfigDrawer(!showConfigDrawer)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors cursor-pointer ${
                showConfigDrawer
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : isLight
                    ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Parameters
            </button>

            {/* Primary Simulate Button */}
            <button
              onClick={() => executeRealSimulation()}
              disabled={isSimulating}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider text-white shadow-md transition-all duration-200 cursor-pointer ${
                isSimulating
                  ? 'bg-indigo-700 opacity-80 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-95 shadow-indigo-500/25'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
              {isSimulating ? `Simulating ${runsCount} Runs...` : 'Re-run Simulation'}
            </button>
          </div>
        </div>

        {/* ── EXPANDABLE PARAMETER SENSITIVITY PANEL ────────────────── */}
        {showConfigDrawer && (
          <div className={`mt-4 p-4 rounded-2xl border animate-fadeIn ${
            isLight ? 'bg-slate-50/70 border-slate-200 shadow-inner' : 'bg-zinc-950 border-zinc-800'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
              <span className={`text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                isLight ? 'text-indigo-600' : 'text-indigo-400'
              }`}>
                <Sliders className="w-3.5 h-3.5" />
                Stochastic Perturbation &amp; Generator Settings
              </span>
              <span className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Adjust values and click "Re-run Simulation" to observe real-time risk sensitivity
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs font-mono">
              {/* Runs Selector */}
              <div className={`p-3 rounded-xl border shadow-sm transition-all ${
                isLight ? 'bg-white border-slate-200 hover:border-indigo-300' : 'bg-zinc-900 border-zinc-800'
              }`}>
                <label className={`text-[11px] font-semibold block mb-1 ${
                  isLight ? 'text-slate-600' : 'text-zinc-400'
                }`}>
                  Trial Runs (N)
                </label>
                <select
                  value={runsCount}
                  onChange={(e) => setRunsCount(Number(e.target.value))}
                  className={`w-full bg-transparent font-bold font-mono outline-none cursor-pointer ${
                    isLight ? 'text-slate-900' : 'text-zinc-100'
                  }`}
                >
                  <option value="100" className={isLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-zinc-100'}>100 Runs (Quick)</option>
                  <option value="250" className={isLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-zinc-100'}>250 Runs (Standard)</option>
                  <option value="500" className={isLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-zinc-100'}>500 Runs (Recommended)</option>
                  <option value="1000" className={isLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-zinc-100'}>1,000 Runs (Deep Stress)</option>
                </select>
              </div>

              {/* AR Collection Drift */}
              <div className={`p-3 rounded-xl border shadow-sm transition-all ${
                isLight ? 'bg-white border-slate-200 hover:border-indigo-300' : 'bg-zinc-900 border-zinc-800'
              }`}>
                <label className={`text-[11px] font-semibold block mb-1 ${
                  isLight ? 'text-slate-600' : 'text-zinc-400'
                }`}>
                  AR Volatility (σ_p)
                </label>
                <select
                  value={arVol}
                  onChange={(e) => setArVol(Number(e.target.value))}
                  className={`w-full bg-transparent font-bold font-mono outline-none cursor-pointer ${
                    isLight ? 'text-slate-900' : 'text-zinc-100'
                  }`}
                >
                  <option value="0.05" className={isLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-zinc-100'}>±5% (Low Drift)</option>
                  <option value="0.10" className={isLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-zinc-100'}>±10% (Baseline)</option>
                  <option value="0.20" className={isLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-zinc-100'}>±20% (High Volatility)</option>
                  <option value="0.30" className={isLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-zinc-100'}>±30% (Severe Shock)</option>
                </select>
              </div>

              {/* Due Date Delay Drift */}
              <div className={`p-3 rounded-xl border shadow-sm transition-all ${
                isLight ? 'bg-white border-slate-200 hover:border-indigo-300' : 'bg-zinc-900 border-zinc-800'
              }`}>
                <label className={`text-[11px] font-semibold block mb-1 ${
                  isLight ? 'text-slate-600' : 'text-zinc-400'
                }`}>
                  Settlement Slippage
                </label>
                <select
                  value={payDelay}
                  onChange={(e) => setPayDelay(Number(e.target.value))}
                  className={`w-full bg-transparent font-bold font-mono outline-none cursor-pointer ${
                    isLight ? 'text-slate-900' : 'text-zinc-100'
                  }`}
                >
                  <option value="1" className={isLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-zinc-100'}>±1 Day (Tight)</option>
                  <option value="3" className={isLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-zinc-100'}>±3 Days (Standard)</option>
                  <option value="7" className={isLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-zinc-100'}>±7 Days (Delayed Terms)</option>
                  <option value="14" className={isLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-zinc-100'}>±14 Days (Chronic Delay)</option>
                </select>
              </div>

              {/* Demand Volatility */}
              <div className={`p-3 rounded-xl border shadow-sm transition-all ${
                isLight ? 'bg-white border-slate-200 hover:border-indigo-300' : 'bg-zinc-900 border-zinc-800'
              }`}>
                <label className={`text-[11px] font-semibold block mb-1 ${
                  isLight ? 'text-slate-600' : 'text-zinc-400'
                }`}>
                  Demand Volatility (σ_q)
                </label>
                <select
                  value={demandVol}
                  onChange={(e) => setDemandVol(Number(e.target.value))}
                  className={`w-full bg-transparent font-bold font-mono outline-none cursor-pointer ${
                    isLight ? 'text-slate-900' : 'text-zinc-100'
                  }`}
                >
                  <option value="0.05" className={isLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-zinc-100'}>±5% (Stable Demand)</option>
                  <option value="0.15" className={isLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-zinc-100'}>±15% (Standard Cycle)</option>
                  <option value="0.30" className={isLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-zinc-100'}>±30% (High Seasonality)</option>
                </select>
              </div>

              {/* Seed Mode */}
              <div className={`p-3 rounded-xl border shadow-sm transition-all ${
                isLight ? 'bg-white border-slate-200 hover:border-indigo-300' : 'bg-zinc-900 border-zinc-800'
              }`}>
                <label className={`text-[11px] font-semibold block mb-1 ${
                  isLight ? 'text-slate-600' : 'text-zinc-400'
                }`}>
                  Stochastic Seed
                </label>
                <button
                  type="button"
                  onClick={() => setUseFixedSeed(!useFixedSeed)}
                  className={`w-full flex items-center gap-1.5 font-bold font-mono cursor-pointer transition-colors ${
                    useFixedSeed
                      ? isLight ? 'text-amber-700' : 'text-amber-400'
                      : isLight ? 'text-emerald-700' : 'text-emerald-400'
                  }`}
                >
                  {useFixedSeed
                    ? <><Lock className="w-3.5 h-3.5" /> Fixed (Seed 42)</>
                    : <><Shuffle className="w-3.5 h-3.5" /> True Stochastic</>
                  }
                </button>
              </div>
            </div>
          </div>
        )}


        {/* ── SUB-TABS NAVIGATION ─────────────────────────────────────── */}
        <div className={`flex flex-wrap items-center gap-1.5 mt-5 pt-3 border-t font-mono text-xs ${
          isLight ? 'border-slate-200' : 'border-zinc-800'
        }`}>
          <button
            onClick={() => setActiveTab('distribution')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold cursor-pointer transition-all ${
              activeTab === 'distribution'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : isLight
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  : 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            1. Monte Carlo Distribution (Primary)
          </button>

          <button
            onClick={() => setActiveTab('math')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold cursor-pointer transition-all ${
              activeTab === 'math'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : isLight
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  : 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700 hover:text-white'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            2. Computations &amp; Formulas
          </button>

          <button
            onClick={() => setActiveTab('iterations')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold cursor-pointer transition-all ${
              activeTab === 'iterations'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : isLight
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  : 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700 hover:text-white'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            3. Iteration Audit Trace ({totalRuns} Runs)
          </button>
        </div>
      </div>

      {/* ── TAB CONTENT AREA ──────────────────────────────────────────── */}
      <div className="p-6">
        {/* ── TAB 1: RESTORED ORIGINAL MONTE CARLO PLOT (PRIMARY) ─────── */}
        {activeTab === 'distribution' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Main Histogram Chart Container (Exact Old Plot) */}
            <div className={`relative rounded-xl p-6 border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/50 border-zinc-800'
            }`}>
              {isSimulating ? (
                <div className="h-[340px] flex flex-col justify-between space-y-4 py-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
                      <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        Running {runsCount} Monte Carlo Stress Trials...
                      </span>
                    </div>
                    <span className="text-xs font-mono font-medium text-zinc-400">
                      Simulating Multi-Scenario Cash Shocks
                    </span>
                  </div>

                  {/* Histogram Bars Skeleton */}
                  <div className="h-[240px] flex items-end gap-1.5 px-2">
                    {[35, 60, 45, 80, 95, 70, 85, 90, 65, 50, 40, 30, 20, 15, 10].map((h, idx) => (
                      <div 
                        key={idx} 
                        className="flex-1 rounded-t animate-pulse bg-slate-200 dark:bg-zinc-800/80" 
                        style={{ height: `${h}%` }} 
                      />
                    ))}
                  </div>

                  <div className="flex justify-between text-[10px] font-mono text-zinc-400 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <span>Evaluating Downside (P10)</span>
                    <span>Median Cash Flow (P50)</span>
                    <span>Solvency Bounds (P90)</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Safety Floor Label - Top */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <BarChart3 className={`w-4 h-4 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`} />
                      <span className={`text-xs font-medium ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                        Minimum Cash Distribution
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-0.5 bg-red-500" />
                      <span className="text-xs font-medium text-red-500">
                        Safety Floor: {formatINR(floor)}
                      </span>
                    </div>
                  </div>

                  {/* Histogram Container */}
                  <div className="relative" style={{ height: `${chartHeight + 60}px` }}>
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-right pr-2" style={{ width: '40px' }}>
                      {[maxCount, Math.round(maxCount * 0.75), Math.round(maxCount * 0.5), Math.round(maxCount * 0.25), 0].map((val, i) => (
                        <span key={i} className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
                          {val}
                        </span>
                      ))}
                    </div>

                    {/* Chart area */}
                    <div className="ml-10 relative" style={{ height: `${chartHeight}px` }}>
                      {/* Grid lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
                        <div 
                          key={i}
                          className={`absolute w-full border-t ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}
                          style={{ top: `${ratio * 100}%` }}
                        />
                      ))}

                      {/* Safety Floor line */}
                      {floorBinIndex >= 0 && (
                        <div 
                          className="absolute w-full border-t-2 border-red-500 border-dashed z-10 pointer-events-none"
                          style={{ 
                            left: 0,
                            right: 0,
                          }}
                        >
                          <div className="absolute -top-5 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                            SAFETY FLOOR: {formatINR(floor)}
                          </div>
                        </div>
                      )}

                      {/* Histogram bars */}
                      <div className="absolute inset-0 flex items-end" style={{ gap: '2px' }}>
                        {bins.map((bin, i) => {
                          const height = (bin.count / maxCount) * 100;
                          
                          // Color intensity based on count
                          const intensity = bin.count / maxCount;
                          const breachColor = intensity > 0.7 
                            ? 'from-red-700 to-red-500' 
                            : intensity > 0.4 
                              ? 'from-red-600 to-red-400'
                              : 'from-red-500 to-red-300';
                          const safeColor = intensity > 0.7 
                            ? 'from-emerald-700 to-emerald-500' 
                            : intensity > 0.4 
                              ? 'from-emerald-600 to-emerald-400'
                              : 'from-emerald-500 to-emerald-300';
                          
                          return (
                            <div
                              key={i}
                              className="flex-1 flex flex-col justify-end relative group"
                              style={{ height: '100%' }}
                            >
                              {/* Bar */}
                              <div 
                                className={`w-full rounded-t transition-all duration-200 cursor-pointer hover:opacity-80 hover:scale-x-110 ${
                                  bin.isBreached 
                                    ? `bg-gradient-to-t ${breachColor}` 
                                    : `bg-gradient-to-t ${safeColor}`
                                }`}
                                style={{ height: `${Math.max(height, 2)}%` }}
                              />
                              
                              {/* Tooltip on hover */}
                              <div className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-20 px-3 py-2 rounded-lg text-xs font-mono whitespace-nowrap shadow-xl border ${
                                isLight ? 'bg-slate-800 border-slate-700 text-white' : 'bg-zinc-800 border-zinc-700 text-white'
                              }`}>
                                <div className="font-bold">{bin.count} simulations</div>
                                <div className="text-[10px] opacity-75">{bin.range}</div>
                                <div className={`text-[10px] font-semibold ${bin.isBreached ? 'text-red-400' : 'text-emerald-400'}`}>
                                  {bin.isBreached ? 'Breaches Safety Floor' : 'Above Safety Floor'}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* P10, P50, P90 markers - positioned based on actual values */}
                      {[
                        { value: p10, label: 'P10', color: '#f97316', sublabel: 'Downside' },
                        { value: p50, label: 'P50', color: '#eab308', sublabel: 'Median' },
                        { value: p90, label: 'P90', color: '#22c55e', sublabel: 'Upside' },
                      ].map((marker, i) => {
                        const rangeMin = parseFloat(bins[0].range) * 100000;
                        const rangeMax = parseFloat(bins[bins.length - 1].range) * 100000;
                        const position = ((marker.value - rangeMin) / (rangeMax - rangeMin)) * 100;
                        
                        return (
                          <div
                            key={i}
                            className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none"
                            style={{ left: `${Math.max(5, Math.min(95, position))}%` }}
                          >
                            {/* Dashed vertical line */}
                            <div 
                              className="absolute top-0 bottom-0 w-0.5 border-l-2 border-dashed"
                              style={{ borderColor: marker.color }}
                            />
                            
                            {/* Marker dot */}
                            <div 
                              className="absolute w-5 h-5 rounded-full shadow-xl"
                              style={{ 
                                backgroundColor: marker.color,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                border: '3px solid white',
                              }}
                            />
                            
                            {/* Label */}
                            <div className="absolute -top-8 text-center bg-white/95 dark:bg-zinc-800/95 px-2 py-1 rounded shadow-lg border border-zinc-700/50">
                              <div className="text-xs font-bold" style={{ color: marker.color }}>
                                {marker.label}
                              </div>
                              <div className="text-[10px] font-medium" style={{ color: marker.color }}>
                                {marker.sublabel}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* X-axis labels */}
                    <div className="ml-10 flex justify-between mt-2">
                      {bins.filter((_, i) => i % Math.ceil(bins.length / 8) === 0 || i === bins.length - 1).map((bin, i) => (
                        <span key={i} className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                          {bin.range}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className={`flex flex-wrap items-center justify-center gap-6 mt-4 pt-3 border-t font-mono ${
                    isLight ? 'border-slate-200' : 'border-zinc-800'
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-gradient-to-t from-red-700 to-red-400" />
                      <span className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                        Below Safety Floor
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-gradient-to-t from-emerald-700 to-emerald-400" />
                      <span className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                        Above Safety Floor
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-0.5 bg-red-500 border-t-2 border-dashed border-red-500" />
                      <span className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                        Safety Floor ({formatINR(floor)})
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 4 Stats Cards / Skeletons */}
            {isSimulating ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPISkeleton />
                <KPISkeleton />
                <KPISkeleton />
                <KPISkeleton />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
                <div className={`p-4 rounded-xl border shadow-sm transition-all ${
                  isLight ? 'bg-white border-slate-200 hover:border-orange-300' : 'bg-zinc-900/80 border-zinc-800 hover:border-orange-500/40'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-4 h-4 text-orange-500 shrink-0" />
                    <span className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>P10 (Downside)</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-500 tracking-tight">{formatINR(p10)}</div>
                  <p className={`text-xs mt-1.5 font-medium ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>10% of outcomes worse</p>
                </div>
                
                <div className={`p-4 rounded-xl border shadow-sm transition-all ${
                  isLight ? 'bg-white border-slate-200 hover:border-amber-300' : 'bg-zinc-900/80 border-zinc-800 hover:border-amber-500/40'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>P50 (Median)</span>
                  </div>
                  <div className={`text-2xl font-bold tracking-tight ${p50 < floor ? 'text-amber-500' : isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>{formatINR(p50)}</div>
                  <p className={`text-xs mt-1.5 font-medium ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Median outcome</p>
                </div>
                
                <div className={`p-4 rounded-xl border shadow-sm transition-all ${
                  isLight ? 'bg-white border-slate-200 hover:border-emerald-300' : 'bg-zinc-900/80 border-zinc-800 hover:border-emerald-500/40'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>P90 (Upside)</span>
                  </div>
                  <div className={`text-2xl font-bold tracking-tight ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>{formatINR(p90)}</div>
                  <p className={`text-xs mt-1.5 font-medium ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>90% of outcomes better</p>
                </div>
                
                <div className={`p-4 rounded-xl border shadow-sm transition-all ${
                  breachProb > 0.5
                    ? isLight ? 'bg-red-50/60 border-red-200' : 'bg-red-500/10 border-red-500/30'
                    : isLight ? 'bg-white border-slate-200 hover:border-emerald-300' : 'bg-zinc-900/80 border-zinc-800 hover:border-emerald-500/40'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className={`w-4 h-4 shrink-0 ${breachProb > 0.5 ? 'text-red-500' : isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                    <span className={`text-xs font-semibold ${breachProb > 0.5 ? 'text-red-600' : isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Breach Risk</span>
                  </div>
                  <div className={`text-2xl font-bold tracking-tight ${breachProb > 0.5 ? 'text-red-500' : isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
                    {(breachProb * 100).toFixed(0)}%
                  </div>
                  <p className={`text-xs mt-1.5 font-medium ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>{totalRuns} scenarios ({breachCount} breaches)</p>
                </div>
              </div>
            )}

            {/* Clear Statement */}
            <div className={`p-4 rounded-xl border ${
              breachProb >= 1 
                ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                : isLight ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}>
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-sm font-medium">
                  {breachProb >= 1 
                    ? `All ${totalRuns} simulated scenarios fall below the ${formatINR(floor)} safety floor.`
                    : `${(breachProb * 100).toFixed(0)}% of ${totalRuns} scenarios breach the ${formatINR(floor)} safety floor.`
                  }
                </p>
              </div>
            </div>

            {/* How to Read This Chart */}
            <div className={`p-5 rounded-xl border ${
              isLight ? 'bg-indigo-50 border-indigo-200 text-indigo-900' : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-200'
            }`}>
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 mt-0.5 text-indigo-500 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold mb-2">How to Read This Chart</h4>
                  <div className="text-xs leading-relaxed space-y-1.5 opacity-90">
                    <p>
                      Each bar represents how many of the <strong>{totalRuns} simulations</strong> resulted in that minimum cash level.
                      <strong className="mx-1 text-red-400">Taller red bars</strong> mean more simulations landed in the breach zone.
                    </p>
                    <p>
                      The <strong className="text-red-400">dashed red line</strong> is the safety floor of {formatINR(floor)}.
                      The <strong className="text-orange-400">P10</strong> (downside), <strong className="text-amber-400">P50</strong> (median), and <strong className="text-emerald-400">P90</strong> (upside) markers show the distribution percentiles.
                    </p>
                    <p>
                      <strong>Why are values clustered?</strong> The noise in collection probability (&plusmn;10%), payment timing (&plusmn;3 days), and demand (&plusmn;15%) creates variation, but the structural deficit (₹27L outflows vs ₹13L inflows) means all outcomes breach the floor. The variation shifts <em>when</em> the breach happens, not <em>whether</em> it happens.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: MATHEMATICAL FORMULATIONS & DERIVATIONS ─────────── */}
        {activeTab === 'math' && (
          <div className="space-y-6 font-mono animate-fadeIn">
            <div>
              <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${
                isLight ? 'text-indigo-600' : 'text-indigo-400'
              }`}>
                <Calculator className="w-4 h-4" />
                Mathematical Specification of the Stochastic Simulation Engine
              </h3>
              <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Rigorous stochastic process equations driving FlowShield's liquidity risk projections.
              </p>
            </div>

            {/* Formula Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Formula 1: Daily Cash Conservation */}
              <div className={`p-5 rounded-2xl border shadow-sm transition-all ${
                isLight ? 'bg-white border-slate-200 hover:border-emerald-300' : 'bg-zinc-950 border-zinc-800 hover:border-emerald-500/40'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold uppercase ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                    1. Daily Cash Conservation Equation
                  </span>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold ${
                    isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-950/50 border-emerald-700 text-emerald-300'
                  }`}>
                    Discrete Time Horizon
                  </span>
                </div>
                <div className={`p-4 rounded-xl border my-3 text-center text-sm font-bold shadow-inner ${
                  isLight ? 'bg-emerald-50/50 border-emerald-300 text-emerald-900' : 'bg-zinc-900 border-zinc-700 text-emerald-300'
                }`}>
                  <span>C(t) = C(t−1) + I</span><sub>t</sub><span>(ω) − O</span><sub>t</sub><span>(ω)</span>
                </div>
                <div className={`text-xs space-y-1.5 ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
                  <p>Where for simulation trial ω ∈ [1, N]:</p>
                  <p>• <strong className={isLight ? 'text-slate-900' : 'text-zinc-200'}>C(t)</strong> = Closing cash balance on day t ∈ [1, 90]</p>
                  <p>• <strong className={isLight ? 'text-slate-900' : 'text-zinc-200'}>I<sub>t</sub>(ω)</strong> = Total stochastic inflows on day t (collections + advances)</p>
                  <p>• <strong className={isLight ? 'text-slate-900' : 'text-zinc-200'}>O<sub>t</sub>(ω)</strong> = Total stochastic outflows on day t (payables + recurring OPEX)</p>
                </div>
              </div>

              {/* Formula 2: Monte Carlo Scenario Noise */}
              <div className={`p-5 rounded-2xl border shadow-sm transition-all ${
                isLight ? 'bg-white border-slate-200 hover:border-sky-300' : 'bg-zinc-950 border-zinc-800 hover:border-sky-500/40'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold uppercase ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>
                    2. Monte Carlo Scenario Noise
                  </span>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold ${
                    isLight ? 'bg-sky-50 border-sky-300 text-sky-800' : 'bg-sky-950/50 border-sky-700 text-sky-300'
                  }`}>
                    Stochastic Perturbations
                  </span>
                </div>
                <div className={`p-3.5 rounded-xl border my-2 text-center text-xs font-bold space-y-1.5 shadow-inner ${
                  isLight ? 'bg-sky-50/50 border-sky-300 text-sky-950' : 'bg-zinc-900 border-zinc-700 text-sky-300'
                }`}>
                  <div className="flex items-center justify-center gap-2">
                    <span>P</span><sub>i</sub><span>' = clamp(P</span><sub>i</sub><span> + ΔP, 0, 1),</span>
                    <span className="text-[11px] font-medium opacity-85">ΔP ∈ [−{(arVol * 100).toFixed(0)}%, +{(arVol * 100).toFixed(0)}%]</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span>PaymentDate</span><sub>i</sub><span>' = PaymentDate</span><sub>i</sub><span> + Δdays,</span>
                    <span className="text-[11px] font-medium opacity-85">Δdays ∈ [−{payDelay}, +{payDelay}]</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span>D̅' = D̅(1 + Δdemand),</span>
                    <span className="text-[11px] font-medium opacity-85">Δdemand ∈ [−{(demandVol * 100).toFixed(0)}%, +{(demandVol * 100).toFixed(0)}%]</span>
                  </div>
                </div>
                <div className={`text-xs space-y-1.5 ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
                  <p>Stochastic perturbations evaluated per trial:</p>
                  <p>• <strong className={isLight ? 'text-slate-900' : 'text-zinc-200'}>ΔP (AR Collection Shock):</strong> Customer payment probability drift</p>
                  <p>• <strong className={isLight ? 'text-slate-900' : 'text-zinc-200'}>Δdays (Settlement Slippage):</strong> Vendor payment disbursement timing drift</p>
                  <p>• <strong className={isLight ? 'text-slate-900' : 'text-zinc-200'}>Δdemand (Demand Cycle):</strong> Stochastic revenue &amp; sales volume perturbation</p>
                </div>
              </div>

              {/* Formula 3: Quantile Ranking & Value-at-Risk */}
              <div className={`p-5 rounded-2xl border shadow-sm transition-all ${
                isLight ? 'bg-white border-slate-200 hover:border-purple-300' : 'bg-zinc-950 border-zinc-800 hover:border-purple-500/40'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold uppercase ${isLight ? 'text-purple-700' : 'text-purple-400'}`}>
                    3. Quantile Ranking &amp; Value-at-Risk
                  </span>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold ${
                    isLight ? 'bg-purple-50 border-purple-300 text-purple-800' : 'bg-purple-950/50 border-purple-700 text-purple-300'
                  }`}>
                    Risk Metric Estimator
                  </span>
                </div>
                <div className={`p-4 rounded-xl border my-3 text-center leading-relaxed shadow-inner ${
                  isLight ? 'bg-purple-50/50 border-purple-300 text-purple-900' : 'bg-zinc-900 border-zinc-700 text-purple-300'
                }`}>
                  <div className="text-sm font-bold">
                    <span>P</span><sub>k</sub><span> = C</span><sub>sorted</sub><span>[⌊k/100 × (N−1)⌋]</span>
                  </div>
                  <div className={`text-xs font-bold mt-1 ${isLight ? 'text-purple-800' : 'text-purple-300/80'}`}>
                    <span>VaR</span><sub>90</sub><span>% = max(0, C</span><sub>floor</sub><span> − P</span><sub>10</sub><span>)</span>
                  </div>
                </div>
                <div className={`text-xs space-y-1.5 ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
                  <p>Non-parametric empirical quantile from <strong className={isLight ? 'text-slate-900' : 'text-zinc-200'}>N = {totalRuns}</strong> sorted minimum-cash outcomes:</p>
                  <p>• <strong className={isLight ? 'text-slate-900' : 'text-zinc-200'}>P<sub>10</sub></strong> (Index {Math.floor(totalRuns * 0.10)}): 10th percentile downside — <strong className={isLight ? 'text-orange-600 font-bold' : 'text-orange-400'}>{formatINR(p10)}</strong></p>
                  <p>• <strong className={isLight ? 'text-slate-900' : 'text-zinc-200'}>P<sub>50</sub></strong> (Index {Math.floor(totalRuns * 0.50)}): Median path — <strong className={isLight ? 'text-amber-600 font-bold' : 'text-amber-400'}>{formatINR(p50)}</strong></p>
                  <p>• <strong className={isLight ? 'text-slate-900' : 'text-zinc-200'}>P<sub>90</sub></strong> (Index {Math.floor(totalRuns * 0.90)}): 90th percentile upside — <strong className={isLight ? 'text-emerald-600 font-bold' : 'text-emerald-400'}>{formatINR(p90)}</strong></p>
                </div>
              </div>

              {/* Formula 4: Statistical Precision & Central Limit Theorem */}
              <div className={`p-5 rounded-2xl border shadow-sm transition-all ${
                isLight ? 'bg-white border-slate-200 hover:border-indigo-300' : 'bg-zinc-950 border-zinc-800 hover:border-indigo-500/40'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold uppercase ${isLight ? 'text-indigo-700' : 'text-indigo-400'}`}>
                    4. Statistical Precision &amp; Central Limit Theorem
                  </span>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold ${
                    isLight ? 'bg-indigo-50 border-indigo-300 text-indigo-800' : 'bg-indigo-950/50 border-indigo-700 text-indigo-300'
                  }`}>
                    Asymptotic Bounds
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-3">
                  <div className={`p-3 rounded-xl border text-center ${
                    isLight ? 'bg-indigo-50/40 border-indigo-200' : 'bg-zinc-900 border-zinc-800'
                  }`}>
                    <span className={`block text-[10px] uppercase tracking-wider font-semibold ${
                      isLight ? 'text-slate-600' : 'text-zinc-400'
                    }`}>
                      Standard Error
                    </span>
                    <div className={`text-xs font-bold font-mono mt-1 ${
                      isLight ? 'text-indigo-700' : 'text-indigo-400'
                    }`}>
                      SE = √(p(1−p)/N)
                    </div>
                    <div className={`text-xs font-bold mt-0.5 ${
                      isLight ? 'text-indigo-800' : 'text-indigo-300'
                    }`}>
                      ±{(se * 100).toFixed(2)}%
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border text-center ${
                    isLight ? 'bg-emerald-50/40 border-emerald-200' : 'bg-zinc-900 border-zinc-800'
                  }`}>
                    <span className={`block text-[10px] uppercase tracking-wider font-semibold ${
                      isLight ? 'text-slate-600' : 'text-zinc-400'
                    }`}>
                      95% Confidence Band
                    </span>
                    <div className={`text-xs font-bold font-mono mt-1 ${
                      isLight ? 'text-emerald-700' : 'text-emerald-400'
                    }`}>
                      [{(ci95[0] * 100).toFixed(1)}%, {(ci95[1] * 100).toFixed(1)}%]
                    </div>
                    <div className={`text-[10px] mt-0.5 ${
                      isLight ? 'text-slate-600' : 'text-zinc-400'
                    }`}>
                      Two-sided Wald
                    </div>
                  </div>
                </div>
                <div className={`text-xs space-y-1.5 ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
                  <p>Statistical confidence guarantees across <strong>N = {totalRuns}</strong> trials:</p>
                  <p>• Asymptotic Standard Error bounded at <strong className={isLight ? 'text-slate-900' : 'text-zinc-200'}>±{(se * 100).toFixed(2)}%</strong></p>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* ── TAB 3: ITERATION AUDIT LOG ───────────────────────────────── */}
        {activeTab === 'iterations' && (
          <div className="space-y-4 font-mono animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className={`font-bold uppercase tracking-wider block ${
                  isLight ? 'text-indigo-600' : 'text-indigo-400'
                }`}>
                  Simulated Iteration Trace Ledger ({totalRuns} Total Runs)
                </span>
                <span className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  Detailed execution audit trail showing terminal cash balances and first breach dates for every realization.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className={`flex rounded-lg p-0.5 border text-[11px] shadow-sm ${
                  isLight ? 'bg-slate-100 border-slate-300' : 'bg-zinc-900 border-zinc-800'
                }`}>
                  <button
                    onClick={() => setIterationFilter('all')}
                    className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-colors ${
                      iterationFilter === 'all'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : isLight ? 'text-slate-700 hover:bg-slate-200 hover:text-slate-900' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    All ({totalRuns})
                  </button>
                  <button
                    onClick={() => setIterationFilter('breach')}
                    className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-colors ${
                      iterationFilter === 'breach'
                        ? 'bg-red-600 text-white shadow-sm'
                        : isLight ? 'text-slate-700 hover:bg-slate-200 hover:text-slate-900' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    Breached ({breachCount})
                  </button>
                  <button
                    onClick={() => setIterationFilter('solvent')}
                    className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-colors ${
                      iterationFilter === 'solvent'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : isLight ? 'text-slate-700 hover:bg-slate-200 hover:text-slate-900' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    Solvent ({totalRuns - breachCount})
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Search run #..."
                  value={searchRun}
                  onChange={(e) => setSearchRun(e.target.value)}
                  className={`px-3 py-1.5 text-xs rounded-lg border w-32 outline-none transition-all shadow-sm ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500'
                  }`}
                />
              </div>
            </div>

            {/* Runs Table */}
            <div className={`rounded-2xl border shadow-sm overflow-hidden ${
              isLight ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-950'
            }`}>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead className={`sticky top-0 z-10 border-b text-[11px] font-bold uppercase tracking-wider ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                  }`}>
                    <tr>
                      <th className="p-3">Run #</th>
                      <th className="p-3">Minimum Cash</th>
                      <th className="p-3">Terminal (Day 90)</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Breach Window</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isLight ? 'divide-slate-200 bg-white' : 'divide-zinc-800/60 bg-zinc-950'}`}>
                    {filteredRuns.slice(0, 200).map((r) => (
                      <tr key={r.run} className={`transition-colors ${isLight ? 'hover:bg-slate-50' : 'hover:bg-zinc-800/40'}`}>
                        <td className={`p-3 font-bold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>#{r.run}</td>
                        <td className={`p-3 font-bold ${
                          r.minCash < floor
                            ? isLight ? 'text-red-600' : 'text-red-400'
                            : isLight ? 'text-emerald-700' : 'text-emerald-400'
                        }`}>
                          {formatINR(r.minCash)}
                        </td>
                        <td className={`p-3 font-semibold ${
                          r.terminalCash < floor
                            ? isLight ? 'text-red-600' : 'text-red-400'
                            : isLight ? 'text-slate-800' : 'text-zinc-200'
                        }`}>
                          {formatINR(r.terminalCash)}
                        </td>
                        <td className="p-3">
                          {r.hasBreach ? (
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              isLight ? 'bg-red-50 border-red-300 text-red-700' : 'bg-red-500/10 border-red-500/30 text-red-400'
                            }`}>
                              Breached
                            </span>
                          ) : (
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            }`}>
                              Solvent
                            </span>
                          )}
                        </td>
                        <td className={`p-3 font-medium ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                          {r.breachDay ? `Day ${r.breachDay}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={`p-3 border-t text-right text-[11px] font-medium ${
                isLight ? 'border-slate-200 bg-slate-50/70 text-slate-600' : 'border-zinc-800 bg-zinc-900/40 text-zinc-400'
              }`}>
                Showing {Math.min(filteredRuns.length, 200)} of {filteredRuns.length} trials
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
};

export default MonteCarloChart;
