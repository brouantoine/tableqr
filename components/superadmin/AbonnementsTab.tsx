'use client'
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, Users, Clock, CheckCircle, AlertTriangle,
  Calendar, DollarSign, ArrowUpRight, ChevronRight, Store,
  BarChart2, Zap, Target, RefreshCw,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { Restaurant } from '@/types'

const PRICE_MONTHLY = 15000
const CURRENCY = 'XOF'

function fmt(n: number) { return formatPrice(n, CURRENCY) }

function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
}

export default function AbonnementsTab({ restaurants }: { restaurants: Restaurant[] }) {
  const now = new Date()
  const [projYear, setProjYear] = useState(now.getFullYear())
  const [projMonth, setProjMonth] = useState(now.getMonth())

  const real = useMemo(() => restaurants.filter(r => !r.is_preview), [restaurants])
  const subscribed = useMemo(() => real.filter(r => (r.subscription_status ?? 'subscribed') === 'subscribed' && r.is_active), [real])
  const trials = useMemo(() => real.filter(r => (r.subscription_status ?? 'subscribed') === 'trial' || (!r.is_active)), [real])
  const previews = useMemo(() => restaurants.filter(r => r.is_preview), [restaurants])

  const mrr = subscribed.length * PRICE_MONTHLY
  const conversionRate = real.length > 0 ? Math.round((subscribed.length / real.length) * 100) : 0

  const projDate = new Date(projYear, projMonth, 1)
  const monthsFromNow = Math.max(0, monthsBetween(now, projDate))
  const projRevMonth = subscribed.length * PRICE_MONTHLY
  const projRevCumul = projRevMonth * (monthsFromNow + 1)

  const since = useMemo(() => {
    const counts: Record<string, number> = {}
    subscribed.forEach(r => {
      const d = new Date(r.subscription_started_at || r.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      counts[key] = (counts[key] || 0) + 1
    })
    const sorted = Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]))
    return sorted.slice(-6)
  }, [subscribed])

  const maxBar = useMemo(() => Math.max(...since.map(s => s[1]), 1), [since])

  const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
  const projLabel = `${MONTHS_FR[projMonth]} ${projYear}`

  const yearOptions = Array.from({ length: 10 }, (_, i) => now.getFullYear() + i)

  return (
    <div className="px-4 py-5 space-y-4 pb-12 max-w-2xl mx-auto">

      {/* MRR hero */}
      <div className="rounded-3xl p-5 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #F26522 0%, #e0501a 100%)' }}>
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute -right-2 bottom-2 w-20 h-20 rounded-full bg-white/5" />
        <p className="text-xs font-bold text-white/70 uppercase tracking-widest mb-1">Revenu mensuel récurrent</p>
        <p className="text-4xl font-black mb-1">{fmt(mrr)}</p>
        <p className="text-sm text-white/80">{subscribed.length} abonné{subscribed.length > 1 ? 's' : ''} · {PRICE_MONTHLY.toLocaleString()} CFA / mois / restaurant</p>
        <div className="flex items-center gap-1.5 mt-3">
          <div className="px-2.5 py-1 rounded-full bg-white/20 text-xs font-bold">
            ARR : {fmt(mrr * 12)}
          </div>
          <div className="px-2.5 py-1 rounded-full bg-white/20 text-xs font-bold">
            Taux conversion : {conversionRate}%
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Abonnés', value: subscribed.length, color: '#10B981', Icon: CheckCircle, sub: 'actifs' },
          { label: 'Essais', value: trials.length, color: '#F59E0B', Icon: Clock, sub: 'en cours' },
          { label: 'Démos', value: previews.length, color: '#6366F1', Icon: Zap, sub: 'preview' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-3.5 shadow-sm">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2.5"
              style={{ backgroundColor: s.color + '15' }}>
              <s.Icon size={15} style={{ color: s.color }} />
            </div>
            <p className="font-black text-gray-900 text-xl">{s.value}</p>
            <p className="text-xs font-semibold text-gray-500 mt-0.5">{s.label}</p>
            <p className="text-xs text-gray-400">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue projector */}
      <div className="bg-white rounded-3xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
            <Target size={15} className="text-blue-600" />
          </div>
          <div>
            <p className="font-black text-gray-900 text-sm">Projecteur de revenus</p>
            <p className="text-xs text-gray-400">Estimez vos revenus à une date future</p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            <label className="text-xs font-bold text-gray-500 block mb-1">Mois</label>
            <select value={projMonth} onChange={e => setProjMonth(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl bg-gray-50 text-sm font-semibold outline-none border border-gray-100 focus:border-orange-300">
              {MONTHS_FR.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs font-bold text-gray-500 block mb-1">Année</label>
            <select value={projYear} onChange={e => setProjYear(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl bg-gray-50 text-sm font-semibold outline-none border border-gray-100 focus:border-orange-300">
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: '#FFF7F0' }}>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-500 font-semibold">Revenu mensuel — {projLabel}</p>
              <p className="font-black text-xl text-gray-900">{fmt(projRevMonth)}</p>
            </div>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#F26522' }}>
              <DollarSign size={18} className="text-white" />
            </div>
          </div>

          {monthsFromNow > 0 && (
            <>
              <div className="h-px bg-orange-100" />
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500 font-semibold">
                    Cumulé d&apos;ici {projLabel} ({monthsFromNow + 1} mois)
                  </p>
                  <p className="font-black text-xl" style={{ color: '#F26522' }}>{fmt(projRevCumul)}</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold" style={{ color: '#F26522' }}>
                  <ArrowUpRight size={14} />
                  {monthsFromNow + 1} mois
                </div>
              </div>
            </>
          )}
          {monthsFromNow === 0 && (
            <p className="text-xs text-gray-400 text-center">Sélectionnez une date future pour le cumulé</p>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-2 text-center">
          Basé sur {subscribed.length} abonnés actuels à {PRICE_MONTHLY.toLocaleString()} CFA/mois
        </p>
      </div>

      {/* Growth chart */}
      {since.length > 0 && (
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center">
              <BarChart2 size={15} className="text-green-600" />
            </div>
            <p className="font-black text-gray-900 text-sm">Abonnements par mois</p>
          </div>
          <div className="flex items-end gap-1.5 h-20">
            {since.map(([key, count]) => {
              const [y, m] = key.split('-')
              const label = `${MONTHS_FR[parseInt(m) - 1]} ${y.slice(2)}`
              const h = Math.max(8, Math.round((count / maxBar) * 72))
              return (
                <div key={key} className="flex-1 flex flex-col items-center justify-end gap-1">
                  <span className="text-xs font-black text-gray-600">{count}</span>
                  <div className="w-full rounded-t-lg" style={{ height: `${h}px`, backgroundColor: '#F26522' }} />
                  <span className="text-xs text-gray-400 font-medium">{label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Subscribed list */}
      {subscribed.length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <CheckCircle size={15} className="text-green-500" />
              <p className="font-black text-gray-900 text-sm">Abonnés actifs</p>
            </div>
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full font-semibold">{subscribed.length}</span>
          </div>
          {subscribed.map((r, i) => (
            <div key={r.id} className={`flex items-center gap-3 px-5 py-3.5 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white flex-shrink-0"
                style={{ backgroundColor: r.primary_color }}>
                {r.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{r.name}</p>
                <p className="text-xs text-gray-400">{r.city || r.slug}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-black text-gray-900">{fmt(PRICE_MONTHLY)}</p>
                <p className="text-xs text-green-500 font-semibold">/mois</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trials list */}
      {trials.length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-amber-500" />
              <p className="font-black text-gray-900 text-sm">Essais en cours</p>
            </div>
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full font-semibold">{trials.length}</span>
          </div>
          {trials.map((r, i) => {
            const createdAt = new Date(r.created_at)
            const daysAgo = Math.floor((Date.now() - createdAt.getTime()) / 86400000)
            return (
              <div key={r.id} className={`flex items-center gap-3 px-5 py-3.5 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white flex-shrink-0"
                  style={{ backgroundColor: r.primary_color }}>
                  {r.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{r.name}</p>
                  <p className="text-xs text-gray-400">Depuis {daysAgo} jour{daysAgo > 1 ? 's' : ''}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-xs font-black px-2 py-1 rounded-full ${
                    daysAgo > 14 ? 'bg-red-50 text-red-500' :
                    daysAgo > 7 ? 'bg-amber-50 text-amber-600' :
                    'bg-green-50 text-green-600'
                  }`}>
                    {daysAgo > 14 ? 'À convertir' : daysAgo > 7 ? 'Relancer' : 'Récent'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Potential revenue banner */}
      {trials.length > 0 && (
        <div className="rounded-2xl p-4 border border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <RefreshCw size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-amber-800">Revenu potentiel non capturé</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Si {trials.length} essai{trials.length > 1 ? 's' : ''} convertis → <strong>+{fmt(trials.length * PRICE_MONTHLY)}/mois</strong>
              </p>
            </div>
            <p className="text-xl font-black text-amber-700 ml-auto flex-shrink-0">
              {fmt(trials.length * PRICE_MONTHLY)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
