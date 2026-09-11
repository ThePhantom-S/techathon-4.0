import React from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  TrendingDown,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { CounterfactualOutcome, DriverAnalysisResult, IndustryProfile } from '../types';
import { formatINR } from '../engine/calculator';
import { industryRecommendationTitle } from '../config/industries';
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
  industryProfile?: IndustryProfile;
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
  industryProfile,
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
            driverAnalysis={driverAnalysis}
            industryProfile={industryProfile}
          />

          {/* Event Propagation Cascade Diagram (built from the industry shock chain) */}
          {(() => {
            const chain = industryProfile?.miniatureModel?.shockChain || [];
            const chainNodes = chain.map((id) => industryProfile?.miniatureModel?.nodes.find((n) => n.id === id)).filter(Boolean);
            const kindLabel = (kind?: string) => {
              switch (kind) {
                case 'supplier': return 'Shock Source';
                case 'inventory': return 'Inventory Impact';
                case 'operations': return 'Operational Impact';
                case 'service': return 'Service Impact';
                case 'recurring': return 'Revenue Impact';
                case 'customer': return 'Commercial Impact';
                case 'expense': return 'Cost Impact';
                case 'cash': return 'Financial Impact';
                default: return 'Business Impact';
              }
            };
            const boxes = chainNodes.map((node, i) => ({
              idx: i + 1,
              label: node!.label,
              kind: node!.kind,
            }));
            if (boxes.length) {
              boxes[boxes.length - 1] = {
                ...boxes[boxes.length - 1],
                label: hasBreach ? 'Breach Trigger' : 'Cash Position',
              };
            }
            return (
              <div className={`grid gap-2.5 ${
                boxes.length <= 4 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6'
              }`}>
                {boxes.map((box, i) => {
                  const isLast = i === boxes.length - 1;
                  const isFinancial = box.kind === 'cash' || isLast;
                  return (
                    <div key={box.idx} className={`border rounded-xl p-3 text-xs ${
                      isFinancial && (minCash < cashFloor || hasBreach)
                        ? 'border-[#EF4444]/40 bg-[#EF4444]/10'
                        : isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'
                    }`}>
                      <div className={`text-[10px] font-mono uppercase mb-0.5 ${
                        i === 0 ? 'text-[#EAB308] font-medium' : isFinancial ? 'text-[#EF4444] font-medium' : isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'
                      }`}>
                        {String(box.idx).padStart(2, '0')} {i === 0 ? 'Shock' : kindLabel(box.kind)}
                      </div>
                      <div className="font-medium">{box.label}</div>
                      <div className={`font-mono text-xs mt-1 font-semibold ${
                        i === 0 ? 'text-[#EAB308]' : isFinancial ? 'text-[#EF4444]' : 'text-[#A1A1AA]'
                      }`}>
                        {i === 0
                          ? `+${supplierDelayDays} DAYS`
                          : isLast
                            ? hasBreach ? breachDays : formatINR(minCash)
                            : (() => {
                                switch (box.kind) {
                                  case 'inventory': return 'Stock Depletion';
                                  case 'operations': return 'Idle Capacity';
                                  case 'service': return 'SLA Risk';
                                  case 'recurring': return 'Churn Risk';
                                  case 'customer': return 'Fulfillment Risk';
                                  case 'expense': return 'Fixed Cost Burn';
                                  default: return 'Impacted';
                                }
                              })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
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

        {/* Right 6 Cols: WHAT SHOULD I DO? / ACTION ASSESSMENT */}
        <div className={`lg:col-span-6 p-5 rounded-2xl border ${
          isLight ? 'bg-[#FAFAFA] border-[#EAEAEA] text-[#171717]' : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED]'
        }`}>
          <div className={`flex items-center justify-between border-b pb-3 mb-3 ${
            isLight ? 'border-[#EAEAEA]' : 'border-[#222222]'
          }`}>
            <div>
              <h3 className="text-xs font-mono font-medium text-[#22C55E] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
                ACTION ASSESSMENT
              </h3>
              <p className={`text-[11px] mt-0.5 ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>
                Click any simulated lever to project liquidity impact
              </p>
            </div>
            {activeCounterfactual && (
              <button
                onClick={() => onSelectCounterfactual(null)}
                className={`text-xs font-mono underline cursor-pointer transition-colors ${
                  isLight ? 'text-[#666666] hover:text-[#171717]' : 'text-[#A1A1AA] hover:text-[#EDEDED]'
                }`}
              >
                Reset Selection
              </button>
            )}
          </div>

          {/* Counterfactual Decisions Matrix */}
          <div className="space-y-2.5">
            {counterfactuals.map((cf, index) => {
              const isSelected = activeCounterfactual === cf.id;
              const isSafe = cf.statusColor === 'success';
              const rankNum = cf.rank || index + 1;
              const titleText = industryProfile ? industryRecommendationTitle(industryProfile, cf.id, cf.title) : cf.title;
              
              // Specific subtitle / explanation per strategy
              const strategySubtitle = 
                cf.id === 'cf-3' ? 'Secures upfront cash to bridge supplier disbursement window' :
                cf.id === 'cf-1' ? 'Defers non-critical raw material purchase orders by 20%' :
                cf.id === 'cf-2' ? 'Renegotiates vendor payment cycles by +15 days' :
                'Simulated operational adjustment';

              return (
                <div
                  key={cf.id}
                  onClick={() => onSelectCounterfactual(isSelected ? null : cf.id)}
                  className={`p-3.5 rounded-xl border transition-all duration-150 cursor-pointer text-xs active:scale-[0.98] ${
                    isSelected
                      ? isLight
                        ? isSafe
                          ? 'bg-emerald-50/70 border-emerald-500 shadow-sm ring-1 ring-emerald-500/30'
                          : 'bg-indigo-50/70 border-indigo-500 shadow-sm ring-1 ring-indigo-500/30'
                        : isSafe
                          ? 'bg-emerald-950/20 border-emerald-500 shadow-sm ring-1 ring-emerald-500/30'
                          : 'bg-indigo-950/20 border-indigo-500 shadow-sm ring-1 ring-indigo-500/30'
                      : isLight
                        ? 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        : 'bg-[#111111] border-[#222222] hover:bg-[#1A1A1A] hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 font-mono">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className={`font-semibold shrink-0 mt-0.5 ${
                        isSelected 
                          ? isSafe ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'
                          : isLight ? 'text-slate-400' : 'text-zinc-600'
                      }`}>
                        0{rankNum}
                      </span>
                      <div className="min-w-0 font-sans">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold text-xs tracking-tight ${
                            isLight ? 'text-slate-900' : 'text-zinc-100'
                          }`}>
                            {titleText}
                          </span>
                          {rankNum === 1 && (
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                              isLight 
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                            }`}>
                              ★ Recommended
                            </span>
                          )}
                        </div>
                        <div className={`text-[11px] font-sans mt-0.5 line-clamp-1 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                          {strategySubtitle}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 font-mono">
                      <div className={`font-bold text-xs ${isSafe ? 'text-emerald-500' : 'text-red-500'}`}>
                        {formatINR(cf.minProjectedCash)}
                      </div>
                      <div className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
                        Min Cash Floor
                      </div>
                    </div>
                  </div>

                  {/* Net benefit pill & state banner */}
                  <div className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[10px] font-mono ${
                    isLight ? 'border-slate-100' : 'border-zinc-800/80'
                  }`}>
                    <span className={`flex items-center gap-1 font-medium ${
                      isSafe ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                    }`}>
                      <span className="text-[8px]">●</span> {cf.status}
                    </span>
                    <span className={`font-semibold ${
                      cf.netBenefit > 0
                        ? isLight ? 'text-indigo-600' : 'text-indigo-400'
                        : isLight ? 'text-slate-400' : 'text-zinc-500'
                    }`}>
                      Net Gain: +{formatINR(Math.max(0, cf.netBenefit))}
                    </span>
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
