import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/client'
import { getRequestUser } from '@/lib/supabase/request-user'

export async function POST(req: NextRequest) {
  try {
    const user = await getRequestUser(req)
    if (!user?.email) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { endpoint } = await req.json()
    if (!endpoint) return NextResponse.json({ error: 'endpoint requis' }, { status: 400 })

    const admin = getSupabaseAdmin()
    await admin.from('admin_push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('admin_email', user.email.toLowerCase())

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}
