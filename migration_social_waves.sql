-- Coucou anonyme (waves)
-- À exécuter dans l'éditeur SQL de Supabase avant le déploiement.

CREATE TABLE IF NOT EXISTS social_waves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  sender_session_id UUID NOT NULL REFERENCES client_sessions(id) ON DELETE CASCADE,
  receiver_session_id UUID NOT NULL REFERENCES client_sessions(id) ON DELETE CASCADE,
  is_mutual BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_waves_receiver
  ON social_waves(receiver_session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_waves_pair
  ON social_waves(restaurant_id, sender_session_id, receiver_session_id, created_at DESC);

ALTER TABLE social_waves ENABLE ROW LEVEL SECURITY;

-- Permettre la diffusion realtime sur cette table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'social_waves'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE social_waves';
  END IF;
END $$;

-- Idem pour social_messages au cas où la publication n'est pas activée
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'social_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE social_messages';
  END IF;
END $$;
