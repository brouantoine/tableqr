import type { Restaurant, SubscriptionPayment } from '@/types'

export const TABLEQR_MONTHLY_PRICE = 15000
export const TABLEQR_SUBSCRIPTION_CURRENCY = 'XOF'
const DAY_MS = 24 * 60 * 60 * 1000

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

export function getDateInputValue(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export function parseMonthKey(monthKey: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null
  return { year, month }
}

export function parseDateInput(dateValue: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) return null

  return dateValue
}

export function getMonthKeyFromDateInput(dateValue: string) {
  return parseDateInput(dateValue)?.slice(0, 7) || null
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

function parseDateOnly(value?: string | null) {
  if (!value) return null
  const datePart = value.slice(0, 10)
  const parsed = parseDateInput(datePart)
  if (!parsed) return null
  const [year, month, day] = parsed.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addCalendarMonths(date: Date, offset: number) {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(date.getUTCDate(), lastDay))
  return target
}

function addDays(date: Date, offset: number) {
  return new Date(date.getTime() + offset * DAY_MS)
}

function diffDays(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS)
}

function maxDate(...dates: Array<Date | null>) {
  return dates.filter((date): date is Date => !!date).reduce<Date | null>((max, date) => (
    !max || date > max ? date : max
  ), null)
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function formatAmount(amount: number, currency = TABLEQR_SUBSCRIPTION_CURRENCY) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount)
}

export type SubscriptionDueState = 'paid' | 'soon' | 'due_today' | 'overdue'

export type SubscriptionCycleSummary = {
  start_date: string
  paid_until: string | null
  next_due_date: string
  current_period_start: string
  current_period_end: string
  due_periods: number
  days_until_due: number
  overdue_days: number
  amount_due: number
  monthly_amount: number
  status: SubscriptionDueState
  status_label: string
  period_label: string
}

export type SubscriptionReminderContent = {
  subject: string
  title: string
  body: string
  short_body: string
}

export function getSubscriptionStartDate(restaurant: Restaurant) {
  return parseDateOnly(restaurant.subscription_started_at || restaurant.created_at) || parseDateOnly(restaurant.created_at)
}

export function getSubscriptionPaidUntilFromPaymentCount(restaurant: Restaurant, paidPeriods: number) {
  const startDate = getSubscriptionStartDate(restaurant)
  if (!startDate || paidPeriods <= 0) return null
  return toDateString(addDays(addCalendarMonths(startDate, paidPeriods), -1))
}

export function getApprovedSubscriptionPaymentCount(payments: SubscriptionPayment[] = []) {
  return payments.filter(payment => payment.status === 'approved').length
}

export function getRestaurantSubscriptionSummary(
  restaurant: Restaurant,
  payments: SubscriptionPayment[] = [],
  now = new Date(),
): SubscriptionCycleSummary {
  const startDate = getSubscriptionStartDate(restaurant) || new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const monthlyAmount = Number(restaurant.subscription_monthly_amount || TABLEQR_MONTHLY_PRICE)
  const approvedCount = getApprovedSubscriptionPaymentCount(payments)
  const paidUntilByPayments = parseDateOnly(getSubscriptionPaidUntilFromPaymentCount(restaurant, approvedCount))
  const paidUntilByRestaurant = parseDateOnly(restaurant.subscription_paid_until)
  const paidUntil = maxDate(paidUntilByPayments, paidUntilByRestaurant)

  const nextDueDate = paidUntil ? addDays(paidUntil, 1) : startDate
  const currentPeriodEnd = addDays(addCalendarMonths(nextDueDate, 1), -1)
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  let duePeriods = 0
  for (let periodStart = nextDueDate; periodStart <= today; periodStart = addCalendarMonths(periodStart, 1)) {
    duePeriods++
    if (duePeriods > 120) break
  }

  const daysUntilDue = diffDays(today, nextDueDate)
  const overdueDays = Math.max(0, -daysUntilDue)
  const amountDue = duePeriods * monthlyAmount
  const status: SubscriptionDueState = duePeriods === 0
    ? (daysUntilDue <= 3 ? 'soon' : 'paid')
    : daysUntilDue === 0 ? 'due_today' : 'overdue'

  const statusLabel = status === 'paid'
    ? 'À jour'
    : status === 'soon'
      ? 'Échéance proche'
      : status === 'due_today'
        ? 'À payer aujourd’hui'
        : `En retard de ${overdueDays} jour${overdueDays > 1 ? 's' : ''}`

  return {
    start_date: toDateString(startDate),
    paid_until: paidUntil ? toDateString(paidUntil) : null,
    next_due_date: toDateString(nextDueDate),
    current_period_start: toDateString(nextDueDate),
    current_period_end: toDateString(currentPeriodEnd),
    due_periods: duePeriods,
    days_until_due: daysUntilDue,
    overdue_days: overdueDays,
    amount_due: amountDue,
    monthly_amount: monthlyAmount,
    status,
    status_label: statusLabel,
    period_label: `du ${formatShortDate(nextDueDate)} au ${formatShortDate(currentPeriodEnd)}`,
  }
}

export function getSubscriptionReminderContent(
  restaurant: Restaurant,
  summary = getRestaurantSubscriptionSummary(restaurant),
): SubscriptionReminderContent {
  const amount = formatAmount(summary.amount_due || summary.monthly_amount, restaurant.currency || TABLEQR_SUBSCRIPTION_CURRENCY)
  const period = summary.period_label
  const title = 'Rappel paiement TableQR'
  const shortBody = `Votre abonnement TableQR est à régler: ${amount} pour la période ${period}.`

  return {
    subject: `Rappel paiement TableQR - ${restaurant.name}`,
    title,
    short_body: shortBody,
    body: [
      `Bonjour ${restaurant.name},`,
      '',
      `Votre abonnement TableQR est arrivé à échéance.`,
      `Période à régler: ${period}.`,
      `Montant: ${amount}.`,
      '',
      `Merci d’envoyer le reçu depuis votre espace admin après paiement.`,
      '',
      'TableQR',
    ].join('\n'),
  }
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
