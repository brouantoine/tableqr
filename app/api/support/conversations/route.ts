import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/client'
import { getOrCreateSupportConversation } from '@/lib/support'

interface ConversationBody {
  restaurant_id?: string
  session_id?: string
  source?: 'client' | 'bot'
}

interface StatusBody {
  conversation_id?: string
  status?: 'open' | 'pending' | 'resolved'
}

export async function GET(req: NextRequest) {
  try {
    const restaurantId = req.nextUrl.searchParams.get('restaurant_id')
    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id requis' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('support_conversations')
      .select('*, session:client_sessions(id, pseudo, avatar_icon, table:restaurant_tables(table_number))')
      .eq('restaurant_id', restaurantId)
      .order('last_message_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data || [] })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
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

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as StatusBody
    if (!body.conversation_id || !body.status) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }
    if (!['open', 'pending', 'resolved'].includes(body.status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('support_conversations')
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq('id', body.conversation_id)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}
