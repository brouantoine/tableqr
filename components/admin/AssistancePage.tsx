'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, ChevronLeft, Clock3, Headset, Loader2, Search, Send, UserRound } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { formatTimeAgo } from '@/lib/utils'
import type { Restaurant, SupportConversation, SupportMessage } from '@/types'

type ConversationRow = SupportConversation & {
  session?: {
    id: string
    pseudo?: string
    avatar_icon?: string
    table?: { table_number?: string } | null
  } | null
}

function appendSupportMessage(prev: SupportMessage[], msg: SupportMessage) {
  if (prev.some(item => item.id === msg.id)) return prev
  return [...prev, msg].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
}

export default function AssistancePage({ restaurant }: { restaurant: Restaurant }) {
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [selected, setSelected] = useState<ConversationRow | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const p = restaurant.primary_color

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter(c =>
      c.session?.pseudo?.toLowerCase().includes(q) ||
      c.session?.table?.table_number?.toLowerCase().includes(q)
    )
  }, [conversations, search])

  const loadConversations = useCallback(async () => {
    const { data } = await supabase
      .from('support_conversations')
      .select('*, session:client_sessions(id, pseudo, avatar_icon, table:restaurant_tables(table_number))')
      .eq('restaurant_id', restaurant.id)
      .order('last_message_at', { ascending: false })

    const rows = (data || []) as ConversationRow[]
    setConversations(rows)
    setSelected(prev => {
      if (prev) return rows.find(row => row.id === prev.id) || rows[0] || null
      return rows[0] || null
    })
    setLoading(false)
  }, [restaurant.id])

  const loadMessages = useCallback(async (conversationId: string) => {
    const res = await fetch(`/api/support/messages?conversation_id=${conversationId}`)
    const json = await res.json() as { data?: SupportMessage[] }
    setMessages(json.data || [])
    await fetch('/api/support/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: conversationId, reader: 'staff' }),
    })
  }, [])

  async function updateStatus(status: 'open' | 'pending' | 'resolved') {
    if (!selected) return
    await supabase.from('support_conversations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', selected.id)
    setSelected(prev => prev ? { ...prev, status } : prev)
    setConversations(prev => prev.map(c => c.id === selected.id ? { ...c, status } : c))
  }

  async function sendMessage() {
    if (!selected || !input.trim() || sending) return
    setSending(true)
    try {
      const text = input.trim()
      const res = await fetch('/api/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: selected.id,
          sender_type: 'staff',
          message: text,
        }),
      })
      const json = await res.json() as { data?: SupportMessage }
      if (json.data) setMessages(prev => appendSupportMessage(prev, json.data as SupportMessage))
      setInput('')
      await updateStatus('pending')
      void loadConversations()
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    void loadConversations()
    const convChannel = supabase.channel(`admin-support-conv-${restaurant.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'support_conversations',
        filter: `restaurant_id=eq.${restaurant.id}`,
      }, () => { void loadConversations() })
      .subscribe()

    const msgChannel = supabase.channel(`admin-support-msg-${restaurant.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `restaurant_id=eq.${restaurant.id}`,
      }, (payload) => {
        const msg = payload.new as SupportMessage
        if (selected?.id === msg.conversation_id) setMessages(prev => appendSupportMessage(prev, msg))
        void loadConversations()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(convChannel)
      supabase.removeChannel(msgChannel)
    }
  }, [restaurant.id, selected?.id, loadConversations])

  useEffect(() => {
    if (selected?.id) void loadMessages(selected.id)
  }, [selected?.id, loadMessages])

  const statusConfig = {
    open: { label: 'Nouveau', color: '#EF4444' },
    pending: { label: 'En cours', color: '#F59E0B' },
    resolved: { label: 'Résolu', color: '#10B981' },
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${p}15` }}>
            <Headset size={20} style={{ color: p }} />
          </div>
          <div>
            <h2 className="font-black text-xl text-gray-900">Assistance clients</h2>
            <p className="text-sm text-gray-400 mt-0.5">Messages envoyés au personnel du restaurant</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-24 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
        <div className={`${selected ? 'hidden lg:block' : 'block'} bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden`}>
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher table ou client..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-100 text-sm outline-none text-gray-900"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-16 flex justify-center"><Loader2 size={22} className="animate-spin text-gray-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 px-6 text-center">
              <Headset size={38} className="text-gray-300 mx-auto mb-3" />
              <p className="font-black text-gray-900 text-sm">Aucune demande</p>
              <p className="text-xs text-gray-400 mt-1">Les messages clients apparaîtront ici.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(conv => {
                const cfg = statusConfig[conv.status] || statusConfig.open
                const active = selected?.id === conv.id
                return (
                  <button key={conv.id}
                    onClick={() => setSelected(conv)}
                    className={`w-full p-4 text-left flex items-center gap-3 transition-colors ${active ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
                    <div className="w-11 h-11 rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <UserRound size={19} className="text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-sm text-gray-900 truncate">{conv.session?.pseudo || 'Client'}</p>
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                      </div>
                      <p className="text-xs text-gray-400 truncate">
                        {conv.session?.table?.table_number ? `Table ${conv.session.table.table_number}` : 'Sans table'} · {formatTimeAgo(conv.last_message_at)}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className={`${selected ? 'flex' : 'hidden lg:flex'} bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[70vh] flex-col`}>
          {selected ? (
            <>
              <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                <button onClick={() => setSelected(null)} className="lg:hidden w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                  <ChevronLeft size={18} className="text-gray-600" />
                </button>
                <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <UserRound size={18} className="text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-900 text-sm truncate">{selected.session?.pseudo || 'Client'}</p>
                  <p className="text-xs text-gray-400">
                    {selected.session?.table?.table_number ? `Table ${selected.session.table.table_number}` : 'Table non liée'}
                  </p>
                </div>
                <div className="flex gap-1">
                  {(['open', 'pending', 'resolved'] as const).map(status => {
                    const cfg = statusConfig[status]
                    return (
                      <button key={status} onClick={() => updateStatus(status)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-black"
                        style={selected.status === status
                          ? { backgroundColor: `${cfg.color}18`, color: cfg.color }
                          : { backgroundColor: '#F3F4F6', color: '#9CA3AF' }}>
                        {status === 'resolved' ? <CheckCircle2 size={13} /> : status === 'pending' ? <Clock3 size={13} /> : cfg.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {messages.map(msg => {
                  const isStaff = msg.sender_type === 'staff'
                  return (
                    <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isStaff ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[78%] rounded-3xl px-4 py-2.5 text-sm leading-relaxed ${
                        isStaff ? 'rounded-br-lg text-white' : 'rounded-bl-lg bg-white text-gray-900 shadow-sm'
                      }`} style={isStaff ? { backgroundColor: p } : undefined}>
                        {msg.sender_type === 'bot' && (
                          <span className="block text-[10px] font-black uppercase tracking-wider mb-1 opacity-60">Tantie</span>
                        )}
                        {msg.message}
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              <div className="p-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder="Répondre au client..."
                    className="flex-1 h-11 rounded-full bg-gray-100 px-4 text-sm outline-none text-gray-900"
                  />
                  <motion.button whileTap={{ scale: 0.9 }}
                    onClick={sendMessage}
                    disabled={!input.trim() || sending}
                    className="w-11 h-11 rounded-full text-white flex items-center justify-center disabled:opacity-40"
                    style={{ backgroundColor: p }}>
                    {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={16} strokeWidth={2.7} />}
                  </motion.button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <Headset size={44} className="text-gray-300 mx-auto mb-3" />
                <p className="font-black text-gray-900">Sélectionnez une demande</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
