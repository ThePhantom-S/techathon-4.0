/**
 * demoProfiles.ts
 * Industry-aware DEMO datasets for FlowShield.
 *
 * These are clearly synthetic demonstration profiles — never presented as
 * real company data. Shakti Electronics (manufacturing) remains the default.
 * Each dataset maps onto the SAME generic transaction/payable/expense schema,
 * so the common financial engine drives every industry.
 */
import { Config, Expense, Payable, Transaction } from '../types';
import { IndustryId } from '../types';
import {
  DEFAULT_CONFIG,
  INITIAL_TRANSACTIONS,
  INITIAL_PAYABLES,
  INITIAL_EXPENSES,
  INITIAL_INVENTORY,
  INITIAL_SUPPLIERS,
  HISTORICAL_SALES,
} from './sampleData';

export interface IndustryDemoProfile {
  industryId: IndustryId;
  businessName: string;
  config: Config;
  transactions: Transaction[];
  payables: Payable[];
  expenses: Expense[];
  inventory: typeof INITIAL_INVENTORY;
  suppliers: typeof INITIAL_SUPPLIERS;
  sales: typeof HISTORICAL_SALES;
  note: string;
}

const t = (
  id: string,
  date: string,
  customer: string,
  invoice_amount: number,
  expected_payment_date: string,
  collection_probability: number,
  status: Transaction['status'],
): Transaction => ({ id, date, customer, invoice_amount, expected_payment_date, collection_probability, status });

const p = (
  id: string,
  supplier: string,
  amount: number,
  due_date: string,
  category: string,
  status: Payable['status'],
): Payable => ({ id, supplier, amount, due_date, category, status });

const e = (id: string, date: string, category: string, amount: number): Expense => ({ id, date, category, amount });

// ── Manufacturing: Shakti Electronics (existing default demo) ───────────────
export const MANUFACTURING_DEMO: IndustryDemoProfile = {
  industryId: 'manufacturing',
  businessName: 'Shakti Electronics',
  config: DEFAULT_CONFIG,
  transactions: INITIAL_TRANSACTIONS,
  payables: INITIAL_PAYABLES,
  expenses: INITIAL_EXPENSES,
  inventory: INITIAL_INVENTORY,
  suppliers: INITIAL_SUPPLIERS,
  sales: HISTORICAL_SALES,
  note: 'Synthetic demo dataset for a manufacturing business.',
};

// ── Retail / E-commerce ─────────────────────────────────────────────────────
export const RETAIL_DEMO: IndustryDemoProfile = {
  industryId: 'retail',
  businessName: 'UrbanMart Retail',
  config: { current_cash: 1100000, cash_floor: 350000, forecast_weights: [0.5, 0.3, 0.2], supplier_delay_days: 15 },
  transactions: [
    t('rt-tx-1', '2026-10-15', 'Online Order Batch A', 380000, '2026-10-15', 0.95, 'PENDING'),
    t('rt-tx-2', '2026-10-28', 'Store Sales Settlement', 560000, '2026-10-28', 1.0, 'PENDING'),
    t('rt-tx-3', '2026-11-12', 'Online Order Batch B', 420000, '2026-11-12', 0.92, 'PENDING'),
    t('rt-tx-4', '2026-11-25', 'Festival Season Sales', 980000, '2026-11-25', 0.85, 'PENDING'),
  ],
  payables: [
    p('rt-pay-1', 'Apparel Wholesale Co', 850000, '2026-10-18', 'Merchandise', 'DUE'),
    p('rt-pay-2', 'UrbanMart Warehouse Rent', 160000, '2026-11-01', 'Facility Rent', 'DUE'),
    p('rt-pay-3', 'Electronics Distributors', 420000, '2026-11-08', 'Merchandise', 'DUE'),
    p('rt-pay-4', 'Payment Gateway Fees', 45000, '2026-10-25', 'Processing', 'DUE'),
  ],
  expenses: [
    e('rt-exp-1', '2026-10-05', 'Store Staff Payroll', 180000),
    e('rt-exp-2', '2026-10-25', 'Store Operations', 60000),
    e('rt-exp-3', '2026-11-05', 'Store Staff Payroll', 180000),
    e('rt-exp-4', '2026-11-25', 'Store Operations', 60000),
  ],
  inventory: [
    { SKU: 'SKU-APPR-01', name: 'Seasonal Apparel', quantity: 800, unit_cost: 450, safety_stock: 200 },
    { SKU: 'SKU-ELEC-02', name: 'Consumer Electronics', quantity: 320, unit_cost: 1800, safety_stock: 80 },
    { SKU: 'SKU-HOME-03', name: 'Home Goods', quantity: 500, unit_cost: 700, safety_stock: 150 },
  ],
  suppliers: [
    { id: 'rt-sup-1', supplier: 'Apparel Wholesale Co', SKU: 'SKU-APPR-01', lead_time_days: 12, payment_terms_days: 30 },
    { id: 'rt-sup-2', supplier: 'Electronics Distributors', SKU: 'SKU-ELEC-02', lead_time_days: 10, payment_terms_days: 20 },
  ],
  sales: [
    { date: '2026-09-01', SKU: 'SKU-APPR-01', quantity: 45, revenue: 210000 },
    { date: '2026-09-10', SKU: 'SKU-APPR-01', quantity: 52, revenue: 240000 },
    { date: '2026-09-20', SKU: 'SKU-APPR-01', quantity: 40, revenue: 190000 },
  ],
  note: 'Synthetic demo dataset for a retail / e-commerce business.',
};

// ── SaaS / Software ─────────────────────────────────────────────────────────
export const SAAS_DEMO: IndustryDemoProfile = {
  industryId: 'saas',
  businessName: 'CloudDesk Software',
  config: { current_cash: 1450000, cash_floor: 500000, forecast_weights: [0.5, 0.3, 0.2], supplier_delay_days: 0 },
  transactions: [
    t('sa-tx-1', '2026-10-15', 'Annual Plan Renewals', 520000, '2026-10-15', 0.9, 'PENDING'),
    t('sa-tx-2', '2026-10-28', 'Monthly MRR Collections', 460000, '2026-10-28', 0.95, 'PENDING'),
    t('sa-tx-3', '2026-11-12', 'Enterprise Deal — Q4', 800000, '2026-11-12', 0.8, 'PENDING'),
    t('sa-tx-4', '2026-11-25', 'Monthly MRR Collections', 500000, '2026-11-25', 0.95, 'PENDING'),
  ],
  payables: [
    p('sa-pay-1', 'Cloud Infrastructure AWS', 260000, '2026-10-18', 'Cloud Hosting', 'DUE'),
    p('sa-pay-2', 'SaaS Tooling Suite', 95000, '2026-11-01', 'Software Licenses', 'DUE'),
    p('sa-pay-3', 'Cloud Infrastructure AWS', 290000, '2026-11-18', 'Cloud Hosting', 'DUE'),
  ],
  expenses: [
    e('sa-exp-1', '2026-10-05', 'Engineering Payroll', 380000),
    e('sa-exp-2', '2026-10-25', 'Marketing & Sales', 120000),
    e('sa-exp-3', '2026-11-05', 'Engineering Payroll', 380000),
    e('sa-exp-4', '2026-11-25', 'Marketing & Sales', 130000),
  ],
  inventory: [],
  suppliers: [],
  sales: [],
  note: 'Synthetic demo dataset for a SaaS business. No inventory — cash driven by recurring revenue and burn.',
};

// ── Restaurant / Food ───────────────────────────────────────────────────────
export const RESTAURANT_DEMO: IndustryDemoProfile = {
  industryId: 'restaurant',
  businessName: 'Tandoor Junction',
  config: { current_cash: 720000, cash_floor: 200000, forecast_weights: [0.5, 0.3, 0.2], supplier_delay_days: 10 },
  transactions: [
    t('re-tx-1', '2026-10-15', 'Weekend Dining Sales', 340000, '2026-10-15', 1.0, 'PENDING'),
    t('re-tx-2', '2026-10-28', 'Catering Order — Corporate', 480000, '2026-10-28', 0.9, 'PENDING'),
    t('re-tx-3', '2026-11-12', 'Delivery Platform Payout', 290000, '2026-11-12', 0.95, 'PENDING'),
    t('re-tx-4', '2026-11-25', 'Festive Dining Sales', 520000, '2026-11-25', 0.9, 'PENDING'),
  ],
  payables: [
    p('re-pay-1', 'Fresh Food Suppliers', 380000, '2026-10-16', 'Food Supply', 'DUE'),
    p('re-pay-2', 'Beverage Distributors', 120000, '2026-10-20', 'Beverages', 'DUE'),
    p('re-pay-3', 'Fresh Food Suppliers', 360000, '2026-11-06', 'Food Supply', 'DUE'),
    p('re-pay-4', 'Kitchen Equipment Lease', 90000, '2026-11-01', 'Equipment', 'DUE'),
  ],
  expenses: [
    e('re-exp-1', '2026-10-05', 'Kitchen Staff Payroll', 150000),
    e('re-exp-2', '2026-10-25', 'Restaurant Rent & Utilities', 110000),
    e('re-exp-3', '2026-11-05', 'Kitchen Staff Payroll', 150000),
    e('re-exp-4', '2026-11-25', 'Restaurant Rent & Utilities', 110000),
  ],
  inventory: [
    { SKU: 'SKU-RICE-01', name: 'Rice & Grains', quantity: 150, unit_cost: 60, safety_stock: 40 },
    { SKU: 'SKU-VEG-02', name: 'Fresh Vegetables', quantity: 90, unit_cost: 40, safety_stock: 25 },
    { SKU: 'SKU-DFRY-03', name: 'Dairy & Frozen', quantity: 60, unit_cost: 90, safety_stock: 15 },
  ],
  suppliers: [
    { id: 're-sup-1', supplier: 'Fresh Food Suppliers', SKU: 'SKU-VEG-02', lead_time_days: 3, payment_terms_days: 15 },
    { id: 're-sup-2', supplier: 'Grain Wholesale', SKU: 'SKU-RICE-01', lead_time_days: 5, payment_terms_days: 20 },
  ],
  sales: [
    { date: '2026-09-01', SKU: 'SKU-RICE-01', quantity: 40, revenue: 120000 },
    { date: '2026-09-10', SKU: 'SKU-RICE-01', quantity: 46, revenue: 138000 },
    { date: '2026-09-20', SKU: 'SKU-RICE-01', quantity: 38, revenue: 114000 },
  ],
  note: 'Synthetic demo dataset for a restaurant / food business.',
};

// ── Construction ────────────────────────────────────────────────────────────
export const CONSTRUCTION_DEMO: IndustryDemoProfile = {
  industryId: 'construction',
  businessName: 'StructBuild Projects',
  config: { current_cash: 1350000, cash_floor: 450000, forecast_weights: [0.5, 0.3, 0.2], supplier_delay_days: 15 },
  transactions: [
    t('co-tx-1', '2026-10-15', 'Milestone 1 — Phase A Client', 900000, '2026-10-15', 0.9, 'DELAYED'),
    t('co-tx-2', '2026-10-28', 'Milestone 2 — Phase A Client', 1400000, '2026-10-28', 0.95, 'PENDING'),
    t('co-tx-3', '2026-11-12', 'Milestone 1 — Phase B Client', 700000, '2026-11-12', 0.9, 'PENDING'),
    t('co-tx-4', '2026-11-25', 'Milestone 3 — Phase A Client', 1800000, '2026-11-25', 0.95, 'PENDING'),
  ],
  payables: [
    p('co-pay-1', 'Steel & Cement Suppliers', 1500000, '2026-10-16', 'Materials', 'CRITICAL'),
    p('co-pay-2', 'Contractor Crew Payments', 420000, '2026-10-22', 'Contractors', 'DUE'),
    p('co-pay-3', 'Equipment Rental Co', 180000, '2026-11-01', 'Equipment', 'DUE'),
    p('co-pay-4', 'Steel & Cement Suppliers', 950000, '2026-11-10', 'Materials', 'DUE'),
  ],
  expenses: [
    e('co-exp-1', '2026-10-05', 'Site Office & Staff', 130000),
    e('co-exp-2', '2026-10-25', 'Site Operations', 90000),
    e('co-exp-3', '2026-11-05', 'Site Office & Staff', 130000),
    e('co-exp-4', '2026-11-25', 'Site Operations', 90000),
  ],
  inventory: [
    { SKU: 'SKU-STL-01', name: 'Structural Steel', quantity: 120, unit_cost: 5500, safety_stock: 30 },
    { SKU: 'SKU-CEM-02', name: 'Cement', quantity: 400, unit_cost: 380, safety_stock: 100 },
    { SKU: 'SKU-BRC-03', name: 'Bricks & Blocks', quantity: 1500, unit_cost: 45, safety_stock: 400 },
  ],
  suppliers: [
    { id: 'co-sup-1', supplier: 'Steel & Cement Suppliers', SKU: 'SKU-STL-01', lead_time_days: 20, payment_terms_days: 30 },
    { id: 'co-sup-2', supplier: 'Building Materials Co', SKU: 'SKU-BRC-03', lead_time_days: 12, payment_terms_days: 25 },
  ],
  sales: [
    { date: '2026-09-01', SKU: 'SKU-CEM-02', quantity: 60, revenue: 210000 },
    { date: '2026-09-10', SKU: 'SKU-CEM-02', quantity: 70, revenue: 245000 },
    { date: '2026-09-20', SKU: 'SKU-CEM-02', quantity: 55, revenue: 190000 },
  ],
  note: 'Synthetic demo dataset for a construction business.',
};

// ── Registry ────────────────────────────────────────────────────────────────

export const INDUSTRY_DEMO_PROFILES: Record<string, IndustryDemoProfile> = {
  manufacturing: MANUFACTURING_DEMO,
  retail: RETAIL_DEMO,
  saas: SAAS_DEMO,
  restaurant: RESTAURANT_DEMO,
  construction: CONSTRUCTION_DEMO,
};

/** Demo profiles available for one-click switching in the UI. */
export const SWITCHABLE_DEMO_IDS: IndustryId[] = ['manufacturing', 'retail', 'saas', 'restaurant', 'construction'];

export function getIndustryDemoProfile(industryId: string): IndustryDemoProfile | undefined {
  return INDUSTRY_DEMO_PROFILES[industryId];
}

/** Alias kept for compatibility with the existing Shakti Electronics flow. */
export const demoProfiles = INDUSTRY_DEMO_PROFILES;