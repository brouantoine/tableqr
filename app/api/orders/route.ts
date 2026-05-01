import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/client'
import { sendPushToRestaurantAdmins } from '@/lib/push'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin()
    const { session_id, restaurant_id, table_id, items, notes, order_type } = await req.json()
    if (!session_id || !restaurant_id || !items?.length)
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })

    const { data: menuItems } = await admin
      .from('menu_items').select('id, name, price, is_available')
      .in('id', items.map((i: any) => i.menu_item_id)).eq('restaurant_id', restaurant_id)

    if (!menuItems) return NextResponse.json({ error: 'Plats introuvables' }, { status: 400 })

    let subtotal = 0
    const lines = items.map((item: any) => {
      const m = menuItems.find((x: any) => x.id === item.menu_item_id)
      if (!m?.is_available) throw new Error('Plat indisponible')
      const total = m.price * item.quantity; subtotal += total
      return { restaurant_id, menu_item_id: m.id, item_name: m.name, item_price: m.price, quantity: item.quantity, total, notes: item.notes || null }
    })

    const { data: cnt } = await admin.from('orders').select('id', { count: 'exact' }).eq('restaurant_id', restaurant_id)
    const order_number = `CMD-${String((cnt?.length || 0) + 1).padStart(4, '0')}`

    // ✅ FIX : on ne transmet table_id que s'il s'agit d'un UUID valide,
    // pour éviter un rejet 400 de Supabase quand c'est un nom de table physique (ex: "table")
    const safeTableId = table_id && UUID_REGEX.test(table_id) ? table_id : null

    const { data: order, error } = await admin.from('orders')
      .insert({ restaurant_id, session_id, table_id: safeTableId, order_number, status: 'pending', payment_status: 'unpaid', subtotal, tax_amount: 0, total: subtotal, order_type: order_type || 'dine_in', notes: notes || null, is_remote: order_type === 'delivery' })
      .select().single()

    if (error || !order) {
      console.error('Supabase insert error:', JSON.stringify(error))
      return NextResponse.json({ error: 'Erreur création' }, { status: 500 })
    }
    await admin.from('order_items').insert(lines.map((l: any) => ({ ...l, order_id: order.id })))

    // Push notification aux admins du restaurant (non bloquant)
    try {
      let tableLabel = ''
      if (safeTableId) {
        const { data: t } = await admin.from('restaurant_tables').select('table_number').eq('id', safeTableId).maybeSingle()
        if (t?.table_number) tableLabel = ` · Table ${t.table_number}`
      }
      const totalFmt = new Intl.NumberFormat('fr-FR').format(subtotal) + ' FCFA'
      await sendPushToRestaurantAdmins(restaurant_id, {
        title: `🔔 Nouvelle commande ${order_number}`,
        body: `${totalFmt}${tableLabel}`,
        url: '/admin/dashboard',
        tag: `order-${order.id}`,
        data: { orderId: order.id, restaurantId: restaurant_id },
      })
    } catch (e) {
      console.warn('Push notif failed', e)
    }

    return NextResponse.json({ data: order })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}

export async function GET(req: NextRequest) {
  const admin = getSupabaseAdmin()
  const { searchParams } = new URL(req.url)
  const restaurant_id = searchParams.get('restaurant_id')
  if (!restaurant_id) return NextResponse.json({ error: 'restaurant_id requis' }, { status: 400 })

  const { data, error } = await admin.from('orders')
    .select('*, items:order_items(*), table:restaurant_tables(table_number)')
    .eq('restaurant_id', restaurant_id)
    .order('created_at', { ascending: false }).limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}