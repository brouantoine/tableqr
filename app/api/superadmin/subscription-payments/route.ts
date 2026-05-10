import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/client'
import { getRequestUser } from '@/lib/supabase/request-user'
import { requireSuperAdmin } from '@/lib/supabase/superadmin'
import { PAYMENT_RECEIPTS_BUCKET } from '@/lib/subscription-payments'
import {
  TABLEQR_MONTHLY_PRICE,
  TABLEQR_SUBSCRIPTION_CURRENCY,
  getMonthEndDateString,
  parseMonthKey,
} from '@/lib/subscription'
import type { Restaurant, SubscriptionPayment, SubscriptionPaymentStatus } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ReviewBody = {
  id?: string
  status?: Extract<SubscriptionPaymentStatus, 'approved' | 'rejected'>
  review_note?: string
}

type DirectApproveBody = {
  restaurant_id?: string
  month?: string
  amount?: number
  review_note?: string
}

async function withSignedReceiptUrls(
  admin: ReturnType<typeof getSupabaseAdmin>,
  payments: SubscriptionPayment[],
) {
  return Promise.all(payments.map(async payment => {
    if (!payment.receipt_storage_path) return { ...payment, signed_receipt_url: null }
    const { data } = await admin.storage
      .from(PAYMENT_RECEIPTS_BUCKET)
      .createSignedUrl(payment.receipt_storage_path, 60 * 60)
    return { ...payment, signed_receipt_url: data?.signedUrl || null }
  }))
}

function maxPaidUntil(current: string | null | undefined, candidate: string) {
  if (!current) return candidate
  return current >= candidate ? current : candidate
}

function getAmount(value: unknown, restaurant: Restaurant) {
  const amount = Number(value || restaurant.subscription_monthly_amount || TABLEQR_MONTHLY_PRICE)
  return Number.isFinite(amount) && amount > 0 ? amount : TABLEQR_MONTHLY_PRICE
}

async function markRestaurantPaidUntil(
  admin: ReturnType<typeof getSupabaseAdmin>,
  restaurant: Restaurant,
  monthKey: string,
  amount: number,
  note: string | null,
  now: string,
) {
  const paidUntil = getMonthEndDateString(monthKey)
  if (!paidUntil) return { error: NextResponse.json({ error: 'Mois invalide' }, { status: 400 }) }

  const nextPaidUntil = maxPaidUntil(restaurant.subscription_paid_until, paidUntil)
  const { data, error } = await admin
    .from('restaurants')
    .update({
      subscription_status: 'subscribed',
      subscription_paid_until: nextPaidUntil,
      subscription_last_payment_at: now,
      subscription_monthly_amount: amount,
      subscription_payment_note: note,
    })
    .eq('id', restaurant.id)
    .select('*')
    .single()

  if (error) return { error: NextResponse.json({ error: error.message }, { status: 500 }) }
  return { restaurant: data as Restaurant }
}

export async function GET(req: NextRequest) {
  try {
    const superAdminError = await requireSuperAdmin(req)
    if (superAdminError) return superAdminError

    const admin = getSupabaseAdmin()
    const restaurantId = req.nextUrl.searchParams.get('restaurant_id')
    const status = req.nextUrl.searchParams.get('status')
    const month = req.nextUrl.searchParams.get('month')

    let query = admin
      .from('subscription_payments')
      .select(`
        *,
        restaurant:restaurants(
          id,name,slug,logo_url,primary_color,city,
          subscription_paid_until,subscription_monthly_amount,is_active,is_preview
        )
      `)
      .order('updated_at', { ascending: false })
      .order('month_key', { ascending: false })

    if (restaurantId) query = query.eq('restaurant_id', restaurantId)
    if (status && ['pending', 'approved', 'rejected'].includes(status)) query = query.eq('status', status)
    if (month && parseMonthKey(month)) query = query.eq('month_key', month)

    const { data, error } = await query

    if (error?.code === '42P01') {
      return NextResponse.json({ data: [], migration_needed: true })
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const payments = await withSignedReceiptUrls(admin, (data || []) as SubscriptionPayment[])
    return NextResponse.json({ data: payments })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const superAdminError = await requireSuperAdmin(req)
    if (superAdminError) return superAdminError

    const user = await getRequestUser(req)
    const admin = getSupabaseAdmin()
    const body = await req.json() as DirectApproveBody
    const month = body.month || ''

    if (!body.restaurant_id) return NextResponse.json({ error: 'Restaurant requis' }, { status: 400 })
    if (!parseMonthKey(month)) return NextResponse.json({ error: 'Mois invalide' }, { status: 400 })

    const { data: restaurantData, error: restaurantError } = await admin
      .from('restaurants')
      .select('*')
      .eq('id', body.restaurant_id)
      .single()

    if (restaurantError) return NextResponse.json({ error: restaurantError.message }, { status: 500 })

    const restaurant = restaurantData as Restaurant
    if (restaurant.is_preview) {
      return NextResponse.json({ error: 'Impossible de valider un paiement sur une démo.' }, { status: 403 })
    }

    const now = new Date().toISOString()
    const amount = getAmount(body.amount, restaurant)
    const reviewNote = body.review_note?.trim() || 'Validé directement par superadmin'

    const { data: existing, error: existingError } = await admin
      .from('subscription_payments')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .eq('month_key', month)
      .maybeSingle()

    if (existingError?.code === '42P01') {
      return NextResponse.json({ error: 'Migration SQL manquante : exécutez migration_subscription_payments.sql' }, { status: 500 })
    }
    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })

    const paymentPayload = {
      amount,
      currency: restaurant.currency || TABLEQR_SUBSCRIPTION_CURRENCY,
      status: 'approved' as const,
      reviewed_at: now,
      reviewed_by_email: user?.email?.toLowerCase() || null,
      review_note: reviewNote,
      updated_at: now,
    }

    const mutation = existing
      ? admin
        .from('subscription_payments')
        .update(paymentPayload)
        .eq('id', (existing as SubscriptionPayment).id)
      : admin
        .from('subscription_payments')
        .insert({
          restaurant_id: restaurant.id,
          month_key: month,
          ...paymentPayload,
          note: 'Validation superadmin sans reçu restaurateur',
          submitted_at: null,
        })

    const { data: payment, error: paymentError } = await mutation
      .select(`
        *,
        restaurant:restaurants(
          id,name,slug,logo_url,primary_color,city,
          subscription_paid_until,subscription_monthly_amount,is_active,is_preview
        )
      `)
      .single()

    if (paymentError) return NextResponse.json({ error: paymentError.message }, { status: 500 })

    const restaurantResult = await markRestaurantPaidUntil(admin, restaurant, month, amount, reviewNote, now)
    if (restaurantResult.error) return restaurantResult.error

    const [signedPayment] = await withSignedReceiptUrls(admin, [payment as SubscriptionPayment])
    return NextResponse.json({ data: signedPayment, restaurant: restaurantResult.restaurant })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const superAdminError = await requireSuperAdmin(req)
    if (superAdminError) return superAdminError

    const user = await getRequestUser(req)
    const admin = getSupabaseAdmin()
    const body = await req.json() as ReviewBody
    const status = body.status

    if (!body.id) return NextResponse.json({ error: 'Paiement requis' }, { status: 400 })
    if (status !== 'approved' && status !== 'rejected') {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    }

    const { data: payment, error: paymentError } = await admin
      .from('subscription_payments')
      .select('*, restaurant:restaurants(*)')
      .eq('id', body.id)
      .single()

    if (paymentError) return NextResponse.json({ error: paymentError.message }, { status: 500 })

    const typedPayment = payment as SubscriptionPayment & { restaurant: Restaurant }
    const now = new Date().toISOString()
    const reviewNote = body.review_note?.trim() || null

    const { data: updatedPayment, error: updateError } = await admin
      .from('subscription_payments')
      .update({
        status,
        reviewed_at: now,
        reviewed_by_email: user?.email?.toLowerCase() || null,
        review_note: reviewNote,
        updated_at: now,
      })
      .eq('id', body.id)
      .select(`
        *,
        restaurant:restaurants(
          id,name,slug,logo_url,primary_color,city,
          subscription_paid_until,subscription_monthly_amount,is_active,is_preview
        )
      `)
      .single()

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    let updatedRestaurant: Restaurant | null = null
    if (status === 'approved') {
      const restaurantResult = await markRestaurantPaidUntil(admin, typedPayment.restaurant, typedPayment.month_key, typedPayment.amount, reviewNote, now)
      if (restaurantResult.error) return restaurantResult.error
      updatedRestaurant = restaurantResult.restaurant || null
    }

    const [signedPayment] = await withSignedReceiptUrls(admin, [updatedPayment as SubscriptionPayment])
    return NextResponse.json({ data: signedPayment, restaurant: updatedRestaurant })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}
