-- ============================================================
-- TABLEQR — Schéma base de données multi-tenant
-- À coller dans l'éditeur SQL de Supabase
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- RESTAURANTS (tenants)
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  cover_url TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'CI',
  phone TEXT,
  email TEXT,
  primary_color TEXT DEFAULT '#F26522',
  secondary_color TEXT DEFAULT '#D4A017',
  accent_color TEXT DEFAULT '#C0392B',
  bot_name TEXT DEFAULT 'Tantie',
  bot_personality TEXT DEFAULT 'chaleureux',
  module_social BOOLEAN DEFAULT true,
  module_games BOOLEAN DEFAULT true,
  module_delivery BOOLEAN DEFAULT true,
  module_loyalty BOOLEAN DEFAULT true,
  module_birthday BOOLEAN DEFAULT true,
  currency TEXT DEFAULT 'XOF',
  tax_rate DECIMAL(5,2) DEFAULT 0,
  plan TEXT DEFAULT 'starter',
  plan_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ADMIN USERS
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'owner',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLES
CREATE TABLE restaurant_tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  table_number TEXT NOT NULL,
  capacity INTEGER DEFAULT 4,
  zone TEXT,
  qr_code TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CATÉGORIES MENU
CREATE TABLE menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_en TEXT,
  icon TEXT,
  position INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PLATS
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES menu_categories(id),
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  allergens TEXT[] DEFAULT '{}',
  is_vegetarian BOOLEAN DEFAULT false,
  is_vegan BOOLEAN DEFAULT false,
  is_halal BOOLEAN DEFAULT false,
  is_spicy BOOLEAN DEFAULT false,
  spicy_level INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  stock INTEGER,
  order_count INTEGER DEFAULT 0,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SESSIONS CLIENT (anonymous)
CREATE TABLE client_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id UUID REFERENCES restaurant_tables(id),
  pseudo TEXT NOT NULL,
  avatar_icon TEXT NOT NULL,
  gender TEXT,
  profile_type TEXT DEFAULT 'solo',
  partner_session_id UUID,
  group_id UUID,
  social_mode TEXT DEFAULT 'receptif',
  is_birthday BOOLEAN DEFAULT false,
  birthday_verified BOOLEAN DEFAULT false,
  birthday_gift_given BOOLEAN DEFAULT false,
  is_present BOOLEAN DEFAULT true,
  is_remote BOOLEAN DEFAULT false,
  push_token TEXT,
  notif_accepted BOOLEAN DEFAULT false,
  device_fingerprint TEXT,
  ip_address TEXT,
  entered_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- COMMANDES
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  session_id UUID REFERENCES client_sessions(id),
  table_id UUID REFERENCES restaurant_tables(id),
  order_number TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'unpaid',
  payment_method TEXT,
  payment_ref TEXT,
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  order_type TEXT DEFAULT 'dine_in',
  delivery_address TEXT,
  notes TEXT,
  is_remote BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LIGNES COMMANDE
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id),
  menu_item_id UUID REFERENCES menu_items(id),
  item_name TEXT NOT NULL,
  item_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER DEFAULT 1,
  total DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MESSAGES SOCIAUX
CREATE TABLE social_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  sender_session_id UUID REFERENCES client_sessions(id),
  receiver_session_id UUID REFERENCES client_sessions(id),
  message TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT true,
  is_read BOOLEAN DEFAULT false,
  trigger_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MATCHS
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  session_a_id UUID REFERENCES client_sessions(id),
  session_b_id UUID REFERENCES client_sessions(id),
  session_a_voted BOOLEAN,
  session_b_voted BOOLEAN,
  is_matched BOOLEAN DEFAULT false,
  session_a_shared_contact BOOLEAN DEFAULT false,
  session_b_shared_contact BOOLEAN DEFAULT false,
  session_a_contact TEXT,
  session_b_contact TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- JEUX
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  status TEXT DEFAULT 'waiting',
  max_players INTEGER DEFAULT 4,
  current_players INTEGER DEFAULT 0,
  game_data JSONB DEFAULT '{}',
  scores JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE game_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  session_id UUID REFERENCES client_sessions(id),
  score INTEGER DEFAULT 0,
  is_ready BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  session_id UUID REFERENCES client_sessions(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FIDÉLITÉ
CREATE TABLE loyalty_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  visit_count INTEGER DEFAULT 1,
  total_spent DECIMAL(10,2) DEFAULT 0,
  points INTEGER DEFAULT 0,
  last_visit TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ANALYTICS
CREATE TABLE daily_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_scans INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  avg_basket DECIMAL(10,2) DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  total_matches INTEGER DEFAULT 0,
  total_games INTEGER DEFAULT 0,
  top_items JSONB DEFAULT '[]',
  peak_hour INTEGER,
  UNIQUE(restaurant_id, date)
);

-- INDEX
CREATE INDEX idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX idx_orders_status ON orders(restaurant_id, status);
CREATE INDEX idx_orders_created ON orders(restaurant_id, created_at DESC);
CREATE INDEX idx_sessions_restaurant ON client_sessions(restaurant_id);
CREATE INDEX idx_sessions_present ON client_sessions(restaurant_id, is_present);
CREATE INDEX idx_sessions_live_social ON client_sessions(restaurant_id, is_present, is_remote, social_mode, last_seen_at DESC);
CREATE INDEX idx_messages_receiver ON social_messages(receiver_session_id, is_read);
CREATE INDEX idx_notifications_session ON notifications(session_id, is_read);
CREATE INDEX idx_restaurant_slug ON restaurants(slug);

-- RLS (Row Level Security)
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_restaurants_updated BEFORE UPDATE ON restaurants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_menu_items_updated BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- DONNÉES DE TEST (un restaurant démo)
INSERT INTO restaurants (slug, name, description, city, bot_name, primary_color, secondary_color, accent_color)
VALUES ('chez-kofi', 'Chez Kofi', 'Le meilleur de la cuisine ivoirienne', 'Abidjan', 'Tantie', '#F26522', '#D4A017', '#C0392B');
