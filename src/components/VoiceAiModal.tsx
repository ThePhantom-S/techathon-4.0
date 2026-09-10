import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Sparkles, Send, X, CheckCircle2, Lock, Key } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface VoiceAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  verifiedData: Record<string, any>;
}

export const VoiceAiModal: React.FC<VoiceAiModalProps> = ({ isOpen, onClose, verifiedData }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [recommendedAction, setRecommendedAction] = useState<string | null>(null);
  const [hasServerKey, setHasServerKey] = useState<boolean | null>(null);

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

  useEffect(() => {
    if (!isOpen) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      handleSendQuery(transcript);
    };

    if (isListening) {
      recognition.start();
    } else {
      recognition.stop();
    }

    return () => {
      recognition.stop();
    };
  }, [isListening, isOpen]);

  const toggleListening = () => {
    if (!isAiConfigured) return;
    setIsListening(!isListening);
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleSendQuery = async (userQuery: string) => {
    if (!userQuery.trim() || !isAiConfigured) return;
    setLoading(true);
    setAiResponse(null);
    setRecommendedAction(null);

    try {
      const geminiKey = localStorage.getItem('gemini_api_key') || '';
      const groqKey = localStorage.getItem('groq_api_key') || '';
      const openRouterKey = localStorage.getItem('openrouter_api_key') || '';
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userQuery,
          verifiedData,
          geminiKey,
          groqKey,
          openRouterKey,
        }),
      });
      const data = await res.json();
      const explanation = data.explanation || 'API Key Required: Please configure an API key in Settings.';
      setAiResponse(explanation);
      if (data.recommendedAction && !data.noApiKey) setRecommendedAction(data.recommendedAction);
      speakText(explanation);
    } catch (err) {
      const fallback = `API Key Required: No API key is configured. Please integrate your Groq, Gemini, or OpenRouter API key in Settings to enable voice AI.`;
      setAiResponse(fallback);
      speakText(fallback);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const presetQueries = [
    'Why is my cash falling?',
    'What happens if my supplier delays by 15 days?',
    'How do I prevent the cash breach on Day 19?',
    'Explain the top outflow drivers.',
  ];

  return (
    <div
      onClick={() => {
        stopSpeaking();
        onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-[2px] font-sans transition-opacity duration-200 animate-in fade-in cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-xl rounded-2xl border shadow-2xl flex flex-col max-h-[85vh] overflow-hidden transition-all duration-200 animate-in fade-in zoom-in-95 cursor-default ${
          isLight ? 'bg-[#FFFFFF] border-[#EAEAEA] text-[#171717]' : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED]'
        }`}
      >
        {/* Modal Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isLight ? 'border-[#EAEAEA]' : 'border-[#222222]'
        }`}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#3B82F6]" />
            <h2 className="text-sm font-semibold">AI Voice Assistant</h2>
          </div>
          <button
            onClick={() => {
              stopSpeaking();
              onClose();
            }}
            className={`p-1.5 rounded-full border transition-all duration-150 cursor-pointer active:scale-[0.95] ${
              isLight ? 'bg-[#FAFAFA] border-[#EAEAEA] text-[#666666]' : 'bg-[#111111] border-[#222222] text-[#A1A1AA]'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          {/* API Key Required Notice */}
          {!isAiConfigured && (
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
              isLight ? 'bg-amber-50/80 border-amber-200 text-amber-950' : 'bg-zinc-900/80 border-amber-500/30 text-zinc-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="font-mono text-[11px]">Voice AI is locked: API key required in Settings.</span>
              </div>
              <button
                onClick={() => {
                  stopSpeaking();
                  onClose();
                  const settingsBtn = document.querySelector('[data-tab="settings"]') as HTMLElement;
                  if (settingsBtn) settingsBtn.click();
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-mono text-[11px] font-bold transition-colors cursor-pointer shrink-0 shadow-sm"
              >
                Configure Keys
              </button>
            </div>
          )}

          {/* Preset Buttons */}
          <div>
            <span className={`text-[10px] font-mono block mb-2 ${isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}`}>
              PRESET QUESTIONS
            </span>
            <div className="flex flex-wrap gap-2 font-mono text-xs">
              {presetQueries.map((pq) => (
                <button
                  key={pq}
                  disabled={!isAiConfigured}
                  onClick={() => {
                    setQuery(pq);
                    handleSendQuery(pq);
                  }}
                  className={`px-3 py-1.5 rounded-full border transition-all duration-150 ${
                    !isAiConfigured
                      ? 'opacity-40 cursor-not-allowed bg-transparent border-dashed'
                      : isLight
                      ? 'bg-[#FAFAFA] border-[#EAEAEA] text-[#171717] hover:bg-[#F4F4F5] cursor-pointer active:scale-[0.97]'
                      : 'bg-[#111111] border-[#222222] text-[#EDEDED] hover:bg-[#1A1A1A] cursor-pointer active:scale-[0.97]'
                  }`}
                >
                  "{pq}"
                </button>
              ))}
            </div>
          </div>

          {/* Query Display */}
          {query && (
            <div className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between ${
              isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#111111] border-[#222222]'
            }`}>
              <span>Query: "{query}"</span>
              {isListening && <span className="text-[#EAB308] text-[10px]">Listening...</span>}
            </div>
          )}

          {/* AI Response Card */}
          {loading ? (
            <div className="p-4 border border-[#3B82F6]/30 bg-[#3B82F6]/10 rounded-xl flex items-center gap-2 text-xs font-mono text-[#3B82F6]">
              <Sparkles className="w-4 h-4 animate-spin" />
              Generating natural-language explanation...
            </div>
          ) : aiResponse ? (
            <div className={`p-4 border rounded-xl space-y-2 ${
              isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#111111] border-[#222222]'
            }`}>
              <div className="flex justify-between items-center font-mono text-xs">
                <span className="text-[#3B82F6] flex items-center gap-1 font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  Verified AI Insight
                </span>
                <button
                  onClick={isSpeaking ? stopSpeaking : () => speakText(aiResponse)}
                  className={`px-2.5 py-1 rounded-full border transition-all duration-150 cursor-pointer active:scale-[0.97] flex items-center gap-1 text-[10px] ${
                    isLight ? 'bg-[#FFFFFF] border-[#EAEAEA] text-[#171717]' : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED]'
                  }`}
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX className="w-3 h-3 text-[#EF4444]" />
                      <span>Stop Voice</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3 h-3 text-[#22C55E]" />
                      <span>Read Voice</span>
                    </>
                  )}
                </button>
              </div>

              <p className={`text-xs leading-relaxed font-sans ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
                "{aiResponse?.replace(/\*\*/g, '')}"
              </p>

              {recommendedAction && (
                <div className="pt-2 border-t border-[#222222] flex items-center gap-1.5 text-xs font-mono text-[#22C55E]">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Recommendation: {recommendedAction}</span>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer Controls */}
        <div className={`p-4 border-t flex items-center gap-2 ${
          isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'
        }`}>
          {!isAiConfigured ? (
            <div className={`w-full p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
              isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
            }`}>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Voice input locked &bull; Configure API key in Settings</span>
              </div>
              <button
                onClick={() => {
                  stopSpeaking();
                  onClose();
                  const settingsBtn = document.querySelector('[data-tab="settings"]') as HTMLElement;
                  if (settingsBtn) settingsBtn.click();
                }}
                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-[10px] font-bold cursor-pointer shrink-0"
              >
                Settings &rarr;
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={toggleListening}
                className={`p-2.5 rounded-full border transition-all duration-150 cursor-pointer active:scale-[0.95] ${
                  isListening
                    ? 'bg-[#EF4444] text-white border-[#EF4444]'
                    : isLight
                    ? 'bg-[#FFFFFF] border-[#EAEAEA] text-[#171717]'
                    : 'bg-[#111111] border-[#222222] text-[#EDEDED]'
                }`}
                title={isListening ? 'Stop Mic' : 'Start Voice'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendQuery(query)}
                placeholder="Ask a question..."
                className={`flex-1 border rounded-full px-4 py-2 text-xs font-mono focus:outline-none ${
                  isLight
                    ? 'bg-[#FFFFFF] border-[#EAEAEA] text-[#171717] placeholder-[#8A8A8A]'
                    : 'bg-[#111111] border-[#222222] text-[#EDEDED] placeholder-[#71717A]'
                }`}
              />

              <button
                onClick={() => handleSendQuery(query)}
                disabled={!query.trim() || loading}
                className={`p-2 rounded-full font-medium text-xs transition-all duration-150 cursor-pointer active:scale-[0.95] disabled:opacity-40 ${
                  isLight ? 'bg-[#171717] text-[#FFFFFF]' : 'bg-[#EDEDED] text-[#000000]'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
