import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseAdmin } from '@/lib/supabase/client'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supa = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    )
    const { data: { user } } = await supa.auth.getUser()
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
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
