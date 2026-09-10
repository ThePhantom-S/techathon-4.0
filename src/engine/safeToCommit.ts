/**
 * safeToCommit.ts
 * Safe-to-Commit analysis engine.
 *
 * Uses the SAME common cash roll-forward + Monte Carlo engine as everything
 * else. It never invents financial numbers — every figure comes from
 * runSimulationEngine. Industry context only changes the framing (labels)
 * and the alternative actions, never the calculation.
 */
import {
  SafeToCommitAlternative,
  SafeToCommitInput,
  SafeToCommitResult,
  SafeToCommitVerdict,
} from '../types';
import { runSimulationEngine } from './calculator';
import { getIndustryProfile } from '../config/industries';

const SAFE_PROB = 0.25;   // breach probability below this → SAFE
const MARGINAL_PROB = 0.6; // breach probability below this → MARGINAL (else UNSAFE)

/**
 * Runs the engine with the commitment applied as a day-1 lump-sum outflow and
 * returns the key numbers.
 */
function runWithCommitment(input: SafeToCommitInput, extraOverrides: Record<string, any> = {}) {
  return runSimulationEngine(
    input.config,
    input.transactions,
    input.payables,
    input.expenses,
    input.inventory,
    input.suppliers,
    input.historicalSales,
    {
      oneTimeOutflow: input.commitmentAmount,
      ...extraOverrides,
    },
  );
}

function verdictFrom(minCash: number, breachProbability: number, cashFloor: number): SafeToCommitVerdict {
  if (minCash >= cashFloor && breachProbability <= SAFE_PROB) return 'SAFE';
  if (minCash >= cashFloor * 0.9 || breachProbability <= MARGINAL_PROB) return 'MARGINAL';
  return 'UNSAFE';
}

/**
 * Binary search for the largest commitment amount that keeps the projected
 * minimum cash at/above the floor with breach probability ≤ SAFE_PROB.
 */
function findSafeBoundary(
  input: Omit<SafeToCommitInput, 'commitmentAmount'>,
  floor: number,
  maxAmount: number,
): number {
  const runAmount = (amount: number) => {
    const r = runSimulationEngine(
      input.config,
      input.transactions,
      input.payables,
      input.expenses,
      input.inventory,
      input.suppliers,
      input.historicalSales,
      { oneTimeOutflow: amount },
    );
    return r.minProjectedCash >= floor && r.breachProbability <= SAFE_PROB;
  };

  let lo = 0;
  let hi = Math.max(maxAmount, 1);
  let best = 0;
  // ~22 iterations of binary search → precise well below ₹1 (engine-cache backed)
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    if (runAmount(mid)) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return Math.floor(best);
}

export function runSafeToCommitAnalysis(input: SafeToCommitInput): SafeToCommitResult {
  const profile = getIndustryProfile(input.industryId);
  const cashFloor = input.config.cash_floor;

  // Baseline (no commitment)
  const baseline = runSimulationEngine(
    input.config,
    input.transactions,
    input.payables,
    input.expenses,
    input.inventory,
    input.suppliers,
    input.historicalSales,
  );

  // With commitment
  const committed = runWithCommitment(input);

  const verdict = verdictFrom(committed.minProjectedCash, committed.breachProbability, cashFloor);
  const cashImpact = baseline.minProjectedCash - committed.minProjectedCash;

  // Safe boundary for the commitment amount (keeps floor safe)
  const safeBoundary = findSafeBoundary(input, cashFloor, input.config.current_cash * 2);

  // Alternative actions — each is a real engine run with the commitment PLUS a lever.
  const altDefs: { id: string; overrides: Record<string, any> }[] = [
    { id: 'cf-1', overrides: { oneTimeOutflow: input.commitmentAmount * 0.65 } }, // reduce commitment ~35%
    { id: 'cf-2', overrides: { oneTimeOutflow: input.commitmentAmount, supplierTermExtensionDays: 15 } }, // delay payment
    { id: 'cf-3', overrides: { oneTimeOutflow: input.commitmentAmount, customerAdvancePercent: 30 } }, // advance from customers
  ];

  const alternatives: SafeToCommitAlternative[] = altDefs.map((alt) => {
    const r = runSimulationEngine(
      input.config,
      input.transactions,
      input.payables,
      input.expenses,
      input.inventory,
      input.suppliers,
      input.historicalSales,
      alt.overrides,
    );
    const rec = profile.recommendations.find((x) => x.id === alt.id);
    return {
      id: alt.id,
      title: rec ? rec.title : alt.id,
      detail: rec ? rec.action : 'Alternative strategy',
      minCash: r.minProjectedCash,
      breachProbability: r.breachProbability,
      verdict: verdictFrom(r.minProjectedCash, r.breachProbability, cashFloor),
    };
  });

  // Drivers — top outflows after commitment, framed for this industry
  const drivers = committed.driverAnalysis.topOutflows
    .slice(0, 3)
    .map((d) => `${d.entity} (${d.category})`);

  return {
    verdict,
    currentCash: input.config.current_cash,
    cashFloor,
    expectedMinCash: committed.minProjectedCash,
    baselineMinCash: baseline.minProjectedCash,
    cashImpact,
    liquidityRisk: committed.breachProbability,
    breachDate: committed.earliestBreachDate,
    safeBoundary,
    drivers: drivers.length ? drivers : [profile.keyDrivers[0]],
    alternatives: alternatives.sort((a, b) => b.minCash - a.minCash),
  };
}