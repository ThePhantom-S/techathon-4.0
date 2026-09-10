import React, { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  AlertTriangle,
  Shield,
  TrendingDown,
  TrendingUp,
  Zap,
  RefreshCw,
  ChevronRight,
  X,
  Sparkles,
  Clock,
  Target,
  AlertCircle,
  Info,
  CheckCircle,
  Key,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface Briefing {
  title: string;
  summary: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  keyMetric: string;
  action: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface Anomaly {
  type: 'OVERDUE_RISK' | 'LARGE_PAYMENT' | 'CONCENTRATION_RISK' | 'TIMING_MISMATCH' | 'UNUSUAL_PATTERN';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  recommendation: string;
}

interface AiInsightsPanelProps {
  simulationResult: any;
  cashFloor: number;
  supplierDelayDays: number;
  transactions?: any[];
  payables?: any[];
  activeSubTab?: string;
  industryId?: string;
  industryName?: string;
}

export const AiInsightsPanel: React.FC<AiInsightsPanelProps> = ({
  simulationResult,
  cashFloor,
  supplierDelayDays,
  transactions = [],
  payables = [],
  activeSubTab,
  industryId,
  industryName,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [briefings, setBriefings] = useState<Record<string, Briefing>>({
    '7-Day': {
      title: '7-Day Liquidity Briefing',
      summary: 'Short-term operating cash buffer is adequate. Incoming TechCorp collection (₹4.2L) expected to cover immediate payroll and operational commitments.',
      riskLevel: 'LOW',
      keyMetric: 'Opening Cash: ₹25.00L',
      action: 'Send invoice reminders for Oct 12 customer collections',
      confidence: 'HIGH',
    },
    '30-Day': {
      title: '30-Day Liquidity Briefing',
      summary: 'Critical cash floor breach projected on Oct 14 driven by ₹18.0L Shakti Electronics procurement payable vs delayed customer receivables.',
      riskLevel: 'HIGH',
      keyMetric: 'Min Cash: ₹4.50L vs Floor ₹5.00L',
      action: 'Request 30% customer advance or extend supplier term by +15 days',
      confidence: 'HIGH',
    },
    '60-Day': {
      title: '60-Day Liquidity Briefing',
      summary: 'Working capital stretch due to 70-day Cash Conversion Cycle (CCC). High concentration risk on single vendor procurement peak.',
      riskLevel: 'HIGH',
      keyMetric: 'CCC: 70 Days (DSO 42, DPO 30)',
      action: 'Renegotiate vendor payment terms from Net-30 to Net-60',
      confidence: 'MEDIUM',
    },
    '90-Day': {
      title: '90-Day Liquidity Briefing',
      summary: 'Long-term cash reserves stabilize after Q4 customer collections. Secondary shock risks depend on supplier lead time delays.',
      riskLevel: 'MEDIUM',
      keyMetric: 'Breach Probability: 84%',
      action: 'Establish ₹10L standby working capital line with bank',
      confidence: 'MEDIUM',
    },
  });
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [overallRisk, setOverallRisk] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [anomalySummary, setAnomalySummary] = useState('');
  const [loadingBriefings, setLoadingBriefings] = useState(false);
  const [loadingAnomalies, setLoadingAnomalies] = useState(false);
  const [expandedAnomaly, setExpandedAnomaly] = useState<number | null>(null);
  const [showAllAnomalies, setShowAllAnomalies] = useState(false);

  // ── Deterministic industry-aware financial signals (engine computed) ──
  const [signals, setSignals] = useState<any[]>([]);
  const [loadingSignals, setLoadingSignals] = useState(false);
  const [signalIndustry, setSignalIndustry] = useState<string | null>(null);

  const fetchSignals = useCallback(async () => {
    setLoadingSignals(true);
    try {
      const res = await fetch('/api/signals');
      const data = await res.json();
      setSignals(data.signals || []);
      setSignalIndustry(data.industryName || null);
    } catch (e) {
      console.error('Failed to fetch signals:', e);
    } finally {
      setLoadingSignals(false);
    }
  }, []);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  // Extract verified data from simulation result
  const currentCash = simulationResult?.dailyPoints?.[0]?.cash || 2500000;
  const minCash = simulationResult?.minCash || simulationResult?.minProjectedCash || 450000;
  const earliestBreachDate = simulationResult?.earliestBreachDate || 'Oct 14, 2026';
  const hasBreach = simulationResult?.hasBreach ?? true;
  const breachProbability = simulationResult?.breachProbability ?? 84;
  const dso = simulationResult?.diagnostics?.dso ?? 42;
  const dio = simulationResult?.diagnostics?.dio ?? 58;
  const dpo = simulationResult?.diagnostics?.dpo ?? 30;
  const ccc = simulationResult?.diagnostics?.ccc ?? 70;

  const formatLakhs = (amount: number) => `₹${(amount / 100000).toFixed(2)}L`;

  const verifiedData = {
    currentCash: formatLakhs(currentCash),
    minProjectedCash: formatLakhs(minCash),
    cashFloor: formatLakhs(cashFloor),
    earliestBreachDate,
    supplierDelay: supplierDelayDays,
    breachProbability: `${breachProbability}%`,
    topOutflow: 'Shakti Electronics Procurement (₹18.0L)',
    topInflow: 'TechCorp Collection (₹4.2L)',
    dso: `${dso} days`,
    dio: `${dio} days`,
    dpo: `${dpo} days`,
    ccc: `${ccc} days`,
  };

  // Fetch briefings for each horizon
  const fetchBriefings = useCallback(async () => {
    setLoadingBriefings(true);
    const horizons = ['7-Day', '30-Day', '60-Day', '90-Day'];
    try {
      const results = await Promise.allSettled(
        horizons.map(async (horizon) => {
          const res = await fetch('/api/ai/briefings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ verifiedData, horizon }),
          });
          const data = await res.json();
          return { horizon, briefing: data.briefing };
        })
      );
      const newBriefings: Record<string, Briefing> = {};
      results.forEach((r) => {
        if (r.status === 'fulfilled' && r.value.briefing) {
          newBriefings[r.value.horizon] = r.value.briefing;
        }
      });
      setBriefings(newBriefings);
    } catch (e) {
      console.error('Failed to fetch briefings:', e);
    } finally {
      setLoadingBriefings(false);
    }
  }, [verifiedData.currentCash, verifiedData.minProjectedCash, verifiedData.cashFloor, supplierDelayDays]);

  // Fetch anomalies
  const fetchAnomalies = useCallback(async () => {
    setLoadingAnomalies(true);
    try {
      const res = await fetch('/api/ai/anomalies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions, payables, verifiedData }),
      });
      const data = await res.json();
      setAnomalies(data.anomalies || []);
      setOverallRisk(data.overallRisk || 'MEDIUM');
      setAnomalySummary(data.summary || '');
    } catch (e) {
      console.error('Failed to fetch anomalies:', e);
    } finally {
      setLoadingAnomalies(false);
    }
  }, [transactions, payables, verifiedData.currentCash, supplierDelayDays]);

  // Initial fetch
  // Remove automatic background fetches on mount — initial briefings are pre-loaded instantly

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'HIGH':
      case 'CRITICAL':
        return isLight ? 'bg-red-50 text-red-700 border-red-200' : 'bg-red-500/15 text-red-300 border-red-500/30';
      case 'MEDIUM':
      case 'WARNING':
        return isLight ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      default:
        return isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'WARNING':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return isLight ? 'bg-red-50 border-red-200 hover:bg-red-100' : 'bg-red-500/10 border-red-500/30 hover:bg-red-500/15';
      case 'WARNING':
        return isLight ? 'bg-amber-50 border-amber-200 hover:bg-amber-100' : 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15';
      default:
        return isLight ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' : 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/15';
    }
  };

  const displayedAnomalies = showAllAnomalies ? anomalies : anomalies.slice(0, 3);

  return (
    <div className="space-y-5">
      {/* AI Insights Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-base font-bold font-mono tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Financial Intelligence
            </h2>
            <p className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Liquidity intelligence briefs &amp; financial signal detection
              {industryName && <span className="ml-1.5 text-indigo-500 font-bold">· {industryName}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchBriefings(); fetchAnomalies(); fetchSignals(); }}
            disabled={loadingBriefings || loadingAnomalies || loadingSignals}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors cursor-pointer ${
              isLight ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(loadingBriefings || loadingAnomalies || loadingSignals) ? 'animate-spin' : ''}`} />
            Refresh Intelligence
          </button>
        </div>
      </div>

      {/* Integrate Your AI Keys Banner */}
      {!localStorage.getItem('flowshield_api_key') && !localStorage.getItem('groq_api_key') && !localStorage.getItem('gemini_api_key') && (
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isLight ? 'bg-amber-50/80 border-amber-200 text-amber-900' : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
              <Key className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h3 className="text-xs font-bold font-mono">Integrate Your AI API Keys</h3>
              <p className="text-[11px] opacity-90 mt-0.5">
                Add your Groq or Gemini API key in Platform Settings to enable live financial intelligence briefings.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const settingsBtn = document.querySelector('[data-tab="settings"]') as HTMLElement;
              if (settingsBtn) settingsBtn.click();
            }}
            className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-amber-500 hover:bg-amber-600 text-white transition-colors cursor-pointer shrink-0 shadow-sm"
          >
            Integrate Keys &rarr;
          </button>
        </div>
      )}

      {/* Executive Briefings Row */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <span className={`text-sm font-mono font-bold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
            Liquidity Intelligence Briefs
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {['7-Day', '30-Day', '60-Day', '90-Day'].map((horizon) => {
            const briefing = briefings[horizon];
            return (
              <div
                key={horizon}
                className={`rounded-xl border p-5 transition-all duration-200 ${
                  loadingBriefings && !briefing
                    ? isLight
                      ? 'bg-white border-slate-200 animate-pulse'
                      : 'bg-zinc-900 border-zinc-800 animate-pulse'
                    : isLight
                      ? 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-md'
                      : 'bg-zinc-900 border-zinc-800 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5'
                }`}
              >
                {loadingBriefings && !briefing ? (
                  <div className="space-y-3">
                    <div className={`h-4 w-20 rounded ${isLight ? 'bg-slate-200' : 'bg-zinc-800'}`} />
                    <div className={`h-3 w-full rounded ${isLight ? 'bg-slate-100' : 'bg-zinc-800'}`} />
                    <div className={`h-3 w-3/4 rounded ${isLight ? 'bg-slate-100' : 'bg-zinc-800'}`} />
                  </div>
                ) : briefing ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-mono font-bold uppercase ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                        {horizon}
                      </span>
                      <span className={`text-[11px] font-mono px-2.5 py-1 rounded-full border ${getRiskColor(briefing.riskLevel)}`}>
                        {briefing.riskLevel}
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed line-clamp-4 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                      {briefing.summary}
                    </p>
                    <div className={`text-xs font-mono flex items-center gap-1.5 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                      <Target className="w-3.5 h-3.5" />
                      {briefing.keyMetric}
                    </div>
                    <div className={`text-xs font-mono flex items-center gap-1.5 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
                      <Zap className="w-3.5 h-3.5" />
                      {briefing.action}
                    </div>
                  </div>
                ) : (
                  <div className={`text-xs font-mono ${isLight ? 'text-slate-400' : 'text-zinc-600'}`}>
                    No data available
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Financial Signal Detection Panel */}
      <div className={`${activeSubTab !== 'Overview' ? 'hidden' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className={`text-sm font-mono font-bold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              Financial Signal Detection
            </span>
            {signalIndustry && (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                isLight ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
              }`}>
                {signalIndustry}
              </span>
            )}
            {anomalySummary && (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${getRiskColor(overallRisk)}`}>
                {overallRisk} Risk
              </span>
            )}
          </div>
          <button
            onClick={() => { fetchAnomalies(); fetchSignals(); }}
            disabled={loadingAnomalies || loadingSignals}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono border transition-colors cursor-pointer ${
              isLight ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            <RefreshCw className={`w-3 h-3 ${(loadingAnomalies || loadingSignals) ? 'animate-spin' : ''}`} />
            Scan Signals
          </button>
        </div>

        {/* ── ENGINE-VERIFIED SIGNALS (industry-aware, deterministic) ── */}
        {loadingSignals && signals.length === 0 ? (
          <div className={`rounded-xl border p-5 mb-3 text-center ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className="flex items-center justify-center gap-2">
              <Brain className="w-4 h-4 text-indigo-500 animate-pulse" />
              <span className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Running engine signal scan...
              </span>
            </div>
          </div>
        ) : signals.length > 0 ? (
          <div className="space-y-2 mb-4">
            {signals.map((sig, idx) => {
              const severityCls =
                sig.severity === 'CRITICAL'
                  ? isLight ? 'border-red-200 bg-red-50/60' : 'border-red-500/30 bg-red-500/10'
                  : sig.severity === 'WARNING'
                    ? isLight ? 'border-amber-200 bg-amber-50/60' : 'border-amber-500/30 bg-amber-500/10'
                    : isLight ? 'border-blue-200 bg-blue-50/60' : 'border-blue-500/30 bg-blue-500/10';
              return (
                <div key={idx} className={`rounded-xl border p-3.5 ${severityCls}`}>
                  <div className="flex items-start gap-2.5">
                    <span className="text-base leading-none mt-0.5 shrink-0">
                      {sig.severity === 'CRITICAL' ? '🔴' : sig.severity === 'WARNING' ? '🟠' : '🟡'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>SIGNAL</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${getRiskColor(sig.severity)}`}>
                          {sig.severity}
                        </span>
                        <span className={`text-[11px] font-semibold ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>
                          {sig.title}
                        </span>
                      </div>
                      <p className={`text-[11px] mt-1 leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                        {sig.message}
                      </p>
                      <div className={`mt-1.5 text-[11px] font-mono ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                        <span className="font-bold">Impact:</span> {sig.impact}
                      </div>
                      <div className={`mt-1 text-[10px] font-mono font-bold uppercase tracking-wider ${
                        sig.liquidityImpact === 'High' ? 'text-red-500' : sig.liquidityImpact === 'Medium' ? 'text-amber-500' : 'text-emerald-500'
                      }`}>
                        Potential liquidity impact: {sig.liquidityImpact}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}


        {loadingAnomalies && anomalies.length === 0 ? (
          <div className={`rounded-xl border p-6 text-center ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className="flex items-center justify-center gap-2">
              <Brain className="w-5 h-5 text-indigo-500 animate-pulse" />
              <span className={`text-xs font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Scanning ledger data for risk signals...
              </span>
            </div>
          </div>
        ) : anomalies.length === 0 ? (
          <div className={`rounded-xl border p-6 text-center ${isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <span className={`text-xs font-mono font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-300'}`}>
              All Clear — No risk signals detected
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            {displayedAnomalies.map((anomaly, idx) => (
              <div
                key={idx}
                onClick={() => setExpandedAnomaly(expandedAnomaly === idx ? null : idx)}
                className={`rounded-xl border p-3.5 cursor-pointer transition-all duration-200 ${getSeverityColor(anomaly.severity)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 flex-1">
                    {getSeverityIcon(anomaly.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {anomaly.title}
                        </span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${getRiskColor(anomaly.severity)}`}>
                          {anomaly.severity}
                        </span>
                      </div>
                      {expandedAnomaly === idx && (
                        <div className="mt-2 space-y-2">
                          <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                            {anomaly.description}
                          </p>
                          <div className={`flex items-start gap-1.5 text-[10px] font-mono ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
                            <Zap className="w-3 h-3 mt-0.5 shrink-0" />
                            <span>{anomaly.recommendation}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${expandedAnomaly === idx ? 'rotate-90' : ''} ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
                </div>
              </div>
            ))}
            {anomalies.length > 3 && !showAllAnomalies && (
              <button
                onClick={() => setShowAllAnomalies(true)}
                className={`w-full text-center py-2 rounded-xl text-[11px] font-mono border transition-colors cursor-pointer ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                Show {anomalies.length - 3} more signals
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
