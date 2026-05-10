-- Migration : suivi mensuel de paiement d'abonnement
-- Exécuter dans Supabase SQL Editor

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS subscription_paid_until DATE,
  ADD COLUMN IF NOT EXISTS subscription_last_payment_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_monthly_amount DECIMAL(10,2) DEFAULT 15000,
  ADD COLUMN IF NOT EXISTS subscription_payment_note TEXT;

-- Ne pas remplir automatiquement subscription_paid_until.
-- Un mois devient payé uniquement après validation explicite du superadmin.

CREATE INDEX IF NOT EXISTS idx_restaurants_subscription_paid_until
  ON restaurants(subscription_paid_until);
