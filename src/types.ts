export interface Transaction {
  id: string;
  date: string;
  customer: string;
  invoice_amount: number;
  expected_payment_date: string;
  collection_probability: number; // 0 to 1
  status: 'PENDING' | 'COLLECTED' | 'DELAYED';
}

export interface Sale {
  date: string;
  SKU: string;
  quantity: number;
  revenue: number;
}

export interface InventoryItem {
  SKU: string;
  name: string;
  quantity: number;
  unit_cost: number;
  safety_stock: number;
}

export interface Supplier {
  id: string;
  supplier: string;
  SKU: string;
  lead_time_days: number;
  payment_terms_days: number;
}

export interface Payable {
  id: string;
  supplier: string;
  amount: number;
  due_date: string;
  category: string;
  status: 'DUE' | 'PAID' | 'CRITICAL';
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
}

export interface Config {
  current_cash: number; // in INR e.g. 1,240,000 (12.4L)
  cash_floor: number;   // in INR e.g. 500,000 (5L)
  forecast_weights: [number, number, number]; // e.g. [0.5, 0.3, 0.2]
  supplier_delay_days: number; // Live shock input (0 - 60)
}

export interface DailyPoint {
  day: number;
  date: string;
  cash: number;
  cashFloor: number;
  inflow: number;
  outflow: number;
  inventoryQty: number;
  isBreach: boolean;
  upperBound: number;
  lowerBound: number;
}

export interface WorkingCapitalMetrics {
  dso: number;          // Days Sales Outstanding
  dio: number;          // Days Inventory Outstanding
  dpo: number;          // Days Payable Outstanding
  ccc: number;          // Cash Conversion Cycle = DIO + DSO - DPO
  avgAR: number;        // Average Accounts Receivable
  avgAP: number;        // Average Accounts Payable
  avgInventory: number; // Average Inventory Value
}

export interface HorizonSnapshot {
  days: 7 | 30 | 60 | 90;
  expectedCash: number;
  lowerBound: number;
  upperBound: number;
  breachProbability: number; // 0–1
}

export interface ARInvoiceRisk {
  invoiceId: string;
  customer: string;
  amount: number;
  dueDate: string;
  collectionProbability: number;
  customerRiskScore: number; // 0–100, lower = riskier
  expectedAmount: number;    // amount × collectionProbability
  agingDays: number;
}

export interface CashDriver {
  id: string;
  type: 'INFLOW' | 'OUTFLOW';
  entity: string;
  category: string;
  amount: number;
  date: string;
  statusTag?: string; // e.g., "CRITICAL", "DELAYED 20D"
  isCritical?: boolean;
}

export interface DriverAnalysisResult {
  breachPeriod: { start: string; end: string };
  totalLiquidityGap: number; // e.g. -2.6L (-260000)
  waterfall: {
    opening: number;
    outflows: number;
    inflows: number;
    net: number;
  };
  topOutflows: CashDriver[];
  topInflows: CashDriver[];
  aiSummaryText: string;
}

export interface CounterfactualOutcome {
  id: string;
  title: string;
  description: string;
  minProjectedCash: number;
  breachDate: string | null;
  status: 'Breaches Floor' | 'Marginal Breach' | 'Safe Margin';
  statusColor: 'error' | 'warning' | 'success';
  netBenefit: number;      // ₹ improvement vs baseline minCash
  estimatedCost: number;   // e.g. discount cost
  rank: number;            // 1 = best
  assumptions: string[];   // human-readable assumption list
}

export interface SimulationResult {
  dailyPoints: DailyPoint[];
  currentCash: number;
  minProjectedCash: number;
  minCashDate: string | null;
  earliestBreachDate: string | null;
  daysUntilBreach: number | null;
  hasBreach: boolean;
  reorderPoint: number;
  dailyDemandAverage: number;
  driverAnalysis: DriverAnalysisResult;
  counterfactuals: CounterfactualOutcome[];
  // SRS v2.0 additions
  breachProbability: number;          // 0–1 from Monte Carlo (500 runs)
  p10Cash: number;                    // 10th percentile min cash
  p50Cash: number;                    // 50th percentile min cash
  p90Cash: number;                    // 90th percentile min cash
  workingCapital: WorkingCapitalMetrics;
  horizons: HorizonSnapshot[];        // 7/30/60/90 day snapshots
  arRiskProfiles: ARInvoiceRisk[];    // per-invoice AR risk
}

export interface VoiceQueryResponse {
  intent: string;
  explanation: string;
  recommendedAction?: string;
  verifiedDataUsed: Record<string, any>;
}
