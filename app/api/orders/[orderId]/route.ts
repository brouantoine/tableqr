import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/client'

const STATUS_NOTIF: Record<string, { title: string; body: (orderNumber: string) => string }> = {
  confirmed: {
    title: 'Commande reçue',
    body: (n) => `Le restaurant a bien reçu votre commande ${n}`,
  },
  preparing: {
    title: 'Le chef cuisine !',
    body: (n) => `Votre commande ${n} est en préparation`,
  },
  ready: {
    title: 'Votre commande est prête !',
    body: (n) => `${n} sort de la cuisine`,
  },
  served: {
    title: 'Bon appétit !',
    body: (n) => `Votre commande ${n} vient d'être servie`,
  },
  cancelled: {
    title: 'Commande annulée',
    body: (n) => `Votre commande ${n} a été annulée`,
  },
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const admin = getSupabaseAdmin()
  const { orderId } = await params
  const body = await req.json()
  const updates: any = { updated_at: new Date().toISOString() }
  if (body.status) updates.status = body.status
  if (body.payment_status) updates.payment_status = body.payment_status
  if (body.payment_method) updates.payment_method = body.payment_method

  const { data, error } = await admin.from('orders')
    .update(updates).eq('id', orderId).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notification client à chaque transition de statut significative
  if (body.status && data.session_id && STATUS_NOTIF[body.status]) {
    const cfg = STATUS_NOTIF[body.status]
    await admin.from('notifications').insert({
      restaurant_id: data.restaurant_id,
      session_id: data.session_id,
      type: body.status === 'ready' ? 'order_ready' : 'order_status',
      title: cfg.title,
      body: cfg.body(data.order_number),
      data: { order_id: data.id, status: body.status, order_number: data.order_number },
    })
  }
  return NextResponse.json({ data })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const admin = getSupabaseAdmin()
  const { orderId } = await params
  const { data, error } = await admin.from('orders')
    .select('*, items:order_items(*), table:restaurant_tables(table_number)')
    .eq('id', orderId).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ data })
}
