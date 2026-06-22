import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/client'
import { purgeExpiredNotificationsSafely } from '@/lib/notifications-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const admin = getSupabaseAdmin()
  const deleted = await purgeExpiredNotificationsSafely(admin)
  return NextResponse.json({ ok: true, deleted })
}
