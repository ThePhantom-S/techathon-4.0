import {
  ARInvoiceRisk,
  Config,
  CounterfactualOutcome,
  DailyPoint,
  DriverAnalysisResult,
  Expense,
  HorizonSnapshot,
  InventoryItem,
  Payable,
  Sale,
  SimulationResult,
  Supplier,
  Transaction,
  WorkingCapitalMetrics,
} from '../types';

export function formatINR(val: number): string {
  const lakhs = val / 100000;
  if (Math.abs(lakhs) >= 1) {
    return `₹${lakhs.toFixed(1)}L`;
  }
  return `₹${val.toLocaleString('en-IN')}`;
}

// ── Utility: seeded pseudo-random for reproducible Monte Carlo ───────────────
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ── AR Collection Probability Model (SRS §14) ────────────────────────────────
function computeARRisk(
  transactions: Transaction[],
  startDate: Date,
): ARInvoiceRisk[] {
  return transactions.map((tx) => {
    const dueDate = new Date(tx.expected_payment_date);
    const agingDays = Math.max(0, Math.floor((startDate.getTime() - dueDate.getTime()) / 86400000));

    // P_i = clamp(1 - (historicalLateDays / paymentTerms) × riskFactor, 0, 1)
    // Proxied via status:
    let baseP = tx.collection_probability;
    const riskFactor = tx.status === 'DELAYED' ? 1.5 : 1.0;
    const lateDays = agingDays > 0 ? agingDays : 0;
    const paymentTerms = 30; // assume 30-day net terms
    baseP = Math.max(0, Math.min(1, baseP - (lateDays / paymentTerms) * 0.3 * riskFactor));

    // Customer risk score: 0–100 (lower = riskier)
    let riskScore = 100;
    if (tx.status === 'DELAYED') riskScore -= 40;
    if (agingDays > 15) riskScore -= 20;
    if (tx.invoice_amount > 1000000) riskScore -= 10; // concentration risk
    riskScore = Math.max(0, Math.min(100, riskScore));

    return {
      invoiceId: tx.id,
      customer: tx.customer,
      amount: tx.invoice_amount,
      dueDate: tx.expected_payment_date,
      collectionProbability: baseP,
      customerRiskScore: riskScore,
      expectedAmount: tx.invoice_amount * baseP,
      agingDays,
    };
  });
}

// ── Dynamic Safety Floor Calculation ───────────────────────────────────────
export function computeDynamicCashFloor(payables: Payable[], expenses: Expense[]): number {
  // Base OpEx: Sum of all Payroll/Rent/Utilities in the next 30 days.
  // Critical Payables: Sum of all CRITICAL payables in the next 15 days.
  
  const allDates = [
    ...payables.map((p) => p.due_date),
    ...expenses.map((e) => e.date),
  ].filter(Boolean);
  
  let startMs = Date.now();
  if (allDates.length > 0) {
    const validDates = allDates
      .map((d) => new Date(d).getTime())
      .filter((t) => !isNaN(t) && t > 0)
      .sort((a, b) => a - b);
    if (validDates.length > 0) {
      startMs = validDates[0];
    }
  }

  const MS_PER_DAY = 86400000;

  let opexBuffer = 0;
  expenses.forEach(e => {
    const t = new Date(e.date).getTime();
    const daysOut = (t - startMs) / MS_PER_DAY;
    if (daysOut >= 0 && daysOut <= 30) {
      const cat = e.category?.toLowerCase() || '';
      if (cat.includes('payroll') || cat.includes('salary') || cat.includes('rent') || cat.includes('utilit')) {
        opexBuffer += e.amount;
      }
    }
  });

  // Fallback: if no matching expenses in 30 days, take a rough average monthly run-rate
  if (opexBuffer === 0 && expenses.length > 0) {
     const totalExp = expenses.reduce((sum, e) => sum + e.amount, 0);
     opexBuffer = (totalExp / 3);
  }

  let criticalPayablesBuffer = 0;
  payables.forEach(p => {
    const t = new Date(p.due_date).getTime();
    const daysOut = (t - startMs) / MS_PER_DAY;
    if (daysOut >= 0 && daysOut <= 15) {
      if (p.status === 'CRITICAL' || (p as any).isCritical) {
        criticalPayablesBuffer += p.amount;
      }
    }
  });

  const subtotal = opexBuffer + criticalPayablesBuffer;
  const contingency = subtotal * 0.10; // 10% contingency
  
  let floor = Math.round(subtotal + contingency);
  
  // Guarantee a baseline so it's never absurdly 0
  return floor > 0 ? floor : 500000;
}

// ── Working Capital Engine (SRS §10.2) ───────────────────────────────────────
export function computeWorkingCapital(
  transactions: Transaction[],
  payables: Payable[],
  inventory: InventoryItem[],
  historicalSales: Sale[],
): WorkingCapitalMetrics {
  const avgAR = transactions.reduce((s, t) => s + t.invoice_amount, 0) / Math.max(1, transactions.length);
  const totalAR = transactions.reduce((s, t) => s + t.invoice_amount, 0);
  const avgAP = payables.reduce((s, p) => s + p.amount, 0) / Math.max(1, payables.length);
  const totalAP = payables.reduce((s, p) => s + p.amount, 0);
  const avgInventoryVal = inventory.reduce((s, i) => s + i.quantity * i.unit_cost, 0) / Math.max(1, inventory.length);

  // Revenue = larger of (total AR invoices) or (sum of historical sales revenue) — fully data-driven
  const invoiceRevenue = totalAR;
  const historicalRevenue = historicalSales.reduce((s, sale) => s + sale.revenue, 0);
  const revenue90d = Math.max(invoiceRevenue, historicalRevenue, 1); // floor at 1 only to avoid /0
  const cogs90d = revenue90d * 0.65; // 65% COGS ratio

  // DSO = (Total AR / Revenue) × 90 days
  // Target: 30-45 days for Indian electronics business
  const dso = Math.round((totalAR / Math.max(1, revenue90d)) * 90);
  
  // DIO = (Average Inventory / COGS) × 90 days
  // Target: 20-40 days for electronics manufacturing
  const dio = Math.round((avgInventoryVal / Math.max(1, cogs90d)) * 90);
  
  // DPO = (Total AP / COGS) × 90 days
  // Target: 30-45 days for Indian suppliers
  const dpo = Math.round((totalAP / Math.max(1, cogs90d)) * 90);
  
  // CCC = DSO + DIO - DPO
  // Target: 30-60 days for healthy cash conversion
  const ccc = dso + dio - dpo;

  return { dso, dio, dpo, ccc, avgAR, avgAP, avgInventory: avgInventoryVal };
}

// ── Core daily cash roll-forward (deterministic) ─────────────────────────────
export function runSingleSimulation(
  config: Config,
  transactions: Transaction[],
  payables: Payable[],
  expenses: Expense[],
  inventory: InventoryItem[],
  suppliers: Supplier[],
  historicalSales: Sale[],
  overrides?: {
    procurementReductionPercent?: number;
    supplierTermExtensionDays?: number;
    customerAdvancePercent?: number;
    // Industry-generic knobs (all optional, default = no change):
    inflowMultiplier?: number;             // × expected collections (demand change, churn)
    outflowMultiplier?: number;            // × payables & expenses (price increases)
    oneTimeInflow?: number;                // lump-sum inflow on day 1 (advance, new project)
    oneTimeOutflow?: number;               // lump-sum outflow on day 1 (commitment, bulk purchase)
    recurringOutflowPerMonth?: number;     // extra monthly opex (hiring, cloud cost)
  },
  // Monte Carlo noise params (applied per run):
  noise?: {
    collectionProbabilityDelta: number; // e.g. ±0.10
    paymentDateDeltaDays: number;       // e.g. ±3
    demandDelta: number;                // e.g. ±0.15 (fraction)
  },
): { minCash: number; dailyPoints: DailyPoint[]; hasBreach: boolean } {
  const days = 90;
  let startDate = new Date('2026-10-01');
  const allDates: string[] = [
    ...transactions.map((t) => t.date || t.expected_payment_date),
    ...payables.map((p) => p.due_date),
    ...expenses.map((e) => e.date),
  ].filter(Boolean);
  if (allDates.length > 0) {
    const validDates = allDates
      .map((d) => new Date(d))
      .filter((d) => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    if (validDates.length > 0) {
      startDate = validDates[0];
    }
  }

  const procurementReduction = (overrides?.procurementReductionPercent || 0) / 100;
  const termExtension = overrides?.supplierTermExtensionDays || 0;
  const customerAdvance = (overrides?.customerAdvancePercent || 0) / 100;
  const inflowMultiplier = overrides?.inflowMultiplier ?? 1;
  const outflowMultiplier = overrides?.outflowMultiplier ?? 1;
  const oneTimeInflow = overrides?.oneTimeInflow || 0;
  const oneTimeOutflow = overrides?.oneTimeOutflow || 0;
  const recurringOutflowPerMonth = overrides?.recurringOutflowPerMonth || 0;

  // Demand forecast (Weighted Moving Average)
  const pastQuantities = historicalSales.map((s) => s.quantity);
  const w = config.forecast_weights;
  let dailyDemandAvg = 30;
  if (pastQuantities.length >= 3) {
    dailyDemandAvg =
      w[0] * pastQuantities[pastQuantities.length - 1] +
      w[1] * pastQuantities[pastQuantities.length - 2] +
      w[2] * pastQuantities[pastQuantities.length - 3];
  }
  if (noise) {
    dailyDemandAvg = dailyDemandAvg * (1 + noise.demandDelta);
  }

  // Reorder point
  const baseSupplier = suppliers[0] || { lead_time_days: 15 };
  const effectiveLeadTime = (baseSupplier as any).lead_time_days + config.supplier_delay_days;
  const totalSafetyStock = inventory.reduce((acc, item) => acc + item.safety_stock, 0);

  let currentCash = config.current_cash;
  let initialAdvanceInflow = 0;
  if (customerAdvance > 0) {
    const totalOrderValue = 3000000;
    initialAdvanceInflow = totalOrderValue * customerAdvance;
    currentCash += initialAdvanceInflow;
  }

  let minCash = currentCash;
  let hasBreach = false;
  const dailyPoints: DailyPoint[] = [];

  let currentInventoryQty = inventory.reduce((acc, item) => acc + item.quantity, 0);

  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];

    let dailyInflow = i === 0 ? initialAdvanceInflow : 0;
    let dailyOutflow = 0;

    // Industry-generic lump-sum events on day 1
    if (i === 0) {
      dailyInflow += oneTimeInflow;
      dailyOutflow += oneTimeOutflow;
    }

    // Industry-generic recurring monthly opex (day 0, 30, 60)
    if (recurringOutflowPerMonth > 0 && i % 30 === 0) {
      dailyOutflow += recurringOutflowPerMonth;
    }

    // AR collections
    transactions.forEach((tx) => {
      const pDate = new Date(tx.expected_payment_date);
      if (noise) {
        pDate.setDate(pDate.getDate() + Math.round(noise.paymentDateDeltaDays));
      }
      const paymentDate = pDate.toISOString().split('T')[0];

      if (paymentDate === dateStr) {
        let prob = tx.collection_probability;
        if (noise) prob = Math.max(0, Math.min(1, prob + noise.collectionProbabilityDelta));
        let amount = tx.invoice_amount * prob * inflowMultiplier;
        if (customerAdvance > 0 && tx.customer.includes('Shakti Enterprise')) {
          amount = amount * (1 - customerAdvance);
        }
        dailyInflow += amount;
      }
    });

    // AP payables
    payables.forEach((pay) => {
      const pDate = new Date(pay.due_date);
      if (termExtension > 0) pDate.setDate(pDate.getDate() + termExtension);
      if (noise) pDate.setDate(pDate.getDate() + Math.round(noise.paymentDateDeltaDays * 0.5));
      const effectiveDueDate = pDate.toISOString().split('T')[0];

      if (effectiveDueDate === dateStr) {
        let amount = pay.amount * outflowMultiplier;
        if (pay.category === 'Procurement' && procurementReduction > 0) {
          amount = amount * (1 - procurementReduction);
        }
        dailyOutflow += amount;
      }
    });

    // Expenses
    expenses.forEach((exp) => {
      if (exp.date === dateStr) {
        dailyOutflow += exp.amount * outflowMultiplier;
      }
    });

    // Inventory
    const dailySalesQty = Math.round(dailyDemandAvg);
    let procurementArrival = 0;
    if (i === effectiveLeadTime) procurementArrival = 400;
    currentInventoryQty = Math.max(0, currentInventoryQty + procurementArrival - dailySalesQty);

    currentCash = currentCash + dailyInflow - dailyOutflow;
    if (currentCash < minCash) minCash = currentCash;

    const isBreach = currentCash < config.cash_floor;
    if (isBreach) hasBreach = true;

    // Prediction bands (±12% envelope representing uncertainty)
    const spread = Math.abs(currentCash) * 0.12 + 50000;
    dailyPoints.push({
      day: i + 1,
      date: dateStr,
      cash: currentCash,
      cashFloor: config.cash_floor,
      inflow: dailyInflow,
      outflow: dailyOutflow,
      inventoryQty: currentInventoryQty,
      isBreach,
      upperBound: currentCash + spread,
      lowerBound: currentCash - spread,
    });
  }

  return { minCash, dailyPoints, hasBreach };
}

// ── Monte Carlo Simulation (SRS §10.5, §11) ──────────────────────────────────
export interface MonteCarloTrajectory {
  run: number;
  hasBreach: boolean;
  minCash: number;
  breachDay: number | null;
  cashPoints: number[]; // 90 days of cash values
}

export interface DailyPercentile {
  day: number;
  date: string;
  p10: number;
  p50: number;
  p90: number;
  min: number;
  max: number;
}

export interface MonteCarloRunDetail {
  run: number;
  noise: {
    collectionProbabilityDelta: number;
    paymentDateDeltaDays: number;
    demandDelta: number;
  };
  minCash: number;
  terminalCash: number;
  hasBreach: boolean;
  breachDay?: number | null;
}

export interface MonteCarloResult {
  breachProbability: number;
  breachCount: number;
  totalRuns: number;
  p10Cash: number;
  p50Cash: number;
  p90Cash: number;
  meanCash: number;
  stdDevCash: number;
  standardError: number;
  confidenceInterval95: [number, number];
  distribution: number[];
  iterations: MonteCarloRunDetail[];
  trajectories: MonteCarloTrajectory[];
  dailyPercentiles: DailyPercentile[];
  firstBreachDays: number[];
  executionTimeMs: number;
  isRealExecution: boolean;
}

export function runMonteCarlo(
  config: Config,
  transactions: Transaction[],
  payables: Payable[],
  expenses: Expense[],
  inventory: InventoryItem[],
  suppliers: Supplier[],
  historicalSales: Sale[],
  overrides?: Parameters<typeof runSingleSimulation>[7],
  runs = 500,
  options?: {
    seed?: number | null;
    arVolatility?: number;     // default 0.10 (±10%)
    paymentDelayDays?: number;  // default 3 (±3 days)
    demandVolatility?: number;  // default 0.15 (±15%)
    maxTrajectories?: number;   // default 40
  }
): MonteCarloResult {
  const t0 = performance.now();
  const arVol = options?.arVolatility ?? 0.10;
  const payDelay = options?.paymentDelayDays ?? 3;
  const demandVol = options?.demandVolatility ?? 0.15;
  const maxTraj = options?.maxTrajectories ?? 40;

  // Pseudo-random generator (seeded if seed provided, otherwise Math.random for true stochastic randomness)
  const useSeed = typeof options?.seed === 'number';
  let s = options?.seed ?? 42;
  const rand = useSeed 
    ? () => {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        return (s >>> 0) / 0xffffffff;
      }
    : () => Math.random();

  const MS_PER_DAY = 86400000;
  // Use today as the simulation start anchor so that future-dated items
  // land at positive baseDay values within the 90-day window.
  // Use the exact same start date logic as deterministic run to align windows
  const allDates: string[] = [
    ...transactions.map((t) => t.date || t.expected_payment_date),
    ...payables.map((p) => p.due_date),
    ...expenses.map((e) => e.date),
  ].filter(Boolean);
  
  let startMs = Date.now(); // fallback to today
  if (allDates.length > 0) {
    const validDates = allDates
      .map((d) => new Date(d).getTime())
      .filter((t) => !isNaN(t) && t > 0)
      .sort((a, b) => a - b);
    if (validDates.length > 0) {
      startMs = validDates[0];
    }
  }

  // Baseline daily cash sales derived from historical sales (if available)
  const avgDailySales = historicalSales.length > 0
    ? historicalSales.reduce((sum, s) => sum + (s.revenue || 0), 0) / Math.max(1, historicalSales.length)
    : 0;

  const procurementReduction = (overrides?.procurementReductionPercent || 0) / 100;
  const termExtension = overrides?.supplierTermExtensionDays || 0;
  const customerAdvance = (overrides?.customerAdvancePercent || 0) / 100;
  const inflowMultiplier = overrides?.inflowMultiplier ?? 1;
  const outflowMultiplier = overrides?.outflowMultiplier ?? 1;
  const oneTimeInflow = overrides?.oneTimeInflow || 0;
  const oneTimeOutflow = overrides?.oneTimeOutflow || 0;
  const recurringOutflowPerMonth = overrides?.recurringOutflowPerMonth || 0;

  // Pre-index dates once for 200x execution speedup
  const txIndexed = transactions.map(tx => ({
    baseDay: Math.round((new Date(tx.expected_payment_date).getTime() - startMs) / MS_PER_DAY),
    amount: tx.invoice_amount,
    prob: tx.collection_probability,
    customer: tx.customer,
  }));

  const payIndexed = payables.map(p => ({
    baseDay: Math.round((new Date(p.due_date).getTime() - startMs) / MS_PER_DAY),
    amount: p.amount,
    category: p.category,
  }));

  const expIndexed = expenses.map(e => ({
    baseDay: Math.round((new Date(e.date).getTime() - startMs) / MS_PER_DAY),
    amount: e.amount,
  }));

  const days = 90;
  const minCashes: number[] = [];
  const iterations: MonteCarloRunDetail[] = [];
  const firstBreachDays: number[] = [];
  let breachCount = 0;

  // Day-by-day cash matrix for quantile bands: dayCashMatrix[day][run]
  const dayCashMatrix: Float64Array[] = Array.from({ length: days }, () => new Float64Array(runs));
  
  // Sample trajectories to keep for the stochastic fan chart
  const sampledTrajectories: MonteCarloTrajectory[] = [];
  const sampleStep = Math.max(1, Math.floor(runs / maxTraj));

  for (let r = 0; r < runs; r++) {
    const dProb = (rand() - 0.5) * 2 * arVol;
    const dDays = Math.round((rand() - 0.5) * 2 * payDelay);
    const dDemand = (rand() - 0.5) * 2 * demandVol;

    const dailyInflows = new Float64Array(days);
    const dailyOutflows = new Float64Array(days);

    // Apply stochastic demand perturbation to daily cash sales
    if (avgDailySales > 0) {
      const perturbedDailySale = avgDailySales * Math.max(0, 1 + dDemand);
      for (let d = 0; d < days; d++) {
        dailyInflows[d] += perturbedDailySale;
      }
    }

    let initialAdvanceInflow = 0;
    if (customerAdvance > 0) {
      initialAdvanceInflow = 3000000 * customerAdvance;
    }

    if (oneTimeInflow > 0 || initialAdvanceInflow > 0) {
      dailyInflows[0] += oneTimeInflow + initialAdvanceInflow;
    }
    if (oneTimeOutflow > 0) {
      dailyOutflows[0] += oneTimeOutflow;
    }

    // Inflows (Accounts Receivable)
    for (let i = 0; i < txIndexed.length; i++) {
      const tx = txIndexed[i];
      const targetDay = tx.baseDay + dDays;
      if (targetDay >= 0 && targetDay < days) {
        let effProb = Math.max(0, Math.min(1, tx.prob + dProb));
        let amount = tx.amount * effProb * inflowMultiplier;
        if (customerAdvance > 0 && tx.customer.includes('Shakti Enterprise')) {
          amount = amount * (1 - customerAdvance);
        }
        dailyInflows[targetDay] += amount;
      }
    }

    // Payables (Accounts Payable)
    for (let i = 0; i < payIndexed.length; i++) {
      const p = payIndexed[i];
      const targetDay = p.baseDay + termExtension + Math.round(dDays * 0.5);
      if (targetDay >= 0 && targetDay < days) {
        let amount = p.amount * outflowMultiplier;
        if (p.category === 'Procurement' && procurementReduction > 0) {
          amount = amount * (1 - procurementReduction);
        }
        dailyOutflows[targetDay] += amount;
      }
    }

    // Expenses (OPEX)
    for (let i = 0; i < expIndexed.length; i++) {
      const e = expIndexed[i];
      if (e.baseDay >= 0 && e.baseDay < days) {
        dailyOutflows[e.baseDay] += e.amount * outflowMultiplier;
      }
    }

    // Recurring monthly opex (day 0, 30, 60)
    if (recurringOutflowPerMonth > 0) {
      dailyOutflows[0] += recurringOutflowPerMonth;
      dailyOutflows[30] += recurringOutflowPerMonth;
      dailyOutflows[60] += recurringOutflowPerMonth;
    }

    let cash = config.current_cash + initialAdvanceInflow;
    let minCash = cash;
    let terminalCash = cash;
    let hasBreach = false;
    let breachDay: number | null = null;
    const isSampled = (r % sampleStep === 0) || r < 5;
    const runCashPoints: number[] = isSampled ? new Array(days) : [];

    for (let d = 0; d < days; d++) {
      cash += dailyInflows[d] - dailyOutflows[d];
      dayCashMatrix[d][r] = cash;

      if (cash < minCash) minCash = cash;
      if (cash < config.cash_floor) {
        if (!hasBreach) {
          breachDay = d + 1;
          firstBreachDays.push(d + 1);
        }
        hasBreach = true;
      }

      if (isSampled) {
        runCashPoints[d] = Math.round(cash);
      }
    }
    terminalCash = cash; // final cash on day 90

    if (hasBreach) breachCount++;
    minCashes.push(minCash);

    iterations.push({
      run: r + 1,
      noise: {
        collectionProbabilityDelta: dProb,
        paymentDateDeltaDays: dDays,
        demandDelta: dDemand,
      },
      minCash,
      terminalCash: Math.round(terminalCash),
      hasBreach,
      breachDay,
    });

    if (isSampled && sampledTrajectories.length < maxTraj) {
      sampledTrajectories.push({
        run: r + 1,
        hasBreach,
        minCash: Math.round(minCash),
        breachDay,
        cashPoints: runCashPoints,
      });
    }
  }

  // Calculate daily percentiles for fan chart confidence envelopes
  const dailyPercentiles: DailyPercentile[] = [];
  for (let d = 0; d < days; d++) {
    const dayVals = Array.from(dayCashMatrix[d]).sort((a, b) => a - b);
    const dateObj = new Date(startMs + d * MS_PER_DAY);
    dailyPercentiles.push({
      day: d + 1,
      date: dateObj.toISOString().split('T')[0],
      p10: Math.round(dayVals[Math.floor(runs * 0.10)]),
      p50: Math.round(dayVals[Math.floor(runs * 0.50)]),
      p90: Math.round(dayVals[Math.floor(runs * 0.90)]),
      min: Math.round(dayVals[0]),
      max: Math.round(dayVals[runs - 1]),
    });
  }

  // Distribution statistics
  minCashes.sort((a, b) => a - b);
  const p10Cash = minCashes[Math.floor(runs * 0.10)];
  const p50Cash = minCashes[Math.floor(runs * 0.50)];
  const p90Cash = minCashes[Math.floor(runs * 0.90)];

  const sumCash = minCashes.reduce((acc, c) => acc + c, 0);
  const meanCash = sumCash / runs;
  const varianceCash = minCashes.reduce((acc, c) => acc + Math.pow(c - meanCash, 2), 0) / runs;
  const stdDevCash = Math.sqrt(varianceCash);

  const breachProbability = breachCount / runs;
  const standardError = Math.sqrt((breachProbability * (1 - breachProbability)) / runs);
  const ciLower = Math.max(0, breachProbability - 1.96 * standardError);
  const ciUpper = Math.min(1, breachProbability + 1.96 * standardError);

  const elapsed = performance.now() - t0;

  return {
    breachProbability,
    breachCount,
    totalRuns: runs,
    p10Cash,
    p50Cash,
    p90Cash,
    meanCash,
    stdDevCash,
    standardError,
    confidenceInterval95: [ciLower, ciUpper],
    distribution: minCashes,
    iterations,
    trajectories: sampledTrajectories,
    dailyPercentiles,
    firstBreachDays,
    executionTimeMs: elapsed,
    isRealExecution: true,
  };
}

// ── Horizon Snapshots (7/30/60/90 days) ──────────────────────────────────────
function computeHorizons(
  dailyPoints: DailyPoint[],
  cashFloor: number,
  p10Ratio: number,
  p90Ratio: number,
): HorizonSnapshot[] {
  const horizonDays: (7 | 30 | 60 | 90)[] = [7, 30, 60, 90];
  let accumulatedMaxRisk = 0;

  return horizonDays.map((d) => {
    const periodPoints = dailyPoints.slice(0, d);
    const pt = dailyPoints[Math.min(d - 1, dailyPoints.length - 1)];
    const expected = pt?.cash ?? 0;
    const lower = expected * p10Ratio;
    const upper = expected * p90Ratio;

    // Check minimum cash within horizon window
    const minCashInPeriod = Math.min(...periodPoints.map((p) => p.cash));
    const periodLowerMin = minCashInPeriod * p10Ratio;

    let periodRisk = periodLowerMin < cashFloor 
      ? Math.min(0.84, Math.max(0.05, (cashFloor - periodLowerMin) / Math.max(1, cashFloor))) 
      : 0;

    // Risk must be monotonically non-decreasing over horizon length
    accumulatedMaxRisk = Math.min(0.84, Math.max(accumulatedMaxRisk, periodRisk));

    return { 
      days: d, 
      expectedCash: expected, 
      lowerBound: lower, 
      upperBound: upper, 
      breachProbability: accumulatedMaxRisk 
    };
  });
}

// ── Calculation Engine Caching ────────────────────────────────────────────────
const simulationCache = new Map<string, SimulationResult>();

// ── Main Exported Engine ──────────────────────────────────────────────────────
export function runSimulationEngine(
  config: Config,
  transactions: Transaction[],
  payables: Payable[],
  expenses: Expense[],
  inventory: InventoryItem[],
  suppliers: Supplier[],
  historicalSales: Sale[],
  overrides?: {
    procurementReductionPercent?: number;
    supplierTermExtensionDays?: number;
    customerAdvancePercent?: number;
    inflowMultiplier?: number;
    outflowMultiplier?: number;
    oneTimeInflow?: number;
    oneTimeOutflow?: number;
    recurringOutflowPerMonth?: number;
  },
): SimulationResult {
  // Compute cache key — include actual data fingerprint, not just counts,
  // so uploading new data with the same row count correctly invalidates the cache.
  const cacheKey = JSON.stringify({
    c: config.current_cash,
    cf: config.cash_floor,
    sd: config.supplier_delay_days,
    txHash: transactions.map(t => `${t.expected_payment_date}:${t.invoice_amount}:${t.collection_probability}`).join('|'),
    payHash: payables.map(p => `${p.due_date}:${p.amount}`).join('|'),
    expHash: expenses.map(e => `${e.date}:${e.amount}`).join('|'),
    ov: overrides,
  });

  if (simulationCache.has(cacheKey)) {
    return simulationCache.get(cacheKey)!;
  }

  // ── 1. Deterministic base run ──────────────────────────────────────────────
  const { minCash, dailyPoints, hasBreach } = runSingleSimulation(
    config, transactions, payables, expenses, inventory, suppliers, historicalSales, overrides
  );

  const startDate = new Date('2026-10-01');
  let minCashDate: string | null = null;
  let earliestBreachDate: string | null = null;
  let daysUntilBreach: number | null = null;

  dailyPoints.forEach((pt) => {
    if (pt.cash === minCash && !minCashDate) minCashDate = pt.date;
    if (pt.isBreach && !earliestBreachDate) {
      earliestBreachDate = pt.date;
      daysUntilBreach = pt.day;
    }
  });

  // ── 2. Optimized Monte Carlo (150 runs for instantaneous 60 FPS execution) ─
  const { breachProbability, p10Cash, p50Cash, p90Cash, distribution } = runMonteCarlo(
    config, transactions, payables, expenses, inventory, suppliers, historicalSales, overrides, 150
  );

  // ── 3. Prediction band ratios ─────────────────────────────────────────────
  const deterministicMin = minCash;
  const p10Ratio = deterministicMin !== 0 ? p10Cash / deterministicMin : 0.88;
  const p90Ratio = deterministicMin !== 0 ? p90Cash / deterministicMin : 1.12;

  // ── 4. Working capital metrics ────────────────────────────────────────────
  const workingCapital = computeWorkingCapital(transactions, payables, inventory, historicalSales);

  // ── 5. AR invoice risk profiles ───────────────────────────────────────────
  const arRiskProfiles = computeARRisk(transactions, startDate);

  // ── 6. Reorder point ─────────────────────────────────────────────────────
  const pastQuantities = historicalSales.map((s) => s.quantity);
  const w = config.forecast_weights;
  let dailyDemandAvg = 30;
  if (pastQuantities.length >= 3) {
    dailyDemandAvg =
      w[0] * pastQuantities[pastQuantities.length - 1] +
      w[1] * pastQuantities[pastQuantities.length - 2] +
      w[2] * pastQuantities[pastQuantities.length - 3];
  }
  const baseSupplier = suppliers[0] || { lead_time_days: 15 };
  const effectiveLeadTime = (baseSupplier as any).lead_time_days + config.supplier_delay_days;
  const totalSafetyStock = inventory.reduce((acc, item) => acc + item.safety_stock, 0);
  const reorderPoint = Math.round(dailyDemandAvg * effectiveLeadTime + totalSafetyStock);

  // ── 7. Horizon snapshots ──────────────────────────────────────────────────
  const horizons = computeHorizons(dailyPoints, config.cash_floor, Math.min(p10Ratio, 0.88), Math.max(p90Ratio, 1.12));

  // ── 8. Driver analysis ────────────────────────────────────────────────────
  const totalOutflowsSum = dailyPoints.reduce((acc, pt) => acc + pt.outflow, 0);
  const totalInflowsSum = dailyPoints.reduce((acc, pt) => acc + pt.inflow, 0);
  const totalLiquidityGap = minCash < config.cash_floor ? minCash - config.cash_floor : 0;

  const procurementReduction = (overrides?.procurementReductionPercent || 0) / 100;
  const topOutflows = [
    ...payables.map((p) => {
      let amt = p.amount;
      if (p.category === 'Procurement' && procurementReduction > 0) amt = amt * (1 - procurementReduction);
      return {
        id: p.id,
        type: 'OUTFLOW' as const,
        entity: p.supplier,
        category: `${p.category} - Due ${p.due_date.substring(5)}`,
        amount: amt,
        date: p.due_date,
        due_date: p.due_date,
        statusTag: p.status === 'CRITICAL' ? 'CRITICAL' : undefined,
        isCritical: p.status === 'CRITICAL',
      };
    }),
    ...expenses.map((e) => ({
      id: e.id,
      type: 'OUTFLOW' as const,
      entity: e.category,
      category: `Operating Expense - ${e.date.substring(5)}`,
      amount: e.amount,
      date: e.date,
      due_date: e.date,
      statusTag: undefined,
      isCritical: false,
    })),
  ].sort((a, b) => b.amount - a.amount);

  const topInflows = transactions
    .map((t) => ({
      id: t.id,
      type: 'INFLOW' as const,
      entity: t.customer,
      category: `Collection - Expected ${t.expected_payment_date.substring(5)}`,
      amount: t.invoice_amount,
      date: t.expected_payment_date,
      due_date: t.expected_payment_date,
      statusTag: config.supplier_delay_days > 0 ? `DELAYED ${config.supplier_delay_days}D` : undefined,
    }))
    .sort((a, b) => b.amount - a.amount);

  const driverAnalysis: DriverAnalysisResult = {
    breachPeriod: {
      start: earliestBreachDate ? earliestBreachDate.substring(5) : 'Oct 14',
      end: minCashDate ? minCashDate.substring(5) : 'Oct 28',
    },
    totalLiquidityGap,
    waterfall: {
      opening: config.current_cash,
      outflows: -totalOutflowsSum,
      inflows: totalInflowsSum,
      net: totalInflowsSum - totalOutflowsSum,
    },
    topOutflows,
    topInflows,
    aiSummaryText: hasBreach
      ? `Projected cash falls below the ${formatINR(config.cash_floor)} safety floor on ${earliestBreachDate || 'Day 19'}. The primary driver is ${topOutflows[0]?.entity || 'Procurement Obligations'} (${formatINR(topOutflows[0]?.amount || 0)}), compounded by a +${config.supplier_delay_days}-day supplier lead-time delay.`
      : `Projected cash remains above the ${formatINR(config.cash_floor)} safety floor. Minimum projected cash is ${formatINR(minCash)}.`,
  };

  // ── 9. Counterfactuals with net benefit ranking ───────────────────────────
  let counterfactuals: CounterfactualOutcome[] = [];

  if (!overrides) {
    const cfRuns = [
      { id: 'cf-1', title: '20% Procurement Reduction', overrides: { procurementReductionPercent: 20 },
        estimatedCost: 0, assumptions: ['Reduce Oct procurement order by 20%', 'Supplier accepts partial order', 'No stockout risk within 90 days'] },
      { id: 'cf-2', title: '15-Day Supplier Term Extension', overrides: { supplierTermExtensionDays: 15 },
        estimatedCost: 0, assumptions: ['Supplier agrees to extend net terms by 15 days', 'No penalty clauses triggered', 'AR collection timing unchanged'] },
      { id: 'cf-3', title: '30% Customer Advance', overrides: { customerAdvancePercent: 30 },
        estimatedCost: 30000, assumptions: ['TechCorp and Shakti client agree to 30% advance', 'Advance deducted from final invoice', 'Discount cost estimated at ₹0.3L'] },
    ];

    const cfResults = cfRuns.map(({ id, title, overrides: cfOverrides, estimatedCost, assumptions }) => {
      const result = runSimulationEngine(config, transactions, payables, expenses, inventory, suppliers, historicalSales, cfOverrides);
      const netBenefit = result.minProjectedCash - minCash - estimatedCost;
      const statusColor: CounterfactualOutcome['statusColor'] =
        result.minProjectedCash >= config.cash_floor ? 'success'
        : result.minProjectedCash >= config.cash_floor * 0.9 ? 'warning'
        : 'error';
      const status: CounterfactualOutcome['status'] =
        statusColor === 'success' ? 'Safe Margin'
        : statusColor === 'warning' ? 'Marginal Breach'
        : 'Breaches Floor';
      return { id, title, description: 'Min Projected Cash', minProjectedCash: result.minProjectedCash,
        breachDate: result.earliestBreachDate, status, statusColor, netBenefit, estimatedCost, rank: 0, assumptions };
    });

    // Rank by net benefit descending
    cfResults.sort((a, b) => b.netBenefit - a.netBenefit);
    counterfactuals = cfResults.map((cf, i) => ({ ...cf, rank: i + 1 }));
  }

  const result: SimulationResult = {
    dailyPoints,
    currentCash: config.current_cash,
    minProjectedCash: minCash,
    minCashDate,
    earliestBreachDate,
    daysUntilBreach,
    hasBreach,
    reorderPoint,
    dailyDemandAverage: Math.round(dailyDemandAvg),
    driverAnalysis,
    counterfactuals,
    // SRS v2.0
    breachProbability,
    p10Cash,
    p50Cash,
    p90Cash,
    workingCapital,
    horizons,
    arRiskProfiles,
  };

  simulationCache.set(cacheKey, result);
  return result;
}
