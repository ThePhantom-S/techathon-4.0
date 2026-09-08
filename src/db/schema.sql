-- schema.sql
-- CashShock Database Schema for PostgreSQL

-- 1. Configuration / Settings Table
CREATE TABLE IF NOT EXISTS configuration (
  id VARCHAR(50) PRIMARY KEY,
  current_cash NUMERIC(15, 2) NOT NULL,
  cash_floor NUMERIC(15, 2) NOT NULL,
  forecast_weights NUMERIC(3, 2)[] NOT NULL,
  supplier_delay_days INTEGER NOT NULL DEFAULT 20
);

-- 2. AR Transactions Table (Receivables)
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(100) PRIMARY KEY,
  date DATE NOT NULL,
  customer VARCHAR(200) NOT NULL,
  invoice_amount NUMERIC(15, 2) NOT NULL,
  expected_payment_date DATE NOT NULL,
  collection_probability NUMERIC(3, 2) NOT NULL,
  status VARCHAR(50) NOT NULL -- 'PENDING', 'COLLECTED', 'DELAYED'
);

-- 3. AP Bills Table (Payables)
CREATE TABLE IF NOT EXISTS payables (
  id VARCHAR(100) PRIMARY KEY,
  supplier VARCHAR(200) NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  due_date DATE NOT NULL,
  category VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL -- 'DUE', 'PAID', 'CRITICAL'
);

-- 4. Expenses Table (Recurring OPEX)
CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(100) PRIMARY KEY,
  date DATE NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount NUMERIC(15, 2) NOT NULL
);

-- 5. Audit Log History Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  action VARCHAR(200) NOT NULL,
  details TEXT
);

-- 6. WhatsApp Notification Audit Table (safe metadata only — no tokens)
CREATE TABLE IF NOT EXISTS whatsapp_notifications (
  id SERIAL PRIMARY KEY,
  business_id VARCHAR(100) DEFAULT 'shakti-config',
  phone_number VARCHAR(50),
  alert_type VARCHAR(100) NOT NULL,
  risk_level VARCHAR(50),
  breach_probability NUMERIC(6, 4),
  message_id VARCHAR(200),
  sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
  status VARCHAR(50) NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
