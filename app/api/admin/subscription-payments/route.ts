import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/client'
import { getRequestUser } from '@/lib/supabase/request-user'
import { PAYMENT_RECEIPTS_BUCKET } from '@/lib/subscription-payments'
import { TABLEQR_MONTHLY_PRICE, TABLEQR_SUBSCRIPTION_CURRENCY, parseMonthKey } from '@/lib/subscription'
import type { Restaurant, SubscriptionPayment } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_RECEIPT_SIZE = 6 * 1024 * 1024
const ALLOWED_RECEIPT_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])

async function getRestaurantForRequest(req: NextRequest) {
  const user = await getRequestUser(req)
  if (!user?.email) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }

  const admin = getSupabaseAdmin()
  const { data: restaurant, error } = await admin
    .from('restaurants')
    .select('*')
    .eq('admin_email', user.email.toLowerCase())
    .maybeSingle()

  if (error) return { error: NextResponse.json({ error: error.message }, { status: 500 }) }
  if (!restaurant) return { error: NextResponse.json({ error: 'Restaurant introuvable' }, { status: 404 }) }

  return { admin, restaurant: restaurant as Restaurant }
}

async function ensureReceiptBucket(admin: ReturnType<typeof getSupabaseAdmin>) {
  const { error } = await admin.storage.getBucket(PAYMENT_RECEIPTS_BUCKET)
  if (!error) return
  await admin.storage.createBucket(PAYMENT_RECEIPTS_BUCKET, { public: false })
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

function cleanFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'recu'
}

function getReceiptExtension(file: File) {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName
  if (file.type === 'image/jpeg') return 'jpg'
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  if (file.type === 'application/pdf') return 'pdf'
  return 'bin'
}

export async function GET(req: NextRequest) {
  try {
    const context = await getRestaurantForRequest(req)
    if (context.error) return context.error
    const { admin, restaurant } = context

    const { data, error } = await admin
      .from('subscription_payments')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('month_key', { ascending: false })
      .order('submitted_at', { ascending: false })

    if (error?.code === '42P01') {
      return NextResponse.json({ restaurant, data: [], migration_needed: true })
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const payments = await withSignedReceiptUrls(admin, (data || []) as SubscriptionPayment[])
    return NextResponse.json({ restaurant, data: payments })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await getRestaurantForRequest(req)
    if (context.error) return context.error
    const { admin, restaurant } = context

    if (restaurant.is_preview) {
      return NextResponse.json({ error: 'Les restaurants preview ne peuvent pas soumettre de paiement.' }, { status: 403 })
    }

    const form = await req.formData()
    const month = String(form.get('month') || '')
    if (!parseMonthKey(month)) return NextResponse.json({ error: 'Mois invalide' }, { status: 400 })
    if (form.get('confirmed_paid') !== 'true') {
      return NextResponse.json({ error: 'Confirmez que le mois est payé avant d’envoyer le reçu.' }, { status: 400 })
    }

    const receipt = form.get('receipt')
    if (!(receipt instanceof File) || receipt.size === 0) {
      return NextResponse.json({ error: 'Capture du reçu obligatoire' }, { status: 400 })
    }
    if (receipt.size > MAX_RECEIPT_SIZE) {
      return NextResponse.json({ error: 'Reçu trop lourd : maximum 6 Mo' }, { status: 400 })
    }
    if (!ALLOWED_RECEIPT_TYPES.has(receipt.type)) {
      return NextResponse.json({ error: 'Format reçu accepté : PNG, JPG, WebP ou PDF' }, { status: 400 })
    }

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
    if ((existing as SubscriptionPayment | null)?.status === 'approved') {
      return NextResponse.json({ error: 'Ce mois est déjà validé comme payé.' }, { status: 409 })
    }

    await ensureReceiptBucket(admin)

    const amount = Number(form.get('amount') || restaurant.subscription_monthly_amount || TABLEQR_MONTHLY_PRICE)
    const note = String(form.get('note') || '').trim() || null
    const ext = getReceiptExtension(receipt)
    const fileName = `${cleanFileName(restaurant.slug)}-${month}-${Date.now()}.${ext}`
    const storagePath = `${restaurant.id}/${month}/${fileName}`
    const bytes = Buffer.from(await receipt.arrayBuffer())

    const { error: uploadError } = await admin.storage
      .from(PAYMENT_RECEIPTS_BUCKET)
      .upload(storagePath, bytes, {
        cacheControl: '3600',
        upsert: false,
        contentType: receipt.type,
      })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const now = new Date().toISOString()
    const { data, error } = await admin
      .from('subscription_payments')
      .upsert({
        restaurant_id: restaurant.id,
        month_key: month,
        amount: Number.isFinite(amount) && amount > 0 ? amount : TABLEQR_MONTHLY_PRICE,
        currency: restaurant.currency || TABLEQR_SUBSCRIPTION_CURRENCY,
        status: 'pending',
        receipt_storage_path: storagePath,
        receipt_file_name: receipt.name || fileName,
        receipt_content_type: receipt.type,
        receipt_size: receipt.size,
        note,
        submitted_at: now,
        reviewed_at: null,
        reviewed_by_email: null,
        review_note: null,
        updated_at: now,
      }, { onConflict: 'restaurant_id,month_key' })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const [payment] = await withSignedReceiptUrls(admin, [data as SubscriptionPayment])
    return NextResponse.json({ data: payment })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}
