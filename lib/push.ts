import 'server-only'
import webpush from 'web-push'
import { getSupabaseAdmin } from './supabase/client'

let configured = false
function configure() {
  if (configured) return
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:lemenunumerique@gmail.com'
  if (!pub || !priv) throw new Error('VAPID keys manquantes (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)')
  webpush.setVapidDetails(subject, pub, priv)
  configured = true
}

export interface PushPayload {
  title: string
  body?: string
  url?: string
  tag?: string
  icon?: string
  badge?: string
  requireInteraction?: boolean
  data?: Record<string, unknown>
}

type PushSubscriptionRow = {
  endpoint: string
  p256dh: string
  auth: string
}

async function sendPushToRows(subs: PushSubscriptionRow[] | null | undefined, payload: PushPayload) {
  if (!subs?.length) return { sent: 0, removed: 0 }
  configure()

  const admin = getSupabaseAdmin()
  const json = JSON.stringify(payload)
  const expired: string[] = []
  let sent = 0
  let failed = 0

  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        json,
        { TTL: 60 }
      )
      sent++
    } catch (err: unknown) {
      const error = err as { statusCode?: number; body?: unknown }
      const code = error.statusCode
      if (code === 404 || code === 410) expired.push(s.endpoint)
      else {
        failed++
        console.warn('Push error', code, error.body)
      }
    }
  }))

  if (expired.length) {
    await admin.from('admin_push_subscriptions').delete().in('endpoint', expired)
  }
  return { sent, removed: expired.length, failed }
}

export async function sendPushToRestaurantAdmins(restaurantId: string, payload: PushPayload) {
  const admin = getSupabaseAdmin()
  const { data: subs, error } = await admin
    .from('admin_push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('restaurant_id', restaurantId)

  if (error) return { sent: 0, removed: 0, failed: 0, error: error.message }
  return sendPushToRows(subs, payload)
}

export async function sendPushToSuperAdmins(payload: PushPayload) {
  const admin = getSupabaseAdmin()
  const { data: superAdmin, error } = await admin
    .from('restaurants')
    .select('id')
    .eq('slug', 'superadmin')
    .maybeSingle()

  if (error) return { sent: 0, removed: 0, error: error.message }
  if (!superAdmin?.id) return { sent: 0, removed: 0, error: 'Restaurant superadmin introuvable' }

  const { data: subs, error: subscriptionsError } = await admin
    .from('admin_push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('restaurant_id', superAdmin.id)

  if (subscriptionsError) {
    return { sent: 0, removed: 0, failed: 0, error: subscriptionsError.message }
  }
  return sendPushToRows(subs, payload)
}
