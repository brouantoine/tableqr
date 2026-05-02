import 'server-only'
import { getSupabaseAdmin } from './supabase/client'
import type { SupportConversation, SupportMessage, SupportSenderType } from '@/types'

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>

export async function getOrCreateSupportConversation(
  admin: SupabaseAdmin,
  restaurantId: string,
  sessionId: string,
  source: 'client' | 'bot' = 'client'
) {
  const { data: existing } = await admin
    .from('support_conversations')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('client_session_id', sessionId)
    .maybeSingle()

  if (existing) return existing as SupportConversation

  const now = new Date().toISOString()
  const { data, error } = await admin
    .from('support_conversations')
    .insert({
      restaurant_id: restaurantId,
      client_session_id: sessionId,
      source,
      status: 'open',
      last_message_at: now,
    })
    .select()
    .single()

  if (error || !data) {
    const { data: retry } = await admin
      .from('support_conversations')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('client_session_id', sessionId)
      .maybeSingle()
    if (retry) return retry as SupportConversation
    throw new Error(error?.message || 'Conversation assistance introuvable')
  }

  return data as SupportConversation
}

export async function addSupportMessage(
  admin: SupabaseAdmin,
  conversation: Pick<SupportConversation, 'id' | 'restaurant_id'>,
  senderType: SupportSenderType,
  message: string,
  senderSessionId?: string | null
) {
  const now = new Date().toISOString()
  const { data, error } = await admin
    .from('support_messages')
    .insert({
      conversation_id: conversation.id,
      restaurant_id: conversation.restaurant_id,
      sender_type: senderType,
      sender_session_id: senderSessionId || null,
      message,
      is_read: false,
    })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message || 'Message assistance non envoyé')

  await admin
    .from('support_conversations')
    .update({
      status: senderType === 'client' ? 'open' : 'pending',
      last_message_at: now,
      updated_at: now,
    })
    .eq('id', conversation.id)

  return data as SupportMessage
}
