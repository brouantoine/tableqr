'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, ChefHat, CheckCircle, Utensils, MessageCircle, X, Heart, Gift, Tag, Hand, type LucideIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useSessionStore } from '@/lib/store'
import { useNotificationSound } from '@/hooks/useNotificationSound'
import type { Notification, SocialMessage } from '@/types'

interface ToastNotif {
  id: string
  title: string
  body?: string
  type: string
  status?: string
  href?: string
}

declare global {
  interface Window {
    __activeSocialChatId?: string | null
  }
}

const TOAST_CONFIG: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  // statuts de commande
  confirmed:    { icon: CheckCircle,  color: '#3B82F6', bg: '#EFF6FF' },
  preparing:    { icon: ChefHat,      color: '#F59E0B', bg: '#FFFBEB' },
  ready:        { icon: Utensils,     color: '#10B981', bg: '#ECFDF5' },
  served:       { icon: CheckCircle,  color: '#10B981', bg: '#ECFDF5' },
  cancelled:    { icon: X,            color: '#EF4444', bg: '#FEF2F2' },
  // types génériques
  order_ready:  { icon: Utensils,     color: '#10B981', bg: '#ECFDF5' },
  order_status: { icon: ChefHat,      color: '#F59E0B', bg: '#FFFBEB' },
  message:      { icon: MessageCircle,color: '#3B82F6', bg: '#EFF6FF' },
  coucou:       { icon: Hand,         color: '#F26522', bg: '#FFF7F0' },
  support:      { icon: MessageCircle,color: '#F26522', bg: '#FFF7F0' },
  match:        { icon: Heart,        color: '#EF4444', bg: '#FEF2F2' },
  anniversaire: { icon: Gift,         color: '#8B5CF6', bg: '#F5F3FF' },
  promo:        { icon: Tag,          color: '#F26522', bg: '#FFF7F0' },
  default:      { icon: Bell,         color: '#6B7280', bg: '#F9FAFB' },
}

function pickConfig(notif: { type: string; status?: string }) {
  return TOAST_CONFIG[notif.status || ''] || TOAST_CONFIG[notif.type] || TOAST_CONFIG.default
}

export default function GlobalClientNotifier({ slug, primaryColor }: { slug: string; primaryColor: string }) {
  const { session, addNotification } = useSessionStore()
  const { playSound } = useNotificationSound()
  const router = useRouter()
  const playRef = useRef(playSound)
  const seenRef = useRef<Set<string>>(new Set())
  const [toasts, setToasts] = useState<ToastNotif[]>([])

  useEffect(() => { playRef.current = playSound }, [playSound])

  useEffect(() => {
    if (!session) return

    const pushToast = (toast: ToastNotif) => {
      setToasts(prev => [toast, ...prev].slice(0, 3))
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id))
      }, 4500)
    }

    const notifChannel = supabase.channel(`client-notif-${session.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `session_id=eq.${session.id}`,
      }, (payload) => {
        const n = payload.new as Notification
        if (seenRef.current.has(n.id)) return
        seenRef.current.add(n.id)

        addNotification(n)

        const notifData = n.data as { status?: string; href?: string } | null
        const status = notifData?.status
        if (n.type === 'order_ready' || status === 'ready') {
          playRef.current('ready')
        } else if (n.type === 'message') {
          playRef.current('message')
        } else {
          playRef.current('order')
        }

        pushToast({
          id: n.id,
          title: n.title,
          body: n.body || undefined,
          type: n.type,
          status,
          href: notifData?.href?.startsWith('/social') ? `/${slug}${notifData.href}` : notifData?.href,
        })
      })
      .subscribe()

    const socialChannel = supabase.channel(`client-social-msg-${session.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'social_messages',
        filter: `receiver_session_id=eq.${session.id}`,
      }, async (payload) => {
        const msg = payload.new as SocialMessage
        if (msg.restaurant_id !== session.restaurant_id) return
        if (seenRef.current.has(msg.id)) return
        seenRef.current.add(msg.id)

        // Si on est déjà sur la conversation du sender, pas de toast/son
        const activeChat = typeof window !== 'undefined' ? window.__activeSocialChatId : null
        if (activeChat === msg.sender_session_id) return

        const { data: sender } = await supabase.from('client_sessions')
          .select('pseudo')
          .eq('id', msg.sender_session_id)
          .single()

        const isCoucou = msg.trigger_type === 'coucou'
        playRef.current(isCoucou ? 'coucou' : 'message')

        pushToast({
          id: msg.id,
          title: sender?.pseudo || 'Nouveau message',
          body: isCoucou
            ? 'vous a envoyé un coucou'
            : msg.message.length > 70 ? msg.message.slice(0, 70) + '...' : msg.message,
          type: isCoucou ? 'coucou' : 'message',
          href: `/${slug}/social?chat=${msg.sender_session_id}`,
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(notifChannel)
      supabase.removeChannel(socialChannel)
    }
  }, [session, addNotification, slug])

  function dismiss(id: string) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  function openToast(t: ToastNotif) {
    dismiss(t.id)
    if (t.href) router.push(t.href)
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[90] flex flex-col items-center pointer-events-none"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
      <AnimatePresence>
        {toasts.map((t, idx) => {
          const cfg = pickConfig(t)
          const Icon = cfg.icon
          return (
            <motion.div
              key={t.id}
              initial={{ y: -120, opacity: 0, scale: 0.95 }}
              animate={{ y: idx * 6, opacity: 1, scale: 1 }}
              exit={{ y: -120, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 24, stiffness: 280 }}
              onClick={() => openToast(t)}
              className="pointer-events-auto cursor-pointer mb-2 px-4 w-full max-w-md">
              <div
                className="flex items-start gap-3 p-3.5 rounded-2xl bg-white shadow-xl border border-gray-100"
                style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.12)' }}>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: cfg.bg }}>
                  <Icon size={18} style={{ color: cfg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-900 text-sm leading-tight">{t.title}</p>
                  {t.body && (
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{t.body}</p>
                  )}
                </div>
                <button
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); dismiss(t.id) }}
                  className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <X size={11} className="text-gray-500" />
                </button>
              </div>
              {/* barre de progression du dismiss auto */}
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 4.5, ease: 'linear' }}
                className="h-0.5 rounded-full mt-1 mx-3"
                style={{ backgroundColor: primaryColor, opacity: 0.6 }}
              />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
