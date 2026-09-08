import React, { useState, useMemo, useCallback } from 'react';
import {
  Zap,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Play,
  Box,
  RotateCcw,
  Sparkles,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { runSimulationEngine, formatINR } from '../engine/calculator';
import { Config, Transaction, Payable, Expense, SimulationResult } from '../types';
import {
  demoInventory,
  demoSuppliers,
  demoSales,
} from '../engine/sampleData';

// ── Scenario Definitions ────────────────────────────────────────────────────
interface ScenarioDef {
  id: string;
  title: string;
  description: string;
  iconType: 'clock' | 'box' | 'calendar' | 'zap';
  themeColor: {
    icon: string;
    iconBg: string;
    iconBorder: string;
    activeBorder: string;
    activeBgLight: string;
    activeBgDark: string;
    badgeText: string;
    badgeBg: string;
  };
  paramLabel: string;
  paramUnit: string;
  currentValue: number | ((config: Config) => number);
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  buildOverrides: (val: number) => any;
  buildConfig: (config: Config, val: number) => Config;
}

const SCENARIOS: ScenarioDef[] = [
  {
    id: 'supplier-delay',
    title: 'Supplier Delay',
    description: 'Increase or decrease supplier lead time to test delivery shock impact',
    iconType: 'clock',
    themeColor: {
      icon: 'text-amber-500 dark:text-amber-400',
      iconBg: 'bg-amber-500/10',
      iconBorder: 'border-amber-500/25',
      activeBorder: 'border-amber-500 ring-2 ring-amber-500/20',
      activeBgLight: 'bg-amber-50/70 border-amber-300 shadow-md',
      activeBgDark: 'bg-amber-500/10 border-amber-500/40 shadow-lg',
      badgeText: 'text-amber-700 dark:text-amber-300',
      badgeBg: 'bg-amber-500/10 border-amber-500/20',
    },
    paramLabel: 'Supplier Lead Time',
    paramUnit: 'days',
    currentValue: (config) => config.supplier_delay_days,
    defaultValue: 20,
    min: 0,
    max: 60,
    step: 1,
    buildOverrides: () => undefined,
    buildConfig: (config, val) => ({ ...config, supplier_delay_days: val }),
  },
  {
    id: 'procurement-reduction',
    title: 'Procurement Reduction',
    description: 'Reduce procurement spend to test cost-cutting impact on cash',
    iconType: 'box',
    themeColor: {
      icon: 'text-rose-500 dark:text-rose-400',
      iconBg: 'bg-rose-500/10',
      iconBorder: 'border-rose-500/25',
      activeBorder: 'border-rose-500 ring-2 ring-rose-500/20',
      activeBgLight: 'bg-rose-50/70 border-rose-300 shadow-md',
      activeBgDark: 'bg-rose-500/10 border-rose-500/40 shadow-lg',
      badgeText: 'text-rose-700 dark:text-rose-300',
      badgeBg: 'bg-rose-500/10 border-rose-500/20',
    },
    paramLabel: 'Procurement Cut',
    paramUnit: '%',
    currentValue: () => 0,
    defaultValue: 20,
    min: 0,
    max: 50,
    step: 5,
    buildOverrides: (val) => ({ procurementReductionPercent: val }),
    buildConfig: (config) => config,
  },
  {
    id: 'supplier-term-extension',
    title: 'Supplier Term Extension',
    description: 'Extend payment terms with suppliers to delay cash outflows',
    iconType: 'calendar',
    themeColor: {
      icon: 'text-blue-500 dark:text-blue-400',
      iconBg: 'bg-blue-500/10',
      iconBorder: 'border-blue-500/25',
      activeBorder: 'border-blue-500 ring-2 ring-blue-500/20',
      activeBgLight: 'bg-blue-50/70 border-blue-300 shadow-md',
      activeBgDark: 'bg-blue-500/10 border-blue-500/40 shadow-lg',
      badgeText: 'text-blue-700 dark:text-blue-300',
      badgeBg: 'bg-blue-500/10 border-blue-500/20',
    },
    paramLabel: 'Term Extension',
    paramUnit: 'days',
    currentValue: () => 0,
    defaultValue: 15,
    min: 0,
    max: 45,
    step: 1,
    buildOverrides: (val) => ({ supplierTermExtensionDays: val }),
    buildConfig: (config) => config,
  },
  {
    id: 'customer-advance',
    title: 'Customer Advance',
    description: 'Request upfront payment from customers to boost immediate cash',
    iconType: 'zap',
    themeColor: {
      icon: 'text-emerald-500 dark:text-emerald-400',
      iconBg: 'bg-emerald-500/10',
      iconBorder: 'border-emerald-500/25',
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/20',
      activeBgLight: 'bg-emerald-50/70 border-emerald-300 shadow-md',
      activeBgDark: 'bg-emerald-500/10 border-emerald-500/40 shadow-lg',
      badgeText: 'text-emerald-700 dark:text-emerald-300',
      badgeBg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    paramLabel: 'Advance Payment',
    paramUnit: '%',
    currentValue: () => 0,
    defaultValue: 30,
    min: 0,
    max: 50,
    step: 5,
    buildOverrides: (val) => ({ customerAdvancePercent: val }),
    buildConfig: (config) => config,
  },
];

// ── Props ───────────────────────────────────────────────────────────────────
interface WhatIfSimulatorProps {
  config: Config;
  transactions: Transaction[];
  payables: Payable[];
  expenses: Expense[];
  currentSimulationResult: SimulationResult;
  onVisualizeIn3D: (scenarioId: string, paramValue: number, whatIfResult: SimulationResult) => void;
}

export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({
  config,
  transactions,
  payables,
  expenses,
  currentSimulationResult,
  onVisualizeIn3D,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // ── State ───────────────────────────────────────────────────────────────
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [paramValue, setParamValue] = useState<number>(20);
  const [isRunning, setIsRunning] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState<SimulationResult | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [multiScenarioResults, setMultiScenarioResults] = useState<
    { scenario: ScenarioDef; value: number; result: SimulationResult }[]
  >([]);

  const selectedScenario = SCENARIOS.find((s) => s.id === selectedScenarioId);

  // ── Current baseline values ─────────────────────────────────────────────
  const baseline = currentSimulationResult;

  // ── Run Decision Impact Analysis ────────────────────────────────────────
  const runWhatIf = useCallback(
    (scenario: ScenarioDef, value: number) => {
      setIsRunning(true);
      setHasRun(false);

      // Use setTimeout to allow UI to update
      setTimeout(() => {
        try {
          const modifiedConfig = scenario.buildConfig(config, value);
          const overrides = scenario.buildOverrides(value);

          const result = runSimulationEngine(
            modifiedConfig,
            transactions,
            payables,
            expenses,
            demoInventory,
            demoSuppliers,
            demoSales,
            overrides
          );

          setWhatIfResult(result);
          setHasRun(true);
        } catch (err) {
          console.error('What-If simulation failed:', err);
          setWhatIfResult(null);
          setHasRun(true);
        } finally {
          setIsRunning(false);
        }
      }, 50);
    },
    [config, transactions, payables, expenses]
  );

  // ── Handle Run Button Click ─────────────────────────────────────────────
  const handleRun = () => {
    if (!selectedScenario) return;
    runWhatIf(selectedScenario, paramValue);
  };

  // ── Handle Scenario Selection ───────────────────────────────────────────
  const handleSelectScenario = (scenario: ScenarioDef) => {
    setSelectedScenarioId(scenario.id);
    setParamValue(scenario.defaultValue);
    setWhatIfResult(null);
    setHasRun(false);
  };

  // ── Handle Reset ────────────────────────────────────────────────────────
  const handleReset = () => {
    setSelectedScenarioId(null);
    setParamValue(20);
    setWhatIfResult(null);
    setHasRun(false);
    setMultiScenarioResults([]);
  };

  // ── Run All Scenarios ──────────────────────────────────────────────────
  const handleRunAll = () => {
    setIsRunning(true);
    setMultiScenarioResults([]);

    setTimeout(() => {
      try {
        const results = SCENARIOS.map((scenario) => {
          const modifiedConfig = scenario.buildConfig(config, scenario.defaultValue);
          const overrides = scenario.buildOverrides(scenario.defaultValue);
          const result = runSimulationEngine(
            modifiedConfig,
            transactions,
            payables,
            expenses,
            demoInventory,
            demoSuppliers,
            demoSales,
            overrides
          );
          return { scenario, value: scenario.defaultValue, result };
        });
        setMultiScenarioResults(results);
      } catch (err) {
        console.error('Multi-scenario run failed:', err);
      } finally {
        setIsRunning(false);
      }
    }, 50);
  };

  // ── Decision Status from Result ────────────────────────────────────────
  const getDecisionStatus = (result: SimulationResult) => {
    if (!result) return { label: 'UNKNOWN', color: 'slate', icon: null, text: '' };
    if (!result.hasBreach) {
      return {
        label: 'SAFE',
        color: 'emerald',
        icon: ShieldCheck,
        text: 'Projected cash remains above the configured safety floor.',
      };
    }
    if (result.breachProbability > 0.6) {
      return {
        label: 'BREACH',
        color: 'red',
        icon: XCircle,
        text: 'This scenario still produces a projected safety-floor breach.',
      };
    }
    return {
      label: 'WARNING',
      color: 'amber',
      icon: AlertTriangle,
      text: 'Marginal liquidity — close to the safety floor threshold.',
    };
  };

  const currentStatus = getDecisionStatus(baseline);
  const whatIfStatus = whatIfResult ? getDecisionStatus(whatIfResult) : null;

  // ── Impact Calculations ────────────────────────────────────────────────
  const impact = useMemo(() => {
    if (!whatIfResult) return null;
    const cashDelta = whatIfResult.minProjectedCash - baseline.minProjectedCash;
    const breachProbDelta = whatIfResult.breachProbability - baseline.breachProbability;
    const p10Delta = whatIfResult.p10Cash - baseline.p10Cash;
    return { cashDelta, breachProbDelta, p10Delta };
  }, [whatIfResult, baseline]);

  // ── Styles ──────────────────────────────────────────────────────────────
  const cardBg = isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-zinc-900 border-zinc-800';
  const subtleBg = isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-zinc-900/60 border-zinc-800';
  const textPrimary = isLight ? 'text-slate-900' : 'text-white';
  const textSecondary = isLight ? 'text-slate-700' : 'text-zinc-300';
  const textMuted = isLight ? 'text-slate-600' : 'text-zinc-400';
  const sectionTitle = isLight ? 'text-slate-900 font-bold' : 'text-zinc-200 font-bold';

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'SAFE':
        return isLight
          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
          : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'BREACH':
        return isLight
          ? 'bg-red-100 text-red-800 border-red-300 font-bold'
          : 'bg-red-500/15 text-red-300 border-red-500/30';
      case 'WARNING':
        return isLight
          ? 'bg-amber-100 text-amber-800 border-amber-300 font-bold'
          : 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      default:
        return isLight
          ? 'bg-slate-100 text-slate-700 border-slate-300 font-medium'
          : 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SAFE':
        return <ShieldCheck className="w-5 h-5 text-emerald-500" />;
      case 'BREACH':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 font-sans max-w-[1400px] mx-auto">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/25">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h1 className={`text-2xl font-semibold tracking-tight ${textPrimary}`}>
                Decision Impact Analysis
              </h1>
              <p className={`text-xs mt-0.5 ${textSecondary}`}>
                Test business decisions before making them in the real world.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRunAll}
            disabled={isRunning}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-mono font-medium border transition-colors cursor-pointer ${
              isLight
                ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Compare All Scenarios
          </button>
          {(selectedScenarioId || hasRun) && (
            <button
              onClick={handleReset}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-mono font-medium border transition-colors cursor-pointer ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ── SECTION 1: SELECT SCENARIO ─────────────────────────────────── */}
      <div className={`rounded-2xl border p-5 ${cardBg}`}>
        <div className="flex items-center gap-2 mb-4">
          <Target className={`w-4 h-4 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
          <h2 className={`text-sm font-bold font-mono uppercase tracking-wider ${sectionTitle}`}>
            Step 1: Select Scenario
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SCENARIOS.map((scenario) => {
            const isSelected = selectedScenarioId === scenario.id;
            const currentValueRaw =
              typeof scenario.currentValue === 'function'
                ? scenario.currentValue(config)
                : scenario.currentValue;
            const tc = scenario.themeColor;
            return (
              <button
                key={scenario.id}
                onClick={() => handleSelectScenario(scenario)}
                className={`text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer relative flex flex-col justify-between ${
                  isSelected
                    ? isLight
                      ? tc.activeBgLight + ' ' + tc.activeBorder
                      : tc.activeBgDark + ' ' + tc.activeBorder
                    : isLight
                      ? 'bg-white border-slate-200 hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-md'
                      : 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-700 hover:-translate-y-0.5 hover:shadow-lg'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-9 h-9 rounded-xl ${tc.iconBg} border ${tc.iconBorder} flex items-center justify-center`}>
                      {scenario.iconType === 'clock' && <Clock className={`w-4 h-4 ${tc.icon}`} />}
                      {scenario.iconType === 'box' && <Box className={`w-4 h-4 ${tc.icon}`} />}
                      {scenario.iconType === 'calendar' && <Calendar className={`w-4 h-4 ${tc.icon}`} />}
                      {scenario.iconType === 'zap' && <Zap className={`w-4 h-4 ${tc.icon}`} />}
                    </div>
                    {isSelected && (
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${tc.badgeBg} ${tc.badgeText}`}>
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className={`text-xs font-bold ${textPrimary}`}>{scenario.title}</div>
                  <div className={`text-[11px] mt-1 leading-relaxed ${textSecondary}`}>
                    {scenario.description}
                  </div>
                </div>
                <div className={`text-[10px] font-mono mt-3 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-zinc-800/60'} flex items-center justify-between`}>
                  <span className={textMuted}>Current Plan:</span>
                  <span className={`font-bold px-2 py-0.5 rounded-md border ${tc.badgeBg} ${tc.badgeText}`}>
                    {currentValueRaw} {scenario.paramUnit}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── SECTION 2 & 3: CONTROLS + RUN ─────────────────────────────── */}
      {selectedScenario && (
        <div className={`rounded-2xl border p-5 ${cardBg}`}>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className={`w-4 h-4 ${isLight ? 'text-amber-500' : 'text-amber-400'}`} />
            <h2 className={`text-sm font-bold font-mono uppercase tracking-wider ${sectionTitle}`}>
              Step 2: Configure Decision Scenario
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Value */}
            <div className={`p-4 rounded-xl border ${subtleBg}`}>
              <div className={`text-[10px] font-mono uppercase font-semibold ${textMuted} mb-1`}>
                Current Business Plan
              </div>
              <div className={`text-3xl font-bold font-mono ${textPrimary}`}>
                {typeof selectedScenario.currentValue === 'function'
                  ? selectedScenario.currentValue(config)
                  : selectedScenario.currentValue}
                <span className={`text-sm ml-1 ${textSecondary}`}>
                  {selectedScenario.paramUnit}
                </span>
              </div>
              <div className={`text-[11px] mt-1 font-medium ${textSecondary}`}>
                {selectedScenario.title} — baseline value
              </div>
            </div>

            {/* What-If Control */}
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 dark:border-indigo-500/30 dark:bg-indigo-500/5">
              <div className={`text-[10px] font-mono uppercase font-bold ${isLight ? 'text-indigo-700' : 'text-indigo-400'} mb-1`}>
                Decision Scenario
              </div>
              <div className={`text-3xl font-bold font-mono ${isLight ? 'text-indigo-700' : 'text-indigo-400'}`}>
                {paramValue}
                <span className={`text-sm ml-1 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
                  {selectedScenario.paramUnit}
                </span>
              </div>
              <div className="mt-3">
                <input
                  type="range"
                  min={selectedScenario.min}
                  max={selectedScenario.max}
                  step={selectedScenario.step}
                  value={paramValue}
                  onChange={(e) => setParamValue(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-indigo-200 dark:bg-indigo-800 accent-indigo-600"
                />
                <div className="flex justify-between mt-1">
                  <span className={`text-[10px] font-mono font-medium ${textMuted}`}>{selectedScenario.min}</span>
                  <span className={`text-[10px] font-mono font-medium ${textMuted}`}>{selectedScenario.max} {selectedScenario.paramUnit}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Run Button */}
          <div className="mt-5 flex justify-center">
            <button
              onClick={handleRun}
              disabled={isRunning}
              className={`flex items-center gap-2.5 px-8 py-3 rounded-xl font-mono text-sm font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                isRunning
                  ? 'bg-indigo-400 text-white cursor-wait'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30'
              }`}
            >
              {isRunning ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  Running Simulation...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run Decision Impact Analysis
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── SECTION 4: CURRENT VS WHAT-IF COMPARISON ──────────────────── */}
      {hasRun && whatIfResult && (
        <div className="space-y-6">
          <div className={`rounded-2xl border p-5 ${cardBg}`}>
            <div className="flex items-center gap-2 mb-5">
              <BarChart3 className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
              <h2 className={`text-sm font-bold font-mono uppercase tracking-wider ${sectionTitle}`}>
                Step 3: Results Comparison
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Current Plan Card */}
              <div className={`rounded-xl border p-5 ${isLight ? 'bg-slate-50/90 border-slate-300' : 'bg-zinc-950 border-zinc-800'}`}>
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>
                    Current Plan
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${getStatusStyle(currentStatus.label)}`}>
                    {currentStatus.label}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-medium ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Current Cash</span>
                    <span className={`text-sm font-bold font-mono ${textPrimary}`}>
                      {formatINR(baseline.currentCash)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-medium ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Min. Projected (90D)</span>
                    <span className={`text-sm font-bold font-mono ${baseline.hasBreach ? 'text-red-600' : 'text-emerald-600'}`}>
                      {formatINR(baseline.minProjectedCash)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-medium ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Breach Probability</span>
                    <span className={`text-sm font-bold font-mono ${baseline.breachProbability > 0.5 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {(baseline.breachProbability * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-medium ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Breach Horizon</span>
                    <span className={`text-sm font-bold font-mono ${baseline.hasBreach ? 'text-red-600' : 'text-emerald-600'}`}>
                      {baseline.earliestBreachDate || 'No Breach'}
                    </span>
                  </div>
                  <div className={`border-t ${isLight ? 'border-slate-200' : 'border-zinc-800'} pt-3 mt-3`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-mono font-medium ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>P10 Downside</span>
                      <span className={`text-xs font-mono font-bold ${baseline.p10Cash < config.cash_floor ? 'text-red-600' : 'text-amber-600'}`}>
                        {formatINR(baseline.p10Cash)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className={`text-[10px] font-mono font-medium ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>P50 Expected</span>
                      <span className={`text-xs font-mono font-bold ${textPrimary}`}>
                        {formatINR(baseline.p50Cash)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className={`text-[10px] font-mono font-medium ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>P90 Upside</span>
                      <span className={`text-xs font-mono font-bold text-emerald-600`}>
                        {formatINR(baseline.p90Cash)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* What-If Card */}
              <div className={`rounded-xl border p-5 ${
                whatIfStatus?.label === 'SAFE'
                  ? isLight ? 'bg-emerald-50/80 border-emerald-300' : 'bg-emerald-500/5 border-emerald-500/20'
                  : whatIfStatus?.label === 'BREACH'
                    ? isLight ? 'bg-red-50/80 border-red-300' : 'bg-red-500/5 border-red-500/20'
                    : isLight ? 'bg-amber-50/80 border-amber-300' : 'bg-amber-500/5 border-amber-500/20'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isLight ? 'text-indigo-800' : 'text-indigo-400'}`}>
                    Scenario: {selectedScenario?.title} = {paramValue}{selectedScenario?.paramUnit}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${whatIfStatus ? getStatusStyle(whatIfStatus.label) : ''}`}>
                    {whatIfStatus?.label}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-medium ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Current Cash</span>
                    <span className={`text-sm font-bold font-mono ${textPrimary}`}>
                      {formatINR(whatIfResult.currentCash)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-medium ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Min. Projected (90D)</span>
                    <span className={`text-sm font-bold font-mono ${whatIfResult.hasBreach ? 'text-red-600' : 'text-emerald-600'}`}>
                      {formatINR(whatIfResult.minProjectedCash)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-medium ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Breach Probability</span>
                    <span className={`text-sm font-bold font-mono ${whatIfResult.breachProbability > 0.5 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {(whatIfResult.breachProbability * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-medium ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Breach Horizon</span>
                    <span className={`text-sm font-bold font-mono ${whatIfResult.hasBreach ? 'text-red-600' : 'text-emerald-600'}`}>
                      {whatIfResult.earliestBreachDate || 'No Breach'}
                    </span>
                  </div>
                  <div className={`border-t ${isLight ? 'border-slate-200' : 'border-zinc-800'} pt-3 mt-3`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-mono font-medium ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>P10 Downside</span>
                      <span className={`text-xs font-mono font-bold ${whatIfResult.p10Cash < config.cash_floor ? 'text-red-600' : 'text-amber-600'}`}>
                        {formatINR(whatIfResult.p10Cash)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className={`text-[10px] font-mono font-medium ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>P50 Expected</span>
                      <span className={`text-xs font-mono font-bold ${textPrimary}`}>
                        {formatINR(whatIfResult.p50Cash)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className={`text-[10px] font-mono font-medium ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>P90 Upside</span>
                      <span className={`text-xs font-mono font-bold text-emerald-600`}>
                        {formatINR(whatIfResult.p90Cash)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── IMPACT SECTION ──────────────────────────────────────────── */}
          {impact && (
            <div className={`rounded-2xl border p-5 ${cardBg}`}>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className={`w-4 h-4 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
                <h2 className={`text-sm font-bold font-mono uppercase tracking-wider ${sectionTitle}`}>
                  Scenario Impact
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Minimum Cash Impact */}
                <div className={`p-4 rounded-xl border text-center ${subtleBg}`}>
                  <div className={`text-[10px] font-mono uppercase font-bold ${isLight ? 'text-slate-700' : 'text-zinc-300'} mb-1`}>
                    Minimum Cash
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className={`text-sm font-mono font-medium ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                      {formatINR(baseline.minProjectedCash)}
                    </span>
                    <ArrowRight className={`w-3.5 h-3.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`} />
                    <span className={`text-lg font-bold font-mono ${whatIfResult!.hasBreach ? 'text-red-600' : 'text-emerald-600'}`}>
                      {formatINR(whatIfResult!.minProjectedCash)}
                    </span>
                  </div>
                  <div className={`mt-2 text-xs font-bold font-mono flex items-center justify-center gap-1 ${
                    impact.cashDelta > 0 ? 'text-emerald-600' : impact.cashDelta < 0 ? 'text-red-600' : isLight ? 'text-slate-600 font-medium' : 'text-zinc-400 font-medium'
                  }`}>
                    {impact.cashDelta > 0 ? (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : impact.cashDelta < 0 ? (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    ) : null}
                    {impact.cashDelta > 0 ? '+' : ''}{formatINR(impact.cashDelta)}
                  </div>
                </div>

                {/* Breach Probability Impact */}
                <div className={`p-4 rounded-xl border text-center ${subtleBg}`}>
                  <div className={`text-[10px] font-mono uppercase font-bold ${isLight ? 'text-slate-700' : 'text-zinc-300'} mb-1`}>
                    Breach Probability
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className={`text-sm font-mono font-medium ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                      {(baseline.breachProbability * 100).toFixed(0)}%
                    </span>
                    <ArrowRight className={`w-3.5 h-3.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`} />
                    <span className={`text-lg font-bold font-mono ${whatIfResult!.breachProbability > 0.5 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {(whatIfResult!.breachProbability * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className={`mt-2 text-xs font-bold font-mono flex items-center justify-center gap-1 ${
                    impact.breachProbDelta < 0 ? 'text-emerald-600' : impact.breachProbDelta > 0 ? 'text-red-600' : isLight ? 'text-slate-600 font-medium' : 'text-zinc-400 font-medium'
                  }`}>
                    {impact.breachProbDelta < 0 ? (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    ) : impact.breachProbDelta > 0 ? (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : null}
                    {impact.breachProbDelta > 0 ? '+' : ''}{(impact.breachProbDelta * 100).toFixed(0)} percentage points
                  </div>
                </div>

                {/* Breach Horizon Impact */}
                <div className={`p-4 rounded-xl border text-center ${subtleBg}`}>
                  <div className={`text-[10px] font-mono uppercase font-bold ${isLight ? 'text-slate-700' : 'text-zinc-300'} mb-1`}>
                    Breach Horizon
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className={`text-sm font-mono font-medium ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                      {baseline.earliestBreachDate || 'No Breach'}
                    </span>
                    <ArrowRight className={`w-3.5 h-3.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`} />
                    <span className={`text-lg font-bold font-mono ${whatIfResult!.hasBreach ? 'text-red-600' : 'text-emerald-600'}`}>
                      {whatIfResult!.earliestBreachDate || 'No Breach'}
                    </span>
                  </div>
                  <div className={`mt-2 text-xs font-bold font-mono flex items-center justify-center gap-1 ${
                    !whatIfResult!.hasBreach && baseline.hasBreach ? 'text-emerald-600' :
                    whatIfResult!.hasBreach && !baseline.hasBreach ? 'text-red-600' : isLight ? 'text-slate-600 font-medium' : 'text-zinc-400 font-medium'
                  }`}>
                    {whatIfResult!.hasBreach !== baseline.hasBreach
                      ? whatIfResult!.hasBreach ? 'Still breaches' : 'Breach eliminated'
                      : 'No change'}
                  </div>
                </div>
              </div>

              {/* Decision Status */}
              <div className={`mt-4 p-4 rounded-xl border flex items-center gap-3 ${
                whatIfStatus?.label === 'SAFE'
                  ? isLight ? 'bg-emerald-50 text-emerald-950 border-emerald-300' : 'bg-emerald-500/10 border-emerald-500/30'
                  : whatIfStatus?.label === 'BREACH'
                    ? isLight ? 'bg-red-50 text-red-950 border-red-300' : 'bg-red-500/10 border-red-500/30'
                    : isLight ? 'bg-amber-50 text-amber-950 border-amber-300' : 'bg-amber-500/10 border-amber-500/30'
              }`}>
                {whatIfStatus?.icon && <whatIfStatus.icon className={`w-5 h-5 shrink-0 ${
                  whatIfStatus.label === 'SAFE' ? 'text-emerald-600' : whatIfStatus.label === 'BREACH' ? 'text-red-600' : 'text-amber-600'
                }`} />}
                <div>
                  <div className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{whatIfStatus?.label}</div>
                  <div className={`text-xs font-medium mt-0.5 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>{whatIfStatus?.text}</div>
                </div>
              </div>

              {/* Visualize in 3D Button */}
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => {
                    if (selectedScenario) {
                      onVisualizeIn3D(selectedScenario.id, paramValue, whatIfResult!);
                    }
                  }}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-mono font-bold border transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50 hover:border-slate-400 shadow-sm'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <Box className="w-4 h-4" />
                  Visualize in Business Miniature Model
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SCENARIO COMPARISON TABLE ──────────────────────────────────── */}
      {multiScenarioResults.length > 0 && (
        <div className={`rounded-2xl border p-5 ${cardBg}`}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className={`w-4 h-4 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
            <h2 className={`text-sm font-bold font-mono uppercase tracking-wider ${sectionTitle}`}>
              All Scenarios Comparison
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className={`border-b ${isLight ? 'border-slate-200 bg-slate-50/50' : 'border-zinc-800'}`}>
                  <th className={`text-left py-3 px-3 ${isLight ? 'text-slate-800 font-bold' : 'text-zinc-300 font-semibold'}`}>Scenario</th>
                  <th className={`text-left py-3 px-3 ${isLight ? 'text-slate-800 font-bold' : 'text-zinc-300 font-semibold'}`}>Parameter</th>
                  <th className={`text-right py-3 px-3 ${isLight ? 'text-slate-800 font-bold' : 'text-zinc-300 font-semibold'}`}>Min Cash</th>
                  <th className={`text-right py-3 px-3 ${isLight ? 'text-slate-800 font-bold' : 'text-zinc-300 font-semibold'}`}>Breach Risk</th>
                  <th className={`text-right py-3 px-3 ${isLight ? 'text-slate-800 font-bold' : 'text-zinc-300 font-semibold'}`}>P10</th>
                  <th className={`text-center py-3 px-3 ${isLight ? 'text-slate-800 font-bold' : 'text-zinc-300 font-semibold'}`}>Status</th>
                </tr>
              </thead>
              <tbody>
                {multiScenarioResults
                  .sort((a, b) => b.result.minProjectedCash - a.result.minProjectedCash)
                  .map(({ scenario, value, result }, idx) => {
                    const status = getDecisionStatus(result);
                    const isBest = idx === 0;
                    return (
                      <tr
                        key={scenario.id}
                        className={`border-b transition-colors ${
                          isLight ? 'border-slate-100 hover:bg-slate-50' : 'border-zinc-900 hover:bg-zinc-900/50'
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            {scenario.iconType === 'clock' && <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                            {scenario.iconType === 'box' && <Box className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                            {scenario.iconType === 'calendar' && <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                            {scenario.iconType === 'zap' && <Zap className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                            <span className={`font-bold ${textPrimary}`}>{scenario.title}</span>
                            {isBest && (
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full border border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                                BEST
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`py-3 px-3 font-medium ${textSecondary}`}>
                          {value} {scenario.paramUnit}
                        </td>
                        <td className={`py-3 px-3 text-right font-bold ${
                          result.hasBreach ? 'text-red-600' : 'text-emerald-600'
                        }`}>
                          {formatINR(result.minProjectedCash)}
                        </td>
                        <td className={`py-3 px-3 text-right font-bold ${
                          result.breachProbability > 0.5 ? 'text-red-600' : 'text-emerald-600'
                        }`}>
                          {(result.breachProbability * 100).toFixed(0)}%
                        </td>
                        <td className={`py-3 px-3 text-right font-bold ${
                          result.p10Cash < config.cash_floor ? 'text-red-600' : 'text-amber-600'
                        }`}>
                          {formatINR(result.p10Cash)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${getStatusStyle(status.label)}`}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Best Recommendation */}
          {multiScenarioResults.length > 0 && (() => {
            const best = [...multiScenarioResults].sort(
              (a, b) => b.result.minProjectedCash - a.result.minProjectedCash
            )[0];
            const bestStatus = getDecisionStatus(best.result);
            return (
              <div className={`mt-4 p-4 rounded-xl border flex items-start gap-3 ${
                bestStatus.label === 'SAFE'
                  ? isLight ? 'bg-emerald-50 text-emerald-950 border-emerald-300' : 'bg-emerald-500/10 border-emerald-500/30'
                  : isLight ? 'bg-amber-50 text-amber-950 border-amber-300' : 'bg-amber-500/10 border-amber-500/30'
              }`}>
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className={`text-sm font-bold ${textPrimary}`}>
                    Best Available Scenario: {best.scenario.title}
                  </div>
                  <div className={`text-xs mt-1 font-medium ${textSecondary}`}>
                    {best.scenario.icon} {best.scenario.title} at {best.value}{best.scenario.paramUnit} —
                    Min Cash: <strong className={best.result.hasBreach ? 'text-red-600' : 'text-emerald-600'}>{formatINR(best.result.minProjectedCash)}</strong>,
                    Breach Risk: <strong className={best.result.breachProbability > 0.5 ? 'text-red-600' : 'text-emerald-600'}>{(best.result.breachProbability * 100).toFixed(0)}%</strong>,
                    Status: <strong>{bestStatus.label}</strong>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── EMPTY STATE ────────────────────────────────────────────────── */}
      {!selectedScenarioId && !hasRun && multiScenarioResults.length === 0 && (
        <div className={`rounded-2xl border p-12 text-center ${cardBg}`}>
          <Zap className={`w-12 h-12 mx-auto mb-4 ${isLight ? 'text-slate-400' : 'text-zinc-700'}`} />
          <h3 className={`text-lg font-bold ${textPrimary}`}>Which decision would you like to assess?</h3>
          <p className={`text-sm mt-2 max-w-md mx-auto font-medium ${textSecondary}`}>
            Select a scenario above to analyse how a business decision would impact your
            cash flow, breach risk, and liquidity position.
          </p>
        </div>
      )}
    </div>
  );
};
