-- ============================================================================
-- FlowShield: Enterprise Multi-Tenant PostgreSQL Schema for Supabase
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Configuration Table (Per-Company / Multi-Tenant)
CREATE TABLE IF NOT EXISTS configuration (
  id VARCHAR(50) PRIMARY KEY,
  company_id UUID DEFAULT NULL,
  current_cash NUMERIC(15, 2) NOT NULL DEFAULT 1240000,
  cash_floor NUMERIC(15, 2) NOT NULL DEFAULT 500000,
  forecast_weights NUMERIC(3, 2)[] NOT NULL DEFAULT '{0.50, 0.30, 0.20}',
  supplier_delay_days INTEGER NOT NULL DEFAULT 20,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. AR Transactions Table (Receivables)
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(100) PRIMARY KEY,
  company_id UUID DEFAULT NULL,
  date DATE NOT NULL,
  customer VARCHAR(200) NOT NULL,
  invoice_amount NUMERIC(15, 2) NOT NULL,
  expected_payment_date DATE NOT NULL,
  collection_probability NUMERIC(3, 2) NOT NULL DEFAULT 0.95,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. AP Bills Table (Payables)
CREATE TABLE IF NOT EXISTS payables (
  id VARCHAR(100) PRIMARY KEY,
  company_id UUID DEFAULT NULL,
  supplier VARCHAR(200) NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  due_date DATE NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'Procurement',
  status VARCHAR(50) NOT NULL DEFAULT 'DUE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Recurring Expenses Table (OPEX)
CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(100) PRIMARY KEY,
  company_id UUID DEFAULT NULL,
  date DATE NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Business Profile Table
CREATE TABLE IF NOT EXISTS business_profile (
  id VARCHAR(50) PRIMARY KEY,
  company_id UUID DEFAULT NULL,
  business_name VARCHAR(200) NOT NULL DEFAULT 'Shakti Electronics',
  industry_id VARCHAR(50) NOT NULL DEFAULT 'manufacturing',
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  country VARCHAR(100) NOT NULL DEFAULT 'India',
  cash_floor NUMERIC(15, 2) NOT NULL DEFAULT 500000,
  is_demo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Audit Logs Table (Full Traceability for FinTech Compliance)
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  company_id UUID DEFAULT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action VARCHAR(200) NOT NULL,
  details TEXT,
  actor VARCHAR(200) DEFAULT 'system'
);

-- 7. WhatsApp Notification Audit Log
CREATE TABLE IF NOT EXISTS whatsapp_notifications (
  id BIGSERIAL PRIMARY KEY,
  business_id VARCHAR(100) DEFAULT 'shakti-config',
  phone_number VARCHAR(50),
  alert_type VARCHAR(100) NOT NULL,
  risk_level VARCHAR(50),
  breach_probability NUMERIC(6, 4),
  message_id VARCHAR(200),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(50) NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Simulation Execution Archives (Enterprise Versioned Simulations)
CREATE TABLE IF NOT EXISTS simulation_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  min_projected_cash NUMERIC(15, 2) NOT NULL,
  breach_probability NUMERIC(6, 4) NOT NULL,
  p10_cash NUMERIC(15, 2),
  p50_cash NUMERIC(15, 2),
  p90_cash NUMERIC(15, 2),
  has_breach BOOLEAN NOT NULL,
  earliest_breach_date DATE,
  overrides JSONB DEFAULT '{}'::jsonb
);

-- Indexes for ultra-fast query execution
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(expected_payment_date);
CREATE INDEX IF NOT EXISTS idx_payables_date ON payables(due_date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_simulation_runs_created ON simulation_runs(created_at DESC);

-- ============================================================================
-- Row-Level Security (RLS) Setup for Enterprise Multi-Tenancy
-- ============================================================================
ALTER TABLE configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payables ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_runs ENABLE ROW LEVEL SECURITY;

-- Base Public Policy (allows platform backend service role / public fallback)
CREATE POLICY "Allow service role full access" ON configuration FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON payables FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON expenses FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON business_profile FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON audit_logs FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON simulation_runs FOR ALL USING (true);
