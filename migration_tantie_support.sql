-- Tantie IA + Assistance client/personnel
-- À exécuter dans Supabase SQL Editor avant de tester en production.

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS bot_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS bot_context TEXT,
  ADD COLUMN IF NOT EXISTS bot_transfer_enabled BOOLEAN DEFAULT true;

CREATE TABLE IF NOT EXISTS restaurant_bot_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  question_key TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, question_key)
);

CREATE TABLE IF NOT EXISTS support_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  client_session_id UUID NOT NULL REFERENCES client_sessions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open',
  source TEXT NOT NULL DEFAULT 'client',
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, client_session_id)
);

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'staff', 'bot')),
  sender_session_id UUID REFERENCES client_sessions(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_answers_restaurant
  ON restaurant_bot_answers(restaurant_id, category, position);

CREATE INDEX IF NOT EXISTS idx_support_conversations_restaurant
  ON support_conversations(restaurant_id, status, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_conversations_client
  ON support_conversations(client_session_id);

CREATE INDEX IF NOT EXISTS idx_support_messages_conversation
  ON support_messages(conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_support_messages_unread
  ON support_messages(restaurant_id, conversation_id, sender_type, is_read);

ALTER TABLE restaurant_bot_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'support_conversations'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE support_conversations';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'support_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE support_messages';
  END IF;
END $$;
