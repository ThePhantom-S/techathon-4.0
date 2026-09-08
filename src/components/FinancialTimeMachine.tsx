import React, { useState } from 'react';
import { History, Compass, Clock, ArrowRight, ShieldAlert, ShieldCheck, AlertTriangle, ChevronRight, Activity, TrendingDown, ArrowUpRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { formatINR } from '../engine/calculator';

interface FinancialTimeMachineProps {
  simulationResult: any;
  cashFloor: number;
}

type TimeBox = 'past' | 'present' | 'future';

export const FinancialTimeMachine: React.FC<FinancialTimeMachineProps> = ({
  simulationResult,
  cashFloor,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [selectedBox, setSelectedBox] = useState<TimeBox>('future');

  const hasBreach = simulationResult?.hasBreach ?? true;
  const daysUntilBreach = simulationResult?.daysUntilBreach ?? 19;
  const earliestBreachDate = simulationResult?.earliestBreachDate ?? 'Oct 16, 2026';
  const breachProbability = simulationResult?.breachProbability ?? 84;
  const currentCash = simulationResult?.dailyPoints?.[0]?.cash ?? 2500000;
  const minCash = simulationResult?.minProjectedCash ?? 450000;

  return (
    <div className="space-y-6 font-sans">
      {/* ── CASH FLOW TIMELINE HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className={`text-xl font-bold tracking-tight flex items-center gap-2 ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            <Clock className="w-5 h-5 text-indigo-500" />
            FlowShield — Cash Flow Timeline
          </h2>
          <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
            Navigate past events, monitor current stability, and review the forward cash forecast.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-3 py-1 rounded-full border bg-indigo-500/10 border-indigo-500/30 text-indigo-500 font-bold">
            Interactive Timeline
          </span>
        </div>
      </div>

      {/* ── 3 LARGE CONNECTED TIME CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
        {/* PAST CARD */}
        <div
          onClick={() => setSelectedBox('past')}
          className={`p-6 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between ${
            selectedBox === 'past'
              ? isLight
                ? 'bg-amber-50/60 border-amber-500 ring-2 ring-amber-500/30 shadow-lg'
                : 'bg-amber-950/20 border-amber-500 ring-2 ring-amber-500/30 shadow-lg'
              : isLight
                ? 'bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/20'
                : 'bg-[#0c0c12] border-white/10 hover:border-amber-500/40 hover:bg-white/5'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono tracking-widest text-amber-500 uppercase flex items-center gap-1.5">
                <History className="w-4 h-4" /> PAST
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-500 border-amber-500/30">
                HISTORY
              </span>
            </div>

            <div>
              <h3 className={`text-lg font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                What happened?
              </h3>
              <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Major supplier payment occurred
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-white/10 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Stable History
            </span>
            <span className={`text-xs font-mono font-bold flex items-center gap-1 ${
              selectedBox === 'past' ? 'text-amber-500' : isLight ? 'text-slate-400' : 'text-zinc-500'
            }`}>
              Understand <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* PRESENT CARD */}
        <div
          onClick={() => setSelectedBox('present')}
          className={`p-6 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between ${
            selectedBox === 'present'
              ? isLight
                ? 'bg-blue-50/60 border-blue-500 ring-2 ring-blue-500/30 shadow-lg'
                : 'bg-blue-950/20 border-blue-500 ring-2 ring-blue-500/30 shadow-lg'
              : isLight
                ? 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/20'
                : 'bg-[#0c0c12] border-white/10 hover:border-blue-500/40 hover:bg-white/5'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono tracking-widest text-blue-500 uppercase flex items-center gap-1.5">
                <Compass className="w-4 h-4" /> PRESENT
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-blue-500/10 text-blue-500 border-blue-500/30">
                NOW
              </span>
            </div>

            <div>
              <h3 className={`text-lg font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Where are we now?
              </h3>
              <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Liquidity Status: <strong className="text-amber-500">Watch List</strong>
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-white/10 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-500">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Watch Needed
            </span>
            <span className={`text-xs font-mono font-bold flex items-center gap-1 ${
              selectedBox === 'present' ? 'text-blue-500' : isLight ? 'text-slate-400' : 'text-zinc-500'
            }`}>
              Monitor <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* FUTURE CARD */}
        <div
          onClick={() => setSelectedBox('future')}
          className={`p-6 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between ${
            selectedBox === 'future'
              ? isLight
                ? 'bg-red-50/60 border-red-500 ring-2 ring-red-500/30 shadow-lg'
                : 'bg-red-950/20 border-red-500 ring-2 ring-red-500/30 shadow-lg'
              : isLight
                ? 'bg-white border-slate-200 hover:border-red-300 hover:bg-red-50/20'
                : 'bg-[#0c0c12] border-white/10 hover:border-red-500/40 hover:bg-white/5'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono tracking-widest text-red-500 uppercase flex items-center gap-1.5">
                <Activity className="w-4 h-4" /> FUTURE
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-red-500/10 text-red-500 border-red-500/30">
                FORECAST
              </span>
            </div>

            <div>
              <h3 className={`text-lg font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                What happens next?
              </h3>
              <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Potential cash-floor breach <strong className="text-red-500 font-bold">{daysUntilBreach} days ahead</strong>
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-white/10 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> At Risk
            </span>
            <span className={`text-xs font-mono font-bold flex items-center gap-1 ${
              selectedBox === 'future' ? 'text-red-500' : isLight ? 'text-slate-400' : 'text-zinc-500'
            }`}>
              Prepare <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>

      {/* ── TIMELINE CONNECTOR FOOTER BAR ── */}
      <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-center justify-between text-xs font-mono gap-2 ${
        isLight ? 'bg-slate-100/80 border-slate-200 text-slate-700' : 'bg-zinc-900/60 border-zinc-800 text-zinc-300'
      }`}>
        <div className="flex items-center gap-2">
          <span className="font-bold text-amber-500">PAST</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold text-blue-500">PRESENT</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold text-red-500">FUTURE</span>
        </div>
        <div className="flex items-center gap-3 text-slate-500 dark:text-zinc-400">
          <span>Understand</span>
          <span>•</span>
          <span>Monitor</span>
          <span>•</span>
          <span>Prepare</span>
        </div>
      </div>

      {/* ── DRILL DOWN DETAILS PANEL (SHOWS WHEN A BOX IS CLICKED) ── */}
      <div className={`p-6 rounded-2xl border transition-all duration-200 ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0c0c12] border-white/15 text-white'
      }`}>
        {/* PAST DRILL DOWN */}
        {selectedBox === 'past' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase font-mono tracking-wider text-amber-500">
                  Past Financial Activity & Recent Events
                </h3>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Historical transaction log &amp; recent cash movements
                </p>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-full border bg-amber-500/10 text-amber-500 border-amber-500/30">
                Audit Log
              </span>
            </div>

            <div className="space-y-2.5">
              {[
                { event: 'Major supplier payment occurred', entity: 'Shakti Electronics Procurement', amount: '₹18.0L Outflow', status: 'Completed', color: 'text-red-500' },
                { event: 'Customer collection received', entity: 'TechCorp Enterprise Invoice #104', amount: '₹4.2L Inflow', status: 'Cleared', color: 'text-emerald-500' },
                { event: 'Inventory purchase processed', entity: 'Semiconductor Raw Material PO-92', amount: '₹6.5L Outflow', status: 'Completed', color: 'text-amber-500' },
                { event: 'Monthly operational overheads paid', entity: 'Facility & Payroll Expenses', amount: '₹2.3L Outflow', status: 'Cleared', color: 'text-slate-400' },
              ].map((item, i) => (
                <div key={i} className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'
                }`}>
                  <div className="space-y-0.5">
                    <span className="font-semibold">{item.event}</span>
                    <p className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>{item.entity}</p>
                  </div>
                  <div className="text-right font-mono">
                    <span className={`font-bold ${item.color}`}>{item.amount}</span>
                    <span className="block text-[10px] text-slate-400">{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRESENT DRILL DOWN */}
        {selectedBox === 'present' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase font-mono tracking-wider text-blue-500">
                  Present Financial Health & Working Capital
                </h3>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Live operational liquidity, DSO/DPO diagnostics, and baseline safety margin
                </p>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-full border bg-blue-500/10 text-blue-500 border-blue-500/30">
                Live Status
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={`p-4 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'}`}>
                <span className="text-xs font-medium text-slate-500">Opening Liquid Cash</span>
                <div className="text-xl font-bold font-mono text-indigo-500 mt-1">{formatINR(currentCash)}</div>
                <span className="text-[11px] text-slate-400 mt-1 block">Live Bank Balance</span>
              </div>
              <div className={`p-4 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'}`}>
                <span className="text-xs font-medium text-slate-500">Operational Safety Floor</span>
                <div className="text-xl font-bold font-mono text-emerald-500 mt-1">{formatINR(cashFloor)}</div>
                <span className="text-[11px] text-slate-400 mt-1 block">Minimum Reserve Target</span>
              </div>
              <div className={`p-4 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'}`}>
                <span className="text-xs font-medium text-slate-500">Cash Velocity Cycle (CCC)</span>
                <div className="text-xl font-bold font-mono text-amber-500 mt-1">70 Days</div>
                <span className="text-[11px] text-slate-400 mt-1 block">Collection + Stock - Term</span>
              </div>
            </div>
          </div>
        )}

        {/* FUTURE DRILL DOWN */}
        {selectedBox === 'future' && (
          <div className="space-y-4 font-sans">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                  Future Solvency Forecast &amp; Risk Mitigation
                </h3>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  90-day forward projection, floor breach alert, and strategy recommendations
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full border bg-red-500/10 text-red-600 border-red-500/30">
                Breach Risk: {breachProbability}%
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-xl border ${isLight ? 'bg-red-50/70 border-red-200' : 'bg-red-950/20 border-red-500/30'}`}>
                <div className="flex items-center gap-2 text-red-600 font-bold text-xs mb-2">
                  <ShieldAlert className="w-4 h-4" /> Projected Liquidity Shortage
                </div>
                <p className={`text-xs leading-relaxed font-medium ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
                  Under current vendor payable schedules, cash balance is predicted to breach the {formatINR(cashFloor)} safety floor on <strong className="text-red-600 font-bold">{earliestBreachDate}</strong> ({daysUntilBreach} days ahead).
                </p>
              </div>

              <div className={`p-4 rounded-xl border ${isLight ? 'bg-emerald-50/70 border-emerald-200' : 'bg-emerald-950/20 border-emerald-500/30'}`}>
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs mb-2">
                  <ShieldCheck className="w-4 h-4" /> Recommended Action Plan
                </div>
                <p className={`text-xs leading-relaxed font-medium ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
                  Request a <strong className="text-emerald-700 dark:text-emerald-400 font-bold">30% Customer Payment Advance (+₹2.7L)</strong> or extend supplier bills by +15 days to maintain a positive liquidity margin.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
