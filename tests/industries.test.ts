import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  INDUSTRY_OPTIONS,
  INDUSTRY_PROFILES,
  getIndustryProfile,
  isValidIndustryId,
  buildSafeToCommitQuestion,
} from '../src/config/industries';
import { IndustryId } from '../src/types';

const ALL_IDS: IndustryId[] = [
  'manufacturing', 'wholesale', 'retail', 'saas', 'consulting',
  'restaurant', 'logistics', 'healthcare', 'construction', 'other',
];

test('all industry IDs exist in the configuration', () => {
  for (const id of ALL_IDS) {
    assert.ok(INDUSTRY_PROFILES[id], `missing profile for ${id}`);
  }
});

test('every industry has all required fields', () => {
  for (const id of ALL_IDS) {
    const p = INDUSTRY_PROFILES[id];
    assert.ok(p.name, `${id}: name`);
    assert.ok(p.description, `${id}: description`);
    assert.ok(p.icon, `${id}: icon`);
    assert.ok(p.category, `${id}: category`);
    assert.ok(Array.isArray(p.primaryEntities) && p.primaryEntities.length > 0, `${id}: entities`);
    assert.ok(Array.isArray(p.keyDrivers) && p.keyDrivers.length > 0, `${id}: keyDrivers`);
    assert.ok(Array.isArray(p.kpis) && p.kpis.length > 0, `${id}: kpis`);
    assert.ok(Array.isArray(p.riskDrivers) && p.riskDrivers.length > 0, `${id}: riskDrivers`);
    assert.ok(Array.isArray(p.scenarioTypes) && p.scenarioTypes.length > 0, `${id}: scenarioTypes`);
    assert.ok(Array.isArray(p.decisionTypes) && p.decisionTypes.length > 0, `${id}: decisionTypes`);
    assert.ok(p.safeToCommit?.entityLabel, `${id}: safeToCommit.entityLabel`);
    assert.ok(p.safeToCommit?.questionTemplate.includes('{amount}'), `${id}: safeToCommit question template`);
    assert.ok(p.aiContext, `${id}: aiContext`);
    assert.ok(p.miniatureModel?.nodes?.length > 0, `${id}: miniature nodes`);
    assert.ok(Array.isArray(p.recommendations) && p.recommendations.length > 0, `${id}: recommendations`);
    assert.ok(Array.isArray(p.signalRules) && p.signalRules.length > 0, `${id}: signalRules`);
  }
});

test('no invalid industry ID resolves to a profile', () => {
  assert.equal(isValidIndustryId('aerospace'), false);
  assert.equal(isValidIndustryId('manufacturing'), true);
  assert.equal(isValidIndustryId(''), false);
  // Unknown IDs gracefully fall back to the generic 'other' profile
  assert.equal(getIndustryProfile('does-not-exist' as IndustryId).id, 'other');
});

test('every industry option is a valid profile id and carries an icon + description', () => {
  assert.equal(INDUSTRY_OPTIONS.length, ALL_IDS.length);
  for (const opt of INDUSTRY_OPTIONS) {
    assert.ok(isValidIndustryId(opt.id), `option ${opt.id} must be a valid industry`);
    assert.ok(opt.icon, `option ${opt.id} needs an icon`);
    assert.ok(opt.description, `option ${opt.id} needs a description`);
  }
});

test('miniature model node graph is valid for every industry', () => {
  for (const id of ALL_IDS) {
    const model = INDUSTRY_PROFILES[id].miniatureModel;
    const nodeIds = new Set(model.nodes.map((n) => n.id));
    // No duplicate ids
    assert.equal(nodeIds.size, model.nodes.length, `${id}: duplicate node ids`);
    // Every edge references existing nodes (no orphan/invalid connections)
    for (const edge of model.edges) {
      assert.ok(nodeIds.has(edge.from), `${id}: edge from unknown node ${edge.from}`);
      assert.ok(nodeIds.has(edge.to), `${id}: edge to unknown node ${edge.to}`);
      assert.notEqual(edge.from, edge.to, `${id}: self-loop ${edge.from}`);
    }
    // Shock chain only references existing nodes
    for (const chainId of model.shockChain) {
      assert.ok(nodeIds.has(chainId), `${id}: shock chain unknown node ${chainId}`);
    }
    // Exactly one cash node
    const cashNodes = model.nodes.filter((n) => n.kind === 'cash');
    assert.equal(cashNodes.length, 1, `${id}: must have exactly one cash node`);
  }
});

test('safe-to-commit question is formatted per industry', () => {
  const mfg = getIndustryProfile('manufacturing');
  const q = buildSafeToCommitQuestion(mfg, 1400000);
  assert.ok(q.includes('₹14.0L'), q);
  assert.ok(q.toLowerCase().includes('raw-material'), q);

  const saas = getIndustryProfile('saas');
  const q2 = buildSafeToCommitQuestion(saas, 1400000);
  assert.ok(q2.toLowerCase().includes('software'), q2);

  const restaurant = getIndustryProfile('restaurant');
  const q3 = buildSafeToCommitQuestion(restaurant, 300000);
  assert.ok(q3.toLowerCase().includes('food'), q3);
});

test('recommendations reference engine counterfactual ids', () => {
  for (const id of ALL_IDS) {
    const recIds = INDUSTRY_PROFILES[id].recommendations.map((r) => r.id);
    assert.ok(recIds.includes('cf-1') && recIds.includes('cf-2') && recIds.includes('cf-3'), `${id}: missing cf-1/cf-2/cf-3 recommendations`);
  }
});