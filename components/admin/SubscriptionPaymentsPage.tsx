'use client'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Eye,
  FileText,
  Loader2,
  Upload,
  XCircle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'
import {
  getPaymentForMonth,
  getPaymentStatusClass,
  getPaymentStatusLabel,
  getRecentMonthKeys,
  getRestaurantMonthPaymentState,
} from '@/lib/subscription-payments'
import {
  TABLEQR_MONTHLY_PRICE,
  getMonthKey,
  getMonthLabel,
} from '@/lib/subscription'
import type { Restaurant, SubscriptionPayment } from '@/types'

type Feedback = { type: 'success' | 'error'; text: string } | null

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  const headers: Record<string, string> = {}
  if (session?.access_token) headers.authorization = `Bearer ${session.access_token}`
  return headers
}

function StatusIcon({ status }: { status: ReturnType<typeof getRestaurantMonthPaymentState> }) {
  if (status === 'approved') return <CheckCircle size={15} className="text-emerald-600" />
  if (status === 'pending') return <Clock size={15} className="text-amber-600" />
  if (status === 'rejected') return <XCircle size={15} className="text-red-500" />
  return <AlertTriangle size={15} className="text-gray-400" />
}

export default function SubscriptionPaymentsPage({ restaurant: initialRestaurant }: { restaurant: Restaurant }) {
  const [restaurant, setRestaurant] = useState(initialRestaurant)
  const [payments, setPayments] = useState<SubscriptionPayment[]>([])
  const [selectedMonth, setSelectedMonth] = useState(getMonthKey())
  const [receipt, setReceipt] = useState<File | null>(null)
  const [confirmedPaid, setConfirmedPaid] = useState(false)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const p = restaurant.primary_color
  const amount = restaurant.subscription_monthly_amount || TABLEQR_MONTHLY_PRICE
  const monthOptions = useMemo(() => getRecentMonthKeys(12), [])
  const selectedPayment = getPaymentForMonth(payments, selectedMonth)
  const selectedState = getRestaurantMonthPaymentState(restaurant, payments, selectedMonth)
  const paidCount = monthOptions.filter(month => getRestaurantMonthPaymentState(restaurant, payments, month) === 'approved').length
  const pendingCount = payments.filter(payment => payment.status === 'pending').length
  const unpaidCount = monthOptions.filter(month => getRestaurantMonthPaymentState(restaurant, payments, month) === 'unpaid').length

  useEffect(() => { void loadPayments() }, [])

  async function loadPayments() {
    setLoading(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/admin/subscription-payments', {
        cache: 'no-store',
        headers: await authHeaders(),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Chargement impossible')
      if (result.restaurant) setRestaurant(result.restaurant)
      setPayments(result.data || [])
      if (result.migration_needed) {
        setFeedback({ type: 'error', text: 'Migration SQL paiement manquante. Contactez le superadmin.' })
      }
    } catch (e) {
      setFeedback({ type: 'error', text: e instanceof Error ? e.message : 'Erreur réseau' })
    } finally {
      setLoading(false)
    }
  }

  async function submitReceipt() {
    if (!receipt || submitting) return
    setSubmitting(true)
    setFeedback(null)
    try {
      const form = new FormData()
      form.set('month', selectedMonth)
      form.set('amount', String(amount))
      form.set('note', note)
      form.set('confirmed_paid', confirmedPaid ? 'true' : 'false')
      form.set('receipt', receipt)

      const res = await fetch('/api/admin/subscription-payments', {
        method: 'POST',
        headers: await authHeaders(),
        body: form,
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Envoi impossible')

      setPayments(prev => [result.data, ...prev.filter(payment => payment.id !== result.data.id)])
      setReceipt(null)
      setConfirmedPaid(false)
      setNote('')
      setFeedback({ type: 'success', text: 'Reçu envoyé. Le superadmin doit maintenant le valider.' })
    } catch (e) {
      setFeedback({ type: 'error', text: e instanceof Error ? e.message : 'Erreur réseau' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-black text-xl text-gray-900">Paiements TableQR</h2>
          <p className="text-sm text-gray-400 mt-0.5">Suivi mensuel, reçus envoyés et validations</p>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-5 max-w-4xl mx-auto pb-28 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Validés', value: paidCount, color: '#10B981', Icon: CheckCircle },
            { label: 'En attente', value: pendingCount, color: '#F59E0B', Icon: Clock },
            { label: 'Non payés', value: unpaidCount, color: '#EF4444', Icon: AlertTriangle },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2"
                style={{ backgroundColor: item.color + '15' }}>
                <item.Icon size={15} style={{ color: item.color }} />
              </div>
              <p className="font-black text-gray-900 text-xl">{item.value}</p>
              <p className="text-xs text-gray-500 font-semibold">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ backgroundColor: p + '15' }}>
              <CreditCard size={17} style={{ color: p }} />
            </div>
            <div className="min-w-0">
              <p className="font-black text-gray-900 text-sm">Déclarer un paiement</p>
              <p className="text-xs text-gray-400">Ajoutez la capture du reçu après paiement.</p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5">Mois payé</label>
              <select value={selectedMonth} onChange={e => { setSelectedMonth(e.target.value); setConfirmedPaid(false); setReceipt(null) }}
                className="w-full px-4 py-3 rounded-2xl bg-gray-50 text-sm font-semibold outline-none border border-gray-100 focus:border-orange-300">
                {monthOptions.map(month => (
                  <option key={month} value={month}>{getMonthLabel(month)}</option>
                ))}
              </select>
            </div>

            <div className={`rounded-2xl border px-4 py-3 flex items-center justify-between ${getPaymentStatusClass(selectedState)}`}>
              <div className="flex items-center gap-2">
                <StatusIcon status={selectedState} />
                <span className="font-black text-sm">{getPaymentStatusLabel(selectedState)}</span>
              </div>
              <span className="text-xs font-bold">{formatPrice(amount, restaurant.currency)}</span>
            </div>

            {selectedPayment?.review_note && (
              <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-2xl px-3 py-2">
                Note superadmin : {selectedPayment.review_note}
              </p>
            )}

            {selectedState !== 'approved' && (
              <>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1.5">Capture du reçu</label>
                  <label className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-4 cursor-pointer hover:border-orange-200 transition-colors">
                    <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center flex-shrink-0">
                      <Upload size={17} style={{ color: p }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-sm text-gray-900 truncate">
                        {receipt ? receipt.name : 'Uploader une capture'}
                      </p>
                      <p className="text-xs text-gray-400">PNG, JPG, WebP ou PDF · max 6 Mo</p>
                    </div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,application/pdf"
                      className="hidden"
                      onChange={e => setReceipt(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>

                <label className="flex items-start gap-3 rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmedPaid}
                    onChange={e => setConfirmedPaid(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm font-bold text-gray-700">
                    Je confirme que {getMonthLabel(selectedMonth)} est payé et que le reçu envoyé correspond à ce paiement.
                  </span>
                </label>

                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1.5">Note optionnelle</label>
                  <textarea value={note} onChange={e => setNote(e.target.value)}
                    rows={3}
                    placeholder="Ex: paiement Wave, référence, nom du payeur..."
                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 text-sm outline-none border border-gray-100 resize-none focus:border-orange-300" />
                </div>

                <button onClick={submitReceipt} disabled={!receipt || !confirmedPaid || submitting}
                  className="w-full h-12 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-45"
                  style={{ backgroundColor: p }}>
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  {selectedState === 'rejected' ? 'Renvoyer le reçu' : selectedState === 'pending' ? 'Remplacer le reçu envoyé' : 'Envoyer pour validation'}
                </button>
              </>
            )}

            {feedback && (
              <p className={`text-xs font-bold rounded-2xl px-3 py-2 ${
                feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
              }`}>
                {feedback.text}
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-500" />
              <p className="font-black text-gray-900 text-sm">Vue mensuelle</p>
            </div>
            {loading && <Loader2 size={15} className="animate-spin text-gray-400" />}
          </div>
          <div className="divide-y divide-gray-50">
            {monthOptions.map(month => {
              const status = getRestaurantMonthPaymentState(restaurant, payments, month)
              const payment = getPaymentForMonth(payments, month)
              return (
                <button key={month} onClick={() => setSelectedMonth(month)}
                  className="w-full px-5 py-3.5 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors">
                  <StatusIcon status={status} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900">{getMonthLabel(month)}</p>
                    <p className="text-xs text-gray-400">
                      {payment?.submitted_at ? `Envoyé le ${new Date(payment.submitted_at).toLocaleDateString('fr-FR')}` : 'Aucun reçu envoyé'}
                    </p>
                  </div>
                  <span className={`text-xs font-black px-2 py-1 rounded-full border ${getPaymentStatusClass(status)}`}>
                    {getPaymentStatusLabel(status)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <FileText size={16} className="text-gray-500" />
            <p className="font-black text-gray-900 text-sm">Historique des reçus</p>
          </div>
          {payments.length === 0 ? (
            <div className="py-12 text-center px-6">
              <FileText size={30} className="mx-auto text-gray-200 mb-3" />
              <p className="text-sm font-bold text-gray-500">Aucun reçu envoyé</p>
              <p className="text-xs text-gray-400 mt-1">Vos paiements apparaîtront ici.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {payments.map(payment => (
                <div key={payment.id} className="px-5 py-4 flex items-center gap-3">
                  <StatusIcon status={payment.status} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900">{getMonthLabel(payment.month_key)}</p>
                    <p className="text-xs text-gray-400">
                      {payment.submitted_at ? new Date(payment.submitted_at).toLocaleString('fr-FR') : 'Non envoyé'}
                    </p>
                  </div>
                  {payment.signed_receipt_url && (
                    <a href={payment.signed_receipt_url} target="_blank" rel="noreferrer"
                      className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center">
                      <Eye size={15} className="text-gray-500" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
