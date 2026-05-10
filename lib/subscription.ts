import type { Restaurant } from '@/types'

export const TABLEQR_MONTHLY_PRICE = 15000
export const TABLEQR_SUBSCRIPTION_CURRENCY = 'XOF'

const MONTHS_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
]

export function getMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function parseMonthKey(monthKey: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null
  return { year, month }
}

export function addMonths(monthKey: string, offset: number) {
  const parsed = parseMonthKey(monthKey)
  if (!parsed) return getMonthKey()
  return getMonthKey(new Date(parsed.year, parsed.month - 1 + offset, 1))
}

export function getMonthLabel(monthKey: string) {
  const parsed = parseMonthKey(monthKey)
  if (!parsed) return monthKey
  return `${MONTHS_FR[parsed.month - 1]} ${parsed.year}`
}

export function getMonthEndDate(monthKey: string) {
  const parsed = parseMonthKey(monthKey)
  if (!parsed) return null
  return new Date(Date.UTC(parsed.year, parsed.month, 0))
}

export function getMonthEndDateString(monthKey: string) {
  const date = getMonthEndDate(monthKey)
  return date ? date.toISOString().slice(0, 10) : null
}

export function getPreviousMonthEndDateString(monthKey: string) {
  return getMonthEndDateString(addMonths(monthKey, -1))
}

export function isRestaurantMonthPaid(restaurant: Restaurant, monthKey = getMonthKey()) {
  if (restaurant.is_preview) return false

  const monthEnd = getMonthEndDate(monthKey)
  if (!monthEnd) return false

  if (restaurant.subscription_paid_until) {
    const paidUntil = new Date(`${restaurant.subscription_paid_until}T23:59:59.999Z`)
    return paidUntil >= monthEnd
  }

  return false
}
