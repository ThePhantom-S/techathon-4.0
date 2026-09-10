/**
 * industries.ts
 * Centralized industry configuration for FlowShield.
 *
 * ONE common core financial/risk engine is shared across every industry.
 * This file is the single source of truth for how each industry shapes:
 *   - Dashboard terminology & secondary KPIs
 *   - Supply-chain entities (3D miniature model)
 *   - Risk drivers, scenario controls, safe-to-commit framing
 *   - AI context & financial signal rules
 *   - Recommended actions
 *
 * No React component hardcodes industry logic — they consume IndustryProfile.
 */
import {
  IndustryId,
  IndustryKpi,
  IndustryProfile,
  IndustryRecommendation,
  IndustryScenario,
  KpiKind,
} from '../types';

const kpi = (id: string, label: string, description: string, kind: KpiKind, format: IndustryKpi['format'], inLakhs?: boolean): IndustryKpi => ({
  id,
  label,
  description,
  kind,
  format,
  inLakhs,
});

const scenario = (
  id: string,
  title: string,
  description: string,
  iconType: IndustryScenario['iconType'],
  paramLabel: string,
  paramUnit: string,
  defaultValue: number,
  min: number,
  max: number,
  step: number,
  knob: IndustryScenario['knob'],
  scale = 1,
): IndustryScenario => ({
  id, title, description, iconType, paramLabel, paramUnit,
  defaultValue, min, max, step, knob, scale,
});

const recommendation = (id: string, title: string, action: string, detail: string): IndustryRecommendation => ({
  id, title, action, detail,
});

// ── INDUSTRY PROFILES ────────────────────────────────────────────────────────

export const INDUSTRY_PROFILES: Record<IndustryId, IndustryProfile> = {
  // ════════════════════════════════════════════════════════════════════════
  // A. MANUFACTURING (default Shakti Electronics demo)
  // ════════════════════════════════════════════════════════════════════════
  manufacturing: {
    id: 'manufacturing',
    name: 'Manufacturing',
    description: 'Track raw materials, production, inventory and supplier commitments.',
    icon: 'Factory',
    category: 'Production',
    primaryEntities: ['Supplier', 'Raw Materials', 'Production', 'Factory', 'Finished Goods', 'Warehouse', 'Customer'],
    keyDrivers: [
      'Raw material inventory',
      'Supplier payment terms',
      'Supplier delays',
      'Production delays',
      'Inventory holding',
      'Procurement commitments',
      'Customer collections',
      'Finished goods',
      'Demand changes',
    ],
    kpis: [
      kpi('kpi-inv-days', 'Inventory Days', 'Days of stock held in the pipeline', 'dio', 'days'),
      kpi('kpi-supplier-exp', 'Supplier Payment Exposure', 'Largest committed supplier payable', 'topOutflow', 'inr', true),
      kpi('kpi-production-exp', 'Production Cash Exposure', 'Factory & operational spending', 'payrollMonthly', 'inr', true),
      kpi('kpi-receivables', 'Customer Receivables', 'Total expected customer collections', 'totalAR', 'inr', true),
      kpi('kpi-cash-buffer', 'Cash Buffer', 'Current cash minus safety floor', 'currentCash', 'inr', true),
      kpi('kpi-liquidity-risk', 'Liquidity Risk', 'Probability of floor breach', 'breachProb', 'pct'),
    ],
    riskDrivers: [
      { id: 'supplier-delay', label: 'Supplier Delay', signal: 'Supplier deliveries are arriving later than expected.', impact: 'Production and collections shift out, delaying cash recovery.' },
      { id: 'raw-material-price', label: 'Raw Material Price Increase', signal: 'Input costs are rising faster than planned.', impact: 'Procurement outflows increase without matching near-term inflows.' },
      { id: 'procurement-spike', label: 'Procurement Spike', signal: 'A large purchase commitment is due shortly.', impact: 'A concentrated outflow creates a cash dip below the floor.' },
      { id: 'receivables-delay', label: 'Receivables Delay', signal: 'Customer payments are arriving later than expected.', impact: 'Expected cash may be delayed.' },
      { id: 'inventory-buildup', label: 'Inventory Buildup', signal: 'Inventory days are stretching above target.', impact: 'More working capital is trapped on the shelf.' },
    ],
    scenarioTypes: [
      scenario('supplier-delay', 'Supplier Delay', 'Increase or decrease supplier lead time to test delivery shock impact', 'clock', 'Supplier Lead Time', 'days', 20, 0, 60, 1, 'supplier_delay'),
      scenario('raw-material-price', 'Raw Material Price Increase', 'Raise input costs and watch procurement outflow pressure', 'trending', 'Material Price Rise', '%', 15, 0, 50, 5, 'outflow_change'),
      scenario('procurement-increase', 'Procurement Increase', 'Commit to a larger raw-material purchase', 'box', 'Procurement Amount', '₹L', 14, 0, 40, 1, 'one_time_outflow', 100000),
      scenario('demand-drop', 'Demand Drop', 'Reduce expected customer demand and collections', 'trending', 'Demand Change', '%', -20, -50, 30, 5, 'inflow_change'),
      scenario('production-delay', 'Production Delay', 'Delay factory output and downstream billing', 'flame', 'Production Delay', 'days', 10, 0, 45, 1, 'supplier_delay'),
      scenario('customer-payment-delay', 'Customer Payment Delay', 'Push expected collections later', 'calendar', 'Collection Delay', 'days', 15, 0, 45, 1, 'inflow_change'),
      scenario('supplier-term-extension', 'Supplier Term Extension', 'Extend payment terms with suppliers to delay cash outflows', 'calendar', 'Term Extension', 'days', 15, 0, 45, 1, 'term_extension'),
      scenario('customer-advance', 'Customer Advance', 'Request upfront payment from customers to boost immediate cash', 'coin', 'Advance Payment', '%', 30, 0, 50, 5, 'customer_advance'),
    ],
    decisionTypes: [
      { id: 'raw-material', label: 'Raw Material Purchase', question: 'Can I safely commit ₹14L to raw materials?', amountHint: 1400000 },
      { id: 'procurement', label: 'Procurement Increase', question: 'Should I increase this procurement order?', amountHint: 900000 },
      { id: 'supplier-terms', label: 'Supplier Term Negotiation', question: 'Should I negotiate supplier terms?', amountHint: 0 },
    ],
    safeToCommit: {
      entityLabel: 'raw-material purchase',
      questionTemplate: 'Can we safely commit {amount} to this raw-material purchase?',
      defaultAmount: 1400000,
      amountHint: 1400000,
    },
    cashFlowDrivers: { inflow: ['Customer collections', 'Finished-goods sales', 'Customer advances'], outflow: ['Supplier procurement', 'Factory operations', 'Payroll', 'Freight & logistics'] },
    aiContext: 'Manufacturing SME: tracks raw materials, production runs, inventory holding, supplier commitments and customer collections. Inventory and supplier lead times directly drive cash timing.',
    miniatureModel: {
      nodes: [
        { id: 'supplier', label: 'Supplier', kind: 'supplier', color: '#F97316', detail: 'Raw material lead time', description: 'Raw material & component vendors' },
        { id: 'raw-materials', label: 'Raw Materials', kind: 'inventory', color: '#3B82F6', detail: 'Component stock holding', description: 'Raw component stock warehouse' },
        { id: 'production', label: 'Production', kind: 'operations', color: '#A855F7', detail: 'Factory assembly line', description: 'Manufacturing assembly station' },
        { id: 'finished-goods', label: 'Finished Goods', kind: 'inventory', color: '#0EA5E9', detail: 'Ready-for-sale stock', description: 'Finished goods warehouse' },
        { id: 'customer', label: 'Customer', kind: 'customer', color: '#10B981', detail: 'Orders & collections', description: 'Enterprise & retail customers' },
        { id: 'cash', label: 'Cash', kind: 'cash', color: '#F59E0B', detail: 'Liquidity reservoir', description: 'Primary liquidity core' },
      ],
      edges: [
        { from: 'supplier', to: 'raw-materials', kind: 'goods' },
        { from: 'raw-materials', to: 'production', kind: 'goods' },
        { from: 'production', to: 'finished-goods', kind: 'goods' },
        { from: 'finished-goods', to: 'customer', kind: 'goods' },
        { from: 'customer', to: 'cash', kind: 'inflow' },
        { from: 'cash', to: 'supplier', kind: 'outflow' },
        { from: 'cash', to: 'production', kind: 'outflow' },
      ],
      shockChain: ['supplier', 'raw-materials', 'production', 'finished-goods', 'customer', 'cash'],
      shockLabel: 'Supplier Lead Time',
      defaultShockValue: 20,
      shockMax: 60,
    },
    recommendations: [
      recommendation('cf-1', '20% Procurement Reduction', 'Reduce procurement spend by 20% to protect the cash floor.', 'Supplier accepts partial order; no stockout within 90 days'),
      recommendation('cf-2', '15-Day Supplier Term Extension', 'Extend supplier payment terms by 15 days to bridge the gap.', 'Supplier agrees to extend net terms; no penalty clauses'),
      recommendation('cf-3', '30% Customer Advance', 'Secure a 30% advance from key customers to restore the cash buffer.', 'Customer agrees to advance; small discount cost'),
      recommendation('alt-negotiate', 'Negotiate Supplier Terms', 'Negotiate longer net terms with critical component suppliers.', 'Reduces near-term procurement outflow pressure'),
      recommendation('alt-reduce-qty', 'Reduce Purchase Quantity', 'Cut the order quantity and phase it over two deliveries.', 'Lowers one-time cash commitment'),
      recommendation('alt-alternate-supplier', 'Use Alternate Supplier', 'Source components from an alternate supplier with shorter terms.', 'Diversifies supplier risk'),
    ],
    signalRules: [
      { id: 'supplier-delay', label: 'Supplier Delay', impactTemplate: 'Supplier deliveries are arriving later than expected — {amount} of procurement exposure is at risk.' },
      { id: 'inventory-buildup', label: 'Inventory Buildup', impactTemplate: 'Inventory days are stretching — {amount} of working capital is trapped on the shelf.' },
      { id: 'receivables-delay', label: 'Receivables Delay', impactTemplate: 'Customer payments are arriving later than expected — {amount} of expected cash may be delayed.' },
      { id: 'procurement-spike', label: 'Procurement Spike', impactTemplate: 'A {amount} procurement commitment is due — watch the concentrated outflow.' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════
  // B. WHOLESALE / DISTRIBUTION
  // ════════════════════════════════════════════════════════════════════════
  wholesale: {
    id: 'wholesale',
    name: 'Wholesale / Distribution',
    description: 'Track supplier purchases, inventory, customer orders and collections.',
    icon: 'Package',
    category: 'Distribution',
    primaryEntities: ['Supplier', 'Warehouse', 'Inventory', 'Customer Orders', 'Customers', 'Collections'],
    keyDrivers: ['Purchase orders', 'Inventory', 'Supplier terms', 'Customer payment delays', 'Order demand', 'Inventory turnover'],
    kpis: [
      kpi('kpi-inv-turnover', 'Inventory Turnover', 'How many times stock turns over the horizon', 'dio', 'days'),
      kpi('kpi-supplier-exp', 'Supplier Exposure', 'Largest committed supplier payable', 'topOutflow', 'inr', true),
      kpi('kpi-cust-receivables', 'Customer Receivables', 'Total expected customer collections', 'totalAR', 'inr', true),
      kpi('kpi-order-demand', 'Order Demand', 'Expected inflow from customer orders', 'topInflow', 'inr', true),
      kpi('kpi-cash-buffer', 'Cash Buffer', 'Current cash minus safety floor', 'currentCash', 'inr', true),
      kpi('kpi-liquidity-risk', 'Liquidity Risk', 'Probability of floor breach', 'breachProb', 'pct'),
    ],
    riskDrivers: [
      { id: 'supplier-delay', label: 'Supplier Delay', signal: 'Inbound stock is arriving late.', impact: 'Orders go unfilled and collections shift out.' },
      { id: 'inventory-turnover', label: 'Slow Inventory Turnover', signal: 'Stock is sitting longer than planned.', impact: 'Cash is trapped in slow-moving inventory.' },
      { id: 'receivables-delay', label: 'Receivables Delay', signal: 'Customer payments are arriving later than expected.', impact: 'Expected cash may be delayed.' },
      { id: 'demand-drop', label: 'Demand Drop', signal: 'Customer order volumes are declining.', impact: 'Forecast collections shrink.' },
    ],
    scenarioTypes: [
      scenario('supplier-delay', 'Supplier Delay', 'Increase supplier lead time to test inbound stock shock', 'clock', 'Supplier Lead Time', 'days', 20, 0, 60, 1, 'supplier_delay'),
      scenario('bulk-purchase', 'Bulk Purchase', 'Commit to a large bulk stock purchase', 'box', 'Purchase Amount', '₹L', 10, 0, 40, 1, 'one_time_outflow', 100000),
      scenario('customer-payment-delay', 'Customer Payment Delay', 'Push expected collections later', 'calendar', 'Collection Delay', 'days', 15, 0, 45, 1, 'inflow_change'),
      scenario('demand-increase', 'Demand Increase', 'Raise expected customer order volume', 'trending', 'Demand Change', '%', 15, -50, 50, 5, 'inflow_change'),
      scenario('demand-decrease', 'Demand Decrease', 'Lower expected customer order volume', 'trending', 'Demand Change', '%', -20, -50, 50, 5, 'inflow_change'),
      scenario('supplier-discount', 'Supplier Discount', 'Suppliers offer a discount for early payment', 'coin', 'Discount Taken', '%', 3, 0, 10, 1, 'procurement_reduction'),
    ],
    decisionTypes: [
      { id: 'purchase-order', label: 'Purchase Order', question: 'Can I safely place this ₹10L purchase order?', amountHint: 1000000 },
      { id: 'supplier-terms', label: 'Supplier Term Negotiation', question: 'Should I negotiate supplier payment terms?', amountHint: 0 },
    ],
    safeToCommit: {
      entityLabel: 'purchase order',
      questionTemplate: 'Can we safely commit {amount} to this purchase order?',
      defaultAmount: 1000000,
      amountHint: 1000000,
    },
    cashFlowDrivers: { inflow: ['Customer collections', 'Order advances'], outflow: ['Supplier purchases', 'Warehouse costs', 'Freight', 'Payroll'] },
    aiContext: 'Wholesale / distribution business: buys stock in bulk from suppliers, holds it in a warehouse, and sells to customers on credit. Inventory turnover and supplier terms drive cash.',
    miniatureModel: {
      nodes: [
        { id: 'supplier', label: 'Supplier', kind: 'supplier', color: '#F97316', detail: 'Bulk stock source', description: 'Wholesale suppliers' },
        { id: 'warehouse', label: 'Warehouse', kind: 'inventory', color: '#3B82F6', detail: 'Stock holding', description: 'Distribution warehouse' },
        { id: 'inventory', label: 'Inventory', kind: 'inventory', color: '#0EA5E9', detail: 'Units on hand', description: 'Distributable stock' },
        { id: 'orders', label: 'Customer Orders', kind: 'recurring', color: '#A855F7', detail: 'Order book', description: 'Incoming customer orders' },
        { id: 'customer', label: 'Customers', kind: 'customer', color: '#10B981', detail: 'Collections due', description: 'Wholesale customers' },
        { id: 'cash', label: 'Cash', kind: 'cash', color: '#F59E0B', detail: 'Liquidity reservoir', description: 'Primary liquidity core' },
      ],
      edges: [
        { from: 'supplier', to: 'warehouse', kind: 'goods' },
        { from: 'warehouse', to: 'inventory', kind: 'goods' },
        { from: 'inventory', to: 'orders', kind: 'goods' },
        { from: 'orders', to: 'customer', kind: 'goods' },
        { from: 'customer', to: 'cash', kind: 'inflow' },
        { from: 'cash', to: 'supplier', kind: 'outflow' },
      ],
      shockChain: ['supplier', 'warehouse', 'inventory', 'orders', 'customer', 'cash'],
      shockLabel: 'Supplier Lead Time',
      defaultShockValue: 20,
      shockMax: 60,
    },
    recommendations: [
      recommendation('cf-1', '20% Purchase Reduction', 'Trim the bulk purchase by 20% to protect cash.', 'Supplier accepts partial order'),
      recommendation('cf-2', '15-Day Supplier Term Extension', 'Extend supplier payment terms by 15 days.', 'Supplier agrees to extended net terms'),
      recommendation('cf-3', '30% Customer Advance', 'Ask key customers for a 30% order advance.', 'Customers agree to advance payment'),
      recommendation('alt-phase', 'Phase Deliveries', 'Split the bulk order into phased deliveries.', 'Lowers the one-time cash commitment'),
      recommendation('alt-discount', 'Negotiate Discount', 'Negotiate a cash discount for early payment.', 'Only if the discount beats the cost of cash'),
    ],
    signalRules: [
      { id: 'supplier-delay', label: 'Supplier Delay', impactTemplate: 'Inbound stock is arriving late — {amount} of purchase exposure is at risk.' },
      { id: 'inventory-turnover', label: 'Slow Inventory Turnover', impactTemplate: 'Stock is sitting longer than planned — {amount} of working capital is trapped.' },
      { id: 'receivables-delay', label: 'Receivables Delay', impactTemplate: 'Customer payments are arriving later than expected — {amount} of expected cash may be delayed.' },
      { id: 'demand-drop', label: 'Demand Drop', impactTemplate: 'Order volumes are declining — {amount} of forecast collections may not materialize.' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════
  // C. RETAIL / E-COMMERCE
  // ════════════════════════════════════════════════════════════════════════
  retail: {
    id: 'retail',
    name: 'Retail / E-commerce',
    description: 'Track inventory, sales, suppliers, customer demand and cash.',
    icon: 'ShoppingBag',
    category: 'Commerce',
    primaryEntities: ['Supplier', 'Warehouse', 'Store / Online Store', 'Inventory', 'Customer', 'Sales', 'Cash'],
    keyDrivers: ['Sales volume', 'Inventory', 'Supplier payments', 'Customer demand', 'Returns', 'Discounts', 'Inventory turnover'],
    kpis: [
      kpi('kpi-inv-days', 'Inventory Days', 'Days of stock on shelves', 'dio', 'days'),
      kpi('kpi-sales-trend', 'Sales Trend', 'Largest expected customer inflow', 'topInflow', 'inr', true),
      kpi('kpi-stock-exposure', 'Stock Exposure', 'Committed supplier payable for stock', 'topOutflow', 'inr', true),
      kpi('kpi-receivables', 'Customer Receivables', 'Total expected customer collections', 'totalAR', 'inr', true),
      kpi('kpi-cash-buffer', 'Cash Buffer', 'Current cash minus safety floor', 'currentCash', 'inr', true),
      kpi('kpi-liquidity-risk', 'Liquidity Risk', 'Probability of floor breach', 'breachProb', 'pct'),
    ],
    riskDrivers: [
      { id: 'sales-decline', label: 'Sales Decline', signal: 'Daily sales are trending down.', impact: 'Forecast cash inflows shrink.' },
      { id: 'stockout', label: 'Stockout Risk', signal: 'Fast-moving SKUs are running low.', impact: 'Sales are lost to out-of-stock.' },
      { id: 'supplier-price', label: 'Supplier Price Increase', signal: 'Merchandise costs are rising.', impact: 'Purchases cost more without matching sales uplift.' },
      { id: 'returns', label: 'Returns Spike', signal: 'Return rates are climbing.', impact: 'Refunds create unplanned outflows.' },
    ],
    scenarioTypes: [
      scenario('demand-spike', 'Demand Spike', 'Raise expected customer demand and sales', 'trending', 'Demand Change', '%', 20, -50, 50, 5, 'inflow_change'),
      scenario('demand-drop', 'Demand Drop', 'Lower expected customer demand and sales', 'trending', 'Demand Change', '%', -20, -50, 50, 5, 'inflow_change'),
      scenario('inventory-purchase', 'Inventory Purchase', 'Commit to a bulk inventory build', 'box', 'Purchase Amount', '₹L', 8, 0, 30, 1, 'one_time_outflow', 100000),
      scenario('supplier-price', 'Supplier Price Increase', 'Raise merchandise purchase costs', 'trending', 'Price Rise', '%', 10, 0, 40, 5, 'outflow_change'),
      scenario('discount-campaign', 'Discount Campaign', 'Run a discount campaign that trims margins', 'coin', 'Discount Depth', '%', 10, 0, 40, 5, 'inflow_change'),
      scenario('supplier-delay', 'Supplier Delay', 'Increase supplier lead time to test stock shock', 'clock', 'Supplier Lead Time', 'days', 15, 0, 45, 1, 'supplier_delay'),
      scenario('returns', 'Return Rate', 'Raise the expected product return rate', 'flame', 'Return Rate', '%', 5, 0, 20, 1, 'outflow_change'),
    ],
    decisionTypes: [
      { id: 'festival-inventory', label: 'Festival Inventory Build', question: 'Can we afford this inventory build for the festival season?', amountHint: 800000 },
      { id: 'discount', label: 'Discount Campaign', question: 'Should we run this discount campaign?', amountHint: 0 },
    ],
    safeToCommit: {
      entityLabel: 'inventory build',
      questionTemplate: 'Can we safely commit {amount} to this inventory build?',
      defaultAmount: 800000,
      amountHint: 800000,
    },
    cashFlowDrivers: { inflow: ['Store & online sales', 'Customer collections', 'Gift card redemptions'], outflow: ['Merchandise purchases', 'Rent', 'Payroll', 'Payment gateway fees'] },
    aiContext: 'Retail / e-commerce business: sells inventory to consumers through stores and online channels. Sales velocity, seasonal demand and stock levels drive cash.',
    miniatureModel: {
      nodes: [
        { id: 'supplier', label: 'Supplier', kind: 'supplier', color: '#F97316', detail: 'Merchandise source', description: 'Product suppliers' },
        { id: 'warehouse', label: 'Warehouse', kind: 'inventory', color: '#3B82F6', detail: 'Stock holding', description: 'Distribution warehouse' },
        { id: 'store', label: 'Store / Online', kind: 'operations', color: '#A855F7', detail: 'Sales channels', description: 'Stores & e-commerce channels' },
        { id: 'customer', label: 'Customer', kind: 'customer', color: '#10B981', detail: 'Buyers & returns', description: 'Consumers' },
        { id: 'sales', label: 'Sales', kind: 'recurring', color: '#0EA5E9', detail: 'Revenue engine', description: 'Daily sales' },
        { id: 'cash', label: 'Cash', kind: 'cash', color: '#F59E0B', detail: 'Liquidity reservoir', description: 'Primary liquidity core' },
      ],
      edges: [
        { from: 'supplier', to: 'warehouse', kind: 'goods' },
        { from: 'warehouse', to: 'store', kind: 'goods' },
        { from: 'store', to: 'customer', kind: 'goods' },
        { from: 'customer', to: 'sales', kind: 'inflow' },
        { from: 'sales', to: 'cash', kind: 'inflow' },
        { from: 'cash', to: 'supplier', kind: 'outflow' },
      ],
      shockChain: ['supplier', 'warehouse', 'store', 'customer', 'sales', 'cash'],
      shockLabel: 'Supplier Lead Time',
      defaultShockValue: 15,
      shockMax: 45,
    },
    recommendations: [
      recommendation('cf-1', '20% Stock Purchase Reduction', 'Reduce the inventory build by 20%.', 'Phases the purchase'),
      recommendation('cf-2', '15-Day Supplier Term Extension', 'Extend supplier payment terms by 15 days.', 'Supplier agrees to extended terms'),
      recommendation('cf-3', '30% Customer Advance', 'Sell pre-orders or gift cards for a 30% advance.', 'Raises cash before the build'),
      recommendation('alt-reduce-procurement', 'Reduce Bulk Procurement', 'Cut bulk procurement and reorder more frequently.', 'Smaller, more frequent orders'),
      recommendation('alt-negotiate', 'Negotiate Supplier Prices', 'Negotiate better unit prices before the build.', 'Improves margin on the season'),
    ],
    signalRules: [
      { id: 'sales-decline', label: 'Sales Decline', impactTemplate: 'Daily sales are trending down — {amount} of forecast inflow may not materialize.' },
      { id: 'food-cost', label: 'Merchandise Cost Increase', impactTemplate: 'Purchase costs are rising — {amount} of extra outflow pressure.' },
      { id: 'stock-exposure', label: 'Stock Exposure', impactTemplate: 'A {amount} stock commitment is due — watch the concentrated outflow.' },
      { id: 'returns', label: 'Returns Spike', impactTemplate: 'Return rates are climbing — {amount} of refund outflows may hit.' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════
  // D. SaaS / SOFTWARE
  // ════════════════════════════════════════════════════════════════════════
  saas: {
    id: 'saas',
    name: 'SaaS / Software',
    description: 'Track recurring revenue, customer collections, payroll and operating costs.',
    icon: 'Laptop',
    category: 'Technology',
    primaryEntities: ['Customer', 'Subscription', 'Invoice', 'Receivables', 'Payroll', 'Operating Expenses', 'Cash'],
    keyDrivers: ['Recurring revenue', 'Customer churn', 'Invoice collections', 'Subscription renewals', 'Payroll', 'Cloud/software expenses', 'Customer payment delays'],
    kpis: [
      kpi('kpi-recurring-revenue', 'Recurring Revenue Exposure', 'Total expected subscription collections', 'totalAR', 'inr', true),
      kpi('kpi-collection-exp', 'Customer Collection Exposure', 'Largest expected customer inflow', 'topInflow', 'inr', true),
      kpi('kpi-churn-risk', 'Churn Risk', 'Probability of a liquidity floor breach', 'breachProb', 'pct'),
      kpi('kpi-payroll-burn', 'Payroll Burn', 'Monthly staff payroll outflow', 'payrollMonthly', 'inr', true),
      kpi('kpi-runway', 'Payroll Runway', 'Months of payroll the current cash covers', 'runway', 'plain'),
      kpi('kpi-cash-buffer', 'Cash Buffer', 'Current cash minus safety floor', 'currentCash', 'inr', true),
    ],
    riskDrivers: [
      { id: 'churn', label: 'Customer Churn', signal: 'Subscriptions are churning faster than expected.', impact: 'Recurring revenue and expected collections fall.' },
      { id: 'collection-delay', label: 'Collection Delay', signal: 'Invoices are being paid later than planned.', impact: 'Expected cash may be delayed.' },
      { id: 'payroll-increase', label: 'Payroll Increase', signal: 'Staff costs are climbing.', impact: 'Monthly burn rises without matching revenue.' },
      { id: 'cloud-cost', label: 'Cloud Cost Spike', signal: 'Infrastructure costs are rising.', impact: 'Operating outflows increase.' },
    ],
    scenarioTypes: [
      scenario('churn', 'Customer Churn', 'Raise the monthly customer churn rate', 'users', 'Churn Rate', '%', 10, 0, 40, 1, 'inflow_change'),
      scenario('delayed-collection', 'Delayed Collection', 'Push subscription collections later', 'calendar', 'Collection Delay', 'days', 15, 0, 45, 1, 'inflow_change'),
      scenario('new-customer', 'New Customer Acquisition', 'Add expected new-customer revenue', 'trending', 'New Revenue', '₹L', 5, 0, 25, 1, 'one_time_inflow', 100000),
      scenario('hiring', 'Hiring', 'Commit to hiring additional headcount', 'users', 'New Hires', 'count', 3, 0, 10, 1, 'recurring_outflow', 50000),
      scenario('cloud-cost', 'Cloud Cost Increase', 'Raise infrastructure / software costs', 'flame', 'Cloud Cost Rise', '%', 20, 0, 80, 5, 'outflow_change'),
      scenario('annual-contract', 'Annual Contract Commitment', 'Commit to an annual software / cloud contract', 'box', 'Contract Amount', '₹L', 14, 0, 40, 1, 'one_time_outflow', 100000),
    ],
    decisionTypes: [
      { id: 'hiring', label: 'Hiring', question: 'Can we safely commit to hiring 3 employees?', amountHint: 150000 },
      { id: 'cloud-contract', label: 'Annual Cloud Contract', question: 'Can we afford this annual cloud contract?', amountHint: 1400000 },
    ],
    safeToCommit: {
      entityLabel: 'annual software commitment',
      questionTemplate: 'Can we safely commit {amount} to this annual software commitment?',
      defaultAmount: 1400000,
      amountHint: 1400000,
    },
    cashFlowDrivers: { inflow: ['Subscription collections', 'New customer revenue', 'Annual prepayments'], outflow: ['Payroll', 'Cloud / software costs', 'Marketing', 'Contractors'] },
    aiContext: 'SaaS / software business: recurring subscription revenue, customer churn, payroll and cloud infrastructure costs. There is no physical inventory — cash timing is driven by renewals, collections and burn.',
    miniatureModel: {
      nodes: [
        { id: 'customer', label: 'Customer', kind: 'customer', color: '#10B981', detail: 'Subscription base', description: 'Paying customers' },
        { id: 'subscription', label: 'Subscription', kind: 'recurring', color: '#3B82F6', detail: 'Recurring revenue', description: 'MRR engine' },
        { id: 'invoice', label: 'Invoice', kind: 'service', color: '#A855F7', detail: 'Billing cycle', description: 'Invoices & receivables' },
        { id: 'collection', label: 'Collection', kind: 'service', color: '#0EA5E9', detail: 'Cash recovery', description: 'Collections' },
        { id: 'cash', label: 'Cash', kind: 'cash', color: '#F59E0B', detail: 'Liquidity reservoir', description: 'Primary liquidity core' },
        { id: 'payroll', label: 'Payroll', kind: 'expense', color: '#EF4444', detail: 'Monthly burn', description: 'Employee payroll' },
        { id: 'cloud', label: 'Cloud & Opex', kind: 'expense', color: '#F97316', detail: 'Operating cost', description: 'Cloud & software costs' },
      ],
      edges: [
        { from: 'customer', to: 'subscription', kind: 'goods' },
        { from: 'subscription', to: 'invoice', kind: 'goods' },
        { from: 'invoice', to: 'collection', kind: 'goods' },
        { from: 'collection', to: 'cash', kind: 'inflow' },
        { from: 'payroll', to: 'cash', kind: 'outflow' },
        { from: 'cloud', to: 'cash', kind: 'outflow' },
      ],
      shockChain: ['customer', 'subscription', 'invoice', 'collection', 'cash'],
      shockLabel: 'Churn Shock',
      defaultShockValue: 10,
      shockMax: 40,
    },
    recommendations: [
      recommendation('cf-1', '20% Spend Reduction', 'Trim near-term discretionary spend by 20%.', 'Delay non-critical projects'),
      recommendation('cf-2', '15-Day Vendor Term Extension', 'Renegotiate cloud & vendor payment terms.', 'Vendors agree to extended terms'),
      recommendation('cf-3', '30% Advance Billing', 'Move key accounts to prepaid / annual billing.', 'Improves collection timing'),
      recommendation('alt-delay-hiring', 'Delay Hiring', 'Delay new hires until collections stabilize.', 'Protects the payroll runway'),
      recommendation('alt-renegotiate-cloud', 'Renegotiate Cloud Contracts', 'Renegotiate cloud and software contracts.', 'Reduces monthly burn'),
      recommendation('alt-collections', 'Improve Collections', 'Automate invoice reminders and chase overdue accounts.', 'Accelerates inflows'),
    ],
    signalRules: [
      { id: 'churn', label: 'Customer Churn', impactTemplate: 'Subscriptions are churning — {amount} of recurring revenue is at risk.' },
      { id: 'recurring-decline', label: 'Recurring Revenue Decline', impactTemplate: 'Expected collections are falling — {amount} of cash inflow may not materialize.' },
      { id: 'collection-delay', label: 'Collection Delay', impactTemplate: 'Invoices are paid later than planned — {amount} of expected cash may be delayed.' },
      { id: 'payroll-increase', label: 'Payroll Increase', impactTemplate: 'Staff costs are climbing — {amount} of extra monthly burn.' },
      { id: 'cloud-cost', label: 'Cloud Cost Spike', impactTemplate: 'Infrastructure costs are rising — {amount} of extra outflow pressure.' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════
  // E. CONSULTING / PROFESSIONAL SERVICES
  // ════════════════════════════════════════════════════════════════════════
  consulting: {
    id: 'consulting',
    name: 'Consulting / Professional Services',
    description: 'Track project billing, receivables, payroll and operating expenses.',
    icon: 'Briefcase',
    category: 'Services',
    primaryEntities: ['Client', 'Project', 'Invoice', 'Receivables', 'Employees', 'Payroll', 'Operating Expenses', 'Cash'],
    keyDrivers: ['Project billing', 'Milestone payments', 'Client collections', 'Payroll', 'Project expenses', 'Utilization'],
    kpis: [
      kpi('kpi-project-billing', 'Project Billing Exposure', 'Total expected client collections', 'totalAR', 'inr', true),
      kpi('kpi-client-collections', 'Client Collection Exposure', 'Largest expected client inflow', 'topInflow', 'inr', true),
      kpi('kpi-receivables', 'Receivables', 'Total outstanding client invoices', 'totalAR', 'inr', true),
      kpi('kpi-payroll-burn', 'Payroll Burn', 'Monthly staff payroll outflow', 'payrollMonthly', 'inr', true),
      kpi('kpi-runway', 'Runway', 'Months of payroll the current cash covers', 'runway', 'plain'),
      kpi('kpi-liquidity-risk', 'Liquidity Risk', 'Probability of floor breach', 'breachProb', 'pct'),
    ],
    riskDrivers: [
      { id: 'client-payment-delay', label: 'Client Payment Delay', signal: 'Clients are paying invoices later than planned.', impact: 'Expected cash may be delayed.' },
      { id: 'project-delay', label: 'Project Delay', signal: 'Projects are slipping past their milestones.', impact: 'Milestone billing shifts out.' },
      { id: 'utilization', label: 'Low Utilization', signal: 'Billable hours are below target.', impact: 'Revenue per head declines.' },
      { id: 'contractor-cost', label: 'Contractor Cost', signal: 'Subcontractor costs are rising.', impact: 'Project margins compress.' },
    ],
    scenarioTypes: [
      scenario('client-payment-delay', 'Client Payment Delay', 'Push expected client collections later', 'calendar', 'Collection Delay', 'days', 20, 0, 60, 1, 'inflow_change'),
      scenario('project-delay', 'Project Delay', 'Delay milestone billing on active projects', 'clock', 'Project Delay', 'days', 15, 0, 60, 1, 'inflow_change'),
      scenario('new-project', 'New Project', 'Add expected revenue from a new project', 'trending', 'New Billing', '₹L', 6, 0, 30, 1, 'one_time_inflow', 100000),
      scenario('hiring', 'Hiring', 'Commit to additional headcount', 'users', 'New Hires', 'count', 2, 0, 8, 1, 'recurring_outflow', 50000),
      scenario('contractor-cost', 'Contractor Cost', 'Raise subcontractor costs', 'flame', 'Cost Rise', '%', 15, 0, 50, 5, 'outflow_change'),
      scenario('client-advance', 'Client Advance', 'Request milestone advances from clients', 'coin', 'Advance', '%', 30, 0, 50, 5, 'customer_advance'),
    ],
    decisionTypes: [
      { id: 'new-project', label: 'New Project', question: 'Can we safely take this new project?', amountHint: 600000 },
      { id: 'hiring', label: 'Hiring', question: 'Can we afford to hire for this engagement?', amountHint: 100000 },
    ],
    safeToCommit: {
      entityLabel: 'new project commitment',
      questionTemplate: 'Can we safely commit {amount} to this new project?',
      defaultAmount: 600000,
      amountHint: 600000,
    },
    cashFlowDrivers: { inflow: ['Milestone collections', 'Client advances', 'Project billing'], outflow: ['Payroll', 'Contractors', 'Travel & expenses', 'Office costs'] },
    aiContext: 'Consulting / professional services firm: bills clients by project and milestone. Cash timing is driven by collection discipline, utilization and payroll.',
    miniatureModel: {
      nodes: [
        { id: 'client', label: 'Client', kind: 'customer', color: '#10B981', detail: 'Engagements', description: 'Clients & accounts' },
        { id: 'project', label: 'Project', kind: 'service', color: '#3B82F6', detail: 'Deliverables', description: 'Active projects' },
        { id: 'invoice', label: 'Invoice', kind: 'recurring', color: '#A855F7', detail: 'Milestone billing', description: 'Invoices & receivables' },
        { id: 'collection', label: 'Collection', kind: 'service', color: '#0EA5E9', detail: 'Cash recovery', description: 'Collections' },
        { id: 'cash', label: 'Cash', kind: 'cash', color: '#F59E0B', detail: 'Liquidity reservoir', description: 'Primary liquidity core' },
        { id: 'payroll', label: 'Payroll', kind: 'expense', color: '#EF4444', detail: 'Monthly burn', description: 'Employee payroll' },
        { id: 'opex', label: 'Operating Expenses', kind: 'expense', color: '#F97316', detail: 'Running costs', description: 'Office & project costs' },
      ],
      edges: [
        { from: 'client', to: 'project', kind: 'goods' },
        { from: 'project', to: 'invoice', kind: 'goods' },
        { from: 'invoice', to: 'collection', kind: 'goods' },
        { from: 'collection', to: 'cash', kind: 'inflow' },
        { from: 'payroll', to: 'cash', kind: 'outflow' },
        { from: 'opex', to: 'cash', kind: 'outflow' },
      ],
      shockChain: ['client', 'project', 'invoice', 'collection', 'cash'],
      shockLabel: 'Collection Delay',
      defaultShockValue: 20,
      shockMax: 60,
    },
    recommendations: [
      recommendation('cf-1', '20% Spend Reduction', 'Trim discretionary project spend by 20%.', 'Delay non-critical work'),
      recommendation('cf-2', '15-Day Vendor Term Extension', 'Extend subcontractor payment terms.', 'Vendors agree to extended terms'),
      recommendation('cf-3', '30% Client Advance', 'Request milestone advances from clients.', 'Clients agree to advance billing'),
      recommendation('alt-milestones', 'Tighten Milestones', 'Break projects into smaller billing milestones.', 'Collects cash earlier'),
      recommendation('alt-utilization', 'Improve Utilization', 'Shift staff to billable work.', 'Raises revenue per head'),
    ],
    signalRules: [
      { id: 'client-payment-delay', label: 'Client Payment Delay', impactTemplate: 'Clients are paying later than planned — {amount} of expected cash may be delayed.' },
      { id: 'project-delay', label: 'Project Delay', impactTemplate: 'Projects are slipping — {amount} of milestone billing shifts out.' },
      { id: 'payroll-increase', label: 'Payroll Increase', impactTemplate: 'Staff costs are climbing — {amount} of extra monthly burn.' },
      { id: 'concentration', label: 'Client Concentration', impactTemplate: 'A single client holds {amount} of receivables — concentration risk.' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════
  // F. RESTAURANT / FOOD
  // ════════════════════════════════════════════════════════════════════════
  restaurant: {
    id: 'restaurant',
    name: 'Restaurant / Food',
    description: 'Track food inventory, suppliers, daily sales and payroll.',
    icon: 'UtensilsCrossed',
    category: 'Food Service',
    primaryEntities: ['Food Supplier', 'Food Inventory', 'Kitchen', 'Restaurant', 'Daily Sales', 'Customers', 'Payroll', 'Cash'],
    keyDrivers: ['Daily sales', 'Food inventory', 'Supplier prices', 'Food waste', 'Payroll', 'Supplier payment terms'],
    kpis: [
      kpi('kpi-daily-sales', 'Daily Sales Exposure', 'Expected customer inflow', 'topInflow', 'inr', true),
      kpi('kpi-food-cost', 'Food Cost Exposure', 'Largest food supplier payable', 'topOutflow', 'inr', true),
      kpi('kpi-inv-days', 'Inventory Days', 'Days of food stock held', 'dio', 'days'),
      kpi('kpi-payroll', 'Payroll', 'Monthly staff payroll outflow', 'payrollMonthly', 'inr', true),
      kpi('kpi-cash-buffer', 'Cash Buffer', 'Current cash minus safety floor', 'currentCash', 'inr', true),
      kpi('kpi-liquidity-risk', 'Liquidity Risk', 'Probability of floor breach', 'breachProb', 'pct'),
    ],
    riskDrivers: [
      { id: 'sales-decline', label: 'Sales Decline', signal: 'Daily covers are trending down.', impact: 'Daily cash intake falls.' },
      { id: 'food-cost', label: 'Food Cost Increase', signal: 'Ingredient prices are rising.', impact: 'Purchase outflows increase.' },
      { id: 'waste', label: 'Food Waste', signal: 'Waste rates are climbing.', impact: 'Purchased food never becomes revenue.' },
      { id: 'supplier-delay', label: 'Supplier Delay', signal: 'Ingredient deliveries are late.', impact: 'Menu availability suffers.' },
    ],
    scenarioTypes: [
      scenario('sales-change', 'Daily Sales Change', 'Raise or lower expected daily sales', 'trending', 'Sales Change', '%', -15, -40, 40, 5, 'inflow_change'),
      scenario('food-cost', 'Food Cost Increase', 'Raise ingredient purchase costs', 'trending', 'Food Cost Rise', '%', 15, 0, 50, 5, 'outflow_change'),
      scenario('supplier-delay', 'Supplier Delay', 'Increase supplier lead time', 'clock', 'Supplier Lead Time', 'days', 10, 0, 30, 1, 'supplier_delay'),
      scenario('bulk-purchase', 'Bulk Food Purchase', 'Commit to a bulk ingredient purchase', 'box', 'Purchase Amount', '₹L', 3, 0, 12, 1, 'one_time_outflow', 100000),
      scenario('waste-rate', 'Waste Rate', 'Raise the expected food waste rate', 'flame', 'Waste Rate', '%', 10, 0, 30, 1, 'outflow_change'),
      scenario('supplier-term-extension', 'Supplier Term Extension', 'Extend food supplier payment terms', 'calendar', 'Term Extension', 'days', 15, 0, 45, 1, 'term_extension'),
    ],
    decisionTypes: [
      { id: 'bulk-food', label: 'Bulk Food Purchase', question: 'Can we afford this bulk food purchase?', amountHint: 300000 },
      { id: 'supplier-terms', label: 'Supplier Terms', question: 'Should we negotiate supplier prices?', amountHint: 0 },
    ],
    safeToCommit: {
      entityLabel: 'bulk food purchase',
      questionTemplate: 'Can we safely commit {amount} to this bulk food purchase?',
      defaultAmount: 300000,
      amountHint: 300000,
    },
    cashFlowDrivers: { inflow: ['Daily sales', 'Catering orders', 'Online delivery payouts'], outflow: ['Food suppliers', 'Payroll', 'Rent', 'Utilities'] },
    aiContext: 'Restaurant / food business: daily cash sales, perishable food inventory, supplier prices and staff payroll. Food cost and waste directly hit margins.',
    miniatureModel: {
      nodes: [
        { id: 'supplier', label: 'Food Supplier', kind: 'supplier', color: '#F97316', detail: 'Ingredient source', description: 'Food & beverage suppliers' },
        { id: 'food-inventory', label: 'Food Inventory', kind: 'inventory', color: '#3B82F6', detail: 'Perishable stock', description: 'Cold storage & pantry' },
        { id: 'kitchen', label: 'Kitchen', kind: 'operations', color: '#A855F7', detail: 'Preparation', description: 'Kitchen operations' },
        { id: 'restaurant', label: 'Restaurant', kind: 'service', color: '#0EA5E9', detail: 'Front of house', description: 'Dining & delivery' },
        { id: 'sales', label: 'Daily Sales', kind: 'recurring', color: '#10B981', detail: 'Cash intake', description: 'Daily sales' },
        { id: 'cash', label: 'Cash', kind: 'cash', color: '#F59E0B', detail: 'Liquidity reservoir', description: 'Primary liquidity core' },
        { id: 'payroll', label: 'Payroll', kind: 'expense', color: '#EF4444', detail: 'Staff costs', description: 'Kitchen & service staff' },
      ],
      edges: [
        { from: 'supplier', to: 'food-inventory', kind: 'goods' },
        { from: 'food-inventory', to: 'kitchen', kind: 'goods' },
        { from: 'kitchen', to: 'restaurant', kind: 'goods' },
        { from: 'restaurant', to: 'sales', kind: 'inflow' },
        { from: 'sales', to: 'cash', kind: 'inflow' },
        { from: 'cash', to: 'supplier', kind: 'outflow' },
        { from: 'payroll', to: 'cash', kind: 'outflow' },
      ],
      shockChain: ['supplier', 'food-inventory', 'kitchen', 'restaurant', 'sales', 'cash'],
      shockLabel: 'Supplier Lead Time',
      defaultShockValue: 10,
      shockMax: 30,
    },
    recommendations: [
      recommendation('cf-1', '20% Purchase Reduction', 'Reduce bulk food procurement by 20%.', 'Reorder more frequently'),
      recommendation('cf-2', '15-Day Supplier Term Extension', 'Extend food supplier payment terms.', 'Suppliers agree to extended terms'),
      recommendation('cf-3', '30% Customer Advance', 'Sell catering pre-orders for a 30% advance.', 'Raises cash upfront'),
      recommendation('alt-negotiate-prices', 'Negotiate Supplier Prices', 'Negotiate better ingredient prices.', 'Improves food-cost margin'),
      recommendation('alt-reduce-waste', 'Reduce Waste', 'Tighten portioning and menu planning.', 'Turns purchased food into revenue'),
    ],
    signalRules: [
      { id: 'sales-decline', label: 'Sales Decline', impactTemplate: 'Daily sales are trending down — {amount} of forecast inflow may not materialize.' },
      { id: 'food-cost', label: 'Food Cost Increase', impactTemplate: 'Ingredient prices are rising — {amount} of extra outflow pressure.' },
      { id: 'supplier-cost', label: 'Supplier Cost Increase', impactTemplate: 'Supplier costs are rising — {amount} of extra purchase outflow.' },
      { id: 'waste', label: 'Waste Increase', impactTemplate: 'Waste rates are climbing — {amount} of purchased food is not converting to revenue.' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════
  // G. LOGISTICS / TRANSPORTATION
  // ════════════════════════════════════════════════════════════════════════
  logistics: {
    id: 'logistics',
    name: 'Logistics / Transportation',
    description: 'Track fleet costs, customer invoices, fuel and operating expenses.',
    icon: 'Truck',
    category: 'Transport',
    primaryEntities: ['Customer', 'Shipment', 'Fleet', 'Fuel', 'Maintenance', 'Driver / Workforce', 'Invoice', 'Cash'],
    keyDrivers: ['Fuel', 'Vehicle maintenance', 'Customer collections', 'Fleet utilization', 'Driver costs', 'Shipment volume'],
    kpis: [
      kpi('kpi-fuel-cost', 'Fuel Cost', 'Monthly fuel spend pressure', 'payrollMonthly', 'inr', true),
      kpi('kpi-fleet-cost', 'Fleet Cost', 'Largest fleet-related payable', 'topOutflow', 'inr', true),
      kpi('kpi-receivables', 'Customer Receivables', 'Total expected shipment collections', 'totalAR', 'inr', true),
      kpi('kpi-fleet-utilization', 'Fleet Utilization', 'Revenue per active vehicle', 'topInflow', 'inr', true),
      kpi('kpi-cash-buffer', 'Cash Buffer', 'Current cash minus safety floor', 'currentCash', 'inr', true),
      kpi('kpi-liquidity-risk', 'Liquidity Risk', 'Probability of floor breach', 'breachProb', 'pct'),
    ],
    riskDrivers: [
      { id: 'fuel-price', label: 'Fuel Price Increase', signal: 'Fuel prices are climbing.', impact: 'Every shipment costs more.' },
      { id: 'downtime', label: 'Vehicle Downtime', signal: 'Vehicles are off the road for maintenance.', impact: 'Revenue capacity falls while costs continue.' },
      { id: 'collection-delay', label: 'Collection Delay', signal: 'Customers are paying invoices late.', impact: 'Expected cash may be delayed.' },
      { id: 'fleet-utilization', label: 'Low Fleet Utilization', signal: 'Vehicles are running below capacity.', impact: 'Fixed costs spread over less revenue.' },
    ],
    scenarioTypes: [
      scenario('fuel-price', 'Fuel Price Increase', 'Raise the assumed fuel cost', 'flame', 'Fuel Price Rise', '%', 15, 0, 50, 5, 'outflow_change'),
      scenario('vehicle-downtime', 'Vehicle Downtime', 'Simulate vehicles off the road', 'clock', 'Downtime', 'days', 10, 0, 30, 1, 'inflow_change'),
      scenario('shipment-volume', 'Shipment Volume Increase', 'Add expected shipment revenue', 'trending', 'Volume Change', '%', 15, -40, 50, 5, 'inflow_change'),
      scenario('customer-payment-delay', 'Customer Payment Delay', 'Push shipment collections later', 'calendar', 'Collection Delay', 'days', 20, 0, 60, 1, 'inflow_change'),
      scenario('fleet-expansion', 'Fleet Expansion', 'Commit to adding a vehicle', 'box', 'Fleet Cost', '₹L', 12, 0, 40, 1, 'one_time_outflow', 100000),
    ],
    decisionTypes: [
      { id: 'add-vehicle', label: 'Add Vehicle', question: 'Can we safely add another vehicle?', amountHint: 1200000 },
      { id: 'fuel-contract', label: 'Fuel Contract', question: 'Should we lock in a fuel contract?', amountHint: 500000 },
    ],
    safeToCommit: {
      entityLabel: 'fleet addition',
      questionTemplate: 'Can we safely commit {amount} to this fleet addition?',
      defaultAmount: 1200000,
      amountHint: 1200000,
    },
    cashFlowDrivers: { inflow: ['Shipment invoices', 'Customer collections', 'Contract haulage'], outflow: ['Fuel', 'Maintenance', 'Driver payroll', 'Vehicle finance'] },
    aiContext: 'Logistics / transportation business: fleet operations, fuel, maintenance and driver costs against shipment revenue. Fuel prices and fleet utilization dominate cash.',
    miniatureModel: {
      nodes: [
        { id: 'customer', label: 'Customer', kind: 'customer', color: '#10B981', detail: 'Shipment demand', description: 'Shippers & clients' },
        { id: 'shipment', label: 'Shipment', kind: 'service', color: '#3B82F6', detail: 'Haulage jobs', description: 'Active shipments' },
        { id: 'fleet', label: 'Fleet', kind: 'operations', color: '#A855F7', detail: 'Vehicles on road', description: 'Trucks & vehicles' },
        { id: 'fuel', label: 'Fuel / Maintenance', kind: 'expense', color: '#F97316', detail: 'Running costs', description: 'Fuel & maintenance' },
        { id: 'invoice', label: 'Invoice', kind: 'recurring', color: '#0EA5E9', detail: 'Billing', description: 'Shipment invoices' },
        { id: 'collection', label: 'Collection', kind: 'service', color: '#8B5CF6', detail: 'Cash recovery', description: 'Collections' },
        { id: 'cash', label: 'Cash', kind: 'cash', color: '#F59E0B', detail: 'Liquidity reservoir', description: 'Primary liquidity core' },
      ],
      edges: [
        { from: 'customer', to: 'shipment', kind: 'goods' },
        { from: 'shipment', to: 'fleet', kind: 'goods' },
        { from: 'fleet', to: 'fuel', kind: 'outflow' },
        { from: 'fleet', to: 'invoice', kind: 'goods' },
        { from: 'invoice', to: 'collection', kind: 'goods' },
        { from: 'collection', to: 'cash', kind: 'inflow' },
        { from: 'cash', to: 'fuel', kind: 'outflow' },
      ],
      shockChain: ['customer', 'shipment', 'fleet', 'invoice', 'collection', 'cash'],
      shockLabel: 'Fuel Price Shock',
      defaultShockValue: 15,
      shockMax: 50,
    },
    recommendations: [
      recommendation('cf-1', '20% Cost Reduction', 'Reduce discretionary fleet spending by 20%.', 'Defer non-critical maintenance'),
      recommendation('cf-2', '15-Day Customer Term Extension', 'Extend payable terms where possible.', 'Vendors agree to extended terms'),
      recommendation('cf-3', '30% Customer Advance', 'Request advances on large haulage contracts.', 'Customers agree to advance billing'),
      recommendation('alt-fuel-contract', 'Lock Fuel Contract', 'Lock in fuel prices with a fixed contract.', 'Reduces fuel cost volatility'),
      recommendation('alt-route-planning', 'Optimize Routes', 'Improve route planning to cut fuel use.', 'Lowers per-shipment cost'),
    ],
    signalRules: [
      { id: 'fuel-price', label: 'Fuel Price Increase', impactTemplate: 'Fuel prices are climbing — {amount} of extra outflow pressure.' },
      { id: 'downtime', label: 'Vehicle Downtime', impactTemplate: 'Vehicles are off the road — {amount} of revenue capacity is at risk.' },
      { id: 'collection-delay', label: 'Collection Delay', impactTemplate: 'Customers are paying late — {amount} of expected cash may be delayed.' },
      { id: 'utilization', label: 'Low Fleet Utilization', impactTemplate: 'Vehicles are under-utilized — {amount} of revenue is being left on the road.' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════
  // H. HEALTHCARE
  // ════════════════════════════════════════════════════════════════════════
  healthcare: {
    id: 'healthcare',
    name: 'Healthcare',
    description: 'Track supplies, patient/customer receivables, payroll and operating costs.',
    icon: 'HeartPulse',
    category: 'Healthcare',
    primaryEntities: ['Patient / Customer', 'Service', 'Suppliers', 'Medical Inventory', 'Receivables', 'Payroll', 'Operating Expenses', 'Cash'],
    keyDrivers: ['Medical supplies', 'Receivables', 'Payroll', 'Supplier payments', 'Service volume', 'Inventory'],
    kpis: [
      kpi('kpi-receivables', 'Receivables', 'Total expected patient/customer collections', 'totalAR', 'inr', true),
      kpi('kpi-supply-cost', 'Medical Supply Cost', 'Largest supplier payable', 'topOutflow', 'inr', true),
      kpi('kpi-payroll', 'Payroll', 'Monthly staff payroll outflow', 'payrollMonthly', 'inr', true),
      kpi('kpi-service-volume', 'Service Volume', 'Expected service revenue', 'topInflow', 'inr', true),
      kpi('kpi-cash-buffer', 'Cash Buffer', 'Current cash minus safety floor', 'currentCash', 'inr', true),
      kpi('kpi-liquidity-risk', 'Liquidity Risk', 'Probability of floor breach', 'breachProb', 'pct'),
    ],
    riskDrivers: [
      { id: 'supply-cost', label: 'Supply Cost Increase', signal: 'Medical supply prices are rising.', impact: 'Procurement outflows increase.' },
      { id: 'collection-delay', label: 'Collection Delay', signal: 'Insurance & patient payments are slow.', impact: 'Expected cash may be delayed.' },
      { id: 'equipment', label: 'Equipment Purchase', signal: 'A large equipment purchase is due.', impact: 'A concentrated outflow hits cash.' },
      { id: 'staffing', label: 'Staffing Increase', signal: 'Staffing costs are climbing.', impact: 'Monthly burn rises.' },
    ],
    scenarioTypes: [
      scenario('supply-cost', 'Supply Cost Increase', 'Raise medical supply costs', 'trending', 'Supply Cost Rise', '%', 15, 0, 50, 5, 'outflow_change'),
      scenario('collection-delay', 'Collection Delay', 'Push patient/insurance collections later', 'calendar', 'Collection Delay', 'days', 25, 0, 60, 1, 'inflow_change'),
      scenario('equipment', 'Equipment Purchase', 'Commit to a capital equipment purchase', 'box', 'Equipment Cost', '₹L', 10, 0, 40, 1, 'one_time_outflow', 100000),
      scenario('staffing', 'Staffing Increase', 'Add clinical or support staff', 'users', 'New Staff', 'count', 3, 0, 10, 1, 'recurring_outflow', 40000),
      scenario('demand', 'Service Volume Increase', 'Raise expected patient service volume', 'trending', 'Volume Change', '%', 15, -40, 50, 5, 'inflow_change'),
    ],
    decisionTypes: [
      { id: 'equipment', label: 'Equipment Purchase', question: 'Can we afford this equipment purchase?', amountHint: 1000000 },
      { id: 'staffing', label: 'Staffing', question: 'Can we safely add clinical staff?', amountHint: 120000 },
    ],
    safeToCommit: {
      entityLabel: 'equipment purchase',
      questionTemplate: 'Can we safely commit {amount} to this equipment purchase?',
      defaultAmount: 1000000,
      amountHint: 1000000,
    },
    cashFlowDrivers: { inflow: ['Patient collections', 'Insurance reimbursements', 'Service revenue'], outflow: ['Medical supplies', 'Payroll', 'Equipment', 'Facility costs'] },
    aiContext: 'Healthcare business: patient services, medical supplies, insurance and patient receivables, and clinical payroll. Collection cycles are long, so receivables discipline matters.',
    miniatureModel: {
      nodes: [
        { id: 'patient', label: 'Patient / Customer', kind: 'customer', color: '#10B981', detail: 'Care demand', description: 'Patients & customers' },
        { id: 'service', label: 'Service', kind: 'service', color: '#3B82F6', detail: 'Care delivery', description: 'Clinical services' },
        { id: 'suppliers', label: 'Suppliers', kind: 'supplier', color: '#F97316', detail: 'Medical supplies', description: 'Supply vendors' },
        { id: 'inventory', label: 'Medical Inventory', kind: 'inventory', color: '#0EA5E9', detail: 'Consumables', description: 'Medical stock' },
        { id: 'receivables', label: 'Receivables', kind: 'recurring', color: '#A855F7', detail: 'Billing', description: 'Patient & insurance receivables' },
        { id: 'cash', label: 'Cash', kind: 'cash', color: '#F59E0B', detail: 'Liquidity reservoir', description: 'Primary liquidity core' },
        { id: 'payroll', label: 'Payroll', kind: 'expense', color: '#EF4444', detail: 'Staff costs', description: 'Clinical & support staff' },
      ],
      edges: [
        { from: 'patient', to: 'service', kind: 'goods' },
        { from: 'suppliers', to: 'inventory', kind: 'goods' },
        { from: 'inventory', to: 'service', kind: 'goods' },
        { from: 'service', to: 'receivables', kind: 'goods' },
        { from: 'receivables', to: 'cash', kind: 'inflow' },
        { from: 'cash', to: 'suppliers', kind: 'outflow' },
        { from: 'payroll', to: 'cash', kind: 'outflow' },
      ],
      shockChain: ['suppliers', 'inventory', 'service', 'receivables', 'cash'],
      shockLabel: 'Collection Delay',
      defaultShockValue: 25,
      shockMax: 60,
    },
    recommendations: [
      recommendation('cf-1', '20% Supply Reduction', 'Reduce non-critical supply orders by 20%.', 'Consolidate supplier orders'),
      recommendation('cf-2', '15-Day Supplier Term Extension', 'Extend medical supplier payment terms.', 'Suppliers agree to extended terms'),
      recommendation('cf-3', '30% Advance Billing', 'Collect advances before elective procedures.', 'Improves collection timing'),
      recommendation('alt-insurance', 'Speed Up Insurance Claims', 'Streamline insurance claim filing.', 'Accelerates reimbursements'),
      recommendation('alt-negotiate', 'Negotiate Supply Contracts', 'Renegotiate supply contracts.', 'Reduces procurement cost'),
    ],
    signalRules: [
      { id: 'supply-cost', label: 'Supply Cost Increase', impactTemplate: 'Medical supply prices are rising — {amount} of extra outflow pressure.' },
      { id: 'collection-delay', label: 'Collection Delay', impactTemplate: 'Insurance & patient payments are slow — {amount} of expected cash may be delayed.' },
      { id: 'equipment', label: 'Equipment Purchase', impactTemplate: 'A {amount} equipment purchase is due — concentrated outflow.' },
      { id: 'staffing', label: 'Staffing Increase', impactTemplate: 'Staffing costs are climbing — {amount} of extra monthly burn.' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════
  // I. CONSTRUCTION
  // ════════════════════════════════════════════════════════════════════════
  construction: {
    id: 'construction',
    name: 'Construction',
    description: 'Track project costs, supplier payments, billing milestones and receivables.',
    icon: 'HardHat',
    category: 'Construction',
    primaryEntities: ['Project', 'Supplier', 'Materials', 'Contractor', 'Milestone', 'Customer', 'Invoice', 'Cash'],
    keyDrivers: ['Project cost', 'Material purchases', 'Supplier terms', 'Milestone billing', 'Customer collections', 'Contractor payments'],
    kpis: [
      kpi('kpi-project-cost', 'Project Cost', 'Largest project-related payable', 'topOutflow', 'inr', true),
      kpi('kpi-material-exp', 'Material Exposure', 'Committed material purchases', 'totalAP', 'inr', true),
      kpi('kpi-receivables', 'Receivables', 'Total expected milestone collections', 'totalAR', 'inr', true),
      kpi('kpi-milestone', 'Milestone Collections', 'Largest expected client inflow', 'topInflow', 'inr', true),
      kpi('kpi-cash-buffer', 'Cash Buffer', 'Current cash minus safety floor', 'currentCash', 'inr', true),
      kpi('kpi-liquidity-risk', 'Liquidity Risk', 'Probability of floor breach', 'breachProb', 'pct'),
    ],
    riskDrivers: [
      { id: 'project-delay', label: 'Project Delay', signal: 'Projects are slipping past milestones.', impact: 'Milestone billing and collections shift out.' },
      { id: 'material-cost', label: 'Material Cost Increase', signal: 'Material prices are rising.', impact: 'Project costs overrun.' },
      { id: 'milestone-delay', label: 'Milestone Collection Delay', signal: 'Clients are slow to release milestone payments.', impact: 'Expected cash may be delayed.' },
      { id: 'contractor-cost', label: 'Contractor Cost', signal: 'Contractor rates are rising.', impact: 'Project margins compress.' },
    ],
    scenarioTypes: [
      scenario('project-delay', 'Project Delay', 'Delay milestone billing on active projects', 'clock', 'Project Delay', 'days', 20, 0, 60, 1, 'inflow_change'),
      scenario('material-cost', 'Material Cost Increase', 'Raise material purchase costs', 'trending', 'Material Cost Rise', '%', 15, 0, 50, 5, 'outflow_change'),
      scenario('milestone-collection', 'Milestone Collection Delay', 'Push milestone collections later', 'calendar', 'Collection Delay', 'days', 25, 0, 60, 1, 'inflow_change'),
      scenario('supplier-terms', 'Supplier Term Extension', 'Extend supplier payment terms', 'calendar', 'Term Extension', 'days', 20, 0, 60, 1, 'term_extension'),
      scenario('large-material', 'Large Material Order', 'Commit to a large material order', 'box', 'Order Amount', '₹L', 12, 0, 50, 1, 'one_time_outflow', 100000),
      scenario('new-project', 'New Project', 'Add expected revenue from a new project', 'trending', 'New Billing', '₹L', 15, 0, 60, 1, 'one_time_inflow', 100000),
      scenario('contractor-cost', 'Contractor Cost Increase', 'Raise contractor costs', 'users', 'Cost Rise', '%', 15, 0, 50, 5, 'outflow_change'),
    ],
    decisionTypes: [
      { id: 'material-order', label: 'Material Order', question: 'Can we safely commit ₹12L to this material order?', amountHint: 1200000 },
      { id: 'new-project', label: 'New Project', question: 'Can we take on this new project?', amountHint: 1500000 },
    ],
    safeToCommit: {
      entityLabel: 'material order',
      questionTemplate: 'Can we safely commit {amount} to this material order?',
      defaultAmount: 1200000,
      amountHint: 1200000,
    },
    cashFlowDrivers: { inflow: ['Milestone collections', 'Client advances', 'New project billing'], outflow: ['Material purchases', 'Contractor payments', 'Equipment', 'Site costs'] },
    aiContext: 'Construction business: project-based work with milestone billing, material purchases, contractor payments and long collection cycles. Cash timing is driven by milestone progress and collections.',
    miniatureModel: {
      nodes: [
        { id: 'project', label: 'Project', kind: 'service', color: '#3B82F6', detail: 'Active builds', description: 'Construction projects' },
        { id: 'materials', label: 'Materials', kind: 'inventory', color: '#0EA5E9', detail: 'Site stock', description: 'Materials on site' },
        { id: 'contractor', label: 'Contractor', kind: 'operations', color: '#A855F7', detail: 'Site workforce', description: 'Contractors & labor' },
        { id: 'milestone', label: 'Milestone', kind: 'recurring', color: '#10B981', detail: 'Billing checkpoints', description: 'Project milestones' },
        { id: 'invoice', label: 'Customer Invoice', kind: 'service', color: '#8B5CF6', detail: 'Client billing', description: 'Customer invoices' },
        { id: 'collection', label: 'Collection', kind: 'service', color: '#14B8A6', detail: 'Cash recovery', description: 'Milestone collections' },
        { id: 'cash', label: 'Cash', kind: 'cash', color: '#F59E0B', detail: 'Liquidity reservoir', description: 'Primary liquidity core' },
        { id: 'supplier', label: 'Supplier', kind: 'supplier', color: '#F97316', detail: 'Material source', description: 'Material suppliers' },
      ],
      edges: [
        { from: 'project', to: 'materials', kind: 'goods' },
        { from: 'supplier', to: 'materials', kind: 'goods' },
        { from: 'materials', to: 'contractor', kind: 'goods' },
        { from: 'contractor', to: 'milestone', kind: 'goods' },
        { from: 'milestone', to: 'invoice', kind: 'goods' },
        { from: 'invoice', to: 'collection', kind: 'goods' },
        { from: 'collection', to: 'cash', kind: 'inflow' },
        { from: 'cash', to: 'supplier', kind: 'outflow' },
        { from: 'cash', to: 'contractor', kind: 'outflow' },
      ],
      shockChain: ['supplier', 'materials', 'contractor', 'milestone', 'invoice', 'collection', 'cash'],
      shockLabel: 'Material Cost Shock',
      defaultShockValue: 15,
      shockMax: 50,
    },
    recommendations: [
      recommendation('cf-1', '20% Material Reduction', 'Phase material purchases by 20%.', 'Order per milestone phase'),
      recommendation('cf-2', '20-Day Supplier Term Extension', 'Extend supplier payment terms.', 'Suppliers agree to extended terms'),
      recommendation('cf-3', '30% Milestone Advance', 'Negotiate milestone advances from the client.', 'Client agrees to advance billing'),
      recommendation('alt-phase', 'Re-sequence Spending', 'Re-sequence project spending to match milestones.', 'Aligns outflows with inflows'),
      recommendation('alt-milestones', 'Negotiate Milestone Advances', 'Negotiate larger early milestones.', 'Collects cash earlier in the project'),
    ],
    signalRules: [
      { id: 'project-delay', label: 'Project Delay', impactTemplate: 'Projects are slipping — {amount} of milestone billing shifts out.' },
      { id: 'material-cost', label: 'Material Cost Increase', impactTemplate: 'Material prices are rising — {amount} of project cost overrun.' },
      { id: 'milestone-delay', label: 'Milestone Collection Delay', impactTemplate: 'Clients are slow to release milestone payments — {amount} of expected cash may be delayed.' },
      { id: 'material-exposure', label: 'Material Exposure', impactTemplate: 'A {amount} material order is due — concentrated outflow.' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════
  // J. OTHER — generic FlowShield model
  // ════════════════════════════════════════════════════════════════════════
  other: {
    id: 'other',
    name: 'Other',
    description: 'Use a general-purpose FlowShield financial model.',
    icon: 'Wrench',
    category: 'General',
    primaryEntities: ['Suppliers', 'Inventory', 'Operations', 'Customers', 'Receivables', 'Payroll', 'Cash'],
    keyDrivers: ['Collections', 'Payables', 'Payroll', 'Operating expenses', 'Customer demand', 'Supplier terms'],
    kpis: [
      kpi('kpi-receivables', 'Receivables', 'Total expected collections', 'totalAR', 'inr', true),
      kpi('kpi-payables', 'Payables', 'Total committed payables', 'totalAP', 'inr', true),
      kpi('kpi-payroll', 'Payroll', 'Monthly payroll outflow', 'payrollMonthly', 'inr', true),
      kpi('kpi-cash-buffer', 'Cash Buffer', 'Current cash minus safety floor', 'currentCash', 'inr', true),
      kpi('kpi-liquidity-risk', 'Liquidity Risk', 'Probability of floor breach', 'breachProb', 'pct'),
    ],
    riskDrivers: [
      { id: 'collection-delay', label: 'Collection Delay', signal: 'Customers are paying later than expected.', impact: 'Expected cash may be delayed.' },
      { id: 'payable-pressure', label: 'Payable Pressure', signal: 'Large payments are due shortly.', impact: 'A concentrated outflow hits cash.' },
    ],
    scenarioTypes: [
      scenario('supplier-delay', 'Supplier Delay', 'Increase supplier lead time to test shock impact', 'clock', 'Supplier Lead Time', 'days', 20, 0, 60, 1, 'supplier_delay'),
      scenario('collection-delay', 'Collection Delay', 'Push expected collections later', 'calendar', 'Collection Delay', 'days', 15, 0, 45, 1, 'inflow_change'),
      scenario('spend-reduction', 'Spend Reduction', 'Reduce near-term spending', 'box', 'Spend Cut', '%', 20, 0, 50, 5, 'procurement_reduction'),
      scenario('customer-advance', 'Customer Advance', 'Request upfront payment from customers', 'coin', 'Advance Payment', '%', 30, 0, 50, 5, 'customer_advance'),
    ],
    decisionTypes: [
      { id: 'commitment', label: 'Business Commitment', question: 'Can we safely commit to this decision?', amountHint: 1000000 },
    ],
    safeToCommit: {
      entityLabel: 'business commitment',
      questionTemplate: 'Can we safely commit {amount} to this decision?',
      defaultAmount: 1000000,
      amountHint: 1000000,
    },
    cashFlowDrivers: { inflow: ['Customer collections', 'Sales revenue'], outflow: ['Suppliers', 'Payroll', 'Operating expenses'] },
    aiContext: 'General-purpose business using the standard FlowShield model: collections, payables, payroll and operating expenses drive cash.',
    miniatureModel: {
      nodes: [
        { id: 'supplier', label: 'Suppliers', kind: 'supplier', color: '#F97316', detail: 'Payables', description: 'Suppliers & vendors' },
        { id: 'operations', label: 'Operations', kind: 'operations', color: '#A855F7', detail: 'Business activity', description: 'Core operations' },
        { id: 'customer', label: 'Customers', kind: 'customer', color: '#10B981', detail: 'Receivables', description: 'Customers' },
        { id: 'cash', label: 'Cash', kind: 'cash', color: '#F59E0B', detail: 'Liquidity reservoir', description: 'Primary liquidity core' },
      ],
      edges: [
        { from: 'supplier', to: 'operations', kind: 'goods' },
        { from: 'operations', to: 'customer', kind: 'goods' },
        { from: 'customer', to: 'cash', kind: 'inflow' },
        { from: 'cash', to: 'supplier', kind: 'outflow' },
      ],
      shockChain: ['supplier', 'operations', 'customer', 'cash'],
      shockLabel: 'Supplier Lead Time',
      defaultShockValue: 20,
      shockMax: 60,
    },
    recommendations: [
      recommendation('cf-1', '20% Spend Reduction', 'Reduce near-term spending by 20%.', 'Defer non-critical purchases'),
      recommendation('cf-2', '15-Day Supplier Term Extension', 'Extend supplier payment terms.', 'Suppliers agree to extended terms'),
      recommendation('cf-3', '30% Customer Advance', 'Request advances from key customers.', 'Customers agree to advance payment'),
      recommendation('alt-collections', 'Improve Collections', 'Chase overdue invoices aggressively.', 'Accelerates inflows'),
    ],
    signalRules: [
      { id: 'collection-delay', label: 'Collection Delay', impactTemplate: 'Customers are paying later than expected — {amount} of expected cash may be delayed.' },
      { id: 'payable-pressure', label: 'Payable Pressure', impactTemplate: 'A {amount} payment is due shortly — concentrated outflow.' },
    ],
  },
};

// ── INDUSTRY OPTIONS FOR ONBOARDING / SWITCHER (id, name, icon, description, category) ──
export interface IndustryOption {
  id: IndustryId;
  name: string;
  icon: string;
  description: string;
  category: string;
}

export const INDUSTRY_OPTIONS: IndustryOption[] = [
  { id: 'manufacturing', name: 'Manufacturing', icon: 'Factory', description: 'Track raw materials, production, inventory and supplier commitments.', category: 'Production' },
  { id: 'wholesale', name: 'Wholesale / Distribution', icon: 'Package', description: 'Track supplier purchases, inventory, customer orders and collections.', category: 'Distribution' },
  { id: 'retail', name: 'Retail / E-commerce', icon: 'ShoppingBag', description: 'Track inventory, sales, suppliers, customer demand and cash.', category: 'Commerce' },
  { id: 'saas', name: 'SaaS / Software', icon: 'Laptop', description: 'Track recurring revenue, customer collections, payroll and operating costs.', category: 'Technology' },
  { id: 'consulting', name: 'Consulting / Professional Services', icon: 'Briefcase', description: 'Track project billing, receivables, payroll and operating expenses.', category: 'Services' },
  { id: 'restaurant', name: 'Restaurant / Food', icon: 'UtensilsCrossed', description: 'Track food inventory, suppliers, daily sales and payroll.', category: 'Food Service' },
  { id: 'logistics', name: 'Logistics / Transportation', icon: 'Truck', description: 'Track fleet costs, customer invoices, fuel and operating expenses.', category: 'Transport' },
  { id: 'healthcare', name: 'Healthcare', icon: 'HeartPulse', description: 'Track supplies, patient/customer receivables, payroll and operating costs.', category: 'Healthcare' },
  { id: 'construction', name: 'Construction', icon: 'HardHat', description: 'Track project costs, supplier payments, billing milestones and receivables.', category: 'Construction' },
  { id: 'other', name: 'Other', icon: 'Wrench', description: 'Use a general-purpose FlowShield financial model.', category: 'General' },
];

// ── HELPERS ──────────────────────────────────────────────────────────────────

export function getIndustryProfile(industryId: IndustryId): IndustryProfile {
  return INDUSTRY_PROFILES[industryId] || INDUSTRY_PROFILES.other;
}

export function isValidIndustryId(id: string): id is IndustryId {
  return Object.prototype.hasOwnProperty.call(INDUSTRY_PROFILES, id);
}

/** Industry-aware title for an engine counterfactual / alternative strategy. */
export function industryRecommendationTitle(
  profile: IndustryProfile,
  cfId: string,
  fallbackTitle: string,
): string {
  const rec = profile.recommendations.find((r) => r.id === cfId);
  return rec ? rec.title : fallbackTitle;
}

/** Industry-aware action text for an engine counterfactual / alternative strategy. */
export function industryRecommendationAction(
  profile: IndustryProfile,
  cfId: string,
  fallbackTitle: string,
): string {
  const rec = profile.recommendations.find((r) => r.id === cfId);
  return rec ? rec.action : fallbackTitle;
}

/** Builds the safe-to-commit question with formatted amount, e.g. "₹14.0L". */
export function buildSafeToCommitQuestion(profile: IndustryProfile, amount: number): string {
  const lakhs = amount / 100000;
  const amountText = lakhs >= 1 ? `₹${lakhs.toFixed(1)}L` : `₹${amount.toLocaleString('en-IN')}`;
  return profile.safeToCommit.questionTemplate
    .replace('{amount}', amountText)
    .replace('{entity}', profile.safeToCommit.entityLabel);
}