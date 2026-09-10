import React, { useState } from 'react';
import {
  Shield,
  Zap,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Building2,
  Factory,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Activity,
  CheckCircle2,
  Brain,
  Clock,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface LoginViewProps {
  onLogin: (companyName?: string) => void;
  onSwitchDemo?: (industryId: string) => Promise<void> | void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, onSwitchDemo }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [email, setEmail] = useState('cfo@shaktielectronics.in');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLogin('Shakti Electronics');
    }, 400);
  };

  const handleDemoLogin = (companyName: string, industryId?: string) => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLogin(companyName);
      if (industryId && onSwitchDemo) {
        onSwitchDemo(industryId).catch(() => {});
      }
    }, 300);
  };

  return (
    <div className={`min-h-screen w-full flex font-sans ${
      isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#050507] text-white'
    }`}>
      {/* ── LEFT SIDE: Hero Showcase Panel ────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[#0a0a14] via-[#090d1a] to-[#04060e] p-8 lg:p-12 flex-col justify-between overflow-hidden border-r border-zinc-800/80">
        {/* Background ambient mesh glows */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-blue-600/15 blur-[100px] rounded-full pointer-events-none" />

        {/* Top Brand Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-700 p-2 shadow-lg shadow-indigo-500/25 flex items-center justify-center">
            <img src="/flowshield_logo.svg" alt="FlowShield Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-sans tracking-tight text-white">FlowShield</h1>
            <p className="text-[11px] text-indigo-400 font-sans font-medium">SME Cash Flow Resilience Platform</p>
          </div>
        </div>

        {/* Center Feature Highlights */}
        <div className="relative z-10 space-y-6 my-auto max-w-md w-full">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[11px] font-sans font-semibold">
              <Sparkles className="w-3 h-3" /> Next-Gen FinTech Intelligence
            </div>
            <h2 className="text-2xl font-bold font-sans tracking-tight text-white leading-snug">
              SME Liquidity Resilience &amp; Supply Chain Analytics Engine with AI
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Predict exact cash floor breach dates, diagnose supplier outflow pressure, and assess the impact of alternative business decisions in real-time.
            </p>
          </div>

          {/* 3 Feature Bullet Cards */}
          <div className="space-y-2.5 font-sans text-xs">
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80 flex items-center gap-3 hover:border-zinc-700/80 transition-all">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-white text-xs">Early Warning Engine</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">Detect cash floor breaches 16+ days before depletion</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80 flex items-center gap-3 hover:border-zinc-700/80 transition-all">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-white text-xs">3D Business Miniature Model</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">Simulate customer advances &amp; supplier term extensions</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80 flex items-center gap-3 hover:border-zinc-700/80 transition-all">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-white text-xs">500-Run Liquidity Risk Engine</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">Calculate P10 downside, P50 median &amp; P90 upside quantiles</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT SIDE: Form & Demo Login Panel ───────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-10 lg:p-12 relative">
        <div className="w-full max-w-sm space-y-5">
          {/* Mobile Logo Header */}
          <div className="lg:hidden text-center space-y-2 mb-4">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 p-2 shadow-md shadow-indigo-500/25">
              <img src="/flowshield_logo.svg" alt="FlowShield" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-lg font-bold font-sans tracking-tight">FlowShield</h1>
            <p className={`text-[11px] font-sans ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              SME Cash Flow Resilience Platform
            </p>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold font-sans tracking-tight">Sign In to Dashboard</h2>
            <p className={`text-xs font-sans leading-relaxed ${isLight ? 'text-slate-600 font-medium' : 'text-zinc-400'}`}>
              Enter your credentials or choose a 1-click demo profile below.
            </p>
          </div>

          {/* 1-Click Demo Profile Cards (clearly-labeled synthetic datasets) */}
          <div className="space-y-2">
            <div>
              <button
                type="button"
                onClick={() => handleDemoLogin('Shakti Electronics', 'manufacturing')}
                className={`w-full p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer group flex items-center justify-between ${
                  isLight
                    ? 'bg-white hover:bg-indigo-50/60 border-slate-200 hover:border-indigo-300 shadow-xs'
                    : 'bg-[#0A0A0A] hover:bg-indigo-500/10 border-zinc-800 hover:border-indigo-500/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Factory className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold font-sans group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      Shakti Electronics
                    </div>
                    <div className={`text-[10px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                      Manufacturing · Synthetic demo
                    </div>
                  </div>
                </div>
                <div className={`text-[11px] font-mono font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                  ₹12.4L Cash
                </div>
              </button>
            </div>

            {/* Additional industry demo profiles */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'retail', name: 'UrbanMart Retail', label: 'Retail / E-commerce' },
                { id: 'saas', name: 'CloudDesk Software', label: 'SaaS / Software' },
                { id: 'restaurant', name: 'Tandoor Junction', label: 'Restaurant / Food' },
                { id: 'construction', name: 'StructBuild Projects', label: 'Construction' },
              ].map((demo) => (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => handleDemoLogin(demo.name, demo.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer group ${
                    isLight
                      ? 'bg-white hover:bg-indigo-50/60 border-slate-200 hover:border-indigo-300 shadow-xs'
                      : 'bg-[#0A0A0A] hover:bg-indigo-500/10 border-zinc-800 hover:border-indigo-500/40'
                  }`}
                >
                  <div className="text-xs font-semibold font-sans truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {demo.name}
                  </div>
                  <div className={`text-[10px] font-mono mt-0.5 truncate ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                    {demo.label} · Demo
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex items-center justify-center my-4">
            <div className={`w-full border-t ${isLight ? 'border-slate-200' : 'border-zinc-800'}`} />
            <span className={`absolute px-2.5 text-[10px] font-sans font-semibold uppercase tracking-wider ${
              isLight ? 'bg-slate-50 text-slate-500' : 'bg-[#050507] text-zinc-500'
            }`}>
              Or Sign In With Email
            </span>
          </div>

          {/* Email Login Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className={`block text-xs font-sans font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@company.com"
                  className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-sans outline-none transition-all ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                      : 'bg-[#0A0A0A] border-zinc-800 text-white focus:border-indigo-500 focus:bg-black'
                  }`}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={`text-xs font-sans font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                  Password
                </label>
                <a href="#forgot" onClick={(e) => e.preventDefault()} className="text-[11px] font-sans font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`w-full pl-9 pr-9 py-2 rounded-xl border text-xs font-sans outline-none transition-all ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                      : 'bg-[#0A0A0A] border-zinc-800 text-white focus:border-indigo-500 focus:bg-black'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-sans pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className={isLight ? 'text-slate-600 font-medium' : 'text-zinc-400'}>Remember session</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-sans font-semibold text-xs shadow-md shadow-indigo-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to Financial Command Center</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
