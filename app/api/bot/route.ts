import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/client'
import { addSupportMessage, getOrCreateSupportConversation } from '@/lib/support'

interface BotMessage {
  role: 'user' | 'assistant'
  content: string
}

interface BotBody {
  message?: string
  restaurant_id?: string
  session_id?: string
  history?: BotMessage[]
}

const TRANSFER_RE = /\b(personnel|serveur|serveuse|responsable|manager|humain|quelqu'un|quelqu’un|appelle|appelez|aide|probl[eè]me|plainte|retard|eau|addition|modifier|annuler)\b/i

function menuLine(item: {
  name: string
  description?: string | null
  price: number
  is_vegetarian?: boolean
  is_vegan?: boolean
  is_halal?: boolean
  is_spicy?: boolean
  spicy_level?: number | null
  allergens?: string[] | null
  category?: { name?: string | null } | { name?: string | null }[] | null
}, currency: string) {
  const category = Array.isArray(item.category) ? item.category[0] : item.category
  const tags = [
    item.is_halal ? 'halal' : '',
    item.is_vegetarian ? 'végétarien' : '',
    item.is_vegan ? 'vegan' : '',
    item.is_spicy ? `épicé${item.spicy_level ? ` niveau ${item.spicy_level}` : ''}` : '',
    item.allergens?.length ? `allergènes: ${item.allergens.join(', ')}` : '',
  ].filter(Boolean)

  return `- ${category?.name ? `[${category.name}] ` : ''}${item.name} (${item.price} ${currency})${item.description ? `: ${item.description}` : ''}${tags.length ? ` (${tags.join(', ')})` : ''}`
}

function clipped(text: string, max = 7000) {
  return text.length > max ? text.slice(0, max) + '\n[contexte tronqué]' : text
}

async function transferToSupport(restaurantId: string, sessionId: string, userMessage: string) {
  const admin = getSupabaseAdmin()
  const conversation = await getOrCreateSupportConversation(admin, restaurantId, sessionId, 'bot')

  const { data: previous } = await admin
    .from('support_messages')
    .select('id')
    .eq('conversation_id', conversation.id)
    .eq('sender_type', 'bot')
    .limit(1)

  if (!previous?.length) {
    await addSupportMessage(
      admin,
      conversation,
      'bot',
      'Tantie a transféré cette discussion au personnel du restaurant.',
      null
    )
  }

  await addSupportMessage(admin, conversation, 'client', userMessage, sessionId)
  return conversation
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as BotBody
    const message = body.message?.trim()
    const restaurantId = body.restaurant_id

    if (!message || !restaurantId) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    const { data: restaurant } = await admin
      .from('restaurants')
      .select('id, slug, name, description, address, city, phone, email, currency, bot_name, bot_personality, bot_enabled, bot_context, bot_transfer_enabled')
      .eq('id', restaurantId)
      .maybeSingle()

    if (!restaurant) return NextResponse.json({ error: 'Restaurant introuvable' }, { status: 404 })
    if (restaurant.bot_enabled === false) {
      return NextResponse.json({ error: 'Bot désactivé' }, { status: 403 })
    }

    if (restaurant.bot_transfer_enabled !== false && TRANSFER_RE.test(message)) {
      if (!body.session_id) {
        return NextResponse.json({
          reply: 'Je peux vous mettre en relation avec le personnel après votre identification sur le menu.',
          action: 'need_session',
        })
      }

      const conversation = await transferToSupport(restaurantId, body.session_id, message)
      return NextResponse.json({
        reply: 'Je vous mets en relation avec le personnel du restaurant. Vous pouvez continuer votre demande dans la conversation Assistance.',
        action: 'open_support',
        conversation_id: conversation.id,
      })
    }

    const { data: items } = await admin
      .from('menu_items')
      .select('name, description, price, is_vegetarian, is_vegan, is_halal, is_spicy, spicy_level, allergens, category:menu_categories(name)')
      .eq('restaurant_id', restaurantId)
      .eq('is_available', true)
      .order('position')

    const { data: answers } = await admin
      .from('restaurant_bot_answers')
      .select('category, question, answer, position')
      .eq('restaurant_id', restaurantId)
      .not('answer', 'is', null)
      .order('category')
      .order('position')

    const currency = restaurant.currency || 'XOF'
    const menuText = (items || []).map(item => menuLine(item, currency)).join('\n') || 'Aucun plat disponible dans la base.'
    const answerText = (answers || [])
      .filter(row => row.answer?.trim())
      .map(row => `- [${row.category}] ${row.question}: ${row.answer}`)
      .join('\n')

    const restaurantContext = [
      `Nom: ${restaurant.name}`,
      restaurant.description ? `Description: ${restaurant.description}` : '',
      restaurant.city ? `Ville: ${restaurant.city}` : '',
      restaurant.address ? `Adresse: ${restaurant.address}` : '',
      restaurant.phone ? `Téléphone: ${restaurant.phone}` : '',
      restaurant.email ? `Email: ${restaurant.email}` : '',
      restaurant.bot_context ? `Contexte admin: ${restaurant.bot_context}` : '',
      answerText ? `Questionnaire admin:\n${answerText}` : '',
      `Menu actuel:\n${menuText}`,
    ].filter(Boolean).join('\n')

    const apiKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY || process.env.XAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Clé IA manquante' }, { status: 500 })
    }

    const endpoint = process.env.XAI_API_KEY && !process.env.GROQ_API_KEY
      ? 'https://api.x.ai/v1/chat/completions'
      : 'https://api.groq.com/openai/v1/chat/completions'

    const model = process.env.GROQ_MODEL || (endpoint.includes('x.ai') ? 'grok-3-mini' : 'llama-3.1-8b-instant')
    const history = (body.history || []).slice(-6).filter(m => m.content?.trim())

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 260,
        messages: [
          {
            role: 'system',
            content: clipped(`Tu es ${restaurant.bot_name || 'Tantie'}, l'assistant virtuel du restaurant ${restaurant.name}.
Tu réponds uniquement sur ce restaurant, son menu, ses plats, ses contacts, ses services et ses informations pratiques.
Tu réponds en français, avec un ton ${restaurant.bot_personality || 'chaleureux'}, en 2 à 4 phrases maximum.
N'invente jamais un plat, un prix, un contact, un horaire ou une information absente du contexte.
Si l'information manque, dis clairement que tu n'es pas sûre et propose de demander au personnel.
Pour les allergies, conseille toujours de confirmer auprès du personnel.
Si le client veut parler à un humain, au personnel, au serveur, ou signale un problème, dis-lui que tu peux le transférer.

CONTEXTE STRICT:
${restaurantContext}`)
          },
          ...history,
          { role: 'user', content: message },
        ],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return NextResponse.json({ error: errText || 'Erreur IA' }, { status: 502 })
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content || 'Je ne suis pas sûre. Demandez au personnel du restaurant.'

    return NextResponse.json({ reply })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}
