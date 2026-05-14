import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/client'
import { sendPushToRestaurantAdmins } from '@/lib/push'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
type ClientPaymentMethod = 'orange_money' | 'wave' | 'cash' | 'card'
type OrderRequestItem = {
  menu_item_id: string
  quantity: number
  notes?: string | null
}
type OrderRequestBody = {
  session_id?: string
  restaurant_id?: string
  table_id?: string | null
  items?: OrderRequestItem[]
  notes?: string | null
  order_type?: string
  payment_method?: string | null
}
type MenuItemRow = {
  id: string
  name: string
  price: number
  is_available: boolean
}

const CLIENT_PAYMENT_METHODS = new Set<ClientPaymentMethod>(['orange_money', 'wave', 'cash', 'card'])
const PAYMENT_LABELS: Record<ClientPaymentMethod, string> = {
  orange_money: 'Orange Money',
  wave: 'Wave',
  cash: 'Espèces',
  card: 'Carte bancaire',
}

function isClientPaymentMethod(value: unknown): value is ClientPaymentMethod {
  return typeof value === 'string' && CLIENT_PAYMENT_METHODS.has(value as ClientPaymentMethod)
}

export async function POST(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin()
    const { session_id, restaurant_id, table_id, items, notes, order_type, payment_method } = await req.json() as OrderRequestBody
    if (!session_id || !restaurant_id || !Array.isArray(items) || items.length === 0)
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    if (payment_method && !isClientPaymentMethod(payment_method))
      return NextResponse.json({ error: 'Moyen de paiement invalide' }, { status: 400 })

    const { data: menuItems } = await admin
      .from('menu_items').select('id, name, price, is_available')
      .in('id', items.map(i => i.menu_item_id)).eq('restaurant_id', restaurant_id)

    if (!menuItems) return NextResponse.json({ error: 'Plats introuvables' }, { status: 400 })

    let subtotal = 0
    const menuRows = menuItems as MenuItemRow[]
    const lines = items.map((item) => {
      const m = menuRows.find(x => x.id === item.menu_item_id)
      if (!m?.is_available) throw new Error('Plat indisponible')
      const quantity = Number(item.quantity)
      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Quantité invalide')
      const total = m.price * quantity; subtotal += total
      return { restaurant_id, menu_item_id: m.id, item_name: m.name, item_price: m.price, quantity, total, notes: item.notes || null }
    })

    const { data: cnt } = await admin.from('orders').select('id', { count: 'exact' }).eq('restaurant_id', restaurant_id)
    const order_number = `CMD-${String((cnt?.length || 0) + 1).padStart(4, '0')}`

    const safeTableId = table_id && UUID_REGEX.test(table_id) ? table_id : null
    const safePaymentMethod = isClientPaymentMethod(payment_method) ? payment_method : null

    const { data: order, error } = await admin.from('orders')
      .insert({ restaurant_id, session_id, table_id: safeTableId, order_number, status: 'pending', payment_status: 'unpaid', payment_method: safePaymentMethod, subtotal, tax_amount: 0, total: subtotal, order_type: order_type || 'dine_in', notes: notes || null, is_remote: order_type === 'delivery' })
      .select().single()

    if (error || !order) {
      console.error('Supabase insert error:', JSON.stringify(error))
      return NextResponse.json({ error: 'Erreur création' }, { status: 500 })
    }
    await admin.from('order_items').insert(lines.map(l => ({ ...l, order_id: order.id })))

    try {
      let tableLabel = ''
      if (safeTableId) {
        const { data: t } = await admin.from('restaurant_tables').select('table_number').eq('id', safeTableId).maybeSingle()
        if (t?.table_number) tableLabel = ` · Table ${t.table_number}`
      }
      const totalFmt = new Intl.NumberFormat('fr-FR').format(subtotal) + ' FCFA'
      const paymentLabel = safePaymentMethod ? ` · ${PAYMENT_LABELS[safePaymentMethod]}` : ''
      await sendPushToRestaurantAdmins(restaurant_id, {
        title: `Nouvelle commande ${order_number}`,
        body: `${totalFmt}${tableLabel}${paymentLabel}`,
        url: '/admin/dashboard',
        tag: `order-${order.id}`,
        data: { orderId: order.id, restaurantId: restaurant_id },
      })
    } catch (e) {
      console.warn('Push notif failed', e)
    }

    return NextResponse.json({ data: order })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
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
