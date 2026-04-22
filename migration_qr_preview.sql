-- Migration: QR Codes physiques + mode Preview restaurant
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Ajout du mode preview aux restaurants
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS is_preview BOOLEAN DEFAULT false;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS admin_email TEXT;

-- 2. Table des QR codes indépendants
CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  batch_name TEXT,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  table_name TEXT,
  linked_at TIMESTAMPTZ,
  scan_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON qr_codes(code);
CREATE INDEX IF NOT EXISTS idx_qr_codes_restaurant ON qr_codes(restaurant_id);
