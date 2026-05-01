-- Social presence hardening
-- Run this once in Supabase SQL Editor before deploying the Social page changes.

ALTER TABLE client_sessions
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

UPDATE client_sessions
SET last_seen_at = COALESCE(last_seen_at, entered_at, created_at, NOW())
WHERE last_seen_at IS NULL;

UPDATE client_sessions
SET
  is_present = false,
  left_at = COALESCE(left_at, last_seen_at, entered_at, created_at, NOW())
WHERE is_present = true
  AND COALESCE(last_seen_at, entered_at, created_at, NOW()) < NOW() - INTERVAL '6 hours';

CREATE INDEX IF NOT EXISTS idx_sessions_live_social
ON client_sessions(restaurant_id, is_present, is_remote, social_mode, last_seen_at DESC);
