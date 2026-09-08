import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  User,
  Trash2,
  Copy,
  Check,
  Volume2,
  VolumeX,
  RefreshCw,
  TrendingDown,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  recommendedAction?: string;
}

interface ChatbotViewProps {
  simulationResult: any;
  cashFloor: number;
  supplierDelayDays: number;
  onNavigateToTab?: (tab: string) => void;
}

export const ChatbotView: React.FC<ChatbotViewProps> = ({
  simulationResult,
  cashFloor,
  supplierDelayDays,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Extract financial metrics for AI prompt context
  const currentCash = simulationResult?.dailyPoints?.[0]?.cash || 2500000;
  const minCash = simulationResult?.minCash || 450000;
  const earliestBreachDate = simulationResult?.earliestBreachDate || 'Oct 14, 2026';
  const hasBreach = simulationResult?.hasBreach ?? true;
  const breachProbability = simulationResult?.breachProbability ?? 84;
  const dso = simulationResult?.diagnostics?.dso ?? 42;
  const dio = simulationResult?.diagnostics?.dio ?? 58;
  const dpo = simulationResult?.diagnostics?.dpo ?? 30;
  const ccc = simulationResult?.diagnostics?.ccc ?? 70;

  // Format currency helper
  const formatLakhs = (amount: number) => {
    return `₹${(amount / 100000).toFixed(2)}L`;
  };

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

  const renderFormattedMessage = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      let isBullet = false;
      let cleanLine = line;

      if (cleanLine.trim().startsWith('•')) {
        isBullet = true;
        cleanLine = cleanLine.trim().replace(/^•\s*/, '');
      }

      const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
      const lineContent = parts.map((part, partIdx) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
          return (
            <strong key={partIdx} className="font-semibold text-inherit">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      return (
        <React.Fragment key={lineIdx}>
          {isBullet ? (
            <span className="flex items-start gap-2 my-0.5">
              <span className="text-indigo-500 font-bold shrink-0 mt-0.5">•</span>
              <span>{lineContent}</span>
            </span>
          ) : (
            lineContent
          )}
          {lineIdx < lines.length - 1 && !isBullet && <br />}
        </React.Fragment>
      );
    });
  };

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const initialGreeting: Message = {
        id: 'msg-welcome',
        sender: 'ai',
        text: `Hello! I am your FlowShield AI Financial Advisor. I have analyzed your 90-day liquidity simulation, ERP ledger transactions, and Working Capital metrics.

**Current Financial Context:**
• **Cleared Cash:** ${formatLakhs(currentCash)}
• **Cash Floor Threshold:** ${formatLakhs(cashFloor)}
• **Breach Risk:** ${breachProbability}% probability (Earliest: ${earliestBreachDate})
• **Cash Conversion Cycle (CCC):** ${ccc} days

How can I assist you with your cash flow strategy today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([initialGreeting]);
    }
  }, []);

  const handleSendQuery = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setLoading(true);

    try {
      const geminiKey = localStorage.getItem('gemini_api_key') || '';
      const groqKey = localStorage.getItem('groq_api_key') || '';
      const openRouterKey = localStorage.getItem('openrouter_api_key') || '';
      const storedKey = localStorage.getItem('flowshield_api_key') || '';
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          verifiedData,
          history: messages.map((m) => ({ role: m.sender, content: m.text })),
          geminiKey,
          groqKey,
          openRouterKey,
          apiKey: storedKey,
        }),
      });

      const data = await res.json();
      const aiReply = data.explanation || 'No response generated.';

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recommendedAction: data.noApiKey ? undefined : data.recommendedAction,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const fallbackMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: `API Key Required: No AI API key is configured. Please integrate your Groq, Gemini, or OpenRouter API key in Platform Settings to enable AI responses.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeakText = (id: string, text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*#]/g, ''));
    utterance.rate = 1.0;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `msg-reset-${Date.now()}`,
        sender: 'ai',
        text: `Chat thread reset. I'm ready to answer any questions regarding your liquidity forecasts, supplier shocks, or working capital diagnostics!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className={`p-6 rounded-2xl border backdrop-blur-xl relative overflow-hidden ${
        isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#0A0A0A] border-[#222222] text-white shadow-xl'
      }`}>
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-mono tracking-tight">FlowShield Financial Intelligence Assistant</h1>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  isLight ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                }`}>
                  Grounded LLM + Simulation Engine
                </span>
              </div>
              <p className={`text-xs font-mono mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Ask conversational questions about your cash forecasts, supplier shocks, and scenario options
              </p>
            </div>
          </div>

          {/* Quick Stats Widget */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className={`px-3 py-2 rounded-xl border text-center flex-1 md:flex-initial ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'
            }`}>
              <div className={`text-[10px] font-mono uppercase ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>Current Cash</div>
              <div className="text-xs font-bold font-mono text-emerald-500">{formatLakhs(currentCash)}</div>
            </div>
            <div className={`px-3 py-2 rounded-xl border text-center flex-1 md:flex-initial ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'
            }`}>
              <div className={`text-[10px] font-mono uppercase ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>Min Cash</div>
              <div className={`text-xs font-bold font-mono ${hasBreach ? 'text-red-500' : 'text-emerald-500'}`}>
                {formatLakhs(minCash)}
              </div>
            </div>
            <div className={`px-3 py-2 rounded-xl border text-center flex-1 md:flex-initial ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'
            }`}>
              <div className={`text-[10px] font-mono uppercase ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>Breach Prob.</div>
              <div className="text-xs font-bold font-mono text-amber-500">{breachProbability}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Integrate Your AI Keys Banner */}
      {!localStorage.getItem('flowshield_api_key') && !localStorage.getItem('groq_api_key') && !localStorage.getItem('gemini_api_key') && (
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isLight ? 'bg-amber-50/80 border-amber-200 text-amber-900' : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h3 className="text-xs font-bold font-mono">Integrate Your AI API Keys</h3>
              <p className="text-[11px] opacity-90 mt-0.5">
                Add your Groq or Gemini API key in Platform Settings to unlock live conversational LLM analysis.
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

      {/* Main Chat Layout */}
      <div className={`rounded-2xl border flex flex-col h-[650px] overflow-hidden ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0A0A0A] border-[#222222] shadow-xl'
      }`}>
        {/* Chat Control Toolbar */}
        <div className={`px-5 py-3 border-b flex items-center justify-between text-xs ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-400'
        }`}>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>AI Reasoning Session • Active</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearChat}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors text-[11px] font-mono cursor-pointer ${
                isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Chat</span>
            </button>
          </div>
        </div>

        {/* Message History Feed */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 font-sans">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white font-mono text-xs shadow-md ${
                  isUser ? 'bg-blue-600' : 'bg-indigo-600'
                }`}>
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Bubble Container */}
                <div className="space-y-1.5 flex-1">
                  <div className={`p-4 rounded-2xl text-xs leading-relaxed space-y-2 relative group ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : isLight
                        ? 'bg-slate-100 text-slate-800 border border-slate-200 rounded-tl-none'
                        : 'bg-zinc-900 text-zinc-100 border border-zinc-800 rounded-tl-none'
                  }`}>
                    <div className="whitespace-pre-wrap">{renderFormattedMessage(msg.text)}</div>

                    {/* Recommended Action Badge */}
                    {msg.recommendedAction && !msg.text.startsWith('API Key Required') && !msg.text.startsWith('AI Provider Request Failed') && (
                      <div className={`mt-3 p-2.5 rounded-xl border flex items-start gap-2 text-[11px] font-mono ${
                        isLight
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      }`}>
                        <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
                        <div>
                          <span className="font-bold uppercase tracking-wider block text-[10px]">Action Plan:</span>
                          <span>{msg.recommendedAction}</span>
                        </div>
                      </div>
                    )}

                    {/* Copy & Speech Buttons for AI messages */}
                    {!isUser && (
                      <div className={`flex items-center gap-1.5 pt-2 border-t mt-2 ${
                        isLight ? 'border-slate-200/80 text-slate-400' : 'border-zinc-800 text-zinc-500'
                      }`}>
                        <button
                          onClick={() => handleCopyText(msg.id, msg.text)}
                          className={`p-1 rounded hover:bg-black/5 transition-colors cursor-pointer text-[10px] flex items-center gap-1 ${
                            copiedId === msg.id ? 'text-emerald-500' : ''
                          }`}
                        >
                          {copiedId === msg.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                        </button>

                        <button
                          onClick={() => handleSpeakText(msg.id, msg.text)}
                          className={`p-1 rounded hover:bg-black/5 transition-colors cursor-pointer text-[10px] flex items-center gap-1 ${
                            speakingId === msg.id ? 'text-indigo-400 font-bold' : ''
                          }`}
                        >
                          {speakingId === msg.id ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                          <span>{speakingId === msg.id ? 'Stop' : 'Listen'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className={`text-[10px] font-mono ${
                    isUser ? 'text-right' : 'text-left'
                  } ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex gap-3 mr-auto max-w-[85%]">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-md">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className={`p-4 rounded-2xl text-xs rounded-tl-none flex items-center gap-2 border ${
                isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
              }`}>
                <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                <span className="font-mono text-[11px]">Analyzing liquidity risk engine scenarios &amp; preparing response...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className={`p-4 border-t ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0A0A0A] border-[#222222]'
        }`}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuery();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask FlowShield AI anything about your cash flow, risk drivers, or scenario strategy..."
              className={`flex-1 border rounded-xl px-4 py-3 text-xs font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  : 'bg-zinc-900/80 border-zinc-800 text-white placeholder-zinc-500'
              }`}
            />

            <button
              type="submit"
              disabled={loading || !inputQuery.trim()}
              className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-indigo-500/20 active:scale-[0.98]"
            >
              {loading ? (
                <Sparkles className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
