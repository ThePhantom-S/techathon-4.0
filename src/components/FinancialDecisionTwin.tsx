import React from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  TrendingDown,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { CounterfactualOutcome, DriverAnalysisResult } from '../types';
import { formatINR } from '../engine/calculator';
import { DigitalTwin3D } from './DigitalTwin3D';
import { useTheme } from '../context/ThemeContext';

interface FinancialDecisionTwinProps {
  currentCash: number;
  minCash: number;
  cashFloor: number;
  hasBreach: boolean;
  earliestBreachDate: string | null;
  supplierDelayDays: number;
  onSupplierDelayChange: (days: number) => void;
  counterfactuals: CounterfactualOutcome[];
  activeCounterfactual: string | null;
  onSelectCounterfactual: (id: string | null) => void;
  onOpenDriverAnalysis: () => void;
  driverAnalysis?: DriverAnalysisResult;
  show3D?: boolean;
}

export const FinancialDecisionTwin: React.FC<FinancialDecisionTwinProps> = ({
  currentCash,
  minCash,
  cashFloor,
  hasBreach,
  earliestBreachDate,
  supplierDelayDays,
  onSupplierDelayChange,
  counterfactuals,
  activeCounterfactual,
  onSelectCounterfactual,
  onOpenDriverAnalysis,
  driverAnalysis,
  show3D = false,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Calculated gap or surplus
  const liquidityGap = hasBreach ? cashFloor - minCash : minCash - cashFloor;
  const breachDays = earliestBreachDate ? earliestBreachDate : hasBreach ? '19 Days' : 'No Breach';

  // Dynamic Driver impact items for "WHY IS CASH FALLING?"
  const maxOutflow = driverAnalysis?.topOutflows?.[0]?.amount || 1800000;
  const cashFallDrivers = (driverAnalysis?.topOutflows || []).slice(0, 4).map((out, idx) => {
    const ratio = Math.min(100, Math.round((out.amount / maxOutflow) * 100));
    return {
      id: out.id || `driver-${idx}`,
      label: out.entity,
      amount: -out.amount,
      formatted: `-${formatINR(out.amount)}`,
      barWidth: `${Math.max(25, ratio)}%`,
      detail: out.category,
    };
  });

  return (
    <div className="space-y-5 font-sans">
      {/* SECTION 1: CASH RISK OVERVIEW PANEL */}
      <div className={`p-5 rounded-2xl border transition-colors ${
        isLight ? 'bg-[#FAFAFA] border-[#EAEAEA] text-[#171717]' : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED]'
      }`}>
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 ${
          isLight ? 'border-[#EAEAEA]' : 'border-[#222222]'
        }`}>
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${hasBreach ? 'bg-[#EF4444]' : 'bg-[#22C55E]'}`} />
              <span className={`text-xs font-mono font-medium ${isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}`}>
                BUSINESS MINIATURE MODEL & DECISION SIMULATION
              </span>
            </div>
            <h2 className={`text-xl font-semibold tracking-tight mt-0.5 ${
              isLight ? 'text-[#171717]' : 'text-[#EDEDED]'
            }`}>
              Cash Risk Overview & Shock Cascade
            </h2>
          </div>

          {/* Breach Badge Alert */}
          <div className="flex items-center gap-2.5">
            <div className={`px-3.5 py-1.5 rounded-full border font-mono text-xs font-medium flex items-center gap-2 ${
              hasBreach
                ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30'
                : 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30'
            }`}>
              {hasBreach ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444]" />
                  <span>BREACH IN {breachDays}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" />
                  <span>SAFE LIQUIDITY BUFFER</span>
                </>
              )}
            </div>


          </div>
        </div>

        {/* 4 Core Financial Metrics Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-4">
          {/* Metric 1 */}
          <div className={`border rounded-xl p-4 transition-all duration-150 hover:-translate-y-0.5 ${
            isLight ? 'bg-[#FFFFFF] border-[#EAEAEA]' : 'bg-[#111111] border-[#222222]'
          }`}>
            <div className={`text-xs font-medium mb-1 ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>
              Current Cash
            </div>
            <div className="text-xl font-semibold font-mono tracking-tight">
              {formatINR(currentCash)}
            </div>
          </div>

          {/* Metric 2 */}
          <div className={`border rounded-xl p-4 transition-all duration-150 hover:-translate-y-0.5 ${
            isLight ? 'bg-[#FFFFFF] border-[#EAEAEA]' : 'bg-[#111111] border-[#222222]'
          }`}>
            <div className={`text-xs font-medium mb-1 ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>
              Min Projected Cash
            </div>
            <div className={`text-xl font-semibold font-mono tracking-tight ${
              hasBreach ? 'text-[#EF4444]' : 'text-[#22C55E]'
            }`}>
              {formatINR(minCash)}
            </div>
          </div>

          {/* Metric 3 */}
          <div className={`border rounded-xl p-4 transition-all duration-150 hover:-translate-y-0.5 ${
            isLight ? 'bg-[#FFFFFF] border-[#EAEAEA]' : 'bg-[#111111] border-[#222222]'
          }`}>
            <div className={`text-xs font-medium mb-1 ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>
              {hasBreach ? 'Liquidity Gap' : 'Safety Surplus'}
            </div>
            <div className={`text-xl font-semibold font-mono tracking-tight ${
              hasBreach ? 'text-[#EF4444]' : 'text-[#22C55E]'
            }`}>
              {formatINR(liquidityGap)}
            </div>
          </div>

          {/* Metric 4 */}
          <div className={`border rounded-xl p-4 transition-all duration-150 hover:-translate-y-0.5 ${
            isLight ? 'bg-[#FFFFFF] border-[#EAEAEA]' : 'bg-[#111111] border-[#222222]'
          }`}>
            <div className={`text-xs font-medium mb-1 ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>
              Breach Horizon
            </div>
            <div className="text-xl font-semibold font-mono text-[#EAB308] tracking-tight">
              {breachDays}
            </div>
          </div>
        </div>
      </div>

      {/* RENDER 3D SCENE & EVENT PROPAGATION STRICTLY WHEN show3D IS TRUE */}
      {show3D && (
        <>
          <DigitalTwin3D
            currentCash={currentCash}
            minCash={minCash}
            cashFloor={cashFloor}
            hasBreach={hasBreach}
            earliestBreachDate={earliestBreachDate}
            supplierDelayDays={supplierDelayDays}
            onSupplierDelayChange={onSupplierDelayChange}
            counterfactuals={counterfactuals}
            activeCounterfactual={activeCounterfactual}
            onSelectCounterfactual={onSelectCounterfactual}
            onOpenDriverAnalysis={onOpenDriverAnalysis}

          />

          {/* Event Propagation Cascade Diagram */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5">
            <div className={`border rounded-xl p-3 text-xs ${
              isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'
            }`}>
              <div className="text-[10px] font-mono text-[#EAB308] font-medium uppercase mb-0.5">01 Shock</div>
              <div className="font-medium">Supplier Lead Time</div>
              <div className="font-mono text-xs text-[#EAB308] mt-1 font-semibold">+{supplierDelayDays} DAYS</div>
            </div>

            <div className={`border rounded-xl p-3 text-xs ${
              isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'
            }`}>
              <div className={`text-[10px] font-mono uppercase mb-0.5 ${isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}`}>02 Impact</div>
              <div className="font-medium">Inventory Delivery</div>
              <div className="font-mono text-[11px] text-[#A1A1AA] mt-1">Arrives Late</div>
            </div>

            <div className={`border rounded-xl p-3 text-xs ${
              isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'
            }`}>
              <div className={`text-[10px] font-mono uppercase mb-0.5 ${isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}`}>03 Operational</div>
              <div className="font-medium">Production Assembly</div>
              <div className="font-mono text-[11px] text-[#A1A1AA] mt-1">Delayed SKU-900</div>
            </div>

            <div className={`border rounded-xl p-3 text-xs ${
              isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'
            }`}>
              <div className={`text-[10px] font-mono uppercase mb-0.5 ${isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}`}>04 Commercial</div>
              <div className="font-medium">Customer Billing</div>
              <div className="font-mono text-[11px] text-[#A1A1AA] mt-1">Receivables Shifted</div>
            </div>

            <div className={`border rounded-xl p-3 text-xs ${
              minCash < cashFloor ? 'border-[#EF4444]/40 bg-[#EF4444]/10' : isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'
            }`}>
              <div className="text-[10px] font-mono text-[#EF4444] font-medium uppercase mb-0.5">05 Financial</div>
              <div className="font-medium">Cash Deficit</div>
              <div className="font-mono text-xs text-[#EF4444] font-semibold mt-1">
                {minCash < cashFloor ? formatINR(minCash) : 'Safe Buffer'}
              </div>
            </div>

            <div className={`border rounded-xl p-3 text-xs ${
              hasBreach ? 'border-[#EF4444]/40 bg-[#EF4444]/10' : isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'
            }`}>
              <div className="text-[10px] font-mono text-[#EF4444] font-medium uppercase mb-0.5">06 Outcome</div>
              <div className="font-medium">Breach Trigger</div>
              <div className="font-mono text-xs text-[#EF4444] font-semibold mt-1">{breachDays}</div>
            </div>
          </div>
        </>
      )}

      {/* SECTION 3: SPLIT VIEW - WHY IS CASH FALLING? & WHAT SHOULD I DO? */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 6 Cols: WHY IS CASH FALLING? */}
        <div className={`lg:col-span-6 p-5 rounded-2xl border ${
          isLight ? 'bg-[#FAFAFA] border-[#EAEAEA] text-[#171717]' : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED]'
        }`}>
          <div className={`flex items-center justify-between border-b pb-3 mb-3 ${
            isLight ? 'border-[#EAEAEA]' : 'border-[#222222]'
          }`}>
            <h3 className="text-xs font-mono font-medium text-[#EF4444] uppercase tracking-wider flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-[#EF4444]" />
              WHY IS CASH FALLING?
            </h3>
            <button
              onClick={onOpenDriverAnalysis}
              className={`text-xs font-mono flex items-center gap-1 cursor-pointer transition-colors ${
                isLight ? 'text-[#666666] hover:text-[#171717]' : 'text-[#A1A1AA] hover:text-[#EDEDED]'
              }`}
            >
              Full Analysis <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Drivers List */}
          <div className="space-y-2.5">
            {cashFallDrivers.map((driver, index) => (
              <div
                key={driver.id}
                className={`p-3 rounded-xl border transition-all duration-150 cursor-pointer text-xs active:scale-[0.98] ${
                  isLight
                    ? 'bg-[#FFFFFF] border-[#EAEAEA] hover:bg-[#FAFAFA]'
                    : 'bg-[#111111] border-[#222222] hover:bg-[#1A1A1A]'
                }`}
                onClick={onOpenDriverAnalysis}
              >
                <div className="flex items-center justify-between font-mono mb-1">
                  <div className="flex items-center gap-2 truncate">
                    <span className={isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}>0{index + 1}</span>
                    <span className="font-medium truncate">{driver.label}</span>
                  </div>
                  <span className="font-semibold text-[#EF4444] ml-2">{driver.formatted}</span>
                </div>

                <div className={`w-full h-1.5 rounded-full overflow-hidden mb-1 ${isLight ? 'bg-[#EAEAEA]' : 'bg-[#222222]'}`}>
                  <div className="h-full bg-[#EF4444] rounded-full" style={{ width: driver.barWidth }} />
                </div>

                <div className={`text-[11px] ${isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}`}>
                  {driver.detail}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 6 Cols: WHAT SHOULD I DO? */}
        <div className={`lg:col-span-6 p-5 rounded-2xl border ${
          isLight ? 'bg-[#FAFAFA] border-[#EAEAEA] text-[#171717]' : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED]'
        }`}>
          <div className={`flex items-center justify-between border-b pb-3 mb-3 ${
            isLight ? 'border-[#EAEAEA]' : 'border-[#222222]'
          }`}>
            <h3 className="text-xs font-mono font-medium text-[#22C55E] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
              ACTION ASSESSMENT
            </h3>
            {activeCounterfactual && (
              <button
                onClick={() => onSelectCounterfactual(null)}
                className={`text-xs font-mono underline cursor-pointer transition-colors ${
                  isLight ? 'text-[#666666] hover:text-[#171717]' : 'text-[#A1A1AA] hover:text-[#EDEDED]'
                }`}
              >
                Clear Selection
              </button>
            )}
          </div>

          {/* Counterfactual Decisions Matrix */}
          <div className="space-y-2.5">
            {counterfactuals.map((cf) => {
              const isSelected = activeCounterfactual === cf.id;
              const isSafe = cf.statusColor === 'success';

              return (
                <div
                  key={cf.id}
                  onClick={() => onSelectCounterfactual(isSelected ? null : cf.id)}
                  className={`p-3.5 rounded-xl border transition-all duration-150 cursor-pointer text-xs active:scale-[0.98] ${
                    isSelected
                      ? isLight
                        ? 'bg-[#F3F3F3] border-[#171717]'
                        : 'bg-[#1A1A1A] border-[#EDEDED]'
                      : isLight
                        ? 'bg-[#FFFFFF] border-[#EAEAEA] hover:bg-[#FAFAFA]'
                        : 'bg-[#111111] border-[#222222] hover:bg-[#1A1A1A]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 font-mono">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{cf.title}</span>
                        {cf.id === 'cf-3' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E]">
                            Recommended
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className={`font-semibold ${isSafe ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                        {formatINR(cf.minProjectedCash)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
