import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getSupabaseAdmin } from '@/lib/supabase/client'
import { requireSuperAdmin } from '@/lib/supabase/superadmin'
import { sendPushToRestaurantAdmins } from '@/lib/push'
import {
  getRestaurantSubscriptionSummary,
  getSubscriptionReminderContent,
} from '@/lib/subscription'
import type { Restaurant, SubscriptionPayment } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ReminderBody = {
  restaurant_id?: string
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

async function sendReminderEmail(to: string, restaurantName: string, subject: string, body: string) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    return { sent: false, error: 'Configuration email manquante' }
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  })

  const safeBody = escapeHtml(body).replace(/\n/g, '<br>')
  await transporter.sendMail({
    from: `TableQR <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;color:#111827">
        <h1 style="font-size:22px;margin:0 0 12px;color:#F26522">TableQR</h1>
        <p style="font-size:14px;color:#6B7280;margin:0 0 20px">${escapeHtml(restaurantName)}</p>
        <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:16px;padding:20px;line-height:1.6;font-size:15px">
          ${safeBody}
        </div>
        <a href="${escapeHtml(process.env.NEXT_PUBLIC_APP_URL || '')}/admin/paiements"
          style="display:inline-block;margin-top:18px;background:#F26522;color:#fff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:700">
          Ouvrir mes paiements
        </a>
      </div>
    `,
  })

  return { sent: true, error: null }
}

export async function POST(req: NextRequest) {
  try {
    const superAdminError = await requireSuperAdmin(req)
    if (superAdminError) return superAdminError

    const body = await req.json() as ReminderBody
    if (!body.restaurant_id) {
      return NextResponse.json({ error: 'Restaurant requis' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { data: restaurantData, error: restaurantError } = await admin
      .from('restaurants')
      .select('*')
      .eq('id', body.restaurant_id)
      .maybeSingle()

    if (restaurantError) return NextResponse.json({ error: restaurantError.message }, { status: 500 })
    if (!restaurantData) return NextResponse.json({ error: 'Restaurant introuvable' }, { status: 404 })

    const restaurant = restaurantData as Restaurant
    if (restaurant.is_preview) {
      return NextResponse.json({ error: 'Les démos ne reçoivent pas de relance paiement.' }, { status: 403 })
    }
    if (!restaurant.is_active) {
      return NextResponse.json({ error: 'Ce restaurant est inactif.' }, { status: 409 })
    }

    const { data: paymentsData, error: paymentsError } = await admin
      .from('subscription_payments')
      .select('*')
      .eq('restaurant_id', restaurant.id)

    if (paymentsError?.code === '42P01') {
      return NextResponse.json({ error: 'Migration SQL manquante : exécutez migration_subscription_payments.sql' }, { status: 500 })
    }
    if (paymentsError) return NextResponse.json({ error: paymentsError.message }, { status: 500 })

    const payments = (paymentsData || []) as SubscriptionPayment[]
    const summary = getRestaurantSubscriptionSummary(restaurant, payments)
    if (summary.due_periods === 0) {
      return NextResponse.json({ error: 'Aucune échéance à relancer pour ce restaurant.' }, { status: 409 })
    }

    const content = getSubscriptionReminderContent(restaurant, summary)
    const push = await sendPushToRestaurantAdmins(restaurant.id, {
      title: content.title,
      body: content.short_body,
      url: '/admin/paiements',
      tag: `subscription-${restaurant.id}-${summary.current_period_start}`,
      icon: '/icon-192.png',
      badge: '/badge.png',
      requireInteraction: true,
      data: {
        restaurantId: restaurant.id,
        periodStart: summary.current_period_start,
        periodEnd: summary.current_period_end,
        amountDue: summary.amount_due,
      },
    }).catch((e) => ({
      sent: 0,
      removed: 0,
      error: e instanceof Error ? e.message : 'Erreur push',
    }))

    let email: { sent: boolean; error: string | null } = { sent: false, error: null }
    if (restaurant.admin_email) {
      email = await sendReminderEmail(
        restaurant.admin_email,
        restaurant.name,
        content.subject,
        content.body,
      ).catch((e) => ({
        sent: false,
        error: e instanceof Error ? e.message : 'Erreur email',
      }))
    } else {
      email = { sent: false, error: 'Email admin manquant' }
    }

    return NextResponse.json({
      ok: true,
      restaurant_id: restaurant.id,
      summary,
      content,
      push,
      email,
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}
