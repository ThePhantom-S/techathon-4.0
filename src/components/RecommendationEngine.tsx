import React, { useState } from 'react';
import { CounterfactualOutcome, IndustryProfile } from '../types';
import { useTheme } from '../context/ThemeContext';
import { ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { formatINR } from '../engine/calculator';
import { industryRecommendationAction, industryRecommendationTitle } from '../config/industries';

interface RecommendationEngineProps {
  counterfactuals: CounterfactualOutcome[];
  activeCounterfactual: string | null;
  onSelectCounterfactual: (id: string | null) => void;
  baselineMinCash: number;
  cashFloor: number;
  industryProfile?: IndustryProfile;
}

export const RecommendationEngine: React.FC<RecommendationEngineProps> = ({
  counterfactuals,
  activeCounterfactual,
  onSelectCounterfactual,
  baselineMinCash,
  cashFloor,
  industryProfile,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const maxBenefit = Math.max(...counterfactuals.map((cf) => Math.max(0, cf.netBenefit)));

  return (
    <div className={`p-5 rounded-2xl border font-sans space-y-4 ${
      isLight ? 'bg-[#FAFAFA] border-[#EAEAEA] text-[#171717]' : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED]'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between border-b pb-3 ${
        isLight ? 'border-[#EAEAEA]' : 'border-[#222222]'
      }`}>
        <div>
          <h3 className={`text-sm font-semibold flex items-center gap-1.5 ${
            isLight ? 'text-[#171717]' : 'text-[#EDEDED]'
          }`}>
            <Zap className="w-4 h-4 text-[#22C55E]" />
            Recommended Action Strategies
          </h3>
          <p className={`text-xs mt-0.5 ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>
            Ranked by net liquidity benefit and solvency impact
          </p>
        </div>
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

      {/* Recommendation cards */}
      <div className="space-y-3">
        {counterfactuals.map((cf) => {
          const isSelected = activeCounterfactual === cf.id;
          const isSafe = cf.statusColor === 'success';
          const isWarn = cf.statusColor === 'warning';
          const isExpanded = expandedId === cf.id;
          const benefitPct = maxBenefit > 0 ? Math.max(0, cf.netBenefit) / maxBenefit : 0;

          return (
            <div
              key={cf.id}
              className={`rounded-xl border transition-all duration-150 overflow-hidden ${
                isSelected
                  ? isLight
                    ? 'bg-[#F3F3F3] border-[#171717]'
                    : 'bg-[#1A1A1A] border-[#EDEDED]'
                  : isLight
                    ? 'bg-[#FFFFFF] border-[#EAEAEA] hover:bg-[#FAFAFA]'
                    : 'bg-[#0A0A0A] border-[#222222] hover:bg-[#111111]'
              }`}
            >
              {/* Card top row */}
              <div
                className="p-4 cursor-pointer active:scale-[0.99] transition-transform"
                onClick={() => onSelectCounterfactual(isSelected ? null : cf.id)}
              >
                <div className="flex items-start justify-between gap-3 font-mono text-xs">
                  {/* Left: rank + title */}
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <div className={`font-semibold shrink-0 ${isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}`}>
                      #{cf.rank}
                    </div>
                    <div className="min-w-0 font-sans">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold text-xs ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>
                          {industryProfile ? industryRecommendationTitle(industryProfile, cf.id, cf.title) : cf.title}
                        </span>
                        {cf.rank === 1 && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E]">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] mt-0.5 ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>
                        {industryProfile
                          ? industryRecommendationAction(industryProfile, cf.id, cf.title)
                          : cf.statusColor === 'success' ? 'Prevents cash floor breach' : cf.statusColor === 'warning' ? 'Marginal liquidity buffer' : 'Breaches safety floor'}
                      </p>
                    </div>
                  </div>

                  {/* Right: min cash */}
                  <div className="text-right shrink-0">
                    <div className={`font-semibold ${
                      isSafe ? 'text-[#22C55E]' : isWarn ? 'text-[#EAB308]' : 'text-[#EF4444]'
                    }`}>
                      {formatINR(cf.minProjectedCash)}
                    </div>
                    <div className={`text-[10px] ${isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}`}>Min Cash</div>
                  </div>
                </div>

                {/* Net benefit bar */}
                <div className="mt-3 font-mono text-xs">
                  <div className="flex items-center justify-between mb-1 text-[11px]">
                    <span className={isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}>Net Benefit</span>
                    <span className={`font-semibold ${cf.netBenefit > 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                      {cf.netBenefit > 0 ? '+' : ''}{formatINR(cf.netBenefit)}
                    </span>
                  </div>
                  <div className={`w-full h-1.5 rounded-full ${isLight ? 'bg-[#EAEAEA]' : 'bg-[#222222]'}`}>
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isSafe ? 'bg-[#22C55E]' : isWarn ? 'bg-[#EAB308]' : 'bg-[#EF4444]'
                      }`}
                      style={{ width: `${Math.round(benefitPct * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Expandable assumptions */}
              <div
                className={`border-t cursor-pointer flex items-center justify-between px-4 py-2 text-xs font-mono transition-colors ${
                  isLight ? 'border-[#EAEAEA] text-[#666666] hover:bg-[#FAFAFA]' : 'border-[#222222] text-[#71717A] hover:bg-[#111111]'
                }`}
                onClick={() => setExpandedId(isExpanded ? null : cf.id)}
              >
                <span>Assumptions & Constraints</span>
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>
              {isExpanded && (
                <div className={`px-4 pb-3 pt-1 space-y-1 text-xs ${isLight ? 'bg-[#FAFAFA]' : 'bg-[#0A0A0A]'}`}>
                  {cf.assumptions.map((a, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-[#22C55E]">•</span>
                      <span className={isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}>{a}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
