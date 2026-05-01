'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import TwemojiAvatar from './TwemojiAvatar'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ShoppingBag, ClipboardList, Plus, Minus, X, Heart, UtensilsCrossed, MessageCircle, Gamepad2, Bell, Package, Star, Flame, Leaf, ShieldCheck } from 'lucide-react'
import { useSessionStore } from '@/lib/store'
import { supabase } from '@/lib/supabase/client'
import { formatPrice, generateDeviceFingerprint } from '@/lib/utils'
import type { MenuCategory, MenuItem, Restaurant, RestaurantTable } from '@/types'
import OnboardingPage from './OnboardingPage'

export default function MenuPage({ restaurant, categories }: { restaurant: Restaurant; categories: MenuCategory[] }) {
  const router = useRouter()
  const { cart, addToCart, updateQuantity, session, setSession, clearCart } = useSessionStore()

  const [activeCategory, setActiveCategory] = useState(categories[0]?.id)
  const [search, setSearch] = useState('')
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [showCart, setShowCart] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [liked, setLiked] = useState<string[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [ordering, setOrdering] = useState(false)
  const [activeOrdersCount, setActiveOrdersCount] = useState(0)
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  // ── Onboarding différé : s'ouvre 3s après l'envoi pour les invités ──
  const [showOnboarding, setShowOnboarding] = useState(false)
  // Phase de transition vers l'onboarding (le panier se ferme en douceur)
  const [transitioning, setTransitioning] = useState(false)
  // Drapeau : la session courante a été créée comme "invité" (pseudo générique).
  // Active l'onboarding non bloquant pour permettre la personnalisation après coup.
  const [isGuestUpgrade, setIsGuestUpgrade] = useState(false)
  // Timer pour l'auto-redirect vers l'onboarding (annulable)
  const guestRedirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelGuestRedirect = useCallback(() => {
    if (guestRedirectTimer.current) {
      clearTimeout(guestRedirectTimer.current)
      guestRedirectTimer.current = null
    }
  }, [])
  useEffect(() => () => cancelGuestRedirect(), [cancelGuestRedirect])

  const p = restaurant.primary_color

  const [tableId, setTableId] = useState('')
  const [tableDisplayName, setTableDisplayName] = useState('')
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('')
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setTableId(params.get('table') || '')
    setTableDisplayName(params.get('tableName') || '')
    setLogoPreviewUrl(params.get('logoPreview') || '')
  }, [])

  useEffect(() => {
    if (!session) return
    supabase
      .from('orders')
      .select('id', { count: 'exact' })
      .eq('session_id', session.id)
      .in('status', ['pending', 'confirmed', 'preparing', 'ready'])
      .then(({ count }) => setActiveOrdersCount(count || 0))
  }, [session])

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tableId)
  const sessionValid = Boolean(session && session.restaurant_id === restaurant.id && session.is_present)
  const tableObj: RestaurantTable = {
    id: isUuid ? tableId : '',
    table_number: tableDisplayName || tableId,
    restaurant_id: restaurant.id,
    capacity: 0,
    qr_code: '',
    is_active: true,
    created_at: '',
  }

  const allItems = categories.flatMap(c => c.items || [])
  const featured = allItems.filter(i => i.is_available).slice(0, 5)
  const activeItems = search
    ? allItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : categories.find(c => c.id === activeCategory)?.items?.filter(i => i.is_available) || []
  const cartQty = (id: string) => cart.items.find(i => i.menu_item.id === id)?.quantity || 0
  const isAnonymousSession = (sess: typeof session) => !sess || sess.pseudo === 'Invité' || sess.avatar_icon === 'ghost'
  const activeCategoryName = categories.find(c => c.id === activeCategory)?.name || 'Menu'
  const tableLabel = tableDisplayName || tableId
  const displayLogoUrl = logoPreviewUrl || restaurant.logo_url

  // ── Envoi effectif de la commande ──
  async function sendOrder(sess: typeof session, itemsSnapshot: typeof cart.items, notesSnapshot: Record<string, string>) {
    if (!sess || itemsSnapshot.length === 0) return false
    setOrdering(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sess.id,
          restaurant_id: restaurant.id,
          table_id: sess.table_id || (isUuid ? tableId : null),
          items: itemsSnapshot.map(i => ({
            menu_item_id: i.menu_item.id,
            quantity: i.quantity,
            notes: notesSnapshot[i.menu_item.id] || null,
          })),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const orderId = data?.data?.id
        // Petit délai pour que l'animation de "envoi" se fasse sentir avant le succès
        await new Promise(r => setTimeout(r, 250))
        setNotes({})
        clearCart()
        setShowCart(false)
        // Laisse la cart-modal se fermer en douceur avant d'afficher la popup succès
        setTimeout(() => setOrderPlaced(true), 250)
        if (orderId) {
          setTimeout(async () => {
            await fetch('/api/orders/auto-confirm', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ order_id: orderId }),
            })
          }, 5 * 60 * 1000)
        }
        return true
      }
      return false
    } catch (e) {
      console.error('Order error:', e)
      return false
    } finally {
      setOrdering(false)
    }
  }

  // ── Crée une session "invité" pour permettre l'envoi sans onboarding bloquant ──
  async function ensureGuestSession() {
    if (sessionValid && session) return session
    const fingerprint = generateDeviceFingerprint()
    // Cherche d'abord une session existante pour ce device sur ce resto
    const { data: existing } = await supabase
      .from('client_sessions').select('*')
      .eq('restaurant_id', restaurant.id)
      .eq('device_fingerprint', fingerprint)
      .eq('is_present', true)
      .maybeSingle()
    if (existing) { setSession(existing); return existing }

    const { data } = await supabase.from('client_sessions').insert({
      restaurant_id: restaurant.id,
      ...(isUuid ? { table_id: tableId } : {}),
      pseudo: 'Invité',
      avatar_icon: 'ghost',
      device_fingerprint: fingerprint,
      gender: 'autre',
      profile_type: 'solo',
      is_present: true,
      last_seen_at: new Date().toISOString(),
      left_at: null,
    }).select().single()
    if (data) { setSession(data); return data }
    return null
  }

  // ── Bouton "Confirmer la commande" ──
  async function placeOrder() {
    if (cart.items.length === 0 || ordering || transitioning) return

    const wasGuest = !sessionValid
    setTransitioning(true)
    let useSess = session
    if (wasGuest) {
      useSess = await ensureGuestSession()
      if (!useSess) { setTransitioning(false); return }
    }

    // Petite pause pour laisser le panier se fermer en douceur
    await new Promise(r => setTimeout(r, 180))
    setShowCart(false)
    await new Promise(r => setTimeout(r, 240))
    setTransitioning(false)

    // Envoi de la commande
    const orderSent = await sendOrder(useSess, cart.items, notes)
    if (!orderSent) return

    // Pour les invités : 3s après le succès, ouvrir l'onboarding (non bloquant)
    if (wasGuest && isAnonymousSession(useSess)) {
      setIsGuestUpgrade(true)
      cancelGuestRedirect()
      guestRedirectTimer.current = setTimeout(() => {
        setOrderPlaced(false)
        setTimeout(() => setShowOnboarding(true), 240)
      }, 3000)
    }
  }

  // ── Callback OnboardingPage : identification terminée ou skip ──
  function handleOnboardingDone() {
    setShowOnboarding(false)
    setIsGuestUpgrade(false)
    if (pendingHref) {
      window.location.href = pendingHref
      setPendingHref(null)
    }
  }
  function handleOnboardingSkip() {
    setShowOnboarding(false)
    setIsGuestUpgrade(false)
  }

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: '#F8F8F8' }}>

      {/* ── HEADER COMPACT ── */}
      <div className="px-5 pt-5 pb-3 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {displayLogoUrl ? (
              <div className="w-10 h-10 rounded-2xl bg-white border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                <img src={displayLogoUrl} alt="" className="w-full h-full object-contain p-1" />
              </div>
            ) : session ? (
              <TwemojiAvatar avatarId={session.avatar_icon || ''} size={40} className="ring-2 ring-gray-100" />
            ) : (
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white flex-shrink-0"
                style={{ backgroundColor: p }}>
                <UtensilsCrossed size={18} />
              </div>
            )}
            <div className="min-w-0">
              {tableLabel && (
                <p className="text-[11px] font-black uppercase tracking-wide text-gray-400">
                  Table {tableLabel}
                </p>
              )}
              <h1 className="font-black text-gray-950 text-lg leading-tight truncate">{restaurant.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <a href={`/${restaurant.slug}/commandes`}
              className="relative w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center">
              <ClipboardList size={18} className="text-gray-700" />
              {activeOrdersCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full flex items-center justify-center font-black text-white text-[10px]"
                  style={{ backgroundColor: p }}>{activeOrdersCount}</span>
              )}
            </a>
            <motion.button whileTap={{ scale: 0.92 }} onClick={() => setShowCart(true)}
              className="relative w-10 h-10 rounded-2xl flex items-center justify-center text-white"
              style={{ backgroundColor: p }}>
              <ShoppingBag size={18} />
              <AnimatePresence>
                {cart.item_count > 0 && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-gray-950 text-[10px] flex items-center justify-center font-black text-white">
                    {cart.item_count}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </div>

      {/* ── RECHERCHE + CATÉGORIES STICKY ── */}
      <div className="sticky top-0 z-30 bg-[#F8F8F8]/95 backdrop-blur-xl border-b border-gray-100 pt-3 pb-3">
        <div className="px-5">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Rechercher un plat"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-11 py-3.5 rounded-2xl bg-white border border-gray-100 font-bold outline-none text-gray-900 placeholder:text-gray-400 shadow-sm"
              style={{ fontSize: '16px' }} />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-xl bg-gray-100 flex items-center justify-center">
                <X size={13} className="text-gray-500" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 flex gap-2 px-5 overflow-x-auto scrollbar-hide">
          {search ? (
            <button onClick={() => setSearch('')}
              className="flex-shrink-0 px-4 py-2.5 rounded-2xl bg-white text-sm font-black text-gray-700 border border-gray-100">
              Voir tout le menu
            </button>
          ) : categories.map(cat => (
            <motion.button key={cat.id} whileTap={{ scale: 0.94 }}
              onClick={() => setActiveCategory(cat.id)}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-black transition-all"
              style={activeCategory === cat.id
                ? { backgroundColor: p, color: '#fff', boxShadow: `0 6px 18px ${p}35` }
                : { backgroundColor: '#fff', color: '#4B5563', border: '1px solid #F0F0F0' }}>
              <span>{cat.icon || '🍽️'}</span>
              <span>{cat.name}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── LES PLUS COMMANDÉS ── */}
      {!search && featured.length > 0 && (
        <section className="mt-5">
          <div className="flex items-center justify-between px-5 mb-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wide text-gray-400">Raccourci</p>
              <h2 className="font-black text-gray-950 text-lg">Les plus commandés</h2>
            </div>
            <Star size={18} style={{ color: p }} fill={p} />
          </div>
          <div className="flex gap-3 px-5 overflow-x-auto pb-2 scrollbar-hide">
            {featured.map((item, i) => (
              <motion.div key={item.id}
                role="button"
                tabIndex={0}
                initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }} whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedItem(item)}
                onKeyDown={(e) => { if (e.key === 'Enter') setSelectedItem(item) }}
                className="flex-shrink-0 w-40 rounded-3xl bg-white overflow-hidden border border-gray-100 shadow-sm text-left">
                <div className="relative h-24">
                  {item.image_url
                    ? <img src={item.image_url} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
                    : <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: p + '12' }}><UtensilsCrossed size={32} style={{ color: p }} /></div>
                  }
                  <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-white/90 flex items-center gap-1 text-[10px] font-black text-gray-800">
                    <Star size={10} fill={p} style={{ color: p }} />
                    Populaire
                  </div>
                </div>
                <div className="p-3">
                  <p className="font-black text-gray-950 text-sm leading-tight line-clamp-2 min-h-9">{item.name}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="font-black text-sm whitespace-nowrap" style={{ color: p }}>{formatPrice(item.price, restaurant.currency)}</span>
                    {cartQty(item.id) === 0 ? (
                      <button onClick={(e) => { e.stopPropagation(); addToCart(item) }}
                        aria-label={`Ajouter ${item.name}`}
                        className="w-8 h-8 rounded-2xl flex items-center justify-center text-white flex-shrink-0"
                        style={{ backgroundColor: p }}>
                        <Plus size={15} strokeWidth={3} />
                      </button>
                    ) : (
                      <span className="min-w-8 h-8 px-2 rounded-2xl bg-gray-100 flex items-center justify-center font-black text-xs text-gray-800">
                        {cartQty(item.id)}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── LISTE PLATS ── */}
      <section className="px-5 mt-5">
        <div className="flex items-end justify-between gap-4 mb-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wide text-gray-400">
              {search ? 'Recherche' : 'Catégorie'}
            </p>
            <h2 className="font-black text-gray-950 text-xl leading-tight truncate">
              {search ? `"${search}"` : activeCategoryName}
            </h2>
          </div>
          <span className="text-xs text-gray-500 font-black bg-white px-3 py-1.5 rounded-full border border-gray-100 flex-shrink-0">
            {activeItems.length} plat{activeItems.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {activeItems.map((item, i) => (
              <motion.div key={item.id}
                role="button"
                tabIndex={0}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }} transition={{ delay: i * 0.025 }}
                onClick={() => setSelectedItem(item)}
                onKeyDown={(e) => { if (e.key === 'Enter') setSelectedItem(item) }}
                className="w-full rounded-3xl bg-white border border-gray-100 p-2.5 flex gap-3 text-left shadow-sm active:scale-[0.99] transition-transform">
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100">
                  {item.image_url
                    ? <img src={item.image_url} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
                    : <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: p + '12' }}><UtensilsCrossed size={30} style={{ color: p }} /></div>
                  }
                  {i < 3 && !search && (
                    <span className="absolute left-2 top-2 w-6 h-6 rounded-xl bg-white/95 flex items-center justify-center">
                      <Star size={12} fill={p} style={{ color: p }} />
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0 py-1 pr-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-black text-gray-950 text-base leading-tight line-clamp-2">{item.name}</p>
                      <p className="text-xs text-gray-500 mt-1 leading-snug line-clamp-2">
                        {item.description || 'Préparé à la demande'}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setLiked(l => l.includes(item.id) ? l.filter(x => x !== item.id) : [...l, item.id]) }}
                      aria-label={liked.includes(item.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      className="w-8 h-8 rounded-2xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                      <Heart size={14} fill={liked.includes(item.id) ? '#ef4444' : 'none'} color={liked.includes(item.id) ? '#ef4444' : '#9CA3AF'} />
                    </button>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.is_halal && <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-black bg-emerald-50 text-emerald-700"><ShieldCheck size={10} /> Halal</span>}
                    {item.is_spicy && <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-black bg-red-50 text-red-600"><Flame size={10} /> Épicé</span>}
                    {item.is_vegetarian && <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-black bg-green-50 text-green-700"><Leaf size={10} /> Végé</span>}
                  </div>

                  <div className="mt-auto pt-3 flex items-center justify-between gap-3">
                    <span className="font-black text-base whitespace-nowrap" style={{ color: p }}>{formatPrice(item.price, restaurant.currency)}</span>
                    <AnimatePresence mode="wait">
                      {cartQty(item.id) === 0 ? (
                        <motion.button key="add"
                          initial={{ scale: 0.85 }} animate={{ scale: 1 }} exit={{ scale: 0.85 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => { e.stopPropagation(); addToCart(item) }}
                          aria-label={`Ajouter ${item.name}`}
                          className="h-9 px-3 rounded-2xl flex items-center gap-1.5 text-white font-black text-sm flex-shrink-0"
                          style={{ backgroundColor: p, boxShadow: `0 6px 16px ${p}35` }}>
                          <Plus size={15} strokeWidth={3} />
                          <span>Ajouter</span>
                        </motion.button>
                      ) : (
                        <motion.div key="counter"
                          initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                          className="h-9 flex items-center gap-1 rounded-2xl bg-gray-100 px-1 flex-shrink-0">
                          <button onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, cartQty(item.id) - 1) }}
                            aria-label={`Retirer ${item.name}`}
                            className="w-7 h-7 rounded-xl bg-white flex items-center justify-center">
                            <Minus size={12} style={{ color: p }} strokeWidth={3} />
                          </button>
                          <span className="font-black text-sm w-6 text-center text-gray-900">{cartQty(item.id)}</span>
                          <button onClick={(e) => { e.stopPropagation(); addToCart(item) }}
                            aria-label={`Ajouter ${item.name}`}
                            className="w-7 h-7 rounded-xl flex items-center justify-center text-white"
                            style={{ backgroundColor: p }}>
                            <Plus size={12} strokeWidth={3} />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {activeItems.length === 0 && (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-100">
              <div className="w-14 h-14 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Search size={22} className="text-gray-400" />
              </div>
              <p className="text-gray-900 font-black">Aucun plat trouvé</p>
              <p className="text-gray-400 text-sm mt-1">Essayez un autre mot ou revenez au menu complet.</p>
              {search && (
                <button onClick={() => setSearch('')}
                  className="mt-4 px-4 py-2.5 rounded-2xl text-white font-black text-sm"
                  style={{ backgroundColor: p }}>
                  Voir tout le menu
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── PANIER FLOTTANT ── */}
      <AnimatePresence>
        {cart.item_count > 0 && !showCart && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-40">
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowCart(true)}
              className="w-full min-h-16 rounded-3xl text-white font-black flex items-center justify-between gap-3 px-4 shadow-2xl"
              style={{ backgroundColor: p, boxShadow: `0 12px 36px ${p}45` }}>
              <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <ShoppingBag size={20} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm leading-tight">Voir le panier</p>
                <p className="text-xs text-white/75 leading-tight">{cart.item_count} article{cart.item_count > 1 ? 's' : ''}</p>
              </div>
              <span className="text-sm whitespace-nowrap">{formatPrice(cart.total, restaurant.currency)}</span>
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

      {/* ── POPUP POST-COMMANDE : jeux / loisirs / retour menu ── */}
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

              <div className="px-5 pt-6 pb-4">
                <div className="flex flex-col items-center text-center mb-2">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 14, stiffness: 280 }}
                    className="w-16 h-16 rounded-3xl bg-green-100 flex items-center justify-center mb-3">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17L4 12" />
                    </svg>
                  </motion.div>
                  <p className="font-black text-gray-900 text-xl">Commande envoyée !</p>
                  <p className="text-sm text-gray-500 mt-1">Le chef prépare votre plat</p>
                  {isGuestUpgrade && (
                    <p className="text-xs text-gray-400 mt-2">Personnalisation dans un instant…</p>
                  )}
                </div>
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
                    <motion.button key={f.title}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        cancelGuestRedirect()
                        // Ferme d'abord la popup avec son anim, puis navigue en douceur
                        setOrderPlaced(false)
                        setTimeout(() => router.push(f.href), 220)
                      }}
                      className="flex flex-col p-4 rounded-3xl bg-white text-left active:bg-gray-50 transition-colors"
                      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1.5px solid ${f.color}20` }}>
                      <f.Icon size={24} className="mb-2" style={{ color: f.color }} />
                      <p className="font-black text-gray-900 text-sm mb-0.5">{f.title}</p>
                      <p className="text-xs text-gray-400">{f.desc}</p>
                    </motion.button>
                  ))}
                </div>

                {/* Retour au menu → annule l'auto-redirect et ferme la popup */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    cancelGuestRedirect()
                    setIsGuestUpgrade(false)
                    setOrderPlaced(false)
                  }}
                  className="w-full py-3 rounded-2xl text-center font-bold text-sm text-gray-700 bg-white border-2 border-gray-200 hover:bg-gray-50 transition-colors">
                  Retourner au menu
                </motion.button>
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
                  whileTap={{ scale: (ordering || transitioning) ? 1 : 0.96 }}
                  onClick={placeOrder}
                  disabled={ordering || transitioning}
                  className="w-full py-4 rounded-2xl text-white font-black text-base flex items-center justify-between px-5 disabled:opacity-90 transition-all"
                  style={{ backgroundColor: ordering ? '#10B981' : p, boxShadow: `0 4px 20px ${p}50` }}>
                  {ordering ? (
                    <>
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white" />
                      <span>Envoi en cours...</span>
                      <span className="opacity-0">·</span>
                    </>
                  ) : transitioning ? (
                    <>
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white" />
                      <span>Préparation...</span>
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

      {/* ── ONBOARDING OVERLAY (transitions douces, pas de hard-switch) ── */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            key="onboarding-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[60] overflow-y-auto"
            style={{ backgroundColor: '#0D0D0D' }}>
            <OnboardingPage
              restaurant={restaurant}
              table={tableObj}
              onDone={handleOnboardingDone}
              onSkip={handleOnboardingSkip}
              isGuestUpgrade={isGuestUpgrade}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── OVERLAY ENVOI DE COMMANDE (post-onboarding, fluide, sans flash) ── */}
      <AnimatePresence>
        {ordering && !showCart && !showOnboarding && (
          <motion.div
            key="sending-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[70] flex items-center justify-center"
            style={{ backgroundColor: 'rgba(13,13,13,0.55)', backdropFilter: 'blur(6px)' }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white rounded-3xl px-6 py-5 flex items-center gap-3 shadow-2xl">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                className="w-6 h-6 rounded-full border-[3px] border-gray-200"
                style={{ borderTopColor: p }} />
              <div>
                <p className="font-black text-gray-900 text-sm">Envoi en cours...</p>
                <p className="text-xs text-gray-400 mt-0.5">Le chef reçoit votre commande</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
