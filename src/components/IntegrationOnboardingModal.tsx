import React, { useState, useCallback } from 'react';
import {
  Building2,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  ArrowLeft,
  Download,
  Shield,
  Loader2,
  Briefcase,
  Coins,
  Globe,
  Sparkles,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { parseCSV, generateCashShockTemplate } from '../engine/csvParser';
import { INDUSTRY_OPTIONS } from '../config/industries';
import { CustomDropdown, DropdownOption } from './CustomDropdown';
import { IndustryIcon } from './IndustryIcon';

interface IntegrationOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectZoho: () => void;
  onConnectQuickBooks: () => void;
  onDataImported: (data: {
    transactions: any[];
    payables: any[];
    expenses: any[];
    currentCash: number;
  }) => void;
  onSaveCompanyProfile?: (profile: {
    businessName: string;
    industryId: string;
    currency: string;
    country: string;
  }) => Promise<void> | void;
  businessName?: string;
  industryId?: string;
}

export const IntegrationOnboardingModal: React.FC<IntegrationOnboardingModalProps> = ({
  isOpen,
  onClose,
  onConnectZoho,
  onConnectQuickBooks,
  onDataImported,
  onSaveCompanyProfile,
  businessName = '',
  industryId = 'manufacturing',
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Step 1: Company Profile, Step 2: Integration
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 state
  const [companyName, setCompanyName] = useState(businessName);
  const [selectedIndustry, setSelectedIndustry] = useState(industryId);
  const [currency, setCurrency] = useState('INR');
  const [country, setCountry] = useState('India');

  // Step 2 state
  const [integrationMode, setIntegrationMode] = useState<'options' | 'csv-upload'>('options');
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setErrorMessage('Please provide your company or enterprise name.');
      return;
    }
    setErrorMessage(null);

    if (onSaveCompanyProfile) {
      await onSaveCompanyProfile({
        businessName: companyName.trim(),
        industryId: selectedIndustry,
        currency,
        country,
      });
    }

    setStep(2);
  };

  const handleDownloadTemplate = () => {
    const content = generateCashShockTemplate();
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'flowshield_ledger_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processCsvFile = useCallback(
    async (file: File) => {
      setErrorMessage(null);
      setSuccessMessage(null);
      setIsProcessing(true);

      try {
        const text = await file.text();
        const parsed = parseCSV(text, selectedIndustry);

        if (
          parsed.transactions.length === 0 &&
          parsed.payables.length === 0 &&
          parsed.expenses.length === 0 &&
          parsed.currentCash === null
        ) {
          throw new Error('No valid financial transactions or payables found in the uploaded file.');
        }

        const cashVal = parsed.currentCash !== null ? parsed.currentCash : 1000000;

        // Persist to backend /api/import
        try {
          await fetch('/api/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              currentCash: cashVal,
              transactions: parsed.transactions,
              payables: parsed.payables,
              expenses: parsed.expenses,
            }),
          });
        } catch (dbErr) {
          console.warn('Backend sync warning:', dbErr);
        }

        onDataImported({
          transactions: parsed.transactions,
          payables: parsed.payables,
          expenses: parsed.expenses,
          currentCash: cashVal,
        });

        setSuccessMessage(
          `Imported ${parsed.transactions.length} invoices, ${parsed.payables.length} bills, and ${parsed.expenses.length} expenses!`
        );

        setTimeout(() => {
          onClose();
        }, 1200);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to parse CSV file. Please check format.');
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedIndustry, onDataImported, onClose]
  );

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processCsvFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processCsvFile(e.target.files[0]);
    }
  };

  if (!isOpen) return null;

  const industryDropdownOptions: DropdownOption[] = INDUSTRY_OPTIONS.map((ind) => ({
    value: ind.id,
    label: ind.name,
    sublabel: ind.category,
    icon: <IndustryIcon icon={ind.icon} className="w-4 h-4" />,
  }));

  const currencyDropdownOptions: DropdownOption[] = [
    { value: 'INR', label: 'INR (₹) - Indian Rupee', icon: <span className="font-semibold text-xs">₹</span> },
    { value: 'USD', label: 'USD ($) - US Dollar', icon: <span className="font-semibold text-xs">$</span> },
    { value: 'EUR', label: 'EUR (€) - Euro', icon: <span className="font-semibold text-xs">€</span> },
    { value: 'GBP', label: 'GBP (£) - British Pound', icon: <span className="font-semibold text-xs">£</span> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden transition-all duration-200 ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0A0A0A] border-zinc-800 text-white'
        }`}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between border-b border-inherit">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">
                  {step === 1 ? 'Set Up Your Company Profile' : 'Connect Your Financial Ledger'}
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
                  Step {step} of 2
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                {step === 1
                  ? 'Configure your business parameters to personalize stress testing and risk simulations.'
                  : 'Choose how to import your live receivables, payables, and operating cash.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isLight
                ? 'hover:bg-slate-100 border-slate-200 text-slate-500'
                : 'hover:bg-zinc-800 border-zinc-800 text-zinc-400'
            }`}
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ── STEP 1: COMPANY PROFILE SETUP ──────────────────────────── */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                  Company / Enterprise Legal Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    placeholder="e.g. Apex Global Solutions Pvt Ltd"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs outline-none transition-all ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                        : 'bg-zinc-900 border-zinc-800 text-white focus:border-indigo-500'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                    Industry Sector
                  </label>
                  <CustomDropdown
                    value={selectedIndustry}
                    options={industryDropdownOptions}
                    onChange={(val) => setSelectedIndustry(val)}
                    placeholder="Select Industry Sector"
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                    Operating Currency
                  </label>
                  <CustomDropdown
                    value={currency}
                    options={currencyDropdownOptions}
                    onChange={(val) => setCurrency(val)}
                    placeholder="Select Currency"
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                  Country / Operating Jurisdiction
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. India"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs outline-none transition-all ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600'
                        : 'bg-zinc-900 border-zinc-800 text-white focus:border-indigo-500'
                    }`}
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all cursor-pointer flex items-center gap-2 shadow-sm"
                >
                  <span>Continue to Financial Integration</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 2: INTEGRATION GATEWAY ────────────────────────────── */}
          {step === 2 && (
            <>
              {integrationMode === 'options' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {/* Option 1: Zoho Books */}
                    <div
                      onClick={onConnectZoho}
                      className={`group p-4 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 cursor-pointer hover:scale-[1.02] ${
                        isLight
                          ? 'bg-slate-50/70 border-slate-200 hover:border-indigo-400 hover:bg-white hover:shadow-md'
                          : 'bg-zinc-900/60 border-zinc-800 hover:border-indigo-500 hover:bg-zinc-900 hover:shadow-lg'
                      }`}
                    >
                      <div>
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mb-3">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <h3 className="font-semibold text-sm">Zoho Books</h3>
                        <p className={`text-xs mt-1 leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                          Sync unpaid customer invoices (AR), vendor bills (AP), and live bank cash via OAuth.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-inherit flex items-center justify-between text-xs font-medium text-blue-500">
                        <span>Connect Cloud</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>

                    {/* Option 2: QuickBooks Online */}
                    <div
                      onClick={onConnectQuickBooks}
                      className={`group p-4 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 cursor-pointer hover:scale-[1.02] ${
                        isLight
                          ? 'bg-slate-50/70 border-slate-200 hover:border-emerald-400 hover:bg-white hover:shadow-md'
                          : 'bg-zinc-900/60 border-zinc-800 hover:border-emerald-500 hover:bg-zinc-900 hover:shadow-lg'
                      }`}
                    >
                      <div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mb-3">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <h3 className="font-semibold text-sm">QuickBooks</h3>
                        <p className={`text-xs mt-1 leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                          Pull receivables, payables, and chart of accounts in real-time with official Intuit sync.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-inherit flex items-center justify-between text-xs font-medium text-emerald-500">
                        <span>Connect Cloud</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>

                    {/* Option 3: Upload CSV Ledger */}
                    <div
                      onClick={() => setIntegrationMode('csv-upload')}
                      className={`group p-4 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 cursor-pointer hover:scale-[1.02] ${
                        isLight
                          ? 'bg-slate-50/70 border-slate-200 hover:border-indigo-400 hover:bg-white hover:shadow-md'
                          : 'bg-zinc-900/60 border-zinc-800 hover:border-indigo-500 hover:bg-zinc-900 hover:shadow-lg'
                      }`}
                    >
                      <div>
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 mb-3">
                          <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <h3 className="font-semibold text-sm">Upload CSV</h3>
                        <p className={`text-xs mt-1 leading-relaxed ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                          Upload bank statement or accounting CSV exports directly into the simulation engine.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-inherit flex items-center justify-between text-xs font-medium text-purple-500">
                        <span>Upload File</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 ${
                        isLight
                          ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                          : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
                      }`}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back to Company Details
                    </button>
                  </div>
                </div>
              ) : (
                /* CSV Upload Dropzone */
                <div className="space-y-4">
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                      dragActive
                        ? 'border-indigo-500 bg-indigo-500/10 scale-[0.99]'
                        : isLight
                        ? 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'
                        : 'border-zinc-700 hover:border-indigo-500/60 bg-zinc-900/40'
                    }`}
                  >
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleFileInput}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isProcessing}
                    />
                    <div className="flex flex-col items-center justify-center gap-2.5 pointer-events-none">
                      <div className="p-3 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                        {isProcessing ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <Upload className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">
                          {isProcessing ? 'Ingesting financial ledger...' : 'Drop your CSV ledger file here'}
                        </p>
                        <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                          Supports customer invoices, vendor bills, OPEX, or bank exports.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setIntegrationMode('options')}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 ${
                        isLight
                          ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                          : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
                      }`}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back to Options
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="text-xs text-indigo-500 hover:underline flex items-center gap-1.5 font-medium cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Sample CSV Template
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-inherit flex items-center justify-between text-xs">
          <span className="opacity-60 text-[11px]">
            Data is securely stored in your Supabase database with AES encryption.
          </span>
          <button
            onClick={onClose}
            className={`font-medium transition-colors cursor-pointer ${
              isLight ? 'text-slate-500 hover:text-slate-800' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Skip for now →
          </button>
        </div>
      </div>
    </div>
  );
};
