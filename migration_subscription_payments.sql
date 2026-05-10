-- Migration : reçus de paiement mensuel TableQR
-- Exécuter dans Supabase SQL Editor après migration_subscription_month_status.sql

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS subscription_paid_until DATE,
  ADD COLUMN IF NOT EXISTS subscription_last_payment_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_monthly_amount DECIMAL(10,2) DEFAULT 15000,
  ADD COLUMN IF NOT EXISTS subscription_payment_note TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO UPDATE SET public = false;

CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL CHECK (month_key ~ '^[0-9]{4}-[0-9]{2}$'),
  amount DECIMAL(10,2) NOT NULL DEFAULT 15000,
  currency TEXT NOT NULL DEFAULT 'XOF',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  receipt_storage_path TEXT,
  receipt_file_name TEXT,
  receipt_content_type TEXT,
  receipt_size BIGINT,
  note TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by_email TEXT,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, month_key)
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_restaurant_month
  ON subscription_payments(restaurant_id, month_key DESC);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_status
  ON subscription_payments(status, submitted_at DESC);

ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_payments_no_direct_access" ON subscription_payments;
CREATE POLICY "subscription_payments_no_direct_access"
  ON subscription_payments
  FOR ALL
  USING (false)
  WITH CHECK (false);
