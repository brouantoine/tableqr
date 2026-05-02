import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/client'
import { addSupportMessage } from '@/lib/support'
import { sendPushToRestaurantAdmins } from '@/lib/push'
import type { SupportConversation, SupportSenderType } from '@/types'

interface MessageBody {
  conversation_id?: string
  sender_type?: SupportSenderType
  sender_session_id?: string
  message?: string
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get('conversation_id')
    if (!conversationId) return NextResponse.json({ error: 'conversation_id requis' }, { status: 400 })

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('support_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data || [] })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as MessageBody
    const message = body.message?.trim()

    if (!body.conversation_id || !body.sender_type || !message) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }
    if (message.length > 1500) {
      return NextResponse.json({ error: 'Message trop long' }, { status: 400 })
    }
    if (!['client', 'staff', 'bot'].includes(body.sender_type)) {
      return NextResponse.json({ error: 'Expéditeur invalide' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { data: conversation, error: conversationError } = await admin
      .from('support_conversations')
      .select('*, session:client_sessions(id, pseudo, table_id, table:restaurant_tables(table_number))')
      .eq('id', body.conversation_id)
      .maybeSingle()

    if (conversationError) return NextResponse.json({ error: conversationError.message }, { status: 500 })
    if (!conversation) return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })

    const conv = conversation as SupportConversation & {
      session?: { id: string; pseudo?: string; table?: { table_number?: string } | null }
    }

    if (body.sender_type === 'client' && body.sender_session_id !== conv.client_session_id) {
      return NextResponse.json({ error: 'Session client invalide' }, { status: 403 })
    }

    const data = await addSupportMessage(
      admin,
      conv,
      body.sender_type,
      message,
      body.sender_type === 'client' ? body.sender_session_id : null
    )

    if (body.sender_type === 'client') {
      try {
        const tableLabel = conv.session?.table?.table_number ? ` · Table ${conv.session.table.table_number}` : ''
        await sendPushToRestaurantAdmins(conv.restaurant_id, {
          title: 'Nouvelle demande client',
          body: `${conv.session?.pseudo || 'Client'}${tableLabel} : ${message.slice(0, 90)}`,
          url: '/admin/assistance',
          tag: `support-${conv.id}`,
          data: { supportConversationId: conv.id, restaurantId: conv.restaurant_id },
          requireInteraction: true,
        })
      } catch (e) {
        console.warn('Support push failed', e)
      }
    }

    if (body.sender_type === 'staff') {
      await admin.from('notifications').insert({
        restaurant_id: conv.restaurant_id,
        session_id: conv.client_session_id,
        type: 'support',
        title: 'Personnel du restaurant',
        body: message.length > 100 ? message.slice(0, 100) + '...' : message,
        data: { href: '/social?support=1', support_conversation_id: conv.id },
      })
    }

    return NextResponse.json({ data })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as { conversation_id?: string; reader?: 'client' | 'staff' }
    if (!body.conversation_id || !body.reader) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    let query = admin
      .from('support_messages')
      .update({ is_read: true })
      .eq('conversation_id', body.conversation_id)
      .eq('is_read', false)

    query = body.reader === 'client'
      ? query.neq('sender_type', 'client')
      : query.eq('sender_type', 'client')

    const { error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}
