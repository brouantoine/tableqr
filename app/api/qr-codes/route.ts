import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/client'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export async function GET(req: NextRequest) {
  const admin = getSupabaseAdmin()
  const restaurantId = req.nextUrl.searchParams.get('restaurant_id')
  if (!restaurantId) return NextResponse.json({ error: 'restaurant_id requis' }, { status: 400 })

  const { data, error } = await admin
    .from('qr_codes')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('linked_at', { ascending: false })

  if (error) {
    // Table qr_codes manquante → migration pas encore exécutée
    if (error.code === '42P01') return NextResponse.json({ data: [], migration_needed: true })
    return NextResponse.json({ data: [] })
  }
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const admin = getSupabaseAdmin()
  const body = await req.json()
  const { action } = body

  if (action === 'generate') {
    const { batch_name, count = 10 } = body
    const maxCount = Math.min(Number(count), 500)
    const codes: string[] = []

    for (let i = 0; i < maxCount; i++) {
      let code: string
      let attempts = 0
      do {
        code = generateCode()
        const { data: existing } = await admin.from('qr_codes').select('id').eq('code', code).maybeSingle()
        if (!existing) break
        attempts++
      } while (attempts < 10)
      codes.push(code!)
    }

    const rows = codes.map(code => ({ code, batch_name: batch_name || null }))
    const { data, error } = await admin.from('qr_codes').insert(rows).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  if (action === 'link') {
    const { code, restaurant_id, table_name } = body
    if (!code || !restaurant_id || !table_name) {
      return NextResponse.json({ error: 'code, restaurant_id et table_name requis' }, { status: 400 })
    }

    const cleanCode = code.trim().toUpperCase()

    // Vérifier si ce code existe déjà en base
    const { data: existing, error: selectErr } = await admin
      .from('qr_codes')
      .select('id, restaurant_id, table_name')
      .eq('code', cleanCode)
      .maybeSingle()

    if (selectErr?.code === '42P01') {
      return NextResponse.json({ error: 'Migration SQL manquante — exécutez migration_qr_preview.sql dans Supabase' }, { status: 500 })
    }

    // Code déjà lié à un autre restaurant
    if (existing?.restaurant_id && existing.restaurant_id !== restaurant_id) {
      return NextResponse.json({ error: 'Ce QR est déjà utilisé par un autre restaurant' }, { status: 409 })
    }

    // Code déjà lié à CE restaurant (peu importe la table) → erreur explicite
    if (existing?.restaurant_id === restaurant_id) {
      return NextResponse.json({
        error: `Ce QR est déjà lié à la table "${existing?.table_name || '?'}" — déliez-le d'abord`
      }, { status: 409 })
    }

    // Code libre (inexistant ou non lié) → insérer ou mettre à jour
    const { data, error } = await admin
      .from('qr_codes')
      .upsert(
        { code: cleanCode, restaurant_id, table_name, linked_at: new Date().toISOString() },
        { onConflict: 'code' }
      )
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  if (action === 'unlink') {
    const { code } = body
    if (!code) return NextResponse.json({ error: 'code requis' }, { status: 400 })

    const { error } = await admin
      .from('qr_codes')
      .update({ restaurant_id: null, table_name: null, linked_at: null })
      .eq('code', code.toUpperCase())

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
}
