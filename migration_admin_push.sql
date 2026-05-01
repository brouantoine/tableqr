-- Migration: Push notifications admin (Web Push)
-- À exécuter dans l'éditeur SQL de Supabase

CREATE TABLE IF NOT EXISTS admin_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  admin_email TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_push_subs_restaurant ON admin_push_subscriptions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_admin_push_subs_email ON admin_push_subscriptions(admin_email);
