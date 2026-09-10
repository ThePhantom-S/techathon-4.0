import React from 'react';
import { Database, Building2, Upload, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface EmptyStateViewProps {
  title?: string;
  description?: string;
  onOpenConnector?: () => void;
  onOpenCsvUpload?: () => void;
  onLoadSampleData?: () => void;
}

export const EmptyStateView: React.FC<EmptyStateViewProps> = ({
  title = 'No Live Financial Records Found',
  description = 'To view simulations, cash runway forecasts, and stress tests for your business, connect your live accounting books or upload a ledger CSV.',
  onOpenConnector,
  onOpenCsvUpload,
  onLoadSampleData,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className="space-y-6 font-sans py-4">
      {/* Empty State Card */}
      <div
        className={`p-8 md:p-12 rounded-2xl border text-center relative overflow-hidden transition-all duration-200 ${
          isLight
            ? 'bg-white border-slate-200 shadow-xs'
            : 'bg-[#0A0A0A] border-zinc-800'
        }`}
      >
        <div className="max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 mx-auto flex items-center justify-center shadow-xs">
            <Database className="w-7 h-7" />
          </div>

          <div>
            <h2 className={`text-2xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {title}
            </h2>
            <p className={`text-sm mt-2 leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              {description}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {onOpenConnector && (
              <button
                onClick={onOpenConnector}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all cursor-pointer flex items-center gap-2 shadow-xs active:scale-95"
              >
                <Building2 className="w-4 h-4" />
                Connect Accounting (Zoho / QuickBooks)
              </button>
            )}
            {onOpenCsvUpload && (
              <button
                onClick={onOpenCsvUpload}
                className={`px-4 py-2.5 rounded-xl border font-semibold text-xs transition-all cursor-pointer flex items-center gap-2 active:scale-95 ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
                    : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
                }`}
              >
                <Upload className="w-4 h-4" />
                Upload CSV Ledger
              </button>
            )}
            {onLoadSampleData && (
              <button
                onClick={onLoadSampleData}
                className={`px-3 py-2.5 rounded-xl border text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 opacity-70 hover:opacity-100 ${
                  isLight
                    ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900'
                }`}
                title="Load demo scenario for testing purposes"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Test Drive Demo Data
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
