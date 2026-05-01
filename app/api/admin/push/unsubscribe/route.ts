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

    const { endpoint } = await req.json()
    if (!endpoint) return NextResponse.json({ error: 'endpoint requis' }, { status: 400 })

    const admin = getSupabaseAdmin()
    await admin.from('admin_push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('admin_email', user.email.toLowerCase())

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
