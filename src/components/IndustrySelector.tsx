import React, { useState } from 'react';
import { ArrowRight, Building2, Check, ShieldAlert } from 'lucide-react';
import { INDUSTRY_OPTIONS } from '../config/industries';
import { IndustryId } from '../types';
import { useBusinessProfile } from '../context/BusinessProfileContext';
import { useTheme } from '../context/ThemeContext';

/**
 * IndustrySelector — used in two modes:
 *   - "onboarding": full-screen modal shown after first login ("What type of
 *     business do you run?")
 *   - "inline": compact switcher for Settings → Business Profile
 */
export const IndustrySelector: React.FC<{
  mode?: 'onboarding' | 'inline';
  onComplete?: () => void;
}> = ({ mode = 'onboarding', onComplete }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { businessProfile, industryProfile, saveProfile, switchDemo, completeOnboarding } = useBusinessProfile();

  const [selectedId, setSelectedId] = useState<IndustryId | null>(null);
  const [businessName, setBusinessName] = useState(businessProfile.businessName);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isOnboarding = mode === 'onboarding';

  const handleConfirm = async () => {
    if (!selectedId) return;
    setIsSaving(true);
    setError(null);
    try {
      if (isOnboarding) {
        await completeOnboarding(selectedId, businessName.trim() || undefined);
        onComplete?.();
      } else {
        // Settings: change industry WITHOUT deleting financial records.
        await saveProfile({
          industryId: selectedId,
          businessName: businessName.trim() || businessProfile.businessName,
        });
        setSuccess('Business profile updated. Your financial records remain unchanged.');
        setTimeout(() => setSuccess(null), 5000);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to save business profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSwitchDemo = async (id: IndustryId) => {
    setIsSaving(true);
    setError(null);
    try {
      await switchDemo(id);
      setSuccess(`"${businessProfile.businessName}" demo loaded — synthetic data, not real company records.`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (e: any) {
      setError(e?.message || 'Failed to switch demo dataset.');
    } finally {
      setIsSaving(false);
    }
  };

  const cardClass = (id: IndustryId) => {
    const isActive = selectedId === id;
    const base = isLight
      ? 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'
      : 'bg-[#0A0A0A] border-zinc-800 hover:border-indigo-500/40 hover:shadow-lg';
    return `p-4 rounded-xl border text-left transition-all duration-150 cursor-pointer group ${base} ${
      isActive
        ? isLight
          ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/50'
          : 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-500/10'
        : ''
    }`;
  };

  return (
    <div className={`font-sans ${isOnboarding ? '' : 'space-y-4'}`}>
      {/* Title block */}
      <div className="space-y-1.5">
        <h2 className={`text-xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
          {isOnboarding ? 'What type of business do you run?' : 'Business Profile'}
        </h2>
        <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
          FlowShield uses this information to personalize your financial and supply-chain analysis.
        </p>
      </div>

      {/* Business name */}
      {isOnboarding && (
        <div className="space-y-1.5">
          <label className={`text-xs font-semibold block ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
            Business Name
          </label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Shakti Electronics"
            className={`w-full p-2.5 rounded-xl border text-xs font-sans outline-none transition-all ${
              isLight
                ? 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600'
                : 'bg-[#0A0A0A] border-zinc-800 text-white focus:border-indigo-500'
            }`}
          />
        </div>
      )}

      {/* Current selection (inline mode) */}
      {!isOnboarding && (
        <div className={`p-3.5 rounded-xl border flex items-center gap-3 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'
        }`}>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0 ${
            isLight ? 'bg-indigo-50 border border-indigo-200' : 'bg-indigo-500/15 border border-indigo-500/30'
          }`}>
            {industryProfile.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className={`text-sm font-semibold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {businessProfile.businessName}
            </div>
            <div className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              {industryProfile.name} • {businessProfile.currency} • {businessProfile.country}
            </div>
          </div>
          <span className={`text-[10px] font-mono px-2 py-1 rounded-full border ${
            businessProfile.isDemo
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
          }`}>
            {businessProfile.isDemo ? 'DEMO DATA' : 'LIVE'}
          </span>
        </div>
      )}

      {/* Industry cards grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isOnboarding ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-2.5 max-h-[52vh] overflow-y-auto pr-1`}>
        {INDUSTRY_OPTIONS.map((opt) => (
          <button key={opt.id} onClick={() => setSelectedId(opt.id)} className={cardClass(opt.id)}>
            <div className="flex items-start gap-2.5">
              <span className="text-xl leading-none">{opt.icon}</span>
              <div className="min-w-0 flex-1">
                <div className={`text-xs font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {opt.name}
                </div>
                <p className={`text-[11px] leading-snug mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  {opt.description}
                </p>
                <span className={`inline-block mt-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${
                  isLight ? 'text-slate-400 border-slate-200' : 'text-zinc-500 border-zinc-800'
                }`}>
                  {opt.category}
                </span>
              </div>
              {selectedId === opt.id && (
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3" />
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Warning for inline change */}
      {!isOnboarding && (
        <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-[11px] ${
          isLight ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}>
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
          <span>
            Changing business type changes how FlowShield interprets your operational data. Your underlying financial
            records will remain unchanged.
          </span>
        </div>
      )}

      {/* Status messages */}
      {error && (
        <div className={`p-3 rounded-xl border text-xs font-semibold ${
          isLight ? 'bg-red-50 border-red-200 text-red-700' : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          {error}
        </div>
      )}
      {success && (
        <div className={`p-3 rounded-xl border text-xs font-semibold ${
          isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
        }`}>
          {success}
        </div>
      )}

      {/* Demo dataset switcher (inline mode) */}
      {!isOnboarding && (
        <div className={`p-3.5 rounded-xl border space-y-2.5 ${
          isLight ? 'bg-slate-50/70 border-slate-200' : 'bg-zinc-900/50 border-zinc-800'
        }`}>
          <div className={`text-[11px] font-mono font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
            Demo Business Profiles
          </div>
          <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
            Switch between clearly-labeled synthetic demo datasets. Never presented as real company data.
          </p>
          <div className="flex flex-wrap gap-2">
            {(['manufacturing', 'retail', 'saas', 'restaurant', 'construction'] as IndustryId[]).map((id) => {
              const opt = INDUSTRY_OPTIONS.find((o) => o.id === id)!;
              const isActiveDemo = businessProfile.industryId === id;
              return (
                <button
                  key={id}
                  onClick={() => handleSwitchDemo(id)}
                  disabled={isSaving}
                  className={`px-3 py-1.5 rounded-full border text-[11px] font-medium transition-all cursor-pointer disabled:opacity-50 ${
                    isActiveDemo
                      ? isLight
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-indigo-600 text-white border-indigo-500'
                      : isLight
                        ? 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                        : 'bg-[#0A0A0A] border-zinc-800 text-zinc-300 hover:border-indigo-500/40'
                  }`}
                >
                  {opt.icon} {opt.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-end gap-2.5 pt-2">
        <button
          onClick={handleConfirm}
          disabled={!selectedId || isSaving}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-40 ${
            isOnboarding
              ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-500/20'
              : isLight
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-indigo-600 text-white hover:bg-indigo-500'
          }`}
        >
          {isOnboarding ? (
            <>
              Continue <ArrowRight className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              <Building2 className="w-3.5 h-3.5" /> Save Business Profile
            </>
          )}
        </button>
      </div>
    </div>
  );
};

/** Full-screen onboarding overlay used right after login. */
export const OnboardingOverlay: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto ${
      isLight ? 'bg-slate-100/95' : 'bg-[#050507]/95'
    }`}>
      <div className={`w-full max-w-3xl rounded-2xl border p-6 md:p-8 space-y-5 ${
        isLight ? 'bg-white border-slate-200 shadow-2xl' : 'bg-[#0A0A0A] border-zinc-800 shadow-2xl'
      }`}>
        <IndustrySelector mode="onboarding" onComplete={onComplete} />
      </div>
    </div>
  );
};