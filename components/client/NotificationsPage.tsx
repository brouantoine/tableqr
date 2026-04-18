'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'
import { useSessionStore } from '@/lib/store'
import { formatTimeAgo } from '@/lib/utils'
import { Bell, MessageCircle, Utensils, Heart, Gift, Tag, CheckCheck } from 'lucide-react'
import type { Restaurant } from '@/types'

interface Notif {
  id: string
  type: string
  title: string
  body?: string
  is_read: boolean
  created_at: string
  data: any
}

const NOTIF_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  message:      { icon: MessageCircle, color: '#3B82F6', bg: '#EFF6FF' },
  plat_partage: { icon: Utensils,      color: '#F59E0B', bg: '#FFFBEB' },
  order_ready:  { icon: Utensils,      color: '#10B981', bg: '#ECFDF5' },
  match:        { icon: Heart,         color: '#EF4444', bg: '#FEF2F2' },
  anniversaire: { icon: Gift,          color: '#8B5CF6', bg: '#F5F3FF' },
  promo:        { icon: Tag,           color: '#F26522', bg: '#FFF7F0' },
  jeu_invite:   { icon: Bell,          color: '#6366F1', bg: '#EEF2FF' },
}

export default function NotificationsPage({ restaurant }: { restaurant: Restaurant }) {
  const { session } = useSessionStore()
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)
  const p = restaurant.primary_color

  useEffect(() => {
    if (!session) return
    loadNotifs()

    const channel = supabase.channel(`notifs-page-${session.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `session_id=eq.${session.id}`
      }, (payload) => {
        setNotifs(prev => [payload.new as Notif, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [session])

  async function loadNotifs() {
    if (!session) return
    setLoading(true)
    const { data } = await supabase.from('notifications')
      .select('*')
      .eq('session_id', session.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifs(data || [])
    setLoading(false)
    // Marquer tout comme lu
    await supabase.from('notifications')
      .update({ is_read: true })
      .eq('session_id', session.id)
      .eq('is_read', false)
  }

  async function markAllRead() {
    if (!session) return
    await supabase.from('notifications').update({ is_read: true }).eq('session_id', session.id)
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const unread = notifs.filter(n => !n.is_read).length

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 rounded-full border-2 border-t-transparent"
          style={{ borderColor: p, borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b flex items-center justify-between">
        <div>
          <h1 className="font-black text-gray-900 text-lg">Notifications</h1>
          {unread > 0 && <p className="text-xs mt-0.5" style={{ color: p }}>{unread} non lue{unread > 1 ? 's' : ''}</p>}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-gray-600">
            <CheckCheck size={14} />
            Tout lire
          </button>
        )}
      </div>

      {notifs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center px-6">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}>
            <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mb-4 mx-auto">
              <Bell size={32} className="text-gray-300" />
            </div>
          </motion.div>
          <p className="font-black text-gray-900 text-xl mb-2">Aucune notification</p>
          <p className="text-gray-400 text-sm">Les messages, commandes et activités apparaîtront ici</p>
        </div>
      ) : (
        <div className="p-4 space-y-2">
          <AnimatePresence>
            {notifs.map((notif, i) => {
              const cfg = NOTIF_CONFIG[notif.type] || NOTIF_CONFIG.promo
              const Icon = cfg.icon
              return (
                <motion.div key={notif.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`bg-white rounded-2xl p-4 flex gap-3 shadow-sm transition-all ${!notif.is_read ? 'border-l-4' : ''}`}
                  style={!notif.is_read ? { borderLeftColor: cfg.color } : {}}>
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: cfg.bg }}>
                    <Icon size={18} style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-tight ${notif.is_read ? 'text-gray-700 font-medium' : 'text-gray-900 font-bold'}`}>
                        {notif.title}
                      </p>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: cfg.color }} />
                      )}
                    </div>
                    {notif.body && <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{notif.body}</p>}
                    <p className="text-xs text-gray-300 mt-1">{formatTimeAgo(notif.created_at)}</p>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}