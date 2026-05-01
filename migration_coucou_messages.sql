-- Coucou = message social
-- À exécuter une fois dans Supabase SQL Editor si le realtime des messages n'est pas encore actif.

CREATE INDEX IF NOT EXISTS idx_social_messages_receiver_created
  ON social_messages(receiver_session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_messages_coucou_rate
  ON social_messages(restaurant_id, sender_session_id, receiver_session_id, trigger_type, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'social_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE social_messages';
  END IF;
END $$;
