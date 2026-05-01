'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import TwemojiAvatar from './TwemojiAvatar'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'
import { useSessionStore } from '@/lib/store'
import { getPresenceCutoffIso, getPresenceStamp, isLiveSocialClient } from '@/lib/social/presence'
import { formatTimeAgo } from '@/lib/utils'
import { Send, ChevronLeft, Search, MoreVertical, Moon, UserRound } from 'lucide-react'
import type { ClientSession, SocialMessage, Restaurant } from '@/types'

type SocialMode = 'receptif' | 'discret' | 'invisible'

export default function SocialPage({ restaurant }: { restaurant: Restaurant }) {
  const { session, setSession } = useSessionStore()
  const [view, setView] = useState<'list' | 'chat'>('list')
  const [clients, setClients] = useState<ClientSession[]>([])
  const [conversations, setConversations] = useState<Record<string, SocialMessage[]>>({})
  const [selectedClient, setSelectedClient] = useState<ClientSession | null>(null)
  const [socialMode, setSocialMode] = useState<SocialMode>((session?.social_mode as SocialMode) || 'receptif')
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const p = restaurant.primary_color

  const sessionId = session?.id
  const sessionRestaurantId = session?.restaurant_id
  const selectedClientId = selectedClient?.id
  const hasValidSession = Boolean(sessionId && sessionRestaurantId === restaurant.id)

  const loadClients = useCallback(async () => {
    if (!sessionId || sessionRestaurantId !== restaurant.id) return
    const { data, error } = await supabase.from('client_sessions')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .eq('is_present', true)
      .eq('is_remote', false)
      .neq('social_mode', 'invisible')
      .neq('id', sessionId)
      .gte('last_seen_at', getPresenceCutoffIso())
      .order('last_seen_at', { ascending: false })

    if (error) {
      console.error('Load social clients error:', error)
      setClients([])
      return
    }

    setClients((data || []).filter(client =>
      isLiveSocialClient(client as ClientSession, restaurant.id, sessionId)
    ) as ClientSession[])
  }, [restaurant.id, sessionId, sessionRestaurantId])

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
  }, [restaurant.id, sessionId, sessionRestaurantId])

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

  useEffect(() => {
    setSocialMode((session?.social_mode as SocialMode) || 'receptif')
  }, [session?.social_mode])

  useEffect(() => {
    if (!hasValidSession || !sessionId) return
    void loadClients()
    void loadAllMessages()

    const messagesChannel = supabase.channel(`social-messages-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'social_messages',
        filter: `receiver_session_id=eq.${sessionId}`
      }, async (payload) => {
        const msg = payload.new as SocialMessage
        if (msg.restaurant_id !== restaurant.id) return

        setConversations(prev => ({
          ...prev,
          [msg.sender_session_id]: [...(prev[msg.sender_session_id] || []), msg]
        }))

        await supabase.from('notifications').insert({
          restaurant_id: restaurant.id, session_id: sessionId,
          type: 'message', title: 'Nouveau message',
          body: msg.message.length > 40 ? msg.message.slice(0, 40) + '...' : msg.message,
          data: { sender_id: msg.sender_session_id },
        })

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
  }, [hasValidSession, sessionId, restaurant.id, loadClients, loadAllMessages])

  useEffect(() => {
    if (view === 'chat') setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [view, conversations, selectedClient])

  useEffect(() => {
    if (!selectedClientId) return
    const freshClient = clients.find(client => client.id === selectedClientId)
    if (!freshClient) {
      setSelectedClient(null)
      setView('list')
      return
    }
    setSelectedClient(freshClient)
  }, [clients, selectedClientId])

  useEffect(() => {
    if (view === 'chat' && selectedClientId) void markConversationRead(selectedClientId)
  }, [view, selectedClientId, markConversationRead])

  async function updateMode(mode: SocialMode) {
    if (!sessionId) return
    setSocialMode(mode)
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
      const { data } = await supabase.from('social_messages').insert({
        restaurant_id: restaurant.id,
        sender_session_id: sessionId,
        receiver_session_id: liveReceiver.id,
        message,
        is_anonymous: true,
      }).select().single()

      if (data) setConversations(prev => ({
        ...prev, [liveReceiver.id]: [...(prev[liveReceiver.id] || []), data as SocialMessage]
      }))
      setNewMsg('')
    } finally {
      setSending(false)
    }
  }

  const currentMessages = selectedClient ? (conversations[selectedClient.id] || []) : []
  const normalizedSearch = search.trim().toLowerCase()
  const filteredClients = clients.filter(c => c.pseudo?.toLowerCase().includes(normalizedSearch))
  const visibleConversationEntries = Object.entries(conversations)
    .map(([clientId, msgs]) => ({
      client: clients.find(c => c.id === clientId),
      msgs,
    }))
    .filter(entry =>
      entry.client &&
      entry.msgs.length > 0 &&
      (!normalizedSearch || entry.client.pseudo?.toLowerCase().includes(normalizedSearch))
    )
    .sort((a, b) => {
      const aLast = a.msgs[a.msgs.length - 1]?.created_at || ''
      const bLast = b.msgs[b.msgs.length - 1]?.created_at || ''
      return new Date(bLast).getTime() - new Date(aLast).getTime()
    }) as { client: ClientSession; msgs: SocialMessage[] }[]
  const hasConversations = visibleConversationEntries.length > 0

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

  // ── VUE LISTE ──
  if (view === 'list') return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 56px)', backgroundColor: '#F8F8F8' }}>

      {/* Header — Mon profil */}
      <div className="bg-white px-4 pt-5 pb-4" style={{ boxShadow: '0 1px 0 #F0F0F0' }}>
        {/* Mon profil */}
        <div className="flex items-center gap-3 mb-4 px-1">
          <div className="relative">
            <TwemojiAvatar avatarId={session?.avatar_icon || ''} size={48} />
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white"
              style={{ backgroundColor: socialMode === 'receptif' ? '#10B981' : socialMode === 'discret' ? '#F59E0B' : '#9CA3AF' }} />
          </div>
          <div className="flex-1">
            <p className="font-black text-gray-900">{session?.pseudo || 'Moi'}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs font-medium" style={{ color: socialMode === 'receptif' ? '#10B981' : socialMode === 'discret' ? '#F59E0B' : '#9CA3AF' }}>
                {socialMode === 'receptif' ? '● Disponible' : socialMode === 'discret' ? '● Discret' : '● Invisible'}
              </span>
              <span className="text-gray-300 text-xs">·</span>
              <span className="text-xs text-gray-400">{restaurant.name}</span>
            </div>
          </div>
          {/* Mode switcher compact */}
          <div className="flex gap-1.5">
            {[
              { key: 'receptif', color: '#10B981', label: '●' },
              { key: 'discret', color: '#F59E0B', label: '●' },
              { key: 'invisible', color: '#9CA3AF', label: '●' },
            ].map(m => (
              <button key={m.key} onClick={() => updateMode(m.key as SocialMode)}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                style={socialMode === m.key
                  ? { backgroundColor: m.color + '20', border: `2px solid ${m.color}` }
                  : { backgroundColor: '#F5F5F5', border: '2px solid transparent' }}>
                <span style={{ color: m.color, fontSize: '10px' }}>●</span>
              </button>
            ))}
          </div>
        </div>

        {/* Barre recherche */}
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Rechercher..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-gray-100 text-sm outline-none text-gray-900 placeholder-gray-400"
            style={{ fontSize: '16px' }} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">

        {/* Bulles des gens présents */}
        {filteredClients.length > 0 && (
          <div className="px-4 py-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
              Dans le restaurant · {clients.length}
            </p>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {filteredClients.map((client, i) => (
                <motion.button key={client.id}
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }} whileTap={{ scale: 0.92 }}
                  onClick={() => { setSelectedClient(client); setView('chat') }}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div className="relative">
                    <TwemojiAvatar avatarId={client.avatar_icon || ''} size={52} />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white"
                      style={{ backgroundColor: client.social_mode === 'receptif' ? '#10B981' : '#F59E0B' }} />
                  </div>
                  <p className="text-xs font-bold text-gray-700 max-w-[52px] truncate">{client.pseudo}</p>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Conversations */}
        {hasConversations && (
          <div className="px-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Messages</p>
            <div className="space-y-1">
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
                    className="w-full flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 text-left"
                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div className="relative flex-shrink-0">
                      <TwemojiAvatar avatarId={client.avatar_icon || 'ghost'} size={46} />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                        style={{ backgroundColor: client.social_mode === 'receptif' ? '#10B981' : '#F59E0B' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className={`text-sm truncate ${unread > 0 ? 'font-black text-gray-900' : 'font-semibold text-gray-800'}`}>
                          {client.pseudo}
                        </p>
                        <p className="text-xs text-gray-400 flex-shrink-0 ml-2">{formatTimeAgo(lastMsg.created_at)}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className={`text-xs truncate max-w-[200px] ${unread > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                          {lastMsg.sender_session_id === session?.id ? 'Vous : ' : ''}{lastMsg.message}
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

        {/* Vide */}
        {filteredClients.length === 0 && !hasConversations && (
          <div className="flex flex-col items-center justify-center py-24 text-center px-6">
            <div className="w-20 h-20 rounded-3xl bg-white shadow-sm flex items-center justify-center mb-4">
              <Moon size={40} className="text-gray-300" />
            </div>
            <p className="font-black text-gray-900 text-lg mb-1">
              {normalizedSearch ? 'Aucun profil' : 'Espace calme'}
            </p>
            <p className="text-gray-400 text-sm">
              {normalizedSearch ? 'Aucun client présent ne correspond à cette recherche.' : 'Personne d&apos;autre pour l&apos;instant.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )

  // ── VUE CHAT ──
  return (
    <div className="flex flex-col bg-white" style={{ height: '100dvh' }}>

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

        <button className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center">
          <MoreVertical size={16} className="text-gray-400" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ backgroundColor: '#F8F8F8' }}>
        {currentMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <TwemojiAvatar avatarId={selectedClient?.avatar_icon || ''} size={64} className="mb-4" />
            <p className="font-black text-gray-900">{selectedClient?.pseudo}</p>
            <p className="text-gray-400 text-sm mt-1 max-w-xs">Envoyez un message anonyme — personne ne saura qui vous êtes 👻</p>
          </div>
        )}

        <AnimatePresence>
          {currentMessages.map((msg, i) => {
            const isMe = msg.sender_session_id === session?.id
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
                      : { backgroundColor: '#fff', color: '#111', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                    {msg.message}
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
          <TwemojiAvatar avatarId={session?.avatar_icon || ''} size={32} className="flex-shrink-0" />
          <div className="flex-1 flex items-center rounded-3xl px-4 py-2.5 gap-2" style={{ backgroundColor: '#F5F5F5' }}>
            <input type="text" placeholder="Message anonyme..."
              value={newMsg} onChange={e => setNewMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              className="flex-1 bg-transparent text-sm outline-none text-gray-900 placeholder-gray-400"
              style={{ fontSize: '16px' }} />
          </div>
          <motion.button whileTap={{ scale: 0.88 }} onClick={sendMessage}
            disabled={!newMsg.trim() || sending}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40 transition-all"
            style={{ backgroundColor: newMsg.trim() ? p : '#D1D5DB', boxShadow: newMsg.trim() ? `0 4px 12px ${p}50` : 'none' }}>
            <Send size={16} strokeWidth={2.5} />
          </motion.button>
        </div>
      </div>
    </div>
  )
}
