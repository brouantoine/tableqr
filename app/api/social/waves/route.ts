import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/client'
import { isLiveSocialClient } from '@/lib/social/presence'
import type { ClientSession, SocialWave } from '@/types'

interface WaveBody {
  restaurant_id?: string
  sender_session_id?: string
  receiver_session_id?: string
}

const MUTUAL_WINDOW_MS = 60_000
const RATE_LIMIT_MS = 8_000

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as WaveBody
    const restaurantId = body.restaurant_id
    const senderId = body.sender_session_id
    const receiverId = body.receiver_session_id

    if (!restaurantId || !senderId || !receiverId) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }
    if (senderId === receiverId) {
      return NextResponse.json({ error: 'Coucou invalide' }, { status: 400 })
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
    const { data: recent } = await admin
      .from('social_waves')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('sender_session_id', senderId)
      .eq('receiver_session_id', receiverId)
      .gte('created_at', rateCutoff)
      .limit(1)

    if (recent && recent.length > 0) {
      return NextResponse.json({ error: 'Trop rapide' }, { status: 429 })
    }

    const mutualCutoff = new Date(Date.now() - MUTUAL_WINDOW_MS).toISOString()
    const { data: pending } = await admin
      .from('social_waves')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('sender_session_id', receiverId)
      .eq('receiver_session_id', senderId)
      .eq('is_mutual', false)
      .gte('created_at', mutualCutoff)
      .order('created_at', { ascending: false })
      .limit(1)

    const mutual = (pending?.length ?? 0) > 0

    const { data: wave, error: waveError } = await admin
      .from('social_waves')
      .insert({
        restaurant_id: restaurantId,
        sender_session_id: senderId,
        receiver_session_id: receiverId,
        is_mutual: mutual,
      })
      .select()
      .single()

    if (waveError || !wave) {
      return NextResponse.json({ error: waveError?.message || 'Coucou non envoyé' }, { status: 500 })
    }

    if (mutual && pending?.[0]?.id) {
      await admin
        .from('social_waves')
        .update({ is_mutual: true })
        .eq('id', pending[0].id)
    }

    return NextResponse.json({ data: wave as SocialWave, mutual })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}
