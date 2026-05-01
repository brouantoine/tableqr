'use client'
import { useState, useEffect } from 'react'
import { TwemojiIcon } from '@/components/Twemoji'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useSessionStore } from '@/lib/store'
import { generateDeviceFingerprint } from '@/lib/utils'
import { getAvatarLabel } from './TwemojiAvatar'
import type { ClientSession, Gender, ProfileType, Restaurant, RestaurantTable } from '@/types'

// Avatars pros — emojis Twemoji haute qualité
const AVATARS = [
  { id: 'ninja', emoji: '🥷', label: 'Ninja', bg: '#1F2937' },
  { id: 'king', emoji: '🤴', label: 'Roi', bg: '#7C3AED' },
  { id: 'queen', emoji: '👸', label: 'Reine', bg: '#DB2777' },
  { id: 'astronaut', emoji: '🧑‍🚀', label: 'Astro', bg: '#0EA5E9' },
  { id: 'chef', emoji: '🧑‍🍳', label: 'Chef', bg: '#F26522' },
  { id: 'artist', emoji: '🧑‍🎨', label: 'Artiste', bg: '#10B981' },
  { id: 'vampire', emoji: '🧛', label: 'Vampire', bg: '#DC2626' },
  { id: 'mage', emoji: '🧙', label: 'Mage', bg: '#6D28D9' },
  { id: 'robot', emoji: '🤖', label: 'Robot', bg: '#374151' },
  { id: 'alien', emoji: '👽', label: 'Alien', bg: '#059669' },
  { id: 'ghost', emoji: '👻', label: 'Ghost', bg: '#6B7280' },
  { id: 'fire', emoji: '🔥', label: 'Fire', bg: '#DC2626' },
]

const PROFILES = [
  { value: 'solo', emoji: '🧑', label: 'Solo', desc: 'Je dîne seul' },
  { value: 'couple', emoji: '💑', label: 'En couple', desc: 'À deux' },
  { value: 'famille', emoji: '👨‍👩‍👧', label: 'Famille', desc: 'En famille' },
  { value: 'groupe', emoji: '🎉', label: 'Entre amis', desc: 'Groupe' },
]

export default function OnboardingPage({ restaurant, table, onDone, onSkip, isGuestUpgrade }: {
  restaurant: Restaurant
  table: RestaurantTable
  onDone?: () => void
  onSkip?: () => void
  isGuestUpgrade?: boolean
}) {
  const router = useRouter()
  const { session, setSession } = useSessionStore()
  const [checking, setChecking] = useState(true)
  const [step, setStep] = useState<'avatar' | 'profile'>('avatar')
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0])
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const p = restaurant.primary_color

  useEffect(() => {
    async function check() {
      // Mode "upgrade invité" : on ne court-circuite pas même si la session existe,
      // car on veut que l'utilisateur la personnalise (pseudo/avatar/profil).
      if (isGuestUpgrade) { setChecking(false); return }

      const fingerprint = generateDeviceFingerprint()
      if (session && session.restaurant_id === restaurant.id && session.is_present) {
        if (onDone) onDone()
        else router.push(`/${restaurant.slug}/menu?table=${table.id}`)
        return
      }
      const { data } = await supabase
        .from('client_sessions').select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('device_fingerprint', fingerprint)
        .eq('is_present', true)
        .maybeSingle()
      if (data) {
        setSession(data)
        if (onDone) onDone()
        else router.push(`/${restaurant.slug}/menu?table=${table.id}`)
        return
      }
      setChecking(false)
    }
    check()
  }, [])

  async function finish() {
    if (!selectedProfile || loading) return
    setLoading(true)
    const fingerprint = generateDeviceFingerprint()
    const pseudo = getAvatarLabel(selectedAvatar.id)
    const sessionData = {
      restaurant_id: restaurant.id,
      ...(table.id ? { table_id: table.id } : {}),
      pseudo,
      avatar_icon: selectedAvatar.id,
      device_fingerprint: fingerprint,
      gender: 'autre' as Gender,
      profile_type: selectedProfile as ProfileType,
      is_present: true,
    }
    // Mode upgrade invité : on met à jour la session existante au lieu d'en créer une nouvelle
    let data: ClientSession | null = null
    if (isGuestUpgrade && session?.id) {
      const res = await supabase.from('client_sessions').update(sessionData).eq('id', session.id).select().single()
      data = res.data
    } else {
      const res = await supabase.from('client_sessions').insert(sessionData).select().single()
      data = res.data
    }
    if (data) {
      setSession(data)
      // Petit délai pour laisser l'animation de "validation" se voir
      await new Promise(r => setTimeout(r, 350))
      if (onDone) onDone()
      else router.push(`/${restaurant.slug}/menu?table=${table.id}`)
    }
    setLoading(false)
  }

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0D0D0D' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-8 h-8 rounded-full border-2 border-t-transparent"
        style={{ borderColor: p, borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0D0D0D' }}>

      {/* Header */}
      <div className="px-5 pt-10 pb-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
            style={{ backgroundColor: p }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M3 12h18M3 18h18"/>
            </svg>
          </div>
          <span className="font-black text-white text-sm">{restaurant.name}</span>
          <span className="ml-auto text-xs text-gray-500">Table {table.table_number}</span>
        </div>

        <AnimatePresence mode="wait">
          {step === 'avatar' ? (
            <motion.div key="avatar" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <p className="text-gray-500 text-xs uppercase tracking-widest font-bold mb-1">Étape 1 / 2</p>
              <h1 className="text-3xl font-black text-white leading-tight mb-1">
                {isGuestUpgrade ? <>Identifiez-vous<br />pour ce repas</> : <>Choisissez<br />votre avatar</>}
              </h1>
              <p className="text-gray-500 text-sm">
                {isGuestUpgrade ? 'Choisissez le nom et l’avatar visibles ce soir' : 'Vous serez connu sous ce nom ce soir'}
              </p>
            </motion.div>
          ) : (
            <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <p className="text-gray-500 text-xs uppercase tracking-widest font-bold mb-1">Étape 2 / 2</p>
              <h1 className="text-3xl font-black text-white leading-tight mb-1">
                Vous êtes<br />venu comment ?
              </h1>
              <p className="text-gray-500 text-sm">Aidez-nous à personnaliser votre expérience</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress */}
      <div className="px-5 mb-8 flex gap-2">
        {['avatar', 'profile'].map((s, i) => (
          <div key={s} className="flex-1 h-1 rounded-full transition-all duration-400"
            style={{ backgroundColor: (step === 'avatar' && i === 0) || step === 'profile' ? p : '#2D2D2D' }} />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 px-5">
        <AnimatePresence mode="wait">

          {/* STEP 1 — Avatar */}
          {step === 'avatar' && (
            <motion.div key="avatars" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Pseudo */}
              <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-2xl"
                style={{ backgroundColor: '#1A1A1A' }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: selectedAvatar.bg }}>
                  <TwemojiIcon emoji={selectedAvatar.emoji} size={28} />
                </div>
                <div>
                  <p className="text-white font-black">{selectedAvatar.label}</p>
                  <p className="text-gray-500 text-xs mt-0.5">Votre identité ce soir</p>
                </div>
              </div>

              {/* Grid avatars */}
              <div className="grid grid-cols-4 gap-3">
                {AVATARS.map((av, i) => (
                  <motion.button key={av.id}
                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04 }} whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedAvatar(av)}
                    className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all"
                    style={selectedAvatar.id === av.id
                      ? { backgroundColor: av.bg + '30', border: `2px solid ${p}` }
                      : { backgroundColor: '#1A1A1A', border: '2px solid transparent' }}>
                    <TwemojiIcon emoji={av.emoji} size={36} />
                    <span className="text-xs font-bold" style={{ color: selectedAvatar.id === av.id ? p : '#6B7280' }}>
                      {av.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 2 — Profile */}
          {step === 'profile' && (
            <motion.div key="profiles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-3">
              {PROFILES.map((pr, i) => (
                <motion.button key={pr.value}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedProfile(pr.value)}
                  className="w-full flex items-center gap-4 p-5 rounded-3xl text-left transition-all"
                  style={selectedProfile === pr.value
                    ? { backgroundColor: p + '15', border: `2px solid ${p}` }
                    : { backgroundColor: '#1A1A1A', border: '2px solid transparent' }}>
                  <TwemojiIcon emoji={pr.emoji} size={42} />
                  <div className="flex-1">
                    <p className="font-black text-white text-base">{pr.label}</p>
                    <p className="text-gray-500 text-sm mt-0.5">{pr.desc}</p>
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={selectedProfile === pr.value
                      ? { borderColor: p, backgroundColor: p }
                      : { borderColor: '#374151' }}>
                    {selectedProfile === pr.value && (
                      <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                        <path d="M1 5L4.5 8.5L11 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CTA */}
      <div className="px-5 py-6 pb-10">
        {step === 'avatar' ? (
          <motion.button whileTap={{ scale: 0.97 }}
            onClick={() => setStep('profile')}
            className="w-full py-4 rounded-2xl text-white font-black text-base"
            style={{ backgroundColor: p, boxShadow: `0 8px 30px ${p}40` }}>
            Continuer →
          </motion.button>
        ) : (
          <motion.button whileTap={{ scale: loading ? 1 : 0.97 }}
            onClick={finish}
            disabled={!selectedProfile || loading}
            className="w-full py-4 rounded-2xl text-white font-black text-base disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ backgroundColor: p, boxShadow: `0 8px 30px ${p}40` }}>
            {loading ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white" />
                <span>Validation...</span>
              </>
            ) : (
              <>
                <TwemojiIcon emoji="🍽️" size={18} />
                <span>Voir le menu</span>
              </>
            )}
          </motion.button>
        )}
        {step === 'profile' && (
          <button onClick={() => setStep('avatar')} className="w-full text-center text-sm text-gray-500 mt-3 py-2">
            ← Étape précédente
          </button>
        )}
        {onSkip && (
          <button
            onClick={onSkip}
            className="w-full mt-3 py-3 rounded-2xl text-center font-bold text-sm text-gray-200 bg-white/10 border border-white/15 hover:bg-white/15 transition-colors">
            Non merci, retour au menu
          </button>
        )}
      </div>
    </div>
  )
}
