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
  TrendingDown,
  AlertTriangle,
  ShieldCheck,
  X,
  Maximize2,
  Minimize2,
  Brain,
  Zap,
  Lock,
  Key,
} from 'lucide-react';
import { formatINR } from '../engine/calculator';
import { useTheme } from '../context/ThemeContext';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  recommendedAction?: string;
}

interface ChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
  simulationResult: any;
  cashFloor: number;
  supplierDelayDays: number;
  industryName?: string;
  industryId?: string;
  businessName?: string;
}

export const ChatbotModal: React.FC<ChatbotModalProps> = ({
  isOpen,
  onClose,
  simulationResult,
  cashFloor,
  supplierDelayDays,
  industryName = 'General SME',
  industryId = 'manufacturing',
  businessName = 'Your Business',
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasServerKey, setHasServerKey] = useState<boolean | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        const hasKey = !!(data.providers?.groq || data.providers?.gemini || data.providers?.openrouter);
        setHasServerKey(hasKey);
      })
      .catch(() => setHasServerKey(false));
  }, [isOpen]);

  const hasLocalKey = !!(
    localStorage.getItem('gemini_api_key') ||
    localStorage.getItem('groq_api_key') ||
    localStorage.getItem('openrouter_api_key')
  );

  const isAiConfigured = hasLocalKey || !!hasServerKey;

  // Extract verified financial metrics dynamically from simulationResult
  const currentCash = simulationResult?.currentCash ?? simulationResult?.dailyPoints?.[0]?.cash ?? 0;
  const minCash = simulationResult?.minProjectedCash ?? simulationResult?.minCash ?? 0;
  const earliestBreachDate = simulationResult?.earliestBreachDate || 'None projected';
  const hasBreach = simulationResult?.hasBreach ?? false;
  const breachProbability = simulationResult?.breachProbability ?? 0;
  const dso = simulationResult?.workingCapital?.dso ?? simulationResult?.diagnostics?.dso ?? 0;
  const dio = simulationResult?.workingCapital?.dio ?? simulationResult?.diagnostics?.dio ?? 0;
  const dpo = simulationResult?.workingCapital?.dpo ?? simulationResult?.diagnostics?.dpo ?? 0;
  const ccc = simulationResult?.workingCapital?.ccc ?? simulationResult?.diagnostics?.ccc ?? 0;

  const topOutflow = simulationResult?.driverAnalysis?.topOutflows?.[0]
    ? `${simulationResult.driverAnalysis.topOutflows[0].entity} (${formatINR(simulationResult.driverAnalysis.topOutflows[0].amount)})`
    : 'None';
  const topInflow = simulationResult?.driverAnalysis?.topInflows?.[0]
    ? `${simulationResult.driverAnalysis.topInflows[0].customer || simulationResult.driverAnalysis.topInflows[0].entity} (${formatINR(simulationResult.driverAnalysis.topInflows[0].amount)})`
    : 'None';
  const counterfactuals = simulationResult?.counterfactuals?.length
    ? simulationResult.counterfactuals.map((cf: any, i: number) => `${i + 1}. ${cf.strategyName} -> Min Cash: ${formatINR(cf.minProjectedCash)} (${cf.hasBreach ? 'Breaches floor' : 'Safe margin'})`).join('\n')
    : 'None active';

  const formatLakhs = (amount: number) => `₹${(amount / 100000).toFixed(2)}L`;

  const verifiedData = {
    businessName,
    industryId,
    industryName,
    currentCash: formatLakhs(currentCash),
    minProjectedCash: formatLakhs(minCash),
    cashFloor: formatLakhs(cashFloor),
    earliestBreachDate,
    supplierDelay: supplierDelayDays,
    breachProbability: `${breachProbability}%`,
    topOutflow,
    topInflow,
    counterfactuals,
    dso: `${dso} days`,
    dio: `${dio} days`,
    dpo: `${dpo} days`,
    ccc: `${ccc} days`,
  };

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, isOpen]);

  // Initial welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const initialGreeting: Message = {
        id: 'msg-welcome',
        sender: 'ai',
        text: isAiConfigured
          ? `Hello! I'm your **FlowShield AI Financial Advisor** for **${businessName}**.

**Your Verified Financial Snapshot:**
• **Current Cash:** ${formatLakhs(currentCash)}
• **Safety Floor:** ${formatLakhs(cashFloor)}
• **Breach Risk:** ${breachProbability}% probability
• **Cash Conversion Cycle (CCC):** ${ccc} days

I can answer questions regarding your liquidity risk, driver analysis, or counterfactual strategies grounded strictly in verified engine numbers. What would you like to explore?`
          : `**FlowShield AI Chat is currently locked.**

No active AI API key was found in your environment (.env) or Settings. To prevent simulated or ungrounded responses, chat capabilities are restricted until an API key is connected.

**To unlock FlowShield AI:**
• Open Platform **Settings > Integrations**
• Provide your **GEMINI_API_KEY**, **GROQ_API_KEY**, or **OPENROUTER_API_KEY**
• Click **Save Changes**

Once an API key is connected, conversational AI insights will be unlocked.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([initialGreeting]);
    }
  }, [isOpen, isAiConfigured]);

  const renderFormattedMessage = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      let isBullet = false;
      let cleanLine = line;

      if (cleanLine.trim().startsWith('•')) {
        isBullet = true;
        cleanLine = cleanLine.trim().replace(/^•\s*/, '');
      }

      // Handle bold markdown
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

  if (!isOpen) return null;

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

    // If no active AI key is configured, do not simulate an AI response
    if (!isAiConfigured) {
      const disabledMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: 'AI Execution Disabled: No AI API key is configured in your environment (.env) or Settings. FlowShield AI does not simulate responses without an active API key. Please configure GEMINI_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY in your .env file or Platform Settings to enable live AI analysis.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, disabledMsg]);
      return;
    }

    setLoading(true);

    try {
      const geminiKey = localStorage.getItem('gemini_api_key') || '';
      const groqKey = localStorage.getItem('groq_api_key') || '';
      const openRouterKey = localStorage.getItem('openrouter_api_key') || '';
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
        text: 'AI Execution Disabled: Connection failed or no API key is configured in your environment. Please configure your key in .env or Settings.',
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
        text: `Chat thread cleared. I'm ready to help with your cash flow analysis, risk assessment, or counterfactual strategy evaluation!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/20 backdrop-blur-[2px] p-3 md:p-6 transition-all duration-200 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`rounded-2xl border flex flex-col transition-all duration-200 overflow-hidden shadow-2xl cursor-default ${
          isExpanded ? 'w-full h-full max-w-4xl' : 'w-full md:w-[460px] h-[540px] max-h-[80vh]'
        } ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0A0A0A] border-[#222222] text-white'
        }`}
      >
        {/* Top Header Bar */}
        <div className={`p-4 border-b flex items-center justify-between relative overflow-hidden ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold font-mono tracking-tight">FlowShield AI Chat</h2>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                  isAiConfigured
                    ? (isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30')
                    : (isLight ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-amber-500/15 text-amber-300 border-amber-500/30')
                }`}>
                  {isAiConfigured ? 'Live AI Active' : (
                    <>
                      <Lock className="w-2.5 h-2.5 text-amber-500" />
                      <span>Chatbot Locked</span>
                    </>
                  )}
                </span>
              </div>
              <p className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Real-time SME AI Chat
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isLight ? 'text-slate-500 hover:bg-slate-200' : 'text-zinc-400 hover:bg-zinc-800'
              }`}
              title={isExpanded ? 'Minimize' : 'Maximize'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isLight ? 'text-slate-500 hover:bg-slate-200' : 'text-zinc-400 hover:bg-zinc-800 text-white'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Context Summary Bar */}
        <div className={`px-4 py-2 border-b flex items-center justify-between text-[11px] font-mono ${
          isLight ? 'bg-slate-100/60 border-slate-200 text-slate-600' : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400'
        }`}>
          <div className="flex items-center gap-4">
            <span>Cash: <strong className="text-emerald-500">{formatLakhs(currentCash)}</strong></span>
            <span>Floor: <strong>{formatLakhs(cashFloor)}</strong></span>
            <span>Min: <strong className={hasBreach ? 'text-red-500' : 'text-emerald-500'}>{formatLakhs(minCash)}</strong></span>
          </div>
          <span className="text-amber-500 font-bold">{breachProbability}% Risk</span>
        </div>

        {/* API Key Required Notice */}
        {!isAiConfigured && (
          <div className={`px-4 py-2.5 border-b flex items-center justify-between gap-2 text-[11px] font-mono ${
            isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
          }`}>
            <span className="truncate">AI Chat requires an active API key in .env or Settings. Simulated AI responses are disabled without an API key.</span>
            <button
              onClick={() => {
                onClose();
                const settingsBtn = document.querySelector('[data-tab="settings"]') as HTMLElement;
                if (settingsBtn) settingsBtn.click();
              }}
              className="px-2.5 py-1 rounded bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors shrink-0 cursor-pointer text-[10px]"
            >
              Configure &rarr;
            </button>
          </div>
        )}

        {/* Message History Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-sans">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 max-w-[88%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white font-mono text-xs shadow-sm ${
                  isUser ? 'bg-blue-600' : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                }`}>
                  {isUser ? <User className="w-3.5 h-3.5" /> : <Brain className="w-3.5 h-3.5" />}
                </div>

                {/* Bubble Container */}
                <div className="space-y-1 flex-1">
                  <div className={`p-3.5 rounded-2xl text-xs leading-relaxed space-y-2 relative ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : isLight
                        ? 'bg-slate-100 text-slate-800 border border-slate-200 rounded-tl-none'
                        : 'bg-zinc-900 text-zinc-100 border border-zinc-800 rounded-tl-none'
                  }`}>
                    <div className="whitespace-pre-wrap">{renderFormattedMessage(msg.text)}</div>

                    {/* Recommended Action Badge */}
                    {msg.recommendedAction && !msg.text.startsWith('API Key Required') && !msg.text.startsWith('AI Provider Request Failed') && (
                      <div className={`mt-2.5 p-2 rounded-xl border flex items-start gap-2 text-[11px] font-mono ${
                        isLight
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      }`}>
                        <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
                        <div>
                          <span className="font-bold uppercase tracking-wider block text-[9px]">Action Plan:</span>
                          <span>{msg.recommendedAction}</span>
                        </div>
                      </div>
                    )}

                    {/* Copy & Speech Buttons for AI messages */}
                    {!isUser && (
                      <div className={`flex items-center gap-2 pt-2 border-t mt-2 ${
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
                  <div className={`text-[9px] font-mono ${
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
            <div className="flex gap-2.5 mr-auto max-w-[85%]">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                <Brain className="w-3.5 h-3.5 animate-pulse" />
              </div>
              <div className={`p-3.5 rounded-2xl text-xs rounded-tl-none flex items-center gap-2 border ${
                isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
              }`}>
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                <span className="font-mono text-[10px]">Analyzing financial data...</span>
              </div>
            </div>
          )}

          {/* Locked State Card in Feed */}
          {!isAiConfigured && (
            <div className={`p-4 rounded-xl border text-center max-w-sm mx-auto my-3 space-y-2.5 ${
              isLight ? 'bg-amber-50/70 border-amber-200 text-amber-950' : 'bg-zinc-900/80 border-amber-500/30 text-zinc-200'
            }`}>
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold font-mono">Chatbot Locked</h3>
                <p className={`text-[11px] mt-0.5 ${isLight ? 'text-amber-800/80' : 'text-zinc-400'}`}>
                  To protect business data integrity and avoid simulated responses, AI Chatbot is locked until an API key is provided in Settings.
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  const settingsBtn = document.querySelector('[data-tab="settings"]') as HTMLElement;
                  if (settingsBtn) settingsBtn.click();
                }}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-mono text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
              >
                <Key className="w-3 h-3" />
                <span>Configure Keys in Settings &rarr;</span>
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className={`p-3.5 border-t ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0A0A0A] border-[#222222]'
        }`}>
          {!isAiConfigured ? (
            <div className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 text-xs ${
              isLight ? 'bg-slate-100/90 border-slate-200 text-slate-700' : 'bg-zinc-900/90 border-zinc-800 text-zinc-300'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <div className="truncate font-mono text-[11px]">Chatbot locked: API key required in Settings.</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  const settingsBtn = document.querySelector('[data-tab="settings"]') as HTMLElement;
                  if (settingsBtn) settingsBtn.click();
                }}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-[11px] font-bold cursor-pointer transition-colors shrink-0 shadow-sm flex items-center gap-1"
              >
                <Key className="w-3 h-3" />
                <span>Configure</span>
              </button>
            </div>
          ) : (
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
                placeholder="Ask about cash flow, risks, or strategy..."
                className={`flex-1 border rounded-xl px-3.5 py-2.5 text-xs font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    : 'bg-zinc-900/80 border-zinc-800 text-white placeholder-zinc-500'
                }`}
              />

              <button
                type="submit"
                disabled={loading || !inputQuery.trim()}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-40 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-indigo-500/20 active:scale-[0.98]"
              >
                {loading ? (
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>Send</span>
                    <Send className="w-3 h-3" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
