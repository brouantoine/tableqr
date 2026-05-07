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

const SOCIAL_ATTACHMENTS_BUCKET = 'social-attachments'
const MAX_IMAGE_SIZE = 6 * 1024 * 1024
const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

type ParsedMessageRequest = MessageBody & {
  attachment?: File
}

type SocialMessageInsert = {
  restaurant_id: string
  sender_session_id: string
  receiver_session_id: string
  message: string
  is_anonymous: boolean
  attachment_url?: string | null
  attachment_type?: string | null
  attachment_name?: string | null
  attachment_size?: number | null
}

function getFormValue(form: FormData, key: keyof MessageBody) {
  const value = form.get(key)
  return typeof value === 'string' ? value : undefined
}

async function parseMessageRequest(req: NextRequest): Promise<ParsedMessageRequest> {
  const contentType = req.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData()
    const attachment = form.get('attachment')

    return {
      restaurant_id: getFormValue(form, 'restaurant_id'),
      sender_session_id: getFormValue(form, 'sender_session_id'),
      receiver_session_id: getFormValue(form, 'receiver_session_id'),
      message: getFormValue(form, 'message'),
      attachment: attachment instanceof File && attachment.size > 0 ? attachment : undefined,
    }
  }

  return await req.json() as MessageBody
}

function safeAttachmentName(file: File) {
  const extension = IMAGE_EXTENSIONS[file.type] || 'jpg'
  const base = file.name
    ? file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
    : 'photo'
  return `${base || 'photo'}.${extension}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await parseMessageRequest(req)
    const restaurantId = body.restaurant_id
    const senderId = body.sender_session_id
    const receiverId = body.receiver_session_id
    const message = body.message?.trim() || ''
    const attachment = body.attachment

    if (!restaurantId || !senderId || !receiverId || (!message && !attachment)) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }
    if (senderId === receiverId) {
      return NextResponse.json({ error: 'Conversation invalide' }, { status: 400 })
    }
    if (message.length > 1000) {
      return NextResponse.json({ error: 'Message trop long' }, { status: 400 })
    }
    if (attachment && !IMAGE_EXTENSIONS[attachment.type]) {
      return NextResponse.json({ error: 'Format image invalide' }, { status: 400 })
    }
    if (attachment && attachment.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'Photo trop lourde' }, { status: 413 })
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

    let attachmentUrl: string | null = null
    let attachmentType: string | null = null
    let attachmentName: string | null = null
    let attachmentSize: number | null = null

    if (attachment) {
      attachmentName = safeAttachmentName(attachment)
      attachmentType = attachment.type
      attachmentSize = attachment.size
      const path = `${restaurantId}/${senderId}/${Date.now()}-${crypto.randomUUID()}-${attachmentName}`
      const bytes = await attachment.arrayBuffer()
      const { error: uploadError } = await admin.storage
        .from(SOCIAL_ATTACHMENTS_BUCKET)
        .upload(path, bytes, {
          contentType: attachment.type,
          upsert: false,
        })

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 })
      }

      const { data: publicData } = admin.storage
        .from(SOCIAL_ATTACHMENTS_BUCKET)
        .getPublicUrl(path)

      attachmentUrl = publicData.publicUrl
    }

    const insertPayload: SocialMessageInsert = {
      restaurant_id: restaurantId,
      sender_session_id: senderId,
      receiver_session_id: receiverId,
      message,
      is_anonymous: true,
    }

    if (attachmentUrl) {
      insertPayload.attachment_url = attachmentUrl
      insertPayload.attachment_type = attachmentType
      insertPayload.attachment_name = attachmentName
      insertPayload.attachment_size = attachmentSize
    }

    const { data: msg, error: messageError } = await admin
      .from('social_messages')
      .insert(insertPayload)
      .select()
      .single()

    if (messageError || !msg) {
      return NextResponse.json({ error: messageError?.message || 'Message non envoyé' }, { status: 500 })
    }

    return NextResponse.json({ data: msg })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}
