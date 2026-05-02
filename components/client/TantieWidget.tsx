'use client'
import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, Headset, Loader2, MessageCircle, Send, Sparkles, X } from 'lucide-react'
import { useSessionStore } from '@/lib/store'
import type { Restaurant } from '@/types'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface BotResponse {
  reply?: string
  action?: 'open_support' | 'need_session'
  conversation_id?: string
  error?: string
}

const SUGGESTIONS = [
  'Que me conseilles-tu ?',
  'Quels plats sont halal ?',
  'Je veux un plat pas trop cher',
  'Je veux parler au personnel',
]

export default function TantieWidget({ restaurant }: { restaurant: Restaurant }) {
  const router = useRouter()
  const { session } = useSessionStore()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const botName = restaurant.bot_name || 'Tantie'
  const primary = restaurant.primary_color
  const initialMessage = useMemo<ChatMessage>(() => ({
    id: 'welcome',
    role: 'assistant',
    content: `Bonjour, je suis ${botName}. Je peux vous renseigner sur les plats, les prix, les allergènes ou vous mettre en relation avec le personnel.`,
  }), [botName])

  if (restaurant.bot_enabled === false) return null

  function openSupport() {
    setOpen(false)
    router.push(`/${restaurant.slug}/social?support=1`)
  }

  async function send(text?: string) {
    const message = (text ?? input).trim()
    if (!message || loading) return

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: message }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          session_id: session?.restaurant_id === restaurant.id ? session.id : undefined,
          message,
          history: nextMessages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const json = await res.json() as BotResponse
      const reply = json.reply || json.error || 'Je ne suis pas sûre. Demandez au personnel du restaurant.'
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: reply }])

      if (json.action === 'open_support') {
        window.setTimeout(openSupport, 900)
      }
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Je n’arrive pas à répondre pour le moment. Vous pouvez demander au personnel.',
      }])
    } finally {
      setLoading(false)
      window.setTimeout(() => inputRef.current?.focus(), 120)
    }
  }

  const visibleMessages = messages.length ? messages : [initialMessage]

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen(true)}
        className="fixed right-4 z-[70] h-[52px] rounded-2xl text-white font-black text-sm flex items-center gap-2 px-4 shadow-2xl"
        style={{
          bottom: 'calc(86px + env(safe-area-inset-bottom))',
          backgroundColor: primary,
          boxShadow: `0 14px 34px ${primary}55`,
        }}>
        <Bot size={19} strokeWidth={2.5} />
        <span>{botName}</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/35 flex items-end justify-center"
            onClick={() => setOpen(false)}>
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="w-full max-w-md bg-white rounded-t-[1.75rem] overflow-hidden flex flex-col"
              style={{ height: 'min(78vh, 680px)' }}
              onClick={(e) => e.stopPropagation()}>
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white"
                  style={{ backgroundColor: primary }}>
                  <Sparkles size={18} strokeWidth={2.4} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-900 text-sm">{botName}</p>
                  <p className="text-xs text-gray-400 truncate">Assistant du restaurant</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                  <X size={15} className="text-gray-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
                {visibleMessages.map(msg => {
                  const isUser = msg.role === 'user'
                  return (
                    <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[82%] rounded-3xl px-4 py-2.5 text-sm leading-relaxed ${
                        isUser ? 'rounded-br-lg text-white' : 'rounded-bl-lg bg-white text-gray-800 shadow-sm'
                      }`} style={isUser ? { backgroundColor: primary } : undefined}>
                        {msg.content}
                      </div>
                    </div>
                  )
                })}
                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-3xl rounded-bl-lg bg-white px-4 py-3 shadow-sm flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-gray-400" />
                      <span className="text-xs font-bold text-gray-400">Tantie écrit...</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-4 py-3 bg-white border-t border-gray-100"
                style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {SUGGESTIONS.map(s => (
                    <button key={s}
                      onClick={() => send(s)}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-bold whitespace-nowrap disabled:opacity-50">
                      {s}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openSupport}
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#FFF7F0' }}>
                    <Headset size={17} style={{ color: primary }} />
                  </button>
                  <div className="flex-1 h-11 rounded-full bg-gray-100 px-4 flex items-center">
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') void send()
                      }}
                      placeholder="Demander à Tantie..."
                      className="w-full bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400"
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => send()}
                    disabled={!input.trim() || loading}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-35 flex-shrink-0"
                    style={{ backgroundColor: primary }}>
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} strokeWidth={2.7} />}
                  </motion.button>
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-gray-400">
                  <MessageCircle size={12} />
                  <span>Pour une demande urgente, utilisez le bouton personnel.</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
