-- ============================================================================
-- FlowShield Supabase Migration Schema
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/wnsfvbzdcszvswfytjnu/sql/new
-- ============================================================================

-- 1. Configuration Table
CREATE TABLE IF NOT EXISTS public.configuration (
  id VARCHAR(50) PRIMARY KEY,
  current_cash NUMERIC(15, 2) NOT NULL,
  cash_floor NUMERIC(15, 2) NOT NULL,
  forecast_weights NUMERIC(3, 2)[] NOT NULL,
  supplier_delay_days INTEGER NOT NULL DEFAULT 20
);

-- 2. Transactions Table (Receivables / AR)
CREATE TABLE IF NOT EXISTS public.transactions (
  id VARCHAR(100) PRIMARY KEY,
  date DATE NOT NULL,
  customer VARCHAR(200) NOT NULL,
  invoice_amount NUMERIC(15, 2) NOT NULL,
  expected_payment_date DATE NOT NULL,
  collection_probability NUMERIC(3, 2) NOT NULL,
  status VARCHAR(50) NOT NULL -- 'PENDING', 'COLLECTED', 'DELAYED'
);

-- 3. Payables Table (Payables / AP)
CREATE TABLE IF NOT EXISTS public.payables (
  id VARCHAR(100) PRIMARY KEY,
  supplier VARCHAR(200) NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  due_date DATE NOT NULL,
  category VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL -- 'DUE', 'PAID', 'CRITICAL'
);

-- 4. Expenses Table (Recurring OPEX)
CREATE TABLE IF NOT EXISTS public.expenses (
  id VARCHAR(100) PRIMARY KEY,
  date DATE NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount NUMERIC(15, 2) NOT NULL
);

-- 5. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  action VARCHAR(200) NOT NULL,
  details TEXT
);

-- 6. Business Profile Table
CREATE TABLE IF NOT EXISTS public.business_profile (
  id VARCHAR(50) PRIMARY KEY,
  business_name VARCHAR(200) NOT NULL,
  industry_id VARCHAR(50) NOT NULL DEFAULT 'manufacturing',
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  country VARCHAR(100) NOT NULL DEFAULT 'India',
  cash_floor NUMERIC(15, 2) NOT NULL DEFAULT 500000,
  is_demo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 7. WhatsApp Notifications Table
CREATE TABLE IF NOT EXISTS public.whatsapp_notifications (
  id SERIAL PRIMARY KEY,
  business_id VARCHAR(100) DEFAULT 'shakti-config',
  phone_number VARCHAR(50),
  alert_type VARCHAR(100) NOT NULL,
  risk_level VARCHAR(50),
  breach_probability NUMERIC(6, 4),
  message_id VARCHAR(200),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  status VARCHAR(50) NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Enable Row Level Security (RLS) & Grant Access to anon / authenticated
-- ============================================================================
ALTER TABLE public.configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_notifications ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access via anon key for FlowShield
CREATE POLICY "Allow public read access configuration" ON public.configuration FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read access transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read access payables" ON public.payables FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read access expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read access audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read access business_profile" ON public.business_profile FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read access whatsapp_notifications" ON public.whatsapp_notifications FOR ALL USING (true) WITH CHECK (true);

-- Grant privileges to anon and authenticated roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- ============================================================================
-- Seed Default Shakti Electronics Baseline Data
-- ============================================================================
INSERT INTO public.configuration (id, current_cash, cash_floor, forecast_weights, supplier_delay_days)
VALUES ('shakti-config', 1240000.00, 500000.00, ARRAY[0.50, 0.30, 0.20], 20)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.business_profile (id, business_name, industry_id, currency, country, cash_floor, is_demo)
VALUES ('shakti-config', 'Shakti Electronics', 'manufacturing', 'INR', 'India', 500000.00, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.transactions (id, date, customer, invoice_amount, expected_payment_date, collection_probability, status)
VALUES
  ('tx-101', '2026-10-15', 'TechCorp Industries', 420000.00, '2026-10-15', 0.90, 'DELAYED'),
  ('tx-102', '2026-10-28', 'Shakti Enterprise Client Order (Partial)', 900000.00, '2026-10-28', 1.00, 'PENDING'),
  ('tx-103', '2026-11-12', 'Global Electro-Components', 1200000.00, '2026-11-12', 0.95, 'PENDING'),
  ('tx-104', '2026-11-25', 'Shakti Enterprise Client Order (Final)', 2100000.00, '2026-11-25', 1.00, 'PENDING'),
  ('tx-105', '2026-12-10', 'TechCorp Industries (Phase 2 Delivery)', 1400000.00, '2026-12-10', 0.95, 'PENDING'),
  ('tx-106', '2026-12-22', 'Bharat Heavy Electricals Consortium', 1600000.00, '2026-12-22', 0.90, 'PENDING')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.payables (id, supplier, amount, due_date, category, status)
VALUES
  ('pay-201', 'Shakti Electronics (Component Supply)', 1800000.00, '2026-10-16', 'Procurement', 'CRITICAL'),
  ('pay-202', 'Apex Logistics Services', 250000.00, '2026-10-18', 'Freight & Shipping', 'DUE'),
  ('pay-203', 'State Power Board', 120000.00, '2026-10-20', 'Utilities', 'DUE'),
  ('pay-204', 'Silico Tech Materials', 350000.00, '2026-11-05', 'Raw Material', 'DUE'),
  ('pay-205', 'Industrial Rent Corp', 180000.00, '2026-11-01', 'Facility Rent', 'DUE'),
  ('pay-206', 'Industrial Rent Corp', 180000.00, '2026-12-01', 'Facility Rent', 'DUE'),
  ('pay-207', 'Silico Tech Materials', 520000.00, '2026-12-12', 'Raw Material', 'DUE'),
  ('pay-208', 'Apex Logistics Services', 210000.00, '2026-12-18', 'Freight & Shipping', 'DUE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.expenses (id, date, category, amount)
VALUES
  ('exp-1', '2026-10-05', 'Operational Staff Payroll', 220000.00),
  ('exp-2', '2026-10-25', 'Factory Operations', 80000.00),
  ('exp-3', '2026-11-05', 'Operational Staff Payroll', 220000.00),
  ('exp-4', '2026-11-25', 'Factory Operations', 80000.00),
  ('exp-5', '2026-12-05', 'Operational Staff Payroll', 220000.00),
  ('exp-6', '2026-12-25', 'Factory Operations', 80000.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.audit_logs (action, details)
VALUES ('SEED', 'Supabase Shakti Electronics baseline seed complete');
