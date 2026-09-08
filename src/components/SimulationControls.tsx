import React from 'react';
import { CounterfactualOutcome } from '../types';
import { formatINR } from '../engine/calculator';
import { Sliders } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface SimulationControlsProps {
  supplierDelayDays: number;
  onSupplierDelayChange: (days: number) => void;
  counterfactuals: CounterfactualOutcome[];
  activeCounterfactual: string | null;
  onSelectCounterfactual: (id: string | null) => void;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  supplierDelayDays,
  onSupplierDelayChange,
  counterfactuals,
  activeCounterfactual,
  onSelectCounterfactual,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className="space-y-4 font-sans">
      {/* Simulation Controls Slider Box */}
      <div className={`p-5 rounded-2xl border transition-all duration-200 ${
        isLight ? 'bg-[#FAFAFA] border-[#EAEAEA] text-[#171717]' : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED]'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#A1A1AA]" />
            <h3 className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>
              Supplier Shock Parameter
            </h3>
          </div>
          <span className={`text-xs font-mono px-3 py-1 rounded-full border ${
            isLight ? 'bg-[#FFFFFF] border-[#EAEAEA] text-[#171717]' : 'bg-[#111111] border-[#222222] text-[#EDEDED]'
          }`}>
            +{supplierDelayDays} Days Delay
          </span>
        </div>

        <div className="space-y-2">
          <input
            type="range"
            min={0}
            max={30}
            step={1}
            value={supplierDelayDays}
            onChange={(e) => onSupplierDelayChange(Number(e.target.value))}
            className="w-full h-1.5 bg-[#222222] rounded-full appearance-none cursor-pointer accent-[#EDEDED]"
          />

          <div className={`flex justify-between text-[10px] font-mono ${isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}`}>
            <span>0D (Baseline)</span>
            <span>+15D</span>
            <span>+30D (Max Shock)</span>
          </div>

          {/* Quick Presets */}
          <div className="flex gap-1.5 pt-2">
            {[
              { label: 'Baseline (0D)', val: 0 },
              { label: 'Moderate (+10D)', val: 10 },
              { label: 'Severe (+20D)', val: 20 },
              { label: 'Max Shock (+30D)', val: 30 },
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => onSupplierDelayChange(p.val)}
                className={`flex-1 py-1 text-[10px] font-mono rounded-lg border transition-all cursor-pointer ${
                  supplierDelayDays === p.val
                    ? 'bg-indigo-600 border-indigo-600 text-white font-bold'
                    : isLight
                      ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Counterfactual Strategies Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}`}>
            Action Assessment
          </h3>
          {activeCounterfactual && (
            <button
              onClick={() => onSelectCounterfactual(null)}
              className={`text-[11px] font-mono underline cursor-pointer transition-colors ${
                isLight ? 'text-[#666666] hover:text-[#171717]' : 'text-[#A1A1AA] hover:text-[#EDEDED]'
              }`}
            >
              Reset to Baseline
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {counterfactuals.map((cf) => {
            const isSelected = activeCounterfactual === cf.id;
            const isSafe = cf.status === 'Safe Margin';

            return (
              <div
                key={cf.id}
                onClick={() =>
                  onSelectCounterfactual(isSelected ? null : cf.id)
                }
                className={`p-4 rounded-xl border transition-all duration-150 ease-out cursor-pointer active:scale-[0.98] ${
                  isSelected
                    ? isLight
                      ? 'bg-[#F3F3F3] border-[#171717]'
                      : 'bg-[#1A1A1A] border-[#EDEDED]'
                    : isLight
                      ? 'bg-[#FFFFFF] border-[#EAEAEA] hover:bg-[#FAFAFA] hover:border-[#CBD5E1]'
                      : 'bg-[#0A0A0A] border-[#222222] hover:bg-[#111111] hover:border-[#333333]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className={`text-xs font-medium ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>
                      {cf.title}
                    </h4>
                    <p className={`text-[11px] mt-0.5 ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>
                      {cf.description}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 font-mono">
                    <span className={`text-xs font-semibold ${isSafe ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                      {formatINR(cf.minProjectedCash)}
                    </span>
                    <div className="text-[10px] mt-0.5">
                      {isSafe ? (
                        <span className="text-[#22C55E] px-2 py-0.5 rounded-full border border-[#22C55E]/30 bg-[#22C55E]/10">Safe</span>
                      ) : (
                        <span className="text-[#EF4444] px-2 py-0.5 rounded-full border border-[#EF4444]/30 bg-[#EF4444]/10">Breach</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
