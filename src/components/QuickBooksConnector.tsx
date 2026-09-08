import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  ChevronDown,
  ChevronUp,
  Unplug,
  BookOpen,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface QuickBooksConnectorProps {
  onBack: () => void;
  onConnected: (data: { currentCash: number; transactions: any[]; payables: any[]; expenses: any[] }) => void;
}

type ConnectorStep = 'CONFIGURE' | 'GUIDE' | 'CONNECTING' | 'CALLBACK_PENDING' | 'SUCCESS' | 'ERROR' | 'CONNECTED';

interface ConnectionStatus {
  connected: boolean;
  realmId?: string;
  companyName?: string;
  lastSynced?: string;
  invoiceCount?: number;
  billCount?: number;
  currentCash?: number;
}

interface ErrorState {
  code: string;
  message: string;
  detail?: string;
}

const REDIRECT_URI = typeof window !== 'undefined' ? `${window.location.origin}/api/connect/quickbooks/callback` : '';

export const QuickBooksConnector: React.FC<QuickBooksConnectorProps> = ({ onBack, onConnected }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [step, setStep] = useState<ConnectorStep>('CONFIGURE');
  const [showSecret, setShowSecret] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<ErrorState | null>(null);

  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [realmId, setRealmId] = useState('');

  const [status, setStatus] = useState<ConnectionStatus>({ connected: false });

  useEffect(() => {
    fetch('/api/connect/quickbooks/status')
      .then((r) => r.json())
      .then((data) => {
        if (data.connected) {
          setStatus(data);
          setStep('CONNECTED');
        }
      })
      .catch(() => {});
  }, []);

  const isFormValid = clientId.trim().length > 5 && clientSecret.trim().length > 5;

  const handleStartOAuth = useCallback(async () => {
    if (!isFormValid) {
      setError({ code: 'MISSING_FIELDS', message: 'Please fill in Client ID and Client Secret.' });
      setStep('ERROR');
      return;
    }

    setStep('CONNECTING');
    setLoadingMessage('Preparing OAuth authorization request...');
    setError(null);

    try {
      const res = await fetch('/api/connect/quickbooks/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
          realmId: realmId.trim() || undefined,
          redirectUri: REDIRECT_URI,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.authUrl) {
        throw new Error(data.error || 'Failed to generate authorization URL.');
      }

      setLoadingMessage('Redirecting to Intuit authorization page...');
      await new Promise((r) => setTimeout(r, 600));
      window.location.href = data.authUrl;
    } catch (e: any) {
      setError({
        code: 'AUTH_INIT_FAILED',
        message: e.message || 'Failed to initiate OAuth flow.',
        detail: 'Verify your Client ID and Client Secret, then try again.',
      });
      setStep('ERROR');
    }
  }, [clientId, clientSecret, realmId, isFormValid]);

  const handleSync = useCallback(async () => {
    setStep('CONNECTING');
    setLoadingMessage('Syncing financial data from QuickBooks Online...');
    try {
      const res = await fetch('/api/connect/quickbooks/sync', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Sync failed.');

      setStatus({
        connected: true,
        companyName: data.companyName,
        lastSynced: data.lastSynced,
        invoiceCount: data.invoiceCount,
        billCount: data.billCount,
        currentCash: data.currentCash,
      });

      onConnected({
        currentCash: data.currentCash || 0,
        transactions: data.transactions || [],
        payables: data.payables || [],
        expenses: data.expenses || [],
      });

      setStep('SUCCESS');
    } catch (e: any) {
      setError({
        code: 'SYNC_FAILED',
        message: e.message || 'Failed to sync data.',
        detail: 'Your authorization may have expired. Please re-authorize.',
      });
      setStep('ERROR');
    }
  }, [onConnected]);

  const handleDisconnect = useCallback(async () => {
    try {
      await fetch('/api/connect/quickbooks/disconnect', { method: 'POST' });
      setStatus({ connected: false });
      setStep('CONFIGURE');
    } catch (e) {
      console.error('Disconnect failed:', e);
    }
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const SecretField = ({
    label,
    value,
    onChange,
    placeholder,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
  }) => (
    <div>
      <label className={`text-xs font-semibold block mb-1.5 ${
        isLight ? 'text-slate-700' : 'text-zinc-300'
      }`}>
        {label}
      </label>
      <div className="relative">
        <input
          type={showSecret ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full pr-20 p-2.5 rounded-xl font-sans text-xs border focus:outline-none transition-colors ${
            isLight
              ? 'bg-slate-50 border-slate-200 focus:border-emerald-500 text-slate-900 placeholder:text-slate-400'
              : 'bg-zinc-900 border-zinc-800 focus:border-emerald-500 text-zinc-100 placeholder:text-zinc-500'
          }`}
        />
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setShowSecret(!showSecret)}
            className={`p-1 rounded transition-colors ${isLight ? 'hover:bg-slate-200 text-slate-400' : 'hover:bg-zinc-800 text-zinc-400'}`}
            title={showSecret ? 'Hide' : 'Show'}
          >
            {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => copyToClipboard(value)}
            className={`p-1 rounded transition-colors ${isLight ? 'hover:bg-slate-200 text-slate-400' : 'hover:bg-zinc-800 text-zinc-400'}`}
            title="Copy to clipboard"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  const TextField = ({
    label,
    value,
    onChange,
    placeholder,
    hint,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    hint?: string;
  }) => (
    <div>
      <label className={`text-xs font-semibold block mb-1.5 ${
        isLight ? 'text-slate-700' : 'text-zinc-300'
      }`}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full p-2.5 rounded-xl font-sans text-xs border focus:outline-none transition-colors ${
          isLight
            ? 'bg-slate-50 border-slate-200 focus:border-emerald-500 text-slate-900 placeholder:text-slate-400'
            : 'bg-zinc-900 border-zinc-800 focus:border-emerald-500 text-zinc-100 placeholder:text-zinc-500'
        }`}
      />
      {hint && (
        <p className={`text-[11px] mt-1 font-sans ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>{hint}</p>
      )}
    </div>
  );

  // ── CONNECTING ──
  if (step === 'CONNECTING') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
        <div className={`rounded-2xl max-w-md w-full p-8 text-center space-y-6 shadow-2xl border ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0c0c12] border-white/15'
        }`}>
          <div className="relative mx-auto w-16 h-16">
            <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <Zap className="w-6 h-6 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <div>
            <h3 className={`text-sm font-bold font-mono uppercase tracking-widest ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              Connecting to QuickBooks
            </h3>
            <p className="text-xs text-emerald-500 font-mono mt-2 animate-pulse">{loadingMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── ERROR ──
  if (step === 'ERROR' && error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
        <div className={`rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0c0c12] border-white/15'
        }`}>
          <div className="text-center space-y-3">
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <h3 className={`text-lg font-bold font-mono uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Connection Failed
            </h3>
            <p className={`text-xs font-mono p-3 rounded-lg ${
              isLight ? 'text-red-700 bg-red-50 border border-red-200' : 'text-red-400 bg-red-500/15 border border-red-500/30'
            }`}>
              {error.message}
            </p>
            {error.detail && (
              <p className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
                {error.detail}
              </p>
            )}
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => { setStep('CONFIGURE'); setError(null); }}
              className={`px-4 py-2 rounded-xl font-mono text-xs border transition-colors cursor-pointer ${
                isLight
                  ? 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  : 'border-white/10 text-white/70 hover:bg-white/5'
              }`}
            >
              Retry Configuration
            </button>
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold font-mono text-xs cursor-pointer"
            >
              Choose Another Source
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── SUCCESS ──
  if (step === 'SUCCESS') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
        <div className={`rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0c0c12] border-white/15'
        }`}>
          <div className="text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(52,211,153,0.3)]">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </div>
            <h3 className={`text-lg font-bold font-mono uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>
              QuickBooks Connected
            </h3>
            <div className="flex flex-col items-center gap-1.5 text-xs font-mono">
              <span className="text-emerald-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" /> Authorization successful
              </span>
              <span className="text-emerald-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" /> Financial data synchronized
              </span>
              <span className="text-emerald-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" /> Read-only connection active
              </span>
            </div>
          </div>

          <div className={`rounded-xl p-4 space-y-2 font-mono text-xs border ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
          }`}>
            {status.companyName && (
              <div className="flex justify-between">
                <span className={isLight ? 'text-slate-500' : 'text-white/50'}>Company</span>
                <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{status.companyName}</span>
              </div>
            )}
            {status.lastSynced && (
              <div className="flex justify-between">
                <span className={isLight ? 'text-slate-500' : 'text-white/50'}>Last Synced</span>
                <span className={isLight ? 'text-slate-700' : 'text-white/80'}>{status.lastSynced}</span>
              </div>
            )}
            {status.invoiceCount !== undefined && (
              <div className="flex justify-between">
                <span className={isLight ? 'text-slate-500' : 'text-white/50'}>Invoices Retrieved</span>
                <span className="text-emerald-500 font-bold">{status.invoiceCount}</span>
              </div>
            )}
            {status.billCount !== undefined && (
              <div className="flex justify-between">
                <span className={isLight ? 'text-slate-500' : 'text-white/50'}>Bills Retrieved</span>
                <span className="text-orange-500 font-bold">{status.billCount}</span>
              </div>
            )}
            {status.currentCash !== undefined && (
              <div className="flex justify-between">
                <span className={isLight ? 'text-slate-500' : 'text-white/50'}>Available Balance</span>
                <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  ₹{(status.currentCash / 100000).toFixed(2)}L
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold font-mono text-xs uppercase tracking-wider cursor-pointer"
            >
              View Financial Dashboard
            </button>
            <button
              onClick={handleSync}
              className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold border transition-colors cursor-pointer ${
                isLight
                  ? 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  : 'border-white/10 text-white/70 hover:bg-white/5'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 inline mr-1" />
              Sync Again
            </button>
          </div>

          <button
            onClick={handleDisconnect}
            className={`w-full py-2 rounded-xl font-mono text-xs border transition-colors cursor-pointer ${
              isLight
                ? 'border-red-200 text-red-600 hover:bg-red-50'
                : 'border-red-500/30 text-red-400 hover:bg-red-500/10'
            }`}
          >
            <Unplug className="w-3.5 h-3.5 inline mr-1" />
            Disconnect QuickBooks
          </button>
        </div>
      </div>
    );
  }

  // ── CONNECTED ──
  if (step === 'CONNECTED') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
        <div className={`rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0c0c12] border-white/15'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-emerald-500/30">
              Q
            </div>
            <div>
              <h2 className={`text-lg font-bold uppercase italic ${isLight ? 'text-slate-900' : 'text-white'}`}>
                QuickBooks Connected
              </h2>
              <p className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
                Read-only connection active
              </p>
            </div>
          </div>

          <div className={`flex items-center gap-3 p-3 rounded-xl border ${
            isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-500/10 border-emerald-500/30'
          }`}>
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <div className={`text-xs font-mono ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
              Your QuickBooks data is synchronized and available for liquidity forecasting.
            </div>
          </div>

          <div className={`rounded-xl p-4 space-y-2 font-mono text-xs border ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
          }`}>
            {status.companyName && (
              <div className="flex justify-between">
                <span className={isLight ? 'text-slate-500' : 'text-white/50'}>Company</span>
                <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{status.companyName}</span>
              </div>
            )}
            {status.lastSynced && (
              <div className="flex justify-between">
                <span className={isLight ? 'text-slate-500' : 'text-white/50'}>Last Synced</span>
                <span className={isLight ? 'text-slate-700' : 'text-white/80'}>{status.lastSynced}</span>
              </div>
            )}
            {status.invoiceCount !== undefined && (
              <div className="flex justify-between">
                <span className={isLight ? 'text-slate-500' : 'text-white/50'}>Invoices</span>
                <span className="text-emerald-500 font-bold">{status.invoiceCount}</span>
              </div>
            )}
            {status.billCount !== undefined && (
              <div className="flex justify-between">
                <span className={isLight ? 'text-slate-500' : 'text-white/50'}>Bills</span>
                <span className="text-orange-500 font-bold">{status.billCount}</span>
              </div>
            )}
            {status.currentCash !== undefined && (
              <div className="flex justify-between">
                <span className={isLight ? 'text-slate-500' : 'text-white/50'}>Balance</span>
                <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  ₹{(status.currentCash / 100000).toFixed(2)}L
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold font-mono text-xs uppercase tracking-wider cursor-pointer"
            >
              View Financial Dashboard
            </button>
            <button
              onClick={handleSync}
              className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold border transition-colors cursor-pointer ${
                isLight
                  ? 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  : 'border-white/10 text-white/70 hover:bg-white/5'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 inline mr-1" />
              Sync
            </button>
          </div>

          <button
            onClick={handleDisconnect}
            className={`w-full py-2 rounded-xl font-mono text-xs border transition-colors cursor-pointer ${
              isLight
                ? 'border-red-200 text-red-600 hover:bg-red-50'
                : 'border-red-500/30 text-red-400 hover:bg-red-500/10'
            }`}
          >
            <Unplug className="w-3.5 h-3.5 inline mr-1" />
            Disconnect QuickBooks
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER: CONFIGURE
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className={`rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border relative max-h-[85vh] overflow-y-auto font-sans ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0c0c12] border-white/15 text-white'
      }`}>

        {/* Header */}
        <div className="flex items-center gap-3 border-b pb-3.5">
          <button
            onClick={onBack}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLight ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-white/10 text-white/50'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 font-black text-sm">
            Q
          </div>
          <div>
            <h2 className={`text-base font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Connect QuickBooks Online
            </h2>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
              Secure, read-only API access to your accounting data for cash flow forecasting.
            </p>
          </div>
        </div>

        {/* Security Panel */}
        <div className={`rounded-xl p-3.5 border ${
          isLight ? 'bg-emerald-50/80 border-emerald-200' : 'bg-emerald-500/10 border-emerald-500/30'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className={`text-xs font-bold uppercase tracking-wider ${
              isLight ? 'text-emerald-800' : 'text-emerald-300'
            }`}>
              Security &amp; Permissions
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
            {[
              'OAuth 2.0 authorization',
              'Read-only financial access',
              'No payment authority',
              'No account password shared with FlowShield',
              'User-controlled authorization',
            ].map((item, i) => (
              <div key={i} className={`flex items-center gap-1.5 font-medium ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Setup Guide */}
        <div className={`rounded-xl border overflow-hidden ${
          isLight ? 'border-slate-200' : 'border-white/10'
        }`}>
          <button
            onClick={() => setShowGuide(!showGuide)}
            className={`w-full flex items-center justify-between p-3.5 transition-colors cursor-pointer ${
              isLight ? 'hover:bg-slate-50 text-slate-700' : 'hover:bg-white/5 text-white/70'
            }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-mono font-bold">Where do I get these?</span>
            </div>
            {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showGuide && (
            <div className={`p-4 space-y-4 border-t text-xs font-mono ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-white/70'
            }`}>
              <div className={`p-3 rounded-lg border ${
                isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}>
                <strong>View Setup Guide — Intuit Developer Portal</strong>
              </div>

              {[
                { step: 1, text: 'Open the Intuit Developer Portal at https://developer.intuit.com/' },
                { step: 2, text: 'Create a new QuickBooks Online application' },
                { step: 3, text: `Configure the Redirect URI: ${REDIRECT_URI}` },
                { step: 4, text: 'Configure the required read-only scopes (com.intuit.quickbooks.accounting)' },
                { step: 5, text: 'Copy the Client ID and Client Secret from the app dashboard' },
                { step: 6, text: 'Click "Connect & Authorize" below to start the OAuth flow' },
              ].map(({ step: s, text }) => (
                <div key={s} className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    {s}
                  </div>
                  <p className="leading-relaxed">{text}</p>
                </div>
              ))}

              <div className={`mt-4 p-3 rounded-lg border ${
                isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'
              }`}>
                <p className={`font-bold mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>Required permissions (scopes):</p>
                <div className="space-y-1">
                  {[
                    'com.intuit.quickbooks.accounting — Read',
                    'com.intuit.quickbooks.payment — Disabled',
                  ].map((scope, i) => (
                    <div key={i} className={`flex items-center gap-1.5 ${
                      i === 0 ? 'text-emerald-500' : 'text-red-400'
                    }`}>
                      {i === 0 ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <AlertCircle className="w-3 h-3 shrink-0" />}
                      <span>{scope}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className={`text-[10px] italic ${isLight ? 'text-slate-500' : 'text-white/40'}`}>
                FlowShield will never request permission to create, edit, delete, or pay financial records.
              </p>
            </div>
          )}
        </div>

        {/* Credential Fields */}
        <div className="space-y-3">
          <div className={`text-xs font-bold uppercase tracking-wider ${
            isLight ? 'text-slate-500' : 'text-zinc-400'
          }`}>
            API Credentials Required
          </div>

          <TextField
            label="Client ID"
            value={clientId}
            onChange={setClientId}
            placeholder="ABxxxxxxxxxxxxxxxxxxxxxxxx"
            hint="Found in Intuit Developer Dashboard → Keys"
          />

          <SecretField
            label="Client Secret"
            value={clientSecret}
            onChange={setClientSecret}
            placeholder="••••••••••••••••••••"
          />

          <TextField
            label="Company / Realm ID (optional)"
            value={realmId}
            onChange={setRealmId}
            placeholder="Enter Realm ID"
            hint="Auto-detected from OAuth callback if left blank"
          />

          <div className={`flex items-center gap-2 p-2.5 rounded-xl text-xs ${
            isLight ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
          }`}>
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
            <span>FlowShield will never ask for your QuickBooks username, password, bank PIN, or OTP.</span>
          </div>
        </div>

        {/* Required Permissions */}
        <div className={`rounded-xl p-3.5 border ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
        }`}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${
            isLight ? 'text-slate-600' : 'text-zinc-300'
          }`}>
            Permissions Requested
          </p>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {[
              'Invoices — Read',
              'Bills — Read',
              'Customers — Read',
              'Accounts — Read',
            ].map((p, i) => (
              <div key={i} className="flex items-center gap-1.5 text-emerald-500 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{p}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-2">
          <button
            onClick={onBack}
            className={`px-4 py-2 rounded-xl font-sans text-xs font-medium border transition-colors cursor-pointer ${
              isLight
                ? 'border-slate-300 text-slate-600 hover:bg-slate-50'
                : 'border-white/10 text-white/70 hover:bg-white/5'
            }`}
          >
            Back
          </button>

          <button
            onClick={handleStartOAuth}
            disabled={!isFormValid}
            className={`px-6 py-2.5 rounded-xl font-sans text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              isFormValid
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                : isLight
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
            }`}
          >
            Connect &amp; Authorize QuickBooks
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
