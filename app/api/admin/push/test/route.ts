import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/client'
import { getRequestUser } from '@/lib/supabase/request-user'
import { sendPushToRestaurantAdmins } from '@/lib/push'

export async function POST(req: NextRequest) {
  try {
    const user = await getRequestUser(req)
    if (!user?.email) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const admin = getSupabaseAdmin()
    const { data: restaurant } = await admin
      .from('restaurants').select('id, name').eq('admin_email', user.email.toLowerCase()).maybeSingle()
    if (!restaurant) return NextResponse.json({ error: 'Restaurant introuvable' }, { status: 404 })

    const result = await sendPushToRestaurantAdmins(restaurant.id, {
      title: '🔔 Test TableQR',
      body: `Notifications actives sur ${restaurant.name} ✓`,
      url: '/admin/dashboard',
      tag: 'tableqr-test',
      icon: '/icon-192.png',
      badge: '/badge.png',
      requireInteraction: true,
      data: { test: true },
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}
