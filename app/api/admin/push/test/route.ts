import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/client'
import { getRequestUser } from '@/lib/supabase/request-user'
import { sendPushToRestaurantAdmins } from '@/lib/push'

export async function POST(req: NextRequest) {
  try {
    const user = await getRequestUser(req)
    if (!user?.email) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json().catch(() => ({})) as { scope?: 'admin' | 'superadmin' }
    const scope = body.scope || 'admin'
    if (scope !== 'admin' && scope !== 'superadmin') {
      return NextResponse.json({ error: 'Portée push invalide' }, { status: 400 })
    }
    const admin = getSupabaseAdmin()
    let query = admin
      .from('restaurants')
      .select('id, name, slug')
      .eq('admin_email', user.email.toLowerCase())

    if (scope === 'superadmin') query = query.eq('slug', 'superadmin')

    const { data: restaurant, error: restaurantError } = await query.maybeSingle()
    if (restaurantError) return NextResponse.json({ error: restaurantError.message }, { status: 500 })
    if (!restaurant) return NextResponse.json({ error: 'Restaurant introuvable' }, { status: 404 })
    const isSuperAdmin = restaurant.slug === 'superadmin'

    const result = await sendPushToRestaurantAdmins(restaurant.id, {
      title: isSuperAdmin ? 'Test TableQR superadmin' : 'Test TableQR',
      body: `Notifications actives sur ${restaurant.name}`,
      url: isSuperAdmin ? '/superadmin' : '/admin/dashboard',
      tag: isSuperAdmin ? 'tableqr-superadmin-test' : 'tableqr-test',
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
