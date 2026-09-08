import React, { useState } from 'react';
import { Bot, Send, Sparkles, Zap, MessageSquare, ArrowRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface AskCashShockBarProps {
  onSendQuery: (query: string) => void;
  onSelectPrompt: (prompt: string) => void;
  isLoading?: boolean;
}

export const AskCashShockBar: React.FC<AskCashShockBarProps> = ({
  onSendQuery,
  onSelectPrompt,
  isLoading,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [inputQuery, setInputQuery] = useState('');

  const samplePrompts = [
    'Why is my cash falling?',
    'What happens if supplier is delayed by 20 days?',
    'Which decision is safest?',
    'Can I afford this order?',
    'How much cash will I need next month?',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim()) return;
    onSendQuery(inputQuery);
    setInputQuery('');
  };

  return (
    <div className={`border rounded-2xl p-5 backdrop-blur-xl shadow-xl space-y-4 ${
      isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-white/5 border-white/10 text-white shadow-2xl'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-500">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`text-xs font-bold font-mono uppercase tracking-widest flex items-center gap-2 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              ASK FLOW SHIELD AI
            </h3>
            <p className={`text-[11px] font-mono mt-0.5 ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
              Natural language financial intelligence query (Grounded strictly in deterministic calculation)
            </p>
          </div>
        </div>

        <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded border ${
          isLight
            ? 'bg-indigo-50 text-indigo-800 border-indigo-200 font-bold'
            : 'text-indigo-300 bg-indigo-500/15 border-indigo-500/30'
        }`}>
          Gemini 3.7 Server Engine
        </span>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="e.g. Can I afford this order? What happens if supplier delay is 20 days?"
          className={`w-full border rounded-xl pl-4 pr-12 py-3 text-xs font-sans focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all ${
            isLight
              ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
              : 'bg-black/50 border-white/15 text-white placeholder-white/30'
          }`}
        />
        <button
          type="submit"
          disabled={isLoading || !inputQuery.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white p-2 rounded-lg transition-all cursor-pointer shadow-sm"
        >
          {isLoading ? (
            <Sparkles className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>

      {/* Quick Clickable Prompts */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className={`text-[10px] font-mono uppercase ${isLight ? 'text-slate-400' : 'text-white/40'}`}>Suggested:</span>
        {samplePrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSelectPrompt(prompt)}
            className={`text-[11px] font-mono border px-3 py-1 rounded-lg transition-all cursor-pointer ${
              isLight
                ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200'
                : 'text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/30'
            }`}
          >
            "{prompt}"
          </button>
        ))}
      </div>
    </div>
  );
};
