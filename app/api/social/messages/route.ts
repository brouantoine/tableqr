import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/client'
import { isLiveSocialClient } from '@/lib/social/presence'
import type { ClientSession } from '@/types'

interface MessageBody {
  restaurant_id?: string
  sender_session_id?: string
  receiver_session_id?: string
  message?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as MessageBody
    const restaurantId = body.restaurant_id
    const senderId = body.sender_session_id
    const receiverId = body.receiver_session_id
    const message = body.message?.trim()

    if (!restaurantId || !senderId || !receiverId || !message) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }
    if (senderId === receiverId) {
      return NextResponse.json({ error: 'Conversation invalide' }, { status: 400 })
    }
    if (message.length > 1000) {
      return NextResponse.json({ error: 'Message trop long' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { data: sessions, error: sessionsError } = await admin
      .from('client_sessions')
      .select('id, restaurant_id, pseudo, social_mode, is_present, is_remote, entered_at, created_at, last_seen_at')
      .eq('restaurant_id', restaurantId)
      .in('id', [senderId, receiverId])

    if (sessionsError) {
      return NextResponse.json({ error: sessionsError.message }, { status: 500 })
    }

    const sender = sessions?.find(s => s.id === senderId) as ClientSession | undefined
    const receiver = sessions?.find(s => s.id === receiverId) as ClientSession | undefined

    if (!sender?.is_present || sender.restaurant_id !== restaurantId) {
      return NextResponse.json({ error: 'Expéditeur invalide' }, { status: 403 })
    }
    if (!receiver || !isLiveSocialClient(receiver, restaurantId, senderId)) {
      return NextResponse.json({ error: 'Client indisponible' }, { status: 409 })
    }

    const { data: msg, error: messageError } = await admin
      .from('social_messages')
      .insert({
        restaurant_id: restaurantId,
        sender_session_id: senderId,
        receiver_session_id: receiverId,
        message,
        is_anonymous: true,
      })
      .select()
      .single()

    if (messageError || !msg) {
      return NextResponse.json({ error: messageError?.message || 'Message non envoyé' }, { status: 500 })
    }

    await admin.from('notifications').insert({
      restaurant_id: restaurantId,
      session_id: receiverId,
      type: 'message',
      title: sender.pseudo || 'Message',
      body: message.length > 70 ? `${message.slice(0, 70)}...` : message,
      data: { sender_id: senderId, message_id: msg.id },
    })

    return NextResponse.json({ data: msg })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}
