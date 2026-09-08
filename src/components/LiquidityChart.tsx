import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { DailyPoint } from '../types';
import { formatINR } from '../engine/calculator';
import { useTheme } from '../context/ThemeContext';
import { AlertTriangle, TrendingDown } from 'lucide-react';

interface LiquidityChartProps {
  dailyPoints: DailyPoint[];
  cashFloor: number;
  hasBreach: boolean;
  earliestBreachDate: string | null;
  supplierDelayDays: number;
  breachProbability?: number;
  p10Cash?: number;
  p90Cash?: number;
}

type Horizon = 7 | 30 | 60 | 90;

export const LiquidityChart: React.FC<LiquidityChartProps> = ({
  dailyPoints,
  cashFloor,
  hasBreach,
  earliestBreachDate,
  supplierDelayDays,
  breachProbability,
  p10Cash,
  p90Cash,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [horizon, setHorizon] = useState<Horizon>(90);

  // Slice to selected horizon
  const slicedPoints = dailyPoints.slice(0, horizon);

  const chartData = slicedPoints.map((pt) => ({
    day: pt.day % 10 === 0 || pt.day === 1 || pt.day === horizon ? `+${pt.day}D` : '',
    fullDay: `+${pt.day}D`,
    date: pt.date,
    cash: parseFloat((pt.cash / 100000).toFixed(2)),
    upper: parseFloat((pt.upperBound / 100000).toFixed(2)),
    lower: parseFloat((pt.lowerBound / 100000).toFixed(2)),
    cashFloorLakhs: parseFloat((cashFloor / 100000).toFixed(2)),
    isBreach: pt.isBreach,
  }));

  const cashFloorLakhs = parseFloat((cashFloor / 100000).toFixed(2));
  const minCashInView = Math.min(...slicedPoints.map((p) => p.lowerBound)) / 100000;
  const maxCashInView = Math.max(...slicedPoints.map((p) => p.upperBound)) / 100000;
  const yDomain = [
    Math.floor(Math.min(minCashInView, cashFloorLakhs) - 2),
    Math.ceil(maxCashInView + 2),
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0]?.payload;
      if (!d) return null;
      return (
        <div className={`p-3 rounded-md font-mono text-xs border shadow-md ${
          isLight ? 'bg-[#FFFFFF] border-[#EAEAEA] text-[#171717]' : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED]'
        }`}>
          <p className={`text-[11px] mb-2 font-medium ${isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}`}>
            {d.date} · {d.fullDay}
          </p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className={isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}>Expected:</span>
              <span className={`font-semibold ${d.isBreach ? 'text-[#EF4444]' : 'text-[#22C55E]'}`}>₹{d.cash}L</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className={isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}>Upside:</span>
              <span className="text-[#A1A1AA]">₹{d.upper}L</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className={isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}>Downside:</span>
              <span className="text-[#EF4444]">₹{d.lower}L</span>
            </div>
            <div className={`pt-1.5 border-t flex items-center justify-between gap-4 ${isLight ? 'border-[#EAEAEA]' : 'border-[#222222]'}`}>
              <span className={isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}>Safety Floor:</span>
              <span className="text-[#EF4444] font-medium">₹{cashFloorLakhs}L</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const breachPct = breachProbability !== undefined ? Math.round(breachProbability * 100) : null;

  return (
    <div className="space-y-4 font-sans">
      {/* Header row */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h3 className={`text-base font-semibold ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>
            90-Day Liquidity Forecast & Sensitivity Band
          </h3>
          <div className="flex items-center gap-2.5 mt-1 flex-wrap font-mono text-xs">
            <span className={isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}>
              Projected balance curve vs safety floor (₹Lakhs)
            </span>
            {breachPct !== null && (
              <span className={`px-2 py-0.5 rounded border text-[11px] font-medium ${
                breachPct > 60
                  ? 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'
                  : breachPct > 25
                    ? 'bg-[#EAB308]/10 border-[#EAB308]/30 text-[#EAB308]'
                    : 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]'
              }`}>
                {breachPct}% Risk
              </span>
            )}
            {hasBreach && (
              <span className="flex items-center gap-1 text-[11px] text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30 px-2 py-0.5 rounded font-medium">
                <AlertTriangle className="w-3 h-3 text-[#EF4444]" />
                Breach on {earliestBreachDate}
              </span>
            )}
          </div>
        </div>

        {/* Horizon toggle */}
        <div className={`flex rounded-md border overflow-hidden text-xs font-mono p-0.5 ${
          isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'
        }`}>
          {([7, 30, 60, 90] as Horizon[]).map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer text-xs font-medium ${
                horizon === h
                  ? isLight
                    ? 'bg-[#FFFFFF] text-[#171717] shadow-sm'
                    : 'bg-[#1A1A1A] text-[#EDEDED]'
                  : isLight
                    ? 'text-[#666666] hover:text-[#171717]'
                    : 'text-[#71717A] hover:text-[#EDEDED]'
              }`}
            >
              {h}D
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 font-mono text-xs text-[#A1A1AA]">
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-[#22C55E] rounded inline-block" />
          <span className={isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}>Expected Cash</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-2 rounded opacity-40 bg-[#22C55E] inline-block" />
          <span className={isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}>Confidence Envelope</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-[#EF4444] rounded inline-block" style={{ borderTop: '1px dashed #EF4444', background: 'none' }} />
          <span className={isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}>Safety Floor</span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradCash" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22C55E" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradUpper" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22C55E" stopOpacity={0.05} />
                <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="2 2"
              stroke={isLight ? '#EAEAEA' : '#222222'}
              vertical={false}
            />

            <XAxis
              dataKey="day"
              tick={{ fill: isLight ? '#666666' : '#71717A', fontSize: 10, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <YAxis
              domain={yDomain}
              tickFormatter={(v) => `₹${v}L`}
              tick={{ fill: isLight ? '#666666' : '#71717A', fontSize: 10, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Confidence band upper */}
            <Area
              type="monotone"
              dataKey="upper"
              stroke="transparent"
              fill="url(#gradUpper)"
              fillOpacity={1}
              isAnimationActive={false}
            />

            {/* Main cash line */}
            <Area
              type="monotone"
              dataKey="cash"
              stroke="#22C55E"
              strokeWidth={1.5}
              fill="url(#gradCash)"
              fillOpacity={1}
              dot={false}
              activeDot={{ r: 4, fill: '#22C55E', strokeWidth: 1.5, stroke: isLight ? '#FFFFFF' : '#000000' }}
            />

            {/* Cash floor reference line */}
            <ReferenceLine
              y={cashFloorLakhs}
              stroke="#EF4444"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Floor ₹${cashFloorLakhs}L`,
                position: 'insideTopRight',
                fill: '#EF4444',
                fontSize: 10,
                fontFamily: 'monospace',
              }}
            />

            {/* Breach date reference line */}
            {hasBreach && earliestBreachDate && (() => {
              const breachPt = chartData.find((pt) => pt.date === earliestBreachDate);
              if (!breachPt) return null;
              return (
                <ReferenceLine
                  x={breachPt.day}
                  stroke="#EF4444"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  label={{
                    value: 'Breach',
                    position: 'top',
                    fill: '#EF4444',
                    fontSize: 9,
                    fontFamily: 'monospace',
                  }}
                />
              );
            })()}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Simulation info footer */}
      <div className={`flex items-center justify-between text-xs font-mono ${isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}`}>
        <span>Liquidity Risk Engine · 500 stochastic iterations</span>
        <span>Delay Parameter: +{supplierDelayDays} Days</span>
      </div>
    </div>
  );
};
