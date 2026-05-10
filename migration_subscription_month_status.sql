-- Migration : suivi mensuel de paiement d'abonnement
-- Exécuter dans Supabase SQL Editor

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS subscription_paid_until DATE,
  ADD COLUMN IF NOT EXISTS subscription_last_payment_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_monthly_amount DECIMAL(10,2) DEFAULT 15000,
  ADD COLUMN IF NOT EXISTS subscription_payment_note TEXT;

-- Les restaurants déjà abonnés restent verts au déploiement.
UPDATE restaurants
SET
  subscription_paid_until = (date_trunc('month', NOW()) + INTERVAL '1 month - 1 day')::DATE,
  subscription_last_payment_at = COALESCE(subscription_last_payment_at, subscription_started_at, NOW()),
  subscription_monthly_amount = COALESCE(subscription_monthly_amount, 15000)
WHERE subscription_paid_until IS NULL
  AND COALESCE(subscription_status, 'subscribed') = 'subscribed'
  AND COALESCE(is_preview, false) = false
  AND COALESCE(is_active, true) = true;

CREATE INDEX IF NOT EXISTS idx_restaurants_subscription_paid_until
  ON restaurants(subscription_paid_until);
