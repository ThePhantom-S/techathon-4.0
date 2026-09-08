import React from 'react';
import { CounterfactualOutcome } from '../types';
import { formatINR } from '../engine/calculator';
import { ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface DecisionMatrixTableProps {
  currentMinCash: number;
  cashFloor: number;
  hasBreach: boolean;
  earliestBreachDate: string | null;
  counterfactuals: CounterfactualOutcome[];
  activeCounterfactual: string | null;
  onSelectCounterfactual: (id: string | null) => void;
}

export const DecisionMatrixTable: React.FC<DecisionMatrixTableProps> = ({
  currentMinCash,
  cashFloor,
  hasBreach,
  earliestBreachDate,
  counterfactuals,
  activeCounterfactual,
  onSelectCounterfactual,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Scenario rows including Do Nothing baseline
  const rows = [
    {
      id: 'baseline',
      action: 'Scenario 1: Do Nothing (Baseline)',
      minCash: currentMinCash,
      breachDate: earliestBreachDate || (hasBreach ? 'Day 19' : 'None'),
      gap: hasBreach ? cashFloor - currentMinCash : 0,
      risk: hasBreach ? 'HIGH' : 'LOW',
      recommended: false,
      statusColor: hasBreach ? 'text-[#EF4444]' : 'text-[#22C55E]',
    },
    ...counterfactuals.map((cf) => ({
      id: cf.id,
      action: cf.title,
      minCash: cf.minProjectedCash,
      breachDate: cf.minProjectedCash < cashFloor ? cf.breachDate || 'Day 19' : 'None (Prevented)',
      gap: cf.minProjectedCash < cashFloor ? cashFloor - cf.minProjectedCash : 0,
      risk: cf.minProjectedCash < cashFloor ? (cf.statusColor === 'error' ? 'HIGH' : 'MEDIUM') : 'LOW',
      recommended: cf.id === 'cf-3',
      statusColor:
        cf.statusColor === 'success'
          ? 'text-[#22C55E]'
          : cf.statusColor === 'warning'
          ? 'text-[#EAB308]'
          : 'text-[#EF4444]',
    })),
  ];

  return (
    <div className={`p-5 rounded-2xl border font-sans space-y-4 ${
      isLight ? 'bg-[#FAFAFA] border-[#EAEAEA] text-[#171717]' : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED]'
    }`}>
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 ${
        isLight ? 'border-[#EAEAEA]' : 'border-[#222222]'
      }`}>
        <div>
          <h3 className={`text-sm font-semibold flex items-center gap-1.5 ${
            isLight ? 'text-[#171717]' : 'text-[#EDEDED]'
          }`}>
            <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
            Decision Comparison Matrix
          </h3>
          <p className={`text-xs mt-0.5 ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>
            Evaluate counterfactual interventions against baseline trajectory
          </p>
        </div>

        <span className="text-xs font-mono px-3 py-1 rounded-full border border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E] font-medium">
          RECOMMENDED: Request 30% Customer Advance
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className={`border-b text-[11px] ${
              isLight ? 'border-[#EAEAEA] text-[#8A8A8A]' : 'border-[#222222] text-[#71717A]'
            }`}>
              <th className="py-2.5 px-3 font-medium">Action / Strategy</th>
              <th className="py-2.5 px-3 font-medium">Min Projected Cash</th>
              <th className="py-2.5 px-3 font-medium">Breach Timeline</th>
              <th className="py-2.5 px-3 font-medium">Liquidity Gap</th>
              <th className="py-2.5 px-3 font-medium">Risk Level</th>
              <th className="py-2.5 px-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isLight ? 'divide-[#EAEAEA]' : 'divide-[#222222]'}`}>
            {rows.map((row) => {
              const isSelected = activeCounterfactual === row.id || (row.id === 'baseline' && !activeCounterfactual);
              return (
                <tr
                  key={row.id}
                  className={`transition-colors duration-150 ${
                    isSelected
                      ? isLight ? 'bg-[#F3F3F3]' : 'bg-[#1A1A1A]'
                      : isLight ? 'hover:bg-[#FFFFFF]' : 'hover:bg-[#111111]'
                  }`}
                >
                  <td className="py-2.5 px-3 font-medium font-sans">
                    <div className="flex items-center gap-2">
                      <span>{row.action}</span>
                      {row.recommended && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#22C55E]/30 text-[#22C55E]">
                          Recommended
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={`py-2.5 px-3 font-semibold ${row.statusColor}`}>
                    {formatINR(row.minCash)}
                  </td>
                  <td className={`py-2.5 px-3 ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>
                    {row.breachDate}
                  </td>
                  <td className="py-2.5 px-3">
                    {row.gap > 0 ? (
                      <span className="text-[#EF4444]">-{formatINR(row.gap)}</span>
                    ) : (
                      <span className="text-[#22C55E]">Fully Solved</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      row.risk === 'HIGH'
                        ? 'border-[#EF4444]/30 text-[#EF4444] bg-[#EF4444]/10'
                        : row.risk === 'MEDIUM'
                        ? 'border-[#EAB308]/30 text-[#EAB308] bg-[#EAB308]/10'
                        : 'border-[#22C55E]/30 text-[#22C55E] bg-[#22C55E]/10'
                    }`}>
                      {row.risk}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => onSelectCounterfactual(row.id === 'baseline' ? null : row.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150 cursor-pointer active:scale-[0.97] ${
                        isSelected
                          ? isLight
                            ? 'bg-[#171717] text-[#FFFFFF] border-[#171717]'
                            : 'bg-[#EDEDED] text-[#000000] border-[#EDEDED]'
                          : isLight
                            ? 'bg-[#FFFFFF] border-[#EAEAEA] text-[#171717] hover:bg-[#FAFAFA]'
                            : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED] hover:bg-[#111111]'
                      }`}
                    >
                      {isSelected ? 'Active' : 'Apply'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
