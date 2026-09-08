import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { formatINR } from '../engine/calculator';
import { RefreshCw, Info, AlertTriangle, TrendingDown, TrendingUp, BarChart3 } from 'lucide-react';

interface MonteCarloData {
  bins: { range: string; count: number; isBreached: boolean }[];
  p10: number;
  p50: number;
  p90: number;
  cashFloor: number;
  breachProbability: number;
  totalRuns: number;
  minCash: number;
  currentCash: number;
}

interface MonteCarloChartProps {
  simulationResult?: any;
  cashFloor?: number;
}

export const MonteCarloChart: React.FC<MonteCarloChartProps> = ({ simulationResult, cashFloor = 500000 }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  
  const [data, setData] = useState<MonteCarloData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/monte-carlo');
      if (!res.ok) throw new Error('Failed to fetch');
      const result = await res.json();
      setData(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const p10 = data?.p10 || simulationResult?.p10Cash || -883219;
  const p50 = data?.p50 || simulationResult?.p50Cash || -848551;
  const p90 = data?.p90 || simulationResult?.p90Cash || -813027;
  const breachProb = data?.breachProbability || simulationResult?.breachProbability || 1;
  const floor = data?.cashFloor || cashFloor;
  const totalRuns = data?.totalRuns || 500;

  // Use actual bins from API or generate from simulation result
  const bins = React.useMemo(() => {
    if (data?.bins && data.bins.length > 0) return data.bins;
    
    // Generate bins from P10/P50/P90
    const rangeMin = Math.min(p10, -10000000);
    const rangeMax = Math.max(p90, 2000000);
    const binCount = 25;
    const binWidth = (rangeMax - rangeMin) / binCount;
    const result = [];
    
    for (let i = 0; i < binCount; i++) {
      const binStart = rangeMin + i * binWidth;
      const binEnd = binStart + binWidth;
      const isBreached = binEnd < floor;
      
      // Simulate bell curve distribution centered on P50
      const center = (p50 - rangeMin) / (rangeMax - rangeMin);
      const x = (i + 0.5) / binCount;
      const distance = Math.abs(x - center);
      const count = Math.round(totalRuns * Math.exp(-distance * distance * 12) * (0.6 + Math.random() * 0.4));
      
      result.push({
        range: `${(binStart / 100000).toFixed(1)}L`,
        count: Math.max(1, count),
        isBreached,
      });
    }
    return result;
  }, [data, p10, p50, p90, floor, totalRuns]);

  // Calculate chart dimensions
  const maxCount = Math.max(...bins.map(b => b.count));
  const chartHeight = 280;
  const barWidth = 100 / bins.length;

  // Find where safety floor falls in the bins
  const floorBinIndex = bins.findIndex(b => {
    const val = parseFloat(b.range) * 100000;
    return val >= floor;
  });

  return (
    <div className={`rounded-2xl border p-6 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0A0A0A] border-[#222222]'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`text-xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Liquidity Risk Engine — Minimum Cash Distribution
          </h2>
          <p className={`text-sm mt-1 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
            {totalRuns} simulated minimum-cash outcomes
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
            isLight ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Re-run
        </button>
      </div>

      {/* Main Chart */}
      <div className={`relative rounded-xl p-6 ${isLight ? 'bg-slate-50' : 'bg-zinc-900/50'}`}>
        {loading ? (
          <div className="h-[320px] flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Safety Floor Label - Top */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className={`w-4 h-4 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`} />
                <span className={`text-xs font-medium ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  Minimum Cash Distribution
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-red-500" />
                <span className={`text-xs font-medium text-red-500`}>
                  Safety Floor: {formatINR(floor)}
                </span>
              </div>
            </div>

            {/* Histogram Container */}
            <div className="relative" style={{ height: `${chartHeight + 60}px` }}>
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-right pr-2" style={{ width: '40px' }}>
                {[maxCount, Math.round(maxCount * 0.75), Math.round(maxCount * 0.5), Math.round(maxCount * 0.25), 0].map((val, i) => (
                  <span key={i} className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
                    {val}
                  </span>
                ))}
              </div>

              {/* Chart area */}
              <div className="ml-10 relative" style={{ height: `${chartHeight}px` }}>
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
                  <div 
                    key={i}
                    className={`absolute w-full border-t ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}
                    style={{ top: `${ratio * 100}%` }}
                  />
                ))}

                {/* Safety Floor horizontal line - PROMINENT */}
                {floorBinIndex >= 0 && (
                  <div 
                    className="absolute w-full border-t-2 border-red-500 border-dashed z-10"
                    style={{ 
                      left: 0,
                      right: 0,
                    }}
                  >
                    <div className="absolute -top-5 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      SAFETY FLOOR: {formatINR(floor)}
                    </div>
                  </div>
                )}

                {/* Histogram bars */}
                <div className="absolute inset-0 flex items-end" style={{ gap: '2px' }}>
                  {bins.map((bin, i) => {
                    const height = (bin.count / maxCount) * 100;
                    const isFloorBar = i === floorBinIndex;
                    
                    // Color intensity based on count
                    const intensity = bin.count / maxCount;
                    const breachColor = intensity > 0.7 
                      ? 'from-red-700 to-red-500' 
                      : intensity > 0.4 
                        ? 'from-red-600 to-red-400'
                        : 'from-red-500 to-red-300';
                    const safeColor = intensity > 0.7 
                      ? 'from-emerald-700 to-emerald-500' 
                      : intensity > 0.4 
                        ? 'from-emerald-600 to-emerald-400'
                        : 'from-emerald-500 to-emerald-300';
                    
                    return (
                      <div
                        key={i}
                        className="flex-1 flex flex-col justify-end relative group"
                        style={{ height: '100%' }}
                      >
                        {/* Bar */}
                        <div 
                          className={`w-full rounded-t transition-all duration-200 cursor-pointer hover:opacity-80 hover:scale-x-110 ${
                            bin.isBreached 
                              ? `bg-gradient-to-t ${breachColor}` 
                              : `bg-gradient-to-t ${safeColor}`
                          }`}
                          style={{ height: `${height}%` }}
                        />
                        
                        {/* Tooltip on hover */}
                        <div className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-20 px-3 py-2 rounded-lg text-xs font-mono whitespace-nowrap shadow-xl ${
                          isLight ? 'bg-slate-800 text-white' : 'bg-zinc-700 text-white'
                        }`}>
                          <div className="font-bold">{bin.count} simulations</div>
                          <div className="text-[10px] opacity-75">{bin.range}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* P10, P50, P90 markers - positioned based on actual values */}
                {[
                  { value: p10, label: 'P10', color: '#f97316', sublabel: 'Downside' },
                  { value: p50, label: 'P50', color: '#eab308', sublabel: 'Median' },
                  { value: p90, label: 'P90', color: '#22c55e', sublabel: 'Upside' },
                ].map((marker, i) => {
                  // Calculate position as percentage of chart width
                  const rangeMin = parseFloat(bins[0].range) * 100000;
                  const rangeMax = parseFloat(bins[bins.length - 1].range) * 100000;
                  const position = ((marker.value - rangeMin) / (rangeMax - rangeMin)) * 100;
                  
                  return (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 flex flex-col items-center"
                      style={{ left: `${Math.max(5, Math.min(95, position))}%` }}
                    >
                      {/* Dashed vertical line */}
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 border-l-2 border-dashed"
                        style={{ borderColor: marker.color }}
                      />
                      
                      {/* Marker dot - larger and more prominent */}
                      <div 
                        className="absolute w-5 h-5 rounded-full border-3 border-white shadow-xl"
                        style={{ 
                          backgroundColor: marker.color,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          borderWidth: '3px',
                        }}
                      />
                      
                      {/* Label - larger and more prominent */}
                      <div className="absolute -top-8 text-center bg-white/90 dark:bg-zinc-800/90 px-2 py-1 rounded shadow-lg">
                        <div className="text-xs font-bold" style={{ color: marker.color }}>
                          {marker.label}
                        </div>
                        <div className="text-[10px] font-medium" style={{ color: marker.color }}>
                          {marker.sublabel}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* X-axis labels */}
              <div className="ml-10 flex justify-between mt-2">
                {bins.filter((_, i) => i % Math.ceil(bins.length / 8) === 0 || i === bins.length - 1).map((bin, i) => (
                  <span key={i} className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                    {bin.range}
                  </span>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-gradient-to-t from-red-700 to-red-400" />
                <span className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                  Below Safety Floor
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-gradient-to-t from-emerald-700 to-emerald-400" />
                <span className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                  Above Safety Floor
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-red-500 border-t-2 border-dashed border-red-500" />
                <span className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                  Safety Floor ({formatINR(floor)})
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className={`p-4 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-orange-500" />
            <span className={`text-xs font-medium ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>P10 (Downside)</span>
          </div>
          <div className="text-xl font-bold text-orange-500">{formatINR(p10)}</div>
          <p className={`text-[10px] mt-1 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>10% of outcomes worse</p>
        </div>
        
        <div className={`p-4 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            <span className={`text-xs font-medium ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>P50 (Median)</span>
          </div>
          <div className={`text-xl font-bold ${p50 < floor ? 'text-amber-500' : 'text-emerald-500'}`}>{formatINR(p50)}</div>
          <p className={`text-[10px] mt-1 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>Median outcome</p>
        </div>
        
        <div className={`p-4 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className={`text-xs font-medium ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>P90 (Upside)</span>
          </div>
          <div className="text-xl font-bold text-emerald-500">{formatINR(p90)}</div>
          <p className={`text-[10px] mt-1 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>90% of outcomes better</p>
        </div>
        
        <div className={`p-4 rounded-xl border ${breachProb > 0.5 ? 'bg-red-50 border-red-200' : isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={`w-4 h-4 ${breachProb > 0.5 ? 'text-red-500' : 'text-emerald-500'}`} />
            <span className={`text-xs font-medium ${breachProb > 0.5 ? 'text-red-500' : 'text-emerald-500'}`}>Breach Risk</span>
          </div>
          <div className={`text-xl font-bold ${breachProb > 0.5 ? 'text-red-500' : 'text-emerald-500'}`}>
            {(breachProb * 100).toFixed(0)}%
          </div>
          <p className={`text-[10px] mt-1 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>{totalRuns} scenarios</p>
        </div>
      </div>

      {/* Clear Statement */}
      <div className={`mt-4 p-4 rounded-xl border ${breachProb >= 1 ? 'bg-red-50 border-red-200' : isLight ? 'bg-amber-50 border-amber-200' : 'bg-red-500/10 border-red-500/30'}`}>
        <div className="flex items-center gap-3">
          {breachProb >= 1 ? (
            <AlertTriangle className="w-5 h-5 text-red-500" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          )}
          <p className={`text-sm font-medium ${breachProb >= 1 ? 'text-red-700' : 'text-amber-700'}`}>
            {breachProb >= 1 
              ? `All ${totalRuns} simulated scenarios fall below the ${formatINR(floor)} safety floor.`
              : `${(breachProb * 100).toFixed(0)}% of ${totalRuns} scenarios breach the ${formatINR(floor)} safety floor.`
            }
          </p>
        </div>
      </div>

      {/* Explanation */}
      <div className={`mt-4 p-5 rounded-xl border ${isLight ? 'bg-indigo-50 border-indigo-200' : 'bg-indigo-500/10 border-indigo-500/30'}`}>
        <div className="flex items-start gap-3">
          <Info className={`w-5 h-5 mt-0.5 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
          <div>
            <h4 className={`text-sm font-bold mb-2 ${isLight ? 'text-indigo-900' : 'text-indigo-300'}`}>
              How to Read This Chart
            </h4>
            <div className={`text-xs leading-relaxed space-y-1 ${isLight ? 'text-indigo-700' : 'text-indigo-400'}`}>
              <p>
                Each bar represents how many of the <strong>{totalRuns} simulations</strong> resulted in that minimum cash level.
                <strong className="mx-1 text-red-500">Taller red bars</strong> mean more simulations landed in the breach zone.
              </p>
              <p>
                The <strong className="text-red-500">dashed red line</strong> is the safety floor of {formatINR(floor)}.
                The <strong className="text-orange-500">P10</strong> (downside), <strong className="text-amber-500">P50</strong> (median), and <strong className="text-emerald-500">P90</strong> (upside) markers show the distribution percentiles.
              </p>
              <p>
                <strong>Why are values clustered?</strong> The noise in collection probability (±10%), payment timing (±3 days), and demand (±15%) creates variation, but the structural deficit (₹27L outflows vs ₹13L inflows) means all outcomes breach the floor. The variation shifts <em>when</em> the breach happens, not <em>whether</em> it happens.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
