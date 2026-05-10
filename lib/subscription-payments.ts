import type { SubscriptionPayment, SubscriptionPaymentStatus } from '@/types'
import { addMonths, getMonthKey, getMonthKeyFromDateInput, parseMonthKey } from './subscription'

export const PAYMENT_RECEIPTS_BUCKET = 'payment-receipts'

export function getRecentMonthKeys(count = 12, fromMonth = getMonthKey()) {
  return Array.from({ length: count }, (_, index) => addMonths(fromMonth, -index))
}

export function getPaymentMonthKey(payment: Pick<SubscriptionPayment, 'month_key' | 'paid_at'>) {
  const paidMonth = payment.paid_at ? getMonthKeyFromDateInput(payment.paid_at) : null
  return paidMonth || payment.month_key
}

export function getPaymentTimelineMonthKeys(
  payments: SubscriptionPayment[],
  selectedMonth = getMonthKey(),
  currentMonth = getMonthKey(),
) {
  const paymentMonths = payments
    .map(getPaymentMonthKey)
    .filter((month): month is string => !!month && !!parseMonthKey(month))

  if (paymentMonths.length === 0) return [selectedMonth]

  const startMonth = paymentMonths.reduce((min, month) => month < min ? month : min, paymentMonths[0])
  const endMonth = [currentMonth, selectedMonth, ...paymentMonths]
    .filter(month => !!parseMonthKey(month))
    .reduce((max, month) => month > max ? month : max, currentMonth)

  const months: string[] = []
  for (let month = endMonth; month >= startMonth; month = addMonths(month, -1)) {
    months.push(month)
    if (month === startMonth) break
  }
  return months
}

export function getPaymentForMonth(payments: SubscriptionPayment[], monthKey: string) {
  return payments.find(payment => payment.month_key === monthKey)
}

export function getRestaurantMonthPaymentState(
  payments: SubscriptionPayment[],
  monthKey: string,
): SubscriptionPaymentStatus | 'unpaid' {
  const payment = getPaymentForMonth(payments, monthKey)
  if (payment) return payment.status
  return 'unpaid'
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
