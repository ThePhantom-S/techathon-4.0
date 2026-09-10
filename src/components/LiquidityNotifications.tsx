import React, { useCallback, useEffect, useState } from 'react';
import { Bell, MessageCircle, Send, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

/**
 * WhatsApp Liquidity Alert & Briefing UI.
 * The WhatsApp access token is backend-only (process.env) and is NEVER
 * requested, displayed, or stored on the frontend.
 */

export interface WhatsAppStatusResponse {
  enabled: boolean;
  configured: boolean;
  recipientConfigured: boolean;
  settings?: {
    floorBreachEnabled: boolean;
    highRiskEnabled: boolean;
    paymentRiskEnabled: boolean;
    weeklyBriefingEnabled: boolean;
    riskThreshold: number;
  };
}

export interface AlertSendResult {
  ok: boolean;
  message: string;
}

// ── Small typed API helpers (no secrets involved) ──────────────────────────
export async function fetchWhatsAppStatus(): Promise<WhatsAppStatusResponse> {
  const res = await fetch('/api/notifications/whatsapp/status');
  if (!res.ok) throw new Error('Failed to read WhatsApp status');
  return res.json();
}

export async function saveWhatsAppAlertSettings(patch: Record<string, any>): Promise<WhatsAppStatusResponse['settings']> {
  const res = await fetch('/api/notifications/whatsapp/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to save notification settings');
  return data.settings;
}

export async function sendWhatsAppTestAlert(): Promise<AlertSendResult> {
  try {
    const res = await fetch('/api/notifications/whatsapp/test', { method: 'POST' });
    const data = await res.json();
    if (res.ok && data.success) {
      return { ok: true, message: 'Test alert sent to WhatsApp.' };
    }
    return { ok: false, message: data?.error || 'Unable to send the WhatsApp test alert.' };
  } catch {
    return { ok: false, message: 'Unable to send the WhatsApp test alert.' };
  }
}

export async function sendWhatsAppLiquidityBrief(): Promise<AlertSendResult> {
  try {
    const res = await fetch('/api/notifications/whatsapp/send', { method: 'POST' });
    const data = await res.json();
    if (res.ok && data.success) {
      return { ok: true, message: 'Liquidity brief sent to WhatsApp.' };
    }
    return { ok: false, message: data?.error || 'Unable to send the WhatsApp liquidity brief.' };
  } catch {
    return { ok: false, message: 'Unable to send the WhatsApp liquidity brief.' };
  }
}

const DEFAULT_SETTINGS = {
  floorBreachEnabled: true,
  highRiskEnabled: true,
  paymentRiskEnabled: true,
  weeklyBriefingEnabled: false,
  riskThreshold: 70,
};

interface PanelProps {
  /** When true, renders inside Platform Settings without its own page header. */
  embedded?: boolean;
}

const LiquidityNotificationsPanelInner: React.FC<PanelProps> = ({ embedded = false }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [status, setStatus] = useState<WhatsAppStatusResponse | null>(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState<'none' | 'test' | 'brief' | 'saving'>('none');

  const loadStatus = useCallback(async () => {
    try {
      const s = await fetchWhatsAppStatus();
      setStatus(s);
      if (s.settings) setSettings(s.settings);
    } catch (e: any) {
      setFeedback({ kind: 'err', text: e.message || 'Unable to read WhatsApp integration status.' });
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const persistSettings = async (next: typeof settings) => {
    setSettings(next);
    setBusy('saving');
    try {
      const saved = await saveWhatsAppAlertSettings(next);
      setSettings({ ...next, ...saved });
    } catch (e: any) {
      setFeedback({ kind: 'err', text: e.message || 'Failed to save notification settings.' });
    } finally {
      setBusy('none');
    }
  };

  const toggleSetting = (key: keyof typeof settings) => {
    persistSettings({ ...settings, [key]: !settings[key] });
  };

  const onRiskThreshold = (value: number) => {
    persistSettings({ ...settings, riskThreshold: Math.max(0, Math.min(100, Math.round(value))) });
  };

  const connected = !!status?.configured;
  const recipientConfigured = !!status?.recipientConfigured;

  const runTest = async () => {
    setBusy('test');
    setFeedback(null);
    const r = await sendWhatsAppTestAlert();
    setFeedback(r.ok ? { kind: 'ok', text: r.message } : { kind: 'err', text: r.message });
    setBusy('none');
    loadStatus();
  };

  const runBrief = async () => {
    setBusy('brief');
    setFeedback(null);
    const r = await sendWhatsAppLiquidityBrief();
    setFeedback(r.ok ? { kind: 'ok', text: r.message } : { kind: 'err', text: r.message });
    setBusy('none');
    loadStatus();
  };

  const alertOptions = [
    { key: 'floorBreachEnabled' as const, label: 'Cash-floor breach', desc: 'Projected cash falls below the safety floor' },
    { key: 'highRiskEnabled' as const, label: 'High liquidity risk', desc: 'Breach probability crosses the configured threshold' },
    { key: 'paymentRiskEnabled' as const, label: 'Major payment risk', desc: 'Large payment due while cash is insufficient' },
    { key: 'weeklyBriefingEnabled' as const, label: 'Weekly liquidity briefing', desc: 'Summarized liquidity position every configured period' },
  ];

  return (
    <div className="space-y-4">
      {!embedded && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className={`text-xl font-bold tracking-tight flex items-center gap-2 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              <MessageCircle className="w-5 h-5 text-emerald-500" />
              FlowShield — Liquidity Alert &amp; Briefing
            </h2>
            <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Send your verified liquidity position, forecast, and recommended action to the owner&apos;s WhatsApp.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-3 py-1 rounded-full border bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-bold">
              WhatsApp Integration
            </span>
          </div>
        </div>
      )}

      {/* Status card */}
      <div className={`p-5 rounded-2xl border ${isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`} />
              <span className={`text-sm font-semibold ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>
                {connected ? 'Connected' : 'Not configured'}
              </span>
              {!status?.enabled && status && (
                <span className="text-xs text-[#A1A1AA] font-mono">(integration disabled)</span>
              )}
            </div>
            <p className={`text-xs mt-1 ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>
              WhatsApp Cloud API — notification delivery only. The access token stays server-side.
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className={`px-3 py-1 rounded-full border ${isLight ? 'bg-[#FFFFFF] border-[#EAEAEA] text-[#666666]' : 'bg-[#111111] border-[#222222] text-[#A1A1AA]'}`}>
              Recipient: <span className="tracking-widest">••••••••••</span>
            </span>
            {!recipientConfigured && (
              <span className="text-xs text-[#EAB308] font-medium">Recipient not configured</span>
            )}
          </div>
        </div>

        {/* Automatic Alerts */}
        <div className={`mt-5 pt-4 border-t ${isLight ? 'border-[#EAEAEA]' : 'border-[#222222]'}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider font-mono">Automatic Alerts</h3>
            {busy === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8A8A8A]" />}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {alertOptions.map((opt) => (
              <label
                key={opt.key}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer select-none transition-colors ${
                  isLight ? 'bg-[#FFFFFF] border-[#EAEAEA] hover:bg-[#FAFAFA]' : 'bg-[#111111] border-[#222222] hover:bg-[#1A1A1A]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={settings[opt.key]}
                  onChange={() => toggleSetting(opt.key)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span>
                  <span className={`block text-xs font-medium ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>{opt.label}</span>
                  <span className={`block text-[11px] mt-0.5 ${isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}`}>{opt.desc}</span>
                </span>
              </label>
            ))}
          </div>

          {/* Risk threshold */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <span className={`text-xs font-medium w-40 shrink-0 ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>
              High-risk threshold
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={settings.riskThreshold}
              onChange={(e) => onRiskThreshold(Number(e.target.value))}
              className="flex-1 w-full h-2 rounded-full appearance-none cursor-pointer accent-indigo-600 bg-slate-200 dark:bg-zinc-800"
            />
            <span className={`font-mono text-sm font-bold w-14 text-right ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>
              {settings.riskThreshold}%
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-stretch sm:items-center gap-3 ${isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'}`}>
        <div className="flex-1">
          <p className={`text-xs ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>
            Sends the latest verified liquidity brief — cash position, 30/90-day forecast, breach risk, top drivers,
            and the recommended action from the Decision Impact Analysis.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <button
            onClick={runTest}
            disabled={busy !== 'none'}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer disabled:opacity-50 ${
              isLight ? 'bg-[#FFFFFF] border-[#EAEAEA] text-[#171717] hover:bg-[#FAFAFA]' : 'bg-[#111111] border-[#222222] text-[#EDEDED] hover:bg-[#1A1A1A]'
            }`}
          >
            {busy === 'test' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send Test Alert
          </button>
          <button
            onClick={runBrief}
            disabled={busy !== 'none'}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#171717] text-white hover:opacity-90 dark:bg-[#EDEDED] dark:text-black transition-colors cursor-pointer disabled:opacity-50"
          >
            {busy === 'brief' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
            Send Latest Liquidity Brief
          </button>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs font-medium ${
          feedback.kind === 'ok'
            ? isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
            : isLight ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
        }`}>
          {feedback.kind === 'ok'
            ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            : <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />}
          <span>{feedback.text}</span>
        </div>
      )}
    </div>
  );
};

export const LiquidityNotificationsPanel: React.FC<PanelProps> = (props) => (
  <LiquidityNotificationsPanelInner {...props} />
);

export const LiquidityAlertAndBriefingView: React.FC = () => {
  return (
    <div className="space-y-6 font-sans max-w-4xl mx-auto">
      <LiquidityNotificationsPanelInner embedded={false} />
    </div>
  );
};
