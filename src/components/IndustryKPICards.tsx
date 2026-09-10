import React from 'react';
import { SimulationResult } from '../types';
import { IndustryProfile } from '../types';
import { useTheme } from '../context/ThemeContext';
import { formatINR } from '../engine/calculator';

interface IndustryKPICardsProps {
  simulationResult: SimulationResult;
  cashFloor: number;
  industryProfile: IndustryProfile;
}

/**
 * Industry-aware secondary KPI cards.
 * Core metrics (cash, forecast, liquidity risk, floor, breach, probability)
 * stay identical everywhere — these cards add industry context on top.
 */
export const IndustryKPICards: React.FC<IndustryKPICardsProps> = ({ simulationResult, cashFloor, industryProfile }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const { workingCapital, driverAnalysis } = simulationResult;

  const totalAR = driverAnalysis.topInflows.reduce((s, t) => s + t.amount, 0);
  const totalAP = driverAnalysis.topOutflows.reduce((s, t) => s + t.amount, 0);
  // Payroll proxy: outflows whose category mentions payroll / staff
  const payrollMonthly = driverAnalysis.topOutflows
    .filter((d) => /payroll|staff|salary/i.test(d.category + ' ' + d.entity))
    .reduce((s, d) => s + d.amount, 0);

  const compute = (kind: string): { value: string; tone: 'default' | 'green' | 'red' | 'amber' } => {
    switch (kind) {
      case 'currentCash':
        return { value: formatINR(simulationResult.currentCash), tone: 'default' };
      case 'minCash':
        return {
          value: formatINR(simulationResult.minProjectedCash),
          tone: simulationResult.minProjectedCash < cashFloor ? 'red' : 'green',
        };
      case 'breachProb':
        return {
          value: `${Math.min(84, Math.round(simulationResult.breachProbability * 100))}%`,
          tone: simulationResult.breachProbability > 0.5 ? 'red' : simulationResult.breachProbability > 0.25 ? 'amber' : 'green',
        };
      case 'p10':
        return { value: formatINR(simulationResult.p10Cash), tone: simulationResult.p10Cash < cashFloor ? 'red' : 'amber' };
      case 'p50':
        return { value: formatINR(simulationResult.p50Cash), tone: 'default' };
      case 'p90':
        return { value: formatINR(simulationResult.p90Cash), tone: 'green' };
      case 'dio':
        return { value: `${workingCapital.dio} Days`, tone: workingCapital.dio > 45 ? 'red' : workingCapital.dio > 35 ? 'amber' : 'green' };
      case 'dso':
        return { value: `${workingCapital.dso} Days`, tone: workingCapital.dso > 45 ? 'red' : workingCapital.dso > 35 ? 'amber' : 'green' };
      case 'dpo':
        return { value: `${workingCapital.dpo} Days`, tone: 'default' };
      case 'ccc':
        return { value: `${workingCapital.ccc} Days`, tone: workingCapital.ccc > 60 ? 'red' : workingCapital.ccc > 45 ? 'amber' : 'green' };
      case 'totalAR':
        return { value: formatINR(totalAR), tone: 'default' };
      case 'totalAP':
        return { value: formatINR(totalAP), tone: 'default' };
      case 'topOutflow':
        return { value: formatINR(driverAnalysis.topOutflows[0]?.amount || 0), tone: 'red' };
      case 'topInflow':
        return { value: formatINR(driverAnalysis.topInflows[0]?.amount || 0), tone: 'green' };
      case 'payrollMonthly': {
        const payroll = payrollMonthly || 220000;
        return { value: formatINR(payroll), tone: 'red' };
      }
      case 'runway': {
        const payroll = payrollMonthly || 220000;
        const months = payroll > 0 ? simulationResult.currentCash / payroll : 0;
        return {
          value: `${months.toFixed(1)} mo`,
          tone: months < 2 ? 'red' : months < 4 ? 'amber' : 'green',
        };
      }
      case 'topOutflowShare': {
        const top = driverAnalysis.topOutflows[0]?.amount || 0;
        const pct = totalAP > 0 ? Math.round((top / totalAP) * 100) : 0;
        return { value: `${pct}%`, tone: pct > 50 ? 'red' : pct > 30 ? 'amber' : 'default' };
      }
      case 'dailySales':
        return { value: formatINR(driverAnalysis.topInflows[0]?.amount || 0), tone: 'green' };
      case 'commitmentExposure':
        return { value: formatINR(totalAP), tone: totalAP > simulationResult.currentCash ? 'red' : 'amber' };
      default:
        return { value: '—', tone: 'default' };
    }
  };

  if (!industryProfile.kpis.length) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
      {industryProfile.kpis.slice(0, 6).map((kpi) => {
        const { value, tone } = compute(kpi.kind);
        const toneClass =
          tone === 'red'
            ? isLight ? 'text-red-600' : 'text-red-400'
            : tone === 'green'
              ? isLight ? 'text-emerald-600' : 'text-emerald-400'
              : tone === 'amber'
                ? isLight ? 'text-amber-600' : 'text-amber-400'
                : isLight ? 'text-slate-900' : 'text-white';
        return (
          <div
            key={kpi.id}
            className={`p-4 rounded-xl border transition-all duration-150 hover:-translate-y-0.5 ${
              isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#0c0c12] border-zinc-800/80'
            }`}
          >
            <div className={`text-[11px] font-medium truncate ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              {kpi.label}
            </div>
            <div className={`mt-1.5 text-lg font-bold font-mono tracking-tight ${toneClass}`}>{value}</div>
            <div className={`mt-0.5 text-[10px] leading-snug ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
              {kpi.description}
            </div>
          </div>
        );
      })}
    </div>
  );
};