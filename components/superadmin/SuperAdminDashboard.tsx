'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Store, Users, TrendingUp, X, Check, LogOut, QrCode, Eye,
  AlertTriangle, Printer, Key, Globe, Phone, Mail, Settings, Rocket,
  CreditCard, Clock, ChevronRight, ImageIcon, Upload, Trash2,
  Download, Loader2,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { generateQRPrintHTML } from '@/lib/qr-print-template'
import type { Restaurant } from '@/types'
import DesignerKitQuantityModal from '@/components/DesignerKitQuantityModal'
import RestaurantAnalyticsPanel from './RestaurantAnalyticsPanel'
import AbonnementsTab from './AbonnementsTab'

interface Props {
  restaurants: Restaurant[]
}

const MONTHLY_PRICE = 15000

function getAppUrl(): string {
  return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
}

function downloadFilename(res: Response, fallback: string) {
  const disposition = res.headers.get('content-disposition') || ''
  const match = disposition.match(/filename="([^"]+)"/)
  return match?.[1] || fallback
}

async function downloadResponseFile(res: Response, fallback: string) {
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = downloadFilename(res, fallback)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function isEphemeralVercelUrl(url: string): boolean {
  try {
    const host = new URL(url).host
    if (!host.endsWith('.vercel.app')) return false
    const sub = host.replace('.vercel.app', '')
    return sub.split('-').some(p => p.length >= 6 && /[a-z]/.test(p) && /[0-9]/.test(p))
  } catch { return false }
}

function PrintUrlCheck() {
  const [origin] = useState(() => typeof window !== 'undefined' ? window.location.origin : '')
  if (!origin) return null
  const ephemeral = isEphemeralVercelUrl(origin)
  return (
    <div className={`rounded-2xl p-3 mb-4 border ${ephemeral ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
      <p className="text-xs font-black uppercase tracking-wide mb-1" style={{ color: ephemeral ? '#B91C1C' : '#065F46' }}>URL encodée dans les QR</p>
      <p className="font-mono text-xs break-all text-gray-800">{origin}/t/CODE</p>
      {ephemeral && (
        <p className="text-xs text-red-700 mt-2 font-semibold flex items-start gap-1.5">
          <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
          Déploiement temporaire — imprime depuis ton domaine stable.
        </p>
      )}
    </div>
  )
}

function SubBadge({ r }: { r: Restaurant }) {
  if (r.is_preview) return <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-600">Démo</span>
  if (!r.is_active) return <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-gray-100 text-gray-500">Inactif</span>
  const status = r.subscription_status ?? 'subscribed'
  if (status === 'trial') return <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700">Essai</span>
  return <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-green-100 text-green-600">Abonné</span>
}

export default function SuperAdminDashboard({ restaurants: initialRestaurants }: Props) {
  const [tab, setTab] = useState<'restaurants' | 'abonnements'>('restaurants')
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [selectedResto, setSelectedResto] = useState<Restaurant | null>(null)
  const [localRestaurants, setLocalRestaurants] = useState<Restaurant[]>(initialRestaurants)

  useEffect(() => {
    const channel = supabase.channel('restaurants-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'restaurants' },
        (payload) => setLocalRestaurants(prev => [payload.new as Restaurant, ...prev]))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'restaurants' },
        (payload) => setLocalRestaurants(prev => prev.map(r => r.id === payload.new.id ? { ...r, ...payload.new } : r)))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'restaurants' },
        (payload) => setLocalRestaurants(prev => prev.filter(r => r.id !== payload.old.id)))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const subscribed = useMemo(() =>
    localRestaurants.filter(r => !r.is_preview && r.is_active && (r.subscription_status ?? 'subscribed') === 'subscribed'),
    [localRestaurants])
  const mrr = subscribed.length * MONTHLY_PRICE
  const activeCount = localRestaurants.filter(r => r.is_active && !r.is_preview).length

  const filtered = localRestaurants.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.slug.toLowerCase().includes(search.toLowerCase()) ||
    r.city?.toLowerCase().includes(search.toLowerCase())
  )

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.replace('/superadmin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="px-4 pt-4 pb-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-black text-gray-900 leading-tight">
                TABLE<span style={{ color: '#F26522' }}>QR</span>
                <span className="ml-2 text-xs bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full font-bold border border-orange-100">Admin</span>
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {subscribed.length} abonnés · <span className="font-bold text-gray-700">{formatPrice(mrr, 'XOF')}/mois</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowQR(true)}
                className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                <QrCode size={16} />
              </button>
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => setShowNew(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-sm font-black"
                style={{ backgroundColor: '#F26522' }}>
                <Plus size={15} strokeWidth={3} />
                Nouveau
              </motion.button>
              <button onClick={handleLogout}
                className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                <LogOut size={15} />
              </button>
            </div>
          </div>

          <div className="flex">
            {([
              { id: 'restaurants', label: 'Restaurants', Icon: Store },
              { id: 'abonnements', label: 'Abonnements', Icon: CreditCard },
            ] as const).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold transition-colors border-b-2"
                style={tab === t.id
                  ? { color: '#F26522', borderBottomColor: '#F26522' }
                  : { color: '#9CA3AF', borderBottomColor: 'transparent' }}>
                <t.Icon size={14} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tab === 'abonnements' && (
        <AbonnementsTab restaurants={localRestaurants} />
      )}

      {tab === 'restaurants' && (
        <>
          <div className="grid grid-cols-3 gap-2 px-4 py-4">
            {[
              { label: 'Actifs', value: activeCount, sub: `${localRestaurants.filter(r => r.is_preview).length} démos`, color: '#F26522', Icon: Store },
              { label: 'MRR', value: formatPrice(mrr, 'XOF'), sub: `${subscribed.length} abonnés`, color: '#10B981', Icon: TrendingUp },
              { label: 'Total', value: localRestaurants.length, sub: 'Restaurants', color: '#6366F1', Icon: Users },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-2xl p-3 shadow-sm">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: s.color + '18' }}>
                  <s.Icon size={13} style={{ color: s.color }} />
                </div>
                <p className="font-black text-gray-900 text-sm leading-tight">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5 font-medium">{s.label}</p>
                <p className="text-xs text-gray-400">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="px-4 mb-3">
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Rechercher..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl text-sm outline-none bg-white shadow-sm border border-gray-100 focus:border-orange-200" />
            </div>
          </div>

          <div className="px-4 space-y-2 pb-10">
            <p className="text-xs font-bold text-gray-400 mb-2">{filtered.length} RESTAURANT{filtered.length > 1 ? 'S' : ''}</p>
            <AnimatePresence>
              {filtered.map((r, i) => (
                <motion.button key={r.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedResto(r)}
                  className="w-full bg-white rounded-2xl p-3.5 text-left flex items-center gap-3 shadow-sm border border-gray-50 hover:border-gray-200 transition-all">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-white shadow-sm"
                    style={{ backgroundColor: r.primary_color }}>
                    {r.logo_url
                      ? <img src={r.logo_url} alt="" className="w-full h-full object-cover rounded-2xl" />
                      : <Store size={20} strokeWidth={2.2} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <p className="font-black text-gray-900 text-sm">{r.name}</p>
                      <SubBadge r={r} />
                    </div>
                    <p className="text-xs text-gray-400 truncate">/{r.slug} · {r.city || '—'}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {!r.is_preview && (r.subscription_status ?? 'subscribed') === 'subscribed' && r.is_active && (
                      <p className="text-xs font-black text-green-600">{formatPrice(MONTHLY_PRICE, 'XOF')}</p>
                    )}
                    <ChevronRight size={14} className="text-gray-300 mt-0.5 ml-auto" />
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
            {filtered.length === 0 && (
              <div className="text-center py-16">
                <Store size={32} className="mx-auto mb-3 text-gray-200" />
                <p className="text-gray-400 font-medium text-sm">Aucun restaurant trouvé</p>
              </div>
            )}
          </div>
        </>
      )}

      <AnimatePresence>
        {showNew && <NewRestaurantModal onClose={() => setShowNew(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showQR && <QRGeneratorModal onClose={() => setShowQR(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {selectedResto && (
          <RestaurantAnalyticsPanel
            restaurant={selectedResto}
            onClose={() => setSelectedResto(null)}
            onDeleted={(id) => {
              setLocalRestaurants(prev => prev.filter(r => r.id !== id))
              setSelectedResto(null)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function NewRestaurantModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<null | 'normal' | 'preview'>(null)
  const [step, setStep] = useState<'info' | 'design' | 'abonnement'>('info')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)
  const [previewDone, setPreviewDone] = useState(false)
  const [subscriptionStatus, setSubscriptionStatus] = useState<'subscribed' | 'trial'>('subscribed')
  const [logoUploading, setLogoUploading] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    name: '', slug: '', city: '', country: 'CI', phone: '', email: '', password: '',
    description: '', primary_color: '#F26522', secondary_color: '#D4A017',
    accent_color: '#C0392B', bot_name: 'Tantie', currency: 'XOF', logo_url: '',
  })
  const [previewForm, setPreviewForm] = useState({ name: '', city: '', phone: '', currency: 'XOF' })

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
    if (key === 'name') {
      setForm(prev => ({
        ...prev, name: value,
        slug: value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      }))
    }
  }

  async function createNormal() {
    if (!form.name || !form.email || !form.slug) return
    setLoading(true)
    try {
      const res = await fetch('/api/restaurants', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form, plan: 'starter', is_active: true, is_preview: false,
          subscription_status: subscriptionStatus,
          module_social: true, module_games: true, module_delivery: true,
          module_loyalty: true, module_birthday: true, tax_rate: 0,
        }),
      })
      const result = await res.json()
      if (res.ok) { setCredentials(result.credentials); setSuccess(true) }
      else alert(result.error || 'Erreur')
    } catch { alert('Erreur réseau') }
    finally { setLoading(false) }
  }

  async function uploadLogo(file: File) {
    if (!file.type.startsWith('image/')) { alert('Choisis une image valide'); return }
    if (file.size > 3 * 1024 * 1024) { alert('Logo trop lourd : maximum 3 Mo'); return }

    setLogoUploading(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
      const safeSlug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'restaurant'
      const fileName = `restaurant-logos/${safeSlug}-${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from('restaurant-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false, contentType: file.type })

      if (error) { alert(error.message); return }

      const { data } = supabase.storage.from('restaurant-images').getPublicUrl(fileName)
      set('logo_url', data.publicUrl)
    } finally {
      setLogoUploading(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  async function createPreview() {
    if (!previewForm.name) return
    setLoading(true)
    try {
      const res = await fetch('/api/restaurants', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...previewForm, is_preview: true, subscription_status: 'trial' }),
      })
      const result = await res.json()
      if (res.ok) setPreviewDone(true)
      else alert(result.error || 'Erreur')
    } catch { alert('Erreur réseau') }
    finally { setLoading(false) }
  }

  const steps: ('info' | 'design' | 'abonnement')[] = ['info', 'design', 'abonnement']
  const stepIdx = steps.indexOf(step)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="relative bg-gray-50 w-full max-w-md mx-auto rounded-t-[2rem] max-h-[92vh] flex flex-col"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}>

        <div className="flex items-center justify-between p-5 pb-4 bg-white rounded-t-[2rem] border-b border-gray-100">
          <div>
            <h2 className="font-black text-lg text-gray-900">Nouveau restaurant</h2>
            {mode === 'normal' && <p className="text-xs text-gray-400 mt-0.5">Étape {stepIdx + 1}/3</p>}
            {mode === 'preview' && <p className="text-xs text-amber-600 mt-0.5 font-semibold">Mode démo</p>}
          </div>
          <button onClick={mode ? () => setMode(null) : onClose}
            className="w-8 h-8 rounded-2xl bg-gray-100 flex items-center justify-center">
            <X size={14} className="text-gray-600" />
          </button>
        </div>

        {!mode && (
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <button onClick={() => setMode('normal')}
              className="w-full p-4 rounded-2xl bg-white border-2 border-gray-100 text-left hover:border-orange-200 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Store size={18} className="text-orange-600" />
                </div>
                <div>
                  <p className="font-black text-gray-900 text-sm">Restaurant avec compte</p>
                  <p className="text-xs text-gray-400 mt-0.5">Email + mot de passe · connexion immédiate</p>
                </div>
                <ChevronRight size={16} className="text-gray-300 ml-auto" />
              </div>
            </button>

            <button onClick={() => setMode('preview')}
              className="w-full p-4 rounded-2xl bg-amber-50 border-2 border-amber-200 text-left hover:border-amber-400 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Eye size={18} className="text-amber-600" />
                </div>
                <div>
                  <p className="font-black text-gray-900 text-sm">Démo / Prospection</p>
                  <p className="text-xs text-gray-400 mt-0.5">Menu auto · QR prêts · juste le nom requis</p>
                </div>
                <ChevronRight size={16} className="text-gray-300 ml-auto" />
              </div>
            </button>
          </div>
        )}

        {mode === 'preview' && !previewDone && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5">Nom du restaurant *</label>
              <input type="text" placeholder="Ex: Chez Kofi" value={previewForm.name}
                onChange={e => setPreviewForm(p => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-3 rounded-2xl bg-white text-sm outline-none border border-gray-200 focus:border-amber-300" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">Ville</label>
                <input type="text" placeholder="Abidjan" value={previewForm.city}
                  onChange={e => setPreviewForm(p => ({ ...p, city: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl bg-white text-sm outline-none border border-gray-200" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">Devise</label>
                <select value={previewForm.currency} onChange={e => setPreviewForm(p => ({ ...p, currency: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl bg-white text-sm outline-none border border-gray-200">
                  {[['XOF','XOF'],['XAF','XAF'],['EUR','EUR'],['USD','USD']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-amber-100">
              <p className="text-xs font-bold text-amber-700 mb-2">Créé automatiquement</p>
              {['Menu démo · 4 catégories · 17 plats', 'Couleur identité aléatoire', 'QR prêts à lier'].map(t => (
                <p key={t} className="text-xs text-amber-600 flex items-center gap-1.5 mt-1">
                  <Check size={11} strokeWidth={3} /> {t}
                </p>
              ))}
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={createPreview}
              disabled={loading || !previewForm.name}
              className="w-full py-3.5 rounded-2xl font-black text-white disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#EAB308' }}>
              {loading ? 'Création...' : <><Eye size={16} /> Créer la démo</>}
            </motion.button>
          </div>
        )}

        {mode === 'preview' && previewDone && (
          <div className="flex-1 flex flex-col items-center justify-center p-5">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}
              className="w-16 h-16 rounded-3xl bg-amber-100 flex items-center justify-center mb-4">
              <Eye size={28} className="text-amber-600" />
            </motion.div>
            <p className="font-black text-xl text-gray-900 mb-1">Démo créée !</p>
            <p className="text-gray-400 text-sm mb-6">Menu généré · QR prêts</p>
            <button onClick={() => { onClose(); window.location.reload() }}
              className="w-full py-4 rounded-2xl font-black text-white" style={{ backgroundColor: '#EAB308' }}>
              Fermer
            </button>
          </div>
        )}

        {mode === 'normal' && !success && (
          <>
            <div className="flex gap-1 px-5 pt-4">
              {steps.map((s, i) => (
                <div key={s} className="flex-1 h-1 rounded-full transition-all"
                  style={{ backgroundColor: i <= stepIdx ? '#F26522' : '#E5E7EB' }} />
              ))}
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-5 pt-4">

              {step === 'info' && (
                <div className="space-y-3">
                  {([
                    { label: 'Nom *', key: 'name', placeholder: 'Chez Kofi', Icon: Store },
                    { label: 'Slug URL *', key: 'slug', placeholder: 'chez-kofi', Icon: Globe },
                    { label: 'Ville', key: 'city', placeholder: 'Abidjan', Icon: Globe },
                    { label: 'Téléphone', key: 'phone', placeholder: '+225 07 00 00 00', Icon: Phone },
                    { label: 'Email *', key: 'email', placeholder: 'contact@restaurant.com', Icon: Mail },
                    { label: 'Mot de passe *', key: 'password', placeholder: 'Min. 8 caractères', Icon: Settings },
                  ] as const).map(f => (
                    <div key={f.key}>
                      <label className="text-xs font-bold text-gray-500 block mb-1">{f.label}</label>
                      <div className="relative">
                        <f.Icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type={f.key === 'password' ? 'password' : 'text'} placeholder={f.placeholder}
                          value={form[f.key]} onChange={e => set(f.key, e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white text-sm outline-none border border-gray-200 focus:border-orange-300" />
                      </div>
                    </div>
                  ))}
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Devise</label>
                    <select value={form.currency} onChange={e => set('currency', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white text-sm outline-none border border-gray-200">
                      {[['XOF','XOF — CFA (UEMOA)'],['XAF','XAF — CFA (CEMAC)'],['EUR','EUR — Euro'],['USD','USD — Dollar'],['GHS','GHS — Cedi'],['NGN','NGN — Naira']].map(([v,l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {step === 'design' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1.5">Logo du restaurant</label>
                    <div className="rounded-2xl bg-white border border-gray-200 p-3 flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl border border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {form.logo_url
                          ? <img src={form.logo_url} alt="" className="w-full h-full object-contain p-1" />
                          : <ImageIcon size={22} className="text-gray-300" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm text-gray-900 truncate">
                          {form.logo_url ? 'Logo ajouté' : 'Ajouter un logo'}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">PNG, JPG ou WebP · max 3 Mo</p>
                        <div className="flex gap-2 mt-2">
                          <button type="button" onClick={() => logoInputRef.current?.click()}
                            disabled={logoUploading}
                            className="px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-black flex items-center gap-1.5 disabled:opacity-60">
                            <Upload size={12} />
                            {logoUploading ? 'Upload...' : form.logo_url ? 'Remplacer' : 'Uploader'}
                          </button>
                          {form.logo_url && (
                            <button type="button" onClick={() => set('logo_url', '')}
                              className="px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-xs font-black flex items-center gap-1.5">
                              <Trash2 size={12} />
                              Retirer
                            </button>
                          )}
                        </div>
                      </div>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (file) uploadLogo(file)
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Nom du bot assistant</label>
                    <input type="text" placeholder="Tantie, Chef, Alex..." value={form.bot_name}
                      onChange={e => set('bot_name', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white text-sm outline-none border border-gray-200" />
                  </div>
                  {([
                    { label: 'Couleur principale', key: 'primary_color' },
                    { label: 'Couleur secondaire', key: 'secondary_color' },
                  ] as const).map(c => (
                    <div key={c.key}>
                      <label className="text-xs font-bold text-gray-500 block mb-1.5">{c.label}</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={form[c.key]} onChange={e => set(c.key, e.target.value)}
                          className="w-11 h-11 rounded-xl border-0 cursor-pointer p-1 bg-white border border-gray-200" />
                        <input type="text" value={form[c.key]} onChange={e => set(c.key, e.target.value)}
                          className="flex-1 px-4 py-2.5 rounded-xl bg-white text-sm outline-none border border-gray-200 font-mono" />
                        <div className="w-11 h-11 rounded-xl flex-shrink-0 border border-gray-100" style={{ backgroundColor: form[c.key] }} />
                      </div>
                    </div>
                  ))}
                  <div className="rounded-2xl p-4" style={{ backgroundColor: form.primary_color + '12' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white overflow-hidden border border-white/60"
                        style={{ backgroundColor: form.logo_url ? '#fff' : form.primary_color }}>
                        {form.logo_url
                          ? <img src={form.logo_url} alt="" className="w-full h-full object-contain p-1" />
                          : <Store size={18} strokeWidth={2.2} />}
                      </div>
                      <div>
                        <p className="font-black text-sm" style={{ color: form.primary_color }}>{form.name || 'Mon Restaurant'}</p>
                        <p className="text-xs text-gray-400">/{form.slug || 'mon-restaurant'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 'abonnement' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl p-4 border border-gray-200">
                    <p className="text-xs font-bold text-gray-500 mb-3">Abonnement TableQR</p>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-2xl font-black text-gray-900">{formatPrice(MONTHLY_PRICE, 'XOF')}</p>
                        <p className="text-xs text-gray-400">par mois · toutes fonctionnalités</p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#F26522' }}>
                        <CreditCard size={20} className="text-white" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { val: 'subscribed' as const, label: 'Abonné', sub: 'Paie dès maintenant', color: '#10B981', Icon: Check },
                        { val: 'trial' as const, label: 'Essai', sub: 'Période gratuite', color: '#F59E0B', Icon: Clock },
                      ]).map(opt => (
                        <button key={opt.val} onClick={() => setSubscriptionStatus(opt.val)}
                          className="p-3.5 rounded-xl text-left border-2 transition-all"
                          style={subscriptionStatus === opt.val
                            ? { borderColor: opt.color, backgroundColor: opt.color + '12' }
                            : { borderColor: '#E5E7EB', backgroundColor: 'white' }}>
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2"
                            style={{ backgroundColor: opt.color + '20' }}>
                            <opt.Icon size={14} style={{ color: opt.color }} />
                          </div>
                          <p className="font-black text-sm text-gray-900">{opt.label}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{opt.sub}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 text-center">Modifiable à tout moment depuis le dashboard</p>
                </div>
              )}

              <div className="flex gap-2 mt-5">
                {stepIdx > 0 && (
                  <button onClick={() => setStep(steps[stepIdx - 1])}
                    className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-white border border-gray-200">
                    Retour
                  </button>
                )}
                {stepIdx < steps.length - 1 ? (
                  <motion.button whileTap={{ scale: 0.97 }}
                    onClick={() => setStep(steps[stepIdx + 1])}
                    disabled={step === 'info' && (!form.name || !form.email)}
                    className="flex-1 py-3 rounded-xl font-black text-white disabled:opacity-40"
                    style={{ backgroundColor: '#F26522' }}>
                    Continuer
                  </motion.button>
                ) : (
                  <motion.button whileTap={{ scale: 0.97 }} onClick={createNormal} disabled={loading}
                    className="flex-1 py-3 rounded-xl font-black text-white disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#F26522' }}>
                    {loading ? 'Création...' : <><Rocket size={15} /> Créer</>}
                  </motion.button>
                )}
              </div>
            </div>
          </>
        )}

        {mode === 'normal' && success && (
          <div className="flex-1 flex flex-col p-5">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}
              className="w-16 h-16 rounded-3xl bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check size={28} className="text-green-600" strokeWidth={3} />
            </motion.div>
            <p className="font-black text-xl text-gray-900 text-center mb-1">Restaurant créé !</p>
            <p className="text-gray-400 text-sm text-center mb-5">Statut : <strong>{subscriptionStatus === 'subscribed' ? 'Abonné' : 'Essai'}</strong></p>
            {credentials && (
              <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2 mb-5">
                <p className="text-xs font-black text-gray-500 flex items-center gap-1.5"><Key size={11} /> Identifiants</p>
                <div className="space-y-2">
                  <div className="flex justify-between"><span className="text-xs text-gray-400">Email</span><span className="text-sm font-bold text-gray-900">{credentials.email}</span></div>
                  <div className="h-px bg-gray-100" />
                  <div className="flex justify-between items-center"><span className="text-xs text-gray-400">Mot de passe</span><span className="font-black px-3 py-1 rounded-xl text-sm" style={{ backgroundColor: '#FFF7F0', color: '#F26522' }}>{credentials.password}</span></div>
                </div>
                <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertTriangle size={11} /> Notez ces identifiants maintenant</p>
              </div>
            )}
            <button onClick={() => { onClose(); window.location.reload() }}
              className="w-full py-4 rounded-2xl font-black text-white" style={{ backgroundColor: '#F26522' }}>
              Fermer
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

function QRGeneratorModal({ onClose }: { onClose: () => void }) {
  const [batchName, setBatchName] = useState('')
  const [count, setCount] = useState(25)
  const [loading, setLoading] = useState(false)
  const [exportingKit, setExportingKit] = useState(false)
  const [showDesignerKitModal, setShowDesignerKitModal] = useState(false)
  const [generated, setGenerated] = useState<{ code: string }[]>([])

  async function generate() {
    if (!batchName.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/qr-codes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', batch_name: batchName, count }),
      })
      const result = await res.json()
      if (res.ok) setGenerated(result.data || [])
      else alert(result.error || 'Erreur')
    } catch { alert('Erreur réseau') }
    finally { setLoading(false) }
  }

  function printBatch() {
    const html = generateQRPrintHTML(generated.map(qr => ({ code: qr.code })), getAppUrl(), batchName)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (win) setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  async function exportDesignerKit(requestedCount: number): Promise<boolean> {
    if (exportingKit) return false
    setExportingKit(true)
    try {
      const useGeneratedCodes = generated.length > 0 && requestedCount === generated.length
      const res = await fetch('/api/qr-codes/design-kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(useGeneratedCodes
            ? { codes: generated.map(qr => ({ code: qr.code })) }
            : { count: requestedCount }),
          batch_name: batchName || 'lot-qr',
          app_url: getAppUrl(),
          include_png: false,
        }),
      })
      if (!res.ok) {
        const result = await res.json().catch(() => null)
        alert(result?.error || 'Export impossible')
        return false
      }
      await downloadResponseFile(res, `${batchName || 'lot-qr'}.zip`)
      return true
    } catch {
      alert('Erreur réseau')
      return false
    } finally {
      setExportingKit(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="relative bg-gray-50 w-full max-w-md mx-auto rounded-t-[2rem] max-h-[85vh] flex flex-col"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}>

        <div className="flex items-center justify-between p-5 pb-4 bg-white rounded-t-[2rem] border-b border-gray-100">
          <div>
            <h2 className="font-black text-lg text-gray-900">Générer des QR Codes</h2>
            <p className="text-xs text-gray-400 mt-0.5">Codes pré-imprimables indépendants</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-2xl bg-gray-100 flex items-center justify-center">
            <X size={14} className="text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {generated.length === 0 ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">Nom du lot *</label>
                <input type="text" placeholder="Ex: Abidjan Avril 2026" value={batchName}
                  onChange={e => setBatchName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white text-sm outline-none border border-gray-200 focus:border-orange-300" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-2">Nombre de codes</label>
                <div className="grid grid-cols-5 gap-2">
                  {[10, 25, 50, 100, 200].map(n => (
                    <button key={n} onClick={() => setCount(n)}
                      className="py-3 rounded-xl text-sm font-black border-2 transition-all"
                      style={count === n
                        ? { borderColor: '#F26522', backgroundColor: '#FFF7F0', color: '#F26522' }
                        : { borderColor: '#E5E7EB', backgroundColor: 'white', color: '#6B7280' }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <motion.button whileTap={{ scale: 0.97 }} onClick={generate} disabled={loading || !batchName.trim()}
                  className="py-3.5 rounded-xl font-black text-white disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#F26522' }}>
                  {loading ? 'Génération...' : <><Printer size={16} /> Générer {count} codes</>}
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowDesignerKitModal(true)} disabled={exportingKit || !batchName.trim()}
                  className="py-3.5 rounded-xl font-black disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#ECFDF5', color: '#047857' }}>
                  {exportingKit ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  Kit designer
                </motion.button>
              </div>
            </div>
          ) : (
            <div>
              <PrintUrlCheck />
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <p className="font-black text-gray-900">{generated.length} codes générés</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => setShowDesignerKitModal(true)} disabled={exportingKit}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-60"
                    style={{ backgroundColor: '#ECFDF5', color: '#047857' }}>
                    {exportingKit ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    Kit designer
                  </button>
                  <button onClick={printBatch}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold"
                    style={{ backgroundColor: '#F26522' }}>
                    <Printer size={14} /> Imprimer
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {generated.slice(0, 20).map(qr => (
                  <div key={qr.code} className="bg-white rounded-xl p-3 text-center border border-gray-100">
                    <p className="text-xs font-mono font-black tracking-widest text-gray-800">{qr.code}</p>
                  </div>
                ))}
                {generated.length > 20 && (
                  <p className="col-span-2 text-center text-xs text-gray-400 py-2">+{generated.length - 20} autres dans le PDF</p>
                )}
              </div>
              <button onClick={() => { setGenerated([]); setBatchName('') }}
                className="w-full py-3 rounded-xl bg-white text-gray-700 font-bold text-sm border border-gray-200">
                Générer un autre lot
              </button>
            </div>
          )}
        </div>

        <AnimatePresence>
          {showDesignerKitModal && (
            <DesignerKitQuantityModal
              defaultCount={generated.length || count || 200}
              loading={exportingKit}
              primaryColor="#F26522"
              onClose={() => setShowDesignerKitModal(false)}
              onConfirm={async (nextCount) => {
                const ok = await exportDesignerKit(nextCount)
                if (ok) setShowDesignerKitModal(false)
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
