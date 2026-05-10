import type { Restaurant, SubscriptionPayment, SubscriptionPaymentStatus } from '@/types'
import { addMonths, getMonthKey, isRestaurantMonthPaid } from './subscription'

export const PAYMENT_RECEIPTS_BUCKET = 'payment-receipts'

export function getRecentMonthKeys(count = 12, fromMonth = getMonthKey()) {
  return Array.from({ length: count }, (_, index) => addMonths(fromMonth, -index))
}

export function getPaymentForMonth(payments: SubscriptionPayment[], monthKey: string) {
  return payments.find(payment => payment.month_key === monthKey)
}

export function getRestaurantMonthPaymentState(
  restaurant: Restaurant,
  payments: SubscriptionPayment[],
  monthKey: string,
): SubscriptionPaymentStatus | 'unpaid' {
  const payment = getPaymentForMonth(payments, monthKey)
  if (payment) return payment.status
  return isRestaurantMonthPaid(restaurant, monthKey) ? 'approved' : 'unpaid'
}

export function getPaymentStatusLabel(status: SubscriptionPaymentStatus | 'unpaid') {
  switch (status) {
    case 'approved': return 'Payé validé'
    case 'pending': return 'En attente'
    case 'rejected': return 'Rejeté'
    default: return 'Non payé'
  }
}

export function getPaymentStatusClass(status: SubscriptionPaymentStatus | 'unpaid') {
  switch (status) {
    case 'approved': return 'bg-emerald-50 text-emerald-700 border-emerald-100'
    case 'pending': return 'bg-amber-50 text-amber-700 border-amber-100'
    case 'rejected': return 'bg-red-50 text-red-600 border-red-100'
    default: return 'bg-gray-50 text-gray-500 border-gray-100'
  }
}
