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
  User,
  AlertCircle,
  Briefcase,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { INDUSTRY_OPTIONS } from '../config/industries';

interface LoginViewProps {
  onLogin?: (companyName?: string) => void;
  onSwitchDemo?: (industryId: string) => Promise<void> | void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, onSwitchDemo }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { signIn, signUp, loginAsDemo } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  // Sign In fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Sign Up fields
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [industryId, setIndustryId] = useState('manufacturing');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    const res = await signIn(email, password);
    setIsLoading(false);

    if (res.error) {
      setErrorMessage(res.error);
    } else {
      if (onLogin) onLogin(businessName || '');
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    const res = await signUp(email, password, {
      fullName: fullName || email.split('@')[0],
      businessName: '',
      industryId: 'manufacturing',
    });
    setIsLoading(false);

    if (res.error) {
      setErrorMessage(res.error);
    } else if (res.needsEmailConfirmation) {
      setSuccessMessage('Account created! A confirmation email has been sent. Please verify your email or sign in.');
      setMode('signin');
    } else {
      if (onLogin) onLogin();
    }

  };

  const handleDemoLogin = async (companyName: string, id?: string) => {
    setIsLoading(true);
    await loginAsDemo(companyName, id);
    if (id && onSwitchDemo) {
      try {
        await onSwitchDemo(id);
      } catch {}
    }
    setIsLoading(false);
    if (onLogin) onLogin(companyName);
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
            <p className="text-[11px] text-indigo-400 font-sans font-medium">Enterprise Cash Flow Intelligence</p>
          </div>
        </div>

        {/* Center Feature Highlights */}
        <div className="relative z-10 space-y-6 my-auto max-w-md w-full">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[11px] font-sans font-semibold">
              <Sparkles className="w-3 h-3" /> Powered by Enterprise Cloud
            </div>
            <h2 className="text-2xl font-bold font-sans tracking-tight text-white leading-snug">
              Enterprise Liquidity Forecasting &amp; Supply Chain Digital Twin
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Create an account or test our real-time 500-run Monte Carlo simulation with instant cash breach detection and automated briefings.
            </p>
          </div>

          {/* 3 Feature Bullet Cards */}
          <div className="space-y-2.5 font-sans text-xs">
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80 flex items-center gap-3 hover:border-zinc-700/80 transition-all">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-white text-xs">Early Breach Warning</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">Detect cash floor breaches 16+ days before depletion</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80 flex items-center gap-3 hover:border-zinc-700/80 transition-all">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-white text-xs">3D Business Miniature Model</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">Visual WebGL supply chain simulation with live bottlenecks</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80 flex items-center gap-3 hover:border-zinc-700/80 transition-all">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-white text-xs">Secure Cloud Database</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">ACID transactions, Role-Based Security &amp; real-time sync</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT SIDE: Auth Panel ────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-10 lg:p-12 relative overflow-y-auto">
        <div className="w-full max-w-sm space-y-4 my-auto">
          {/* Mobile Logo Header */}
          <div className="lg:hidden text-center space-y-2 mb-2">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 p-2 shadow-md shadow-indigo-500/25">
              <img src="/flowshield_logo.svg" alt="FlowShield" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-lg font-bold font-sans tracking-tight">FlowShield</h1>
            <p className={`text-[11px] font-sans ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              Enterprise Cash Flow Intelligence
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className={`p-1 rounded-xl flex border ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-zinc-900 border-zinc-800'
          }`}>
            <button
              type="button"
              onClick={() => { setMode('signin'); setErrorMessage(null); setSuccessMessage(null); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                mode === 'signin'
                  ? isLight
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'bg-zinc-800 text-white shadow-xs'
                  : isLight
                    ? 'text-slate-500 hover:text-slate-800'
                    : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setErrorMessage(null); setSuccessMessage(null); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                mode === 'signup'
                  ? isLight
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'bg-zinc-800 text-white shadow-xs'
                  : isLight
                    ? 'text-slate-500 hover:text-slate-800'
                    : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold font-sans tracking-tight">
              {mode === 'signin' ? 'Welcome Back' : 'Create Enterprise Account'}
            </h2>
            <p className={`text-xs font-sans leading-relaxed ${isLight ? 'text-slate-600 font-medium' : 'text-zinc-400'}`}>
              {mode === 'signin'
                ? 'Sign in with your enterprise credentials or use a 1-click demo profile.'
                : 'Set up your company workspace connected to Enterprise Cloud.'}
            </p>
          </div>

          {/* Error & Success Alerts */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ── MODE 1: SIGN IN FORM ────────────────────────────────────────── */}
          {mode === 'signin' && (
            <form onSubmit={handleSignInSubmit} className="space-y-3">
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
                    placeholder="cfo@company.com"
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
                  <span className="text-[11px] font-sans text-indigo-400">Supabase Auth</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
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
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-sans font-semibold text-xs shadow-md shadow-indigo-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Authenticating with Supabase...</span>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ── MODE 2: SIGN UP FORM ────────────────────────────────────────── */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUpSubmit} className="space-y-3">
              <div>
                <label className={`block text-xs font-sans font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Jane Doe"
                    className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-sans outline-none transition-all ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                        : 'bg-[#0A0A0A] border-zinc-800 text-white focus:border-indigo-500 focus:bg-black'
                    }`}
                  />
                </div>
              </div>

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
                    placeholder="cfo@company.com"
                    className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-sans outline-none transition-all ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                        : 'bg-[#0A0A0A] border-zinc-800 text-white focus:border-indigo-500 focus:bg-black'
                    }`}
                  />
                </div>
              </div>


              <div>
                <label className={`block text-xs font-sans font-semibold mb-1 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                  Choose Password (min. 6 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-600 hover:from-emerald-600 hover:to-indigo-700 text-white font-sans font-semibold text-xs shadow-md shadow-emerald-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Creating Workspace in Supabase...</span>
                ) : (
                  <>
                    <span>Create Enterprise Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ── 1-CLICK DEMO SANDBOX PROFILES (FOR TESTING / JUDGING) ───────── */}
          <div className="relative flex items-center justify-center pt-2">
            <div className={`w-full border-t ${isLight ? 'border-slate-200' : 'border-zinc-800'}`} />
            <span className={`absolute px-2.5 text-[10px] font-sans font-semibold uppercase tracking-wider ${
              isLight ? 'bg-slate-50 text-slate-500' : 'bg-[#050507] text-zinc-500'
            }`}>
              Or 1-Click Sandbox Demo
            </span>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('Shakti Electronics', 'manufacturing')}
              className={`w-full p-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer group flex items-center justify-between ${
                isLight
                  ? 'bg-white hover:bg-indigo-50/60 border-slate-200 hover:border-indigo-300 shadow-xs'
                  : 'bg-[#0A0A0A] hover:bg-indigo-500/10 border-zinc-800 hover:border-indigo-500/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <Factory className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold font-sans group-hover:text-indigo-400 transition-colors">
                    Shakti Electronics
                  </div>
                  <div className={`text-[10px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    Manufacturing · Baseline
                  </div>
                </div>
              </div>
              <div className={`text-[11px] font-mono font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                ₹12.4L Cash
              </div>
            </button>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'saas', name: 'CloudDesk Software', label: 'SaaS / Cloud' },
                { id: 'retail', name: 'UrbanMart Retail', label: 'Retail / E-com' },
              ].map((demo) => (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => handleDemoLogin(demo.name, demo.id)}
                  className={`p-2 rounded-xl border text-left transition-all duration-150 cursor-pointer group ${
                    isLight
                      ? 'bg-white hover:bg-indigo-50/60 border-slate-200 hover:border-indigo-300 shadow-xs'
                      : 'bg-[#0A0A0A] hover:bg-indigo-500/10 border-zinc-800 hover:border-indigo-500/40'
                  }`}
                >
                  <div className="text-xs font-semibold font-sans truncate group-hover:text-indigo-400 transition-colors">
                    {demo.name}
                  </div>
                  <div className={`text-[10px] font-mono mt-0.5 truncate ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                    {demo.label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
