import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runSafeToCommitAnalysis } from '../src/engine/safeToCommit';
import { runSimulationEngine, formatINR } from '../src/engine/calculator';
import { getIndustryProfile } from '../src/config/industries';
import {
  demoConfig,
  demoTransactions,
  demoPayables,
  demoExpenses,
  demoInventory,
  demoSuppliers,
  demoSales,
} from '../src/engine/sampleData';
import { SAAS_DEMO, RETAIL_DEMO } from '../src/engine/demoProfiles';
import { IndustryId } from '../src/types';

test('the SAME financial engine runs across industries (common core)', () => {
  // Manufacturing ledger through the engine
  const mfg = runSimulationEngine(
    demoConfig, demoTransactions, demoPayables, demoExpenses,
    demoInventory, demoSuppliers, demoSales
  );
  // SaaS ledger (no inventory) through the SAME engine
  const saas = runSimulationEngine(
    SAAS_DEMO.config, SAAS_DEMO.transactions, SAAS_DEMO.payables, SAAS_DEMO.expenses,
    SAAS_DEMO.inventory, SAAS_DEMO.suppliers, SAAS_DEMO.sales
  );
  // The manufacturing demo breaches its floor (that is its demo story) — but the
  // engine must return well-formed numbers for both ledgers through the SAME code.
  assert.equal(typeof mfg.minProjectedCash, 'number');
  assert.equal(typeof mfg.breachProbability, 'number');
  assert.equal(mfg.hasBreach, true, 'manufacturing demo breaches its floor');
  assert.equal(typeof saas.minProjectedCash, 'number');
  assert.equal(typeof saas.p10Cash, 'number');
  assert.equal(typeof saas.breachProbability, 'number');
  assert.equal(saas.hasBreach, false, 'saas demo starts safely above its floor');
});

test('safe-to-commit returns a valid verdict, boundary and alternatives', () => {
  const result = runSafeToCommitAnalysis({
    config: demoConfig,
    transactions: demoTransactions,
    payables: demoPayables,
    expenses: demoExpenses,
    inventory: demoInventory,
    suppliers: demoSuppliers,
    historicalSales: demoSales,
    commitmentAmount: 1400000, // ₹14L raw-material purchase
    commitmentLabel: 'raw-material purchase',
    industryId: 'manufacturing',
  });

  assert.ok(['SAFE', 'MARGINAL', 'UNSAFE'].includes(result.verdict), `verdict ${result.verdict}`);
  assert.ok(result.currentCash > 0);
  assert.ok(result.safeBoundary >= 0);
  assert.ok(result.cashImpact > 0, 'a commitment must reduce min cash');
  assert.ok(result.liquidityRisk >= 0 && result.liquidityRisk <= 1);
  assert.ok(result.alternatives.length === 3, 'three alternative strategies');
  for (const alt of result.alternatives) {
    assert.ok(['SAFE', 'MARGINAL', 'UNSAFE'].includes(alt.verdict));
    assert.ok(typeof alt.minCash === 'number');
    assert.ok(alt.title.length > 0);
  }
});

test('safe-to-commit boundary is monotonic — larger commitment never safer', () => {
  const small = runSafeToCommitAnalysis({
    config: demoConfig, transactions: demoTransactions, payables: demoPayables,
    expenses: demoExpenses, inventory: demoInventory, suppliers: demoSuppliers,
    historicalSales: demoSales, commitmentAmount: 200000,
    commitmentLabel: 'test', industryId: 'manufacturing',
  });
  const large = runSafeToCommitAnalysis({
    config: demoConfig, transactions: demoTransactions, payables: demoPayables,
    expenses: demoExpenses, inventory: demoInventory, suppliers: demoSuppliers,
    historicalSales: demoSales, commitmentAmount: 3000000,
    commitmentLabel: 'test', industryId: 'manufacturing',
  });
  assert.ok(large.expectedMinCash <= small.expectedMinCash, 'bigger commitment → lower min cash');
  assert.ok(large.liquidityRisk >= small.liquidityRisk - 1e-9, 'bigger commitment → no lower risk');
});

test('industry context changes framing but the engine stays common (SaaS & Retail)', () => {
  for (const demo of [SAAS_DEMO, RETAIL_DEMO]) {
    const result = runSafeToCommitAnalysis({
      config: demo.config,
      transactions: demo.transactions,
      payables: demo.payables,
      expenses: demo.expenses,
      inventory: demo.inventory,
      suppliers: demo.suppliers,
      historicalSales: demo.sales,
      commitmentAmount: demo.config.current_cash * 0.8,
      commitmentLabel: getIndustryProfile(demo.industryId as IndustryId).safeToCommit.entityLabel,
      industryId: demo.industryId as IndustryId,
    });
    assert.ok(['SAFE', 'MARGINAL', 'UNSAFE'].includes(result.verdict), demo.industryId);
    assert.ok(result.alternatives.length === 3, demo.industryId);
    assert.ok(result.safeBoundary >= 0, demo.industryId);
  }
});

test('safe boundary formatting matches currency display', () => {
  assert.equal(formatINR(1400000), '₹14.0L');
  assert.equal(formatINR(300000), '₹3.0L');
});