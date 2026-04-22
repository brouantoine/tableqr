import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/client'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const admin = getSupabaseAdmin()

  // Vérifier si la table existe
  const { data: tableCheck, error: tableError } = await admin
    .from('qr_codes')
    .select('id')
    .limit(1)

  if (tableError?.code === '42P01') {
    return NextResponse.json({
      status: 'TABLE_MISSING',
      message: 'La table qr_codes n\'existe pas — exécutez migration_qr_preview.sql dans Supabase'
    })
  }

  if (!code) {
    return NextResponse.json({
      status: 'TABLE_OK',
      message: 'Table qr_codes présente. Ajoutez ?code=VOTRE_CODE pour chercher un code spécifique.'
    })
  }

  const { data, error } = await admin
    .from('qr_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .maybeSingle()

  if (error) return NextResponse.json({ status: 'ERROR', error: error.message })

  if (!data) {
    return NextResponse.json({
      status: 'CODE_NOT_FOUND',
      code: code.toUpperCase(),
      message: 'Ce code n\'existe pas dans la base'
    })
  }

  return NextResponse.json({
    status: data.restaurant_id ? 'LINKED' : 'NOT_LINKED',
    code: data.code,
    restaurant_id: data.restaurant_id,
    table_name: data.table_name,
    linked_at: data.linked_at,
    scan_count: data.scan_count,
  })
}
