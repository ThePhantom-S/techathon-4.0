import React from 'react';
import { DriverAnalysisResult } from '../types';
import { formatINR } from '../engine/calculator';
import { ArrowDownRight, ArrowUpRight, Calendar, Sparkles, ArrowLeft, TrendingDown } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface DriverAnalysisViewProps {
  driverAnalysis: DriverAnalysisResult;
  onBackToDashboard?: () => void;
  onOpenCounterfactuals?: () => void;
}

export const DriverAnalysisView: React.FC<DriverAnalysisViewProps> = ({
  driverAnalysis,
  onBackToDashboard,
  onOpenCounterfactuals,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const { breachPeriod, totalLiquidityGap, waterfall, topOutflows, topInflows, aiSummaryText } =
    driverAnalysis;

  const openingVal = Math.max(0, (waterfall.opening || 2500000) / 100000);
  const outflowsVal = Math.abs((waterfall.outflows || 1800000) / 100000);
  const inflowsVal = (waterfall.inflows || 420000) / 100000;
  const netVal = openingVal - outflowsVal + inflowsVal;

  const maxVal = Math.max(openingVal, outflowsVal, inflowsVal, Math.abs(netVal), 50);
  const getBarPx = (val: number) => Math.max(16, Math.round((Math.abs(val) / maxVal) * 140));

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className={`p-2 rounded-full border transition-all duration-150 cursor-pointer active:scale-[0.95] ${
                isLight ? 'bg-[#FFFFFF] border-[#EAEAEA] text-[#171717] hover:bg-[#FAFAFA]' : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED] hover:bg-[#111111]'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className={`text-xl font-bold tracking-tight flex items-center gap-2 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              <TrendingDown className="w-5 h-5 text-indigo-500" />
              FlowShield — Cash Breach Driver Analysis
            </h2>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Root cause decomposition for projected liquidity shortfall.
            </p>
          </div>
        </div>

        <div>
          {onOpenCounterfactuals && (
            <button
              onClick={onOpenCounterfactuals}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer active:scale-[0.97] ${
                isLight ? 'bg-[#171717] text-[#FFFFFF] hover:opacity-90' : 'bg-[#EDEDED] text-[#000000] hover:opacity-90'
              }`}
            >
              Test Action Strategies →
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Breach Period */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between transition-all duration-150 hover:-translate-y-0.5 ${
          isLight ? 'bg-[#FAFAFA] border-[#EAEAEA] text-[#171717]' : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED]'
        }`}>
          <span className={`text-xs font-mono font-medium ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>
            Breach Window
          </span>
          <div className="flex items-center gap-2.5 mt-2">
            <Calendar className="w-5 h-5 text-[#EAB308]" />
            <span className="text-xl font-semibold font-mono">
              {breachPeriod.start} - {breachPeriod.end}
            </span>
          </div>
        </div>

        {/* Total Liquidity Gap */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between transition-all duration-150 hover:-translate-y-0.5 ${
          totalLiquidityGap < 0 ? 'bg-[#EF4444]/10 border-[#EF4444]/30' : isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'
        }`}>
          <span className={`text-xs font-mono font-medium ${totalLiquidityGap < 0 ? 'text-[#EF4444]' : isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>
            Liquidity Deficit
          </span>
          <div className="flex items-center gap-2.5 mt-2">
            <ArrowDownRight className="w-5 h-5 text-[#EF4444]" />
            <span className={`text-xl font-semibold font-mono ${totalLiquidityGap < 0 ? 'text-[#EF4444]' : ''}`}>
              {totalLiquidityGap < 0 ? formatINR(totalLiquidityGap) : 'No Deficit'}
            </span>
          </div>
        </div>

        {/* AI Analysis Card */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between transition-all duration-150 hover:-translate-y-0.5 ${
          isLight ? 'bg-[#FAFAFA] border-[#EAEAEA] text-[#171717]' : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED]'
        }`}>
          <div className="flex items-center gap-1.5 mb-1 font-mono text-xs text-[#3B82F6]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Root Cause Explanation</span>
          </div>
          <p className={`text-xs leading-normal ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>
            "{aiSummaryText}"
          </p>
        </div>
      </div>

      {/* Main Analysis Content: Waterfall Chart + Ranked Drivers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Waterfall Chart */}
        <div className={`lg:col-span-6 p-5 rounded-2xl border ${
          isLight ? 'bg-white border-slate-200 text-slate-900 shadow-xs' : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED]'
        }`}>
          <div className={`flex justify-between items-center border-b pb-3 mb-4 ${isLight ? 'border-slate-200' : 'border-[#222222]'}`}>
            <h3 className={`text-sm font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Cash Flow Waterfall (INR Lakhs)
            </h3>
          </div>

          <div className="h-64 flex items-end justify-around px-1 sm:px-2 pt-6 pb-2 border-b border-slate-200 dark:border-[#222222] font-sans text-xs">
            {/* Opening Cash */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px] sm:text-xs">+₹{openingVal.toFixed(1)}L</span>
              <div
                style={{ height: `${getBarPx(openingVal)}px` }}
                className="w-10 sm:w-14 bg-emerald-500 rounded-t-lg shadow-sm transition-all duration-300"
              />
              <span className={`text-[10px] sm:text-xs font-semibold ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Opening</span>
            </div>

            {/* Outflows */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="font-bold text-red-500 text-[11px] sm:text-xs">-₹{outflowsVal.toFixed(1)}L</span>
              <div
                style={{ height: `${getBarPx(outflowsVal)}px` }}
                className="w-10 sm:w-14 bg-red-500 rounded-t-lg shadow-sm transition-all duration-300"
              />
              <span className="text-[10px] sm:text-xs font-semibold text-red-500">Outflows</span>
            </div>

            {/* Inflows */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px] sm:text-xs">+₹{inflowsVal.toFixed(1)}L</span>
              <div
                style={{ height: `${getBarPx(inflowsVal)}px` }}
                className="w-10 sm:w-14 bg-emerald-500 rounded-t-lg shadow-sm transition-all duration-300"
              />
              <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400">Inflows</span>
            </div>

            {/* Net Delta */}
            <div className="flex flex-col items-center gap-1.5">
              <span className={`font-bold text-[11px] sm:text-xs ${netVal >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-500'}`}>
                {netVal >= 0 ? '+' : ''}₹{netVal.toFixed(1)}L
              </span>
              <div
                style={{ height: `${getBarPx(netVal)}px` }}
                className={`w-10 sm:w-14 rounded-t-lg shadow-sm transition-all duration-300 ${netVal >= 0 ? 'bg-indigo-600' : 'bg-red-500'}`}
              />
              <span className={`text-[10px] sm:text-xs font-semibold ${netVal >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-500'}`}>
                Net Delta
              </span>
            </div>
          </div>
        </div>

        {/* Ranked Driver Lists */}
        <div className="lg:col-span-6 flex flex-col gap-3 font-mono text-xs">
          {/* Outflows */}
          <div className="space-y-2">
            <span className={isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}>Material Outflows</span>
            {topOutflows.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-xl border flex items-center justify-between transition-all duration-150 hover:-translate-y-0.5 ${
                  isLight ? 'bg-[#FFFFFF] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <ArrowDownRight className="w-4 h-4 text-[#EF4444]" />
                  <span className="font-sans font-medium truncate">{item.entity}</span>
                </div>
                <span className="font-semibold text-[#EF4444]">-₹{(item.amount / 100000).toFixed(1)}L</span>
              </div>
            ))}
          </div>

          {/* Inflows */}
          <div className="space-y-2">
            <span className={isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}>Material Inflows</span>
            {topInflows.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-xl border flex items-center justify-between transition-all duration-150 hover:-translate-y-0.5 ${
                  isLight ? 'bg-[#FFFFFF] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <ArrowUpRight className="w-4 h-4 text-[#22C55E]" />
                  <span className="font-sans font-medium truncate">{item.entity}</span>
                </div>
                <span className="font-semibold text-[#22C55E]">+₹{(item.amount / 100000).toFixed(1)}L</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
