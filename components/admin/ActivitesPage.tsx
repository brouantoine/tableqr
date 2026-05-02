'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Headset, Save, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import type { Restaurant } from '@/types'

type ModuleKey = 'module_social' | 'module_games' | 'module_birthday' | 'module_loyalty' | 'module_delivery'
type TabKey = 'modules' | 'jeux' | 'bot'

const MODULES = [
  { key: 'module_social', label: 'Espace Social', icon: '💬', desc: 'Messagerie anonyme, modes de visibilité', color: '#3B82F6', bg: '#EFF6FF' },
  { key: 'module_games', label: 'Mini-Jeux', icon: '🎮', desc: 'Quiz, trivia, jeux couple et famille', color: '#8B5CF6', bg: '#F5F3FF' },
  { key: 'module_birthday', label: 'Anniversaire', icon: '🎂', desc: 'Détection, cadeau surprise, chanson', color: '#EC4899', bg: '#FDF2F8' },
  { key: 'module_loyalty', label: 'Fidélité', icon: '⭐', desc: 'Points, historique, récompenses', color: '#F59E0B', bg: '#FFFBEB' },
  { key: 'module_delivery', label: 'Livraison', icon: '🛵', desc: 'Commande à distance, vue ambiance', color: '#10B981', bg: '#ECFDF5' },
] satisfies Array<{ key: ModuleKey; label: string; icon: string; desc: string; color: string; bg: string }>

const GAMES = [
  { key: 'quiz', label: 'Quiz Culture G.', icon: '🧠', desc: 'Questions multijoueur', players: '1-4', color: '#8B5CF6' },
  { key: 'trivia', label: 'Trivia Cuisine', icon: '🍛', desc: 'Gastronomie locale', players: '1-6', color: '#F59E0B' },
  { key: 'couple_quiz', label: 'Quiz Couple', icon: '💑', desc: 'Vous connaissez-vous ?', players: '2', color: '#EC4899' },
  { key: 'mots_croises', label: 'Mots Croisés', icon: '🔤', desc: 'Vocabulaire solo/duo', players: '1-2', color: '#10B981' },
]

export default function ActivitesPage({ restaurant: init }: { restaurant: Restaurant }) {
  const [restaurant, setRestaurant] = useState(init)
  const [saving, setSaving] = useState<string | null>(null)
  const [tab, setTab] = useState<TabKey>('modules')
  const [botForm, setBotForm] = useState({
    bot_enabled: restaurant.bot_enabled !== false,
    bot_name: restaurant.bot_name || 'Tantie',
    bot_personality: restaurant.bot_personality || 'chaleureux',
    bot_context: restaurant.bot_context || '',
    bot_transfer_enabled: restaurant.bot_transfer_enabled !== false,
  })
  const p = restaurant.primary_color

  async function toggleModule(key: ModuleKey) {
    setSaving(key)
    const val = !restaurant[key]
    await supabase.from('restaurants').update({ [key]: val }).eq('id', restaurant.id)
    setRestaurant(prev => ({ ...prev, [key]: val }))
    setSaving(null)
  }

  async function saveBotConfig() {
    setSaving('bot')
    const payload = {
      bot_enabled: botForm.bot_enabled,
      bot_name: botForm.bot_name.trim() || 'Tantie',
      bot_personality: botForm.bot_personality.trim() || 'chaleureux',
      bot_context: botForm.bot_context.trim() || null,
      bot_transfer_enabled: botForm.bot_transfer_enabled,
    }
    await supabase.from('restaurants').update(payload).eq('id', restaurant.id)
    setRestaurant(prev => ({ ...prev, ...payload }))
    setSaving(null)
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
          {([
            { key: 'modules', label: '⚡ Modules' },
            { key: 'jeux', label: '🎮 Jeux' },
            { key: 'bot', label: '🤖 Bot' },
          ] satisfies Array<{ key: TabKey; label: string }>).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
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
                const active = restaurant[mod.key]
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
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: p + '15' }}>
                  <Bot size={28} style={{ color: p }} />
                </div>
                <div>
                  <p className="font-black text-gray-900">{botForm.bot_name || 'Tantie'}</p>
                  <p className="text-xs text-gray-400">Assistant IA visible côté client</p>
                </div>
                <button onClick={() => setBotForm(prev => ({ ...prev, bot_enabled: !prev.bot_enabled }))}
                  className="ml-auto w-12 h-6 rounded-full transition-all relative flex-shrink-0"
                  style={{ backgroundColor: botForm.bot_enabled ? p : '#E5E7EB' }}>
                  <motion.span animate={{ left: botForm.bot_enabled ? '1.5rem' : '0.25rem' }}
                    className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
                    style={{ position: 'absolute' }} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1.5">Nom du bot</label>
                  <input type="text" value={botForm.bot_name}
                    onChange={e => setBotForm(prev => ({ ...prev, bot_name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 text-sm outline-none border border-gray-100 focus:border-orange-300" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1.5">Ton</label>
                  <select value={botForm.bot_personality}
                    onChange={e => setBotForm(prev => ({ ...prev, bot_personality: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 text-sm outline-none border border-gray-100">
                    <option value="chaleureux">Chaleureux</option>
                    <option value="professionnel">Professionnel</option>
                    <option value="drôle et léger">Drôle et léger</option>
                    <option value="très ivoirien et familier">Très ivoirien et familier</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-xs font-bold text-gray-500 block mb-1.5">Contexte restaurant</label>
                <textarea value={botForm.bot_context}
                  onChange={e => setBotForm(prev => ({ ...prev, bot_context: e.target.value }))}
                  rows={6}
                  placeholder="Ex: spécialités, ambiance, horaires, consignes allergènes, moyens de paiement, contact WhatsApp, politique réservation..."
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 text-sm outline-none border border-gray-100 focus:border-orange-300 resize-none" />
              </div>

              <button onClick={() => setBotForm(prev => ({ ...prev, bot_transfer_enabled: !prev.bot_transfer_enabled }))}
                className="w-full mt-3 p-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-center gap-3 text-left">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: botForm.bot_transfer_enabled ? p + '15' : '#F3F4F6' }}>
                  <Headset size={16} style={{ color: botForm.bot_transfer_enabled ? p : '#9CA3AF' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-gray-900">Transfert vers le personnel</p>
                  <p className="text-xs text-gray-400">Si le client demande un humain, Tantie ouvre l’assistance.</p>
                </div>
                <span className="text-xs font-black" style={{ color: botForm.bot_transfer_enabled ? p : '#9CA3AF' }}>
                  {botForm.bot_transfer_enabled ? 'Actif' : 'Inactif'}
                </span>
              </button>

              <motion.button whileTap={{ scale: 0.97 }} onClick={saveBotConfig}
                disabled={saving === 'bot'}
                className="w-full mt-4 py-3 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ backgroundColor: p }}>
                {saving === 'bot' ? 'Sauvegarde...' : <><Save size={15} /> Sauvegarder Tantie</>}
              </motion.button>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-3xl p-5">
              <p className="font-bold text-blue-800 text-sm mb-2 flex items-center gap-2">
                <Sparkles size={15} />
                <span>Le bot répond aux questions clients</span>
              </p>
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
