-- Migration : statut d'abonnement par restaurant
-- Exécuter dans Supabase SQL Editor

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'subscribed'
    CHECK (subscription_status IN ('trial', 'subscribed')),
  ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Restaurants preview → trial
UPDATE restaurants SET subscription_status = 'trial' WHERE is_preview = true AND subscription_status IS NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_restaurants_subscription ON restaurants(subscription_status);
