import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/client'
import { getRequestUser } from '@/lib/supabase/request-user'
import {
  TABLEQR_MONTHLY_PRICE,
  getMonthEndDateString,
  getPreviousMonthEndDateString,
  parseMonthKey,
} from '@/lib/subscription'

type SubscriptionBody = {
  month?: string
  status?: 'paid' | 'unpaid'
  amount?: number
  note?: string
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(req)
    if (!user?.email) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const admin = getSupabaseAdmin()
    const { data: superAdmin } = await admin
      .from('restaurants')
      .select('id')
      .eq('admin_email', user.email.toLowerCase())
      .eq('slug', 'superadmin')
      .maybeSingle()

    if (!superAdmin) return NextResponse.json({ error: 'Accès superadmin requis' }, { status: 403 })

    const { id } = await ctx.params
    const body = await req.json() as SubscriptionBody
    const month = body.month || ''
    const status = body.status

    if (!parseMonthKey(month)) return NextResponse.json({ error: 'Mois invalide' }, { status: 400 })
    if (status !== 'paid' && status !== 'unpaid') {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    }

    const paidUntil = status === 'paid'
      ? getMonthEndDateString(month)
      : getPreviousMonthEndDateString(month)

    if (!paidUntil) return NextResponse.json({ error: 'Mois invalide' }, { status: 400 })

    const amount = Number.isFinite(Number(body.amount)) && Number(body.amount) > 0
      ? Number(body.amount)
      : TABLEQR_MONTHLY_PRICE

    const { data, error } = await admin
      .from('restaurants')
      .update({
        subscription_status: status === 'paid' ? 'subscribed' : 'trial',
        subscription_paid_until: paidUntil,
        subscription_last_payment_at: status === 'paid' ? new Date().toISOString() : null,
        subscription_monthly_amount: amount,
        subscription_payment_note: body.note?.trim() || null,
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}
