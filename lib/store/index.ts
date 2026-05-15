import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ClientSession, Restaurant, Cart, CartItem, MenuItem, Notification } from '@/types'

interface SessionStore {
  session: ClientSession | null
  restaurant: Restaurant | null
  cart: Cart
  notifications: Notification[]
  unread_count: number
  setSession: (s: ClientSession) => void
  setRestaurant: (r: Restaurant) => void
  clearSession: () => void
  addToCart: (item: MenuItem, quantity?: number, notes?: string, unitPrice?: number) => void
  removeFromCart: (item_id: string) => void
  updateQuantity: (item_id: string, qty: number) => void
  clearCart: () => void
  addNotification: (n: Notification) => void
  markAllRead: () => void
}

const emptyCart: Cart = { items: [], total: 0, item_count: 0 }

function resolveCartUnitPrice(item: MenuItem, unitPrice?: number) {
  if (item.price_mode === 'customer_entered') {
    const selected = Number(unitPrice)
    if (Number.isFinite(selected) && selected > 0) return selected
    const minimum = Number(item.min_price)
    return Number.isFinite(minimum) && minimum > 0 ? minimum : 0
  }
  return Number(item.price) || 0
}

function recompute(items: CartItem[]): Cart {
  return {
    items,
    total: items.reduce((s, i) => s + i.subtotal, 0),
    item_count: items.reduce((s, i) => s + i.quantity, 0),
  }
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      session: null, restaurant: null, cart: emptyCart, notifications: [], unread_count: 0,
      setSession: (session) => set({ session }),
      setRestaurant: (restaurant) => {
        const prev = get().restaurant
        if (prev && prev.id !== restaurant.id) {
          set({ restaurant, cart: emptyCart, session: null, notifications: [], unread_count: 0 })
        } else {
          set({ restaurant })
        }
      },
      clearSession: () => set({ session: null, cart: emptyCart, notifications: [], unread_count: 0 }),
      addToCart: (menu_item, quantity = 1, notes, unitPrice) => {
        const { cart } = get()
        const existing = cart.items.find(i => i.menu_item.id === menu_item.id)
        const nextUnitPrice = resolveCartUnitPrice(menu_item, unitPrice ?? existing?.unit_price)
        const items = existing
          ? cart.items.map(i => i.menu_item.id === menu_item.id
              ? { ...i, unit_price: nextUnitPrice, quantity: i.quantity + quantity, subtotal: (i.quantity + quantity) * nextUnitPrice }
              : i)
          : [...cart.items, { menu_item, quantity, notes, unit_price: nextUnitPrice, subtotal: nextUnitPrice * quantity }]
        set({ cart: recompute(items) })
      },
      removeFromCart: (item_id) => {
        set({ cart: recompute(get().cart.items.filter(i => i.menu_item.id !== item_id)) })
      },
      updateQuantity: (item_id, qty) => {
        if (qty <= 0) { get().removeFromCart(item_id); return }
        set({ cart: recompute(get().cart.items.map(i => i.menu_item.id === item_id ? { ...i, quantity: qty, subtotal: qty * resolveCartUnitPrice(i.menu_item, i.unit_price) } : i)) })
      },
      clearCart: () => set({ cart: emptyCart }),
      addNotification: (n) => set(s => ({ notifications: [n, ...s.notifications].slice(0, 50), unread_count: s.unread_count + 1 })),
      markAllRead: () => set(s => ({ notifications: s.notifications.map(n => ({ ...n, is_read: true })), unread_count: 0 })),
    }),
    { name: 'tableqr-session', partialize: (s) => ({ session: s.session, restaurant: s.restaurant, cart: s.cart }) }
  )
)

interface AdminStore {
  restaurant: Restaurant | null
  setRestaurant: (r: Restaurant) => void
}

export const useAdminStore = create<AdminStore>()(
  persist(
    (set) => ({ restaurant: null, setRestaurant: (restaurant) => set({ restaurant }) }),
    { name: 'tableqr-admin' }
  )
)
