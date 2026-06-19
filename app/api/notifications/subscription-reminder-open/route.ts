import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { tracking_token?: string }
    const trackingToken = body.tracking_token?.trim()
    if (!trackingToken || !UUID_PATTERN.test(trackingToken)) {
      return NextResponse.json({ error: 'Identifiant de suivi invalide' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { data: event, error } = await admin
      .from('notifications')
      .select('id, restaurant_id, title, body')
      .eq('type', 'subscription_reminder_tracking')
      .contains('data', { tracking_token: trackingToken })
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!event) return NextResponse.json({ error: 'Notification introuvable' }, { status: 404 })

    const { data: existingOpen, error: existingOpenError } = await admin
      .from('notifications')
      .select('created_at, data')
      .eq('type', 'subscription_reminder_open')
      .contains('data', { reminder_event_id: event.id })
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (existingOpenError) return NextResponse.json({ error: existingOpenError.message }, { status: 500 })
    if (existingOpen) {
      const existingData = existingOpen.data && typeof existingOpen.data === 'object' && !Array.isArray(existingOpen.data)
        ? existingOpen.data as Record<string, unknown>
        : {}
      return NextResponse.json({
        ok: true,
        opened_at: typeof existingData.opened_at === 'string' ? existingData.opened_at : existingOpen.created_at,
      })
    }

    const now = new Date().toISOString()
    const userAgent = req.headers.get('user-agent') || null
    const { error: insertError } = await admin
      .from('notifications')
      .insert({
        restaurant_id: event.restaurant_id,
        session_id: null,
        type: 'subscription_reminder_open',
        title: 'Notification de relance ouverte',
        body: event.body,
        is_read: true,
        data: {
          reminder_event_id: event.id,
          tracking_token: trackingToken,
          opened_at: now,
          user_agent: userAgent,
        },
        created_at: now,
      })

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    await admin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', event.id)

    return NextResponse.json({ ok: true, opened_at: now })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}
