import React, { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { FinancialDecisionTwin } from './components/FinancialDecisionTwin';
import { LiquidityChart } from './components/LiquidityChart';
import { MonteCarloChart } from './components/MonteCarloChart';
import { DataManagementView } from './components/DataManagementView';
import { BusinessConnectorModal } from './components/BusinessConnectorModal';
import { WhatChangedView } from './components/WhatChangedView';
import { DecisionMatrixTable } from './components/DecisionMatrixTable';
import { DashboardAnalytics } from './components/DashboardAnalytics';
import { RecommendationEngine } from './components/RecommendationEngine';
import { ChatbotModal } from './components/ChatbotModal';
import { FinancialTimeMachine } from './components/FinancialTimeMachine';
import { WhatIfSimulator } from './components/WhatIfSimulator';
import { SettingsView } from './components/SettingsView';
import { LoginView } from './components/LoginView';
import { LiquidityAlertAndBriefingView } from './components/LiquidityNotifications';
import { useTheme } from './context/ThemeContext';
import { BusinessProfileProvider, useBusinessProfile } from './context/BusinessProfileContext';
import { OnboardingOverlay } from './components/IndustrySelector';

import {
  demoInventory,
  demoSuppliers,
  demoSales,
  demoConfig,
  demoTransactions,
  demoPayables,
  demoExpenses,
} from './engine/sampleData';
import { Config } from './types';
import { runSimulationEngine, formatINR } from './engine/calculator';
import { parseCSV } from './engine/csvParser';
import { generatePDFReport } from './engine/pdfGenerator';
import { Transaction, Payable, Expense } from './types';
import { Zap, Bot, Box } from 'lucide-react';

export default function App() {
  return (
    <BusinessProfileProvider>
      <AppInner />
    </BusinessProfileProvider>
  );
}

function AppInner() {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const {
    businessProfile,
    industryProfile,
    isOnboarding,
    setOnLedgerReloaded,
    switchDemo,
  } = useBusinessProfile();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('flowshield_authenticated') === 'true';
  });

  // Cleanly purge any stale legacy generic API key
  useEffect(() => {
    localStorage.removeItem('flowshield_api_key');
  }, []);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardSubTab, setDashboardSubTab] = useState<'overview' | 'risk-map' | 'inflows' | 'outflows'>('overview');
  const [supplierDelayDays, setSupplierDelayDays] = useState(demoConfig.supplier_delay_days);
  const [activeCounterfactual, setActiveCounterfactual] = useState<string | null>(null);
  const [isConnectorOpen, setIsConnectorOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [cashFloorInput, setCashFloorInput] = useState(demoConfig.cash_floor);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Live uploaded / connected data states (pre-populated with demo dataset for instant 0ms load)
  const [liveTransactions, setLiveTransactions] = useState<Transaction[] | null>(demoTransactions);
  const [livePayables, setLivePayables] = useState<Payable[] | null>(demoPayables);
  const [liveExpenses, setLiveExpenses] = useState<Expense[] | null>(demoExpenses);
  const [liveCash, setLiveCash] = useState<number | null>(demoConfig.current_cash);

  // Handle OAuth callback redirects (Zoho/QuickBooks)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectorResult = params.get('connector');
    const provider = params.get('provider');
    const errorMsg = params.get('message');

    if (connectorResult) {
      // Clean up URL immediately
      window.history.replaceState({}, '', window.location.pathname);

      if (connectorResult === 'success' && provider) {
        // OAuth flow succeeded — open the connector modal to show success state
        setIsConnectorOpen(true);
        // Reload financial data from DB
        fetch('/api/financials')
          .then((res) => res.json())
          .then((data) => {
            if (data.config) {
              setCashFloorInput(data.config.cash_floor);
              setSupplierDelayDays(data.config.supplier_delay_days);
              setLiveCash(data.config.current_cash);
            }
            if (data.transactions && data.transactions.length) setLiveTransactions(data.transactions);
            if (data.payables && data.payables.length) setLivePayables(data.payables);
            if (data.expenses && data.expenses.length) setLiveExpenses(data.expenses);
          })
          .catch(() => {});
      } else if (connectorResult === 'error') {
        // OAuth flow failed — show connector with error context
        console.error(`Connector error (${provider}):`, errorMsg);
        setIsConnectorOpen(true);
      }
    }
  }, []);

  // Load data from DB on startup (SR-01)
  useEffect(() => {
    // Skip initial fetch if we already handled an OAuth callback above
    const params = new URLSearchParams(window.location.search);
    if (params.get('connector')) return;

    fetch('/api/financials')
      .then((res) => res.json())
      .then((data) => {
        if (data.config) {
          setCashFloorInput(data.config.cash_floor);
          setSupplierDelayDays(data.config.supplier_delay_days);
          setLiveCash(data.config.current_cash);
        }
        if (data.transactions && data.transactions.length) setLiveTransactions(data.transactions);
        if (data.payables && data.payables.length) setLivePayables(data.payables);
        if (data.expenses && data.expenses.length) setLiveExpenses(data.expenses);
      })
      .catch((err) => console.error('Failed to load database financials:', err))
      .finally(() => setIsLoading(false));
  }, []);

  // Register the ledger-reload callback so industry demo switches refresh live data.
  // NOTE: setOnLedgerReloaded is a useState setter, so the callback must be wrapped
  // in a thunk — otherwise React treats the function as an updater and invokes it
  // immediately with the current state (undefined).
  useEffect(() => {
    setOnLedgerReloaded(
      () => (data) => {
        if (data.currentCash !== undefined) setLiveCash(data.currentCash);
        if (data.cashFloor !== undefined) setCashFloorInput(data.cashFloor);
        if (data.supplierDelayDays !== undefined) setSupplierDelayDays(data.supplierDelayDays);
        if (data.transactions?.length) setLiveTransactions(data.transactions);
        if (data.payables?.length) setLivePayables(data.payables);
        if (data.expenses?.length) setLiveExpenses(data.expenses);
      }
    );
    return () => setOnLedgerReloaded(undefined);
  }, [setOnLedgerReloaded]);

  // Derive current data from DB-sourced live state (empty arrays until DB loads)
  const currentTransactions = liveTransactions || [];
  const currentPayables = livePayables || [];
  const currentExpenses = liveExpenses || [];
  const currentCashVal = liveCash !== null ? liveCash : 0;

  // Automatically save settings to database when changed (SR-02)
  useEffect(() => {
    if (liveCash === null) return; // wait until initial DB sync is complete
    const updateSettingsInDb = async () => {
      try {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentCash: currentCashVal, cashFloor: cashFloorInput, delayDays: supplierDelayDays }),
        });
      } catch (e) {
        console.error('Failed to save settings:', e);
      }
    };

    const timer = setTimeout(() => {
      updateSettingsInDb();
    }, 500);
    return () => clearTimeout(timer);
  }, [cashFloorInput, supplierDelayDays, currentCashVal, liveCash]);

  // Smooth scroll to top on tab & subtab navigation
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // Active overrides based on selected counterfactual card
  const overrides = useMemo(() => {
    if (activeCounterfactual === 'cf-1') return { procurementReductionPercent: 20 };
    if (activeCounterfactual === 'cf-2') return { supplierTermExtensionDays: 15 };
    if (activeCounterfactual === 'cf-3') return { customerAdvancePercent: 30 };
    return undefined;
  }, [activeCounterfactual]);

  // Run calculation engine
  const config: Config = useMemo(
    () => ({
      current_cash: currentCashVal,
      cash_floor: cashFloorInput,
      forecast_weights: [0.5, 0.3, 0.2],
      supplier_delay_days: supplierDelayDays,
    }),
    [currentCashVal, supplierDelayDays, cashFloorInput]
  );

  const simulationResult = useMemo(
    () =>
      runSimulationEngine(
        config,
        currentTransactions,
        currentPayables,
        currentExpenses,
        demoInventory,
        demoSuppliers,
        demoSales,
        overrides
      ),
    [config, currentTransactions, currentPayables, currentExpenses, overrides]
  );

  // Export report action (PDF)
  const handleExportReport = () => {
    generatePDFReport({
      simulationResult,
      cashFloor: config.cash_floor,
      supplierDelayDays,
      companyName: 'Shakti Electronics',
      gstin: '33AABCS1234B1Z1',
    });
  };

  const handleLogin = (companyName?: string) => {
    localStorage.setItem('flowshield_authenticated', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('flowshield_authenticated');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginView onLogin={handleLogin} onSwitchDemo={switchDemo} />;
  }

  return (
    <div className={`font-sans min-h-screen flex flex-col relative transition-colors duration-150 ${
      isLight ? 'bg-[#FFFFFF] text-[#171717]' : 'bg-[#000000] text-[#EDEDED]'
    }`}>
      {/* Onboarding: What type of business do you run? */}
      {isOnboarding && (
        <OnboardingOverlay
          onComplete={() => {
            setActiveTab('dashboard');
          }}
        />
      )}
      {/* Main Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'connector') {
            setIsConnectorOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        onRunSimulation={() => setActiveTab('simulation')}
        onOpenConnector={() => setIsConnectorOpen(true)}
        onOpenChatbot={() => setIsChatbotOpen(true)}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Container Right of Sidebar */}
      <div className="lg:pl-[220px] pl-0 flex-1 flex flex-col relative z-10 min-h-screen w-full overflow-x-hidden">
        {/* Top Header Bar */}
        <Header
          activeTab={activeTab}
          dashboardSubTab={dashboardSubTab}
          setDashboardSubTab={setDashboardSubTab}
          hasBreach={simulationResult?.hasBreach}
          onExportReport={handleExportReport}
          onRefresh={() => setSupplierDelayDays(20)}
          onOpenConnector={() => setIsConnectorOpen(true)}
          onOpenChatbot={() => setIsChatbotOpen(true)}
          onLogout={handleLogout}
          onToggleSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          businessName={businessProfile.businessName}
          industryName={industryProfile.name}
          industryIcon={industryProfile.icon}
        />

        {/* View Content Area */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6 pb-20 max-w-[1600px] w-full mx-auto">
          {/* VIEW 1: DASHBOARD / OVERVIEW */}
          {activeTab === 'dashboard' && (
            <DashboardAnalytics
              simulationResult={simulationResult}
              cashFloor={config.cash_floor}
              isLoading={isLoading}
              supplierDelayDays={supplierDelayDays}
              industryProfile={industryProfile}
              businessName={businessProfile.businessName}
              currentTab={dashboardSubTab}
              onTabChange={setDashboardSubTab}
            />
          )}

          {/* VIEW: FINANCIAL TIME MACHINE */}
          {activeTab === 'time-machine' && (
            <FinancialTimeMachine
              simulationResult={simulationResult}
              cashFloor={config.cash_floor}
            />
          )}

          {/* WHAT-IF SIMULATOR */}
          {activeTab === 'what-if' && (
            <WhatIfSimulator
              config={config}
              transactions={currentTransactions}
              payables={currentPayables}
              expenses={currentExpenses}
              currentSimulationResult={simulationResult}
              onVisualizeIn3D={(scenarioId, paramValue, whatIfResult) => {
                // Set the supplier delay to the what-if value and switch to Digital Twin
                if (scenarioId === 'supplier-delay') {
                  setSupplierDelayDays(paramValue);
                }
                setActiveTab('simulation');
              }}
              industryProfile={industryProfile}
            />
          )}

          {/* VIEW 2: MONTE CARLO DISTRIBUTION */}
          {activeTab === 'driver-analysis' && (
            <MonteCarloChart
              simulationResult={simulationResult}
              cashFloor={config.cash_floor}
            />
          )}

          {/* VIEW: LIQUIDITY ALERT & BRIEFING (WHATSAPP) */}
          {activeTab === 'liquidity-alerts' && (
            <LiquidityAlertAndBriefingView />
          )}

          {/* VIEW 3: BUSINESS MINIATURE MODEL & DECISION SIMULATOR */}
          {activeTab === 'simulation' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h2 className={`text-xl font-bold tracking-tight flex items-center gap-2 ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}>
                    <Box className="w-5 h-5 text-indigo-500" />
                    FlowShield — Business Miniature Model &amp; Decision Simulator
                  </h2>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                    Interactive 3D supply chain map, delivery delay simulation, and scenario strategy testing.
                  </p>
                </div>
                <button
                  onClick={() => setSupplierDelayDays(20)}
                  className={`px-3 py-1.5 rounded-full border text-xs font-mono font-medium transition-colors cursor-pointer shrink-0 ${
                    isLight
                      ? 'bg-[#FFFFFF] border-[#EAEAEA] text-[#171717] hover:bg-[#FAFAFA]'
                      : 'bg-[#111111] border-[#222222] text-[#EDEDED] hover:bg-[#1A1A1A]'
                  }`}
                >
                  Reset Defaults
                </button>
              </div>

              <FinancialDecisionTwin
                currentCash={simulationResult.currentCash}
                minCash={simulationResult.minProjectedCash}
                cashFloor={config.cash_floor}
                hasBreach={simulationResult.hasBreach}
                earliestBreachDate={simulationResult.earliestBreachDate}
                supplierDelayDays={supplierDelayDays}
                onSupplierDelayChange={setSupplierDelayDays}
                counterfactuals={simulationResult.counterfactuals}
                activeCounterfactual={activeCounterfactual}
                onSelectCounterfactual={setActiveCounterfactual}
                onOpenDriverAnalysis={() => setActiveTab('driver-analysis')}

                driverAnalysis={simulationResult.driverAnalysis}
                show3D={true}
                industryProfile={industryProfile}
              />
            </div>
          )}

          {/* VIEW 4: DATA MANAGEMENT */}
          {activeTab === 'data-management' && (
            <DataManagementView
              isLoading={isLoading}
              transactions={currentTransactions}
              payables={currentPayables}
              inventory={demoInventory}
              suppliers={demoSuppliers}
              expenses={currentExpenses}
              onUploadCsvData={async (csvText) => {
                const parsed = parseCSV(csvText, industryProfile.id);
                if (parsed.transactions.length || parsed.payables.length || parsed.currentCash !== null) {
                  try {
                    await fetch('/api/import', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        currentCash: parsed.currentCash !== null ? parsed.currentCash : currentCashVal,
                        transactions: parsed.transactions,
                        payables: parsed.payables,
                        expenses: parsed.expenses,
                      }),
                    });
                  } catch (e) {
                    console.error('Failed to import CSV:', e);
                  }
                }
                if (parsed.transactions.length) setLiveTransactions(parsed.transactions);
                if (parsed.payables.length) setLivePayables(parsed.payables);
                if (parsed.expenses.length) setLiveExpenses(parsed.expenses);
                if (parsed.currentCash !== null) setLiveCash(parsed.currentCash);
              }}
              onResetDemoData={async () => {
                try {
                  await fetch('/api/reset', { method: 'POST' });
                } catch (e) {
                  console.error('Failed to reset dataset:', e);
                }
                setLiveTransactions(null);
                setLivePayables(null);
                setLiveExpenses(null);
                setLiveCash(null);
                setSupplierDelayDays(20);
                setCashFloorInput(500000);
              }}
            />
          )}

          {/* VIEW 6: SETTINGS & AI API KEYS */}
          {activeTab === 'settings' && (
            <SettingsView
              cashFloor={config.cash_floor}
              onUpdateCashFloor={(floor) => setCashFloorInput(floor)}
              supplierDelayDays={supplierDelayDays}
              onUpdateSupplierDelay={(days) => setSupplierDelayDays(days)}
              industryProfile={industryProfile}
              businessProfile={businessProfile}
            />
          )}
        </main>
      </div>

      {/* Consent Business Connector Modal */}
      <BusinessConnectorModal
        isOpen={isConnectorOpen}
        onClose={() => setIsConnectorOpen(false)}
        onConnected={() => {
          setIsConnectorOpen(false);
        }}
        isConnected={true}
        onDataImported={(data) => {
          setLiveTransactions(data.transactions.length ? data.transactions : null);
          setLivePayables(data.payables.length ? data.payables : null);
          setLiveExpenses(data.expenses.length ? data.expenses : null);
          setLiveCash(data.currentCash);
        }}
      />

      {/* Floating AI Chatbot Button */}
      <button
        onClick={() => setIsChatbotOpen(true)}
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full font-mono text-xs font-bold border shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer ${
          isLight
            ? 'bg-[#171717] text-white border-slate-700 hover:bg-slate-800'
            : 'bg-[#EDEDED] text-black border-slate-300 hover:bg-white'
        }`}
        title="Open FlowShield AI Chat"
      >
        <Bot className="w-4 h-4" />
        <span>AI Chat</span>
      </button>

      {/* Grounded AI Advisor Chatbot Modal */}
      <ChatbotModal
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
        simulationResult={simulationResult}
        cashFloor={config.cash_floor}
        supplierDelayDays={supplierDelayDays}
        industryName={industryProfile.name}
        industryId={industryProfile.id}
        businessName={businessProfile.businessName}
      />
    </div>
  );
}
