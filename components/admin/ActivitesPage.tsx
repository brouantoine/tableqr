'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'
import type { Restaurant } from '@/types'

const MODULES = [
  { key: 'module_social', label: 'Espace Social', icon: '💬', desc: 'Messagerie anonyme, modes de visibilité', color: '#3B82F6', bg: '#EFF6FF' },
  { key: 'module_games', label: 'Mini-Jeux', icon: '🎮', desc: 'Quiz, trivia, jeux couple et famille', color: '#8B5CF6', bg: '#F5F3FF' },
  { key: 'module_birthday', label: 'Anniversaire', icon: '🎂', desc: 'Détection, cadeau surprise, chanson', color: '#EC4899', bg: '#FDF2F8' },
  { key: 'module_loyalty', label: 'Fidélité', icon: '⭐', desc: 'Points, historique, récompenses', color: '#F59E0B', bg: '#FFFBEB' },
  { key: 'module_delivery', label: 'Livraison', icon: '🛵', desc: 'Commande à distance, vue ambiance', color: '#10B981', bg: '#ECFDF5' },
]

const GAMES = [
  { key: 'quiz', label: 'Quiz Culture G.', icon: '🧠', desc: 'Questions multijoueur', players: '1-4', color: '#8B5CF6' },
  { key: 'trivia', label: 'Trivia Cuisine', icon: '🍛', desc: 'Gastronomie locale', players: '1-6', color: '#F59E0B' },
  { key: 'couple_quiz', label: 'Quiz Couple', icon: '💑', desc: 'Vous connaissez-vous ?', players: '2', color: '#EC4899' },
  { key: 'mots_croises', label: 'Mots Croisés', icon: '🔤', desc: 'Vocabulaire solo/duo', players: '1-2', color: '#10B981' },
]

export default function ActivitesPage({ restaurant: init }: { restaurant: Restaurant }) {
  const [restaurant, setRestaurant] = useState(init)
  const [saving, setSaving] = useState<string | null>(null)
  const [tab, setTab] = useState<'modules' | 'jeux' | 'bot'>('modules')
  const p = restaurant.primary_color

  async function toggleModule(key: string) {
    setSaving(key)
    const val = !(restaurant as any)[key]
    await supabase.from('restaurants').update({ [key]: val }).eq('id', restaurant.id)
    setRestaurant(prev => ({ ...prev, [key]: val }))
    setSaving(null)
  }

  async function saveBotName(name: string) {
    await supabase.from('restaurants').update({ bot_name: name }).eq('id', restaurant.id)
    setRestaurant(prev => ({ ...prev, bot_name: name }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-black text-xl text-gray-900">Activités & Modules</h2>
          <p className="text-sm text-gray-400 mt-0.5">Personnalisez l&apos;expérience de vos clients</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6">
        <div className="flex gap-1 max-w-7xl mx-auto py-2">
          {[
            { key: 'modules', label: '⚡ Modules' },
            { key: 'jeux', label: '🎮 Jeux' },
            { key: 'bot', label: '🤖 Bot' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
              style={tab === t.key ? { backgroundColor: p, color: '#fff' } : { color: '#9CA3AF' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 sm:px-6 py-5 max-w-7xl mx-auto pb-24">

        {/* MODULES */}
        {tab === 'modules' && (
          <div className="space-y-3">
            <AnimatePresence>
              {MODULES.map((mod, i) => {
                const active = (restaurant as any)[mod.key]
                return (
                  <motion.div key={mod.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ backgroundColor: mod.bg }}>
                      {mod.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-gray-900">{mod.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{mod.desc}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs font-bold" style={{ color: active ? mod.color : '#9CA3AF' }}>
                        {active ? 'Actif' : 'Inactif'}
                      </span>
                      <button onClick={() => toggleModule(mod.key)} disabled={saving === mod.key}
                        className="w-12 h-6 rounded-full transition-all relative flex-shrink-0"
                        style={{ backgroundColor: active ? mod.color : '#E5E7EB' }}>
                        <motion.span animate={{ left: active ? '1.5rem' : '0.25rem' }}
                          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
                          style={{ position: 'absolute' }} />
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        {/* JEUX */}
        {tab === 'jeux' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {GAMES.map((game, i) => (
              <motion.div key={game.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ backgroundColor: game.color + '15' }}>
                  {game.icon}
                </div>
                <div className="flex-1">
                  <p className="font-black text-sm text-gray-900">{game.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{game.desc}</p>
                  <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ backgroundColor: game.color + '15', color: game.color }}>
                    {game.players} joueur{game.players !== '1' ? 's' : ''}
                  </span>
                </div>
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-green-500 text-xs font-black">✓</span>
                </div>
              </motion.div>
            ))}
            <div className="sm:col-span-2 bg-purple-50 border border-purple-100 rounded-3xl p-4">
              <p className="text-xs font-bold text-purple-700 mb-1">🚀 Prochainement</p>
              <p className="text-xs text-purple-500">Morpion · Bataille navale · Devine le plat · Blind test</p>
            </div>
          </div>
        )}

        {/* BOT */}
        {tab === 'bot' && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ backgroundColor: p + '15' }}>🤖</div>
                <div>
                  <p className="font-black text-gray-900">{restaurant.bot_name}</p>
                  <p className="text-xs text-gray-400">Votre assistant virtuel</p>
                </div>
              </div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5">Nom du bot</label>
              <input type="text" defaultValue={restaurant.bot_name}
                onBlur={e => saveBotName(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-gray-50 text-sm outline-none border border-gray-100 focus:border-orange-300" />
              <p className="text-xs text-gray-400 mt-1.5">Cliquez ailleurs pour sauvegarder</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-3xl p-5">
              <p className="font-bold text-blue-800 text-sm mb-2">💡 Le bot répond aux questions clients</p>
              <div className="space-y-1.5">
                {['"C\'est quoi l\'attiéké ?"', '"Ce plat est-il épicé ?"', '"Options végétariennes ?"'].map(q => (
                  <div key={q} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                    <span className="text-xs text-blue-600">{q}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
