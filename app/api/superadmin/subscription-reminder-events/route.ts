import { NextRequest, NextResponse } from 'next/server'
import { getNotificationRetentionCutoffIso } from '@/lib/notifications'
import { purgeExpiredNotificationsSafely } from '@/lib/notifications-server'
import { getSupabaseAdmin } from '@/lib/supabase/client'
import { requireSuperAdmin } from '@/lib/supabase/superadmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const superAdminError = await requireSuperAdmin(req)
    if (superAdminError) return superAdminError

    const admin = getSupabaseAdmin()
    await purgeExpiredNotificationsSafely(admin)
    const cutoff = getNotificationRetentionCutoffIso()
    const { data: events, error } = await admin
      .from('notifications')
      .select('id, restaurant_id, title, body, data, is_read, created_at, restaurant:restaurants(id, name, slug, logo_url, primary_color)')
      .eq('type', 'subscription_reminder_tracking')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: openings, error: openingsError } = await admin
      .from('notifications')
      .select('created_at, data')
      .eq('type', 'subscription_reminder_open')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(200)

    if (openingsError) return NextResponse.json({ error: openingsError.message }, { status: 500 })

    const openedAtByEvent = new Map<string, string>()
    for (const opening of openings || []) {
      const openingData = opening.data && typeof opening.data === 'object' && !Array.isArray(opening.data)
        ? opening.data as Record<string, unknown>
        : {}
      const eventId = typeof openingData.reminder_event_id === 'string' ? openingData.reminder_event_id : null
      const openedAt = typeof openingData.opened_at === 'string' ? openingData.opened_at : opening.created_at
      if (eventId && !openedAtByEvent.has(eventId)) openedAtByEvent.set(eventId, openedAt)
    }

    const data = (events || []).map(event => {
      const eventData = event.data && typeof event.data === 'object' && !Array.isArray(event.data)
        ? event.data as Record<string, unknown>
        : {}
      return {
        ...event,
        data: {
          ...eventData,
          opened_at: openedAtByEvent.get(event.id) || null,
        },
      }
    })

    return NextResponse.json({ data })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}
