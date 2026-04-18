'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useSessionStore } from '@/lib/store'
import type { GameSession, Restaurant } from '@/types'

const GAMES = [
  { type: 'quiz', name: 'Quiz Culture G.', emoji: '🧠', desc: 'Testez vos connaissances', min: 1, max: 4 },
  { type: 'trivia', name: 'Trivia Cuisine', emoji: '🍛', desc: 'Questions sur la gastronomie', min: 1, max: 6 },
  { type: 'couple_quiz', name: 'Quiz Couple', emoji: '💑', desc: 'Vous connaissez-vous vraiment ?', min: 2, max: 2 },
  { type: 'mots_croises', name: 'Mots Croisés', emoji: '🔤', desc: 'Défi vocabulaire en solo', min: 1, max: 1 },
]

export default function GamesPage({ restaurant }: { restaurant: Restaurant }) {
  const { session } = useSessionStore()
  const [activeSessions, setActiveSessions] = useState<GameSession[]>([])
  const [loading, setLoading] = useState(false)
  const [activeGame, setActiveGame] = useState<GameSession | null>(null)
  const p = restaurant.primary_color

  useEffect(() => {
    if (!session) return
    loadGames()
    const channel = supabase.channel(`games-${restaurant.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_sessions', filter: `restaurant_id=eq.${restaurant.id}` },
        () => loadGames())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [session])

  async function loadGames() {
    const { data } = await supabase.from('game_sessions')
      .select('*, players:game_players(*)')
      .eq('restaurant_id', restaurant.id)
      .eq('status', 'waiting')
    setActiveSessions(data || [])
  }

  async function createGame(type: string) {
    if (!session) return
    setLoading(true)
    const game = GAMES.find(g => g.type === type)!
    const { data } = await supabase.from('game_sessions')
      .insert({ restaurant_id: restaurant.id, game_type: type, max_players: game.max, status: 'waiting', current_players: 1 })
      .select().single()
    if (data) {
      await supabase.from('game_players').insert({ game_session_id: data.id, session_id: session.id, is_ready: true })
      setActiveGame(data)
    }
    setLoading(false)
    loadGames()
  }

async function joinGame(gameId: string) {
  if (!session) return

  // Vérifier si déjà dans la partie
  const { data: existing } = await supabase
    .from('game_players')
    .select('id')
    .eq('game_session_id', gameId)
    .eq('session_id', session.id)
    .single()

  if (existing) {
    alert('Tu es déjà dans cette partie !')
    return
  }

  // Vérifier si c'est le créateur
  const game = activeSessions.find(g => g.id === gameId)
  if (!game) return

  // Ajouter le joueur
  await supabase.from('game_players').insert({
    game_session_id: gameId,
    session_id: session.id,
    is_ready: true
  })

  const newCount = game.current_players + 1

  // Mettre à jour le nombre de joueurs
  await supabase.from('game_sessions')
    .update({ current_players: newCount })
    .eq('id', gameId)

  // Si assez de joueurs → lancer le jeu
  if (newCount >= 2) {
    await supabase.from('game_sessions')
      .update({ status: 'playing' })
      .eq('id', gameId)
    
    setActiveGame({ ...game, status: 'playing', current_players: newCount })
    alert('La partie commence ! 🎮')
  } else {
    setActiveGame({ ...game, current_players: newCount })
  }

  loadGames()
}

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white px-4 py-4 shadow-sm">
        <h1 className="font-bold text-gray-900 text-lg">Mini-jeux 🎮</h1>
        <p className="text-sm text-gray-500">Jouez avec d&apos;autres clients du restaurant</p>
      </div>

      {/* Parties en attente */}
      {activeSessions.length > 0 && (
        <div className="px-4 pt-4">
          <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">🔴 En cours / en attente</p>
          <div className="space-y-2">
            {activeSessions.map(gs => {
              const game = GAMES.find(g => g.type === gs.game_type)
              return (
                <div key={gs.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
                  <span className="text-3xl">{game?.emoji}</span>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{game?.name}</p>
                    <p className="text-xs text-gray-500">{gs.current_players}/{gs.max_players} joueurs</p>
                  </div>
                  <button onClick={() => joinGame(gs.id)}
                    className="px-4 py-2 rounded-xl text-white text-sm font-bold"
                    style={{ backgroundColor: p }}>
                    Rejoindre
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Créer une partie */}
      <div className="px-4 pt-5">
        <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Créer une partie</p>
        <div className="grid grid-cols-2 gap-3">
          {GAMES.map(game => (
            <button key={game.type} onClick={() => createGame(game.type)} disabled={loading}
              className="bg-white rounded-2xl p-4 text-left shadow-sm border-2 border-transparent hover:border-orange-200 transition-all">
              <span className="text-3xl block mb-2">{game.emoji}</span>
              <p className="font-bold text-sm text-gray-900">{game.name}</p>
              <p className="text-xs text-gray-500 mt-1">{game.desc}</p>
              <p className="text-xs mt-2 font-medium" style={{ color: p }}>
                {game.min === game.max ? `${game.min} joueur${game.min > 1 ? 's' : ''}` : `${game.min}-${game.max} joueurs`}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Modal jeu actif */}
      {activeGame && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setActiveGame(null)} />
          <div className="relative bg-white w-full max-w-md mx-auto rounded-t-3xl p-6">
            <h2 className="font-bold text-xl text-center mb-2">
              {GAMES.find(g => g.type === activeGame.game_type)?.emoji} Partie créée !
            </h2>
            <p className="text-gray-500 text-sm text-center mb-6">
              En attente des autres joueurs... Partagez le code de la table !
            </p>
            <div className="bg-gray-50 rounded-2xl p-4 text-center mb-4">
              <p className="text-xs text-gray-500 mb-1">Code de partie</p>
              <p className="font-black text-2xl tracking-widest" style={{ color: p }}>
                {activeGame.id.slice(0, 6).toUpperCase()}
              </p>
            </div>
            <button onClick={() => setActiveGame(null)} className="w-full py-3 rounded-2xl bg-gray-100 font-bold text-gray-700">
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
