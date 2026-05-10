'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useSessionStore } from '@/lib/store'
import { generateDeviceFingerprint } from '@/lib/utils'
import LucideAvatar, { AVATAR_OPTIONS, getAvatarLabel } from './LucideAvatar'
import RestaurantLogo, { getRestaurantLogoUrl } from '@/components/RestaurantLogo'
import { getPresenceCutoffIso } from '@/lib/social/presence'
import { ArrowRight, Check, ChevronLeft, Heart, PartyPopper, QrCode, UserRound, UsersRound, UtensilsCrossed } from 'lucide-react'
import type { ClientSession, Gender, ProfileType, Restaurant, RestaurantTable } from '@/types'

const AVATARS = AVATAR_OPTIONS

const PROFILES = [
  { value: 'solo', Icon: UserRound, label: 'Solo', desc: 'Je dîne seul' },
  { value: 'couple', Icon: Heart, label: 'En couple', desc: 'À deux' },
  { value: 'famille', Icon: UsersRound, label: 'Famille', desc: 'En famille' },
  { value: 'groupe', Icon: PartyPopper, label: 'Entre amis', desc: 'Groupe' },
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
  const [takenAvatars, setTakenAvatars] = useState<Set<string>>(new Set())
  const p = restaurant.primary_color
  const ownAvatarId = isGuestUpgrade ? session?.avatar_icon : undefined
  const logoUrl = getRestaurantLogoUrl(restaurant.logo_url)

  useEffect(() => {
    async function check() {
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

  useEffect(() => {
    let cancelled = false
    async function loadTaken() {
      const { data } = await supabase.from('client_sessions')
        .select('id, avatar_icon')
        .eq('restaurant_id', restaurant.id)
        .eq('is_present', true)
        .gte('last_seen_at', getPresenceCutoffIso())
      if (cancelled) return
      const taken = new Set<string>()
      for (const row of data || []) {
        if (!row.avatar_icon) continue
        if (ownAvatarId && row.id === session?.id) continue
        taken.add(row.avatar_icon)
      }
      setTakenAvatars(taken)
      setSelectedAvatar(prev => {
        if (!taken.has(prev.id) || prev.id === ownAvatarId) return prev
        return AVATARS.find(a => !taken.has(a.id) || a.id === ownAvatarId) || prev
      })
    }
    void loadTaken()
    const channel = supabase.channel(`onboarding-taken-${restaurant.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'client_sessions',
        filter: `restaurant_id=eq.${restaurant.id}`,
      }, () => { void loadTaken() })
      .subscribe()
    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [restaurant.id, ownAvatarId, session?.id])

  async function finish() {
    if (!selectedProfile || loading) return
    setLoading(true)
    const fingerprint = generateDeviceFingerprint()
    const pseudo = getAvatarLabel(selectedAvatar.id)
    const now = new Date().toISOString()
    const sessionData = {
      restaurant_id: restaurant.id,
      ...(table.id ? { table_id: table.id } : {}),
      pseudo,
      avatar_icon: selectedAvatar.id,
      device_fingerprint: fingerprint,
      gender: 'autre' as Gender,
      profile_type: selectedProfile as ProfileType,
      is_present: true,
      last_seen_at: now,
      left_at: null,
    }
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

      <div className="px-5 pt-10 pb-6">
        <div className="flex items-center gap-2 mb-8">
          {logoUrl ? (
            <RestaurantLogo
              src={logoUrl}
              alt={restaurant.name}
              className="w-10 h-10 rounded-xl bg-white flex-shrink-0"
            />
          ) : (
            <>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                style={{ backgroundColor: p }}>
                <QrCode size={18} strokeWidth={2.5} />
              </div>
              <span className="font-black text-white text-sm">{restaurant.name}</span>
            </>
          )}
          {logoUrl && <span className="sr-only">{restaurant.name}</span>}
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

      <div className="px-5 mb-8 flex gap-2">
        {['avatar', 'profile'].map((s, i) => (
          <div key={s} className="flex-1 h-1 rounded-full transition-all duration-400"
            style={{ backgroundColor: (step === 'avatar' && i === 0) || step === 'profile' ? p : '#2D2D2D' }} />
        ))}
      </div>

      <div className="flex-1 px-5">
        <AnimatePresence mode="wait">

          {step === 'avatar' && (
            <motion.div key="avatars" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-2xl"
                style={{ backgroundColor: '#1A1A1A' }}>
                <LucideAvatar avatarId={selectedAvatar.id} size={48} />
                <div>
                  <p className="text-white font-black">{selectedAvatar.label}</p>
                  <p className="text-gray-500 text-xs mt-0.5">Votre identité ce soir</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {AVATARS.map((av, i) => {
                  const isMine = av.id === ownAvatarId
                  const isTaken = takenAvatars.has(av.id) && !isMine
                  const isSelected = selectedAvatar.id === av.id
                  return (
                    <motion.button key={av.id}
                      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04 }}
                      whileTap={isTaken ? undefined : { scale: 0.9 }}
                      onClick={() => { if (!isTaken) setSelectedAvatar(av) }}
                      disabled={isTaken}
                      aria-disabled={isTaken}
                      className="relative flex flex-col items-center gap-2 p-3 rounded-2xl transition-all disabled:cursor-not-allowed"
                      style={isSelected
                        ? { backgroundColor: av.bg + '30', border: `2px solid ${p}` }
                        : { backgroundColor: '#1A1A1A', border: '2px solid transparent', opacity: isTaken ? 0.35 : 1 }}>
                      <div style={isTaken ? { filter: 'grayscale(1)' } : undefined}>
                        <LucideAvatar avatarId={av.id} size={44} />
                      </div>
                      <span className="text-xs font-bold" style={{
                        color: isSelected ? p : isTaken ? '#4B5563' : '#6B7280'
                      }}>
                        {av.label}
                      </span>
                      {isTaken && (
                        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider"
                          style={{ backgroundColor: '#000', color: '#9CA3AF', border: '1px solid #2D2D2D' }}>
                          Pris
                        </span>
                      )}
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          )}

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
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: selectedProfile === pr.value ? p + '25' : '#111827' }}>
                    <pr.Icon size={28} style={{ color: selectedProfile === pr.value ? p : '#9CA3AF' }} strokeWidth={2.3} />
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-white text-base">{pr.label}</p>
                    <p className="text-gray-500 text-sm mt-0.5">{pr.desc}</p>
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={selectedProfile === pr.value
                      ? { borderColor: p, backgroundColor: p }
                      : { borderColor: '#374151' }}>
                    {selectedProfile === pr.value && (
                      <Check size={12} className="text-white" strokeWidth={3} />
                    )}
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-5 py-6 pb-10">
        {step === 'avatar' ? (
          <motion.button whileTap={{ scale: 0.97 }}
            onClick={() => setStep('profile')}
            className="w-full py-4 rounded-2xl text-white font-black text-base flex items-center justify-center gap-2"
            style={{ backgroundColor: p, boxShadow: `0 8px 30px ${p}40` }}>
            <span>Continuer</span>
            <ArrowRight size={18} />
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
                <UtensilsCrossed size={18} />
                <span>Voir le menu</span>
              </>
            )}
          </motion.button>
        )}
        {step === 'profile' && (
          <button onClick={() => setStep('avatar')} className="w-full text-sm text-gray-500 mt-3 py-2 flex items-center justify-center gap-1">
            <ChevronLeft size={16} />
            <span>Étape précédente</span>
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
