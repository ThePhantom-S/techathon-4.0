import { Config, Expense, InventoryItem, Payable, Sale, Supplier, Transaction } from '../types';

export const DEFAULT_CONFIG: Config = {
  current_cash: 1240000, // ₹12.4 Lakhs
  cash_floor: 500000,   // ₹5.0 Lakhs
  forecast_weights: [0.5, 0.3, 0.2],
  supplier_delay_days: 20, // 20 days shock default as in screenshots & SRS
};

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-101',
    date: '2026-10-15',
    customer: 'TechCorp Industries',
    invoice_amount: 420000, // ₹4.2L
    expected_payment_date: '2026-10-15',
    collection_probability: 0.9,
    status: 'DELAYED',
  },
  {
    id: 'tx-102',
    date: '2026-10-28',
    customer: 'Shakti Enterprise Client Order (Partial)',
    invoice_amount: 900000, // ₹9.0L
    expected_payment_date: '2026-10-28',
    collection_probability: 1.0,
    status: 'PENDING',
  },
  {
    id: 'tx-103',
    date: '2026-11-12',
    customer: 'Global Electro-Components',
    invoice_amount: 1200000, // ₹12.0L
    expected_payment_date: '2026-11-12',
    collection_probability: 0.95,
    status: 'PENDING',
  },
  {
    id: 'tx-104',
    date: '2026-11-25',
    customer: 'Shakti Enterprise Client Order (Final)',
    invoice_amount: 2100000, // ₹21.0L
    expected_payment_date: '2026-11-25',
    collection_probability: 1.0,
    status: 'PENDING',
  },
  {
    id: 'tx-105',
    date: '2026-12-10',
    customer: 'TechCorp Industries (Phase 2 Delivery)',
    invoice_amount: 1400000, // ₹14.0L
    expected_payment_date: '2026-12-10',
    collection_probability: 0.95,
    status: 'PENDING',
  },
  {
    id: 'tx-106',
    date: '2026-12-22',
    customer: 'Bharat Heavy Electricals Consortium',
    invoice_amount: 1600000, // ₹16.0L
    expected_payment_date: '2026-12-22',
    collection_probability: 0.90,
    status: 'PENDING',
  },
];

export const INITIAL_PAYABLES: Payable[] = [
  {
    id: 'pay-201',
    supplier: 'Shakti Electronics (Component Supply)',
    amount: 1800000, // ₹18.0L procurement order
    due_date: '2026-10-16',
    category: 'Procurement',
    status: 'CRITICAL',
  },
  {
    id: 'pay-202',
    supplier: 'Apex Logistics Services',
    amount: 250000, // ₹2.5L freight
    due_date: '2026-10-18',
    category: 'Freight & Shipping',
    status: 'DUE',
  },
  {
    id: 'pay-203',
    supplier: 'State Power Board',
    amount: 120000, // ₹1.2L utilities
    due_date: '2026-10-20',
    category: 'Utilities',
    status: 'DUE',
  },
  {
    id: 'pay-204',
    supplier: 'Silico Tech Materials',
    amount: 350000, // ₹3.5L PCB boards
    due_date: '2026-11-05',
    category: 'Raw Material',
    status: 'DUE',
  },
  {
    id: 'pay-205',
    supplier: 'Industrial Rent Corp',
    amount: 180000, // ₹1.8L monthly rent
    due_date: '2026-11-01',
    category: 'Facility Rent',
    status: 'DUE',
  },
  {
    id: 'pay-206',
    supplier: 'Industrial Rent Corp',
    amount: 180000, // ₹1.8L monthly rent
    due_date: '2026-12-01',
    category: 'Facility Rent',
    status: 'DUE',
  },
  {
    id: 'pay-207',
    supplier: 'Silico Tech Materials',
    amount: 520000, // ₹5.2L semiconductor components
    due_date: '2026-12-12',
    category: 'Raw Material',
    status: 'DUE',
  },
  {
    id: 'pay-208',
    supplier: 'Apex Logistics Services',
    amount: 210000, // ₹2.1L shipping & dispatch
    due_date: '2026-12-18',
    category: 'Freight & Shipping',
    status: 'DUE',
  },
];

export const INITIAL_EXPENSES: Expense[] = [
  { id: 'exp-1', date: '2026-10-05', category: 'Operational Staff Payroll', amount: 220000 },
  { id: 'exp-2', date: '2026-10-25', category: 'Factory Operations', amount: 80000 },
  { id: 'exp-3', date: '2026-11-05', category: 'Operational Staff Payroll', amount: 220000 },
  { id: 'exp-4', date: '2026-11-25', category: 'Factory Operations', amount: 80000 },
  { id: 'exp-5', date: '2026-12-05', category: 'Operational Staff Payroll', amount: 220000 },
  { id: 'exp-6', date: '2026-12-25', category: 'Factory Operations', amount: 80000 },
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  { SKU: 'SKU-PCB-900', name: 'Microcontroller Boards', quantity: 450, unit_cost: 1200, safety_stock: 150 },
  { SKU: 'SKU-CAP-400', name: 'High Temp Capacitors', quantity: 1200, unit_cost: 150, safety_stock: 300 },
  { SKU: 'SKU-ENC-100', name: 'Aluminum Enclosures', quantity: 280, unit_cost: 2500, safety_stock: 100 },
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  { id: 'sup-1', supplier: 'Shakti Electronics', SKU: 'SKU-PCB-900', lead_time_days: 15, payment_terms_days: 30 },
  { id: 'sup-2', supplier: 'Apex Logistics', SKU: 'SKU-ENC-100', lead_time_days: 7, payment_terms_days: 15 },
];

export const HISTORICAL_SALES: Sale[] = [
  { date: '2026-09-01', SKU: 'SKU-PCB-900', quantity: 30, revenue: 150000 },
  { date: '2026-09-10', SKU: 'SKU-PCB-900', quantity: 35, revenue: 175000 },
  { date: '2026-09-20', SKU: 'SKU-PCB-900', quantity: 28, revenue: 140000 },
];

// Aliases for compatibility
export const demoConfig = DEFAULT_CONFIG;
export const demoTransactions = INITIAL_TRANSACTIONS;
export const demoPayables = INITIAL_PAYABLES;
export const demoExpenses = INITIAL_EXPENSES;
export const demoInventory = INITIAL_INVENTORY;
export const demoSuppliers = INITIAL_SUPPLIERS;
export const demoSales = HISTORICAL_SALES;

