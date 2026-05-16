'use client'
import { useEffect, useMemo, useState } from 'react'
import {
  Clock, CheckCircle,
  Calendar, DollarSign, ArrowUpRight, Store,
  BarChart2, Zap, Target, RefreshCw, XCircle, Eye,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import RestaurantLogo, { getRestaurantLogoUrl } from '@/components/RestaurantLogo'
import { getPaymentStatusClass, getPaymentStatusLabel, getPaymentTimelineMonthKeys } from '@/lib/subscription-payments'
import {
  TABLEQR_MONTHLY_PRICE,
  TABLEQR_SUBSCRIPTION_CURRENCY,
  getDateInputValue,
  getMonthKey,
  getMonthKeyFromDateInput,
  getMonthLabel,
  isRestaurantMonthPaid,
} from '@/lib/subscription'
import type { Restaurant, SubscriptionPayment } from '@/types'

const PRICE_MONTHLY = TABLEQR_MONTHLY_PRICE
const CURRENCY = TABLEQR_SUBSCRIPTION_CURRENCY

function fmt(n: number) { return formatPrice(n, CURRENCY) }

function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
}

async function authJsonHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (session?.access_token) headers.authorization = `Bearer ${session.access_token}`
  return headers
}

export default function AbonnementsTab({
  restaurants,
  onRestaurantUpdated,
  onPaymentReviewed,
}: {
  restaurants: Restaurant[]
  onRestaurantUpdated?: (restaurant: Restaurant) => void
  onPaymentReviewed?: (payment: SubscriptionPayment) => void
}) {
  const now = new Date()
  const currentMonth = getMonthKey(now)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [paymentDate, setPaymentDate] = useState(getDateInputValue(now))
  const [projYear, setProjYear] = useState(now.getFullYear())
  const [projMonth, setProjMonth] = useState(now.getMonth())
  const [payments, setPayments] = useState<SubscriptionPayment[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(true)
  const [reviewBusy, setReviewBusy] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const real = useMemo(() => restaurants.filter(r => !r.is_preview), [restaurants])
  const pendingPayments = useMemo(() => payments.filter(payment => payment.status === 'pending'), [payments])
  const selectedMonthPayments = useMemo(() => payments.filter(payment => payment.month_key === selectedMonth), [payments, selectedMonth])
  const selectedMonthPaymentByRestaurant = useMemo(() => new Map(
    selectedMonthPayments.map(payment => [payment.restaurant_id, payment]),
  ), [selectedMonthPayments])
  const isMonthPaid = (restaurant: Restaurant) =>
    selectedMonthPaymentByRestaurant.get(restaurant.id)?.status === 'approved'
    || isRestaurantMonthPaid(restaurant, selectedMonth)
  const subscribed = useMemo(() =>
    real.filter(r => r.is_active && isMonthPaid(r)),
    [real, selectedMonthPaymentByRestaurant, selectedMonth])
  const unpaid = useMemo(() =>
    real.filter(r => r.is_active && !isMonthPaid(r)),
    [real, selectedMonthPaymentByRestaurant, selectedMonth])
  const trials = useMemo(() => real.filter(r => (r.subscription_status ?? 'subscribed') === 'trial' || (!r.is_active)), [real])
  const previews = useMemo(() => restaurants.filter(r => r.is_preview), [restaurants])
  const monthOptions = useMemo(() => getPaymentTimelineMonthKeys(payments, selectedMonth, currentMonth), [payments, selectedMonth, currentMonth])

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

  useEffect(() => { void loadPayments() }, [])

  function selectPaymentDate(value: string) {
    setPaymentDate(value)
    const month = getMonthKeyFromDateInput(value)
    if (month) setSelectedMonth(month)
  }

  function selectPaymentMonth(month: string) {
    setSelectedMonth(month)
    if (!paymentDate.startsWith(month)) setPaymentDate(`${month}-01`)
  }

  function replacePayment(updated: SubscriptionPayment) {
    setPayments(prev => [
      updated,
      ...prev.filter(item => item.id !== updated.id && !(item.restaurant_id === updated.restaurant_id && item.month_key === updated.month_key)),
    ])
    onPaymentReviewed?.(updated)
  }

  async function loadPayments() {
    setPaymentsLoading(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/superadmin/subscription-payments', {
        cache: 'no-store',
        headers: await authJsonHeaders(),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Chargement impossible')
      setPayments(result.data || [])
      if (result.migration_needed) setFeedback({ type: 'error', text: 'Migration SQL paiement manquante.' })
    } catch (e) {
      setFeedback({ type: 'error', text: e instanceof Error ? e.message : 'Erreur réseau' })
    } finally {
      setPaymentsLoading(false)
    }
  }

  async function reviewPayment(payment: SubscriptionPayment, status: 'approved' | 'rejected') {
    setReviewBusy(`${payment.id}-${status}`)
    setFeedback(null)
    try {
      const res = await fetch('/api/superadmin/subscription-payments', {
        method: 'PATCH',
        headers: await authJsonHeaders(),
        body: JSON.stringify({ id: payment.id, status }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Validation impossible')
      replacePayment(result.data)
      if (result.restaurant) onRestaurantUpdated?.(result.restaurant)
      setFeedback({
        type: 'success',
        text: `${payment.restaurant?.name || 'Restaurant'} : ${getMonthLabel(payment.month_key)} ${status === 'approved' ? 'validé' : 'rejeté'}.`,
      })
    } catch (e) {
      setFeedback({ type: 'error', text: e instanceof Error ? e.message : 'Erreur réseau' })
    } finally {
      setReviewBusy(null)
    }
  }

  async function approveRestaurantMonth(restaurant: Restaurant) {
    setReviewBusy(`${restaurant.id}-direct`)
    setFeedback(null)
    try {
      const res = await fetch('/api/superadmin/subscription-payments', {
        method: 'POST',
        headers: await authJsonHeaders(),
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          month: selectedMonth,
          payment_date: paymentDate,
          amount: restaurant.subscription_monthly_amount || PRICE_MONTHLY,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Validation impossible')
      replacePayment(result.data)
      if (result.restaurant) onRestaurantUpdated?.(result.restaurant)
      setFeedback({
        type: 'success',
        text: `${restaurant.name} : ${getMonthLabel(selectedMonth)} validé sans reçu restaurateur.`,
      })
    } catch (e) {
      setFeedback({ type: 'error', text: e instanceof Error ? e.message : 'Erreur réseau' })
    } finally {
      setReviewBusy(null)
    }
  }

  return (
    <div className="px-4 py-5 space-y-4 pb-12 max-w-2xl mx-auto">

      <div className="rounded-3xl p-5 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #F26522 0%, #e0501a 100%)' }}>
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute -right-2 bottom-2 w-20 h-20 rounded-full bg-white/5" />
        <p className="text-xs font-bold text-white/70 uppercase tracking-widest mb-1">Revenu encaissé — {getMonthLabel(selectedMonth)}</p>
        <p className="text-4xl font-black mb-1">{fmt(mrr)}</p>
        <p className="text-sm text-white/80">{subscribed.length} payé{subscribed.length > 1 ? 's' : ''} · {PRICE_MONTHLY.toLocaleString()} CFA / mois / restaurant</p>
        <div className="flex items-center gap-1.5 mt-3">
          <div className="px-2.5 py-1 rounded-full bg-white/20 text-xs font-bold">
            ARR : {fmt(mrr * 12)}
          </div>
          <div className="px-2.5 py-1 rounded-full bg-white/20 text-xs font-bold">
            Taux payé : {conversionRate}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Payés', value: subscribed.length, color: '#10B981', Icon: CheckCircle, sub: getMonthLabel(selectedMonth) },
          { label: 'Non payés', value: unpaid.length, color: '#EF4444', Icon: XCircle, sub: 'à relancer' },
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

      <div className="bg-white rounded-3xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center">
            <Calendar size={15} className="text-orange-600" />
          </div>
          <div>
            <p className="font-black text-gray-900 text-sm">Mois à contrôler</p>
            <p className="text-xs text-gray-400">Le statut affiché aux restaurateurs suit ce mois.</p>
          </div>
        </div>
        <div className="mb-3">
          <label className="text-xs font-bold text-gray-500 block mb-1">Date du paiement</label>
          <input
            type="date"
            value={paymentDate}
            onChange={e => selectPaymentDate(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-gray-50 text-sm font-semibold outline-none border border-gray-100 focus:border-orange-300"
          />
        </div>
        <select value={selectedMonth} onChange={e => selectPaymentMonth(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl bg-gray-50 text-sm font-semibold outline-none border border-gray-100 focus:border-orange-300">
          {monthOptions.map(month => (
            <option key={month} value={month}>{getMonthLabel(month)}</option>
          ))}
        </select>
        {feedback && (
          <p className={`mt-3 text-xs font-bold ${feedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {feedback.text}
          </p>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <XCircle size={15} className="text-red-500" />
            <p className="font-black text-gray-900 text-sm">Non validés — {getMonthLabel(selectedMonth)}</p>
          </div>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full font-semibold">{unpaid.length}</span>
        </div>
        {unpaid.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <CheckCircle size={28} className="mx-auto mb-2 text-emerald-200" />
            <p className="text-sm font-bold text-gray-500">Tous les restaurants actifs sont validés pour ce mois.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {unpaid.map(restaurant => {
              const payment = selectedMonthPaymentByRestaurant.get(restaurant.id)
              const busyKey = payment ? `${payment.id}-approved` : `${restaurant.id}-direct`
              return (
                <div key={restaurant.id} className="px-5 py-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                    style={{ backgroundColor: restaurant.primary_color }}>
                    {getRestaurantLogoUrl(restaurant.logo_url)
                      ? <RestaurantLogo src={restaurant.logo_url} alt={restaurant.name} className="w-full h-full rounded-xl bg-white" />
                      : <Store size={16} strokeWidth={2.2} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{restaurant.name}</p>
                    <p className="text-xs text-gray-400">
                      {payment ? getPaymentStatusLabel(payment.status) : 'Aucun reçu envoyé'}
                    </p>
                  </div>
                  {payment?.signed_receipt_url && (
                    <a href={payment.signed_receipt_url} target="_blank" rel="noreferrer"
                      className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center">
                      <Eye size={15} className="text-gray-500" />
                    </a>
                  )}
                  <button onClick={() => payment ? reviewPayment(payment, 'approved') : approveRestaurantMonth(restaurant)}
                    disabled={!!reviewBusy || !paymentDate}
                    className="h-9 px-3 rounded-xl bg-emerald-600 text-white font-black text-xs disabled:opacity-50 flex-shrink-0">
                    {reviewBusy === busyKey
                      ? 'Validation...'
                      : payment?.signed_receipt_url ? 'Valider reçu' : 'Marquer payé'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-amber-500" />
            <p className="font-black text-gray-900 text-sm">Reçus à valider</p>
          </div>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full font-semibold">
            {paymentsLoading ? '...' : pendingPayments.length}
          </span>
        </div>
        {pendingPayments.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <CheckCircle size={28} className="mx-auto mb-2 text-emerald-200" />
            <p className="text-sm font-bold text-gray-500">Aucun reçu en attente</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {pendingPayments.map(payment => (
              <div key={payment.id} className="px-5 py-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                    style={{ backgroundColor: payment.restaurant?.primary_color || '#F26522' }}>
                    {getRestaurantLogoUrl(payment.restaurant?.logo_url)
                      ? <RestaurantLogo src={payment.restaurant?.logo_url} alt={payment.restaurant?.name || ''} className="w-full h-full rounded-xl bg-white" />
                      : <Store size={16} strokeWidth={2.2} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-gray-900 truncate">{payment.restaurant?.name || 'Restaurant'}</p>
                    <p className="text-xs text-gray-400">
                      {getMonthLabel(payment.month_key)}
                      {payment.paid_at ? ` · Payé le ${new Date(`${payment.paid_at}T00:00:00`).toLocaleDateString('fr-FR')}` : ''}
                      {' · '}{formatPrice(payment.amount, payment.currency)}
                    </p>
                  </div>
                  {payment.signed_receipt_url && (
                    <a href={payment.signed_receipt_url} target="_blank" rel="noreferrer"
                      className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center">
                      <Eye size={15} className="text-gray-500" />
                    </a>
                  )}
                </div>
                {payment.note && <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">{payment.note}</p>}
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => reviewPayment(payment, 'rejected')}
                    disabled={!!reviewBusy}
                    className="h-10 rounded-xl bg-red-50 text-red-600 font-black text-xs disabled:opacity-50">
                    {reviewBusy === `${payment.id}-rejected` ? 'Rejet...' : 'Rejeter'}
                  </button>
                  <button onClick={() => reviewPayment(payment, 'approved')}
                    disabled={!!reviewBusy}
                    className="h-10 rounded-xl bg-emerald-600 text-white font-black text-xs disabled:opacity-50">
                    {reviewBusy === `${payment.id}-approved` ? 'Validation...' : 'Valider payé'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedMonthPayments.length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-gray-500" />
              <p className="font-black text-gray-900 text-sm">Reçus — {getMonthLabel(selectedMonth)}</p>
            </div>
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full font-semibold">{selectedMonthPayments.length}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {selectedMonthPayments.map(payment => (
              <div key={payment.id} className="px-5 py-3.5 flex items-center gap-3">
                <div className={`text-xs font-black px-2 py-1 rounded-full border ${getPaymentStatusClass(payment.status)}`}>
                  {getPaymentStatusLabel(payment.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{payment.restaurant?.name || 'Restaurant'}</p>
                  <p className="text-xs text-gray-400">
                    {payment.paid_at ? `Payé le ${new Date(`${payment.paid_at}T00:00:00`).toLocaleDateString('fr-FR')} · ` : ''}
                    {formatPrice(payment.amount, payment.currency)}
                  </p>
                </div>
                {payment.signed_receipt_url && (
                  <a href={payment.signed_receipt_url} target="_blank" rel="noreferrer"
                    className="text-xs font-black text-gray-500 bg-gray-50 px-3 py-2 rounded-xl">
                    Reçu
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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

      {subscribed.length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <CheckCircle size={15} className="text-green-500" />
              <p className="font-black text-gray-900 text-sm">Payés validés</p>
            </div>
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full font-semibold">{subscribed.length}</span>
          </div>
          {subscribed.map((r, i) => (
            <div key={r.id} className={`flex items-center gap-3 px-5 py-3.5 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                style={{ backgroundColor: r.primary_color }}>
                {getRestaurantLogoUrl(r.logo_url)
                  ? <RestaurantLogo src={r.logo_url} alt={r.name} className="w-full h-full rounded-xl bg-white" />
                  : <Store size={16} strokeWidth={2.2} />}
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
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                  style={{ backgroundColor: r.primary_color }}>
                  {getRestaurantLogoUrl(r.logo_url)
                    ? <RestaurantLogo src={r.logo_url} alt={r.name} className="w-full h-full rounded-xl bg-white" />
                    : <Store size={16} strokeWidth={2.2} />}
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

      {trials.length > 0 && (
        <div className="rounded-2xl p-4 border border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <RefreshCw size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-amber-800">Revenu potentiel non capturé</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Si {trials.length} essai{trials.length > 1 ? 's' : ''} convertis : <strong>+{fmt(trials.length * PRICE_MONTHLY)}/mois</strong>
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
