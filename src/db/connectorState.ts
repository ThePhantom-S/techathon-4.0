import fs from 'fs';
import path from 'path';

const STATE_FILE = path.join(process.cwd(), 'flowshield_connector_state.json');

export interface ProviderState {
  connected: boolean;
  clientId: string;
  clientSecret: string; // encrypted at rest in production; plain in MVP
  organizationId?: string; // Zoho org ID or QuickBooks realm ID
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: string;
  companyName?: string;
  lastSynced?: string;
  invoiceCount?: number;
  billCount?: number;
  currentCash?: number;
}

interface ConnectorStore {
  zoho: ProviderState;
  quickbooks: ProviderState;
}

const DEFAULT_STORE: ConnectorStore = {
  zoho: { connected: false, clientId: '', clientSecret: '' },
  quickbooks: { connected: false, clientId: '', clientSecret: '' },
};

function readStore(): ConnectorStore {
  try {
    if (!fs.existsSync(STATE_FILE)) {
      fs.writeFileSync(STATE_FILE, JSON.stringify(DEFAULT_STORE, null, 2), 'utf-8');
      return DEFAULT_STORE;
    }
    const raw = fs.readFileSync(STATE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return DEFAULT_STORE;
  }
}

function writeStore(store: ConnectorStore) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing connector state:', e);
  }
}

// ── Zoho ──────────────────────────────────────────────────────────────────
export function getZohoState(): ProviderState {
  return readStore().zoho;
}

export function saveZohoCredentials(clientId: string, clientSecret: string, organizationId: string) {
  const store = readStore();
  store.zoho = { ...store.zoho, clientId, clientSecret, organizationId };
  writeStore(store);
}

export function saveZohoTokens(accessToken: string, refreshToken: string) {
  const store = readStore();
  store.zoho.accessToken = accessToken;
  store.zoho.refreshToken = refreshToken;
  store.zoho.tokenExpiry = new Date(Date.now() + 3600 * 1000).toISOString();
  store.zoho.connected = true;
  writeStore(store);
}

export function updateZohoSyncResult(data: {
  companyName?: string;
  invoiceCount?: number;
  billCount?: number;
  currentCash?: number;
}) {
  const store = readStore();
  store.zoho.lastSynced = new Date().toISOString();
  if (data.companyName) store.zoho.companyName = data.companyName;
  if (data.invoiceCount !== undefined) store.zoho.invoiceCount = data.invoiceCount;
  if (data.billCount !== undefined) store.zoho.billCount = data.billCount;
  if (data.currentCash !== undefined) store.zoho.currentCash = data.currentCash;
  writeStore(store);
}

export function disconnectZoho() {
  const store = readStore();
  store.zoho = { connected: false, clientId: store.zoho.clientId, clientSecret: store.zoho.clientSecret };
  writeStore(store);
}

// ── QuickBooks ────────────────────────────────────────────────────────────
export function getQuickBooksState(): ProviderState {
  return readStore().quickbooks;
}

export function saveQuickBooksCredentials(clientId: string, clientSecret: string, realmId?: string) {
  const store = readStore();
  store.quickbooks = { ...store.quickbooks, clientId, clientSecret, organizationId: realmId };
  writeStore(store);
}

export function saveQuickBooksTokens(accessToken: string, refreshToken: string, realmId: string) {
  const store = readStore();
  store.quickbooks.accessToken = accessToken;
  store.quickbooks.refreshToken = refreshToken;
  store.quickbooks.organizationId = realmId;
  store.quickbooks.tokenExpiry = new Date(Date.now() + 3600 * 1000).toISOString();
  store.quickbooks.connected = true;
  writeStore(store);
}

export function updateQuickBooksSyncResult(data: {
  companyName?: string;
  invoiceCount?: number;
  billCount?: number;
  currentCash?: number;
}) {
  const store = readStore();
  store.quickbooks.lastSynced = new Date().toISOString();
  if (data.companyName) store.quickbooks.companyName = data.companyName;
  if (data.invoiceCount !== undefined) store.quickbooks.invoiceCount = data.invoiceCount;
  if (data.billCount !== undefined) store.quickbooks.billCount = data.billCount;
  if (data.currentCash !== undefined) store.quickbooks.currentCash = data.currentCash;
  writeStore(store);
}

export function disconnectQuickBooks() {
  const store = readStore();
  store.quickbooks = { connected: false, clientId: store.quickbooks.clientId, clientSecret: store.quickbooks.clientSecret };
  writeStore(store);
}
