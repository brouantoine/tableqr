import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { before, test } from 'node:test'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

let addMonths
let getDateInputValue
let getMonthEndDateString
let getMonthKey
let getMonthKeyFromDateInput
let getMonthLabel
let getPreviousMonthEndDateString
let getRestaurantSubscriptionSummary
let getSubscriptionPaidUntilFromPaymentCount
let getSubscriptionReminderContent
let getSubscriptionReminderPrice
let isRestaurantMonthPaid
let parseDateInput
let parseMonthKey

before(async () => {
  const source = await readFile(new URL('../lib/subscription.ts', import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: false,
    },
  })
  const outputDir = join(tmpdir(), 'tableqr-tests')
  const outputFile = join(outputDir, 'subscription.mjs')
  await mkdir(outputDir, { recursive: true })
  await writeFile(outputFile, compiled.outputText)

  const subscription = await import(pathToFileURL(outputFile).href)
  addMonths = subscription.addMonths
  getDateInputValue = subscription.getDateInputValue
  getMonthEndDateString = subscription.getMonthEndDateString
  getMonthKey = subscription.getMonthKey
  getMonthKeyFromDateInput = subscription.getMonthKeyFromDateInput
  getMonthLabel = subscription.getMonthLabel
  getPreviousMonthEndDateString = subscription.getPreviousMonthEndDateString
  getRestaurantSubscriptionSummary = subscription.getRestaurantSubscriptionSummary
  getSubscriptionPaidUntilFromPaymentCount = subscription.getSubscriptionPaidUntilFromPaymentCount
  getSubscriptionReminderContent = subscription.getSubscriptionReminderContent
  getSubscriptionReminderPrice = subscription.getSubscriptionReminderPrice
  isRestaurantMonthPaid = subscription.isRestaurantMonthPaid
  parseDateInput = subscription.parseDateInput
  parseMonthKey = subscription.parseMonthKey
})

function restaurant(overrides = {}) {
  return {
    id: 'restaurant-1',
    slug: 'top-chef',
    name: 'Top Chef',
    country: 'CI',
    primary_color: '#f97316',
    secondary_color: '#111827',
    accent_color: '#facc15',
    bot_name: 'Assistant',
    bot_personality: 'friendly',
    module_social: false,
    module_games: false,
    module_delivery: false,
    module_loyalty: false,
    module_birthday: false,
    currency: 'XOF',
    tax_rate: 0,
    plan: 'pro',
    is_active: true,
    is_preview: false,
    subscription_status: 'subscribed',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function payment(overrides = {}) {
  return {
    id: overrides.id || `payment-${overrides.month_key || '2026-05'}`,
    restaurant_id: 'restaurant-1',
    month_key: overrides.month_key || '2026-05',
    amount: 15000,
    currency: 'XOF',
    status: 'approved',
    created_at: '2026-05-11T00:00:00.000Z',
    updated_at: '2026-05-11T00:00:00.000Z',
    ...overrides,
  }
}

test('getMonthKey formats dates as YYYY-MM', () => {
  assert.equal(getMonthKey(new Date(2026, 0, 15)), '2026-01')
  assert.equal(getMonthKey(new Date(2026, 11, 1)), '2026-12')
  assert.equal(getDateInputValue(new Date(2026, 4, 9)), '2026-05-09')
})

test('parseMonthKey accepts valid months and rejects invalid values', () => {
  assert.deepEqual(parseMonthKey('2026-05'), { year: 2026, month: 5 })
  assert.equal(parseMonthKey('2026-00'), null)
  assert.equal(parseMonthKey('2026-13'), null)
  assert.equal(parseMonthKey('mai-2026'), null)
  assert.equal(parseDateInput('2026-05-10'), '2026-05-10')
  assert.equal(parseDateInput('2026-02-30'), null)
  assert.equal(getMonthKeyFromDateInput('2026-05-10'), '2026-05')
})

test('addMonths handles year boundaries', () => {
  assert.equal(addMonths('2026-01', -1), '2025-12')
  assert.equal(addMonths('2026-12', 1), '2027-01')
  assert.equal(addMonths('2026-05', 3), '2026-08')
})

test('month labels and end dates are generated in French', () => {
  assert.equal(getMonthLabel('2026-05'), 'Mai 2026')
  assert.equal(getMonthLabel('invalid'), 'invalid')
  assert.equal(getMonthEndDateString('2024-02'), '2024-02-29')
  assert.equal(getMonthEndDateString('2026-02'), '2026-02-28')
  assert.equal(getPreviousMonthEndDateString('2026-01'), '2025-12-31')
})

test('isRestaurantMonthPaid uses subscription_paid_until when present', () => {
  assert.equal(
    isRestaurantMonthPaid(restaurant({ subscription_paid_until: '2026-05-31' }), '2026-05'),
    true,
  )
  assert.equal(
    isRestaurantMonthPaid(restaurant({ subscription_paid_until: '2026-06-30' }), '2026-05'),
    true,
  )
  assert.equal(
    isRestaurantMonthPaid(restaurant({ subscription_paid_until: '2026-04-30' }), '2026-05'),
    false,
  )
})

test('isRestaurantMonthPaid keeps previews and trials unpaid', () => {
  assert.equal(
    isRestaurantMonthPaid(restaurant({ is_preview: true, subscription_paid_until: '2026-05-31' }), '2026-05'),
    false,
  )
  assert.equal(
    isRestaurantMonthPaid(restaurant({ subscription_status: 'trial', subscription_paid_until: null }), '2026-05'),
    false,
  )
})

test('isRestaurantMonthPaid does not invent paid months without paid_until', () => {
  assert.equal(
    isRestaurantMonthPaid(restaurant({ subscription_paid_until: null }), '2026-05'),
    false,
  )
  assert.equal(
    isRestaurantMonthPaid(restaurant({ is_active: false, subscription_paid_until: null }), '2026-05'),
    false,
  )
})

test('subscription cycles start from restaurant creation date', () => {
  const resto = restaurant({
    created_at: '2026-05-09T22:23:32.428656+00:00',
    subscription_started_at: '2026-05-09T22:23:32.428656+00:00',
    subscription_paid_until: '2026-05-31',
  })

  assert.equal(getSubscriptionPaidUntilFromPaymentCount(resto, 1), '2026-06-08')

  const summary = getRestaurantSubscriptionSummary(
    resto,
    [payment({ month_key: '2026-05', paid_at: '2026-05-11' })],
    new Date('2026-06-18T12:00:00.000Z'),
  )

  assert.equal(summary.paid_until, '2026-06-08')
  assert.equal(summary.next_due_date, '2026-06-09')
  assert.equal(summary.current_period_start, '2026-06-09')
  assert.equal(summary.current_period_end, '2026-07-08')
  assert.equal(summary.due_periods, 1)
  assert.equal(summary.amount_due, 15000)
  assert.equal(summary.status, 'overdue')
})

test('legacy month-end paid_until is converted to a creation-date cycle', () => {
  const resto = restaurant({
    created_at: '2026-05-09T22:23:32.428656+00:00',
    subscription_started_at: '2026-05-09T22:23:32.428656+00:00',
    subscription_paid_until: '2026-05-31',
  })

  const summary = getRestaurantSubscriptionSummary(
    resto,
    [],
    new Date('2026-06-18T12:00:00.000Z'),
  )

  assert.equal(summary.paid_until, '2026-06-08')
  assert.equal(summary.next_due_date, '2026-06-09')
  assert.equal(summary.current_period_start, '2026-06-09')
  assert.equal(summary.current_period_end, '2026-07-08')
  assert.equal(summary.due_periods, 1)
})

test('second approved payment covers the next creation-date cycle', () => {
  const resto = restaurant({
    created_at: '2026-05-09T22:23:32.428656+00:00',
    subscription_started_at: '2026-05-09T22:23:32.428656+00:00',
    subscription_paid_until: '2026-05-31',
  })

  const summary = getRestaurantSubscriptionSummary(
    resto,
    [
      payment({ id: 'payment-1', month_key: '2026-05', paid_at: '2026-05-11' }),
      payment({ id: 'payment-2', month_key: '2026-06', paid_at: '2026-06-18' }),
    ],
    new Date('2026-06-18T12:00:00.000Z'),
  )

  assert.equal(summary.paid_until, '2026-07-08')
  assert.equal(summary.next_due_date, '2026-07-09')
  assert.equal(summary.due_periods, 0)
  assert.equal(summary.amount_due, 0)
  assert.equal(summary.status, 'paid')
})

test('subscription reminder content uses the fixed 10 000 F CFA amount', () => {
  const resto = restaurant({
    name: 'Top Chef',
    created_at: '2026-05-09T22:23:32.428656+00:00',
    subscription_started_at: '2026-05-09T22:23:32.428656+00:00',
  })
  const summary = getRestaurantSubscriptionSummary(
    resto,
    [payment({ month_key: '2026-05' })],
    new Date('2026-06-18T12:00:00.000Z'),
  )
  const content = getSubscriptionReminderContent(resto, summary)

  assert.equal(content.title, 'Rappel paiement TableQR')
  assert.match(content.short_body, /10 000/)
  assert.doesNotMatch(content.short_body, /15 000/)
  assert.match(content.body, /du 09 juin 2026 au 08 juillet 2026/)
})

test('OSAC alone receives a 2 000 F CFA reminder', () => {
  const osac = restaurant({ slug: 'porc-africain-chez-osac', name: 'Porc Africain Chez Osac' })
  const otherRestaurant = restaurant({ slug: 'osac-demo', name: 'Autre restaurant' })

  assert.equal(getSubscriptionReminderPrice(osac), 2000)
  assert.equal(getSubscriptionReminderPrice(otherRestaurant), 10000)
  assert.match(getSubscriptionReminderContent(osac).short_body, /2 000/)
})
