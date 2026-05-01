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

export async function sendPushToRestaurantAdmins(restaurantId: string, payload: PushPayload) {
  configure()
  const admin = getSupabaseAdmin()
  const { data: subs } = await admin
    .from('admin_push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('restaurant_id', restaurantId)

  if (!subs?.length) return { sent: 0, removed: 0 }

  const json = JSON.stringify(payload)
  const expired: string[] = []
  let sent = 0

  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        json,
        { TTL: 60 }
      )
      sent++
    } catch (err: any) {
      const code = err?.statusCode
      if (code === 404 || code === 410) expired.push(s.endpoint)
      else console.warn('Push error', code, err?.body)
    }
  }))

  if (expired.length) {
    await admin.from('admin_push_subscriptions').delete().in('endpoint', expired)
  }
  return { sent, removed: expired.length }
}
