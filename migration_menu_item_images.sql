-- Migration: plusieurs images par plat
CREATE TABLE IF NOT EXISTS menu_item_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(menu_item_id, image_url)
);

CREATE INDEX IF NOT EXISTS idx_menu_item_images_item ON menu_item_images(menu_item_id, position);
CREATE INDEX IF NOT EXISTS idx_menu_item_images_restaurant ON menu_item_images(restaurant_id);

ALTER TABLE menu_item_images ENABLE ROW LEVEL SECURITY;
