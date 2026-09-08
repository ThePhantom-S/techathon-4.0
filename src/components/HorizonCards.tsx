import React from 'react';
import { HorizonSnapshot } from '../types';
import { useTheme } from '../context/ThemeContext';
import { Clock } from 'lucide-react';
import { Skeleton } from './ui/Skeleton';

interface HorizonCardsProps {
  horizons: HorizonSnapshot[];
  cashFloor: number;
  isLoading?: boolean;
}

const formatLakh = (val: number): string => `₹${(val / 100000).toFixed(1)}L`;

export const HorizonCards: React.FC<HorizonCardsProps> = ({ horizons = [], cashFloor, isLoading = false }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const sortedHorizons = [...horizons].sort((a, b) => a.days - b.days);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-sans">
      {sortedHorizons.map((item) => {
        const isBelowFloor = item.expectedCash < cashFloor;
        const riskPct = Math.round(item.breachProbability * 100);

        return (
          <div
            key={item.days}
            className={`p-4 rounded-2xl border flex flex-col justify-between h-full transition-all duration-200 ease-out hover:-translate-y-0.5 ${
              isLight
                ? isBelowFloor
                  ? 'bg-[#FFFFFF] border-[#EF4444]'
                  : 'bg-[#FAFAFA] border-[#EAEAEA] hover:border-slate-300'
                : isBelowFloor
                ? 'bg-[#0A0A0A] border-[#EF4444]'
                : 'bg-[#0A0A0A] border-[#222222] hover:border-[#333333]'
            }`}
          >
            {/* Top row: Label and Horizon Days */}
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="flex items-center gap-1.5 font-mono text-xs truncate">
                <Clock className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}`} />
                <span className={`font-medium whitespace-nowrap truncate ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>
                  {item.days}-Day Horizon
                </span>
              </div>

              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0 ${
                isLight ? 'bg-[#FFFFFF] border-[#EAEAEA] text-[#666666]' : 'bg-[#111111] border-[#222222] text-[#71717A]'
              }`}>
                +{item.days}D
              </span>
            </div>

            {/* Large Value: Expected Cash */}
            <div className="my-1 font-mono">
              {isLoading ? (
                <Skeleton className="h-6 w-24 my-0.5" />
              ) : (
                <div className={`text-xl font-semibold tracking-tight ${
                  isBelowFloor ? 'text-[#EF4444]' : 'text-[#22C55E]'
                }`}>
                  {formatLakh(item.expectedCash)}
                </div>
              )}

              <div className={`text-[11px] mt-0.5 ${isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}`}>
                {isLoading ? <Skeleton className="h-3 w-32 mt-1" /> : `Range: ${formatLakh(item.lowerBound)} – ${formatLakh(item.upperBound)}`}
              </div>
            </div>

            {/* Bottom Row: Risk Indicator */}
            <div className={`mt-2 pt-2 border-t flex items-center justify-between font-mono text-xs ${
              isLight ? 'border-[#EAEAEA]' : 'border-[#222222]'
            }`}>
              <span className={`text-[11px] ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>Risk Level</span>
              <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-medium ${
                riskPct > 25
                  ? 'border-[#EF4444]/30 text-[#EF4444] bg-[#EF4444]/10'
                  : 'border-[#22C55E]/30 text-[#22C55E] bg-[#22C55E]/10'
              }`}>
                {riskPct}% Risk
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HorizonCards;
