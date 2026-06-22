-- Migration: optimise la purge des notifications expirees (24h)
CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON notifications(created_at DESC);
