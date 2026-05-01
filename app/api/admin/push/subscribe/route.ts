import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/client'
import { getRequestUser } from '@/lib/supabase/request-user'

export async function POST(req: NextRequest) {
  try {
    const user = await getRequestUser(req)
    if (!user?.email) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const email = user.email.toLowerCase()
    const { subscription } = await req.json()
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: 'Subscription invalide' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { data: restaurant } = await admin
      .from('restaurants').select('id').eq('admin_email', email).maybeSingle()
    if (!restaurant) return NextResponse.json({ error: 'Restaurant introuvable' }, { status: 404 })

    const userAgent = req.headers.get('user-agent') || null

    const { error } = await admin.from('admin_push_subscriptions').upsert({
      restaurant_id: restaurant.id,
      admin_email: email,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: userAgent,
      last_used_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}
