import React, { useState, useEffect } from 'react';
import { Building2, Check, ShieldCheck, Save, Globe, Coins, FileText, Briefcase } from 'lucide-react';
import { INDUSTRY_OPTIONS } from '../config/industries';
import { IndustryId } from '../types';
import { useBusinessProfile } from '../context/BusinessProfileContext';
import { useTheme } from '../context/ThemeContext';
import { IndustryIcon } from './IndustryIcon';
import { CustomDropdown, DropdownOption } from './CustomDropdown';

interface IndustrySelectorProps {
  mode?: 'onboarding' | 'inline';
  onComplete?: () => void;
}

export const IndustrySelector: React.FC<IndustrySelectorProps> = ({ mode = 'inline', onComplete }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { businessProfile, industryProfile, saveProfile } = useBusinessProfile();

  const [businessName, setBusinessName] = useState(businessProfile.businessName);
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryId>(businessProfile.industryId);
  const [currency, setCurrency] = useState(businessProfile.currency || 'INR');
  const [country, setCountry] = useState(businessProfile.country || 'India');
  const [taxId, setTaxId] = useState('33AABCS1234B1Z1');

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setBusinessName(businessProfile.businessName);
    setSelectedIndustry(businessProfile.industryId);
    setCurrency(businessProfile.currency || 'INR');
    setCountry(businessProfile.country || 'India');
  }, [businessProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      setError('Company name cannot be empty.');
      return;
    }
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await saveProfile({
        businessName: businessName.trim(),
        industryId: selectedIndustry,
        currency,
        country,
      });
      setSuccess('Business profile and industry model updated successfully.');
      setTimeout(() => setSuccess(null), 4000);
      onComplete?.();
    } catch (err: any) {
      setError(err?.message || 'Failed to save business profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 font-sans">
      {/* Active Profile Status Bar */}
      <div
        className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              isLight ? 'bg-indigo-50 border border-indigo-200' : 'bg-indigo-500/15 border border-indigo-500/30'
            }`}
          >
            <IndustryIcon icon={industryProfile.icon} className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <div className={`text-sm font-semibold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {businessProfile.businessName}
            </div>
            <div className={`text-[11px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              {industryProfile.name} • {currency} • {country}
            </div>
          </div>
        </div>

        <span className="text-[10px] font-mono px-2.5 py-1 rounded-full border bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-semibold flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" />
          Enterprise Profile
        </span>
      </div>

      {/* Form Fields Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Company Name */}
        <div className="space-y-1.5 sm:col-span-2">
          <label className={`text-xs font-semibold block ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
            Company / Business Legal Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
              placeholder="e.g. Acme Industries Ltd"
              className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-sans outline-none transition-colors ${
                isLight
                  ? 'bg-white border-slate-200 focus:border-indigo-600 text-slate-900'
                  : 'bg-zinc-900 border-zinc-800 focus:border-indigo-500 text-zinc-100'
              }`}
            />
          </div>
        </div>

        {/* Industry Model Dropdown */}
        <div className="space-y-1.5">
          <label className={`text-xs font-semibold block ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
            Industry Operating Model
          </label>
          <CustomDropdown
            value={selectedIndustry}
            options={INDUSTRY_OPTIONS.map((opt) => ({
              value: opt.id,
              label: opt.name,
              sublabel: opt.category,
              icon: <IndustryIcon icon={opt.icon} className="w-4 h-4" />,
            }))}
            onChange={(val) => setSelectedIndustry(val as IndustryId)}
            placeholder="Select Industry Model"
          />
          <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
            Calibrates working capital benchmarks (DSO, DPO, inventory turns).
          </p>
        </div>

        {/* Operating Currency */}
        <div className="space-y-1.5">
          <label className={`text-xs font-semibold block ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
            Reporting Currency
          </label>
          <CustomDropdown
            value={currency}
            options={[
              { value: 'INR', label: 'INR (₹) - Indian Rupee', icon: <span className="font-semibold text-xs">₹</span> },
              { value: 'USD', label: 'USD ($) - US Dollar', icon: <span className="font-semibold text-xs">$</span> },
              { value: 'EUR', label: 'EUR (€) - Euro', icon: <span className="font-semibold text-xs">€</span> },
              { value: 'GBP', label: 'GBP (£) - British Pound', icon: <span className="font-semibold text-xs">£</span> },
            ]}
            onChange={(val) => setCurrency(val)}
            placeholder="Select Currency"
          />
          <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
            Financial figures and simulation outputs will render in this currency.
          </p>
        </div>

        {/* Operating Jurisdiction / Country */}
        <div className="space-y-1.5">
          <label className={`text-xs font-semibold block ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
            Country / Tax Jurisdiction
          </label>
          <div className="relative">
            <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. India"
              className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-sans outline-none transition-colors ${
                isLight
                  ? 'bg-white border-slate-200 focus:border-indigo-600 text-slate-900'
                  : 'bg-zinc-900 border-zinc-800 focus:border-indigo-500 text-zinc-100'
              }`}
            />
          </div>
        </div>

        {/* GSTIN / Corporate Tax ID */}
        <div className="space-y-1.5">
          <label className={`text-xs font-semibold block ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
            GSTIN / Corporate Tax ID
          </label>
          <div className="relative">
            <FileText className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="e.g. 33AABCS1234B1Z1"
              className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-sans outline-none transition-colors ${
                isLight
                  ? 'bg-white border-slate-200 focus:border-indigo-600 text-slate-900'
                  : 'bg-zinc-900 border-zinc-800 focus:border-indigo-500 text-zinc-100'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Feedback Messages */}
      {error && (
        <div className="p-3 rounded-xl border bg-red-500/10 border-red-500/30 text-red-400 text-xs font-semibold">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{success}</span>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving Profile...' : 'Save Profile Changes'}</span>
        </button>
      </div>
    </form>
  );
};

export const OnboardingOverlay: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  return null;
};