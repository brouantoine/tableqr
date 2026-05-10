import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from './client'
import { getRequestUser } from './request-user'

export async function requireSuperAdmin(req: NextRequest) {
  const user = await getRequestUser(req)
  if (!user?.email) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  const { data: superAdmin } = await admin
    .from('restaurants')
    .select('id')
    .eq('admin_email', user.email.toLowerCase())
    .eq('slug', 'superadmin')
    .maybeSingle()

  if (!superAdmin) {
    return NextResponse.json({ error: 'Accès superadmin requis' }, { status: 403 })
  }

  return null
}
