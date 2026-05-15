-- Migration: prix fixe ou prix saisi par le client sur certains plats
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS price_mode TEXT NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS min_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS max_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS price_hint TEXT;

UPDATE menu_items
SET price_mode = 'fixed'
WHERE price_mode IS NULL;

ALTER TABLE menu_items
  ALTER COLUMN price_mode SET DEFAULT 'fixed',
  ALTER COLUMN price_mode SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'menu_items_price_mode_check'
  ) THEN
    ALTER TABLE menu_items
      ADD CONSTRAINT menu_items_price_mode_check
      CHECK (price_mode IN ('fixed', 'customer_entered'));
  END IF;
END $$;
