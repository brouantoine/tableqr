'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import TwemojiAvatar from './TwemojiAvatar'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'
import { useSessionStore } from '@/lib/store'
import { getPresenceCutoffIso, getPresenceStamp, isLiveSocialClient } from '@/lib/social/presence'
import { formatTimeAgo } from '@/lib/utils'
import { Send, ChevronLeft, Search, Moon, UserRound, Plus, Hand, Check, Headset, Loader2 } from 'lucide-react'
import type { ClientSession, SocialMessage, Restaurant, SupportConversation, SupportMessage } from '@/types'

const COUCOU_DISPLAY_MS = 60_000

const MODE_INFO: Record<SocialMode, { label: string; short: string; long: string; color: string }> = {
  receptif:  {
    label: 'Disponible',
    short: '',
    long: 'Vous êtes visible des autres clients. Ils peuvent vous faire coucou et vous écrire.',
    color: '#10B981',
  },
  discret:   {
    label: 'Discret',
    short: 'visible mais préfère la tranquillité',
    long: 'Vous restez visible mais vous indiquez que vous préférez ne pas être trop sollicité.',
    color: '#F59E0B',
  },
  invisible: {
    label: 'Non réceptif',
    short: 'caché · personne ne peut vous voir',
    long: 'Vous disparaissez de la liste. Personne ne peut ni vous écrire ni vous faire coucou.',
    color: '#9CA3AF',
  },
}

type SocialMode = 'receptif' | 'discret' | 'invisible'

function appendMessage(prev: Record<string, SocialMessage[]>, clientId: string, msg: SocialMessage) {
  const current = prev[clientId] || []
  if (current.some(item => item.id === msg.id)) return prev
  return {
    ...prev,
    [clientId]: [...current, msg].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ),
  }
}

function appendSupportMessage(prev: SupportMessage[], msg: SupportMessage) {
  if (prev.some(item => item.id === msg.id)) return prev
  return [...prev, msg].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
}

export default function SocialPage({ restaurant }: { restaurant: Restaurant }) {
  const { session, setSession } = useSessionStore()
  const searchParams = useSearchParams()
  const chatParam = searchParams.get('chat')
  const supportParam = searchParams.get('support')
  const [view, setView] = useState<'list' | 'chat' | 'support'>('list')
  const [clients, setClients] = useState<ClientSession[]>([])
  const [conversationClients, setConversationClients] = useState<Record<string, ClientSession>>({})
  const [conversations, setConversations] = useState<Record<string, SocialMessage[]>>({})
  const [selectedClient, setSelectedClient] = useState<ClientSession | null>(null)
  const [socialMode, setSocialMode] = useState<SocialMode>((session?.social_mode as SocialMode) || 'receptif')
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [outgoingCoucous, setOutgoingCoucous] = useState<Record<string, number>>({})
  const [coucouBusy, setCoucouBusy] = useState<Record<string, boolean>>({})
  const [coucouFlash, setCoucouFlash] = useState<{ pseudo: string } | null>(null)
  const [modeHint, setModeHint] = useState<SocialMode | null>(null)
  const [supportConversation, setSupportConversation] = useState<SupportConversation | null>(null)
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([])
  const [supportInput, setSupportInput] = useState('')
  const [supportSending, setSupportSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const activeChatRef = useRef<{ view: 'list' | 'chat' | 'support'; selectedClientId?: string }>({ view: 'list' })
  const p = restaurant.primary_color

  const sessionId = session?.id
  const sessionRestaurantId = session?.restaurant_id
  const sessionFingerprint = session?.device_fingerprint
  const sessionAvatar = session?.avatar_icon
  const sessionPseudo = session?.pseudo
  const selectedClientId = selectedClient?.id
  const hasValidSession = Boolean(sessionId && sessionRestaurantId === restaurant.id)

  const rememberClients = useCallback((items: ClientSession[]) => {
    setConversationClients(prev => {
      const next = { ...prev }
      for (const item of items) {
        if (item.id !== sessionId) next[item.id] = item
      }
      return next
    })
  }, [sessionId])

  const loadClients = useCallback(async () => {
    if (!sessionId || sessionRestaurantId !== restaurant.id) return
    let query = supabase.from('client_sessions')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .eq('is_present', true)
      .eq('is_remote', false)
      .neq('social_mode', 'invisible')
      .neq('id', sessionId)
      .gte('last_seen_at', getPresenceCutoffIso())
      .order('last_seen_at', { ascending: false })
    if (sessionFingerprint) query = query.neq('device_fingerprint', sessionFingerprint)

    const { data, error } = await query

    if (error) {
      console.error('Load social clients error:', error)
      setClients([])
      return
    }

    setClients((data || []).filter(client => {
      const typed = client as ClientSession
      const sameDevice = !!sessionFingerprint && typed.device_fingerprint === sessionFingerprint
      const sameProfile = !!sessionAvatar && !!sessionPseudo
        && typed.avatar_icon === sessionAvatar
        && typed.pseudo === sessionPseudo
      if (sameDevice || sameProfile) return false
      if (!isLiveSocialClient(typed, restaurant.id, sessionId)) return false
      return true
    }) as ClientSession[])
  }, [restaurant.id, sessionId, sessionRestaurantId, sessionFingerprint, sessionAvatar, sessionPseudo])

  const loadAllMessages = useCallback(async () => {
    if (!sessionId || sessionRestaurantId !== restaurant.id) return
    const { data, error } = await supabase.from('social_messages').select('*')
      .eq('restaurant_id', restaurant.id)
      .or(`sender_session_id.eq.${sessionId},receiver_session_id.eq.${sessionId}`)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Load social messages error:', error)
      return
    }

    const grouped: Record<string, SocialMessage[]> = {}
    ;(data || []).forEach(msg => {
      const typedMsg = msg as SocialMessage
      const otherId = typedMsg.sender_session_id === sessionId ? typedMsg.receiver_session_id : typedMsg.sender_session_id
      if (!grouped[otherId]) grouped[otherId] = []
      grouped[otherId].push(typedMsg)
    })
    setConversations(grouped)

    const otherIds = Object.keys(grouped).filter(id => id !== sessionId)
    if (otherIds.length > 0) {
      const { data: participants } = await supabase.from('client_sessions')
        .select('*')
        .in('id', otherIds)
        .eq('restaurant_id', restaurant.id)
      rememberClients((participants || []) as ClientSession[])
    }
  }, [restaurant.id, sessionId, sessionRestaurantId, rememberClients])

  const markConversationRead = useCallback(async (clientId: string) => {
    if (!sessionId || sessionRestaurantId !== restaurant.id) return
    await supabase.from('social_messages')
      .update({ is_read: true })
      .eq('restaurant_id', restaurant.id)
      .eq('sender_session_id', clientId)
      .eq('receiver_session_id', sessionId)
      .eq('is_read', false)

    setConversations(prev => ({
      ...prev,
      [clientId]: (prev[clientId] || []).map(msg =>
        msg.sender_session_id === clientId && msg.receiver_session_id === sessionId
          ? { ...msg, is_read: true }
          : msg
      ),
    }))
  }, [restaurant.id, sessionId, sessionRestaurantId])

  const markSupportRead = useCallback(async (conversationId?: string) => {
    const id = conversationId || supportConversation?.id
    if (!id) return
    await fetch('/api/support/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: id, reader: 'client' }),
    })
    setSupportMessages(prev => prev.map(msg =>
      msg.sender_type !== 'client' ? { ...msg, is_read: true } : msg
    ))
  }, [supportConversation?.id])

  const loadSupportMessages = useCallback(async (conversationId: string) => {
    const res = await fetch(`/api/support/messages?conversation_id=${conversationId}`)
    const json = await res.json() as { data?: SupportMessage[] }
    setSupportMessages(json.data || [])
  }, [])

  const loadSupportConversation = useCallback(async () => {
    if (!sessionId || sessionRestaurantId !== restaurant.id) return null
    const res = await fetch('/api/support/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurant_id: restaurant.id,
        session_id: sessionId,
        source: 'client',
      }),
    })
    const json = await res.json() as { data?: SupportConversation }
    if (!json.data) return null
    setSupportConversation(json.data)
    await loadSupportMessages(json.data.id)
    return json.data
  }, [restaurant.id, sessionId, sessionRestaurantId, loadSupportMessages])

  useEffect(() => {
    setSocialMode((session?.social_mode as SocialMode) || 'receptif')
  }, [session?.social_mode])

  useEffect(() => {
    activeChatRef.current = { view, selectedClientId }
  }, [view, selectedClientId])

  useEffect(() => {
    if (!hasValidSession || !sessionId) return
    void loadClients()
    void loadAllMessages()
    void loadSupportConversation()

    const messagesChannel = supabase.channel(`social-messages-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'social_messages',
        filter: `receiver_session_id=eq.${sessionId}`
      }, async (payload) => {
        const msg = payload.new as SocialMessage
        if (msg.restaurant_id !== restaurant.id) return

        setConversations(prev => appendMessage(prev, msg.sender_session_id, msg))
        const { data: sender } = await supabase.from('client_sessions')
          .select('*')
          .eq('id', msg.sender_session_id)
          .eq('restaurant_id', restaurant.id)
          .maybeSingle()
        if (sender) rememberClients([sender as ClientSession])

        if (activeChatRef.current.view === 'chat' && activeChatRef.current.selectedClientId === msg.sender_session_id) {
          void markConversationRead(msg.sender_session_id)
        }

        void loadClients()
      })
      .subscribe()

    const presenceChannel = supabase.channel(`social-presence-${restaurant.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'client_sessions',
        filter: `restaurant_id=eq.${restaurant.id}`,
      }, () => {
        void loadClients()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(presenceChannel)
    }
  }, [hasValidSession, sessionId, restaurant.id, loadClients, loadAllMessages, loadSupportConversation, markConversationRead, rememberClients])

  useEffect(() => {
    if (!supportConversation?.id) return
    const channel = supabase.channel(`support-client-${supportConversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `conversation_id=eq.${supportConversation.id}`,
      }, (payload) => {
        const msg = payload.new as SupportMessage
        setSupportMessages(prev => appendSupportMessage(prev, msg))
        if (activeChatRef.current.view === 'support') void markSupportRead(supportConversation.id)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supportConversation?.id, markSupportRead])

  useEffect(() => {
    if (view === 'chat' || view === 'support') setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [view, conversations, selectedClient, supportMessages])

  useEffect(() => {
    if (!selectedClientId) return
    const freshClient = clients.find(client => client.id === selectedClientId) || conversationClients[selectedClientId]
    if (!freshClient) {
      setSelectedClient(null)
      setView('list')
      return
    }
    setSelectedClient(freshClient)
  }, [clients, conversationClients, selectedClientId])

  useEffect(() => {
    if (view === 'chat' && selectedClientId) void markConversationRead(selectedClientId)
  }, [view, selectedClientId, markConversationRead])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.__activeSocialChatId = view === 'chat' ? selectedClientId || null : null
    return () => { window.__activeSocialChatId = null }
  }, [view, selectedClientId])

  // Ouverture automatique du chat depuis une notification message/coucou
  useEffect(() => {
    if (!chatParam || !sessionId) return
    const local = clients.find(c => c.id === chatParam)
    if (local) {
      setSelectedClient(local)
      setView('chat')
      const url = new URL(window.location.href)
      url.searchParams.delete('chat')
      window.history.replaceState({}, '', url.pathname + (url.search ? `?${url.searchParams}` : ''))
      return
    }
    let cancelled = false
    void (async () => {
      const { data } = await supabase.from('client_sessions')
        .select('*')
        .eq('id', chatParam)
        .eq('restaurant_id', restaurant.id)
        .maybeSingle()
      if (cancelled || !data) return
      const client = data as ClientSession
      rememberClients([client])
      setSelectedClient(client)
      setView('chat')
      const url = new URL(window.location.href)
      url.searchParams.delete('chat')
      window.history.replaceState({}, '', url.pathname + (url.search ? `?${url.searchParams}` : ''))
    })()
    return () => { cancelled = true }
  }, [chatParam, sessionId, clients, restaurant.id, rememberClients])

  useEffect(() => {
    if (supportParam !== '1' || !hasValidSession) return
    void (async () => {
      const conversation = supportConversation || await loadSupportConversation()
      if (!conversation) return
      setView('support')
      void markSupportRead(conversation.id)
      const url = new URL(window.location.href)
      url.searchParams.delete('support')
      window.history.replaceState({}, '', url.pathname + (url.search ? `?${url.searchParams}` : ''))
    })()
  }, [supportParam, hasValidSession, supportConversation, loadSupportConversation, markSupportRead])

  // Nettoyage automatique des coucous expirés (visuel "Coucou ✓")
  useEffect(() => {
    if (Object.keys(outgoingCoucous).length === 0) return
    const timer = window.setInterval(() => {
      const now = Date.now()
      setOutgoingCoucous(prev => {
        const next: Record<string, number> = {}
        let changed = false
        for (const [id, ts] of Object.entries(prev)) {
          if (now - ts < COUCOU_DISPLAY_MS) next[id] = ts
          else changed = true
        }
        return changed ? next : prev
      })
    }, 5000)
    return () => window.clearInterval(timer)
  }, [outgoingCoucous])

  async function sendCoucou(client: ClientSession) {
    if (!sessionId || coucouBusy[client.id]) return
    if (outgoingCoucous[client.id] && Date.now() - outgoingCoucous[client.id] < 8000) return
    setCoucouBusy(prev => ({ ...prev, [client.id]: true }))
    try {
      const res = await fetch('/api/social/coucou', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          sender_session_id: sessionId,
          receiver_session_id: client.id,
        }),
      })
      const json = await res.json() as { data?: SocialMessage; error?: string }
      if (!res.ok) return

      if (json.data) {
        setConversations(prev => appendMessage(prev, client.id, json.data as SocialMessage))
      }
      rememberClients([client])
      setOutgoingCoucous(prev => ({ ...prev, [client.id]: Date.now() }))
      setCoucouFlash({ pseudo: client.pseudo })
      window.setTimeout(() => setCoucouFlash(null), 1800)
    } finally {
      setCoucouBusy(prev => ({ ...prev, [client.id]: false }))
    }
  }

  async function updateMode(mode: SocialMode) {
    if (!sessionId) return
    setSocialMode(mode)
    setModeHint(mode)
    window.setTimeout(() => setModeHint(prev => (prev === mode ? null : prev)), 3500)
    const now = getPresenceStamp()
    const { data } = await supabase.from('client_sessions')
      .update({ social_mode: mode, is_present: true, last_seen_at: now, left_at: null })
      .eq('id', sessionId)
      .eq('restaurant_id', restaurant.id)
      .select()
      .single()
    if (data) setSession(data as ClientSession)
    void loadClients()
  }

  async function sendMessage() {
    if (!sessionId || !selectedClient || !newMsg.trim() || sending) return
    setSending(true)
    try {
      const message = newMsg.trim()
      const { data: receiver } = await supabase.from('client_sessions')
        .select('*')
        .eq('id', selectedClient.id)
        .eq('restaurant_id', restaurant.id)
        .eq('is_present', true)
        .eq('is_remote', false)
        .neq('social_mode', 'invisible')
        .gte('last_seen_at', getPresenceCutoffIso())
        .maybeSingle()

      if (!receiver || !isLiveSocialClient(receiver as ClientSession, restaurant.id, sessionId)) {
        setSelectedClient(null)
        setView('list')
        await loadClients()
        return
      }

      const liveReceiver = receiver as ClientSession
      setSelectedClient(liveReceiver)
      const res = await fetch('/api/social/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          sender_session_id: sessionId,
          receiver_session_id: liveReceiver.id,
          message,
        }),
      })
      const json = await res.json() as { data?: SocialMessage; error?: string }
      if (!res.ok || !json.data) {
        if (res.status === 409) {
          setSelectedClient(null)
          setView('list')
          await loadClients()
        }
        return
      }

      setConversations(prev => appendMessage(prev, liveReceiver.id, json.data as SocialMessage))
      setNewMsg('')
    } finally {
      setSending(false)
    }
  }

  async function sendSupportMessage() {
    if (!sessionId || !supportConversation || !supportInput.trim() || supportSending) return
    setSupportSending(true)
    try {
      const text = supportInput.trim()
      const res = await fetch('/api/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: supportConversation.id,
          sender_type: 'client',
          sender_session_id: sessionId,
          message: text,
        }),
      })
      const json = await res.json() as { data?: SupportMessage }
      if (!res.ok || !json.data) return
      setSupportMessages(prev => appendSupportMessage(prev, json.data as SupportMessage))
      setSupportInput('')
    } finally {
      setSupportSending(false)
    }
  }

  const currentMessages = selectedClient ? (conversations[selectedClient.id] || []) : []
  const supportUnread = supportMessages.filter(m => m.sender_type !== 'client' && !m.is_read).length
  const lastSupportMessage = supportMessages[supportMessages.length - 1]
  const normalizedSearch = search.trim().toLowerCase()
  const filteredClients = clients.filter(c => c.pseudo?.toLowerCase().includes(normalizedSearch))
  const visibleConversationEntries = Object.entries(conversations)
    .filter(([clientId]) => clientId !== sessionId)
    .map(([clientId, msgs]) => ({
      client: clients.find(c => c.id === clientId) || conversationClients[clientId],
      msgs,
    }))
    .filter(entry => {
      if (!entry.client || entry.msgs.length === 0) return false
      const sameDevice = !!sessionFingerprint && entry.client.device_fingerprint === sessionFingerprint
      const sameProfile = !!sessionAvatar && !!sessionPseudo
        && entry.client.avatar_icon === sessionAvatar
        && entry.client.pseudo === sessionPseudo
      if (sameDevice || sameProfile) return false
      return !normalizedSearch || entry.client.pseudo?.toLowerCase().includes(normalizedSearch)
    })
    .sort((a, b) => {
      const aLast = a.msgs[a.msgs.length - 1]?.created_at || ''
      const bLast = b.msgs[b.msgs.length - 1]?.created_at || ''
      return new Date(bLast).getTime() - new Date(aLast).getTime()
    }) as { client: ClientSession; msgs: SocialMessage[] }[]
  const hasConversations = visibleConversationEntries.length > 0
  const conversationClientIds = new Set(visibleConversationEntries.map(entry => entry.client.id))
  const discoveryClients = filteredClients.filter(client => !conversationClientIds.has(client.id))
  const hasDiscovery = discoveryClients.length > 0

  if (!hasValidSession) return (
    <div className="flex flex-col items-center justify-center px-6 text-center" style={{ minHeight: 'calc(100vh - 56px)', backgroundColor: '#F8F8F8' }}>
      <div className="w-20 h-20 rounded-3xl bg-white shadow-sm flex items-center justify-center mb-4">
        <UserRound size={34} className="text-gray-300" />
      </div>
      <p className="font-black text-gray-900 text-lg mb-1">Identifiez-vous d&apos;abord</p>
      <p className="text-gray-400 text-sm max-w-xs mb-5">
        Le Social affiche uniquement les clients qui ont scanné ce restaurant et qui sont encore présents.
      </p>
      <a
        href={`/${restaurant.slug}/menu`}
        className="px-5 py-3 rounded-2xl bg-white border border-gray-200 text-sm font-bold text-gray-700 shadow-sm">
        Retour au menu
      </a>
    </div>
  )

  const flashOverlay = coucouFlash && (
    <div className="pointer-events-none fixed inset-x-0 z-[80] flex justify-center px-4"
      style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}>
      <motion.div
        initial={{ y: -24, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -24, opacity: 0 }}
        className="px-4 py-2.5 rounded-full bg-white flex items-center gap-2"
        style={{ boxShadow: '0 12px 32px rgba(0,0,0,0.18)' }}>
        <motion.div
          animate={{ rotate: [0, 18, -12, 8, 0] }}
          transition={{ duration: 0.9 }}>
          <Hand size={20} className="text-orange-500" />
        </motion.div>
        <p className="text-xs font-black text-gray-900">
          Coucou envoyé à {coucouFlash.pseudo}
        </p>
      </motion.div>
    </div>
  )

  // ── VUE LISTE ──
  if (view === 'list') return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 56px)', backgroundColor: '#F8F8F8' }}>
      <AnimatePresence>{flashOverlay}</AnimatePresence>

      <div className="bg-white px-4 pt-5 pb-4" style={{ boxShadow: '0 1px 0 #F0F0F0' }}>
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="relative">
            <TwemojiAvatar avatarId={session?.avatar_icon || ''} size={42} />
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white"
              style={{ backgroundColor: MODE_INFO[socialMode].color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-gray-900 text-base leading-tight truncate">{session?.pseudo || 'Moi'}</p>
            <p className="text-[11px] mt-0.5 truncate">
              <span className="font-black" style={{ color: MODE_INFO[socialMode].color }}>{MODE_INFO[socialMode].label}</span>
              <span className="text-gray-400 font-medium"> · {MODE_INFO[socialMode].short}</span>
            </p>
          </div>
          <div className="flex gap-1.5">
            {(Object.keys(MODE_INFO) as SocialMode[]).map(key => {
              const info = MODE_INFO[key]
              return (
                <button key={key} onClick={() => updateMode(key)}
                  aria-label={`${info.label} — ${info.long}`}
                  title={`${info.label} — ${info.long}`}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                  style={socialMode === key
                    ? { backgroundColor: info.color + '20', border: `2px solid ${info.color}` }
                    : { backgroundColor: '#F5F5F5', border: '2px solid transparent' }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: info.color }} />
                </button>
              )
            })}
          </div>
        </div>

        <AnimatePresence>
          {modeHint && (
            <motion.div
              key={modeHint}
              initial={{ opacity: 0, y: -6, scaleY: 0.9 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={{ opacity: 0, y: -6, scaleY: 0.9 }}
              transition={{ duration: 0.18 }}
              className="rounded-xl px-3 py-2 mb-3 flex items-start gap-2"
              style={{ backgroundColor: MODE_INFO[modeHint].color + '15', border: `1px solid ${MODE_INFO[modeHint].color}30` }}>
              <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: MODE_INFO[modeHint].color }} />
              <p className="text-[11px] leading-snug">
                <span className="font-black" style={{ color: MODE_INFO[modeHint].color }}>Mode {MODE_INFO[modeHint].label}.</span>
                <span className="text-gray-600"> {MODE_INFO[modeHint].long}</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Rechercher..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-gray-100 text-sm outline-none text-gray-900 placeholder-gray-400"
            style={{ fontSize: '16px' }} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="px-2 pt-3">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={async () => {
              const conversation = supportConversation || await loadSupportConversation()
              if (!conversation) return
              setView('support')
              void markSupportRead(conversation.id)
            }}
            className="w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-left bg-white border border-orange-100 shadow-sm">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${p}15` }}>
              <Headset size={22} style={{ color: p }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-black text-gray-950 truncate">Personnel du restaurant</p>
                {lastSupportMessage && (
                  <p className="text-xs text-gray-400 flex-shrink-0 ml-2">{formatTimeAgo(lastSupportMessage.created_at)}</p>
                )}
              </div>
              <p className={`text-sm truncate mt-0.5 ${supportUnread > 0 ? 'text-gray-800 font-semibold' : 'text-gray-500'}`}>
                {lastSupportMessage
                  ? `${lastSupportMessage.sender_type === 'client' ? 'Vous : ' : ''}${lastSupportMessage.message}`
                  : 'Une question ? Le personnel vous répond ici.'}
              </p>
            </div>
            {supportUnread > 0 && (
              <span className="w-5 h-5 rounded-full text-white text-xs font-black flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: p }}>{supportUnread}</span>
            )}
          </motion.button>
        </div>

        {hasConversations && (
          <div className="px-2 pt-3">
            <div>
              {visibleConversationEntries.map(({ client, msgs }) => {
                const lastMsg = msgs[msgs.length - 1]
                if (!lastMsg) return null
                const unread = msgs.filter(m => m.sender_session_id !== session?.id && !m.is_read).length
                return (
                  <motion.button key={client.id} whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedClient(client)
                      setView('chat')
                      void markConversationRead(client.id)
                    }}
                    className="w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-left active:bg-white">
                    <div className="relative flex-shrink-0">
                      <TwemojiAvatar avatarId={client.avatar_icon || 'ghost'} size={52} />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white"
                        style={{ backgroundColor: client.social_mode === 'receptif' ? '#10B981' : '#F59E0B' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-[15px] truncate ${unread > 0 ? 'font-black text-gray-950' : 'font-bold text-gray-900'}`}>
                          {client.pseudo}
                        </p>
                        <p className="text-xs text-gray-400 flex-shrink-0 ml-2">{formatTimeAgo(lastMsg.created_at)}</p>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between">
                        <p className={`text-sm truncate max-w-[230px] ${unread > 0 ? 'text-gray-800 font-semibold' : 'text-gray-500'}`}>
                          {lastMsg.trigger_type === 'coucou' ? (
                            <span className="inline-flex items-center gap-1">
                              <Hand size={13} />
                              <span>
                                {lastMsg.sender_session_id === session?.id ? 'Vous avez envoyé un coucou' : 'Vous a envoyé un coucou'}
                              </span>
                            </span>
                          ) : (
                            <>{lastMsg.sender_session_id === session?.id ? 'Vous : ' : ''}{lastMsg.message}</>
                          )}
                        </p>
                        {unread > 0 && (
                          <span className="w-5 h-5 rounded-full text-white text-xs font-black flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: p }}>{unread}</span>
                        )}
                      </div>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </div>
        )}

        {hasDiscovery && (
          <div className="px-4 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">En salle</p>
              <p className="text-[10px] font-bold text-gray-300">Tap pour ouvrir · Coucou pour briser la glace</p>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {discoveryClients.map((client, i) => {
                const sent = !!outgoingCoucous[client.id]
                const busy = !!coucouBusy[client.id]
                return (
                  <motion.div key={client.id}
                    initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex flex-col items-center gap-2 flex-shrink-0 w-[78px]">
                    <button
                      onClick={() => { setSelectedClient(client); setView('chat') }}
                      className="flex flex-col items-center gap-1">
                      <div className="relative">
                        <TwemojiAvatar avatarId={client.avatar_icon || ''} size={54} />
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white"
                          style={{ backgroundColor: client.social_mode === 'receptif' ? '#10B981' : '#F59E0B' }} />
                      </div>
                      <p className="text-xs font-bold text-gray-700 max-w-[70px] truncate">{client.pseudo}</p>
                    </button>
                    <motion.button whileTap={{ scale: 0.9 }}
                      onClick={() => sendCoucou(client)}
                      disabled={busy || sent}
                      className="w-full px-2 py-1 rounded-full text-[10px] font-black transition-all flex items-center justify-center gap-1"
                      style={sent
                        ? { backgroundColor: '#ECFDF5', color: '#059669' }
                        : { backgroundColor: `${p}15`, color: p }}>
                      {sent ? (
                        <>
                          <Check size={12} />
                          <span>Coucou</span>
                        </>
                      ) : busy ? (
                        <span>...</span>
                      ) : (
                        <>
                          <Hand size={12} />
                          <span>Coucou</span>
                        </>
                      )}
                    </motion.button>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

        {!hasDiscovery && !hasConversations && (
          <div className="flex flex-col items-center justify-center py-24 text-center px-6">
            <div className="w-20 h-20 rounded-3xl bg-white shadow-sm flex items-center justify-center mb-4">
              <Moon size={40} className="text-gray-300" />
            </div>
            <p className="font-black text-gray-900 text-lg mb-1">
              {normalizedSearch ? 'Aucun profil' : 'Aucun message'}
            </p>
          </div>
        )}
      </div>
    </div>
  )

  if (view === 'support') return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md flex-col bg-white" style={{ height: '100dvh' }}>
      <div className="flex items-center gap-3 px-4 py-3 bg-white flex-shrink-0"
        style={{ borderBottom: '1px solid #F0F0F0', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setView('list')}
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#F5F5F5' }}>
          <ChevronLeft size={20} className="text-gray-700" />
        </motion.button>
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${p}15` }}>
          <Headset size={20} style={{ color: p }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-gray-900 text-sm">Personnel du restaurant</p>
          <p className="text-xs text-gray-400">Assistance client</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3" style={{ backgroundColor: '#F8F8F8' }}>
        {supportMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
            <div className="w-16 h-16 rounded-3xl bg-white shadow-sm flex items-center justify-center mb-4">
              <Headset size={30} className="text-gray-300" />
            </div>
            <p className="font-black text-gray-900 mb-1">Une question au personnel ?</p>
            <p className="text-sm text-gray-400">Écrivez ici pour demander de l’aide, de l’eau, l’addition ou une précision.</p>
          </div>
        )}

        <AnimatePresence>
          {supportMessages.map((msg, i) => {
            const isMe = msg.sender_type === 'client'
            const showTime = i === 0 || (new Date(msg.created_at).getTime() - new Date(supportMessages[i-1].created_at).getTime()) > 5 * 60 * 1000
            return (
              <motion.div key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.18 }}>
                {showTime && (
                  <p className="text-center text-xs text-gray-400 my-4 font-medium">{formatTimeAgo(msg.created_at)}</p>
                )}
                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                  {!isMe && (
                    <div className="w-7 h-7 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Headset size={14} style={{ color: p }} />
                    </div>
                  )}
                  <div className={`max-w-[78%] px-4 py-2.5 text-sm leading-relaxed ${isMe ? 'rounded-3xl rounded-br-lg text-white' : 'rounded-3xl rounded-bl-lg bg-white text-gray-900 shadow-sm'}`}
                    style={isMe ? { backgroundColor: p, boxShadow: `0 2px 8px ${p}40` } : undefined}>
                    {msg.sender_type === 'bot' && (
                      <span className="block text-[10px] font-black uppercase tracking-wider mb-1 opacity-60">Tantie</span>
                    )}
                    {msg.message}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white px-4 py-3 flex-shrink-0"
        style={{ borderTop: '1px solid #F0F0F0', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center rounded-full px-4 h-10" style={{ backgroundColor: '#F0F2F5' }}>
            <input
              type="text"
              placeholder="Écrire au personnel..."
              value={supportInput}
              onChange={e => setSupportInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendSupportMessage()}
              className="flex-1 bg-transparent text-sm outline-none text-gray-900 placeholder-gray-400"
              style={{ fontSize: '16px' }}
            />
          </div>
          <motion.button whileTap={{ scale: 0.88 }} onClick={sendSupportMessage}
            disabled={!supportInput.trim() || supportSending || !supportConversation}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 disabled:opacity-35 transition-all"
            style={{ backgroundColor: supportInput.trim() ? p : '#9CA3AF' }}>
            {supportSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} strokeWidth={2.7} />}
          </motion.button>
        </div>
      </div>
    </div>
  )

  // ── VUE CHAT ──
  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md flex-col bg-white" style={{ height: '100dvh' }}>
      <AnimatePresence>{flashOverlay}</AnimatePresence>

      {/* Header chat style Messenger */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white flex-shrink-0"
        style={{ borderBottom: '1px solid #F0F0F0', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setView('list')}
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#F5F5F5' }}>
          <ChevronLeft size={20} className="text-gray-700" />
        </motion.button>

        <div className="relative flex-shrink-0">
          <TwemojiAvatar avatarId={selectedClient?.avatar_icon || ''} size={40} />
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
            style={{ backgroundColor: selectedClient?.social_mode === 'receptif' ? '#10B981' : '#D1D5DB' }} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-black text-gray-900 text-sm">{selectedClient?.pseudo}</p>
          <p className="text-xs" style={{ color: selectedClient?.social_mode === 'receptif' ? '#10B981' : '#9CA3AF' }}>
            {selectedClient?.social_mode === 'receptif' ? 'En ligne' : 'Absent'}
          </p>
        </div>

      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3" style={{ backgroundColor: '#F8F8F8' }}>
        {currentMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <TwemojiAvatar avatarId={selectedClient?.avatar_icon || ''} size={64} className="mb-4" />
            <p className="font-black text-gray-900">{selectedClient?.pseudo}</p>
          </div>
        )}

        <AnimatePresence>
          {currentMessages.map((msg, i) => {
            const isMe = msg.sender_session_id === session?.id
            const isCoucou = msg.trigger_type === 'coucou'
            const showTime = i === 0 || (new Date(msg.created_at).getTime() - new Date(currentMessages[i-1].created_at).getTime()) > 5 * 60 * 1000
            const showAvatar = !isMe && (i === currentMessages.length - 1 || currentMessages[i + 1]?.sender_session_id !== msg.sender_session_id)

            return (
              <motion.div key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.18 }}>
                {showTime && (
                  <p className="text-center text-xs text-gray-400 my-4 font-medium">{formatTimeAgo(msg.created_at)}</p>
                )}
                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                  {!isMe && (
                    <div style={{ width: 30, flexShrink: 0 }}>
                      {showAvatar && <TwemojiAvatar avatarId={selectedClient?.avatar_icon || ''} size={28} />}
                    </div>
                  )}
                  <div className={`max-w-[72%] px-4 py-2.5 text-sm leading-relaxed ${isMe ? 'rounded-3xl rounded-br-lg' : 'rounded-3xl rounded-bl-lg'}`}
                    style={isMe
                      ? { backgroundColor: p, color: '#fff', boxShadow: `0 2px 8px ${p}40` }
                      : isCoucou
                        ? { backgroundColor: '#FFF7F0', color: '#9A3412', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
                        : { backgroundColor: '#fff', color: '#111', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                    {isCoucou ? (
                      <span className="inline-flex items-center gap-1.5 font-black">
                        <Hand size={14} strokeWidth={2.6} />
                        <span>Coucou</span>
                      </span>
                    ) : msg.message}
                  </div>
                  {isMe && (
                    <div style={{ width: 30, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
                      {showAvatar && <TwemojiAvatar avatarId={session?.avatar_icon || ''} size={28} />}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white px-4 py-3 flex-shrink-0"
        style={{ borderTop: '1px solid #F0F0F0', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#F0F2F5' }}>
            <Plus size={18} className="text-gray-500" />
          </button>
          <div className="flex-1 flex items-center rounded-full px-4 h-10 gap-2" style={{ backgroundColor: '#F0F2F5' }}>
            <input type="text" placeholder="Aa"
              value={newMsg} onChange={e => setNewMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              className="flex-1 bg-transparent text-sm outline-none text-gray-900 placeholder-gray-400"
              style={{ fontSize: '16px' }} />
          </div>
          <motion.button whileTap={{ scale: 0.88 }} onClick={sendMessage}
            disabled={!newMsg.trim() || sending}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0 disabled:opacity-35 transition-all"
            style={{ backgroundColor: newMsg.trim() ? p : '#9CA3AF' }}>
            <Send size={15} strokeWidth={2.7} />
          </motion.button>
        </div>
      </div>
    </div>
  )
}
