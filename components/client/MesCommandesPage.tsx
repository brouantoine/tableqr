'use client'
import { useState, useEffect, useRef } from 'react'
import { TwemojiIcon } from '@/components/Twemoji'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'
import { useSessionStore } from '@/lib/store'
import { formatPrice, formatTimeAgo } from '@/lib/utils'
import { Clock, ChefHat, CheckCircle, Utensils, XCircle, MessageSquare } from 'lucide-react'
import { useNotificationSound } from '@/hooks/useNotificationSound'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
import type { Order, Restaurant } from '@/types'

const STATUS_CONFIG = {
  pending:   { label: 'Commande reçue',      color: '#F59E0B', bg: '#FFFBEB', Icon: Clock,        step: 0 },
  confirmed: { label: 'Commande reçue',      color: '#F59E0B', bg: '#FFFBEB', Icon: Clock,        step: 0 },
  preparing: { label: 'En préparation',      color: '#3B82F6', bg: '#EFF6FF', Icon: ChefHat,      step: 1 },
  ready:     { label: 'Prête à être servie', color: '#10B981', bg: '#ECFDF5', Icon: CheckCircle,  step: 2 },
  served:    { label: 'Servie',              color: '#6B7280', bg: '#F9FAFB', Icon: Utensils,     step: 3 },
  cancelled: { label: 'Annulée',             color: '#EF4444', bg: '#FEF2F2', Icon: XCircle,      step: -1 },
}

const STEPS = [
  { label: 'Reçue',        Icon: Clock },
  { label: 'Préparation',  Icon: ChefHat },
  { label: 'Prête',        Icon: CheckCircle },
  { label: 'Servie',       Icon: Utensils },
]

function OrderTimer({ order, primaryColor }: { order: Order; primaryColor: string }) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

  useEffect(() => {
    if (!['pending', 'confirmed'].includes(order.status)) { setSecondsLeft(null); return }
    const endTime = new Date(order.created_at).getTime() + 5 * 60 * 1000
    const update = () => setSecondsLeft(Math.max(0, Math.floor((endTime - Date.now()) / 1000)))
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [order.status, order.created_at])

  if (secondsLeft === null) return null
  const pct = (secondsLeft / 300) * 100
  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const color = pct > 30 ? primaryColor : '#EF4444'

  return (
    <div className="px-5 py-3 border-b border-gray-50">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500">Prise en charge dans</p>
        <p className="text-xs font-black tabular-nums" style={{ color }}>
          {mins}:{secs.toString().padStart(2, '0')}
        </p>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }}
          className="h-full rounded-full" style={{ backgroundColor: color }} />
      </div>
    </div>
  )
}

export default function MesCommandesPage({ restaurant }: { restaurant: Restaurant }) {
  const { session } = useSessionStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const p = restaurant.primary_color
  const { playSound } = useNotificationSound()
  const playSoundRef = useRef(playSound)
  useEffect(() => { playSoundRef.current = playSound }, [playSound])

  useRealtimeRefresh(async () => {
    if (session) await loadOrders()
  }, 10000)

  useEffect(() => {
    if (!session) return
    loadOrders()
    const channel = supabase.channel(`my-orders-${session.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `session_id=eq.${session.id}` },
        (payload) => {
          setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o))
          // Son + vibration quand plat prêt
          if (payload.new.status === 'ready') {
            // Tenter de jouer le son
            playSoundRef.current('ready')
            // Notification browser si permission accordée
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('🍽️ Votre plat est prêt !', {
                body: 'Le serveur arrive vers vous',
                icon: '/icon.png',
              })
            }
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [session])

  async function loadOrders() {
    if (!session) return
    setLoading(true)
    const { data } = await supabase.from('orders')
      .select('*, items:order_items(*)')
      .eq('session_id', session.id)
      .order('created_at', { ascending: false })
    setOrders((data as Order[]) || [])
    setLoading(false)
  }

  // Demander permission notifications au montage
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const activeOrders = orders.filter(o => !['served', 'cancelled'].includes(o.status))
  const pastOrders = orders.filter(o => ['served', 'cancelled'].includes(o.status))

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-7 h-7 rounded-full border-2 border-t-transparent"
        style={{ borderColor: p, borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#F8F8F8' }}>

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 py-4">
        <h1 className="font-black text-gray-900 text-lg">Mes commandes</h1>
        {session && <p className="text-xs text-gray-400 mt-0.5">{session.pseudo}</p>}
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <div className="w-20 h-20 rounded-3xl bg-white shadow-sm flex items-center justify-center mb-5">
            <Utensils size={32} className="text-gray-300" />
          </div>
          <p className="font-black text-gray-900 text-xl mb-1">Aucune commande</p>
          <p className="text-gray-400 text-sm mb-6">Vos commandes apparaîtront ici</p>
          <a href={`/${restaurant.slug}/menu`}
            className="px-6 py-3 rounded-2xl text-white font-bold text-sm"
            style={{ backgroundColor: p }}>
            Voir le menu →
          </a>
        </div>
      ) : (
        <div className="p-4 space-y-6">

          {/* Commandes actives */}
          {activeOrders.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: p }} />
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  En cours · {activeOrders.length}
                </p>
              </div>

              <div className="space-y-3">
                <AnimatePresence>
                  {activeOrders.map((order, i) => {
                    const cfg = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
                    const { Icon } = cfg
                    const isExpanded = expandedId === order.id
                    const hasNotes = (order.items || []).some(item => (item as any).notes)

                    return (
                      <motion.div key={order.id}
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-white rounded-3xl overflow-hidden"
                        style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>

                        {/* Statut bar */}
                        <div className="h-1 w-full" style={{ backgroundColor: cfg.color }} />

                        {/* Header */}
                        <div className="px-5 pt-4 pb-3 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: cfg.bg }}>
                            <Icon size={18} style={{ color: cfg.color }} strokeWidth={2} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-gray-900 text-sm">{order.order_number}</p>
                            <p className="text-xs font-semibold mt-0.5" style={{ color: cfg.color }}>{cfg.label}</p>
                          </div>
                          <p className="text-xs text-gray-300 flex-shrink-0">{formatTimeAgo(order.created_at)}</p>
                        </div>

                        {/* Timer */}
                        {['pending', 'confirmed'].includes(order.status) && (
                          <OrderTimer order={order} primaryColor={p} />
                        )}

                        {/* Progress steps */}
                        <div className="px-5 py-4 border-b border-gray-50">
                          <div className="flex items-center">
                            {STEPS.map((step, idx) => {
                              const isDone = idx < cfg.step
                              const isActive = idx === cfg.step
                              const isLast = idx === STEPS.length - 1
                              const StepIcon = step.Icon
                              return (
                                <div key={idx} className="flex items-center flex-1 last:flex-none">
                                  <div className="flex flex-col items-center gap-1.5">
                                    <motion.div
                                      animate={{ scale: isActive ? [1, 1.08, 1] : 1 }}
                                      transition={{ repeat: isActive ? Infinity : 0, duration: 1.8 }}
                                      className="w-8 h-8 rounded-2xl flex items-center justify-center border-2 transition-all"
                                      style={{
                                        backgroundColor: isDone || isActive ? cfg.color : '#F5F5F5',
                                        borderColor: isDone || isActive ? cfg.color : '#E5E7EB',
                                      }}>
                                      {isDone ? (
                                        <svg width="11" height="9" viewBox="0 0 12 10" fill="none">
                                          <path d="M1 5L4.5 8.5L11 1.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                      ) : (
                                        <StepIcon size={14}
                                          color={isActive ? '#fff' : '#D1D5DB'}
                                          strokeWidth={2} />
                                      )}
                                    </motion.div>
                                    <span className="text-center leading-tight font-medium"
                                      style={{ color: isDone || isActive ? cfg.color : '#D1D5DB', fontSize: '9px' }}>
                                      {step.label}
                                    </span>
                                  </div>
                                  {!isLast && (
                                    <div className="flex-1 h-px mb-5 mx-1 transition-all"
                                      style={{ backgroundColor: idx < cfg.step ? cfg.color : '#E5E7EB' }} />
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Items — cliquable pour déplier */}
                        <button onClick={() => setExpandedId(isExpanded ? null : order.id)}
                          className="w-full px-5 py-3 flex items-center justify-between text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-700">
                              {(order.items || []).length} article{(order.items || []).length > 1 ? 's' : ''}
                            </span>
                            {hasNotes && (
                              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50">
                                <MessageSquare size={10} style={{ color: p }} />
                                <span className="text-xs font-bold" style={{ color: p }}>Notes</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm" style={{ color: p }}>
                              {formatPrice(order.total, restaurant.currency)}
                            </span>
                            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 9l6 6 6-6"/>
                              </svg>
                            </motion.div>
                          </div>
                        </button>

                        {/* Items détail */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                              className="overflow-hidden border-t border-gray-50">
                              <div className="px-5 py-3 space-y-3">
                                {(order.items || []).map(item => (
                                  <div key={item.id} className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5"
                                      style={{ backgroundColor: p + '15', color: p }}>
                                      {item.quantity}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-gray-800">{item.item_name}</p>
                                      {(item as any).notes && (
                                        <div className="flex items-start gap-1.5 mt-1 px-2.5 py-1.5 rounded-xl bg-orange-50">
                                          <MessageSquare size={11} className="flex-shrink-0 mt-0.5" style={{ color: p }} />
                                          <p className="text-xs text-orange-700 leading-snug">{(item as any).notes}</p>
                                        </div>
                                      )}
                                    </div>
                                    <p className="text-sm font-bold text-gray-400 flex-shrink-0">
                                      {formatPrice(item.total, restaurant.currency)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Message prête */}
                        {order.status === 'ready' && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="mx-4 mb-4 px-4 py-3 rounded-2xl flex items-center gap-3"
                            style={{ backgroundColor: '#ECFDF5', border: '1px solid #D1FAE5' }}>
                            <CheckCircle size={18} className="text-green-500 flex-shrink-0" strokeWidth={2.5} />
                            <div>
                              <p className="text-sm font-black text-green-800">Votre commande est prête</p>
                              <p className="text-xs text-green-600 mt-0.5">Le serveur arrive vers vous</p>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Historique */}
          {pastOrders.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                Historique · {pastOrders.length}
              </p>
              <div className="space-y-2">
                {pastOrders.map(order => {
                  const cfg = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.served
                  const { Icon } = cfg
                  return (
                    <div key={order.id}
                      className="bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3"
                      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: cfg.bg }}>
                        <Icon size={16} style={{ color: cfg.color }} strokeWidth={2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-gray-900">{order.order_number}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatTimeAgo(order.created_at)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-black text-sm" style={{ color: p }}>{formatPrice(order.total, restaurant.currency)}</p>
                        <p className="text-xs font-medium mt-0.5" style={{ color: cfg.color }}>{cfg.label}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
