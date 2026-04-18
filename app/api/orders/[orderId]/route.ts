import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/client'

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

  if (body.status === 'ready' && data.session_id) {
    await admin.from('notifications').insert({
      restaurant_id: data.restaurant_id, session_id: data.session_id,
      type: 'order_ready', title: '🔔 Votre commande est prête !',
      body: `${data.order_number} est prête`, data: { order_id: data.id },
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
