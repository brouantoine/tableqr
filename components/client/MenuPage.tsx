'use client'
import { useState, useEffect, Suspense } from 'react'
import TwemojiAvatar from './TwemojiAvatar'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ShoppingBag, ClipboardList, Plus, Minus, X, Star, Clock, Flame, Leaf, Heart, ChevronRight, UtensilsCrossed, MessageCircle, Gamepad2, Bell, Package } from 'lucide-react'
import { useSessionStore } from '@/lib/store'
import { supabase } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'
import type { MenuCategory, MenuItem, Restaurant } from '@/types'
import OnboardingPage from './OnboardingPage'

export default function MenuPage({ restaurant, categories }: { restaurant: Restaurant; categories: MenuCategory[] }) {
  const { cart, addToCart, updateQuantity, session, clearCart } = useSessionStore()

  const [activeCategory, setActiveCategory] = useState(categories[0]?.id)
  const [search, setSearch] = useState('')
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [showCart, setShowCart] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [liked, setLiked] = useState<string[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [ordering, setOrdering] = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const [activeOrdersCount, setActiveOrdersCount] = useState(0)
  const p = restaurant.primary_color

  // Si pas de session → onboarding d'abord
  const [tableId, setTableId] = useState('')
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tid = params.get('table') || ''
    setTableId(tid)
    // Session valide = même restaurant + présent
    const valid = session && session.restaurant_id === restaurant.id && session.is_present
    if (!valid && tid) setShowOnboarding(true)
  }, [session])

  useEffect(() => {
    if (!session) return
    setShowOnboarding(false)
    supabase.from('orders').select('id', { count: 'exact' })
      .eq('session_id', session.id)
      .in('status', ['pending', 'confirmed', 'preparing', 'ready'])
      .then(({ count }) => setActiveOrdersCount(count || 0))
  }, [session])

  const allItems = categories.flatMap(c => c.items || [])
  const featured = allItems.filter(i => i.is_available).slice(0, 5)
  const activeItems = search
    ? allItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : categories.find(c => c.id === activeCategory)?.items?.filter(i => i.is_available) || []
  const cartQty = (id: string) => cart.items.find(i => i.menu_item.id === id)?.quantity || 0

  async function placeOrder() {
    if (!session || cart.items.length === 0 || ordering) return
    setOrdering(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          restaurant_id: restaurant.id,
          table_id: session.table_id || tableId,
          items: cart.items.map(i => ({
            menu_item_id: i.menu_item.id,
            quantity: i.quantity,
            notes: notes[i.menu_item.id] || null,
          })),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const orderId = data?.data?.id
        setOrderPlaced(true)
        setShowCart(false)
        setNotes({})
        clearCart()
        if (orderId) {
          setTimeout(async () => {
            await fetch('/api/orders/auto-confirm', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ order_id: orderId }),
            })
          }, 5 * 60 * 1000)
        }
      }
    } catch (e) {
      console.error('Order error:', e)
    } finally {
      setOrdering(false)
    }
  }

  // Table object minimal pour OnboardingPage
  // Si tableId est un UUID → vraie table classique ; sinon c'est un nom de table physique (QR physique)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tableId)
  const tableObj = { id: isUuid ? tableId : null, table_number: tableId, restaurant_id: restaurant.id } as any

  // Vérifier que la session est bien pour CE restaurant
  const sessionValid = session && session.restaurant_id === restaurant.id && session.is_present

  if (showOnboarding && tableId) {
    return <OnboardingPage restaurant={restaurant} table={tableObj} onDone={() => {
      setShowOnboarding(false)
      if (pendingHref) {
        window.location.href = pendingHref
        setPendingHref(null)
      }
    }} />
  }

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: '#F8F8F8' }}>

      {/* ── HERO HEADER ── */}
      <div className="relative px-5 pt-10 pb-6 rounded-b-[2.5rem] overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #1A1208 0%, #2D1F0A 60%, #3D2A0E 100%)' }}>
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10"
          style={{ background: `radial-gradient(circle, ${p}, transparent)`, transform: 'translate(30%, -30%)' }} />

        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center gap-3">
            {session && (
              <>
                <TwemojiAvatar avatarId={session.avatar_icon || ''} size={38} className="ring-2 ring-white/20" />
                <div>
                  <p className="text-white/60 text-xs">Bonsoir,</p>
                  <p className="text-white font-black text-sm">{session.pseudo}</p>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a href={`/${restaurant.slug}/commandes`}
              className="relative w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
              <ClipboardList size={18} className="text-white" />
              {activeOrdersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center font-black text-white"
                  style={{ backgroundColor: p, fontSize: '9px' }}>{activeOrdersCount}</span>
              )}
            </a>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowCart(true)}
              className="relative w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: p, boxShadow: `0 4px 15px ${p}60` }}>
              <ShoppingBag size={18} className="text-white" />
              <AnimatePresence>
                {cart.item_count > 0 && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white text-xs flex items-center justify-center font-black"
                    style={{ color: p }}>{cart.item_count}</motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        <div className="relative z-10 mb-5">
          <h1 className="text-white text-2xl font-black leading-tight mb-0.5">
            Qu&apos;est-ce qui vous<br />
            <span style={{ color: p }}>fait envie</span> ce soir ?
          </h1>
          <p className="text-white/40 text-xs">{restaurant.name}</p>
        </div>

        <div className="relative z-10">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Rechercher un plat..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 rounded-2xl font-medium outline-none text-gray-800"
            style={{ fontSize: '16px', padding: '14px 16px 14px 44px', backgroundColor: 'rgba(255,255,255,0.95)' }} />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
              <X size={12} className="text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* ── FEATURED ── */}
      {!search && featured.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between px-5 mb-3">
            <h2 className="font-black text-gray-900 text-sm">Les incontournables</h2>
          </div>
          <div className="flex gap-3 px-5 overflow-x-auto pb-1 scrollbar-hide">
            {featured.map((item, i) => (
              <motion.button key={item.id}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }} whileTap={{ scale: 0.96 }}
                onClick={() => setSelectedItem(item)}
                className="flex-shrink-0 w-44 h-52 rounded-3xl overflow-hidden relative text-left"
                style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}>
                {item.image_url
                  ? <img src={item.image_url} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
                  : <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: p + '20' }}><UtensilsCrossed size={56} style={{ color: p + '80' }} /></div>
                }
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)' }} />
                <div className="absolute top-3 right-3 w-8 h-8 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
                  <Heart size={13} fill={liked.includes(item.id) ? '#ef4444' : 'none'} color="#fff" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white font-black text-sm leading-tight mb-1.5 line-clamp-1">{item.name}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-white font-black text-sm">{formatPrice(item.price, restaurant.currency)}</span>
                    <div onClick={(e: React.MouseEvent) => { e.stopPropagation(); addToCart(item) }}
                      className="w-7 h-7 rounded-xl flex items-center justify-center text-white"
                      style={{ backgroundColor: p }}>
                      <Plus size={13} strokeWidth={3} />
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* ── CATÉGORIES ── */}
      {!search && (
        <div className="mt-5">
          <div className="flex gap-2.5 px-5 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map(cat => (
              <motion.button key={cat.id} whileTap={{ scale: 0.94 }}
                onClick={() => setActiveCategory(cat.id)}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all"
                style={activeCategory === cat.id
                  ? { backgroundColor: p, color: '#fff', boxShadow: `0 4px 15px ${p}50` }
                  : { backgroundColor: '#fff', color: '#666', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <span>{cat.icon || '🍽️'}</span>
                <span>{cat.name}</span>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* ── TITRE ── */}
      <div className="flex items-center justify-between px-5 mt-5 mb-3">
        <h2 className="font-black text-gray-900">
          {search ? `"${search}"` : categories.find(c => c.id === activeCategory)?.name || 'Menu'}
        </h2>
        <span className="text-xs text-gray-400 font-medium bg-white px-3 py-1 rounded-full shadow-sm">
          {activeItems.length} plats
        </span>
      </div>

      {/* ── LISTE PLATS ── */}
      <div className="px-5 space-y-3">
        <AnimatePresence mode="popLayout">
          {activeItems.map((item, i) => (
            <motion.button key={item.id}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.04 }}
              onClick={() => setSelectedItem(item)}
              className="relative w-full rounded-3xl overflow-hidden text-left"
              style={{ height: '180px', boxShadow: '0 6px 24px rgba(0,0,0,0.12)' }}>
              {item.image_url
                ? <img src={item.image_url} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
                : <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: p + '20' }}><UtensilsCrossed size={64} style={{ color: p + '80' }} /></div>
              }
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 45%, transparent 100%)' }} />
              <div className="absolute top-3 left-3 flex gap-1.5">
                {item.is_halal && <span className="text-xs px-2 py-0.5 rounded-full font-bold text-white" style={{ backgroundColor: '#10B981CC' }}>Halal</span>}
                {item.is_spicy && <span className="text-xs px-2 py-0.5 rounded-full font-bold text-white" style={{ backgroundColor: '#EF4444CC' }}>Épicé</span>}
                {item.is_vegetarian && <span className="text-xs px-2 py-0.5 rounded-full font-bold text-white" style={{ backgroundColor: '#22C55ECC' }}>Végé</span>}
              </div>
              <div onClick={(e: React.MouseEvent) => { e.stopPropagation(); setLiked(l => l.includes(item.id) ? l.filter(x => x !== item.id) : [...l, item.id]) }}
                className="absolute top-3 right-3 w-8 h-8 rounded-2xl flex items-center justify-center cursor-pointer"
                style={{ backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)' }}>
                <Heart size={14} fill={liked.includes(item.id) ? '#ef4444' : 'none'} color="#fff" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 px-4 py-3">
                <div className="flex items-end justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-base leading-tight truncate">{item.name}</p>
                    {item.description && (
                      <p className="text-white/60 text-xs mt-0.5 line-clamp-1">{item.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-white font-black text-base">{formatPrice(item.price, restaurant.currency)}</span>
                    <AnimatePresence mode="wait">
                      {cartQty(item.id) === 0 ? (
                        <motion.div key="add"
                          initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}
                          whileTap={{ scale: 0.8 }}
                          onClick={(e: React.MouseEvent) => { e.stopPropagation(); if (item.is_available) addToCart(item) }}
                          className="w-9 h-9 rounded-2xl flex items-center justify-center text-white cursor-pointer"
                          style={{ backgroundColor: p, boxShadow: `0 4px 15px ${p}80` }}>
                          <Plus size={18} strokeWidth={3} />
                        </motion.div>
                      ) : (
                        <motion.div key="counter"
                          initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-2xl"
                          style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
                          <div onClick={(e: React.MouseEvent) => { e.stopPropagation(); updateQuantity(item.id, cartQty(item.id) - 1) }}
                            className="w-6 h-6 rounded-lg flex items-center justify-center bg-white/20 cursor-pointer">
                            <Minus size={11} color="#fff" strokeWidth={3} />
                          </div>
                          <span className="font-black text-sm w-5 text-center text-white">{cartQty(item.id)}</span>
                          <div onClick={(e: React.MouseEvent) => { e.stopPropagation(); addToCart(item) }}
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-white cursor-pointer"
                            style={{ backgroundColor: p }}>
                            <Plus size={11} strokeWidth={3} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
        {activeItems.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 font-medium">Aucun plat trouvé</p>
          </div>
        )}
      </div>

      {/* ── PANIER FLOTTANT ── */}
      <AnimatePresence>
        {cart.item_count > 0 && !showCart && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-20 left-4 right-4 max-w-md mx-auto z-40">
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowCart(true)}
              className="w-full py-4 rounded-3xl text-white font-black flex items-center justify-between px-5 shadow-2xl"
              style={{ backgroundColor: p, boxShadow: `0 10px 40px ${p}60` }}>
              <div className="bg-white/20 rounded-xl w-8 h-8 flex items-center justify-center font-black text-sm">
                {cart.item_count}
              </div>
              <span className="text-base">Voir mon panier</span>
              <span className="font-black">{formatPrice(cart.total, restaurant.currency)}</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL DÉTAIL PLAT ── */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end" onClick={() => setSelectedItem(null)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="relative bg-white w-full max-w-md mx-auto rounded-t-[2.5rem] overflow-hidden"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <div className="relative">
                {selectedItem.image_url
                  ? <img src={selectedItem.image_url} alt={selectedItem.name} className="w-full h-64 object-cover" />
                  : <div className="w-full h-52 flex items-center justify-center" style={{ backgroundColor: p + '15' }}><UtensilsCrossed size={64} style={{ color: p + '60' }} /></div>
                }
                <button onClick={() => setSelectedItem(null)}
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
                  <X size={16} className="text-white" />
                </button>
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h2 className="text-2xl font-black text-gray-900 flex-1 leading-tight">{selectedItem.name}</h2>
                  <span className="text-2xl font-black ml-3 flex-shrink-0" style={{ color: p }}>{formatPrice(selectedItem.price, restaurant.currency)}</span>
                </div>
                {selectedItem.description && (
                  <p className="text-gray-500 text-sm leading-relaxed mb-4">{selectedItem.description}</p>
                )}
                <motion.button whileTap={{ scale: 0.97 }}
                  onClick={() => { addToCart(selectedItem); setSelectedItem(null) }}
                  className="w-full py-4 rounded-2xl text-white font-black text-base"
                  style={{ backgroundColor: p, boxShadow: `0 8px 25px ${p}50` }}>
                  Ajouter au panier — {formatPrice(selectedItem.price, restaurant.currency)}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL CONFIRMATION POST-COMMANDE ── */}
      <AnimatePresence>
        {orderPlaced && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end"
            style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="relative bg-white w-full max-w-md mx-auto rounded-t-[2.5rem] pb-8 overflow-y-auto"
              style={{ maxHeight: '85vh' }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}>

              <div className="flex items-center justify-between px-5 pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-green-100 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17L4 12"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-black text-gray-900">Commande envoyée !</p>
                    <p className="text-xs text-gray-400 mt-0.5">Le chef prépare votre plat</p>
                  </div>
                </div>
                <button onClick={() => setOrderPlaced(false)}
                  className="w-8 h-8 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <X size={16} className="text-gray-500" />
                </button>
              </div>

              <div className="h-px bg-gray-100 mx-5 mb-4" />

              <div className="px-5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">En attendant votre plat</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { Icon: MessageCircle, title: 'Social', desc: 'Chattez avec les autres clients', href: `/${restaurant.slug}/social`, color: p },
                    { Icon: Gamepad2, title: 'Mini-Jeux', desc: 'Jouez en multijoueur', href: `/${restaurant.slug}/games`, color: restaurant.secondary_color || '#D4A017' },
                    { Icon: Package, title: 'Commandes', desc: 'Suivre ma commande', href: `/${restaurant.slug}/commandes`, color: '#10B981' },
                    { Icon: Bell, title: 'Alertes', desc: 'Mes notifications', href: `/${restaurant.slug}/notifications`, color: '#8B5CF6' },
                  ].map(f => (
                    <button key={f.title}
                      onClick={() => {
                        setOrderPlaced(false)
                        if (!sessionValid) {
                          setPendingHref(f.href)
                          setShowOnboarding(true)
                        } else {
                          window.location.href = f.href
                        }
                      }}
                      className="flex flex-col p-4 rounded-3xl bg-white text-left"
                      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1.5px solid ${f.color}20` }}>
                      <f.Icon size={24} className="mb-2" style={{ color: f.color }} />
                      <p className="font-black text-gray-900 text-sm mb-0.5">{f.title}</p>
                      <p className="text-xs text-gray-400">{f.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL PANIER ── */}
      <AnimatePresence>
        {showCart && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end pb-14">
            <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCart(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="relative bg-white w-full max-w-md mx-auto rounded-t-[2.5rem] flex flex-col"
              style={{ maxHeight: 'calc(85vh - 56px)' }}>

              <div className="px-5 pt-5 pb-4 flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-black text-xl text-gray-900">Mon panier</h2>
                    <p className="text-xs text-gray-400 mt-0.5">{cart.item_count} article{cart.item_count > 1 ? 's' : ''}</p>
                  </div>
                  <button onClick={() => setShowCart(false)} className="w-9 h-9 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <X size={16} className="text-gray-600" />
                  </button>
                </div>
                <motion.button
                  whileTap={{ scale: ordering ? 1 : 0.96 }}
                  onClick={placeOrder}
                  disabled={ordering}
                  className="w-full py-4 rounded-2xl text-white font-black text-base flex items-center justify-between px-5 disabled:opacity-80 transition-all"
                  style={{ backgroundColor: ordering ? '#10B981' : p, boxShadow: `0 4px 20px ${p}50` }}>
                  {ordering ? (
                    <>
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white" />
                      <span>Envoi en cours...</span>
                      <span className="opacity-0">·</span>
                    </>
                  ) : (
                    <>
                      <span>Confirmer la commande</span>
                      <span className="font-black">{formatPrice(cart.total, restaurant.currency)}</span>
                    </>
                  )}
                </motion.button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 space-y-3 pb-4">
                {cart.items.map(ci => (
                  <div key={ci.menu_item.id} className="rounded-2xl bg-gray-50 overflow-hidden">
                    <div className="flex items-center gap-3 p-3">
                      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                        {ci.menu_item.image_url
                          ? <img src={ci.menu_item.image_url} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center bg-gray-200"><UtensilsCrossed size={20} className="text-gray-400" /></div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-gray-900 truncate">{ci.menu_item.name}</p>
                        <p className="text-xs font-black mt-0.5" style={{ color: p }}>{formatPrice(ci.subtotal, restaurant.currency)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <motion.button whileTap={{ scale: 0.8 }} onClick={() => updateQuantity(ci.menu_item.id, ci.quantity - 1)}
                          className="w-7 h-7 rounded-xl bg-white flex items-center justify-center shadow-sm border border-gray-100">
                          <Minus size={12} style={{ color: p }} strokeWidth={3} />
                        </motion.button>
                        <span className="font-black text-sm w-4 text-center">{ci.quantity}</span>
                        <motion.button whileTap={{ scale: 0.8 }} onClick={() => addToCart(ci.menu_item)}
                          className="w-7 h-7 rounded-xl flex items-center justify-center text-white shadow-sm"
                          style={{ backgroundColor: p }}>
                          <Plus size={12} strokeWidth={3} />
                        </motion.button>
                      </div>
                    </div>
                    {/* NOTE INPUT — fontSize 16px obligatoire anti-zoom iOS */}
                    <div className="px-3 pb-3">
                      <input
                        type="text"
                        placeholder="Note pour ce plat (ex: sans sel, bien cuit...)"
                        value={notes[ci.menu_item.id] || ''}
                        onChange={e => setNotes(prev => ({ ...prev, [ci.menu_item.id]: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl bg-white border border-gray-200 outline-none text-gray-800 placeholder-gray-400"
                        style={{ fontSize: '16px' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
