'use client'
import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  X, Store, Layers, QrCode, TrendingUp, BookOpen, Check,
  AlertTriangle, Pause, Play, Trash2, Eye, Rocket, Key,
  Mail, Phone, Globe, Users, Loader2, MessageCircle,
  Gamepad2, Bike, Star, Cake, Clock, DollarSign, Package,
  UtensilsCrossed, Smartphone, FileText,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'
import type { Restaurant, RestaurantTable, QRCode, MenuCategory, MenuItem, Order, ClientSession } from '@/types'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Tab = 'apercu' | 'tables' | 'menu' | 'revenus'

interface PanelData {
  tables: RestaurantTable[]
  qrCodes: QRCode[]
  categories: (MenuCategory & { items: MenuItem[] })[]
  orders: Pick<Order, 'id' | 'total' | 'status' | 'payment_status' | 'payment_method' | 'created_at' | 'order_number'>[]
  sessions: Pick<ClientSession, 'id' | 'created_at' | 'entered_at' | 'left_at' | 'profile_type'>[]
}

export default function RestaurantAnalyticsPanel({
  restaurant,
  onClose,
  onDeleted,
}: {
  restaurant: Restaurant
  onClose: () => void
  onDeleted: (id: string) => void
}) {
  const p = restaurant.primary_color
  const [tab, setTab] = useState<Tab>('apercu')
  const [data, setData] = useState<PanelData | null>(null)
  const [loading, setLoading] = useState(true)

  const [deleting, setDeleting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [showActivate, setShowActivate] = useState(false)
  const [activateForm, setActivateForm] = useState({ email: '', password: '' })
  const [activating, setActivating] = useState(false)
  const [activateSuccess, setActivateSuccess] = useState<{ email: string; password: string } | null>(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const [
        { data: tables },
        { data: qrCodes },
        { data: categories },
        { data: orders },
        { data: sessions },
      ] = await Promise.all([
        supabase.from('restaurant_tables').select('*').eq('restaurant_id', restaurant.id),
        supabase.from('qr_codes').select('*').eq('restaurant_id', restaurant.id),
        supabase.from('menu_categories').select('*, items:menu_items(*)').eq('restaurant_id', restaurant.id).order('position'),
        supabase.from('orders').select('id,total,status,payment_status,payment_method,created_at,order_number')
          .eq('restaurant_id', restaurant.id).order('created_at', { ascending: false }).limit(200),
        supabase.from('client_sessions').select('id,created_at,entered_at,left_at,profile_type')
          .eq('restaurant_id', restaurant.id).order('created_at', { ascending: false }).limit(500),
      ])
      setData({
        tables: tables || [],
        qrCodes: qrCodes || [],
        categories: (categories || []) as (MenuCategory & { items: MenuItem[] })[],
        orders: (orders || []) as PanelData['orders'],
        sessions: (sessions || []) as PanelData['sessions'],
      })
      setLoading(false)
    })()
  }, [restaurant.id])

  const metrics = useMemo(() => {
    if (!data) return null
    const totalScans = data.qrCodes.reduce((s, q) => s + (q.scan_count || 0), 0)
    const paidOrders = data.orders.filter(o => o.payment_status === 'paid')
    const totalRevenue = paidOrders.reduce((s, o) => s + (o.total || 0), 0)
    const activeTables = data.tables.filter(t => t.is_active).length

    const hourCounts = Array(24).fill(0)
    data.sessions.forEach(s => {
      const h = new Date(s.entered_at || s.created_at).getHours()
      hourCounts[h]++
    })
    const maxHour = Math.max(...hourCounts, 1)
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts))

    const profileCounts: Record<string, number> = {}
    data.sessions.forEach(s => {
      const k = s.profile_type || 'solo'
      profileCounts[k] = (profileCounts[k] || 0) + 1
    })
    const totalSessions = data.sessions.length

    const durations = data.sessions
      .filter(s => s.left_at)
      .map(s => new Date(s.left_at!).getTime() - new Date(s.entered_at || s.created_at).getTime())
      .filter(d => d > 60000 && d < 6 * 3600000)
    const avgDurationMin = durations.length > 0
      ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length / 60000)
      : null

    const linkedMap: Record<string, QRCode> = {}
    data.qrCodes.forEach(q => {
      if (q.table_name && UUID_REGEX.test(q.table_name)) linkedMap[q.table_name] = q
    })

    const tablesByScan = [...data.tables]
      .map(t => ({ ...t, scans: linkedMap[t.id]?.scan_count || 0 }))
      .sort((a, b) => b.scans - a.scans)

    const catOrders = data.categories.map(cat => ({
      name: cat.name,
      icon: cat.icon,
      total: cat.items?.reduce((s, i) => s + (i.order_count || 0), 0) || 0,
      itemCount: cat.items?.length || 0,
    })).sort((a, b) => b.total - a.total)

    return {
      totalScans, totalRevenue, activeTables,
      totalOrders: data.orders.length, paidOrders: paidOrders.length,
      hourCounts, maxHour, peakHour,
      profileCounts, totalSessions, avgDurationMin,
      linkedMap, tablesByScan, catOrders,
    }
  }, [data])

  async function toggleActive() {
    await supabase.from('restaurants').update({ is_active: !restaurant.is_active }).eq('id', restaurant.id)
    window.location.reload()
  }

  async function deleteRestaurant() {
    if (!confirming) { setConfirming(true); return }
    setDeleting(true)
    setDeleteError('')
    try {
      const res = await fetch(`/api/restaurants/${restaurant.id}`, { method: 'DELETE' })
      if (res.ok) { onDeleted(restaurant.id) }
      else {
        const r = await res.json()
        setDeleteError(r.error || 'Erreur')
        setDeleting(false); setConfirming(false)
      }
    } catch { setDeleteError('Erreur réseau'); setDeleting(false); setConfirming(false) }
  }

  async function activateRestaurant() {
    if (!activateForm.email || !activateForm.password) return
    setActivating(true)
    try {
      const res = await fetch(`/api/restaurants/${restaurant.id}/activate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activateForm),
      })
      const r = await res.json()
      if (res.ok) setActivateSuccess(r.credentials)
      else alert(r.error || 'Erreur activation')
    } catch { alert('Erreur réseau') }
    finally { setActivating(false) }
  }

  const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
    { id: 'apercu', label: 'Aperçu', Icon: Store },
    { id: 'tables', label: 'Tables', Icon: Layers },
    { id: 'menu', label: 'Menu', Icon: BookOpen },
    { id: 'revenus', label: 'Revenus', Icon: TrendingUp },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative bg-gray-50 w-full max-w-lg mx-auto mt-auto rounded-t-[2rem] h-[92vh] flex flex-col shadow-2xl"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}>

        <div className="flex-shrink-0 rounded-t-[2rem] overflow-hidden">
          <div className="h-14 flex items-center px-4 gap-3" style={{ backgroundColor: p + '18' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
              style={{ backgroundColor: p, color: '#fff' }}>
              {restaurant.logo_url
                ? <img src={restaurant.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
                : restaurant.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-gray-900 truncate text-sm leading-tight">{restaurant.name}</p>
              <p className="text-xs text-gray-400">/{restaurant.slug} · {restaurant.city || '—'}</p>
            </div>
            {restaurant.is_preview ? (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-yellow-100 text-yellow-700 flex-shrink-0">Preview</span>
            ) : (
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0 flex items-center gap-1 ${restaurant.is_active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${restaurant.is_active ? 'bg-green-500' : 'bg-red-400'}`} />
                {restaurant.is_active ? 'Actif' : 'Inactif'}
              </span>
            )}
            <button onClick={onClose} className="w-7 h-7 rounded-xl bg-white/70 flex items-center justify-center flex-shrink-0">
              <X size={13} className="text-gray-600" />
            </button>
          </div>

          <div className="flex bg-white border-b border-gray-100">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex-1 flex flex-col items-center py-2.5 gap-0.5 text-xs font-bold transition-colors"
                style={tab === t.id
                  ? { color: p, borderBottom: `2px solid ${p}` }
                  : { color: '#9CA3AF', borderBottom: '2px solid transparent' }}>
                <t.Icon size={14} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 size={24} className="animate-spin" style={{ color: p }} />
            </div>
          ) : (
            <>
              {tab === 'apercu' && (
                <ApercuTab
                  restaurant={restaurant} data={data!} metrics={metrics!} p={p}
                  onToggleActive={toggleActive}
                  onDelete={deleteRestaurant} deleting={deleting} confirming={confirming}
                  deleteError={deleteError} onCancelDelete={() => setConfirming(false)}
                  showActivate={showActivate} setShowActivate={setShowActivate}
                  activateForm={activateForm} setActivateForm={setActivateForm}
                  activating={activating} onActivate={activateRestaurant}
                  activateSuccess={activateSuccess} onClose={onClose}
                />
              )}
              {tab === 'tables' && <TablesTab data={data!} metrics={metrics!} p={p} />}
              {tab === 'menu' && <MenuTab data={data!} metrics={metrics!} p={p} currency={restaurant.currency} />}
              {tab === 'revenus' && <RevenusTab data={data!} p={p} currency={restaurant.currency} />}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function StatCard({ label, value, sub, Icon, color }: {
  label: string; value: string; sub?: string; Icon: React.ElementType; color: string
}) {
  return (
    <div className="bg-white rounded-2xl p-3 shadow-sm">
      <div className="w-7 h-7 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: color + '20' }}>
        <Icon size={14} style={{ color }} />
      </div>
      <p className="font-black text-gray-900 text-base leading-tight">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{children}</p>
}

function ApercuTab({ restaurant, data, metrics, p, onToggleActive, onDelete, deleting, confirming, deleteError, onCancelDelete, showActivate, setShowActivate, activateForm, setActivateForm, activating, onActivate, activateSuccess, onClose }: any) {
  const profileLabels: Record<string, string> = { solo: 'Solo', couple: 'Couple', famille: 'Famille', groupe: 'Groupe' }
  const profileColors: Record<string, string> = { solo: '#6366F1', couple: '#EC4899', famille: '#F59E0B', groupe: '#10B981' }

  const actions = [
    { label: 'Menu client', Icon: UtensilsCrossed, href: `/${restaurant.slug}/menu` },
    { label: 'Caisse', Icon: DollarSign, href: '/admin/dashboard' },
    { label: 'Gestion menu', Icon: FileText, href: '/admin/menu' },
    { label: 'Tables & QR', Icon: Smartphone, href: '/admin/tables' },
  ]

  return (
    <div className="p-4 space-y-4 pb-8">
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Scans total" value={String(metrics.totalScans)} Icon={QrCode} color={p} />
        <StatCard label="Tables actives" value={`${metrics.activeTables}/${data.tables.length}`} Icon={Layers} color="#6366F1" />
        <StatCard label="Commandes" value={String(metrics.totalOrders)} sub={`${metrics.paidOrders} payées`} Icon={Package} color="#F59E0B" />
        <StatCard label="Sessions" value={String(metrics.totalSessions)} sub={metrics.avgDurationMin ? `~${metrics.avgDurationMin} min moy.` : undefined} Icon={Users} color="#10B981" />
      </div>

      {data.sessions.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <SectionTitle>Heures de scan</SectionTitle>
          <div className="flex items-end gap-0.5 h-14">
            {metrics.hourCounts.map((count: number, h: number) => {
              const height = metrics.maxHour > 0 ? Math.max(2, Math.round((count / metrics.maxHour) * 52)) : 2
              const isPeak = h === metrics.peakHour && count > 0
              return (
                <div key={h} className="flex-1 flex flex-col items-center justify-end gap-0.5">
                  <div className="w-full rounded-sm transition-all"
                    style={{ height: `${height}px`, backgroundColor: isPeak ? p : p + '40' }} />
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-400">0h</span>
            <span className="text-xs font-bold" style={{ color: p }}>
              Pic : {metrics.peakHour}h–{metrics.peakHour + 1}h
            </span>
            <span className="text-xs text-gray-400">23h</span>
          </div>
        </div>
      )}

      {metrics.totalSessions > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <SectionTitle>Profils clients</SectionTitle>
          <div className="space-y-2">
            {Object.entries(metrics.profileCounts).sort((a: any, b: any) => b[1] - a[1]).map(([type, count]: any) => {
              const pct = Math.round((count / metrics.totalSessions) * 100)
              const color = profileColors[type] || '#9CA3AF'
              return (
                <div key={type}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700">{profileLabels[type] || type}</span>
                    <span className="text-xs text-gray-400">{count} · {pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                </div>
              )
            })}
          </div>
          {metrics.avgDurationMin && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
              <Clock size={13} className="text-gray-400" />
              <span className="text-xs text-gray-600">Durée moyenne de visite : <strong>{metrics.avgDurationMin} min</strong></span>
            </div>
          )}
        </div>
      )}

      {metrics.catOrders.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <SectionTitle>Sections les plus commandées</SectionTitle>
          {metrics.catOrders.slice(0, 5).map((cat: any, i: number) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-2">
                {cat.icon && <span className="text-sm">{cat.icon}</span>}
                <span className="text-sm font-semibold text-gray-800">{cat.name}</span>
                <span className="text-xs text-gray-400">{cat.itemCount} plats</span>
              </div>
              <span className="text-sm font-black" style={{ color: p }}>{cat.total} cmd</span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <SectionTitle>Infos restaurant</SectionTitle>
        <div className="space-y-2">
          {restaurant.phone && (
            <div className="flex items-center gap-2.5">
              <Phone size={13} className="text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-700">{restaurant.phone}</span>
            </div>
          )}
          {restaurant.admin_email && (
            <div className="flex items-center gap-2.5">
              <Mail size={13} className="text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-700">{restaurant.admin_email}</span>
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <Globe size={13} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-700">/{restaurant.slug}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-3.5 h-3.5 rounded-sm flex-shrink-0" style={{ backgroundColor: p }} />
            <span className="text-sm font-mono text-gray-500">{p}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-50">
          <span className={`text-xs px-2 py-1 rounded-full font-bold ${restaurant.plan === 'enterprise' ? 'bg-purple-100 text-purple-600' : restaurant.plan === 'pro' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
            {restaurant.plan?.toUpperCase()}
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">{restaurant.currency}</span>
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">{restaurant.country}</span>
        </div>
      </div>

      {!restaurant.is_preview && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <SectionTitle>Modules</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'module_social', label: 'Social', Icon: MessageCircle },
              { key: 'module_games', label: 'Jeux', Icon: Gamepad2 },
              { key: 'module_delivery', label: 'Livraison', Icon: Bike },
              { key: 'module_loyalty', label: 'Fidélité', Icon: Star },
              { key: 'module_birthday', label: 'Anniversaire', Icon: Cake },
            ].map(m => {
              const active = (restaurant as any)[m.key]
              return (
                <div key={m.key} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${active ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-300'}`}>
                  <m.Icon size={12} />{m.label}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <SectionTitle>&nbsp;</SectionTitle>
        {actions.map((a, i) => (
          <a key={a.label} href={a.href}
            className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${i > 0 ? 'border-t border-gray-50' : ''}`}>
            <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ backgroundColor: p + '15' }}>
              <a.Icon size={13} style={{ color: p }} />
            </div>
            <span className="text-sm font-semibold text-gray-700 flex-1">{a.label}</span>
          </a>
        ))}
      </div>

      {restaurant.is_preview && (
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          {!showActivate && !activateSuccess && (
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowActivate(true)}
              className="w-full py-3.5 rounded-xl font-black text-white text-sm flex items-center justify-center gap-2"
              style={{ backgroundColor: '#EAB308' }}>
              <Rocket size={15} /> Activer ce restaurant
            </motion.button>
          )}
          {showActivate && !activateSuccess && (
            <div className="space-y-3">
              <p className="font-black text-gray-900 text-sm">Créer le compte admin</p>
              <input type="email" placeholder="Email du gérant" value={activateForm.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setActivateForm((f: any) => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 text-sm outline-none border border-gray-100 focus:border-yellow-300" />
              <input type="text" placeholder="Mot de passe (min. 6 car.)" value={activateForm.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setActivateForm((f: any) => ({ ...f, password: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 text-sm outline-none border border-gray-100 focus:border-yellow-300" />
              <div className="flex gap-2">
                <button onClick={() => setShowActivate(false)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm">Annuler</button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={onActivate}
                  disabled={activating || !activateForm.email || !activateForm.password}
                  className="flex-1 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-1.5"
                  style={{ backgroundColor: '#EAB308' }}>
                  {activating ? 'Activation...' : <><Check size={14} /> Activer</>}
                </motion.button>
              </div>
            </div>
          )}
          {activateSuccess && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-green-100 flex items-center justify-center"><Check size={13} className="text-green-600" /></div>
                <p className="font-black text-green-700 text-sm">Restaurant activé !</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-400 text-xs">Email</span><span className="font-bold text-gray-900">{activateSuccess.email}</span></div>
                <div className="h-px bg-gray-100" />
                <div className="flex justify-between"><span className="text-gray-400 text-xs">Mot de passe</span><span className="font-black px-2 py-0.5 rounded-lg text-xs" style={{ backgroundColor: '#FFF7F0', color: '#F26522' }}>{activateSuccess.password}</span></div>
              </div>
              <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertTriangle size={11} /> Notez ces identifiants maintenant</p>
              <button onClick={() => { onClose(); window.location.reload() }} className="w-full py-2.5 rounded-xl bg-green-500 text-white font-bold text-sm">Fermer</button>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
        {!restaurant.is_preview && (
          <button onClick={onToggleActive}
            className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
            style={restaurant.is_active ? { backgroundColor: '#FFF5F5', color: '#DC2626' } : { backgroundColor: '#F0FDF4', color: '#16A34A' }}>
            {restaurant.is_active ? <><Pause size={14} /> Désactiver</> : <><Play size={14} /> Réactiver</>}
          </button>
        )}
        <button onClick={onDelete} disabled={deleting}
          className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          style={confirming ? { backgroundColor: '#DC2626', color: '#fff' } : { backgroundColor: '#FEF2F2', color: '#DC2626' }}>
          {deleting ? 'Suppression...' : confirming
            ? <><AlertTriangle size={14} /> Confirmer la suppression</>
            : <><Trash2 size={14} /> Supprimer le restaurant</>}
        </button>
        {confirming && (
          <button onClick={onCancelDelete} className="w-full py-2 text-xs text-gray-400 font-medium">Annuler</button>
        )}
        {deleteError && <p className="text-xs text-red-500 text-center font-semibold">{deleteError}</p>}
      </div>
    </div>
  )
}

function TablesTab({ data, metrics, p }: { data: PanelData; metrics: NonNullable<ReturnType<typeof computeMetrics>>; p: string }) {
  const zones = useMemo(() => {
    const map: Record<string, typeof metrics.tablesByScan> = {}
    metrics.tablesByScan.forEach(t => {
      const z = t.zone || 'Sans zone'
      if (!map[z]) map[z] = []
      map[z].push(t)
    })
    return map
  }, [metrics.tablesByScan])

  const maxScans = Math.max(...metrics.tablesByScan.map(t => t.scans), 1)
  const totalScans = metrics.tablesByScan.reduce((s, t) => s + t.scans, 0)

  return (
    <div className="p-4 space-y-4 pb-8">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
          <p className="font-black text-gray-900">{data.tables.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Tables</p>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
          <p className="font-black text-gray-900">{data.qrCodes.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">QR liés</p>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
          <p className="font-black" style={{ color: p }}>{totalScans}</p>
          <p className="text-xs text-gray-400 mt-0.5">Scans total</p>
        </div>
      </div>

      {Object.entries(zones).map(([zoneName, tables]) => (
        <div key={zoneName} className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50">
            <Layers size={13} style={{ color: p }} />
            <p className="font-black text-gray-900 text-sm">{zoneName}</p>
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{tables.length} tables</span>
          </div>
          {tables.map((table, i) => {
            const linked = !!metrics.linkedMap[table.id]
            const scanPct = maxScans > 0 ? Math.round((table.scans / maxScans) * 100) : 0
            return (
              <div key={table.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0"
                  style={{ backgroundColor: p + '15', color: p }}>
                  {table.table_number}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm font-semibold text-gray-800">Table {table.table_number}</span>
                    {!table.is_active && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 font-medium">Inactive</span>
                    )}
                    {linked ? (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-500 font-medium flex items-center gap-1">
                        <QrCode size={9} /> QR lié
                      </span>
                    ) : (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-400 font-medium">Pas de QR</span>
                    )}
                  </div>
                  {table.scans > 0 && (
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${scanPct}%`, backgroundColor: p }} />
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-black text-gray-900 text-sm">{table.scans}</p>
                  <p className="text-xs text-gray-400">scans</p>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function MenuTab({ data, metrics, p, currency }: { data: PanelData; metrics: NonNullable<ReturnType<typeof computeMetrics>>; p: string; currency: string }) {
  const totalItems = data.categories.reduce((s, c) => s + (c.items?.length || 0), 0)
  const activeItems = data.categories.reduce((s, c) => s + (c.items?.filter(i => i.is_available).length || 0), 0)

  const topItems = useMemo(() => {
    const all: (MenuItem & { catName: string })[] = []
    data.categories.forEach(cat => {
      cat.items?.forEach(item => all.push({ ...item, catName: cat.name }))
    })
    return all.sort((a, b) => b.order_count - a.order_count).slice(0, 10)
  }, [data.categories])

  return (
    <div className="p-4 space-y-4 pb-8">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
          <p className="font-black text-gray-900">{data.categories.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Catégories</p>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
          <p className="font-black text-gray-900">{totalItems}</p>
          <p className="text-xs text-gray-400 mt-0.5">Plats total</p>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
          <p className="font-black" style={{ color: p }}>{activeItems}</p>
          <p className="text-xs text-gray-400 mt-0.5">Disponibles</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50">
          <p className="font-black text-gray-900 text-sm">Catégories</p>
        </div>
        {data.categories.map((cat, i) => {
          const catOrders = metrics.catOrders.find(c => c.name === cat.name)
          return (
            <div key={cat.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gray-50 text-base flex-shrink-0">
                {cat.icon || '🍽'}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{cat.name}</p>
                <p className="text-xs text-gray-400">{cat.items?.length || 0} plats · {cat.items?.filter(i => i.is_available).length || 0} disponibles</p>
              </div>
              {(catOrders?.total || 0) > 0 && (
                <span className="text-xs font-black" style={{ color: p }}>{catOrders?.total} cmd</span>
              )}
            </div>
          )
        })}
      </div>

      {topItems.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="font-black text-gray-900 text-sm">Top plats commandés</p>
          </div>
          {topItems.filter(i => i.order_count > 0).map((item, i) => (
            <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
              <span className="text-xs font-black text-gray-400 w-4 flex-shrink-0">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                <p className="text-xs text-gray-400">{item.catName} · {formatPrice(item.price, currency)}</p>
              </div>
              <span className="text-sm font-black flex-shrink-0" style={{ color: p }}>{item.order_count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RevenusTab({ data, p, currency }: { data: PanelData; p: string; currency: string }) {
  const paidOrders = data.orders.filter(o => o.payment_status === 'paid')
  const totalRevenue = paidOrders.reduce((s, o) => s + (o.total || 0), 0)
  const avgBasket = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0

  const byStatus: Record<string, number> = {}
  data.orders.forEach(o => { byStatus[o.status] = (byStatus[o.status] || 0) + 1 })

  const byMethod: Record<string, number> = {}
  paidOrders.forEach(o => {
    const m = o.payment_method || 'cash'
    byMethod[m] = (byMethod[m] || 0) + 1
  })

  const statusLabels: Record<string, string> = {
    pending: 'En attente', confirmed: 'Confirmée', preparing: 'En préparation',
    ready: 'Prête', served: 'Servie', cancelled: 'Annulée',
  }
  const statusColors: Record<string, string> = {
    pending: '#F59E0B', confirmed: '#6366F1', preparing: '#3B82F6',
    ready: '#10B981', served: '#6B7280', cancelled: '#EF4444',
  }

  return (
    <div className="p-4 space-y-4 pb-8">
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-xs text-gray-400 font-semibold mb-1">Recette totale (payées)</p>
        <p className="font-black text-2xl" style={{ color: p }}>{formatPrice(totalRevenue, currency)}</p>
        <div className="flex gap-4 mt-2">
          <div>
            <p className="text-xs text-gray-400">Commandes payées</p>
            <p className="font-black text-gray-900">{paidOrders.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Panier moyen</p>
            <p className="font-black text-gray-900">{formatPrice(avgBasket, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Total commandes</p>
            <p className="font-black text-gray-900">{data.orders.length}</p>
          </div>
        </div>
      </div>

      {Object.keys(byStatus).length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Statuts des commandes</p>
          <div className="space-y-2">
            {Object.entries(byStatus).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors[status] || '#9CA3AF' }} />
                  <span className="text-sm text-gray-700">{statusLabels[status] || status}</span>
                </div>
                <span className="text-sm font-black text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(byMethod).length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Modes de paiement</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(byMethod).map(([method, count]) => (
              <div key={method} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50">
                <span className="text-xs font-semibold text-gray-700 uppercase">{method}</span>
                <span className="text-xs font-black" style={{ color: p }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.orders.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="font-black text-gray-900 text-sm">Dernières commandes</p>
          </div>
          {data.orders.slice(0, 15).map((order, i) => {
            const paid = order.payment_status === 'paid'
            return (
              <div key={order.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: statusColors[order.status] || '#9CA3AF' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">#{order.order_number}</p>
                  <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString('fr', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-black text-gray-900">{formatPrice(order.total, currency)}</p>
                  <p className="text-xs" style={{ color: paid ? '#10B981' : '#9CA3AF' }}>{paid ? 'Payée' : 'Non payée'}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {data.orders.length === 0 && (
        <div className="text-center py-12">
          <Package size={32} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 font-semibold text-sm">Aucune commande</p>
        </div>
      )}
    </div>
  )
}

function computeMetrics(data: PanelData) {
  const totalScans = data.qrCodes.reduce((s, q) => s + (q.scan_count || 0), 0)
  const paidOrders = data.orders.filter(o => o.payment_status === 'paid')
  const totalRevenue = paidOrders.reduce((s, o) => s + (o.total || 0), 0)
  const activeTables = data.tables.filter(t => t.is_active).length
  const hourCounts = Array(24).fill(0)
  data.sessions.forEach(s => {
    const h = new Date(s.entered_at || s.created_at).getHours()
    hourCounts[h]++
  })
  const maxHour = Math.max(...hourCounts, 1)
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts))
  const profileCounts: Record<string, number> = {}
  data.sessions.forEach(s => { const k = s.profile_type || 'solo'; profileCounts[k] = (profileCounts[k] || 0) + 1 })
  const durations = data.sessions.filter(s => s.left_at).map(s => new Date(s.left_at!).getTime() - new Date(s.entered_at || s.created_at).getTime()).filter(d => d > 60000 && d < 6 * 3600000)
  const avgDurationMin = durations.length > 0 ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length / 60000) : null
  const linkedMap: Record<string, QRCode> = {}
  data.qrCodes.forEach(q => { if (q.table_name && UUID_REGEX.test(q.table_name)) linkedMap[q.table_name] = q })
  const tablesByScan = [...data.tables].map(t => ({ ...t, scans: linkedMap[t.id]?.scan_count || 0 })).sort((a, b) => b.scans - a.scans)
  const catOrders = data.categories.map(cat => ({
    name: cat.name, icon: cat.icon, total: cat.items?.reduce((s, i) => s + (i.order_count || 0), 0) || 0, itemCount: cat.items?.length || 0,
  })).sort((a, b) => b.total - a.total)
  return { totalScans, totalRevenue, activeTables, totalOrders: data.orders.length, paidOrders: paidOrders.length, hourCounts, maxHour, peakHour, profileCounts, totalSessions: data.sessions.length, avgDurationMin, linkedMap, tablesByScan, catOrders }
}
