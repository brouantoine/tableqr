import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/client'

export async function POST(req: NextRequest) {
  const { order_id } = await req.json()
  if (!order_id) return NextResponse.json({ error: 'order_id requis' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data: order } = await admin.from('orders')
    .select('id, status, session_id, restaurant_id, order_number')
    .eq('id', order_id).single()

  if (!order || order.status !== 'pending')
    return NextResponse.json({ message: 'Rien à faire' })

  await admin.from('orders')
    .update({ status: 'preparing', updated_at: new Date().toISOString() })
    .eq('id', order_id)

  if (order.session_id) {
    await admin.from('notifications').insert({
      restaurant_id: order.restaurant_id,
      session_id: order.session_id,
      type: 'order_ready',
      title: '👨‍🍳 En préparation !',
      body: `${order.order_number} est en cours de préparation`,
      data: { order_id },
    })
  }

  return NextResponse.json({ success: true })
}