import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { ShieldAlert, AlertTriangle, ShieldCheck, Activity, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { Skeleton } from './ui/Skeleton';

export interface BreachProbabilityGaugeProps {
  breachProbability: number;  // 0-1 (e.g. 0.78 = 78%)
  p10Cash: number;            // 10th percentile min cash in INR
  p50Cash: number;            // 50th percentile
  p90Cash: number;            // 90th percentile  
  cashFloor: number;          // safety floor in INR
  daysUntilBreach: number | null;
  hasBreach: boolean;
  isLoading?: boolean;
}

export const BreachProbabilityGauge: React.FC<BreachProbabilityGaugeProps> = ({
  breachProbability,
  p10Cash,
  p50Cash,
  p90Cash,
  cashFloor,
  daysUntilBreach,
  hasBreach,
  isLoading = false,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Format cash helper: e.g. ₹5.0L
  const formatCash = (val: number): string => `₹${(val / 100000).toFixed(1)}L`;

  // Clamp probability between 0 and 0.84 (max 84% risk)
  const rawProb = breachProbability > 1 ? breachProbability / 100 : breachProbability;
  const clampedProbability = Math.min(Math.max(rawProb, 0), 0.84);
  const percentage = Math.round(clampedProbability * 100);

  // Determine dynamic risk colors
  const getRiskColor = (prob: number): string => {
    if (prob <= 0.25) return '#22C55E';
    if (prob <= 0.60) return '#EAB308';
    return '#EF4444';
  };

  const riskColor = getRiskColor(clampedProbability);

  // SVG Gauge calculations
  const radius = 70;
  const arcLength = Math.PI * radius;
  const strokeDashoffset = arcLength * (1 - clampedProbability);

  const isP10Breached = p10Cash < cashFloor;

  return (
    <div className={`p-4 rounded-lg border font-sans space-y-4 ${
      isLight ? 'bg-[#FAFAFA] border-[#EAEAEA] text-[#171717]' : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED]'
    }`}>
      {/* Section Header */}
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h3 className={`text-sm font-semibold ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>
            Breach Risk Matrix
          </h3>
          <p className={`text-xs mt-0.5 ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>
            Monte Carlo Stress Tests
          </p>
        </div>

        <div className={`px-2 py-0.5 rounded border text-[11px] font-mono ${
          isLight ? 'bg-[#FFFFFF] border-[#EAEAEA] text-[#666666]' : 'bg-[#111111] border-[#222222] text-[#71717A]'
        }`}>
          STOCHASTIC
        </div>
      </div>

      {/* Semicircle Gauge Visual */}
      <div className="relative w-full max-w-[220px] mx-auto flex flex-col items-center justify-center my-1">
        <svg
          viewBox="0 0 180 95"
          className="w-full overflow-visible"
        >
          {/* Background Track Arc */}
          <path
            d="M 20 90 A 70 70 0 0 1 160 90"
            fill="none"
            stroke={isLight ? '#EAEAEA' : '#222222'}
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* Colored Fill Arc */}
          <path
            d="M 20 90 A 70 70 0 0 1 160 90"
            fill="none"
            stroke={riskColor}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: 'stroke-dashoffset 0.5s ease',
            }}
          />
        </svg>

        {/* Center of Gauge */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-center text-center font-mono pb-0.5">
          <div className="text-3xl font-semibold tracking-tight" style={{ color: riskColor }}>
            {isLoading ? <Skeleton className="h-8 w-20 mx-auto my-1" /> : `${percentage}%`}
          </div>
          <span className={`text-[10px] uppercase font-medium ${isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}`}>
            Breach Risk
          </span>
        </div>
      </div>

      {/* 3 Percentile Cards */}
      <div className="grid grid-cols-3 gap-2 font-mono text-xs">
        {/* P10 (Downside) */}
        <div className={`p-2 rounded border ${
          isP10Breached
            ? 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'
            : isLight ? 'bg-[#FFFFFF] border-[#EAEAEA]' : 'bg-[#111111] border-[#222222]'
        }`}>
          <div className={`text-[10px] ${isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}`}>P10 Downside</div>
          <div className="font-semibold mt-0.5">{formatCash(p10Cash)}</div>
        </div>

        {/* P50 (Expected) */}
        <div className={`p-2 rounded border ${
          isLight ? 'bg-[#FFFFFF] border-[#EAEAEA]' : 'bg-[#111111] border-[#222222]'
        }`}>
          <div className={`text-[10px] ${isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}`}>P50 Expected</div>
          <div className="font-semibold mt-0.5">{formatCash(p50Cash)}</div>
        </div>

        {/* P90 (Upside) */}
        <div className={`p-2 rounded border ${
          isLight ? 'bg-[#FFFFFF] border-[#EAEAEA]' : 'bg-[#111111] border-[#222222]'
        }`}>
          <div className={`text-[10px] ${isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}`}>P90 Upside</div>
          <div className="font-semibold text-[#22C55E] mt-0.5">{formatCash(p90Cash)}</div>
        </div>
      </div>
    </div>
  );
};

export default BreachProbabilityGauge;
