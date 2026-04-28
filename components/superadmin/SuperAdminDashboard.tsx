'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Store, Users, TrendingUp, ChevronRight, X, Check, LogOut, QrCode, Eye, AlertTriangle, Printer, Key, Globe, Phone, Mail, Settings, Rocket } from 'lucide-react'
import { formatPrice, formatTimeAgo } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { generateQRPrintHTML } from '@/lib/qr-print-template'
import type { Restaurant } from '@/types'
import RestaurantAnalyticsPanel from './RestaurantAnalyticsPanel'

interface Props {
  restaurants: Restaurant[]
  stats: any[]
}

const PLANS = [
  { key: 'starter', label: 'Starter', price: 15000, desc: 'Jusqu\'à 10 tables, menu digital, commandes' },
  { key: 'pro', label: 'Pro', price: 35000, desc: 'Illimité + Social + Jeux + Analytics' },
  { key: 'enterprise', label: 'Enterprise', price: 75000, desc: 'Tout inclus + support dédié + domaine custom' },
]

function getAppUrl(): string {
  return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
}

function isEphemeralVercelUrl(url: string): boolean {
  try {
    const host = new URL(url).host
    if (!host.endsWith('.vercel.app')) return false
    const sub = host.replace('.vercel.app', '')
    const parts = sub.split('-')
    if (parts.length < 3) return false
    return parts.some(p => p.length >= 6 && /[a-z]/.test(p) && /[0-9]/.test(p))
  } catch { return false }
}

function PrintUrlCheck() {
  const [origin, setOrigin] = useState('')
  useEffect(() => { setOrigin(window.location.origin) }, [])
  if (!origin) return null
  const ephemeral = isEphemeralVercelUrl(origin)
  return (
    <div className={`rounded-2xl p-3 mb-4 border ${ephemeral ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
      <p className={`text-xs font-black uppercase tracking-wide mb-1 flex items-center gap-1.5 ${ephemeral ? 'text-red-700' : 'text-emerald-700'}`}>
        URL encodée dans les QR
      </p>
      <p className="font-mono text-xs break-all text-gray-800">{origin}/t/CODE</p>
      {ephemeral && (
        <p className="text-xs text-red-700 mt-2 font-semibold flex items-start gap-1.5">
          <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
          <span>Tu es sur un déploiement Vercel temporaire. Ces QR cesseront de fonctionner au prochain déploiement. Ouvre le superadmin sur ton domaine de production stable avant d&apos;imprimer.</span>
        </p>
      )}
    </div>
  )
}

export default function SuperAdminDashboard({ restaurants: initialRestaurants, stats }: Props) {
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

  const totalRevenue = stats.filter(s => s.status === 'paid' || s.payment_status === 'paid').reduce((sum, s) => sum + (s.total || 0), 0)
  const activeRestos = localRestaurants.filter(r => r.is_active && !r.is_preview).length
  const previewRestos = localRestaurants.filter(r => r.is_preview).length

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
      {/* HEADER */}
      <div className="bg-white border-b px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-900">
              TABLE<span style={{ color: '#F26522' }}>QR</span>
              <span className="ml-2 text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-bold">Super Admin</span>
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">Plateforme SaaS — Gestion globale</p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowQR(true)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-2xl text-sm font-bold border border-gray-200 text-gray-600 hover:bg-gray-50">
              <QrCode size={15} />
              QR
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowNew(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white text-sm font-bold shadow-lg"
              style={{ backgroundColor: '#F26522', boxShadow: '0 4px 15px #F2652250' }}>
              <Plus size={16} />
              Nouveau resto
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2.5 rounded-2xl text-gray-600 text-sm font-bold border border-gray-200 hover:bg-gray-50">
              <LogOut size={15} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-3 px-5 py-4">
        {[
          { label: 'Actifs', value: String(activeRestos), sub: `${previewRestos} preview`, icon: Store, color: '#F26522' },
          { label: 'CA Total', value: formatPrice(totalRevenue, 'XOF'), sub: 'Toutes commandes', icon: TrendingUp, color: '#22C55E' },
          { label: 'Total', value: String(localRestaurants.length), sub: 'Restaurants', icon: Users, color: '#3B82F6' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-3 shadow-sm">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: s.color + '15' }}>
              <s.icon size={16} style={{ color: s.color }} />
            </div>
            <p className="font-black text-gray-900 text-sm">{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* SEARCH */}
      <div className="px-5 mb-3">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Rechercher un restaurant..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm outline-none bg-white shadow-sm" />
        </div>
      </div>

      {/* LISTE */}
      <div className="px-5 space-y-3 pb-8">
        <p className="font-bold text-gray-900 text-sm mb-1">{filtered.length} restaurant{filtered.length > 1 ? 's' : ''}</p>
        <AnimatePresence>
          {filtered.map((r, i) => (
            <motion.button key={r.id}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }} whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedResto(r)}
              className="w-full bg-white rounded-3xl p-4 shadow-sm text-left flex items-center gap-4"
              style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-white text-lg"
                style={{ backgroundColor: r.primary_color }}>
                {r.logo_url
                  ? <img src={r.logo_url} alt="" className="w-full h-full object-cover rounded-2xl" />
                  : r.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-black text-gray-900 text-sm">{r.name}</p>
                  {r.is_preview ? (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-yellow-100 text-yellow-700">PREVIEW</span>
                  ) : (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${r.is_active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                      {r.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">/{r.slug} · {r.city || 'Ville non définie'}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    r.plan === 'enterprise' ? 'bg-purple-100 text-purple-600' :
                    r.plan === 'pro' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                  }`}>{r.plan?.toUpperCase()}</span>
                  <span className="text-xs text-gray-400">{r.currency}</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
            </motion.button>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 font-medium">Aucun restaurant trouvé</p>
          </div>
        )}
      </div>

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
  const [step, setStep] = useState<'info' | 'design' | 'plan'>('info')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [credentials, setCredentials] = useState<{ email: string; password: string; login_url: string } | null>(null)
  const [previewDone, setPreviewDone] = useState(false)
  const [form, setForm] = useState({
    name: '', slug: '', city: '', country: 'CI', phone: '', email: '', password: '',
    description: '', primary_color: '#F26522', secondary_color: '#D4A017',
    accent_color: '#C0392B', bot_name: 'Tantie', currency: 'XOF', plan: 'starter',
  })
  const [previewForm, setPreviewForm] = useState({ name: '', city: '', phone: '', currency: 'XOF' })

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
    if (key === 'name') {
      setForm(prev => ({
        ...prev, name: value,
        slug: value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      }))
    }
  }

  async function createNormal() {
    if (!form.name || !form.email || !form.slug) return
    setLoading(true)
    try {
      const res = await fetch('/api/restaurants', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, is_active: true, is_preview: false, module_social: true, module_games: true, module_delivery: true, module_loyalty: true, module_birthday: true, tax_rate: 0 }),
      })
      const result = await res.json()
      if (res.ok) { setCredentials(result.credentials); setSuccess(true) }
      else alert(result.error || 'Erreur lors de la création')
    } catch { alert('Erreur réseau') }
    finally { setLoading(false) }
  }

  async function createPreview() {
    if (!previewForm.name) return
    setLoading(true)
    try {
      const res = await fetch('/api/restaurants', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...previewForm, is_preview: true }),
      })
      const result = await res.json()
      if (res.ok) setPreviewDone(true)
      else alert(result.error || 'Erreur lors de la création')
    } catch { alert('Erreur réseau') }
    finally { setLoading(false) }
  }

  const steps = ['info', 'design', 'plan']
  const stepIdx = steps.indexOf(step)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="relative bg-white w-full max-w-md mx-auto rounded-t-[2rem] max-h-[92vh] flex flex-col"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}>

        <div className="flex items-center justify-between p-5 pb-3">
          <div>
            <h2 className="font-black text-xl text-gray-900">Nouveau restaurant</h2>
            {mode === 'normal' && <p className="text-xs text-gray-400 mt-0.5">Étape {stepIdx + 1}/3</p>}
            {mode === 'preview' && <p className="text-xs text-yellow-600 mt-0.5 font-semibold">Mode Preview</p>}
          </div>
          <button onClick={mode ? () => setMode(null) : onClose}
            className="w-8 h-8 rounded-2xl bg-gray-100 flex items-center justify-center">
            <X size={15} className="text-gray-600" />
          </button>
        </div>

        {/* ── CHOIX DU MODE ── */}
        {!mode && (
          <div className="flex-1 overflow-y-auto px-5 pb-8">
            <p className="text-sm text-gray-500 mb-5">Comment souhaitez-vous créer ce restaurant ?</p>
            <div className="space-y-3">
              <button onClick={() => setMode('normal')}
                className="w-full p-5 rounded-3xl border-2 border-gray-100 bg-white text-left hover:border-orange-200 hover:bg-orange-50/30 transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <Store size={22} className="text-orange-600" />
                  </div>
                  <div>
                    <p className="font-black text-gray-900 text-sm mb-1">Restaurant Normal</p>
                    <p className="text-xs text-gray-400 leading-relaxed">Compte complet avec email et mot de passe. Le gérant peut se connecter immédiatement.</p>
                    <p className="text-xs text-orange-500 font-semibold mt-2">Email + mot de passe requis</p>
                  </div>
                </div>
              </button>

              <button onClick={() => setMode('preview')}
                className="w-full p-5 rounded-3xl border-2 border-yellow-200 bg-yellow-50/50 text-left hover:border-yellow-400 hover:bg-yellow-50 transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-yellow-100 flex items-center justify-center flex-shrink-0">
                    <Eye size={22} className="text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-black text-gray-900 text-sm mb-1">Mode Preview / Prospection</p>
                    <p className="text-xs text-gray-400 leading-relaxed">Démo instantanée pour convaincre un prospect. Menu auto-généré, QR codes prêts à coller.</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {['Menu démo généré', 'QR prêts', 'Juste le nom requis'].map(t => (
                        <span key={t} className="text-xs text-yellow-700 font-semibold bg-yellow-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Check size={10} strokeWidth={3} /> {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── PREVIEW FORM ── */}
        {mode === 'preview' && !previewDone && (
          <div className="flex-1 overflow-y-auto px-5 pb-5">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">Nom du restaurant *</label>
                <div className="relative">
                  <Store size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Ex: Chez Kofi" value={previewForm.name}
                    onChange={e => setPreviewForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-50 text-sm outline-none border border-gray-100 focus:border-yellow-300" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">Ville <span className="text-gray-300">(optionnel)</span></label>
                <input type="text" placeholder="Abidjan" value={previewForm.city}
                  onChange={e => setPreviewForm(p => ({ ...p, city: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 text-sm outline-none border border-gray-100" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">Téléphone <span className="text-gray-300">(optionnel)</span></label>
                <input type="text" placeholder="+225 07 00 00 00" value={previewForm.phone}
                  onChange={e => setPreviewForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 text-sm outline-none border border-gray-100" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">Devise</label>
                <select value={previewForm.currency} onChange={e => setPreviewForm(p => ({ ...p, currency: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 text-sm outline-none border border-gray-100">
                  <option value="XOF">XOF — Franc CFA (UEMOA)</option>
                  <option value="XAF">XAF — Franc CFA (CEMAC)</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="USD">USD — Dollar</option>
                  <option value="GHS">GHS — Cedi ghanéen</option>
                  <option value="NGN">NGN — Naira nigérian</option>
                </select>
              </div>
              <div className="bg-yellow-50 rounded-2xl p-4 border border-yellow-100">
                <p className="text-xs text-yellow-700 font-bold mb-2">Ce qui sera créé automatiquement</p>
                {['Menu démo avec 4 catégories et 17 plats', 'Couleur aléatoire pour l\'identité visuelle', 'QR codes prêts à lier aux tables'].map(t => (
                  <p key={t} className="text-xs text-yellow-600 flex items-center gap-1.5 mt-1">
                    <Check size={12} strokeWidth={3} /> {t}
                  </p>
                ))}
              </div>
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={createPreview}
              disabled={loading || !previewForm.name}
              className="w-full mt-6 py-3.5 rounded-2xl font-bold text-white disabled:opacity-40"
              style={{ backgroundColor: '#EAB308' }}>
              {loading ? 'Création...' : <span className="flex items-center justify-center gap-2"><Eye size={16} /> Créer le preview</span>}
            </motion.button>
          </div>
        )}

        {/* ── PREVIEW SUCCESS ── */}
        {mode === 'preview' && previewDone && (
          <div className="flex-1 flex flex-col p-5 overflow-y-auto">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}
              className="w-16 h-16 rounded-3xl bg-yellow-100 flex items-center justify-center mx-auto mb-4">
              <Eye size={28} className="text-yellow-600" />
            </motion.div>
            <p className="font-black text-xl text-gray-900 text-center mb-1">Preview créé !</p>
            <p className="text-gray-400 text-sm text-center mb-5">Menu démo généré · QR codes prêts à lier</p>
            <div className="bg-yellow-50 rounded-2xl p-4 border border-yellow-100 mb-5">
              <p className="text-xs text-yellow-700 font-bold mb-2">Prochaines étapes</p>
              <p className="text-xs text-yellow-600 mt-1">1. Générez des QR codes depuis le bouton <strong>QR</strong> en haut</p>
              <p className="text-xs text-yellow-600 mt-1">2. Collez-les sur les tables du prospect</p>
              <p className="text-xs text-yellow-600 mt-1">3. Liez les QR depuis le dashboard admin du restaurant</p>
              <p className="text-xs text-yellow-600 mt-1">4. Quand convaincu → cliquez <strong>Activer</strong> sur la fiche</p>
            </div>
            <button onClick={() => { onClose(); window.location.reload() }}
              className="w-full py-4 rounded-2xl font-black text-white text-base"
              style={{ backgroundColor: '#EAB308' }}>
              Fermer et voir la liste
            </button>
          </div>
        )}

        {/* ── NORMAL FLOW ── */}
        {mode === 'normal' && !success && (
          <>
            <div className="flex gap-1.5 px-5 mb-4">
              {steps.map((s, i) => (
                <div key={s} className="flex-1 h-1 rounded-full transition-all"
                  style={{ backgroundColor: i <= stepIdx ? '#F26522' : '#E5E7EB' }} />
              ))}
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-5">
              {step === 'info' && (
                <div className="space-y-4">
                  <p className="font-bold text-gray-700 text-sm">Informations générales</p>
                  {[
                    { label: 'Nom du restaurant *', key: 'name', placeholder: 'Ex: Chez Kofi', icon: Store },
                    { label: 'Slug URL *', key: 'slug', placeholder: 'ex: chez-kofi', icon: Globe },
                    { label: 'Ville', key: 'city', placeholder: 'Abidjan', icon: Globe },
                    { label: 'Téléphone', key: 'phone', placeholder: '+225 07 00 00 00', icon: Phone },
                    { label: 'Email *', key: 'email', placeholder: 'contact@restaurant.com', icon: Mail },
                    { label: 'Mot de passe *', key: 'password', placeholder: 'Min. 8 caractères', icon: Settings },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-xs font-bold text-gray-500 block mb-1.5">{f.label}</label>
                      <div className="relative">
                        <f.icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder={f.placeholder} value={(form as any)[f.key]}
                          onChange={e => set(f.key, e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-50 text-sm outline-none border border-gray-100 focus:border-orange-300" />
                      </div>
                    </div>
                  ))}
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1.5">Description</label>
                    <textarea placeholder="Décrivez votre restaurant..." value={form.description}
                      onChange={e => set('description', e.target.value)} rows={3}
                      className="w-full px-4 py-3 rounded-2xl bg-gray-50 text-sm outline-none border border-gray-100 resize-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1.5">Devise</label>
                    <select value={form.currency} onChange={e => set('currency', e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-gray-50 text-sm outline-none border border-gray-100">
                      <option value="XOF">XOF — Franc CFA (UEMOA)</option>
                      <option value="XAF">XAF — Franc CFA (CEMAC)</option>
                      <option value="EUR">EUR — Euro</option>
                      <option value="USD">USD — Dollar</option>
                      <option value="GHS">GHS — Cedi ghanéen</option>
                      <option value="NGN">NGN — Naira nigérian</option>
                    </select>
                  </div>
                </div>
              )}

              {step === 'design' && (
                <div className="space-y-5">
                  <p className="font-bold text-gray-700 text-sm">Personnalisation visuelle</p>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1.5">Nom du bot assistant</label>
                    <input type="text" placeholder="Tantie, Chef, Alex..." value={form.bot_name}
                      onChange={e => set('bot_name', e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-gray-50 text-sm outline-none border border-gray-100" />
                  </div>
                  {[
                    { label: 'Couleur principale', key: 'primary_color' },
                    { label: 'Couleur secondaire', key: 'secondary_color' },
                    { label: 'Couleur accent', key: 'accent_color' },
                  ].map(c => (
                    <div key={c.key}>
                      <label className="text-xs font-bold text-gray-500 block mb-2">{c.label}</label>
                      <div className="flex items-center gap-3">
                        <input type="color" value={(form as any)[c.key]} onChange={e => set(c.key, e.target.value)}
                          className="w-12 h-12 rounded-2xl border-0 cursor-pointer p-1 bg-gray-50" />
                        <input type="text" value={(form as any)[c.key]} onChange={e => set(c.key, e.target.value)}
                          className="flex-1 px-4 py-3 rounded-2xl bg-gray-50 text-sm outline-none border border-gray-100 font-mono" />
                        <div className="w-12 h-12 rounded-2xl flex-shrink-0" style={{ backgroundColor: (form as any)[c.key] }} />
                      </div>
                    </div>
                  ))}
                  <div className="rounded-3xl p-4" style={{ backgroundColor: form.primary_color + '10' }}>
                    <p className="text-xs font-bold text-gray-500 mb-3">Aperçu</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black"
                        style={{ backgroundColor: form.primary_color }}>
                        {form.name.charAt(0) || 'R'}
                      </div>
                      <div>
                        <p className="font-black text-sm" style={{ color: form.primary_color }}>{form.name || 'Mon Restaurant'}</p>
                        <p className="text-xs text-gray-400">/{form.slug || 'mon-restaurant'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 'plan' && (
                <div className="space-y-3">
                  <p className="font-bold text-gray-700 text-sm">Choisir un plan</p>
                  {PLANS.map(plan => (
                    <button key={plan.key} onClick={() => set('plan', plan.key)}
                      className="w-full p-4 rounded-3xl text-left border-2 transition-all"
                      style={form.plan === plan.key
                        ? { borderColor: '#F26522', backgroundColor: '#FFF7F0' }
                        : { borderColor: '#E5E7EB', backgroundColor: 'white' }}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-black text-sm ${form.plan === plan.key ? 'text-orange-600' : 'text-gray-900'}`}>{plan.label}</span>
                          {plan.key === 'pro' && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">Populaire</span>}
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${form.plan === plan.key ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`}>
                          {form.plan === plan.key && <Check size={11} className="text-white" strokeWidth={3} />}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">{plan.desc}</p>
                      <p className="font-black" style={{ color: '#F26522' }}>{formatPrice(plan.price, 'XOF')}<span className="font-normal text-gray-400 text-xs">/mois</span></p>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                {stepIdx > 0 && (
                  <button onClick={() => setStep(steps[stepIdx - 1] as any)}
                    className="flex-1 py-3.5 rounded-2xl font-bold text-gray-600 bg-gray-100">
                    Retour
                  </button>
                )}
                {stepIdx < steps.length - 1 ? (
                  <motion.button whileTap={{ scale: 0.97 }}
                    onClick={() => setStep(steps[stepIdx + 1] as any)}
                    disabled={step === 'info' && !form.name}
                    className="flex-1 py-3.5 rounded-2xl font-bold text-white disabled:opacity-40"
                    style={{ backgroundColor: '#F26522' }}>
                    Continuer →
                  </motion.button>
                ) : (
                  <motion.button whileTap={{ scale: 0.97 }} onClick={createNormal} disabled={loading}
                    className="flex-1 py-3.5 rounded-2xl font-bold text-white disabled:opacity-60"
                    style={{ backgroundColor: '#F26522' }}>
                    {loading ? 'Création...' : <span className="flex items-center justify-center gap-2"><Rocket size={16} /> Créer le restaurant</span>}
                  </motion.button>
                )}
              </div>
            </div>
          </>
        )}

        {mode === 'normal' && success && (
          <div className="flex-1 flex flex-col p-5 overflow-y-auto">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}
              className="w-16 h-16 rounded-3xl bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17L4 12" />
              </svg>
            </motion.div>
            <p className="font-black text-xl text-gray-900 text-center mb-1">Restaurant créé !</p>
            <p className="text-gray-400 text-sm text-center mb-5">Voici les identifiants du propriétaire</p>
            {credentials && (
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-3 mb-5">
                <p className="text-xs font-black text-gray-500 uppercase tracking-wide flex items-center gap-1.5"><Key size={12} /> Identifiants de connexion</p>
                <div className="bg-white rounded-xl p-3 space-y-2 border border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400 font-medium">Email</span>
                    <span className="text-sm font-bold text-gray-900">{credentials.email}</span>
                  </div>
                  <div className="h-px bg-gray-100" />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400 font-medium">Mot de passe</span>
                    <span className="text-lg font-black px-3 py-1 rounded-xl" style={{ backgroundColor: '#FFF7F0', color: '#F26522' }}>{credentials.password}</span>
                  </div>
                  <div className="h-px bg-gray-100" />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400 font-medium">URL</span>
                    <span className="text-xs font-mono text-blue-600">/admin/login</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50">
                  <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
                  <p className="text-xs text-red-500 font-medium">Notez ces identifiants — ils ne seront plus affichés</p>
                </div>
              </div>
            )}
            <button onClick={() => { onClose(); window.location.reload() }}
              className="w-full py-4 rounded-2xl font-black text-white text-base" style={{ backgroundColor: '#F26522' }}>
              Fermer et voir la liste
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
    const appUrl = getAppUrl()
    const items = generated.map(qr => ({ code: qr.code }))
    const html = generateQRPrintHTML(items, appUrl, batchName)

    const win = window.open('', '_blank')
    win?.document.write(html)
    win?.document.close()
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="relative bg-white w-full max-w-md mx-auto rounded-t-[2rem] max-h-[85vh] flex flex-col"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}>

        <div className="flex items-center justify-between p-5 pb-3">
          <div>
            <h2 className="font-black text-xl text-gray-900">Générer des QR Codes</h2>
            <p className="text-xs text-gray-400 mt-0.5">Codes pré-imprimables indépendants</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-2xl bg-gray-100 flex items-center justify-center">
            <X size={15} className="text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {generated.length === 0 ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">Nom du lot *</label>
                <input type="text" placeholder="Ex: Abidjan Avril 2026" value={batchName}
                  onChange={e => setBatchName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 text-sm outline-none border border-gray-100 focus:border-orange-300" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-2">Nombre de codes</label>
                <div className="grid grid-cols-5 gap-2">
                  {[10, 25, 50, 100, 200].map(n => (
                    <button key={n} onClick={() => setCount(n)}
                      className="py-3 rounded-2xl text-sm font-black border-2 transition-all"
                      style={count === n
                        ? { borderColor: '#F26522', backgroundColor: '#FFF7F0', color: '#F26522' }
                        : { borderColor: '#E5E7EB', backgroundColor: 'white', color: '#6B7280' }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <p className="text-xs text-gray-500">Chaque code est unique et imprimé sous le QR pour saisie manuelle si besoin.</p>
                <p className="text-xs text-gray-500 mt-1">Format: <span className="font-mono font-bold">A3F7K2M9</span></p>
              </div>
              <motion.button whileTap={{ scale: 0.97 }} onClick={generate} disabled={loading || !batchName.trim()}
                className="w-full py-3.5 rounded-2xl font-bold text-white disabled:opacity-40"
                style={{ backgroundColor: '#F26522' }}>
                {loading ? 'Génération...' : <span className="flex items-center justify-center gap-2"><Printer size={16} /> Générer {count} codes</span>}
              </motion.button>
            </div>
          ) : (
            <div>
              {/* Encart de vérification d'URL — CRUCIAL avant impression */}
              <PrintUrlCheck />

              <div className="flex items-center justify-between mb-4">
                <p className="font-black text-gray-900">{generated.length} codes générés</p>
                <button onClick={printBatch}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold"
                  style={{ backgroundColor: '#F26522' }}>
                  <Printer size={14} />
                  Imprimer
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-5">
                {generated.slice(0, 20).map(qr => (
                  <div key={qr.code} className="bg-gray-50 rounded-2xl p-3 text-center">
                    <p className="text-xs font-mono font-black tracking-widest text-gray-800">{qr.code}</p>
                  </div>
                ))}
                {generated.length > 20 && (
                  <div className="col-span-2 text-center py-2">
                    <p className="text-xs text-gray-400">+{generated.length - 20} autres codes dans le PDF imprimé</p>
                  </div>
                )}
              </div>
              <button onClick={() => { setGenerated([]); setBatchName('') }}
                className="w-full py-3 rounded-2xl bg-gray-100 text-gray-700 font-bold text-sm">
                Générer un autre lot
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
