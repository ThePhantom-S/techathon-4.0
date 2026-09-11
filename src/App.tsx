import React, { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { FinancialDecisionTwin } from './components/FinancialDecisionTwin';
import { LiquidityChart } from './components/LiquidityChart';
import { MonteCarloChart } from './components/MonteCarloChart';
import { DataManagementView } from './components/DataManagementView';
import { BusinessConnectorModal, ViewMode } from './components/BusinessConnectorModal';
import { IntegrationOnboardingModal } from './components/IntegrationOnboardingModal';
import { WhatChangedView } from './components/WhatChangedView';
import { DecisionMatrixTable } from './components/DecisionMatrixTable';
import { DashboardAnalytics } from './components/DashboardAnalytics';
import { EmptyStateView } from './components/EmptyStateView';
import { DashboardSkeleton } from './components/ui/Skeleton';

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
import { runSimulationEngine, formatINR, computeDynamicCashFloor } from './engine/calculator';
import { parseCSV } from './engine/csvParser';
import { generatePDFReport } from './engine/pdfGenerator';
import { Transaction, Payable, Expense } from './types';
import { Zap, Bot, Box } from 'lucide-react';
import { safeParseJson } from './utils/safeJson';

import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './lib/supabaseClient';

export default function App() {
  return (
    <AuthProvider>
      <BusinessProfileProvider>
        <AppInner />
      </BusinessProfileProvider>
    </AuthProvider>
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
    saveProfile,
  } = useBusinessProfile();

  const { isAuthenticated, isLoading: isAuthLoading, user, signOut, updateUserProfile } = useAuth();

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

  const isDemoMode = Boolean(user?.isDemo);

  // Live uploaded / connected data states with instant persistent cache recovery
  const [liveTransactions, setLiveTransactions] = useState<Transaction[] | null>(() => {
    if (user?.isDemo) return demoTransactions;
    if (user?.id) {
      try {
        const userCached = localStorage.getItem(`flowshield_persistent_ledger_${user.id}`);
        if (userCached) {
          const parsed = JSON.parse(userCached);
          if (Array.isArray(parsed.transactions) && parsed.transactions.length > 0) {
            return parsed.transactions;
          }
        }
      } catch {}
    }
    return null;
  });

  const [livePayables, setLivePayables] = useState<Payable[] | null>(() => {
    if (user?.isDemo) return demoPayables;
    if (user?.id) {
      try {
        const userCached = localStorage.getItem(`flowshield_persistent_ledger_${user.id}`);
        if (userCached) {
          const parsed = JSON.parse(userCached);
          if (Array.isArray(parsed.payables) && parsed.payables.length > 0) {
            return parsed.payables;
          }
        }
      } catch {}
    }
    return null;
  });

  const [liveExpenses, setLiveExpenses] = useState<Expense[] | null>(() => {
    if (user?.isDemo) return demoExpenses;
    if (user?.id) {
      try {
        const userCached = localStorage.getItem(`flowshield_persistent_ledger_${user.id}`);
        if (userCached) {
          const parsed = JSON.parse(userCached);
          if (Array.isArray(parsed.expenses) && parsed.expenses.length > 0) {
            return parsed.expenses;
          }
        }
      } catch {}
    }
    return null;
  });

  const [liveCash, setLiveCash] = useState<number | null>(() => {
    if (user?.isDemo) return demoConfig.current_cash;
    if (user?.id) {
      try {
        const userCached = localStorage.getItem(`flowshield_persistent_ledger_${user.id}`);
        if (userCached) {
          const parsed = JSON.parse(userCached);
          if (parsed.currentCash !== undefined && parsed.currentCash !== null && Number(parsed.currentCash) > 0) {
            return Number(parsed.currentCash);
          }
        }
      } catch {}
    }
    return null;
  });

  const [isDataLoadedFromDb, setIsDataLoadedFromDb] = useState(false);
  const [isIntegrationModalOpen, setIsIntegrationModalOpen] = useState(false);
  const [connectorInitialView, setConnectorInitialView] = useState<ViewMode>('SELECT');

  // hasConnectedData:
  // - True in demo mode
  // - For real users, true ONLY if actual ledger records exist (transactions/payables/expenses)
  // - Cash balance alone does NOT count — user must upload/connect actual records
  const hasConnectedData = Boolean(
    user?.isDemo ||
    (
      (Array.isArray(liveTransactions) && liveTransactions.length > 0) ||
      (Array.isArray(livePayables) && livePayables.length > 0) ||
      (Array.isArray(liveExpenses) && liveExpenses.length > 0)
    )
  );

  // Synchronize data states on mount and whenever active user changes
  useEffect(() => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    (async () => {
      try {
        // CASE A: DEMO USER -> Load demo dataset from /api/financials or baseline
        if (user?.isDemo) {
          const dbRes = await fetch('/api/financials');
          if (dbRes.ok) {
            const dbData = await dbRes.json();
            setLiveTransactions(dbData.transactions || demoTransactions);
            setLivePayables(dbData.payables || demoPayables);
            setLiveExpenses(dbData.expenses || demoExpenses);
            setLiveCash(dbData.config?.current_cash !== undefined ? Number(dbData.config.current_cash) : demoConfig.current_cash);
            if (dbData.config?.cash_floor !== undefined) setCashFloorInput(Number(dbData.config.cash_floor));
            if (dbData.config?.supplier_delay_days !== undefined) setSupplierDelayDays(Number(dbData.config.supplier_delay_days));
          } else {
            setLiveTransactions(demoTransactions);
            setLivePayables(demoPayables);
            setLiveExpenses(demoExpenses);
            setLiveCash(demoConfig.current_cash);
          }
          setIsDataLoadedFromDb(true);
          setIsIntegrationModalOpen(false);
          return;
        }

        // CASE B: REAL SIGNED-UP USER -> Strictly user-isolated records (ZERO fallback to demo/Shakti)
        if (user?.id) {
          // 1. Instant local restore from user-scoped storage (ensures immediate rendering on reload)
          let hasLocal = false;
          try {
            const userCached = localStorage.getItem(`flowshield_persistent_ledger_${user.id}`);
            if (userCached) {
              const parsed = JSON.parse(userCached);
              const hasLocalLedger =
                (Array.isArray(parsed.transactions) && parsed.transactions.length > 0) ||
                (Array.isArray(parsed.payables) && parsed.payables.length > 0) ||
                (Array.isArray(parsed.expenses) && parsed.expenses.length > 0);
              if (hasLocalLedger) {
                // Only set arrays that are actually non-empty (avoid overwriting with [])
                if (Array.isArray(parsed.transactions) && parsed.transactions.length > 0) {
                  setLiveTransactions(parsed.transactions);
                }
                if (Array.isArray(parsed.payables) && parsed.payables.length > 0) {
                  setLivePayables(parsed.payables);
                }
                if (Array.isArray(parsed.expenses) && parsed.expenses.length > 0) {
                  setLiveExpenses(parsed.expenses);
                }
                if (parsed.currentCash !== undefined && parsed.currentCash !== null) {
                  setLiveCash(Number(parsed.currentCash));
                }
                if (parsed.cashFloor !== undefined) setCashFloorInput(Number(parsed.cashFloor));
                setIsDataLoadedFromDb(true);
                hasLocal = true;
              }
            }
          } catch {}

          // 2. Authoritative sync from Supabase cloud tables for this exact user.id
          try {
            const [profRes, confRes, txRes, pbRes, expRes] = await Promise.all([
              supabase.from('business_profile').select('*').or(`id.eq.${user.id},user_id.eq.${user.id}`).maybeSingle(),
              supabase.from('configuration').select('*').or(`id.eq.${user.id},user_id.eq.${user.id}`).maybeSingle(),
              supabase.from('transactions').select('*').eq('user_id', user.id),
              supabase.from('payables').select('*').eq('user_id', user.id),
              supabase.from('expenses').select('*').eq('user_id', user.id),
            ]);

            if (profRes.data?.business_name) {
              updateUserProfile({
                businessName: profRes.data.business_name,
                industryId: profRes.data.industry_id || 'manufacturing',
              });
            }

            // hasSbLedger: ONLY true if Supabase has actual transaction/payable/expense records.
            // DO NOT include current_cash from configuration — it causes empty arrays to
            // overwrite valid localStorage data when Supabase hasn't received the upload yet.
            const hasSbData = Boolean(
              (txRes.data && txRes.data.length > 0) ||
              (pbRes.data && pbRes.data.length > 0) ||
              (expRes.data && expRes.data.length > 0)
            );

            if (hasSbData) {
              const mappedTxs = ((txRes.data as any[]) || []).map((t) => ({
                id: t.id,
                date: t.date,
                customer: t.customer,
                invoice_amount: Number(t.invoice_amount || t.amount || 0),
                expected_payment_date: t.expected_payment_date || t.date,
                collection_probability: Number(t.collection_probability ?? 0.95),
                status: t.status || 'PENDING',
              }));

              const mappedPbs = ((pbRes.data as any[]) || []).map((p) => ({
                id: p.id,
                supplier: p.supplier,
                amount: Number(p.amount || 0),
                due_date: p.due_date,
                category: p.category || 'Vendor Bill',
                status: p.status || 'DUE',
              }));

              const mappedExps = ((expRes.data as any[]) || []).map((e) => ({
                id: e.id,
                date: e.date,
                category: e.category || 'Operating Expense',
                amount: Number(e.amount || 0),
              }));

              const cashVal = Number(confRes.data?.current_cash || 0);

              setLiveTransactions(mappedTxs);
              setLivePayables(mappedPbs);
              setLiveExpenses(mappedExps);
              setLiveCash(cashVal);
              if (confRes.data?.cash_floor !== undefined) {
                setCashFloorInput(Number(confRes.data.cash_floor));
              }
              setIsDataLoadedFromDb(true);
              localStorage.setItem(`flowshield_data_connected_${user.id}`, 'true');
              localStorage.removeItem(`flowshield_needs_onboarding_${user.id}`);
              localStorage.setItem(`flowshield_persistent_ledger_${user.id}`, JSON.stringify({
                transactions: mappedTxs,
                payables: mappedPbs,
                expenses: mappedExps,
                currentCash: cashVal,
                cashFloor: confRes.data?.cash_floor,
              }));

              // Sync to server backend
              fetch('/api/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  currentCash: cashVal,
                  transactions: mappedTxs,
                  payables: mappedPbs,
                  expenses: mappedExps,
                }),
              }).catch(() => {});
              return;
            } else if (hasLocal) {
              // Local had data but Supabase didn't yet -> back-sync local data to Supabase
              try {
                const userCached = localStorage.getItem(`flowshield_persistent_ledger_${user.id}`);
                if (userCached) {
                  const parsed = JSON.parse(userCached);
                  const cashVal = Number(parsed.currentCash || 0);
                  await supabase.from('configuration').upsert({
                    id: user.id,
                    user_id: user.id,
                    current_cash: cashVal,
                    cash_floor: Number(parsed.cashFloor || 500000),
                    forecast_weights: [0.5, 0.3, 0.2],
                    supplier_delay_days: 20,
                  });
                  if (Array.isArray(parsed.transactions) && parsed.transactions.length > 0) {
                    await supabase.from('transactions').delete().eq('user_id', user.id);
                    await supabase.from('transactions').insert(parsed.transactions.map((t: any, idx: number) => ({
                      id: t.id ? `${user.id.slice(0, 8)}-${t.id}` : `${user.id.slice(0, 8)}-tx-${idx}-${Date.now()}`,
                      user_id: user.id,
                      date: t.date,
                      customer: t.customer,
                      invoice_amount: Number(t.invoice_amount || t.amount || 0),
                      expected_payment_date: t.expected_payment_date || t.date,
                      collection_probability: Number(t.collection_probability ?? 0.95),
                      status: t.status || 'PENDING',
                    })));
                  }
                  if (Array.isArray(parsed.payables) && parsed.payables.length > 0) {
                    await supabase.from('payables').delete().eq('user_id', user.id);
                    await supabase.from('payables').insert(parsed.payables.map((p: any, idx: number) => ({
                      id: p.id ? `${user.id.slice(0, 8)}-${p.id}` : `${user.id.slice(0, 8)}-pb-${idx}-${Date.now()}`,
                      user_id: user.id,
                      supplier: p.supplier,
                      amount: Number(p.amount || 0),
                      due_date: p.due_date,
                      category: p.category || 'Vendor Bill',
                      status: p.status || 'DUE',
                    })));
                  }
                  if (Array.isArray(parsed.expenses) && parsed.expenses.length > 0) {
                    await supabase.from('expenses').delete().eq('user_id', user.id);
                    await supabase.from('expenses').insert(parsed.expenses.map((e: any, idx: number) => ({
                      id: e.id ? `${user.id.slice(0, 8)}-${e.id}` : `${user.id.slice(0, 8)}-exp-${idx}-${Date.now()}`,
                      user_id: user.id,
                      date: e.date,
                      category: e.category || 'Operating Expense',
                      amount: Number(e.amount || 0),
                    })));
                  }
                }
              } catch (backSyncErr) {
                console.warn('Back-sync to Supabase warning:', backSyncErr);
              }
              return;
            }
          } catch (sbErr) {
            console.warn('Supabase fetch error:', sbErr);
          }

          // 3. Brand-new real user with zero data connected yet -> Empty state (NO fallback to demo data)
          if (!hasLocal) {
            setLiveTransactions([]);
            setLivePayables([]);
            setLiveExpenses([]);
            setLiveCash(0);
            setIsDataLoadedFromDb(true);
            const needsOnboarding = localStorage.getItem(`flowshield_needs_onboarding_${user.id}`) === 'true';
            if (needsOnboarding) {
              setIsIntegrationModalOpen(true);
            }
          }
        }
      } catch (err) {
        console.warn('Data sync error:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isAuthenticated, user?.id, user?.isDemo]);

  const handleConnectZoho = () => {
    setConnectorInitialView('ZOHO');
    setIsIntegrationModalOpen(false);
    setIsConnectorOpen(true);
  };

  const handleConnectQuickBooks = () => {
    setConnectorInitialView('QUICKBOOKS');
    setIsIntegrationModalOpen(false);
    setIsConnectorOpen(true);
  };

  const handleSaveCompanyProfile = async (profile: {
    businessName: string;
    industryId: string;
    currency: string;
    country: string;
  }) => {
    try {
      await saveProfile({
        businessName: profile.businessName,
        industryId: profile.industryId as any,
        currency: profile.currency,
        country: profile.country,
      });

      // Update user state immediately in UI
      updateUserProfile({
        businessName: profile.businessName,
        industryId: profile.industryId,
      });

      // Directly sync to Supabase business_profile for this authenticated user
      if (user?.id) {
        await supabase.from('business_profile').upsert({
          id: user.id,
          user_id: user.id,
          business_name: profile.businessName,
          industry_id: profile.industryId,
          currency: profile.currency || 'INR',
          country: profile.country || 'India',
          cash_floor: 500000,
          is_demo: false,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn('Failed to save company profile:', e);
    }
  };

  const handleDataImported = async (data: {
    transactions: any[];
    payables: any[];
    expenses: any[];
    currentCash: number;
  }) => {
    setLiveTransactions(data.transactions);
    setLivePayables(data.payables);
    setLiveExpenses(data.expenses);
    setLiveCash(data.currentCash);
    setIsDataLoadedFromDb(true);

    // 1. Instant user-scoped and local persistent cache backup
    try {
      if (user?.id) {
        localStorage.setItem(`flowshield_persistent_ledger_${user.id}`, JSON.stringify({
          transactions: data.transactions,
          payables: data.payables,
          expenses: data.expenses,
          currentCash: data.currentCash,
        }));
        localStorage.setItem(`flowshield_data_connected_${user.id}`, 'true');
        localStorage.removeItem(`flowshield_needs_onboarding_${user.id}`);
      }
    } catch (e) {
      console.warn('LocalStorage ledger cache warning:', e);
    }

    // 2. Server database persistence (Postgres / PGlite via /api/import)
    try {
      await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentCash: data.currentCash,
          transactions: data.transactions,
          payables: data.payables,
          expenses: data.expenses,
        }),
      });
    } catch (apiErr) {
      console.warn('Backend /api/import sync error:', apiErr);
    }

    // 3. Supabase Cloud Sync (if authenticated with Supabase)
    if (user?.id) {
      console.log('[FlowShield] Starting Supabase sync for user:', user.id, {
        txCount: data.transactions?.length,
        pbCount: data.payables?.length,
        expCount: data.expenses?.length,
        cash: data.currentCash,
      });

      // 3a. Upsert configuration (cash & settings)
      const confRes = await supabase.from('configuration').upsert({
        id: user.id,
        user_id: user.id,
        current_cash: data.currentCash,
        cash_floor: cashFloorInput || 500000,
        forecast_weights: [0.5, 0.3, 0.2],
        supplier_delay_days: supplierDelayDays || 20,
      });
      if (confRes.error) {
        console.error('[FlowShield] ❌ configuration upsert failed:', confRes.error.code, confRes.error.message, confRes.error.details, confRes.error.hint);
      } else {
        console.log('[FlowShield] ✅ configuration saved');
      }

      // 3b. Transactions
      if (data.transactions?.length) {
        const delTx = await supabase.from('transactions').delete().eq('user_id', user.id);
        if (delTx.error) console.error('[FlowShield] ❌ transactions delete failed:', delTx.error.code, delTx.error.message);

        const txRows = data.transactions.map((tx: any, idx: number) => ({
          id: tx.id ? `${user.id.slice(0, 8)}-${tx.id}` : `${user.id.slice(0, 8)}-tx-${idx}-${Date.now()}`,
          user_id: user.id,
          date: tx.date,
          customer: tx.customer,
          invoice_amount: Number(tx.invoice_amount || tx.amount || 0),
          expected_payment_date: tx.expected_payment_date || tx.date,
          collection_probability: Number(tx.collection_probability ?? 0.95),
          status: tx.status || 'PENDING',
        }));
        const insTx = await supabase.from('transactions').insert(txRows);
        if (insTx.error) {
          console.error('[FlowShield] ❌ transactions insert failed:', insTx.error.code, insTx.error.message, insTx.error.details, insTx.error.hint);
          console.error('[FlowShield] Sample row that failed:', txRows[0]);
        } else {
          console.log(`[FlowShield] ✅ ${txRows.length} transactions saved`);
        }
      }

      // 3c. Payables
      if (data.payables?.length) {
        const delPb = await supabase.from('payables').delete().eq('user_id', user.id);
        if (delPb.error) console.error('[FlowShield] ❌ payables delete failed:', delPb.error.code, delPb.error.message);

        const pbRows = data.payables.map((pb: any, idx: number) => ({
          id: pb.id ? `${user.id.slice(0, 8)}-${pb.id}` : `${user.id.slice(0, 8)}-pb-${idx}-${Date.now()}`,
          user_id: user.id,
          supplier: pb.supplier,
          amount: Number(pb.amount || 0),
          due_date: pb.due_date,
          category: pb.category || 'Vendor Bill',
          status: pb.status || 'DUE',
        }));
        const insPb = await supabase.from('payables').insert(pbRows);
        if (insPb.error) {
          console.error('[FlowShield] ❌ payables insert failed:', insPb.error.code, insPb.error.message, insPb.error.details, insPb.error.hint);
          console.error('[FlowShield] Sample row that failed:', pbRows[0]);
        } else {
          console.log(`[FlowShield] ✅ ${pbRows.length} payables saved`);
        }
      }

      // 3d. Expenses
      if (data.expenses?.length) {
        const delExp = await supabase.from('expenses').delete().eq('user_id', user.id);
        if (delExp.error) console.error('[FlowShield] ❌ expenses delete failed:', delExp.error.code, delExp.error.message);

        const expRows = data.expenses.map((exp: any, idx: number) => ({
          id: exp.id ? `${user.id.slice(0, 8)}-${exp.id}` : `${user.id.slice(0, 8)}-exp-${idx}-${Date.now()}`,
          user_id: user.id,
          date: exp.date,
          category: exp.category || 'Operating Expense',
          amount: Number(exp.amount || 0),
        }));
        const insExp = await supabase.from('expenses').insert(expRows);
        if (insExp.error) {
          console.error('[FlowShield] ❌ expenses insert failed:', insExp.error.code, insExp.error.message, insExp.error.details, insExp.error.hint);
          console.error('[FlowShield] Sample row that failed:', expRows[0]);
        } else {
          console.log(`[FlowShield] ✅ ${expRows.length} expenses saved`);
        }
      }

      console.log('[FlowShield] Supabase sync complete for user:', user.id);
    }
    setIsIntegrationModalOpen(false);
  };

  const handleLoadSampleData = () => {
    if (!user?.isDemo) return;
    setLiveTransactions(demoTransactions);
    setLivePayables(demoPayables);
    setLiveExpenses(demoExpenses);
    setLiveCash(demoConfig.current_cash);
    setIsDataLoadedFromDb(true);
    setIsIntegrationModalOpen(false);
  };

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
      } else if (connectorResult === 'error') {
        // OAuth flow failed — show connector with error context
        console.error(`Connector error (${provider}):`, errorMsg);
        setIsConnectorOpen(true);
      }
    }
  }, [user]);

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

  // Derive current data from DB-sourced live state (no fallback for real users)
  const currentTransactions = user?.isDemo ? (liveTransactions || demoTransactions) : (liveTransactions || []);
  const currentPayables = user?.isDemo ? (livePayables || demoPayables) : (livePayables || []);
  const currentExpenses = user?.isDemo ? (liveExpenses || demoExpenses) : (liveExpenses || []);
  const currentCashVal = user?.isDemo ? (liveCash !== null ? liveCash : demoConfig.current_cash) : (liveCash !== null ? liveCash : 0);

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
        if (user?.id) {
          await supabase.from('configuration').upsert({
            id: user.id,
            user_id: user.id,
            current_cash: currentCashVal,
            cash_floor: cashFloorInput,
            supplier_delay_days: supplierDelayDays,
            forecast_weights: [0.5, 0.3, 0.2],
          });
        }
      } catch (e) {
        console.error('Failed to save settings:', e);
      }
    };

    const timer = setTimeout(() => {
      updateSettingsInDb();
    }, 500);
    return () => clearTimeout(timer);
  }, [cashFloorInput, supplierDelayDays, currentCashVal, liveCash, user?.id]);

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
  const autoCashFloor = useMemo(() => {
    return computeDynamicCashFloor(currentPayables, currentExpenses);
  }, [currentPayables, currentExpenses]);

  const config: Config = useMemo(
    () => ({
      current_cash: currentCashVal,
      cash_floor: autoCashFloor,
      forecast_weights: [0.5, 0.3, 0.2],
      supplier_delay_days: supplierDelayDays,
    }),
    [currentCashVal, supplierDelayDays, autoCashFloor]
  );

  // Baseline simulation without overrides (to always preserve counterfactual options)
  const baselineSimulationResult = useMemo(
    () =>
      runSimulationEngine(
        config,
        currentTransactions,
        currentPayables,
        currentExpenses,
        demoInventory,
        demoSuppliers,
        demoSales
      ),
    [config, currentTransactions, currentPayables, currentExpenses]
  );

  const simulationResult = useMemo(
    () => {
      if (!overrides) return baselineSimulationResult;
      const resultWithOverrides = runSimulationEngine(
        config,
        currentTransactions,
        currentPayables,
        currentExpenses,
        demoInventory,
        demoSuppliers,
        demoSales,
        overrides
      );
      // Ensure counterfactual list remains populated from baseline
      return {
        ...resultWithOverrides,
        counterfactuals: baselineSimulationResult.counterfactuals,
      };
    },
    [config, currentTransactions, currentPayables, currentExpenses, overrides, baselineSimulationResult]
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

  if (isAuthLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isLight ? 'bg-[#FFFFFF] text-[#171717]' : 'bg-[#000000] text-[#EDEDED]'}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono tracking-wider opacity-60 uppercase">Loading FlowShield...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView onSwitchDemo={switchDemo} />;
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
          onLogout={signOut}
          onToggleSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          businessName={user?.businessName || businessProfile.businessName}
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
              businessName={user?.businessName || businessProfile.businessName}
              currentTab={dashboardSubTab}
              onTabChange={setDashboardSubTab}
              hasData={hasConnectedData}
              onOpenConnector={() => {
                setConnectorInitialView('SELECT');
                setIsConnectorOpen(true);
              }}
              onOpenCsvUpload={() => setIsIntegrationModalOpen(true)}
              onLoadSampleData={user?.isDemo ? handleLoadSampleData : undefined}
            />
          )}

          {/* VIEW: FINANCIAL TIME MACHINE */}
          {activeTab === 'time-machine' && (
            hasConnectedData ? (
              <FinancialTimeMachine
                simulationResult={simulationResult}
                cashFloor={config.cash_floor}
              />
            ) : (
              <EmptyStateView
                title="Cash Flow Timeline Requires Financial Data"
                description="Connect your accounting platform or upload a bank/ledger CSV to trace inflows, payables, and forward liquidity timeline."
                onOpenConnector={() => {
                  setConnectorInitialView('SELECT');
                  setIsConnectorOpen(true);
                }}
                onOpenCsvUpload={() => setIsIntegrationModalOpen(true)}
                onLoadSampleData={user?.isDemo ? handleLoadSampleData : undefined}
              />
            )
          )}

          {/* WHAT-IF SIMULATOR */}
          {activeTab === 'what-if' && (
            hasConnectedData ? (
              <WhatIfSimulator
                config={config}
                transactions={currentTransactions}
                payables={currentPayables}
                expenses={currentExpenses}
                currentSimulationResult={simulationResult}
                onVisualizeIn3D={(scenarioId, paramValue, whatIfResult) => {
                  if (scenarioId === 'supplier-delay') {
                    setSupplierDelayDays(paramValue);
                  }
                  setActiveTab('simulation');
                }}
                industryProfile={industryProfile}
              />
            ) : (
              <EmptyStateView
                title="Decision Impact Analysis Requires Financial Records"
                description="Import your ledger or connect your books to test pricing changes, supplier delays, and revenue contraction scenarios on real figures."
                onOpenConnector={() => {
                  setConnectorInitialView('SELECT');
                  setIsConnectorOpen(true);
                }}
                onOpenCsvUpload={() => setIsIntegrationModalOpen(true)}
                onLoadSampleData={user?.isDemo ? handleLoadSampleData : undefined}
              />
            )
          )}

          {/* VIEW 2: MONTE CARLO DISTRIBUTION */}
          {activeTab === 'driver-analysis' && (
            hasConnectedData ? (
              <MonteCarloChart
                simulationResult={simulationResult}
                cashFloor={config.cash_floor}
                config={config}
                transactions={currentTransactions}
                payables={currentPayables}
                expenses={currentExpenses}
                inventory={demoInventory}
                suppliers={demoSuppliers}
                historicalSales={demoSales}
              />
            ) : (
              <EmptyStateView
                title="Liquidity Risk Engine Requires Financial Data"
                description="Run 500-iteration Monte Carlo simulations across payment delays, collection variance, and demand volatility once your records are connected."
                onOpenConnector={() => {
                  setConnectorInitialView('SELECT');
                  setIsConnectorOpen(true);
                }}
                onOpenCsvUpload={() => setIsIntegrationModalOpen(true)}
                onLoadSampleData={user?.isDemo ? handleLoadSampleData : undefined}
              />
            )
          )}

          {/* VIEW 3: BUSINESS MINIATURE MODEL & DECISION SIMULATOR */}
          {activeTab === 'simulation' && (
            hasConnectedData ? (
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
            ) : (
              <EmptyStateView
                title="Business Miniature Model Requires Financial Records"
                description="Upload your private invoices, payables, and suppliers to model your supply chain and forecast inventory delivery impacts."
                onOpenConnector={() => {
                  setConnectorInitialView('SELECT');
                  setIsConnectorOpen(true);
                }}
                onOpenCsvUpload={() => setIsIntegrationModalOpen(true)}
                onLoadSampleData={user?.isDemo ? handleLoadSampleData : undefined}
              />
            )
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
                await handleDataImported({
                  transactions: parsed.transactions,
                  payables: parsed.payables,
                  expenses: parsed.expenses,
                  currentCash: parsed.currentCash !== null ? parsed.currentCash : currentCashVal,
                });
              }}
              onResetDemoData={async () => {
                try {
                  await fetch('/api/reset', { method: 'POST' });
                  localStorage.removeItem('flowshield_persistent_ledger');
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
        initialView={connectorInitialView}
        onConnected={() => {
          if (user?.id) {
            localStorage.setItem(`flowshield_data_connected_${user.id}`, 'true');
          }
          setIsConnectorOpen(false);
          // Reload financial data from DB
          fetch('/api/financials')
            .then((res) => safeParseJson(res))
            .then((data) => {
              if (data?.config) {
                setCashFloorInput(data.config.cash_floor);
                setSupplierDelayDays(data.config.supplier_delay_days);
                setLiveCash(data.config.current_cash);
              }
              if (data?.transactions) setLiveTransactions(data.transactions);
              if (data?.payables) setLivePayables(data.payables);
              if (data?.expenses) setLiveExpenses(data.expenses);
            })
            .catch(() => {});
        }}
        isConnected={hasConnectedData}
        onDataImported={handleDataImported}
      />

      {/* New User Integration Onboarding Modal */}
      <IntegrationOnboardingModal
        isOpen={isIntegrationModalOpen}
        onClose={() => setIsIntegrationModalOpen(false)}
        onConnectZoho={handleConnectZoho}
        onConnectQuickBooks={handleConnectQuickBooks}
        onDataImported={handleDataImported}
        onSaveCompanyProfile={handleSaveCompanyProfile}
        businessName={user?.businessName || businessProfile.businessName}
        industryId={user?.industryId || industryProfile.id}
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
