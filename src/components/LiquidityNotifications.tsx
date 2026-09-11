import React, { useEffect, useState } from 'react';
import { Bell, Phone, ShieldCheck, AlertTriangle, MessageCircle, Send, Settings, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const LiquidityAlertAndBriefingView: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sendingTest, setSendingTest] = useState(false);
  const [sendingBrief, setSendingBrief] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showConfig, setShowConfig] = useState(false);
  const [token, setToken] = useState('');
  const [phoneId, setPhoneId] = useState('');
  const [recipient, setRecipient] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/notifications/telegram/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch Telegram status', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/notifications/telegram/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim() || undefined,
          phoneId: phoneId.trim() || undefined,
          recipientPhone: recipient.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Telegram configuration saved.');
        setShowConfig(false);
        setToken(''); setPhoneId(''); setRecipient('');
        fetchStatus();
      } else {
        setError(data.error || 'Failed to save configuration.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSendTest = async () => {
    setSendingTest(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/notifications/telegram/test', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Test message sent successfully.');
      } else {
        setError(data.error || 'Failed to send test message.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setSendingTest(false);
    }
  };

  const handleSendBrief = async () => {
    setSendingBrief(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/notifications/telegram/send', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Liquidity brief sent successfully.');
      } else {
        setError(data.error || 'Failed to send liquidity brief.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setSendingBrief(false);
    }
  };

  const updateThreshold = async (val: number) => {
    if (!status?.settings) return;
    setStatus({ ...status, settings: { ...status.settings, riskThreshold: val } });
    try {
      await fetch('/api/notifications/telegram/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riskThreshold: val }),
      });
    } catch (e) {}
  };

  if (loading) {
    return <div className="p-8 text-center text-sm font-mono animate-pulse">Loading integration status...</div>;
  }

  const isConfigured = status?.configured;
  const isRecipientConfigured = status?.recipientConfigured;
  const riskThreshold = status?.settings?.riskThreshold ?? 25;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className={`p-2 rounded-lg ${isLight ? 'bg-green-100 text-green-600' : 'bg-green-500/10 text-green-400'}`}>
          <MessageCircle className="w-6 h-6" />
        </div>
        <div>
          <h2 className={`text-xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            FlowShield — Liquidity Alert & Briefing
          </h2>
          <p className={`text-sm mt-1 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
            Send your verified liquidity position, forecast, and recommended action to the owner's Telegram.
          </p>
        </div>
      </div>

      {(error || successMsg) && (
        <div className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${
          error 
            ? isLight ? 'bg-red-50 border-red-200 text-red-700' : 'bg-red-500/10 border-red-500/20 text-red-400'
            : isLight ? 'bg-green-50 border-green-200 text-green-700' : 'bg-green-500/10 border-green-500/20 text-green-400'
        }`}>
          {error ? <AlertTriangle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
          <div className="pt-0.5">{error || successMsg}</div>
          <button 
            onClick={() => { setError(''); setSuccessMsg(''); }}
            className="ml-auto opacity-70 hover:opacity-100"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className={`border rounded-2xl overflow-hidden ${isLight ? 'bg-white border-slate-200' : 'bg-[#0A0A0A] border-[#222222]'}`}>
        
        {/* Status Header */}
        <div className={`p-6 border-b ${isLight ? 'border-slate-100' : 'border-[#222222]'}`}>
          <div className="flex items-start justify-between">
            <div className="flex gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                isConfigured ? 'bg-[#25D366]/10 text-[#25D366]' : isLight ? 'bg-slate-100 text-slate-400' : 'bg-[#1A1A1A] text-[#555555]'
              }`}>
                <Send className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`font-semibold text-lg ${isLight ? 'text-slate-900' : 'text-white'}`}>Telegram Integration</h3>
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                    isConfigured 
                      ? 'bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20' 
                      : isLight ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-[#222222] text-[#A1A1AA] border border-[#333]'
                  }`}>
                    {isConfigured ? 'Active' : 'Not configured'}
                  </span>
                </div>
                <p className={`text-sm mt-1 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Telegram Cloud API — notification delivery only. The access token stays server-side.
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShowConfig(!showConfig)}
              className={`shrink-0 text-xs font-medium px-3 py-2 rounded-md border transition-colors ${
                isLight ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200' : 'bg-[#111111] hover:bg-[#1A1A1A] text-[#EDEDED] border-[#333]'
              }`}
            >
              {showConfig ? 'Cancel' : 'Configure Credentials'}
            </button>
          </div>

          <div 
            className={`grid transition-all duration-300 ease-in-out ${
              showConfig ? 'grid-rows-[1fr] opacity-100 mt-6' : 'grid-rows-[0fr] opacity-0 mt-0'
            }`}
          >
            <div className="overflow-hidden">
              <div className={`p-5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#111] border-[#222]'}`}>
                <div className="grid gap-4">
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-600' : 'text-[#A1A1AA]'}`}>Telegram Bot Token</label>
                    <input 
                      type="password" value={token} onChange={(e) => setToken(e.target.value)}
                      placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                      className={`w-full p-2.5 text-sm rounded-lg border outline-none font-mono transition-colors focus:border-indigo-500 ${
                        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0A0A0A] border-[#333] text-white'
                      }`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-600' : 'text-[#A1A1AA]'}`}>Chat ID</label>
                      <input 
                        type="text" value={phoneId} onChange={(e) => setPhoneId(e.target.value)}
                        placeholder="1234567890"
                        className={`w-full p-2.5 text-sm rounded-lg border outline-none font-mono transition-colors focus:border-indigo-500 ${
                          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0A0A0A] border-[#333] text-white'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-600' : 'text-[#A1A1AA]'}`}>Recipient Phone</label>
                      <input 
                        type="text" value={recipient} onChange={(e) => setRecipient(e.target.value)}
                        placeholder="15551234567"
                        className={`w-full p-2.5 text-sm rounded-lg border outline-none font-mono transition-colors focus:border-indigo-500 ${
                          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0A0A0A] border-[#333] text-white'
                        }`}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end mt-2">
                    <button 
                      onClick={handleSaveConfig}
                      disabled={savingConfig}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all ${savingConfig ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {savingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      Save Credentials Securely
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recipient & Triggers */}
        <div className={`p-6 border-b grid md:grid-cols-2 gap-8 ${isLight ? 'border-slate-100' : 'border-[#222222]'}`}>
          <div className="space-y-4">
            <h4 className={`text-xs font-mono font-medium uppercase tracking-wider ${isLight ? 'text-slate-400' : 'text-[#71717A]'}`}>
              Delivery Target
            </h4>
            <div className={`p-4 rounded-xl border flex items-center gap-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#111111] border-[#222222]'}`}>
              <ShieldCheck className={`w-5 h-5 ${isRecipientConfigured ? 'text-[#22C55E]' : isLight ? 'text-slate-400' : 'text-[#555]'}`} />
              <div className="flex-1">
                <div className={`text-sm font-medium ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Recipient: {isRecipientConfigured ? '••••••••••' : 'Not configured'}
                </div>
                <div className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                  Owner / CFO Primary Contact
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className={`text-xs font-mono font-medium uppercase tracking-wider ${isLight ? 'text-slate-400' : 'text-[#71717A]'}`}>
                Automatic Alerts
              </h4>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm mb-3">
                <span className={isLight ? 'text-slate-700 font-medium' : 'text-[#EDEDED] font-medium'}>High-risk threshold</span>
                <span className={`font-mono font-bold px-2.5 py-0.5 rounded-md ${
                  isLight ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-500/10 text-indigo-400'
                }`}>
                  {riskThreshold}%
                </span>
              </div>
              <div className="relative flex items-center h-5">
                <input 
                  type="range" 
                  min="0" max="100" step="5"
                  value={riskThreshold}
                  onChange={(e) => updateThreshold(parseInt(e.target.value))}
                  className={`w-full h-1.5 appearance-none rounded-full cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/40 focus:ring-offset-2 ${isLight ? 'focus:ring-offset-white' : 'focus:ring-offset-[#111]'}
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:hover:scale-125 [&::-webkit-slider-thumb]:transition-transform
                  [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-indigo-600 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:hover:scale-125 [&::-moz-range-thumb]:transition-transform`}
                  style={{
                    background: `linear-gradient(to right, #4f46e5 ${riskThreshold}%, ${isLight ? '#e2e8f0' : '#333333'} ${riskThreshold}%)`
                  }}
                />
              </div>
              <div className={`text-xs mt-3 leading-relaxed ${isLight ? 'text-slate-500' : 'text-[#A1A1AA]'}`}>
                Sends the latest verified liquidity brief — cash position, 30/90-day forecast, breach risk, top drivers, and the recommended action from the Decision Impact Analysis.
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={`p-6 flex flex-wrap gap-4 justify-end border-t ${isLight ? 'bg-slate-50 border-slate-100' : 'bg-[#0A0A0A] border-[#222]'}`}>
          <button
            onClick={handleSendTest}
            disabled={sendingTest || !isConfigured}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all border ${
              isLight 
                ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' 
                : 'bg-[#111111] border-[#333333] text-[#EDEDED] hover:bg-[#1A1A1A]'
            } ${(sendingTest || !isConfigured) ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'}`}
          >
            {sendingTest ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
            Send Test Alert
          </button>

          <button
            onClick={handleSendBrief}
            disabled={sendingBrief || !isConfigured}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              'bg-[#25D366] text-white hover:bg-[#20bd5a] border border-[#1DA851] shadow-sm shadow-[#25D366]/20'
            } ${(sendingBrief || !isConfigured) ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'}`}
          >
            {sendingBrief ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send Latest Liquidity Brief
          </button>
        </div>
      </div>
    </div>
  );
};
