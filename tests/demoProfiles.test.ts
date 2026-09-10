import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  INDUSTRY_DEMO_PROFILES,
  getIndustryDemoProfile,
  MANUFACTURING_DEMO,
} from '../src/engine/demoProfiles';
import { isValidIndustryId } from '../src/config/industries';
import { detectSignals } from '../src/engine/signals';
import { runSimulationEngine } from '../src/engine/calculator';
import { demoInventory, demoSuppliers, demoSales } from '../src/engine/sampleData';
import { FinancialSignal, IndustryId } from '../src/types';

test('Shakti Electronics remains the default manufacturing demo', () => {
  assert.equal(MANUFACTURING_DEMO.industryId, 'manufacturing');
  assert.equal(MANUFACTURING_DEMO.businessName, 'Shakti Electronics');
  assert.ok(MANUFACTURING_DEMO.transactions.length > 0);
  assert.ok(MANUFACTURING_DEMO.payables.length > 0);
});

test('every switchable demo is a valid industry with a full dataset', () => {
  for (const [id, demo] of Object.entries(INDUSTRY_DEMO_PROFILES)) {
    assert.ok(isValidIndustryId(id), `${id} must be a valid industry`);
    assert.equal(demo.industryId, id, `${id}: industryId mismatch`);
    assert.ok(demo.businessName, `${id}: businessName`);
    assert.ok(demo.config.current_cash > 0, `${id}: cash`);
    assert.ok(demo.config.cash_floor > 0, `${id}: floor`);
    assert.ok(demo.note.toLowerCase().includes('synthetic'), `${id}: must be labeled synthetic`);
    // Demo ledgers are generic — SaaS may legitimately have no inventory.
    assert.ok(demo.transactions.length > 0, `${id}: transactions`);
    assert.ok(demo.payables.length > 0, `${id}: payables`);
  }
});

test('lookup by industry id returns the right demo and unknown ids return undefined', () => {
  assert.equal(getIndustryDemoProfile('saas')?.businessName, 'CloudDesk Software');
  assert.equal(getIndustryDemoProfile('restaurant')?.industryId, 'restaurant');
  assert.equal(getIndustryDemoProfile('aerospace'), undefined);
});

test('signal detection is deterministic and only uses engine-verified numbers', () => {
  const simulation = runSimulationEngine(
    MANUFACTURING_DEMO.config,
    MANUFACTURING_DEMO.transactions,
    MANUFACTURING_DEMO.payables,
    MANUFACTURING_DEMO.expenses,
    demoInventory,
    demoSuppliers,
    demoSales
  );

  const financials = {
    config: MANUFACTURING_DEMO.config,
    transactions: MANUFACTURING_DEMO.transactions,
    payables: MANUFACTURING_DEMO.payables,
    expenses: MANUFACTURING_DEMO.expenses,
  };

  const signals1 = detectSignals({ industryId: 'manufacturing', simulation, financials });
  const signals2 = detectSignals({ industryId: 'manufacturing', simulation, financials });
  assert.equal(JSON.stringify(signals1), JSON.stringify(signals2), 'deterministic');

  for (const sig of signals1) {
    assert.ok(sig.title && sig.message && sig.impact, 'signal has all fields');
    assert.ok(['CRITICAL', 'WARNING', 'INFO'].includes(sig.severity));
    assert.ok(['High', 'Medium', 'Low'].includes(sig.liquidityImpact));
    assert.ok(sig.industryId === 'manufacturing');
  }

  // The manufacturing demo has a DELAYED invoice (tx-101) — expect a collection-delay signal
  const collectionDelay = signals1.find((s: FinancialSignal) => s.id === 'collection-delay');
  assert.ok(collectionDelay, 'receivables delay signal should fire for the demo dataset');
  assert.ok(collectionDelay.impact.includes('₹'), 'impact must carry the verified rupee amount');
});

test('SaaS signals never use inventory terminology', () => {
  const simulation = runSimulationEngine(
    INDUSTRY_DEMO_PROFILES.saas.config,
    INDUSTRY_DEMO_PROFILES.saas.transactions,
    INDUSTRY_DEMO_PROFILES.saas.payables,
    INDUSTRY_DEMO_PROFILES.saas.expenses,
    INDUSTRY_DEMO_PROFILES.saas.inventory,
    INDUSTRY_DEMO_PROFILES.saas.suppliers,
    INDUSTRY_DEMO_PROFILES.saas.sales
  );
  const signals = detectSignals({
    industryId: 'saas' as IndustryId,
    simulation,
    financials: {
      config: INDUSTRY_DEMO_PROFILES.saas.config,
      transactions: INDUSTRY_DEMO_PROFILES.saas.transactions,
      payables: INDUSTRY_DEMO_PROFILES.saas.payables,
      expenses: INDUSTRY_DEMO_PROFILES.saas.expenses,
    },
  });
  const allText = signals.map((s) => s.title + s.message + s.impact).join(' ');
  assert.ok(!/inventory|raw material|pallet/i.test(allText), 'no inventory terminology for SaaS');
});