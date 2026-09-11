/**
 * currency.ts
 * Centralized multi-currency formatting & profile store for FlowShield.
 */

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
  unitLabel: string;
  formatShort: (val: number) => string;
  formatFull: (val: number) => string;
}

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    locale: 'en-IN',
    unitLabel: '₹L',
    formatShort: (val: number) => {
      const absVal = Math.abs(val);
      const sign = val < 0 ? '-' : '';
      const lakhs = absVal / 100000;
      if (lakhs >= 100) {
        return `${sign}₹${(lakhs / 100).toFixed(2)}Cr`;
      }
      if (lakhs >= 1) {
        return `${sign}₹${lakhs.toFixed(1)}L`;
      }
      return `${sign}₹${Math.round(absVal).toLocaleString('en-IN')}`;
    },
    formatFull: (val: number) => {
      const sign = val < 0 ? '-' : '';
      return `${sign}₹${Math.round(Math.abs(val)).toLocaleString('en-IN')}`;
    },
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    locale: 'en-US',
    unitLabel: '$K',
    formatShort: (val: number) => {
      const absVal = Math.abs(val);
      const sign = val < 0 ? '-' : '';
      if (absVal >= 1_000_000) {
        return `${sign}$${(absVal / 1_000_000).toFixed(2)}M`;
      }
      if (absVal >= 1_000) {
        return `${sign}$${(absVal / 1_000).toFixed(1)}K`;
      }
      return `${sign}$${Math.round(absVal).toLocaleString('en-US')}`;
    },
    formatFull: (val: number) => {
      const sign = val < 0 ? '-' : '';
      return `${sign}$${Math.round(Math.abs(val)).toLocaleString('en-US')}`;
    },
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    locale: 'de-DE',
    unitLabel: '€K',
    formatShort: (val: number) => {
      const absVal = Math.abs(val);
      const sign = val < 0 ? '-' : '';
      if (absVal >= 1_000_000) {
        return `${sign}€${(absVal / 1_000_000).toFixed(2)}M`;
      }
      if (absVal >= 1_000) {
        return `${sign}€${(absVal / 1_000).toFixed(1)}K`;
      }
      return `${sign}€${Math.round(absVal).toLocaleString('de-DE')}`;
    },
    formatFull: (val: number) => {
      const sign = val < 0 ? '-' : '';
      return `${sign}€${Math.round(Math.abs(val)).toLocaleString('de-DE')}`;
    },
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    locale: 'en-GB',
    unitLabel: '£K',
    formatShort: (val: number) => {
      const absVal = Math.abs(val);
      const sign = val < 0 ? '-' : '';
      if (absVal >= 1_000_000) {
        return `${sign}£${(absVal / 1_000_000).toFixed(2)}M`;
      }
      if (absVal >= 1_000) {
        return `${sign}£${(absVal / 1_000).toFixed(1)}K`;
      }
      return `${sign}£${Math.round(absVal).toLocaleString('en-GB')}`;
    },
    formatFull: (val: number) => {
      const sign = val < 0 ? '-' : '';
      return `${sign}£${Math.round(Math.abs(val)).toLocaleString('en-GB')}`;
    },
  },
};

let currentActiveCurrency: CurrencyCode = 'INR';

export function setActiveCurrency(code: string | undefined | null): void {
  if (!code) return;
  const upper = code.toUpperCase() as CurrencyCode;
  if (SUPPORTED_CURRENCIES[upper]) {
    currentActiveCurrency = upper;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('flowshield_currency', upper);
      }
    } catch {}
  }
}

export function getActiveCurrency(): CurrencyCode {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem('flowshield_currency') as CurrencyCode;
      if (stored && SUPPORTED_CURRENCIES[stored]) {
        return stored;
      }
    } catch {}
  }
  return currentActiveCurrency || 'INR';
}

export function getCurrencyInfo(currency?: string): CurrencyInfo {
  const code = (currency || getActiveCurrency()).toUpperCase() as CurrencyCode;
  return SUPPORTED_CURRENCIES[code] || SUPPORTED_CURRENCIES.INR;
}

export function getCurrencySymbol(currency?: string): string {
  return getCurrencyInfo(currency).symbol;
}

export function formatCurrency(val: number, currency?: string): string {
  if (val === undefined || val === null || isNaN(val)) {
    return getCurrencySymbol(currency) + '0';
  }
  return getCurrencyInfo(currency).formatShort(val);
}

export function formatCurrencyFull(val: number, currency?: string): string {
  if (val === undefined || val === null || isNaN(val)) {
    return getCurrencySymbol(currency) + '0';
  }
  return getCurrencyInfo(currency).formatFull(val);
}
