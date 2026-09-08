import React from 'react';
import { Clock } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Skeleton } from './ui/Skeleton';

export interface WorkingCapitalPanelProps {
  dso: number;
  dio: number;
  dpo: number;
  ccc: number;
  isLoading?: boolean;
}

export const WorkingCapitalPanel: React.FC<WorkingCapitalPanelProps> = ({
  dso,
  dio,
  dpo,
  ccc,
  isLoading = false,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const getDSOStatus = (val: number) => {
    if (val < 30) return { status: 'green', label: 'Optimal' };
    if (val <= 60) return { status: 'amber', label: 'Moderate' };
    return { status: 'red', label: 'Delayed' };
  };

  const getDIOStatus = (val: number) => {
    if (val < 45) return { status: 'green', label: 'Optimal' };
    if (val <= 75) return { status: 'amber', label: 'Moderate' };
    return { status: 'red', label: 'Excess Stock' };
  };

  const getDPOStatus = (val: number) => {
    if (val > 30) return { status: 'green', label: 'Favorable' };
    if (val >= 15) return { status: 'amber', label: 'Standard' };
    return { status: 'red', label: 'High Outflow' };
  };

  const getCCCStatus = (val: number) => {
    if (val < 45) return { status: 'green', label: 'High Velocity' };
    if (val <= 90) return { status: 'amber', label: 'Balanced' };
    return { status: 'red', label: 'Trapped Capital' };
  };

  const metrics = [
    { code: 'DSO', name: 'Days Sales Outstanding', val: dso, meta: getDSOStatus(dso) },
    { code: 'DIO', name: 'Days Inventory Outstanding', val: dio, meta: getDIOStatus(dio) },
    { code: 'DPO', name: 'Days Payable Outstanding', val: dpo, meta: getDPOStatus(dpo) },
    { code: 'CCC', name: 'Cash Conversion Cycle', val: ccc, meta: getCCCStatus(ccc), isPrimary: true },
  ];

  return (
    <div className={`p-5 rounded-2xl border font-sans space-y-3.5 ${
      isLight ? 'bg-[#FAFAFA] border-[#EAEAEA] text-[#171717]' : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED]'
    }`}>
      <div className={`flex items-center justify-between border-b pb-3 ${
        isLight ? 'border-[#EAEAEA]' : 'border-[#222222]'
      }`}>
        <div>
          <h3 className={`text-sm font-semibold flex items-center gap-1.5 ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>
            <Clock className="w-4 h-4 text-[#A1A1AA]" />
            Working Capital & Conversion Velocity
          </h3>
          <p className={`text-xs mt-0.5 ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>
            Formula: CCC ({ccc} Days) = DSO ({dso}D) + DIO ({dio}D) - DPO ({dpo}D)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <div
            key={m.code}
            className={`p-3.5 rounded-xl border font-mono transition-all duration-150 hover:-translate-y-0.5 ${
              m.isPrimary
                ? isLight ? 'bg-[#FFFFFF] border-[#171717]' : 'bg-[#111111] border-[#EDEDED]'
                : isLight ? 'bg-[#FFFFFF] border-[#EAEAEA]' : 'bg-[#111111] border-[#222222]'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className={isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}>{m.code}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                m.meta.status === 'green'
                  ? 'border-[#22C55E]/30 text-[#22C55E] bg-[#22C55E]/10'
                  : m.meta.status === 'amber'
                  ? 'border-[#EAB308]/30 text-[#EAB308] bg-[#EAB308]/10'
                  : 'border-[#EF4444]/30 text-[#EF4444] bg-[#EF4444]/10'
              }`}>
                {m.meta.label}
              </span>
            </div>
            <div className="text-xl font-semibold tracking-tight">
              {isLoading ? (
                <Skeleton className="h-6 w-16 my-0.5" />
              ) : (
                <>{m.val} <span className="text-xs font-normal">Days</span></>
              )}
            </div>
            <div className={`text-[10px] mt-1 font-sans ${isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}`}>
              {m.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
