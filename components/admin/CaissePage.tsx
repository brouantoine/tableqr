'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'
import { formatPrice, formatTimeAgo } from '@/lib/utils'
import type { Order, Restaurant } from '@/types'
import { TrendingUp, ShoppingBag, Clock, CheckCircle, ChefHat, X, CreditCard, Plus, Receipt, Bell, Calendar, ChevronDown, History, FileText, AlertTriangle } from 'lucide-react'
import { useNotificationSound } from '@/hooks/useNotificationSound'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'

interface ManualSale {
  id: string; label: string; quantity: number; unit_price: number
  total: number; payment_method: string; note?: string; created_at: string
}

const PAYMENT_METHODS = [
  { key: 'orange_money', label: 'Orange Money', color: '#FF6600',
    logo: 'https://imgs.search.brave.com/yhu5dw2JdSz6tV7atsWvA1ov-bK5qbZ1eNt3bKxJPYY/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9sb2dv/cy1tYXJxdWVzLmNv/bS93cC1jb250ZW50/L3VwbG9hZHMvMjAy/MS8wNy9PcmFuZ2Ut/TW9uZXktbG9nby01/MDB4MzM2LnBuZw' },
  { key: 'wave', label: 'Wave', color: '#0099FF',
    logo: 'https://imgs.search.brave.com/FqMsgpCwqxweNET_MFtHBy5jIQu8tClIcmiomn8bzlw/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93d3cu/d2F2ZS5jb20vaW1n/L3Rlcm1zL2xvZ28u/cG5n' },
  { key: 'card', label: 'Carte', color: '#3B82F6',
    logo: 'https://imgs.search.brave.com/v18z25-TSYNdCz5re9-ooDLYfztprUyOuKI0K3OOJT8/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pbWcu/ZnJlZXBpay5jb20v/cGhvdG9zLXByZW1p/dW0vbW9kZWxlLWlt/YWdlLWNhcnRlLWJh/bmNhaXJlLXJlbmR1/LWxpZ25lLWJsZXVl/LW5vaXJlXzY4MDQz/Ni0xMDUuanBnP3Nl/bXQ9YWlzX2h5YnJp/ZCZ3PTc0MA' },
  { key: 'cash', label: 'Espèces', color: '#10B981',
    logo: 'https://imgs.search.brave.com/6JnzZ6FEe4eiU25it_GV_xQT7TPJcovpowm78LAvXio/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pbWcu/aWNvbnM4LmNvbS9z/dGlja2Vycy8xMjAw/L2Nhc2guanBn' },
]

const STATUS_FLOW: Record<string, { next: string; label: string; color: string }> = {
  pending:   { next: 'preparing', label: '✓ Reçu',           color: '#F59E0B' },
  confirmed: { next: 'preparing', label: '✓ Reçu',           color: '#F59E0B' },
  preparing: { next: 'served',    label: '🔔 Prêt à servir', color: '#10B981' },
}

const STATUS_DISPLAY: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
  pending:   { label: 'En attente',     color: '#F59E0B', bg: '#FFFBEB', Icon: Clock },
  confirmed: { label: 'Reçue',          color: '#F59E0B', bg: '#FFFBEB', Icon: Clock },
  preparing: { label: 'En préparation', color: '#3B82F6', bg: '#EFF6FF', Icon: ChefHat },
  ready:     { label: 'Prête !',        color: '#10B981', bg: '#ECFDF5', Icon: Bell },
  served:    { label: 'Servie',         color: '#6B7280', bg: '#F9FAFB', Icon: CheckCircle },
  cancelled: { label: 'Annulée',        color: '#EF4444', bg: '#FEF2F2', Icon: X },
}

function getDateLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui"
  if (d.toDateString() === yesterday.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function CaissePage({ restaurant, initialOrders }: { restaurant: Restaurant; initialOrders: Order[] }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [manualSales, setManualSales] = useState<ManualSale[]>([])
  const [allManualSales, setAllManualSales] = useState<ManualSale[]>([])
  const [tab, setTab] = useState<'live' | 'caisse' | 'ventes' | 'recap' | 'historique'>('live')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [newOrderId, setNewOrderId] = useState<string | null>(null)
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualForm, setManualForm] = useState({ label: '', quantity: 1, unit_price: 0, payment_method: 'cash', note: '' })
  const [histFilter, setHistFilter] = useState<'today' | 'yesterday' | 'week'>('today')
  const [expandedHistOrder, setExpandedHistOrder] = useState<string | null>(null)
  const p = restaurant.primary_color
  const { playSound } = useNotificationSound()
  const playSoundRef = useRef(playSound)
  useEffect(() => { playSoundRef.current = playSound }, [playSound])

  // Refresh actif — retour d'onglet, focus, réseau, interval 15s
  useRealtimeRefresh(async () => {
    await loadManualSales()
    await loadAllManualSales()
  }, 15000)

  useEffect(() => {
    loadManualSales()
    loadAllManualSales()
    const channel = supabase.channel(`orders-${restaurant.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurant.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch complet avec table joinée
            supabase.from('orders')
              .select('*, items:order_items(*), table:restaurant_tables(table_number)')
              .eq('id', payload.new.id)
              .single()
              .then(({ data }) => {
                if (data) {
                  setOrders(prev => [data as Order, ...prev])
                  setNewOrderId(data.id)
                  setTimeout(() => setNewOrderId(null), 4000)
                  playSoundRef.current('order') // 🔔 Son nouvelle commande
                }
              })
          } else if (payload.eventType === 'UPDATE') {
            setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o))
            if (selectedOrder?.id === payload.new.id) setSelectedOrder(prev => prev ? { ...prev, ...payload.new } : null)
            if (payload.new.status === 'served') playSoundRef.current('ready')
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [restaurant.id])

  async function loadManualSales() {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('manual_sales').select('*')
      .eq('restaurant_id', restaurant.id).gte('created_at', today).order('created_at', { ascending: false })
    setManualSales(data || [])
  }

  async function loadAllManualSales() {
    const { data } = await supabase.from('manual_sales').select('*')
      .eq('restaurant_id', restaurant.id).order('created_at', { ascending: false }).limit(200)
    setAllManualSales(data || [])
  }

  async function updateStatus(orderId: string, status: string) {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: status as Order['status'] } : o))
  }

  async function markPaid(orderId: string, method: string) {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_status: 'paid', payment_method: method })
    })
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_status: 'paid', payment_method: method as any } : o))
  }

  async function addManualSale() {
    if (!manualForm.label || manualForm.unit_price <= 0) return
    const total = manualForm.quantity * manualForm.unit_price
    const { data } = await supabase.from('manual_sales').insert({
      restaurant_id: restaurant.id, label: manualForm.label, quantity: manualForm.quantity,
      unit_price: manualForm.unit_price, total, payment_method: manualForm.payment_method, note: manualForm.note,
    }).select().single()
    if (data) {
      setManualSales(prev => [data as ManualSale, ...prev])
      setAllManualSales(prev => [data as ManualSale, ...prev])
    }
    setManualForm({ label: '', quantity: 1, unit_price: 0, payment_method: 'cash', note: '' })
    setShowManualForm(false)
  }

  async function deleteManualSale(id: string) {
    await supabase.from('manual_sales').delete().eq('id', id)
    setManualSales(prev => prev.filter(s => s.id !== id))
    setAllManualSales(prev => prev.filter(s => s.id !== id))
  }

  // ── CALCULS AUJOURD'HUI ──
  const today = new Date().toDateString()
  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === today)
  const paidOrders = todayOrders.filter(o => o.payment_status === 'paid')
  const orderRevenue = paidOrders.reduce((s, o) => s + (Number(o.total) || 0), 0)
  const manualRevenue = manualSales.reduce((s, m) => s + (Number(m.total) || 0), 0)
  const totalRevenue = orderRevenue + manualRevenue
  const liveOrders = orders.filter(o => !['served', 'cancelled'].includes(o.status))
  const pendingPayment = orders.filter(o => o.status === 'served' && o.payment_status === 'unpaid')

  // ── byMethod — tous les moyens de paiement ──
  const byMethod: Record<string, number> = {}
  paidOrders.forEach(o => {
    const key = o.payment_method || 'cash'
    byMethod[key] = (byMethod[key] || 0) + (Number(o.total) || 0)
  })
  manualSales.forEach(m => {
    const key = m.payment_method || 'cash'
    byMethod[key] = (byMethod[key] || 0) + (Number(m.total) || 0)
  })

  // ── HISTORIQUE ──
  const now = new Date()
  const getFilteredOrders = () => {
    return orders.filter(o => {
      if (!['served', 'cancelled'].includes(o.status)) return false
      const d = new Date(o.created_at)
      if (histFilter === 'today') return d.toDateString() === now.toDateString()
      if (histFilter === 'yesterday') {
        const y = new Date(now); y.setDate(now.getDate() - 1)
        return d.toDateString() === y.toDateString()
      }
      if (histFilter === 'week') {
        const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)
        return d >= weekAgo
      }
      return true
    })
  }

  const histOrders = getFilteredOrders()
  const histTotal = histOrders.filter(o => o.payment_status === 'paid').reduce((s, o) => s + (Number(o.total) || 0), 0)

  // Grouper par date pour l'historique
  const histByDate: Record<string, Order[]> = {}
  histOrders.forEach(o => {
    const key = new Date(o.created_at).toDateString()
    if (!histByDate[key]) histByDate[key] = []
    histByDate[key].push(o)
  })

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Status bar */}
      <div className="px-4 py-2.5 bg-white border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-xs font-bold text-green-600">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />En ligne
          </div>
        </div>
        <p className="text-xs font-black text-gray-900">{formatPrice(totalRevenue, restaurant.currency)} <span className="text-gray-400 font-normal">aujourd&apos;hui</span></p>
      </div>

      {/* Stats */}
      <div className="px-4 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'CA total', value: formatPrice(totalRevenue, restaurant.currency), Icon: TrendingUp, color: '#10B981', bg: '#ECFDF5' },
          { label: 'Via commandes', value: formatPrice(orderRevenue, restaurant.currency), Icon: ShoppingBag, color: p, bg: p + '15' },
          { label: 'Ventes directes', value: formatPrice(manualRevenue, restaurant.currency), Icon: Receipt, color: '#8B5CF6', bg: '#F5F3FF' },
          { label: 'À encaisser', value: String(pendingPayment.length), Icon: CreditCard, color: '#F59E0B', bg: '#FFFBEB' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: s.bg }}>
              <s.Icon size={17} style={{ color: s.color }} />
            </div>
            <p className="text-xl font-black text-gray-900 leading-none mb-1">{s.value}</p>
            <p className="text-xs text-gray-400">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4 overflow-x-auto">
        <div className="flex bg-gray-100 rounded-2xl p-1 gap-1 min-w-max">
          {[
            { key: 'live', label: 'Live', badge: liveOrders.length },
            { key: 'caisse', label: 'Caisse', badge: pendingPayment.length },
            { key: 'ventes', label: 'Ventes +', badge: 0 },
            { key: 'historique', label: 'Historique', badge: 0 },
            { key: 'recap', label: 'Récap', badge: 0 },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className="flex-shrink-0 relative px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
              style={tab === t.key ? { backgroundColor: '#fff', color: '#111', boxShadow: '0 1px 8px rgba(0,0,0,0.08)' } : { color: '#9CA3AF' }}>
              {t.label}
              {t.badge > 0 && (
                <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full font-black text-white animate-pulse"
                  style={{ backgroundColor: p }}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── LIVE ── */}
      {tab === 'live' && (
        <div className="px-4 pb-24">
          {liveOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center mb-4">
                <ShoppingBag size={28} className="text-gray-300" />
              </div>
              <p className="font-black text-gray-900 text-lg">Aucune commande active</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <AnimatePresence>
                {liveOrders.map((order, i) => {
                  const cfg = STATUS_DISPLAY[order.status] || STATUS_DISPLAY.pending
                  const flow = STATUS_FLOW[order.status]
                  const isNew = order.id === newOrderId
                  return (
                    <motion.div key={order.id}
                      initial={{ opacity: 0, scale: 0.95, y: 16 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.03 }}
                      className={`bg-white rounded-3xl overflow-hidden shadow-sm border ${isNew ? 'border-orange-400 ring-2 ring-orange-200' : 'border-gray-100'}`}>
                      <div className="h-1 w-full" style={{ backgroundColor: cfg.color }} />
                      <div className="px-4 pt-3 pb-2 flex items-center justify-between" style={{ backgroundColor: cfg.bg }}>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ backgroundColor: cfg.color + '25' }}>
                            <cfg.Icon size={14} style={{ color: cfg.color }} />
                          </div>
                          <div>
                            <p className="font-black text-gray-900 text-sm">{order.order_number}</p>
                            <p className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-gray-400">{formatTimeAgo(order.created_at)}</p>
                          <button onClick={() => setSelectedOrder(order)}
                            className="w-6 h-6 rounded-lg bg-white/70 flex items-center justify-center text-gray-500 text-xs font-bold shadow-sm">⋯</button>
                        </div>
                      </div>
                      <div className="px-4 py-2 border-b border-gray-50">
                        <p className="text-xs text-gray-500">Table <span className="font-bold text-gray-900">{(order as any).table?.table_number || '—'}</span></p>
                      </div>
                      <div className="px-4 py-3 space-y-1.5">
                        {(order.items || []).map(item => (
                          <div key={item.id}>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-black text-gray-600">{item.quantity}</span>
                                <span className="text-sm text-gray-700 truncate max-w-[140px]">{item.item_name}</span>
                              </div>
                              <span className="text-xs font-bold text-gray-500">{formatPrice(Number(item.total) || 0, restaurant.currency)}</span>
                            </div>
                            {((item as any).notes || (item as any).note) && (
                              <div className="ml-7 mt-0.5 px-2 py-1 rounded-lg bg-orange-50 flex items-center gap-1">
                                <FileText size={12} className="text-orange-500 flex-shrink-0" />
                                <span className="text-xs text-orange-700 font-medium">{(item as any).notes || (item as any).note}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="px-4 pb-4 flex items-center justify-between border-t border-gray-50 pt-3">
                        <p className="font-black text-lg" style={{ color: p }}>{formatPrice(Number(order.total) || 0, restaurant.currency)}</p>
                        {flow && (
                          <motion.button whileTap={{ scale: 0.93 }}
                            onClick={() => updateStatus(order.id, flow.next)}
                            className="px-4 py-2.5 rounded-xl text-white text-xs font-black shadow-sm"
                            style={{ backgroundColor: flow.color, boxShadow: `0 4px 12px ${flow.color}40` }}>
                            {flow.label}
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* ── CAISSE ── */}
      {tab === 'caisse' && (
        <div className="px-4 pb-24">
          {pendingPayment.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-3xl bg-green-50 flex items-center justify-center mb-4">
                <CheckCircle size={28} className="text-green-500" />
              </div>
              <p className="font-black text-gray-900 text-lg">Tout encaissé !</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pendingPayment.map(order => (
                <motion.div key={order.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
                  <div className="px-5 pt-5 pb-4 border-b border-gray-50 flex justify-between items-start">
                    <div>
                      <p className="font-black text-gray-900">{order.order_number}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Table {(order as any).table?.table_number || '—'} · {formatTimeAgo(order.created_at)}</p>
                    </div>
                    <p className="text-2xl font-black" style={{ color: p }}>{formatPrice(Number(order.total) || 0, restaurant.currency)}</p>
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Encaisser via</p>
                    <div className="grid grid-cols-2 gap-2">
                      {PAYMENT_METHODS.map(m => (
                        <motion.button key={m.key} whileTap={{ scale: 0.93 }}
                          onClick={() => markPaid(order.id, m.key)}
                          className="flex items-center gap-3 p-3 rounded-2xl border-2 border-gray-100 hover:bg-gray-50 transition-all">
                          <img src={m.logo} alt={m.label} className="w-8 h-8 object-contain rounded-lg flex-shrink-0" />
                          <span className="text-sm font-bold text-gray-700">{m.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── VENTES DIRECTES ── */}
      {tab === 'ventes' && (
        <div className="px-4 pb-24">
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowManualForm(true)}
            className="w-full py-4 rounded-2xl text-white font-black flex items-center justify-center gap-2 mb-4 shadow-lg"
            style={{ backgroundColor: p }}>
            <Plus size={18} strokeWidth={3} />
            Ajouter une vente directe
          </motion.button>
          {manualSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-3xl bg-purple-50 flex items-center justify-center mb-4">
                <Receipt size={28} className="text-purple-400" />
              </div>
              <p className="font-black text-gray-900">Aucune vente directe aujourd&apos;hui</p>
            </div>
          ) : (
            <div className="space-y-2">
              {manualSales.map(sale => {
                const method = PAYMENT_METHODS.find(m => m.key === sale.payment_method)
                return (
                  <motion.div key={sale.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 bg-gray-50 border border-gray-100">
                      <img src={method?.logo || ''} alt={method?.label || ''} className="w-7 h-7 object-contain rounded-lg" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-900">{sale.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{sale.quantity}× · {method?.label} · {formatTimeAgo(sale.created_at)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-sm" style={{ color: p }}>{formatPrice(Number(sale.total) || 0, restaurant.currency)}</p>
                      <button onClick={() => deleteManualSale(sale.id)} className="text-xs text-red-400 mt-0.5">Supprimer</button>
                    </div>
                  </motion.div>
                )
              })}
              <div className="mt-4 bg-purple-50 rounded-2xl px-4 py-3 flex justify-between items-center border border-purple-100">
                <p className="font-bold text-purple-700 text-sm">Total ventes directes</p>
                <p className="font-black text-purple-700">{formatPrice(manualRevenue, restaurant.currency)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── HISTORIQUE ── */}
      {tab === 'historique' && (
        <div className="px-4 pb-24">
          {/* Filtres */}
          <div className="flex gap-2 mb-4">
            {[
              { key: 'today', label: "Aujourd'hui" },
              { key: 'yesterday', label: 'Hier' },
              { key: 'week', label: '7 derniers jours' },
            ].map(f => (
              <button key={f.key} onClick={() => setHistFilter(f.key as any)}
                className="flex-1 py-2.5 rounded-2xl text-xs font-bold transition-all"
                style={histFilter === f.key
                  ? { backgroundColor: p, color: '#fff' }
                  : { backgroundColor: '#fff', color: '#9CA3AF', border: '1px solid #E5E7EB' }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Total période */}
          <div className="bg-white rounded-2xl px-4 py-3 mb-4 flex justify-between items-center shadow-sm border border-gray-100">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-400" />
              <p className="text-sm font-bold text-gray-700">{histOrders.length} commandes</p>
            </div>
            <p className="font-black" style={{ color: p }}>{formatPrice(histTotal, restaurant.currency)}</p>
          </div>

          {histOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <History size={32} className="text-gray-300 mb-3" />
              <p className="font-black text-gray-900">Aucune commande sur cette période</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(histByDate).map(([dateKey, dayOrders]) => {
                const dayTotal = dayOrders.filter(o => o.payment_status === 'paid').reduce((s, o) => s + (Number(o.total) || 0), 0)
                return (
                  <div key={dateKey}>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <p className="text-xs font-black text-gray-500 uppercase tracking-widest">{getDateLabel(dateKey)}</p>
                      <p className="text-xs font-black" style={{ color: p }}>{formatPrice(dayTotal, restaurant.currency)}</p>
                    </div>
                    <div className="space-y-2">
                      {dayOrders.map(order => {
                        const isExpanded = expandedHistOrder === order.id
                        const cfg = STATUS_DISPLAY[order.status] || STATUS_DISPLAY.served
                        return (
                          <div key={order.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                            <button onClick={() => setExpandedHistOrder(isExpanded ? null : order.id)}
                              className="w-full px-4 py-3 flex items-center gap-3 text-left">
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: cfg.bg }}>
                                <cfg.Icon size={14} style={{ color: cfg.color }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-gray-900">{order.order_number}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  Table {(order as any).table?.table_number || '—'} · {formatTimeAgo(order.created_at)}
                                  {order.payment_status === 'paid' && order.payment_method && (
                                    <span className="ml-1 font-semibold" style={{ color: PAYMENT_METHODS.find(m => m.key === order.payment_method)?.color || '#6B7280' }}>
                                      · {PAYMENT_METHODS.find(m => m.key === order.payment_method)?.label || order.payment_method}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0 flex items-center gap-2">
                                <p className="font-black text-sm" style={{ color: order.payment_status === 'paid' ? '#10B981' : '#F59E0B' }}>
                                  {formatPrice(Number(order.total) || 0, restaurant.currency)}
                                </p>
                                <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                  <ChevronDown size={14} className="text-gray-400" />
                                </motion.div>
                              </div>
                            </button>
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                                  className="overflow-hidden border-t border-gray-50">
                                  <div className="px-4 py-3 space-y-2">
                                    {(order.items || []).map(item => (
                                      <div key={item.id} className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-2">
                                          <span className="w-5 h-5 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-black text-gray-600">{item.quantity}</span>
                                          <span className="text-gray-700">{item.item_name}</span>
                                        </div>
                                        <span className="font-bold text-gray-500">{formatPrice(Number(item.total) || 0, restaurant.currency)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── RÉCAP ── */}
      {tab === 'recap' && (
        <div className="px-4 pb-24 space-y-4">
          {/* Total journée */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">Récapitulatif du jour</p>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <div>
                  <span className="text-sm text-gray-700">Commandes scannées</span>
                  <p className="text-xs text-gray-400">{paidOrders.length} encaissées · {todayOrders.filter(o => o.payment_status !== 'paid').length} non encaissées</p>
                </div>
                <p className="font-black text-sm text-gray-900">{formatPrice(orderRevenue, restaurant.currency)}</p>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <div>
                  <span className="text-sm text-gray-700">Ventes directes</span>
                  <p className="text-xs text-gray-400">{manualSales.length} ventes</p>
                </div>
                <p className="font-black text-sm text-gray-900">{formatPrice(manualRevenue, restaurant.currency)}</p>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="font-black text-gray-900">TOTAL CAISSE</span>
                <p className="font-black text-2xl" style={{ color: p }}>{formatPrice(totalRevenue, restaurant.currency)}</p>
              </div>
            </div>
          </div>

          {/* Par moyen de paiement */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">Par moyen de paiement</p>
            {Object.keys(byMethod).length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Aucun paiement enregistré</p>
            ) : (
              <div className="space-y-3">
                {/* Afficher tous les moyens ayant un montant > 0 */}
                {[...PAYMENT_METHODS, ...Object.keys(byMethod)
                  .filter(k => !PAYMENT_METHODS.find(m => m.key === k))
                  .map(k => ({ key: k, label: k, color: '#6B7280', logo: '' }))
                ].filter(m => byMethod[m.key] > 0).map(method => {
                  const amount = byMethod[method.key] || 0
                  const pct = totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100) : 0
                  return (
                    <div key={method.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          {(method as any).logo
                            ? <img src={(method as any).logo} alt={method.label} className="w-7 h-7 object-contain rounded-lg" />
                            : <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">{method.label.charAt(0)}</div>
                          }
                          <span className="text-sm font-medium text-gray-700">{method.label}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-sm text-gray-900">{formatPrice(amount, restaurant.currency)}</span>
                          <span className="text-xs text-gray-400 ml-1">({pct}%)</span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.3, duration: 0.8 }}
                          className="h-full rounded-full" style={{ backgroundColor: method.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {pendingPayment.length > 0 && (
            <div className="bg-amber-50 rounded-3xl p-4 border border-amber-100 flex items-center justify-between">
              <div>
                <p className="font-bold text-amber-800 text-sm flex items-center gap-1.5"><AlertTriangle size={14} /> En attente d&apos;encaissement</p>
                <p className="text-xs text-amber-600 mt-0.5">{pendingPayment.length} commande{pendingPayment.length > 1 ? 's' : ''} servie{pendingPayment.length > 1 ? 's' : ''} non encaissée{pendingPayment.length > 1 ? 's' : ''}</p>
              </div>
              <p className="font-black text-amber-800">{formatPrice(pendingPayment.reduce((s, o) => s + (Number(o.total) || 0), 0), restaurant.currency)}</p>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL VENTE DIRECTE ── */}
      <AnimatePresence>
        {showManualForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowManualForm(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="relative bg-white w-full max-w-md mx-auto rounded-t-[2rem] p-6"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-black text-lg text-gray-900">Vente directe</h3>
                <button onClick={() => setShowManualForm(false)} className="w-8 h-8 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <X size={15} className="text-gray-600" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1.5">Description *</label>
                  <input type="text" placeholder="Ex: Plateau spécial, Livraison..."
                    value={manualForm.label} onChange={e => setManualForm(p => ({ ...p, label: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 outline-none border border-gray-100"
                    style={{ fontSize: '16px' }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1.5">Quantité</label>
                    <input type="number" min="1" value={manualForm.quantity}
                      onChange={e => setManualForm(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                      className="w-full px-4 py-3 rounded-2xl bg-gray-50 outline-none border border-gray-100"
                      style={{ fontSize: '16px' }} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1.5">Prix unitaire *</label>
                    <input type="number" min="0" placeholder="0" value={manualForm.unit_price || ''}
                      onChange={e => setManualForm(p => ({ ...p, unit_price: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-4 py-3 rounded-2xl bg-gray-50 outline-none border border-gray-100"
                      style={{ fontSize: '16px' }} />
                  </div>
                </div>
                {manualForm.unit_price > 0 && (
                  <div className="flex justify-between items-center px-4 py-3 rounded-2xl" style={{ backgroundColor: p + '10' }}>
                    <span className="text-sm font-bold text-gray-700">Total</span>
                    <span className="font-black text-lg" style={{ color: p }}>{formatPrice(manualForm.quantity * manualForm.unit_price, restaurant.currency)}</span>
                  </div>
                )}
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-2">Moyen de paiement</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_METHODS.map(m => (
                      <button key={m.key} onClick={() => setManualForm(prev => ({ ...prev, payment_method: m.key }))}
                        className="flex items-center gap-3 p-3 rounded-2xl border-2 transition-all"
                        style={manualForm.payment_method === m.key
                          ? { borderColor: m.color, backgroundColor: m.color + '10' }
                          : { borderColor: '#E5E7EB' }}>
                        <img src={m.logo} alt={m.label} className="w-8 h-8 object-contain rounded-lg flex-shrink-0" />
                        <span className="text-sm font-bold" style={{ color: manualForm.payment_method === m.key ? m.color : '#6B7280' }}>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <motion.button whileTap={{ scale: 0.97 }} onClick={addManualSale}
                  disabled={!manualForm.label || manualForm.unit_price <= 0}
                  className="w-full py-4 rounded-2xl text-white font-black text-base disabled:opacity-40"
                  style={{ backgroundColor: p }}>
                  Enregistrer — {formatPrice(manualForm.quantity * manualForm.unit_price, restaurant.currency)}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL DÉTAIL COMMANDE ── */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center sm:p-4">
            <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28 }}
              className="relative bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-[2rem] max-h-[85vh] overflow-y-auto"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <div>
                  <h3 className="font-black text-lg">{selectedOrder.order_number}</h3>
                  <p className="text-xs text-gray-400">Table {(selectedOrder as any).table?.table_number || '—'}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="w-8 h-8 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <X size={15} className="text-gray-600" />
                </button>
              </div>
              <div className="p-5 space-y-2">
                {(selectedOrder.items || []).map(item => (
                  <div key={item.id}>
                    <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-black">{item.quantity}</span>
                        <span className="text-sm font-medium">{item.item_name}</span>
                      </div>
                      <span className="font-bold text-sm">{formatPrice(Number(item.total) || 0, restaurant.currency)}</span>
                    </div>
                    {((item as any).notes || (item as any).note) && (
                      <div className="ml-9 mb-1 px-2 py-1 rounded-lg bg-orange-50 flex items-center gap-1">
                        <FileText size={12} className="text-orange-500 flex-shrink-0" />
                        <span className="text-xs text-orange-700 font-medium">{(item as any).notes || (item as any).note}</span>
                      </div>
                    )}
                  </div>
                ))}
                <div className="flex justify-between pt-3 font-black text-base">
                  <span>Total</span>
                  <span style={{ color: p }}>{formatPrice(Number(selectedOrder.total) || 0, restaurant.currency)}</span>
                </div>
              </div>
              {STATUS_FLOW[selectedOrder.status] && (
                <div className="px-5 pb-3">
                  <motion.button whileTap={{ scale: 0.97 }}
                    onClick={() => { updateStatus(selectedOrder.id, STATUS_FLOW[selectedOrder.status].next); setSelectedOrder(null) }}
                    className="w-full py-3.5 rounded-2xl text-white font-black text-sm"
                    style={{ backgroundColor: STATUS_FLOW[selectedOrder.status].color }}>
                    {STATUS_FLOW[selectedOrder.status].label}
                  </motion.button>
                </div>
              )}
              {selectedOrder.payment_status === 'unpaid' && selectedOrder.status === 'served' && (
                <div className="px-5 pb-5">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Encaisser</p>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_METHODS.map(m => (
                      <button key={m.key} onClick={() => { markPaid(selectedOrder.id, m.key); setSelectedOrder(null) }}
                        className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                        <img src={m.logo} alt={m.label} className="w-8 h-8 object-contain rounded-lg" />
                        <span className="text-sm font-bold text-gray-700">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
