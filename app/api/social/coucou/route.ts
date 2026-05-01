import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/client'
import { isLiveSocialClient } from '@/lib/social/presence'
import type { ClientSession, SocialMessage } from '@/types'

interface CoucouBody {
  restaurant_id?: string
  sender_session_id?: string
  receiver_session_id?: string
}

const RATE_LIMIT_MS = 8_000

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as CoucouBody
    const restaurantId = body.restaurant_id
    const senderId = body.sender_session_id
    const receiverId = body.receiver_session_id

    if (!restaurantId || !senderId || !receiverId) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }
    if (senderId === receiverId) {
      return NextResponse.json({ error: 'Conversation invalide' }, { status: 400 })
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

    const rateCutoff = new Date(Date.now() - RATE_LIMIT_MS).toISOString()
    const { data: recentMessage } = await admin
      .from('social_messages')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('sender_session_id', senderId)
      .eq('receiver_session_id', receiverId)
      .eq('trigger_type', 'coucou')
      .gte('created_at', rateCutoff)
      .order('created_at', { ascending: false })
      .limit(1)

    if (recentMessage && recentMessage.length > 0) {
      return NextResponse.json({ error: 'Trop rapide' }, { status: 429 })
    }

    const { data: msg, error: messageError } = await admin
      .from('social_messages')
      .insert({
        restaurant_id: restaurantId,
        sender_session_id: senderId,
        receiver_session_id: receiverId,
        message: 'Coucou',
        is_anonymous: true,
        trigger_type: 'coucou',
      })
      .select()
      .single()

    if (messageError || !msg) {
      return NextResponse.json({ error: messageError?.message || 'Coucou non envoyé' }, { status: 500 })
    }

    return NextResponse.json({ data: msg as SocialMessage })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}
