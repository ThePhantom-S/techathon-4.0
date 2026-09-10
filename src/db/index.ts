import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { BusinessProfile, IndustryId, Transaction, Payable, Expense, Config } from '../types';
import { isValidIndustryId } from '../config/industries';
import { DEFAULT_CONFIG, INITIAL_TRANSACTIONS, INITIAL_PAYABLES, INITIAL_EXPENSES } from '../engine/sampleData';
import { IndustryDemoProfile, getIndustryDemoProfile } from '../engine/demoProfiles';

dotenv.config();

// ── Business Profile JSON mirror (used when SQL persistence is unavailable) ──
const BUSINESS_PROFILE_FILE = path.join(process.cwd(), 'flowshield_business_profile.json');

const DEFAULT_BUSINESS_PROFILE: BusinessProfile = {
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

dotenv.config();

const { Pool } = pg;

// ── Database Connection & Unified Query Runner ────────────────────────────────
const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'cashshock_user',
  password: process.env.DB_PASSWORD || 'cashshock_password',
  database: process.env.DB_NAME || 'cashshock_db',
  max: 5,
  connectionTimeoutMillis: 1500,
});

let pgliteInstance: PGlite | null = null;
let activeEngine: 'container' | 'pglite' | 'fallback' = 'pglite';

async function getOrCreatePGlite(): Promise<PGlite> {
  if (!pgliteInstance) {
    pgliteInstance = new PGlite();
  }
  return pgliteInstance;
}

export async function dbQuery(sql: string, params: any[] = []): Promise<{ rows: any[] }> {
  try {
    if (activeEngine === 'container') {
      return await pool.query(sql, params);
    } else if (activeEngine === 'pglite') {
      const db = await getOrCreatePGlite();
      return await db.query(sql, params);
    } else {
      return { rows: [] };
    }
  } catch (err) {
    console.warn('dbQuery warning (running with fallback):', (err as any)?.message || err);
    return { rows: [] };
  }
}

function formatDate(val: any): string {
  if (!val) return '';
  if (val instanceof Date) return val.toISOString().split('T')[0];
  if (typeof val === 'string') return val.split('T')[0];
  return String(val).split('T')[0];
}

function parseArray(val: any): number[] {
  if (Array.isArray(val)) return val.map(Number);
  if (typeof val === 'string') {
    // string like "{0.5,0.3,0.2}" or "[0.5, 0.3, 0.2]"
    const cleaned = val.replace(/[\{\}\[\]]/g, '');
    return cleaned.split(',').map(v => parseFloat(v.trim()));
  }
  return [0.5, 0.3, 0.2];
}

// ── Business Profile Helpers ─────────────────────────────────────────────

function readProfileFromJson(): BusinessProfile | null {
  try {
    if (!fs.existsSync(BUSINESS_PROFILE_FILE)) return null;
    const raw = fs.readFileSync(BUSINESS_PROFILE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && isValidIndustryId(parsed.industryId)) return parsed as BusinessProfile;
    return null;
  } catch {
    return null;
  }
}

let inMemoryProfile: BusinessProfile = { ...DEFAULT_BUSINESS_PROFILE };

function writeProfileToJson(profile: BusinessProfile) {
  inMemoryProfile = { ...profile };
  if (process.env.VERCEL) return;
  try {
    fs.writeFileSync(BUSINESS_PROFILE_FILE, JSON.stringify(profile, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Failed to mirror business profile to JSON:', (e as any)?.message || e);
  }
}

/** Normalizes any date-ish value to a Postgres/ISO-compatible timestamp string. */
function toSqlTimestamp(val: any): string {
  if (!val) return new Date().toISOString();
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function mapProfileRow(row: any): BusinessProfile {
  const industryId: IndustryId = isValidIndustryId(row.industry_id) ? row.industry_id : 'manufacturing';
  return {
    id: row.id || 'shakti-config',
    businessName: row.business_name || 'Shakti Electronics',
    industryId,
    currency: row.currency || 'INR',
    country: row.country || 'India',
    cashFloor: parseFloat(row.cash_floor ?? 500000),
    isDemo: row.is_demo === true || row.is_demo === 't' || row.is_demo === 'true' || row.is_demo === 1,
    createdAt: toSqlTimestamp(row.created_at),
    updatedAt: toSqlTimestamp(row.updated_at),
  };
}

export async function getBusinessProfile(): Promise<BusinessProfile> {
  try {
    const res = await dbQuery(`SELECT * FROM business_profile WHERE id = 'shakti-config'`);
    if (res?.rows?.[0]) {
      const profile = mapProfileRow(res.rows[0]);
      inMemoryProfile = { ...profile };
      return profile;
    }
  } catch (err) {
    console.warn('getBusinessProfile SQL read failed (using JSON mirror):', (err as any)?.message || err);
  }

  const jsonProfile = readProfileFromJson();
  if (jsonProfile) {
    inMemoryProfile = { ...jsonProfile };
    return jsonProfile;
  }
  return inMemoryProfile || { ...DEFAULT_BUSINESS_PROFILE };
}

export async function saveBusinessProfile(input: {
  businessName?: string;
  industryId?: IndustryId;
  currency?: string;
  country?: string;
  cashFloor?: number;
  isDemo?: boolean;
}): Promise<BusinessProfile> {
  const current = await getBusinessProfile();
  const next: BusinessProfile = {
    ...current,
    businessName: input.businessName !== undefined ? input.businessName : current.businessName,
    industryId: input.industryId !== undefined ? input.industryId : current.industryId,
    currency: input.currency !== undefined ? input.currency : current.currency,
    country: input.country !== undefined ? input.country : current.country,
    cashFloor: input.cashFloor !== undefined ? input.cashFloor : current.cashFloor,
    isDemo: input.isDemo !== undefined ? input.isDemo : current.isDemo,
    updatedAt: new Date().toISOString(),
  };

  inMemoryProfile = { ...next };

  // Mirror to JSON always (works in every engine mode)
  writeProfileToJson(next);

  try {
    const sqlCreatedAt = toSqlTimestamp(next.createdAt);
    const sqlUpdatedAt = toSqlTimestamp(next.updatedAt);
    await dbQuery(`
      INSERT INTO business_profile (id, business_name, industry_id, currency, country, cash_floor, is_demo, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        business_name = EXCLUDED.business_name,
        industry_id = EXCLUDED.industry_id,
        currency = EXCLUDED.currency,
        country = EXCLUDED.country,
        cash_floor = EXCLUDED.cash_floor,
        is_demo = EXCLUDED.is_demo,
        updated_at = EXCLUDED.updated_at
    `, [
      next.id, next.businessName, next.industryId, next.currency, next.country,
      next.cashFloor, next.isDemo, sqlCreatedAt, sqlUpdatedAt,
    ]);

    await dbQuery(`
      INSERT INTO audit_logs (action, details)
      VALUES ('BUSINESS_PROFILE', 'Industry: ' || $1 || ', Business: ' || $2)
    `, [next.industryId, next.businessName]);
  } catch (err) {
    console.warn('saveBusinessProfile SQL write failed (JSON mirror kept):', (err as any)?.message || err);
  }

  return next;
}

export async function setBusinessIndustry(industryId: IndustryId): Promise<BusinessProfile> {
  return saveBusinessProfile({ industryId });
}

/**
 * Switches the demo business to an industry: loads that industry's synthetic
 * dataset into the ledger AND updates the business profile. Financial records
 * are replaced only as part of an explicit demo-switch action.
 */
export async function switchDemoBusiness(industryId: string): Promise<{ profile: BusinessProfile; demo: IndustryDemoProfile } | null> {
  const demo = getIndustryDemoProfile(industryId);
  if (!demo) return null;

  await dbQuery(`DELETE FROM transactions`);
  await dbQuery(`DELETE FROM payables`);
  await dbQuery(`DELETE FROM expenses`);

  for (const tx of demo.transactions) {
    await dbQuery(`
      INSERT INTO transactions (id, date, customer, invoice_amount, expected_payment_date, collection_probability, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [tx.id, tx.date, tx.customer, tx.invoice_amount, tx.expected_payment_date, tx.collection_probability, tx.status]);
  }
  for (const pay of demo.payables) {
    await dbQuery(`
      INSERT INTO payables (id, supplier, amount, due_date, category, status)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [pay.id, pay.supplier, pay.amount, pay.due_date, pay.category, pay.status]);
  }
  for (const exp of demo.expenses) {
    await dbQuery(`
      INSERT INTO expenses (id, date, category, amount)
      VALUES ($1, $2, $3, $4)
    `, [exp.id, exp.date, exp.category, exp.amount]);
  }

  await dbQuery(`
    UPDATE configuration
    SET current_cash = $1, cash_floor = $2, supplier_delay_days = $3
    WHERE id = 'shakti-config'
  `, [demo.config.current_cash, demo.config.cash_floor, demo.config.supplier_delay_days]);

  const profile = await saveBusinessProfile({
    businessName: demo.businessName,
    industryId: demo.industryId as IndustryId,
    cashFloor: demo.config.cash_floor,
    isDemo: true,
  });

  await dbQuery(`
    INSERT INTO audit_logs (action, details)
    VALUES ('SWITCH_DEMO', 'Industry: ' || $1 || ', Business: ' || $2)
  `, [demo.industryId, demo.businessName]);

  return { profile, demo };
}

// ── Database Initialization ──────────────────────────────────────────────
export async function initDb() {
  if (process.env.VERCEL) {
    // In Vercel serverless, avoid TCP timeout to 127.0.0.1
    try {
      activeEngine = 'pglite';
      const db = await getOrCreatePGlite();
      if (db && typeof (db as any).waitReady === 'function') {
        await (db as any).waitReady();
      }
      console.log('Successfully initialized real embedded PostgreSQL database');
    } catch (pgliteErr) {
      console.warn('PGlite engine failed to load (running in serverless fallback mode):', (pgliteErr as any)?.message || pgliteErr);
      activeEngine = 'fallback';
      return;
    }
  } else {
    console.log('Attempting connection to PostgreSQL database container...');
    try {
      const client = await pool.connect();
      console.log('Successfully connected to PostgreSQL container on port ' + (process.env.DB_PORT || '5432'));
      activeEngine = 'container';
      client.release();
    } catch (err) {
      console.log('PostgreSQL container not found. Initializing real embedded PostgreSQL (PGlite engine)...');
      try {
        activeEngine = 'pglite';
        const db = await getOrCreatePGlite();
        if (db && typeof (db as any).waitReady === 'function') {
          await (db as any).waitReady();
        }
        console.log(`Successfully initialized real embedded PostgreSQL database`);
      } catch (pgliteErr) {
        console.warn('PGlite engine failed to load (running in serverless fallback mode):', (pgliteErr as any)?.message || pgliteErr);
        activeEngine = 'fallback';
        return;
      }
    }
  }

  // 1. Create SQL tables
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS configuration (
      id VARCHAR(50) PRIMARY KEY,
      current_cash NUMERIC(15, 2) NOT NULL,
      cash_floor NUMERIC(15, 2) NOT NULL,
      forecast_weights NUMERIC(3, 2)[] NOT NULL,
      supplier_delay_days INTEGER NOT NULL DEFAULT 20
    );
  `);

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS transactions (
      id VARCHAR(100) PRIMARY KEY,
      date DATE NOT NULL,
      customer VARCHAR(200) NOT NULL,
      invoice_amount NUMERIC(15, 2) NOT NULL,
      expected_payment_date DATE NOT NULL,
      collection_probability NUMERIC(3, 2) NOT NULL,
      status VARCHAR(50) NOT NULL
    );
  `);

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS payables (
      id VARCHAR(100) PRIMARY KEY,
      supplier VARCHAR(200) NOT NULL,
      amount NUMERIC(15, 2) NOT NULL,
      due_date DATE NOT NULL,
      category VARCHAR(100) NOT NULL,
      status VARCHAR(50) NOT NULL
    );
  `);

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS expenses (
      id VARCHAR(100) PRIMARY KEY,
      date DATE NOT NULL,
      category VARCHAR(100) NOT NULL,
      amount NUMERIC(15, 2) NOT NULL
    );
  `);

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
      action VARCHAR(200) NOT NULL,
      details TEXT
    );
  `);

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS whatsapp_notifications (
      id SERIAL PRIMARY KEY,
      business_id VARCHAR(100) DEFAULT 'shakti-config',
      phone_number VARCHAR(50),
      alert_type VARCHAR(100) NOT NULL,
      risk_level VARCHAR(50),
      breach_probability NUMERIC(6, 4),
      message_id VARCHAR(200),
      sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
      status VARCHAR(50) NOT NULL,
      error_message TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // Business profile table (industry-aware configuration — no sensitive data)
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS business_profile (
      id VARCHAR(50) PRIMARY KEY,
      business_name VARCHAR(200) NOT NULL,
      industry_id VARCHAR(50) NOT NULL DEFAULT 'manufacturing',
      currency VARCHAR(10) NOT NULL DEFAULT 'INR',
      country VARCHAR(100) NOT NULL DEFAULT 'India',
      cash_floor NUMERIC(15, 2) NOT NULL DEFAULT 500000,
      is_demo BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // 2. Check if configuration is empty; if so, seed default dataset (Shakti Electronics)
  const configCheck = await dbQuery(`SELECT COUNT(*) as count FROM configuration`);
  const count = parseInt(configCheck.rows[0].count);

  if (count === 0) {
    console.log('Postgres Database empty. Seeding default Shakti Electronics demo dataset into SQL database...');
    
    await dbQuery(`
      INSERT INTO configuration (id, current_cash, cash_floor, forecast_weights, supplier_delay_days)
      VALUES ('shakti-config', 1240000.00, 500000.00, ARRAY[0.50, 0.30, 0.20], 20)
    `);

    const txs = [
      ['tx-101', '2026-10-15', 'TechCorp Industries', 420000.00, '2026-10-15', 0.90, 'DELAYED'],
      ['tx-102', '2026-10-28', 'Shakti Enterprise Client Order (Partial)', 900000.00, '2026-10-28', 1.00, 'PENDING'],
      ['tx-103', '2026-11-12', 'Global Electro-Components', 1200000.00, '2026-11-12', 0.95, 'PENDING'],
      ['tx-104', '2026-11-25', 'Shakti Enterprise Client Order (Final)', 2100000.00, '2026-11-25', 1.00, 'PENDING'],
      ['tx-105', '2026-12-10', 'TechCorp Industries (Phase 2 Delivery)', 1400000.00, '2026-12-10', 0.95, 'PENDING'],
      ['tx-106', '2026-12-22', 'Bharat Heavy Electricals Consortium', 1600000.00, '2026-12-22', 0.90, 'PENDING'],
    ];
    for (const t of txs) {
      await dbQuery(`
        INSERT INTO transactions (id, date, customer, invoice_amount, expected_payment_date, collection_probability, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, t);
    }

    const bills = [
      ['pay-201', 'Shakti Electronics (Component Supply)', 1800000.00, '2026-10-16', 'Procurement', 'CRITICAL'],
      ['pay-202', 'Apex Logistics Services', 250000.00, '2026-10-18', 'Freight & Shipping', 'DUE'],
      ['pay-203', 'State Power Board', 120000.00, '2026-10-20', 'Utilities', 'DUE'],
      ['pay-204', 'Silico Tech Materials', 350000.00, '2026-11-05', 'Raw Material', 'DUE'],
      ['pay-205', 'Industrial Rent Corp', 180000.00, '2026-11-01', 'Facility Rent', 'DUE'],
      ['pay-206', 'Industrial Rent Corp', 180000.00, '2026-12-01', 'Facility Rent', 'DUE'],
      ['pay-207', 'Silico Tech Materials', 520000.00, '2026-12-12', 'Raw Material', 'DUE'],
      ['pay-208', 'Apex Logistics Services', 210000.00, '2026-12-18', 'Freight & Shipping', 'DUE'],
    ];
    for (const b of bills) {
      await dbQuery(`
        INSERT INTO payables (id, supplier, amount, due_date, category, status)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, b);
    }

    const exps = [
      ['exp-1', '2026-10-05', 'Operational Staff Payroll', 220000.00],
      ['exp-2', '2026-10-25', 'Factory Operations', 80000.00],
      ['exp-3', '2026-11-05', 'Operational Staff Payroll', 220000.00],
      ['exp-4', '2026-11-25', 'Factory Operations', 80000.00],
      ['exp-5', '2026-12-05', 'Operational Staff Payroll', 220000.00],
      ['exp-6', '2026-12-25', 'Factory Operations', 80000.00],
    ];
    for (const e of exps) {
      await dbQuery(`
        INSERT INTO expenses (id, date, category, amount)
        VALUES ($1, $2, $3, $4)
      `, e);
    }

    await dbQuery(`
      INSERT INTO audit_logs (action, details)
      VALUES ('SEED', 'Default Shakti Electronics database seed complete')
    `);
    console.log('Postgres seeding finished.');
  }

  // 3. Seed the default business profile (Shakti Electronics → Manufacturing) if empty
  const profileCheck = await dbQuery(`SELECT COUNT(*) as count FROM business_profile`);
  const profileCount = parseInt(profileCheck.rows[0].count);
  if (profileCount === 0) {
    await dbQuery(`
      INSERT INTO business_profile (id, business_name, industry_id, currency, country, cash_floor, is_demo, created_at, updated_at)
      VALUES ('shakti-config', 'Shakti Electronics', 'manufacturing', 'INR', 'India', 500000.00, TRUE, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `);
  }
}

// ── Unified Database Interface ──────────────────────────────────────────────

export interface DbFinancials {
  config: Config;
  transactions: Transaction[];
  payables: Payable[];
  expenses: Expense[];
}

export async function getFinancials(): Promise<DbFinancials> {
  try {
    const confRes = await dbQuery(`SELECT * FROM configuration WHERE id = 'shakti-config'`);
    const txRes = await dbQuery(`SELECT * FROM transactions`);
    const payRes = await dbQuery(`SELECT * FROM payables`);
    const expRes = await dbQuery(`SELECT * FROM expenses`);

    const conf = confRes?.rows?.[0];
    if (!conf) {
      return {
        config: DEFAULT_CONFIG,
        transactions: INITIAL_TRANSACTIONS,
        payables: INITIAL_PAYABLES,
        expenses: INITIAL_EXPENSES,
      };
    }

    const dbConfig: Config = {
      current_cash: parseFloat(conf.current_cash),
      cash_floor: parseFloat(conf.cash_floor),
      forecast_weights: parseArray(conf.forecast_weights) as [number, number, number],
      supplier_delay_days: parseInt(conf.supplier_delay_days),
    };

    const transactions: Transaction[] = (txRes?.rows || []).map((r) => ({
      id: r.id,
      date: formatDate(r.date),
      customer: r.customer,
      invoice_amount: parseFloat(r.invoice_amount),
      expected_payment_date: formatDate(r.expected_payment_date),
      collection_probability: parseFloat(r.collection_probability),
      status: r.status as Transaction['status'],
    }));

    const payables: Payable[] = (payRes?.rows || []).map((r) => ({
      id: r.id,
      supplier: r.supplier,
      amount: parseFloat(r.amount),
      due_date: formatDate(r.due_date),
      category: r.category,
      status: r.status as Payable['status'],
    }));

    const expenses: Expense[] = (expRes?.rows || []).map((r) => ({
      id: r.id,
      date: formatDate(r.date),
      category: r.category,
      amount: parseFloat(r.amount),
    }));

    return {
      config: dbConfig,
      transactions: transactions.length ? transactions : INITIAL_TRANSACTIONS,
      payables: payables.length ? payables : INITIAL_PAYABLES,
      expenses: expenses.length ? expenses : INITIAL_EXPENSES,
    };
  } catch (err) {
    console.warn('getFinancials fallback triggered:', (err as any)?.message || err);
    return {
      config: DEFAULT_CONFIG,
      transactions: INITIAL_TRANSACTIONS,
      payables: INITIAL_PAYABLES,
      expenses: INITIAL_EXPENSES,
    };
  }
}

export async function updateConfiguration(currentCash: number, cashFloor: number, delayDays: number) {
  await dbQuery(`
    UPDATE configuration
    SET current_cash = $1, cash_floor = $2, supplier_delay_days = $3
    WHERE id = 'shakti-config'
  `, [currentCash, cashFloor, delayDays]);

  await dbQuery(`
    INSERT INTO audit_logs (action, details)
    VALUES ('UPDATE_CONFIG', 'Cash: ' || $1 || ', Floor: ' || $2 || ', Delay: ' || $3)
  `, [currentCash, cashFloor, delayDays]);
}

export async function saveConnectedPlatformData(
  currentCash: number,
  transactions: Transaction[],
  payables: Payable[],
  expenses?: Expense[],
) {
  await dbQuery(`DELETE FROM transactions`);
  await dbQuery(`DELETE FROM payables`);
  if (expenses?.length) {
    await dbQuery(`DELETE FROM expenses`);
  }

  await dbQuery(`
    UPDATE configuration
    SET current_cash = $1
    WHERE id = 'shakti-config'
  `, [currentCash]);

  for (const t of transactions) {
    await dbQuery(`
      INSERT INTO transactions (id, date, customer, invoice_amount, expected_payment_date, collection_probability, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [t.id, t.date, t.customer, t.invoice_amount, t.expected_payment_date, t.collection_probability, t.status]);
  }

  for (const p of payables) {
    await dbQuery(`
      INSERT INTO payables (id, supplier, amount, due_date, category, status)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [p.id, p.supplier, p.amount, p.due_date, p.category, p.status]);
  }

  if (expenses?.length) {
    for (const e of expenses) {
      await dbQuery(`
        INSERT INTO expenses (id, date, category, amount)
        VALUES ($1, $2, $3, $4)
      `, [e.id, e.date, e.category, e.amount]);
    }
  }

  await dbQuery(`
    INSERT INTO audit_logs (action, details)
    VALUES ('LIVE_SYNC', 'Connected account sync completed. Cash: ' || $1 || ', Invoices: ' || $2 || ', Bills: ' || $3)
  `, [currentCash, transactions.length, payables.length]);
}

export async function resetToBaseline() {
  await dbQuery(`DELETE FROM transactions`);
  await dbQuery(`DELETE FROM payables`);
  await dbQuery(`DELETE FROM expenses`);
  await dbQuery(`DELETE FROM configuration`);
  await initDb();
}

// ── WhatsApp Notification Audit Logging ───────────────────────────────────
// Stores safe metadata only — never access tokens or secrets.

export interface WhatsAppNotificationRecord {
  alertType: string;
  phoneNumber?: string;
  riskLevel?: string;
  breachProbability?: number; // 0-1
  messageId?: string;
  status: 'SENT' | 'FAILED';
  errorMessage?: string;
  /** Read-only — populated by getRecentWhatsAppNotifications(). */
  sentAt?: string;
}

export async function logWhatsAppNotification(record: WhatsAppNotificationRecord) {
  await dbQuery(`
    INSERT INTO whatsapp_notifications (
      business_id, phone_number, alert_type, risk_level, breach_probability,
      message_id, status, error_message
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [
    'shakti-config',
    record.phoneNumber || null,
    record.alertType,
    record.riskLevel || null,
    record.breachProbability !== undefined ? record.breachProbability : null,
    record.messageId || null,
    record.status,
    record.errorMessage || null,
  ]);

  const details = record.status === 'SENT'
    ? `WhatsApp ${record.alertType} sent (risk: ${record.riskLevel || 'n/a'}, breach prob: ${record.breachProbability !== undefined ? Math.round(record.breachProbability * 100) + '%' : 'n/a'})`
    : `WhatsApp ${record.alertType} failed (risk: ${record.riskLevel || 'n/a'})`;
  await dbQuery(`
    INSERT INTO audit_logs (action, details)
    VALUES ('WHATSAPP_' || $1, $2)
  `, [record.status, details]);
}

export async function getRecentWhatsAppNotifications(limit = 20): Promise<WhatsAppNotificationRecord[]> {
  const res = await dbQuery(`
    SELECT alert_type, risk_level, breach_probability, message_id, sent_at, status, error_message
    FROM whatsapp_notifications
    ORDER BY id DESC
    LIMIT $1
  `, [limit]);
  return (res?.rows || []).map((r: any) => ({
    alertType: r.alert_type,
    riskLevel: r.risk_level || undefined,
    breachProbability: r.breach_probability !== null && r.breach_probability !== undefined ? parseFloat(r.breach_probability) : undefined,
    messageId: r.message_id || undefined,
    status: r.status as 'SENT' | 'FAILED',
    errorMessage: r.error_message || undefined,
    sentAt: r.sent_at,
  }));
}
