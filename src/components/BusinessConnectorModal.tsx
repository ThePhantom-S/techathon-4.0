import React, { useState, useCallback } from 'react';
import {
  Building2,
  Zap,
  X,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { ZohoBooksConnector } from './ZohoBooksConnector';
import { QuickBooksConnector } from './QuickBooksConnector';
import { useTheme } from '../context/ThemeContext';

interface BusinessConnectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected: () => void;
  isConnected: boolean;
  initialView?: ViewMode;
  onDataImported?: (data: {
    transactions: any[];
    payables: any[];
    expenses: any[];
    currentCash: number;
  }) => void;
}

export type ViewMode = 'SELECT' | 'ZOHO' | 'QUICKBOOKS' | 'SANDBOX_CONNECTING' | 'SANDBOX_SUCCESS' | 'SANDBOX_ERROR';

export const BusinessConnectorModal: React.FC<BusinessConnectorModalProps> = ({
  isOpen,
  onClose,
  onConnected,
  isConnected,
  initialView = 'SELECT',
  onDataImported,
}) => {
  const [view, setView] = useState<ViewMode>(initialView);

  React.useEffect(() => {
    if (isOpen && initialView) {
      setView(initialView);
    }
  }, [isOpen, initialView]);

  const [sandboxError, setSandboxError] = useState('');
  const [sandboxLoading, setSandboxLoading] = useState('');

  const { theme } = useTheme();
  const isLight = theme === 'light';

  const handleSandboxConnect = useCallback(async () => {
    setView('SANDBOX_CONNECTING');
    setSandboxLoading('Generating synthetic sandbox SME transactions...');
    setSandboxError('');

    try {
      const response = await fetch('/api/connect/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to reset to demo dataset.');
      }

      const data = await response.json();

      if (onDataImported) {
        onDataImported({
          transactions: data.transactions || [],
          payables: data.payables || [],
          expenses: data.expenses || [],
          currentCash: data.currentCash,
        });
      }

      setView('SANDBOX_SUCCESS');
      onConnected();
    } catch (e: any) {
      setSandboxError(e.message || 'An unexpected error occurred.');
      setView('SANDBOX_ERROR');
    }
  }, [onDataImported, onConnected]);

  const handleProviderConnected = useCallback(() => {
    // Provider connectors handle their own success states
    // This callback is for the parent to know data was imported
    onConnected();
  }, [onConnected]);

  if (!isOpen) return null;

  // Route to Zoho connector
  if (view === 'ZOHO') {
    return (
      <ZohoBooksConnector
        onBack={() => setView('SELECT')}
        onConnected={(data) => {
          if (onDataImported) onDataImported(data);
          handleProviderConnected();
        }}
      />
    );
  }

  // Route to QuickBooks connector
  if (view === 'QUICKBOOKS') {
    return (
      <QuickBooksConnector
        onBack={() => setView('SELECT')}
        onConnected={(data) => {
          if (onDataImported) onDataImported(data);
          handleProviderConnected();
        }}
      />
    );
  }

  // Sandbox connecting state
  if (view === 'SANDBOX_CONNECTING') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
        <div className={`rounded-2xl max-w-md w-full p-8 text-center space-y-6 shadow-2xl border ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0c0c12] border-white/15'
        }`}>
          <div className="relative mx-auto w-16 h-16">
            <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <Zap className="w-6 h-6 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <div>
            <h3 className={`text-sm font-bold font-mono uppercase tracking-widest ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              Initializing Sandbox
            </h3>
            <p className="text-xs text-indigo-500 font-mono mt-2 animate-pulse">{sandboxLoading}</p>
          </div>
        </div>
      </div>
    );
  }

  // Sandbox error
  if (view === 'SANDBOX_ERROR') {
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
              Sandbox Failed
            </h3>
            <p className={`text-xs font-mono p-3 rounded-lg ${
              isLight ? 'text-red-700 bg-red-50 border border-red-200' : 'text-red-400 bg-red-500/15 border border-red-500/30'
            }`}>
              {sandboxError}
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => setView('SELECT')}
              className={`px-4 py-2 rounded-xl font-mono text-xs border transition-colors cursor-pointer ${
                isLight
                  ? 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  : 'border-white/10 text-white/70 hover:bg-white/5'
              }`}
            >
              Try Again
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold font-mono text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Sandbox success
  if (view === 'SANDBOX_SUCCESS') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
        <div className={`rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0c0c12] border-white/15'
        }`}>
          <div className="text-center space-y-3">
            <div className="w-14 h-14 bg-indigo-500/20 border border-indigo-500/40 rounded-full flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(99,102,241,0.3)]">
              <CheckCircle2 className="w-7 h-7 text-indigo-500" />
            </div>
            <h3 className={`text-lg font-bold font-mono uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Sandbox Dataset Loaded
            </h3>
            <div className="flex flex-col items-center gap-1.5 text-xs font-mono">
              <span className="text-indigo-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" /> Shakti Electronics baseline restored
              </span>
              <span className="text-indigo-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" /> 4 invoices, 5 bills loaded
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold font-mono text-xs uppercase tracking-wider cursor-pointer"
          >
            Return to Forecast Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER: SELECT PROVIDER (main modal)
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 relative space-y-5 border shadow-2xl cursor-default ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0c0c12] border-white/15'
        }`}
      >
        {/* Header */}
        <div className={`flex justify-between items-start border-b pb-4 ${
          isLight ? 'border-slate-200' : 'border-white/10'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className={`text-lg font-bold uppercase tracking-tight ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                Connect Business Data
              </h2>
              <p className={`text-xs font-mono mt-0.5 ${
                isLight ? 'text-slate-500' : 'text-white/50'
              }`}>
                Consent-authorized, read-only financial API integrations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-white/40 hover:text-white hover:bg-white/10'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Connection Target */}
        <div className={`rounded-xl p-4 flex items-center gap-3 text-xs border ${
          isLight
            ? 'bg-slate-50 border-slate-200 text-slate-700'
            : 'bg-white/5 border-white/10 text-white/80'
        }`}>
          <Building2 className={`w-5 h-5 shrink-0 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`} />
          <div>
            <span className="font-bold">Target Integration: </span>
            <span className="text-indigo-500 font-mono font-bold">Live ERP &amp; Bank Sync</span>
            <p className={`text-[11px] mt-0.5 font-mono ${
              isLight ? 'text-slate-500' : 'text-white/50'
            }`}>
              Input accounting credentials to pull live unpaid invoices, pending bills, and current cash balances.
            </p>
          </div>
        </div>

        {/* Provider Options */}
        <div className="space-y-3">
          <h3 className={`text-xs font-bold uppercase font-mono tracking-wider ${
            isLight ? 'text-slate-500' : 'text-white/60'
          }`}>
            Select Accounting Platform / Source
          </h3>

          {/* Zoho Books */}
          <div
            onClick={() => setView('ZOHO')}
            className={`rounded-xl p-4 border transition-all duration-150 cursor-pointer hover:border-orange-500/60 active:scale-[0.99] ${
              isLight ? 'border-slate-200 bg-slate-50 hover:bg-orange-50/50' : 'border-white/15 bg-white/5 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-500 font-black text-sm">
                  Z
                </div>
                <div>
                  <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Zoho Books Connector
                  </div>
                  <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
                    For Zoho India organization accounts
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setView('ZOHO');
                }}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold font-mono text-[10px] uppercase cursor-pointer transition-colors shadow-sm"
              >
                Configure
              </button>
            </div>
          </div>

          {/* QuickBooks Online */}
          <div
            onClick={() => setView('QUICKBOOKS')}
            className={`rounded-xl p-4 border transition-all duration-150 cursor-pointer hover:border-emerald-500/60 active:scale-[0.99] ${
              isLight ? 'border-slate-200 bg-slate-50 hover:bg-emerald-50/50' : 'border-white/15 bg-white/5 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 font-black text-sm">
                  Q
                </div>
                <div>
                  <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    QuickBooks Online
                  </div>
                  <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
                    For QuickBooks accounts (Sandbox or Production)
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setView('QUICKBOOKS');
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold font-mono text-[10px] uppercase cursor-pointer transition-colors shadow-sm"
              >
                Configure
              </button>
            </div>
          </div>

          {/* Sandbox */}
          <div
            onClick={handleSandboxConnect}
            className={`rounded-xl p-4 flex items-center justify-between border transition-all duration-150 cursor-pointer hover:border-indigo-500/60 active:scale-[0.99] ${
              isLight ? 'border-slate-200 bg-slate-50 hover:bg-indigo-50/50' : 'border-white/15 bg-white/5 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-500 font-black text-sm">
                S
              </div>
              <div>
                <div className={`text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Sandbox Demonstration Mode
                </div>
                <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
                  Reset Shakti Electronics dataset
                </div>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSandboxConnect();
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold font-mono text-[10px] uppercase cursor-pointer transition-colors shadow-sm"
            >
              Select
            </button>
          </div>
        </div>

        {/* Status indicator */}
        {isConnected && (
          <div className={`flex items-center gap-2 text-xs font-mono p-3 rounded-xl border ${
            isLight
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>Currently connected. Selecting a new source will replace existing data.</span>
          </div>
        )}
      </div>
    </div>
  );
};
