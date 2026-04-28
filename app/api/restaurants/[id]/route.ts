import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/client'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = getSupabaseAdmin()
    const { id } = await params

    const { data: restaurant } = await admin.from('restaurants').select('id').eq('id', id).maybeSingle()
    if (!restaurant) return NextResponse.json({ error: 'Restaurant introuvable' }, { status: 404 })

    // Ordre respectant les FK : enfants avant parents
    await admin.from('order_items').delete().eq('restaurant_id', id)
    await admin.from('orders').delete().eq('restaurant_id', id)
    await admin.from('social_messages').delete().eq('restaurant_id', id)
    await admin.from('matches').delete().eq('restaurant_id', id)
    // game_sessions CASCADE-supprime game_players
    await admin.from('game_sessions').delete().eq('restaurant_id', id)
    await admin.from('notifications').delete().eq('restaurant_id', id)
    await admin.from('client_sessions').delete().eq('restaurant_id', id)
    await admin.from('menu_items').delete().eq('restaurant_id', id)
    await admin.from('menu_categories').delete().eq('restaurant_id', id)
    await admin.from('restaurant_tables').delete().eq('restaurant_id', id)
    await admin.from('loyalty_records').delete().eq('restaurant_id', id)
    await admin.from('daily_analytics').delete().eq('restaurant_id', id)
    await admin.from('qr_codes')
      .update({ restaurant_id: null, table_name: null, linked_at: null })
      .eq('restaurant_id', id)

    const { error } = await admin.from('restaurants').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
