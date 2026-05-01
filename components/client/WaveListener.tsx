'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import TwemojiAvatar from './TwemojiAvatar'
import { supabase } from '@/lib/supabase/client'
import { useSessionStore } from '@/lib/store'
import { useNotificationSound } from '@/hooks/useNotificationSound'
import type { ClientSession, SocialWave } from '@/types'

interface IncomingWave {
  id: string
  senderId: string
  pseudo: string
  avatar: string
  mutual: boolean
}

export default function WaveListener({ slug, primaryColor }: { slug: string; primaryColor: string }) {
  const { session } = useSessionStore()
  const { playSound } = useNotificationSound()
  const playRef = useRef(playSound)
  const router = useRouter()
  const seenRef = useRef<Set<string>>(new Set())
  const [incoming, setIncoming] = useState<IncomingWave | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { playRef.current = playSound }, [playSound])

  const dismiss = useCallback(() => setIncoming(null), [])

  const openChat = useCallback((senderId: string) => {
    setIncoming(null)
    router.push(`/${slug}/social?chat=${senderId}`)
  }, [router, slug])

  const waveBack = useCallback(async (senderId: string) => {
    if (!session || busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/social/waves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: session.restaurant_id,
          sender_session_id: session.id,
          receiver_session_id: senderId,
        }),
      })
      const json = await res.json() as { mutual?: boolean; error?: string }
      if (res.ok && json.mutual) {
        playRef.current('match')
        openChat(senderId)
      } else if (res.ok) {
        // wave envoyé sans match (rare ici puisque l'autre vient juste de waver, mais possible si timeout)
        setIncoming(null)
      }
    } finally {
      setBusy(false)
    }
  }, [session, busy, openChat])

  useEffect(() => {
    if (!session) return

    const channel = supabase.channel(`wave-listener-${session.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'social_waves',
        filter: `receiver_session_id=eq.${session.id}`,
      }, async (payload) => {
        const wave = payload.new as SocialWave
        if (wave.restaurant_id !== session.restaurant_id) return
        if (seenRef.current.has(wave.id)) return
        seenRef.current.add(wave.id)

        const { data: sender } = await supabase.from('client_sessions')
          .select('id, pseudo, avatar_icon')
          .eq('id', wave.sender_session_id)
          .single()

        if (!sender) return
        const senderRow = sender as Pick<ClientSession, 'id' | 'pseudo' | 'avatar_icon'>

        playRef.current(wave.is_mutual ? 'match' : 'wave')

        setIncoming({
          id: wave.id,
          senderId: senderRow.id,
          pseudo: senderRow.pseudo,
          avatar: senderRow.avatar_icon,
          mutual: wave.is_mutual,
        })

        if (wave.is_mutual) {
          window.setTimeout(() => {
            openChat(senderRow.id)
          }, 2400)
        } else {
          window.setTimeout(() => {
            setIncoming(prev => (prev?.id === wave.id ? null : prev))
          }, 8000)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [session, openChat])

  if (!incoming) return null

  if (incoming.mutual) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center px-6"
        style={{ background: 'radial-gradient(circle at center, rgba(0,0,0,0.6), rgba(0,0,0,0.85))' }}>
        <motion.div
          initial={{ scale: 0.4, y: 40, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 16, stiffness: 220 }}
          className="bg-white rounded-3xl px-6 py-7 max-w-sm w-full text-center"
          style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.4)' }}>
          <div className="flex items-center justify-center gap-3 mb-4">
            <motion.div
              initial={{ rotate: -20, x: -10 }}
              animate={{ rotate: [0, -15, 15, -10, 10, 0], x: 0 }}
              transition={{ duration: 1.4, repeat: Infinity, repeatType: 'loop' }}>
              <TwemojiAvatar avatarId="ghost" size={56} />
            </motion.div>
            <motion.span
              animate={{ scale: [1, 1.3, 1], rotate: [0, 12, -12, 0] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              className="text-3xl">✨</motion.span>
            <motion.div
              initial={{ rotate: 20, x: 10 }}
              animate={{ rotate: [0, 15, -15, 10, -10, 0], x: 0 }}
              transition={{ duration: 1.4, repeat: Infinity, repeatType: 'loop' }}>
              <TwemojiAvatar avatarId={incoming.avatar} size={56} />
            </motion.div>
          </div>
          <p className="font-black text-gray-900 text-xl mb-1">Coucou réciproque !</p>
          <p className="text-sm text-gray-500 mb-5">
            <span className="font-bold text-gray-800">{incoming.pseudo}</span> aussi vous a fait coucou.
          </p>
          <motion.button whileTap={{ scale: 0.94 }}
            onClick={() => openChat(incoming.senderId)}
            className="w-full py-3 rounded-2xl font-black text-white text-sm"
            style={{ backgroundColor: primaryColor, boxShadow: `0 10px 24px ${primaryColor}66` }}>
            Démarrer la conversation
          </motion.button>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        key={incoming.id}
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 120, opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280 }}
        className="fixed left-1/2 -translate-x-1/2 z-[95] w-full max-w-md px-4"
        style={{ bottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
        <div className="bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3"
          style={{ boxShadow: '0 16px 40px rgba(0,0,0,0.18)' }}>
          <div className="relative flex-shrink-0">
            <TwemojiAvatar avatarId={incoming.avatar} size={44} />
            <motion.span
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: [0, 1.4, 1], rotate: [0, 18, -10, 0] }}
              transition={{ duration: 0.9 }}
              className="absolute -bottom-1 -right-2 text-xl">👋</motion.span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-gray-900 text-sm truncate">{incoming.pseudo}</p>
            <p className="text-xs text-gray-500 truncate">vous fait coucou</p>
          </div>
          <motion.button whileTap={{ scale: 0.92 }}
            onClick={() => waveBack(incoming.senderId)}
            disabled={busy}
            className="px-3 h-9 rounded-full text-white text-xs font-black flex-shrink-0 disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}>
            Coucou retour
          </motion.button>
          <button
            onClick={dismiss}
            className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <X size={12} className="text-gray-500" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
