/**
 * signals.ts
 * Deterministic industry-aware Financial Signal Detection.
 *
 * Signals are computed ONLY from verified engine results (runSimulationEngine)
 * and the selected industry profile — never invented by the LLM. The AI layer
 * explains these signals but cannot fabricate their impact amounts.
 */
import { FinancialSignal, IndustryId, SimulationResult } from '../types';
import { getIndustryProfile } from '../config/industries';
import type { DbFinancials } from '../db';

export interface SignalInput {
  industryId: IndustryId;
  simulation: SimulationResult;
  financials: Pick<DbFinancials, 'config' | 'transactions' | 'payables' | 'expenses'>;
}

const fmtLakhs = (n: number) => `₹${(n / 100000).toFixed(1)}L`;

export function detectSignals(input: SignalInput): FinancialSignal[] {
  const { industryId, simulation, financials } = input;
  const profile = getIndustryProfile(industryId);
  const signals: FinancialSignal[] = [];
  const cashFloor = financials.config.cash_floor;

  const totalAR = financials.transactions.reduce((s, t) => s + t.invoice_amount, 0);
  const totalAP = financials.payables.reduce((s, p) => s + p.amount, 0);
  const delayedAR = financials.transactions.filter((t) => t.status === 'DELAYED')
    .reduce((s, t) => s + t.invoice_amount, 0);
  const topOutflow = simulation.driverAnalysis.topOutflows[0];
  const topInflow = simulation.driverAnalysis.topInflows[0];
  const breachProbPct = Math.round(simulation.breachProbability * 100);

  const add = (signal: FinancialSignal) => signals.push(signal);

  const rule = (id: string) => profile.signalRules.find((r) => r.id === id);

  // ── GENERIC (all industries) ────────────────────────────────────────────
  if (delayedAR > 0) {
    const r = rule('receivables-delay') || rule('collection-delay') || rule('client-payment-delay');
    add({
      id: 'collection-delay',
      severity: delayedAR > totalAR * 0.3 ? 'CRITICAL' : 'WARNING',
      title: r?.label || 'Receivables Delay',
      message: 'Customer payments are arriving later than expected.',
      impact: r?.impactTemplate?.replace('{amount}', fmtLakhs(delayedAR)) || `${fmtLakhs(delayedAR)} of expected cash may be delayed.`,
      liquidityImpact: delayedAR > totalAR * 0.3 ? 'High' : 'Medium',
      industryId,
    });
  }

  if (simulation.hasBreach && breachProbPct >= 50) {
    add({
      id: 'floor-breach-risk',
      severity: 'CRITICAL',
      title: 'Cash Floor Breach Risk',
      message: `Projected cash falls below the ${fmtLakhs(cashFloor)} safety floor with ${breachProbPct}% probability.`,
      impact: `Expected minimum cash of ${fmtLakhs(simulation.minProjectedCash)} breaches the floor.`,
      liquidityImpact: 'High',
      industryId,
    });
  } else if (breachProbPct >= 25) {
    add({
      id: 'liquidity-pressure',
      severity: 'WARNING',
      title: 'Liquidity Pressure',
      message: `The ${breachProbPct}% breach probability signals a thinning liquidity buffer.`,
      impact: `Worst-case P10 cash is ${fmtLakhs(simulation.p10Cash)} vs floor ${fmtLakhs(cashFloor)}.`,
      liquidityImpact: 'Medium',
      industryId,
    });
  }

  if (topOutflow && topOutflow.amount > simulation.currentCash * 0.5) {
    const r = rule('procurement-spike') || rule('stock-exposure') || rule('material-exposure') || rule('payable-pressure');
    add({
      id: 'large-outflow',
      severity: topOutflow.amount > simulation.currentCash ? 'CRITICAL' : 'WARNING',
      title: r?.label || 'Large Commitment Due',
      message: `A ${fmtLakhs(topOutflow.amount)} payment to ${topOutflow.entity} is due.`,
      impact: r?.impactTemplate?.replace('{amount}', fmtLakhs(topOutflow.amount)) || `${fmtLakhs(topOutflow.amount)} of concentrated outflow.`,
      liquidityImpact: topOutflow.amount > simulation.currentCash ? 'High' : 'Medium',
      industryId,
    });
  }

  // Inventory build-up (industries with inventory)
  if (simulation.workingCapital.dio > 45) {
    const r = rule('inventory-buildup') || rule('inventory-turnover') || rule('stock-exposure');
    const trapped = simulation.workingCapital.avgInventory;
    add({
      id: 'inventory-buildup',
      severity: 'WARNING',
      title: r?.label || 'Inventory Buildup',
      message: `Inventory days are at ${simulation.workingCapital.dio} — above the healthy range.`,
      impact: r?.impactTemplate?.replace('{amount}', fmtLakhs(trapped)) || `${fmtLakhs(trapped)} of working capital is trapped in stock.`,
      liquidityImpact: 'Medium',
      industryId,
    });
  }

  // ── INDUSTRY-SPECIFIC ───────────────────────────────────────────────────
  switch (industryId) {
    case 'saas':
      if (topInflow && topInflow.amount > totalAR * 0.5) {
        const r = rule('churn') || rule('recurring-decline');
        add({
          id: 'revenue-concentration',
          severity: 'WARNING',
          title: 'Revenue Concentration',
          message: 'A single customer account dominates expected collections.',
          impact: `If it churns, ${fmtLakhs(topInflow.amount)} of recurring revenue is at risk.`,
          liquidityImpact: 'Medium',
          industryId,
        });
      }
      if (breachProbPct >= 25 && totalAR > 0) {
        const r = rule('churn');
        add({
          id: 'churn-risk',
          severity: 'WARNING',
          title: r?.label || 'Customer Churn Risk',
          message: 'Forecast collections look light relative to current burn.',
          impact: r?.impactTemplate?.replace('{amount}', fmtLakhs(totalAR)) || `${fmtLakhs(totalAR)} of recurring revenue is at risk.`,
          liquidityImpact: 'Medium',
          industryId,
        });
      }
      break;

    case 'restaurant':
      if (topOutflow && topOutflow.amount > simulation.currentCash * 0.3) {
        const r = rule('food-cost') || rule('supplier-cost');
        add({
          id: 'food-cost-pressure',
          severity: 'WARNING',
          title: r?.label || 'Food Cost Pressure',
          message: `Food supplier outflows (${topOutflow.entity}) are a large share of cash.`,
          impact: r?.impactTemplate?.replace('{amount}', fmtLakhs(topOutflow.amount)) || `${fmtLakhs(topOutflow.amount)} of food-cost exposure.`,
          liquidityImpact: 'Medium',
          industryId,
        });
      }
      break;

    case 'logistics':
      if (topOutflow && /fuel/i.test(topOutflow.entity + ' ' + topOutflow.category)) {
        const r = rule('fuel-price');
        add({
          id: 'fuel-cost',
          severity: 'WARNING',
          title: r?.label || 'Fuel Cost Pressure',
          message: 'Fuel-related outflows are a significant share of spending.',
          impact: r?.impactTemplate?.replace('{amount}', fmtLakhs(topOutflow.amount)) || `${fmtLakhs(topOutflow.amount)} of fuel exposure.`,
          liquidityImpact: 'Medium',
          industryId,
        });
      }
      break;

    case 'construction':
      if (delayedAR > 0) {
        const r = rule('milestone-delay');
        add({
          id: 'milestone-delay',
          severity: delayedAR > totalAR * 0.3 ? 'CRITICAL' : 'WARNING',
          title: r?.label || 'Milestone Collection Delay',
          message: 'Milestone payments are arriving later than scheduled.',
          impact: r?.impactTemplate?.replace('{amount}', fmtLakhs(delayedAR)) || `${fmtLakhs(delayedAR)} of milestone cash may be delayed.`,
          liquidityImpact: delayedAR > totalAR * 0.3 ? 'High' : 'Medium',
          industryId,
        });
      }
      break;

    default:
      break;
  }

  // Always provide at least one signal when things look quiet but risky
  if (signals.length === 0 && breachProbPct > 0) {
    add({
      id: 'watch',
      severity: 'INFO',
      title: 'Watch List',
      message: 'No critical signals detected — but keep an eye on collection timing.',
      impact: `Breach probability stands at ${breachProbPct}%.`,
      liquidityImpact: 'Low',
      industryId,
    });
  }

  return signals;
}