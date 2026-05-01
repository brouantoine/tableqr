'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useSessionStore } from '@/lib/store'
import { getPresenceCutoffIso, isLiveSocialClient } from '@/lib/social/presence'
import type { ClientSession, Restaurant } from '@/types'

export default function MatchPage({ restaurant }: { restaurant: Restaurant }) {
  const { session } = useSessionStore()
  const [conversations, setConversations] = useState<ClientSession[]>([])
  const [matchVotes, setMatchVotes] = useState<Record<string, boolean>>({})
  const [matchResults, setMatchResults] = useState<Record<string, boolean>>({})
  const [contactInput, setContactInput] = useState('')
  const [sharingWith, setSharingWith] = useState<string | null>(null)
  const p = restaurant.primary_color
  const sessionId = session?.id
  const sessionRestaurantId = session?.restaurant_id

  const loadConversations = useCallback(async () => {
    if (!sessionId || sessionRestaurantId !== restaurant.id) return
    // Charger les gens avec qui on a échangé des messages
    const { data } = await supabase.from('social_messages')
      .select('sender_session_id, receiver_session_id')
      .eq('restaurant_id', restaurant.id)
      .or(`sender_session_id.eq.${sessionId},receiver_session_id.eq.${sessionId}`)
    if (!data) return

    const ids = [...new Set(data.flatMap(m => [m.sender_session_id, m.receiver_session_id])
      .filter(id => id !== sessionId))]

    if (ids.length === 0) return
    const { data: clients } = await supabase.from('client_sessions')
      .select('*')
      .in('id', ids)
      .eq('restaurant_id', restaurant.id)
      .eq('is_present', true)
      .eq('is_remote', false)
      .neq('social_mode', 'invisible')
      .gte('last_seen_at', getPresenceCutoffIso())
    setConversations((clients || []).filter(client =>
      isLiveSocialClient(client as ClientSession, restaurant.id, sessionId)
    ) as ClientSession[])
  }, [restaurant.id, sessionId, sessionRestaurantId])

  useEffect(() => {
    if (!sessionId) return
    const refreshTimer = window.setTimeout(() => {
      void loadConversations()
    }, 0)
    return () => window.clearTimeout(refreshTimer)
  }, [sessionId, loadConversations])

  async function vote(targetId: string, liked: boolean) {
    if (!session) return
    setMatchVotes(prev => ({ ...prev, [targetId]: liked }))

    if (!liked) return

    // Vérifier si match existant
    const { data: existing } = await supabase.from('matches')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .or(`and(session_a_id.eq.${session.id},session_b_id.eq.${targetId}),and(session_a_id.eq.${targetId},session_b_id.eq.${session.id})`)
      .single()

    if (existing) {
      // Mettre à jour le vote
      const isA = existing.session_a_id === session.id
      const update: { session_a_voted?: boolean; session_b_voted?: boolean; is_matched?: boolean } =
        isA ? { session_a_voted: true } : { session_b_voted: true }
      // Vérifier si les deux ont voté oui
      const bothMatch = isA ? existing.session_b_voted === true : existing.session_a_voted === true
      if (bothMatch) update.is_matched = true
      await supabase.from('matches').update(update).eq('id', existing.id)
      if (bothMatch) setMatchResults(prev => ({ ...prev, [targetId]: true }))
    } else {
      // Créer le match
      await supabase.from('matches').insert({
        restaurant_id: restaurant.id,
        session_a_id: session.id,
        session_b_id: targetId,
        session_a_voted: true,
        session_b_voted: null,
        is_matched: false,
      })
    }
  }

  async function shareContact(targetId: string) {
    if (!session || !contactInput.trim()) return
    const { data: existing } = await supabase.from('matches')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .or(`and(session_a_id.eq.${session.id},session_b_id.eq.${targetId}),and(session_a_id.eq.${targetId},session_b_id.eq.${session.id})`)
      .single()
    if (!existing) return
    const isA = existing.session_a_id === session.id
    await supabase.from('matches').update(
      isA ? { session_a_contact: contactInput, session_a_shared_contact: true }
          : { session_b_contact: contactInput, session_b_shared_contact: true }
    ).eq('id', existing.id)
    setSharingWith(null)
    setContactInput('')
    alert('Contact partagé ! 💌')
  }

  if (conversations.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
        <span className="text-6xl mb-4">💬</span>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Pas encore de conversations</h2>
        <p className="text-gray-500 text-sm">Échangez avec d&apos;autres clients dans l&apos;onglet Social d&apos;abord !</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white px-4 py-4 shadow-sm">
        <h1 className="font-bold text-gray-900 text-lg">Match 💘</h1>
        <p className="text-sm text-gray-500">La soirée se termine... et vous ?</p>
      </div>

      <div className="px-4 pt-6 space-y-4">
        <p className="text-sm text-gray-600 text-center italic">
          &ldquo;C&apos;était une belle soirée. Est-ce que vous avez cliqué avec quelqu&apos;un ?&rdquo;
        </p>
        {conversations.map(client => {
          const voted = matchVotes[client.id] !== undefined
          const matched = matchResults[client.id]
          return (
            <div key={client.id} className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">{client.avatar_icon}</span>
                <div>
                  <p className="font-bold text-gray-900">{client.pseudo}</p>
                  <p className="text-xs text-gray-500">Vous avez échangé ce soir</p>
                </div>
              </div>

              {matched ? (
                <div className="text-center py-3">
                  <p className="text-2xl mb-1">🎉</p>
                  <p className="font-bold text-green-600">C&apos;est un match !</p>
                  {sharingWith === client.id ? (
                    <div className="mt-3 flex gap-2">
                      <input value={contactInput} onChange={e => setContactInput(e.target.value)}
                        placeholder="Ton numéro ou Instagram..."
                        className="flex-1 px-3 py-2 bg-gray-100 rounded-xl text-sm outline-none" />
                      <button onClick={() => shareContact(client.id)}
                        className="px-4 py-2 rounded-xl text-white text-sm font-bold" style={{ backgroundColor: p }}>
                        Envoyer
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setSharingWith(client.id)} className="mt-3 text-sm underline" style={{ color: p }}>
                      Partager mon contact 💌
                    </button>
                  )}
                </div>
              ) : voted ? (
                <div className="text-center py-3">
                  {matchVotes[client.id]
                    ? <p className="text-gray-500 text-sm">💌 Vote envoyé, en attente de réponse...</p>
                    : <p className="text-gray-500 text-sm">Bonne soirée quand même !</p>
                  }
                </div>
              ) : (
                <div className="flex gap-3">
                  <button onClick={() => vote(client.id, false)}
                    className="flex-1 py-3 rounded-xl bg-gray-100 font-bold text-gray-600 text-lg">
                    👋 Bonne soirée
                  </button>
                  <button onClick={() => vote(client.id, true)}
                    className="flex-1 py-3 rounded-xl text-white font-bold text-lg"
                    style={{ backgroundColor: p }}>
                    💘 On matche ?
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
