export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Restaurant {
  id: string
  slug: string
  name: string
  description?: string
  logo_url?: string
  cover_url?: string
  address?: string
  city?: string
  country: string
  phone?: string
  email?: string
  admin_email?: string
  primary_color: string
  secondary_color: string
  accent_color: string
  bot_name: string
  bot_personality: string
  module_social: boolean
  module_games: boolean
  module_delivery: boolean
  module_loyalty: boolean
  module_birthday: boolean
  currency: string
  tax_rate: number
  plan: 'starter' | 'pro' | 'enterprise'
  plan_expires_at?: string
  is_active: boolean
  is_preview?: boolean
  subscription_status?: 'trial' | 'subscribed'
  subscription_started_at?: string
  trial_ends_at?: string
  created_at: string
  updated_at: string
}

export interface QRCode {
  id: string
  code: string
  batch_name?: string
  restaurant_id?: string
  table_name?: string
  linked_at?: string
  scan_count: number
  created_at: string
}

export interface AdminUser {
  id: string
  restaurant_id: string
  email: string
  full_name?: string
  role: 'owner' | 'manager' | 'cashier'
  is_active: boolean
  created_at: string
}

export interface RestaurantTable {
  id: string
  restaurant_id: string
  table_number: string
  capacity: number
  zone?: string
  qr_code: string
  is_active: boolean
  created_at: string
}

export interface MenuCategory {
  id: string
  restaurant_id: string
  name: string
  name_en?: string
  icon?: string
  position: number
  is_active: boolean
  items?: MenuItem[]
}

export interface MenuItem {
  id: string
  restaurant_id: string
  category_id: string
  name: string
  name_en?: string
  description?: string
  price: number
  image_url?: string
  allergens: string[]
  is_vegetarian: boolean
  is_vegan: boolean
  is_halal: boolean
  is_spicy: boolean
  spicy_level: number
  is_available: boolean
  stock?: number
  order_count: number
  position: number
  category?: MenuCategory
  avg_rating?: number
}

export type Gender = 'homme' | 'femme' | 'jeune_homme' | 'fille' | 'maman'
export type ProfileType = 'solo' | 'couple' | 'famille' | 'groupe'
export type SocialMode = 'receptif' | 'discret' | 'invisible'

export interface ClientSession {
  id: string
  restaurant_id: string
  table_id?: string
  pseudo: string
  avatar_icon: string
  gender?: Gender
  profile_type: ProfileType
  partner_session_id?: string
  group_id?: string
  social_mode: SocialMode
  is_birthday: boolean
  birthday_verified: boolean
  birthday_gift_given: boolean
  is_present: boolean
  is_remote: boolean
  push_token?: string
  notif_accepted: boolean
  device_fingerprint?: string
  entered_at: string
  last_seen_at?: string | null
  left_at?: string | null
  created_at: string
  table?: RestaurantTable
  restaurant?: Restaurant
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'refunded'
export type PaymentMethod = 'cash' | 'wave' | 'orange_money' | 'mtn' | 'moov' | 'card'
export type OrderType = 'dine_in' | 'delivery' | 'takeaway'

export interface Order {
  id: string
  restaurant_id: string
  session_id?: string
  table_id?: string
  order_number: string
  status: OrderStatus
  payment_status: PaymentStatus
  payment_method?: PaymentMethod
  payment_ref?: string
  subtotal: number
  tax_amount: number
  total: number
  order_type: OrderType
  delivery_address?: string
  notes?: string
  is_remote: boolean
  created_at: string
  updated_at: string
  items?: OrderItem[]
  session?: ClientSession
  table?: RestaurantTable
}

export interface OrderItem {
  id: string
  order_id: string
  restaurant_id: string
  menu_item_id: string
  item_name: string
  item_price: number
  quantity: number
  total: number
  notes?: string
  menu_item?: MenuItem
}

export interface SocialMessage {
  id: string
  restaurant_id: string
  sender_session_id: string
  receiver_session_id: string
  message: string
  is_anonymous: boolean
  is_read: boolean
  trigger_type?: 'plat_partage' | 'libre' | 'jeu'
  created_at: string
  sender?: ClientSession
}

export interface SocialWave {
  id: string
  restaurant_id: string
  sender_session_id: string
  receiver_session_id: string
  is_mutual: boolean
  created_at: string
}

export interface Match {
  id: string
  restaurant_id: string
  session_a_id: string
  session_b_id: string
  session_a_voted?: boolean
  session_b_voted?: boolean
  is_matched: boolean
  session_a_shared_contact: boolean
  session_b_shared_contact: boolean
  created_at: string
}

export type GameType = 'quiz' | 'trivia' | 'couple_quiz' | 'mots_croises'
export type GameStatus = 'waiting' | 'playing' | 'finished'

export interface GameSession {
  id: string
  restaurant_id: string
  game_type: GameType
  status: GameStatus
  max_players: number
  current_players: number
  game_data: Json
  scores: Json
  created_at: string
  updated_at: string
  players?: GamePlayer[]
}

export interface GamePlayer {
  id: string
  game_session_id: string
  session_id: string
  score: number
  is_ready: boolean
  joined_at: string
  session?: ClientSession
}

export type NotificationType = 'plat_partage' | 'message' | 'jeu_invite' | 'anniversaire' | 'promo' | 'match' | 'order_ready'

export interface Notification {
  id: string
  restaurant_id: string
  session_id: string
  type: NotificationType
  title: string
  body?: string
  data: Json
  is_read: boolean
  created_at: string
}

export interface CartItem {
  menu_item: MenuItem
  quantity: number
  notes?: string
  subtotal: number
}

export interface Cart {
  items: CartItem[]
  total: number
  item_count: number
}

export interface DashboardStats {
  today_revenue: number
  today_orders: number
  active_tables: number
  pending_orders: number
  clients_now: number
  week_revenue: number
}
