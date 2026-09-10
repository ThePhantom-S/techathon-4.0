/**
 * csvParser.ts
 * Smart CSV parser for CashShock.
 * Supports two formats:
 *   1. Bank Statement Format: Date, Description, Debit, Credit, Balance
 *   2. CashShock Template Format: type, date, entity, amount, status, category, extra
 */

import { Transaction, Payable, Expense, IndustryId } from '../types';

export interface ParsedCSVResult {
  format: 'bank-statement' | 'cashshock-template' | 'unknown';
  transactions: Transaction[];
  payables: Payable[];
  expenses: Expense[];
  currentCash: number | null;
  rowCount: number;
  errors: string[];
  summary: string;
}

interface CSVRow {
  [key: string]: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseCSVText(text: string): { headers: string[]; rows: CSVRow[] } {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'));

  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    if (values.length < 2) continue;
    const row: CSVRow = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? '';
    });
    rows.push(row);
  }
  return { headers, rows };
}

function detectFormat(headers: string[]): 'bank-statement' | 'cashshock-template' | 'unknown' {
  const h = headers.join(' ');
  if (h.includes('debit') && h.includes('credit') && h.includes('balance')) return 'bank-statement';
  if (h.includes('type') && h.includes('entity') && h.includes('amount')) return 'cashshock-template';
  // Fuzzy — if it has date + description + debit/credit/amount
  if ((h.includes('date') || h.includes('txn')) && (h.includes('debit') || h.includes('withdrawal') || h.includes('amount'))) {
    return 'bank-statement';
  }
  return 'unknown';
}

function safeFloat(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[₹,\s]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function safeDate(val: string): string {
  if (!val) return new Date().toISOString().split('T')[0];
  // Try DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
  const parts = val.split(/[-\/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}`;
    if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
  }
  return val;
}

// ── Industry-aware classification hints ───────────────────────────────────────
// Optional: when an industry is known, debit descriptions are classified with
// industry terminology. Missing fields always fall back to the generic rules.
const INDUSTRY_KEYWORDS: Partial<Record<IndustryId, { category: string; keywords: string[] }[]>> = {
  manufacturing: [
    { category: 'Procurement', keywords: ['purchase', 'supplier', 'vendor', 'material', 'component', 'raw'] },
    { category: 'Freight & Shipping', keywords: ['freight', 'logistics', 'shipping', 'transport'] },
    { category: 'Payroll', keywords: ['salary', 'payroll', 'staff'] },
    { category: 'Factory Operations', keywords: ['factory', 'production', 'assembly', 'manufactur'] },
  ],
  wholesale: [
    { category: 'Merchandise Purchase', keywords: ['purchase', 'supplier', 'vendor', 'stock', 'wholesale'] },
    { category: 'Warehouse', keywords: ['warehouse', 'storage', 'freight'] },
    { category: 'Payroll', keywords: ['salary', 'payroll', 'staff'] },
  ],
  retail: [
    { category: 'Merchandise', keywords: ['purchase', 'supplier', 'vendor', 'stock', 'inventory'] },
    { category: 'Store Operations', keywords: ['store', 'rent', 'lease', 'pos'] },
    { category: 'Payroll', keywords: ['salary', 'payroll', 'staff'] },
    { category: 'Processing', keywords: ['gateway', 'processing', 'commission'] },
  ],
  saas: [
    { category: 'Cloud Hosting', keywords: ['aws', 'azure', 'gcp', 'cloud', 'hosting', 'infrastructure'] },
    { category: 'Software Licenses', keywords: ['software', 'license', 'saas', 'subscription'] },
    { category: 'Payroll', keywords: ['salary', 'payroll', 'staff', 'contractor'] },
    { category: 'Marketing & Sales', keywords: ['marketing', 'ads', 'advertising', 'sales'] },
  ],
  consulting: [
    { category: 'Contractors', keywords: ['contractor', 'subcontractor', 'consultant'] },
    { category: 'Project Expenses', keywords: ['travel', 'project', 'expense'] },
    { category: 'Payroll', keywords: ['salary', 'payroll', 'staff'] },
  ],
  restaurant: [
    { category: 'Food Supply', keywords: ['food', 'veg', 'meat', 'dairy', 'grain', 'produce', 'ingredient'] },
    { category: 'Beverages', keywords: ['beverage', 'drink', 'liquor'] },
    { category: 'Payroll', keywords: ['salary', 'payroll', 'staff', 'kitchen'] },
  ],
  logistics: [
    { category: 'Fuel', keywords: ['fuel', 'diesel', 'petrol'] },
    { category: 'Maintenance', keywords: ['maintenance', 'repair', 'service', 'tyre'] },
    { category: 'Driver Payroll', keywords: ['driver', 'payroll', 'salary'] },
  ],
  healthcare: [
    { category: 'Medical Supplies', keywords: ['supply', 'medical', 'pharma', 'medicine', 'consumable'] },
    { category: 'Equipment', keywords: ['equipment', 'device', 'machinery'] },
    { category: 'Payroll', keywords: ['salary', 'payroll', 'staff', 'clinical'] },
  ],
  construction: [
    { category: 'Materials', keywords: ['steel', 'cement', 'material', 'brick', 'aggregate', 'timber'] },
    { category: 'Contractors', keywords: ['contractor', 'labour', 'crew'] },
    { category: 'Equipment', keywords: ['equipment', 'rental', 'machinery'] },
  ],
};

/** Classify a debit description into an expense/payable category using industry hints first. */
function classifyDebit(descLower: string, industryId?: string): { kind: 'expense' | 'payable'; category: string } | null {
  const rules =
    (industryId && INDUSTRY_KEYWORDS[industryId as IndustryId]) ||
    INDUSTRY_KEYWORDS.manufacturing ||
    [];
  for (const rule of rules) {
    if (rule.keywords.some((k) => descLower.includes(k))) {
      const isPayable =
        rule.category === 'Procurement' ||
        rule.category === 'Merchandise Purchase' ||
        rule.category === 'Merchandise' ||
        rule.category === 'Cloud Hosting' ||
        rule.category === 'Software Licenses' ||
        rule.category === 'Contractors' ||
        rule.category === 'Materials' ||
        rule.category === 'Fuel' ||
        rule.category === 'Food Supply' ||
        rule.category === 'Beverages' ||
        rule.category === 'Medical Supplies';
      return { kind: isPayable ? 'payable' : 'expense', category: rule.category };
    }
  }
  return null;
}

// ── Bank Statement Parser ─────────────────────────────────────────────────────

function parseBankStatement(rows: CSVRow[], headers: string[], industryId?: string): Omit<ParsedCSVResult, 'format' | 'summary'> {
  const transactions: Transaction[] = [];
  const payables: Payable[] = [];
  const expenses: Expense[] = [];
  const errors: string[] = [];
  let currentCash: number | null = null;
  let rowCount = 0;

  // Find column name variants
  const col = (candidates: string[]) => candidates.find((c) => headers.includes(c)) ?? '';

  const dateCol = col(['date', 'txn_date', 'transaction_date', 'value_date', 'posting_date']);
  const descCol = col(['description', 'narration', 'particulars', 'remarks', 'details', 'transaction_details']);
  const debitCol = col(['debit', 'withdrawal', 'dr', 'debit_amount', 'withdrawals__dr_']);
  const creditCol = col(['credit', 'deposit', 'cr', 'credit_amount', 'deposits__cr_']);
  const balanceCol = col(['balance', 'closing_balance', 'running_balance', 'available_balance']);
  const amountCol = col(['amount']); // generic fallback

  rows.forEach((row, idx) => {
    rowCount++;
    const rawDate = row[dateCol] || '';
    const desc = row[descCol] || `Transaction ${idx + 1}`;
    const debit = safeFloat(row[debitCol] || (amountCol && safeFloat(row[amountCol]) < 0 ? String(-safeFloat(row[amountCol])) : '0'));
    const credit = safeFloat(row[creditCol] || (amountCol && safeFloat(row[amountCol]) > 0 ? row[amountCol] : '0'));
    const balance = safeFloat(row[balanceCol] || '0');
    const date = safeDate(rawDate);

    if (desc.toLowerCase().includes('opening')) {
      if (balance !== 0) currentCash = balance;
      return;
    }

    // Capture opening balance from the first row with a balance if not set
    if (balance !== 0 && currentCash === null) {
      currentCash = balance;
    }

    // Credits = money coming in = transactions (receivables)
    if (credit > 0) {
      transactions.push({
        id: `csv-tx-${idx}`,
        date,
        customer: desc,
        invoice_amount: credit,
        expected_payment_date: date,
        collection_probability: 0.95,
        status: 'PENDING',
      });
    }

    // Debits = money going out (industry-aware classification with generic fallback)
    if (debit > 0) {
      const descLower = desc.toLowerCase();
      const industryMatch = classifyDebit(descLower, industryId);
      const isPayroll = descLower.includes('salary') || descLower.includes('payroll') || descLower.includes('staff');
      const isRent = descLower.includes('rent') || descLower.includes('lease');
      const isProcurement = descLower.includes('purchase') || descLower.includes('supplier') || descLower.includes('vendor') || descLower.includes('material') || descLower.includes('component');
      const isUtility = descLower.includes('electricity') || descLower.includes('power') || descLower.includes('water') || descLower.includes('utility');
      const isFreight = descLower.includes('freight') || descLower.includes('logistics') || descLower.includes('shipping') || descLower.includes('bill');

      if (industryMatch) {
        if (industryMatch.kind === 'payable') {
          payables.push({
            id: `csv-pay-${idx}`,
            supplier: desc,
            amount: debit,
            due_date: date,
            category: industryMatch.category,
            status: 'DUE',
          });
        } else {
          expenses.push({
            id: `csv-exp-${idx}`,
            date,
            category: industryMatch.category,
            amount: debit,
          });
        }
      } else if (isPayroll || isRent) {
        expenses.push({
          id: `csv-exp-${idx}`,
          date,
          category: isPayroll ? 'Payroll' : 'Rent',
          amount: debit,
        });
      } else if (isProcurement || isFreight || isUtility) {
        payables.push({
          id: `csv-pay-${idx}`,
          supplier: desc,
          amount: debit,
          due_date: date,
          category: isProcurement ? 'Procurement' : isFreight ? 'Freight & Shipping' : 'Utilities',
          status: 'DUE',
        });
      } else {
        // Default: add as expense
        expenses.push({
          id: `csv-exp-${idx}`,
          date,
          category: 'Operating Expense',
          amount: debit,
        });
      }
    }
  });

  return { transactions, payables, expenses, currentCash, rowCount, errors };
}

// ── CashShock Template Parser ─────────────────────────────────────────────────

function parseCashShockTemplate(rows: CSVRow[], industryId?: string): Omit<ParsedCSVResult, 'format' | 'summary'> {
  void industryId; // template rows carry explicit types; industry hints used via bank parser
  const transactions: Transaction[] = [];
  const payables: Payable[] = [];
  const expenses: Expense[] = [];
  const errors: string[] = [];
  let currentCash: number | null = null;
  let rowCount = 0;

  rows.forEach((row, idx) => {
    rowCount++;
    const type = (row['type'] || '').toLowerCase().trim();
    const date = safeDate(row['date'] || '');
    const entity = row['entity'] || row['customer'] || row['supplier'] || `Row ${idx + 1}`;
    const amount = safeFloat(row['amount'] || '0');
    const status = (row['status'] || 'PENDING').toUpperCase();
    const category = row['category'] || (type === 'expense' ? entity : 'General');
    const extra = row['extra'] || '';

    if (type === 'transaction' || type === 'receivable' || type === 'invoice') {
      transactions.push({
        id: `csv-tx-${idx}`,
        date,
        customer: entity,
        invoice_amount: amount,
        expected_payment_date: date,
        collection_probability: parseFloat(extra) || 0.9,
        status: (['PENDING', 'COLLECTED', 'DELAYED'].includes(status) ? status : 'PENDING') as Transaction['status'],
      });
    } else if (type === 'payable' || type === 'bill' || type === 'vendor') {
      payables.push({
        id: `csv-pay-${idx}`,
        supplier: entity,
        amount,
        due_date: date,
        category,
        status: (['DUE', 'PAID', 'CRITICAL'].includes(status) ? status : 'DUE') as Payable['status'],
      });
    } else if (type === 'expense') {
      expenses.push({
        id: `csv-exp-${idx}`,
        date,
        category,
        amount,
      });
    } else if (type === 'balance' || type === 'cash' || type === 'opening' || type === 'opening_balance' || type === 'opening_cash') {
      currentCash = amount;
    } else {
      errors.push(`Row ${idx + 2}: Unknown type "${type}" — skipped.`);
    }
  });

  return { transactions, payables, expenses, currentCash, rowCount, errors };
}

// ── Main Export ───────────────────────────────────────────────────────────────

export function parseCSV(csvText: string, industryId?: string): ParsedCSVResult {
  const { headers, rows } = parseCSVText(csvText);

  if (!headers.length || !rows.length) {
    return {
      format: 'unknown',
      transactions: [],
      payables: [],
      expenses: [],
      currentCash: null,
      rowCount: 0,
      errors: ['Could not parse file. Please ensure it is a valid CSV with a header row.'],
      summary: 'Parse failed — no readable data found.',
    };
  }

  const format = detectFormat(headers);

  let result: Omit<ParsedCSVResult, 'format' | 'summary'>;

  if (format === 'bank-statement') {
    result = parseBankStatement(rows, headers, industryId);
  } else if (format === 'cashshock-template') {
    result = parseCashShockTemplate(rows, industryId);
  } else {
    // Attempt CashShock template as fallback
    result = parseCashShockTemplate(rows, industryId);
  }

  const summary =
    `Detected ${result.transactions.length} receivables, ` +
    `${result.payables.length} payables, ` +
    `${result.expenses.length} expenses` +
    (result.currentCash !== null ? `, opening cash ₹${(result.currentCash / 100000).toFixed(2)}L` : '') +
    (result.errors.length > 0 ? ` (${result.errors.length} rows skipped)` : '');

  return { ...result, format, summary };
}

// ── Sample CSV Template Generators ───────────────────────────────────────────

export function generateBankStatementTemplate(): string {
  return [
    'Date,Description,Debit,Credit,Balance',
    '01/10/2026,Opening Balance,,,1240000',
    '05/10/2026,Salary Payment - Staff Oct,220000,,1020000',
    '10/10/2026,TechCorp Industries - Invoice INV-2201,,420000,1440000',
    '15/10/2026,Rent Payment - Oct 2026,180000,,1260000',
    '16/10/2026,Shakti Electronics - Component Purchase,1800000,,−540000',
    '18/10/2026,Apex Logistics - Freight Bill,250000,,−790000',
    '20/10/2026,State Power Board - Electricity,120000,,−910000',
    '28/10/2026,Client Order Partial Payment,,900000,−10000',
    '05/11/2026,Payroll - Nov 2026,220000,,−230000',
    '12/11/2026,Global Electro-Components Payment,,1200000,970000',
  ].join('\n');
}

export function generateCashShockTemplate(): string {
  return [
    '# CashShock Template CSV',
    'type,date,entity,amount,status,category,extra',
    'balance,2026-10-01,Opening Cash,1240000,,,',
    'transaction,2026-10-15,TechCorp Industries,420000,DELAYED,Collection,0.9',
    'transaction,2026-10-28,Client Order Partial,900000,PENDING,Collection,1.0',
    'transaction,2026-11-12,Global Electro-Components,1200000,PENDING,Collection,0.95',
    'payable,2026-10-16,Shakti Electronics,1800000,CRITICAL,Procurement,',
    'payable,2026-10-18,Apex Logistics,250000,DUE,Freight,',
    'payable,2026-10-20,State Power Board,120000,DUE,Utilities,',
    'expense,2026-10-05,Operational Staff Payroll,220000,,Payroll,',
    'expense,2026-10-25,Factory Operations,80000,,Operations,',
  ].join('\n');
}
