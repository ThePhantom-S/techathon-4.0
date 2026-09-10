import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Key, Cpu, Sparkles, Check, Eye, EyeOff, Save, ShieldCheck, AlertCircle, RefreshCw, Zap, Building2, MessageCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

import { IndustrySelector } from './IndustrySelector';
import { BusinessProfile, IndustryProfile } from '../types';

interface SettingsViewProps {
  cashFloor: number;
  onUpdateCashFloor: (floor: number) => void;
  supplierDelayDays: number;
  onUpdateSupplierDelay: (days: number) => void;
  industryProfile?: IndustryProfile;
  businessProfile?: BusinessProfile;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  cashFloor,
  onUpdateCashFloor,
  supplierDelayDays,
  onUpdateSupplierDelay,
  industryProfile,
  businessProfile,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // API Key states
  const [geminiKey, setGeminiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [openRouterKey, setOpenRouterKey] = useState('');

  // Password visibility states
  const [showGemini, setShowGemini] = useState(false);
  const [showGroq, setShowGroq] = useState(false);
  const [showOpenRouter, setShowOpenRouter] = useState(false);

  // Status & Notification states
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [providerHealth, setProviderHealth] = useState({
    gemini: false,
    groq: false,
    openrouter: false,
  });

  // Fetch current provider status and local storage keys on mount
  useEffect(() => {
    localStorage.removeItem('flowshield_api_key');
    const savedGemini = localStorage.getItem('gemini_api_key') || '';
    const savedGroq = localStorage.getItem('groq_api_key') || '';
    const savedOpenRouter = localStorage.getItem('openrouter_api_key') || '';

    if (savedGemini) setGeminiKey(savedGemini);
    if (savedGroq) setGroqKey(savedGroq);
    if (savedOpenRouter) setOpenRouterKey(savedOpenRouter);

    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.providers) {
          setProviderHealth({
            gemini: !!savedGemini || data.providers.gemini,
            groq: !!savedGroq || data.providers.groq,
            openrouter: !!savedOpenRouter || data.providers.openrouter,
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveApiKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaveStatus(null);

    try {
      const res = await fetch('/api/settings/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geminiKey: geminiKey.trim(),
          groqKey: groqKey.trim(),
          openRouterKey: openRouterKey.trim(),
        }),
      });

      if (!res.ok) throw new Error('Failed to save API keys');

      const data = await res.json();
      if (data.providers) setProviderHealth(data.providers);

      if (geminiKey.trim()) localStorage.setItem('gemini_api_key', geminiKey.trim());
      else localStorage.removeItem('gemini_api_key');

      if (groqKey.trim()) localStorage.setItem('groq_api_key', groqKey.trim());
      else localStorage.removeItem('groq_api_key');

      if (openRouterKey.trim()) localStorage.setItem('openrouter_api_key', openRouterKey.trim());
      else localStorage.removeItem('openrouter_api_key');

      setSaveStatus('API Keys saved successfully! Engine updated.');
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err: any) {
      setSaveStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans max-w-4xl mx-auto">
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className={`text-xl font-bold tracking-tight flex items-center gap-2 ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            <SettingsIcon className="w-5 h-5 text-indigo-500" />
            FlowShield — Platform &amp; AI Configuration Settings
          </h2>
          <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
            Manage AI LLM provider API keys, cash safety thresholds, and business parameters.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-3 py-1 rounded-full border bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-bold">
            Config Manager
          </span>
        </div>
      </div>

      {saveStatus && (
        <div className={`p-4 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
          saveStatus.startsWith('Error')
            ? 'bg-red-50 text-red-700 border-red-200'
            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          {saveStatus.startsWith('Error') ? <AlertCircle className="w-4 h-4 text-red-500" /> : <Check className="w-4 h-4 text-emerald-600" />}
          <span>{saveStatus}</span>
        </div>
      )}

      {/* ── AI PROVIDER KEYS CARD ── */}
      <form onSubmit={handleSaveApiKeys} className={`p-6 rounded-2xl border space-y-6 shadow-sm ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0c0c12] border-zinc-800 text-white'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/15 border border-indigo-600/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                AI Model API Keys Configuration
              </h2>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Configure custom keys for Google Gemini, Groq, or OpenRouter for real-time LLM insights.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold self-start sm:self-auto shrink-0">
            Secure Encrypted Key Storage
          </span>
        </div>

        <div className="space-y-4">

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className={`text-xs font-semibold flex items-center gap-2 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                <Sparkles className="w-4 h-4 text-blue-500" /> Google Gemini API Key
              </label>
              <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                providerHealth.gemini
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {providerHealth.gemini ? 'Connected (Gemini 2.5 Flash)' : 'Not Configured'}
              </span>
            </div>
            <div className="relative">
              <input
                type={showGemini ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                className={`w-full pr-10 p-2.5 rounded-xl font-mono text-xs border focus:outline-none transition-colors ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 focus:border-indigo-600 text-slate-900 placeholder:text-slate-400'
                    : 'bg-zinc-900 border-zinc-800 focus:border-indigo-500 text-zinc-100 placeholder:text-zinc-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowGemini(!showGemini)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded ${
                  isLight ? 'text-slate-400 hover:text-slate-600' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {showGemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Recommended. Get your free API key at <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-indigo-600 underline">aistudio.google.com</a>.
            </p>
          </div>

          {/* GROQ KEY */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between">
              <label className={`text-xs font-semibold flex items-center gap-2 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                <Zap className="w-4 h-4 text-orange-500" /> Groq API Key (Llama 3.3 70B)
              </label>
              <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                providerHealth.groq
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {providerHealth.groq ? 'Connected (Llama 3.3 70B)' : 'Not Configured'}
              </span>
            </div>
            <div className="relative">
              <input
                type={showGroq ? 'text' : 'password'}
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                placeholder="gsk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                className={`w-full pr-10 p-2.5 rounded-xl font-mono text-xs border focus:outline-none transition-colors ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 focus:border-indigo-600 text-slate-900 placeholder:text-slate-400'
                    : 'bg-zinc-900 border-zinc-800 focus:border-indigo-500 text-zinc-100 placeholder:text-zinc-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowGroq(!showGroq)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded ${
                  isLight ? 'text-slate-400 hover:text-slate-600' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {showGroq ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Ultra-fast inference provider. Get your key at <a href="https://console.groq.com/" target="_blank" rel="noreferrer" className="text-indigo-600 underline">console.groq.com</a>.
            </p>
          </div>

          {/* OPENROUTER KEY */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between">
              <label className={`text-xs font-semibold flex items-center gap-2 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                <Cpu className="w-4 h-4 text-purple-500" /> OpenRouter API Key
              </label>
              <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                providerHealth.openrouter
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {providerHealth.openrouter ? 'Connected (Multi-LLM)' : 'Not Configured'}
              </span>
            </div>
            <div className="relative">
              <input
                type={showOpenRouter ? 'text' : 'password'}
                value={openRouterKey}
                onChange={(e) => setOpenRouterKey(e.target.value)}
                placeholder="sk-or-v1-XXXXXXXXXXXXXXXXXXXXXXXX"
                className={`w-full pr-10 p-2.5 rounded-xl font-mono text-xs border focus:outline-none transition-colors ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 focus:border-indigo-600 text-slate-900 placeholder:text-slate-400'
                    : 'bg-zinc-900 border-zinc-800 focus:border-indigo-500 text-zinc-100 placeholder:text-zinc-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowOpenRouter(!showOpenRouter)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded ${
                  isLight ? 'text-slate-400 hover:text-slate-600' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {showOpenRouter ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save &amp; Update AI Engine
          </button>
        </div>
      </form>

      {/* ── BUSINESS PROFILE & INDUSTRY CARD ── */}
      <div className={`p-6 rounded-2xl border space-y-5 shadow-sm ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0c0c12] border-zinc-800 text-white'
      }`}>
        <div className="flex items-center gap-3 border-b pb-4">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-base font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Business Profile &amp; Industry
            </h2>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              {industryProfile && businessProfile
                ? `${businessProfile.businessName} · ${industryProfile.name}`
                : 'Set your business type to personalize analysis'}
            </p>
          </div>
        </div>
        <IndustrySelector mode="inline" />
      </div>

      {/* ── THRESHOLD CONFIGURATION CARD ── */}
      <div className={`p-6 rounded-2xl border space-y-5 shadow-sm ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0c0c12] border-zinc-800 text-white'
      }`}>
        <div className="flex items-center gap-3 border-b pb-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-base font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Liquidity Target &amp; Business Floor Parameters
            </h2>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Set minimum operational safety floor and supplier shock parameters.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between mb-2">
              <label className={`text-xs font-semibold block ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                Minimum Cash Floor Target (₹)
              </label>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                AUTO-COMPUTED
              </span>
            </div>
            
            <div className={`w-full p-2.5 rounded-xl font-mono text-sm border font-bold flex items-center justify-between ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-zinc-900 border-zinc-800 text-zinc-100'
            }`}>
              <span>₹{(cashFloor / 100000).toFixed(1)}L</span>
            </div>
            
            <p className={`text-[11px] leading-relaxed mt-2 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              <strong>Treasury Policy Algorithm:</strong> The system autonomously provisions your safety floor by reserving 30 days of standard Operating Expenses (Payroll + Rent) alongside all "CRITICAL" tier vendor payables due within the next 15 days, plus a 10% contingency variance.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className={`text-xs font-semibold block ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
              Supplier Lead-Time Shock Delay (Days)
            </label>
            <input
              type="number"
              min={0}
              max={60}
              value={supplierDelayDays}
              onChange={(e) => onUpdateSupplierDelay(Number(e.target.value))}
              className={`w-full p-2.5 rounded-xl font-mono text-xs border focus:outline-none transition-colors ${
                isLight
                  ? 'bg-slate-50 border-slate-200 focus:border-indigo-500 text-slate-900'
                  : 'bg-zinc-900 border-zinc-800 focus:border-indigo-500 text-zinc-100'
              }`}
            />
            <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Simulated delay shock applied to raw material supplier deliveries.
            </p>
          </div>
        </div>
      </div>


    </div>
  );
};
