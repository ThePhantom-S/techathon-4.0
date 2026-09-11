import React, { useMemo, useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Loader2,
  ArrowRight,
  Banknote,
  CalendarClock,
  TrendingDown,
  Lightbulb,
  CheckCircle2,
} from 'lucide-react';
import { Config, Expense, IndustryProfile, Payable, SafeToCommitResult, Transaction } from '../types';
import { runSafeToCommitAnalysis } from '../engine/safeToCommit';
import { formatINR } from '../engine/calculator';
import { getCurrencySymbol } from '../utils/currency';
import { useTheme } from '../context/ThemeContext';
import { IndustryIcon } from './IndustryIcon';

interface SafeToCommitPanelProps {
  config: Config;
  transactions: Transaction[];
  payables: Payable[];
  expenses: Expense[];
  industryProfile: IndustryProfile;
  onApprove?: (result: SafeToCommitResult, amount: number) => void;
}

/**
 * Safe-to-Commit — the flagship decision feature.
 * Question framing is industry-aware; the underlying engine is the SAME
 * cash roll-forward + Monte Carlo used everywhere. The AI never computes here.
 */
export const SafeToCommitPanel: React.FC<SafeToCommitPanelProps> = ({
  config,
  transactions,
  payables,
  expenses,
  industryProfile,
  onApprove,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [amountInput, setAmountInput] = useState<string>(String(industryProfile.safeToCommit.defaultAmount));
  const [hasRun, setHasRun] = useState(false);
  const [result, setResult] = useState<SafeToCommitResult | null>(null);
  const [approved, setApproved] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const amount = useMemo(() => {
    const n = parseFloat(amountInput);
    return isNaN(n) || n < 0 ? 0 : n;
  }, [amountInput]);

  const question = industryProfile.safeToCommit.questionTemplate
    .replace('{amount}', formatINR(amount))
    .replace('{entity}', industryProfile.safeToCommit.entityLabel);

  const runAnalysis = () => {
    if (isRunning) return;
    setIsRunning(true);
    // Yield to the renderer so the busy state paints before the engine runs
    setTimeout(() => {
      try {
        const res = runSafeToCommitAnalysis({
          config,
          transactions,
          payables,
          expenses,
          inventory: [],
          suppliers: [],
          historicalSales: [],
          commitmentAmount: amount,
          commitmentLabel: industryProfile.safeToCommit.entityLabel,
          industryId: industryProfile.id,
        });
        setResult(res);
        setHasRun(true);
        setApproved(false);
      } finally {
        setIsRunning(false);
      }
    }, 30);
  };

  const verdictConfig = {
    SAFE: {
      label: 'SAFE',
      icon: ShieldCheck,
      classes: isLight
        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
        : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
    },
    MARGINAL: {
      label: 'MARGINAL',
      icon: ShieldAlert,
      classes: isLight
        ? 'bg-amber-50 border-amber-300 text-amber-700'
        : 'bg-amber-500/15 border-amber-500/40 text-amber-300',
    },
    UNSAFE: {
      label: 'UNSAFE',
      icon: ShieldX,
      classes: isLight
        ? 'bg-red-50 border-red-300 text-red-700'
        : 'bg-red-500/15 border-red-500/40 text-red-300',
    },
  };

  return (
    <div className={`rounded-2xl border p-5 space-y-4 ${
      isLight ? 'bg-[#FAFAFA] border-[#EAEAEA] text-[#171717]' : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED]'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-[#EAEAEA]' : 'border-[#222222]'}`}>
        <div>
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              isLight ? 'bg-indigo-50 border border-indigo-200 text-indigo-600' : 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-400'
            }`}>
              <IndustryIcon icon={industryProfile.icon} className="w-3.5 h-3.5" />
            </div>
            <h2 className={`text-base font-semibold ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>
              Safe-to-Commit
            </h2>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
              isLight ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
            }`}>
              {industryProfile.name}
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>
            Engine-simulated commitment check — every number comes from the verified cash model.
          </p>
        </div>
      </div>

      {/* Question + input */}
      <div className={`p-4 rounded-xl border ${
        isLight ? 'bg-white border-[#EAEAEA]' : 'bg-[#111111] border-[#222222]'
      }`}>
        <div className={`text-sm font-semibold mb-3 ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>
          {question}
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Banknote className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="number"
              min={0}
              step={50000}
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className={`w-full pl-9 pr-3 py-2.5 rounded-xl border font-mono text-sm outline-none transition-colors ${
                isLight
                  ? 'bg-slate-50 border-slate-200 focus:border-indigo-500 text-slate-900'
                  : 'bg-zinc-900 border-zinc-800 focus:border-indigo-500 text-white'
              }`}
              placeholder={`Commitment amount (${getCurrencySymbol()})`}
            />
          </div>
          <button
            onClick={runAnalysis}
            disabled={isRunning}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md shadow-indigo-500/20"
          >
            <Loader2 className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Simulating...' : 'Simulate Commitment'}
          </button>
        </div>
        <div className={`mt-2 text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
          Suggested: {formatINR(industryProfile.safeToCommit.amountHint)} · Inputs: current cash, safety floor,
          expected inflows/outflows, existing commitments, scenario assumptions.
        </div>
      </div>

      {/* Results */}
      {hasRun && result && (
        <div className="space-y-4">
          {/* Verdict */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            verdictConfig[result.verdict].classes
          }`}>
            <div className="flex items-center gap-2.5">
              {(() => {
                const V = verdictConfig[result.verdict];
                const Icon = V.icon;
                return <Icon className="w-5 h-5" />;
              })()}
              <div>
                <div className="text-sm font-black uppercase tracking-wider">{verdictConfig[result.verdict].label}</div>
                <div className="text-[11px] opacity-80">
                  {result.verdict === 'SAFE'
                    ? 'This commitment keeps projected cash at/above the safety floor.'
                    : result.verdict === 'MARGINAL'
                      ? 'Commitment is possible but leaves a thin liquidity buffer.'
                      : 'This commitment would push cash below the safety floor.'}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black font-mono">{formatINR(result.expectedMinCash)}</div>
              <div className="text-[10px] font-mono uppercase opacity-70">Expected Min Cash</div>
            </div>
          </div>

          {/* Metric grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className={`p-3 rounded-xl border ${isLight ? 'bg-white border-[#EAEAEA]' : 'bg-[#111111] border-[#222222]'}`}>
              <div className={`text-[10px] font-mono uppercase ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Current Cash</div>
              <div className="text-sm font-bold font-mono mt-1">{formatINR(result.currentCash)}</div>
            </div>
            <div className={`p-3 rounded-xl border ${isLight ? 'bg-white border-[#EAEAEA]' : 'bg-[#111111] border-[#222222]'}`}>
              <div className={`text-[10px] font-mono uppercase ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Safety Floor</div>
              <div className="text-sm font-bold font-mono mt-1">{formatINR(result.cashFloor)}</div>
            </div>
            <div className={`p-3 rounded-xl border ${isLight ? 'bg-white border-[#EAEAEA]' : 'bg-[#111111] border-[#222222]'}`}>
              <div className={`text-[10px] font-mono uppercase ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Cash Impact</div>
              <div className={`text-sm font-bold font-mono mt-1 ${result.cashImpact > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                -{formatINR(result.cashImpact)}
              </div>
            </div>
            <div className={`p-3 rounded-xl border ${isLight ? 'bg-white border-[#EAEAEA]' : 'bg-[#111111] border-[#222222]'}`}>
              <div className={`text-[10px] font-mono uppercase ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Liquidity Risk</div>
              <div className={`text-sm font-bold font-mono mt-1 ${
                result.liquidityRisk > 0.6 ? 'text-red-500' : result.liquidityRisk > 0.25 ? 'text-amber-500' : 'text-emerald-500'
              }`}>
                {Math.round(result.liquidityRisk * 100)}%
              </div>
            </div>
          </div>

          {/* Breach date + safe boundary */}
          <div className={`p-3 rounded-xl border flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'
          }`}>
            <span className="flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5 text-amber-500" />
              Potential breach date: <strong>{result.breachDate || 'None'}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-indigo-500" />
              Safe commitment boundary: 
              <button 
                onClick={() => {
                  setAmountInput(String(result.safeBoundary));
                  setHasRun(false);
                }}
                title="Click to apply this safe amount"
                className="font-bold cursor-pointer hover:text-indigo-500 hover:underline transition-colors"
              >
                {formatINR(result.safeBoundary)}
              </button>
            </span>
          </div>

          {/* Main drivers */}
          {result.drivers.length > 0 && (
            <div className="space-y-1.5">
              <div className={`text-[11px] font-mono font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Main Drivers
              </div>
              {result.drivers.slice(0, 3).map((d, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="text-indigo-500 mt-0.5">•</span>
                  <span className={isLight ? 'text-slate-600' : 'text-zinc-300'}>{d}</span>
                </div>
              ))}
            </div>
          )}

          {/* Alternatives */}
          <div className="space-y-2">
            <div className={`text-[11px] font-mono font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Alternative Actions (engine-simulated)
            </div>
            {result.alternatives.map((alt, i) => {
              const altVerdict =
                alt.verdict === 'SAFE'
                  ? isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : alt.verdict === 'MARGINAL'
                    ? isLight ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : isLight ? 'bg-red-50 text-red-700 border-red-200' : 'bg-red-500/15 text-red-300 border-red-500/30';
              return (
                <div key={alt.id} className={`p-3 rounded-xl border ${isLight ? 'bg-white border-[#EAEAEA]' : 'bg-[#111111] border-[#222222]'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0 ${altVerdict}`}>
                        {alt.verdict}
                      </span>
                      <span className="text-xs font-semibold truncate">{alt.title}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs font-bold font-mono ${alt.minCash >= result.cashFloor ? 'text-emerald-500' : 'text-red-500'}`}>
                        {formatINR(alt.minCash)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono ml-1.5">{Math.round(alt.breachProbability * 100)}% risk</span>
                    </div>
                  </div>
                  <p className={`text-[11px] mt-1.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>{alt.detail}</p>
                </div>
              );
            })}
          </div>

          {/* Approve */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className={`text-[11px] flex items-center gap-1.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              {result.verdict === 'UNSAFE'
                ? `A reduced commitment of ${formatINR(result.safeBoundary)} or negotiated terms protects the floor.`
                : 'This decision is within the safe commitment boundary.'}
            </div>
            <button
              onClick={() => {
                setApproved(true);
                onApprove?.(result, amount);
              }}
              disabled={approved}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-60 ${
                approved
                  ? isLight ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                  : 'bg-[#171717] text-white hover:opacity-90 dark:bg-[#EDEDED] dark:text-black'
              }`}
            >
              {approved ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Decision Recorded in Audit Log
                </>
              ) : (
                <>
                  Approve &amp; Record <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};