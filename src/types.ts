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

// ── INDUSTRY-AWARE BUSINESS MODEL ────────────────────────────────────────────

export type IndustryId =
  | 'manufacturing'
  | 'wholesale'
  | 'retail'
  | 'saas'
  | 'consulting'
  | 'restaurant'
  | 'logistics'
  | 'healthcare'
  | 'construction'
  | 'other';

/** Engine knob an industry scenario control drives. All are additive no-ops by default. */
export type EngineKnob =
  | 'supplier_delay'        // config.supplier_delay_days
  | 'procurement_reduction' // overrides.procurementReductionPercent
  | 'term_extension'        // overrides.supplierTermExtensionDays
  | 'customer_advance'      // overrides.customerAdvancePercent
  | 'inflow_change'         // overrides.inflowMultiplier (1 + val/100)
  | 'outflow_change'        // overrides.outflowMultiplier (1 + val/100)
  | 'one_time_outflow'      // overrides.oneTimeOutflow = val × scale (lump commitment)
  | 'one_time_inflow'       // overrides.oneTimeInflow = val × scale (lump inflow)
  | 'recurring_outflow';    // overrides.recurringOutflowPerMonth = val × scale

export interface IndustryScenario {
  id: string;
  title: string;
  description: string;
  iconType: 'clock' | 'box' | 'calendar' | 'zap' | 'trending' | 'users' | 'flame' | 'truck' | 'coin';
  paramLabel: string;
  paramUnit: string;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  knob: EngineKnob;
  /** Converts slider value into engine units (e.g. lakhs → rupees). */
  scale?: number;
}

export type MiniatureNodeKind =
  | 'supplier'
  | 'inventory'
  | 'operations'
  | 'customer'
  | 'cash'
  | 'service'
  | 'recurring'
  | 'expense'
  | 'generic';

export interface IndustryMiniatureNode {
  id: string;
  label: string;
  kind: MiniatureNodeKind;
  color: string;      // hex string used for accents
  detail: string;     // short sub-line shown on the 3D overlay card
  description: string;
}

export interface IndustryMiniatureEdge {
  from: string;
  to: string;
  kind: 'goods' | 'inflow' | 'outflow';
}

export interface IndustryMiniatureModel {
  nodes: IndustryMiniatureNode[];
  edges: IndustryMiniatureEdge[];
  /** Node id order used for the shock propagation pulse. */
  shockChain: string[];
  /** Label of the primary shock control, e.g. "Supplier Lead Time". */
  shockLabel: string;
  /** Default shock intensity shown on the 3D control bar. */
  defaultShockValue: number;
  shockMax: number;
}

export type KpiKind =
  | 'currentCash'
  | 'minCash'
  | 'breachProb'
  | 'p10'
  | 'p50'
  | 'p90'
  | 'dio'
  | 'dso'
  | 'dpo'
  | 'ccc'
  | 'totalAR'
  | 'totalAP'
  | 'topOutflow'
  | 'topInflow'
  | 'payrollMonthly'
  | 'runway'
  | 'topOutflowShare'
  | 'dailySales'
  | 'commitmentExposure';

export interface IndustryKpi {
  id: string;
  label: string;
  description: string;
  kind: KpiKind;
  format: 'inr' | 'days' | 'pct' | 'plain';
  /** Used by format 'inr' to render as ₹L vs raw. */
  inLakhs?: boolean;
}

export interface IndustryRecommendation {
  id: string;         // matches engine counterfactual id or alternative id
  title: string;
  action: string;     // concrete industry-specific action text
  detail: string;
}

export interface IndustrySignalRule {
  id: string;
  label: string;
  impactTemplate: string; // template with {amount} placeholder
}

export interface IndustryProfile {
  id: IndustryId;
  name: string;
  description: string;
  icon: string;
  category: string;
  primaryEntities: string[];
  keyDrivers: string[];
  kpis: IndustryKpi[];
  riskDrivers: { id: string; label: string; signal: string; impact: string }[];
  scenarioTypes: IndustryScenario[];
  decisionTypes: { id: string; label: string; question: string; amountHint: number }[];
  safeToCommit: {
    entityLabel: string;         // e.g. "raw-material purchase"
    questionTemplate: string;    // "Can we safely commit {amount} to this {entity}?"
    defaultAmount: number;
    amountHint: number;
  };
  cashFlowDrivers: { inflow: string[]; outflow: string[] };
  aiContext: string;
  miniatureModel: IndustryMiniatureModel;
  recommendations: IndustryRecommendation[];
  signalRules: IndustrySignalRule[];
}

export interface BusinessProfile {
  id: string;
  businessName: string;
  industryId: IndustryId;
  currency: string;
  country: string;
  cashFloor: number;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialSignal {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  impact: string;      // e.g. "₹4.2L of expected cash may be delayed."
  liquidityImpact: 'High' | 'Medium' | 'Low';
  industryId: IndustryId;
}

export interface SafeToCommitInput {
  config: Config;
  transactions: Transaction[];
  payables: Payable[];
  expenses: Expense[];
  inventory: InventoryItem[];
  suppliers: Supplier[];
  historicalSales: Sale[];
  commitmentAmount: number;
  commitmentLabel: string;
  industryId: IndustryId;
}

export type SafeToCommitVerdict = 'SAFE' | 'MARGINAL' | 'UNSAFE';

export interface SafeToCommitAlternative {
  id: string;
  title: string;
  detail: string;
  minCash: number;
  breachProbability: number;
  verdict: SafeToCommitVerdict;
}

export interface SafeToCommitResult {
  verdict: SafeToCommitVerdict;
  currentCash: number;
  cashFloor: number;
  expectedMinCash: number;
  baselineMinCash: number;
  cashImpact: number;
  liquidityRisk: number;         // breach probability after commitment
  breachDate: string | null;
  safeBoundary: number;          // largest commitment that keeps cash safe
  drivers: string[];
  alternatives: SafeToCommitAlternative[];
}

