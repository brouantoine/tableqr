import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/client'
import { getOrCreateSupportConversation } from '@/lib/support'

interface ConversationBody {
  restaurant_id?: string
  session_id?: string
  source?: 'client' | 'bot'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as ConversationBody
    const restaurantId = body.restaurant_id
    const sessionId = body.session_id

    if (!restaurantId || !sessionId) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { data: session } = await admin
      .from('client_sessions')
      .select('id, restaurant_id, is_present')
      .eq('id', sessionId)
      .eq('restaurant_id', restaurantId)
      .maybeSingle()

    if (!session) return NextResponse.json({ error: 'Session client introuvable' }, { status: 404 })

    const conversation = await getOrCreateSupportConversation(
      admin,
      restaurantId,
      sessionId,
      body.source === 'bot' ? 'bot' : 'client'
    )

    return NextResponse.json({ data: conversation })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}
