import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { BusinessProfile, IndustryId, IndustryProfile } from '../types';
import { getIndustryProfile } from '../config/industries';
import { safeParseJson } from '../utils/safeJson';
import { setActiveCurrency } from '../utils/currency';

const DEFAULT_PROFILE: BusinessProfile = {
  id: 'shakti-config',
  businessName: 'Shakti Electronics',
  industryId: 'manufacturing',
  currency: 'INR',
  country: 'India',
  cashFloor: 500000,
  isDemo: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

interface BusinessProfileContextValue {
  businessProfile: BusinessProfile;
  industryProfile: IndustryProfile;
  isLoading: boolean;
  isOnboarding: boolean;
  /** Save business profile (name/industry/currency/country/cashFloor). Financial records are preserved. */
  saveProfile: (input: {
    businessName?: string;
    industryId?: IndustryId;
    currency?: string;
    country?: string;
    cashFloor?: number;
  }) => Promise<BusinessProfile>;
  /** Switch to an industry demo dataset (clearly synthetic) and reload ledger data. */
  switchDemo: (industryId: IndustryId) => Promise<void>;
  /** Called by the onboarding flow — persists the chosen industry (with demo dataset when available). */
  completeOnboarding: (industryId: IndustryId, businessName?: string) => Promise<void>;
  /** Callback the App shell uses to reload live financial data after a demo switch. */
  onLedgerReloaded?: (data: {
    currentCash: number;
    transactions: any[];
    payables: any[];
    expenses: any[];
    cashFloor: number;
    supplierDelayDays: number;
  }) => void;
  setOnLedgerReloaded: (fn: ((data: any) => void) | undefined) => void;
}

const BusinessProfileContext = createContext<BusinessProfileContextValue | undefined>(undefined);

export const BusinessProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [onLedgerReloaded, setOnLedgerReloaded] = useState<BusinessProfileContextValue['onLedgerReloaded']>(undefined);

  // Load profile from the server (single source of truth)
  useEffect(() => {
    let cancelled = false;
    fetch('/api/business/profile')
      .then((res) => safeParseJson(res))
      .then((data) => {
        if (cancelled || !data?.profile) return;
        setBusinessProfile(data.profile);
        if (data.profile.currency) {
          setActiveCurrency(data.profile.currency);
        }
        // First-visit onboarding: only when the user has never picked an industry.
        if (!localStorage.getItem('flowshield_onboarded')) {
          setIsOnboarding(true);
        }
      })
      .catch(() => {
        if (!cancelled && !localStorage.getItem('flowshield_onboarded')) {
          setIsOnboarding(true);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshFromServer = useCallback(async () => {
    try {
      const res = await fetch('/api/business/profile');
      const data = await safeParseJson(res);
      if (data?.profile) {
        setBusinessProfile(data.profile);
        if (data.profile.currency) setActiveCurrency(data.profile.currency);
      }
    } catch (e) {
      console.error('Failed to refresh business profile:', e);
    }
  }, []);

  const saveProfile = useCallback(
    async (input: {
      businessName?: string;
      industryId?: IndustryId;
      currency?: string;
      country?: string;
      cashFloor?: number;
    }) => {
      if (input.currency) {
        setActiveCurrency(input.currency);
      }
      try {
        const res = await fetch('/api/business/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        const data = await safeParseJson(res);
        if (data?.profile) {
          setBusinessProfile(data.profile);
          if (data.profile.currency) setActiveCurrency(data.profile.currency);
          return data.profile as BusinessProfile;
        }
      } catch (err) {
        console.warn('Network error saving profile to server, updating locally:', err);
      }

      // Resilient client-side fallback
      const fallbackProfile: BusinessProfile = {
        ...businessProfile,
        businessName: input.businessName || businessProfile.businessName,
        industryId: input.industryId || businessProfile.industryId,
        currency: input.currency || businessProfile.currency,
        country: input.country || businessProfile.country,
        cashFloor: input.cashFloor !== undefined ? input.cashFloor : businessProfile.cashFloor,
        updatedAt: new Date().toISOString(),
      };
      setBusinessProfile(fallbackProfile);
      return fallbackProfile;
    },
    [businessProfile]
  );

  const switchDemo = useCallback(
    async (industryId: IndustryId) => {
      const res = await fetch('/api/business/switch-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industryId }),
      });
      const data = await safeParseJson(res);
      if (!res.ok || data?.error) {
        throw new Error(data?.error || `Server error (${res.status}) switching demo business`);
      }
      if (data?.profile) setBusinessProfile(data.profile);
      onLedgerReloaded?.({
        currentCash: data.currentCash,
        transactions: data.transactions || [],
        payables: data.payables || [],
        expenses: data.expenses || [],
        cashFloor: data.profile?.cashFloor ?? 500000,
        supplierDelayDays: 20,
      });
      return data;
    },
    [onLedgerReloaded]
  );

  const completeOnboarding = useCallback(
    async (industryId: IndustryId, businessName?: string) => {
      try {
        // Prefer the industry demo dataset when one exists (demo story flow).
        const demo = ['manufacturing', 'retail', 'saas', 'restaurant', 'construction'].includes(industryId);
        let demoName: string | undefined;
        if (demo) {
          try {
            const res = await switchDemo(industryId);
            demoName = (res as any)?.profile?.businessName;
          } catch (demoErr) {
            console.warn('Demo switch failed during onboarding:', demoErr);
          }
        }
        // Persist the chosen industry; keep the demo business name unless the
        // user typed their own.
        await saveProfile({
          industryId,
          businessName: businessName || demoName || businessProfile.businessName,
        });
      } catch (e) {
        console.warn('Onboarding save failed, persisting locally:', e);
        await saveProfile({ industryId, businessName: businessName || businessProfile.businessName });
      } finally {
        localStorage.setItem('flowshield_onboarded', 'true');
        setIsOnboarding(false);
      }
    },
    [businessProfile.businessName, saveProfile, switchDemo]
  );

  const industryProfile = getIndustryProfile(businessProfile.industryId);

  return (
    <BusinessProfileContext.Provider
      value={{
        businessProfile,
        industryProfile,
        isLoading,
        isOnboarding,
        saveProfile,
        switchDemo,
        completeOnboarding,
        onLedgerReloaded,
        setOnLedgerReloaded,
      }}
    >
      {children}
    </BusinessProfileContext.Provider>
  );
};

export function useBusinessProfile(): BusinessProfileContextValue {
  const ctx = useContext(BusinessProfileContext);
  if (!ctx) {
    throw new Error('useBusinessProfile must be used within BusinessProfileProvider');
  }
  return ctx;
}