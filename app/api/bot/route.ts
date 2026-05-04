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

function cleanEnv(value?: string) {
  if (!value) return undefined

  let out = value.trim().replace(/^['"]|['"]$/g, '').trim()
  const embeddedGroqKey = out.match(/\b(gsk[_-][A-Za-z0-9_-]{8,})\b/i)
  if (embeddedGroqKey?.[1]) return embeddedGroqKey[1]

  const embeddedXaiKey = out.match(/\b(xai[_-][A-Za-z0-9_-]{8,})\b/i)
  if (embeddedXaiKey?.[1]) return embeddedXaiKey[1]

  out = out.replace(/^export\s+/i, '').trim()
  out = out.replace(/^Bearer\s+/i, '').trim()
  out = out.replace(/^(GROQ_API_KEY|GROK_API_KEY|XAI_API_KEY)\s*=\s*/i, '').trim()
  out = out.replace(/^['"]|['"]$/g, '').trim()
  return out || undefined
}

function cleanModel(value: string | undefined, fallback: string) {
  return cleanEnv(value) || fallback
}

function maskSecret(value?: string) {
  if (!value) return 'missing'
  if (value.length <= 10) return `${value.slice(0, 2)}...(${value.length})`
  return `${value.slice(0, 4)}...${value.slice(-4)} (${value.length})`
}

function providerErrorMessage(provider: string, errText: string) {
  let code = ''
  let message = errText

  try {
    const parsed = JSON.parse(errText) as { error?: { message?: string; code?: string } | string }
    if (typeof parsed.error === 'string') {
      message = parsed.error
    } else {
      message = parsed.error?.message || message
      code = parsed.error?.code || ''
    }
  } catch {
    // Provider returned plain text.
  }

  const lower = `${code} ${message}`.toLowerCase()
  if (lower.includes('invalid_api_key') || lower.includes('invalid api key') || lower.includes('incorrect api key')) {
    return {
      error: provider === 'Groq'
        ? 'Clé Groq invalide. La route reçoit bien GROQ_API_KEY, mais Groq la refuse.'
        : 'Clé xAI/Grok invalide. La route reçoit une clé, mais xAI la refuse.',
      code: code || 'invalid_api_key',
      hint: provider === 'Groq'
        ? 'Dans Vercel, garde GROQ_API_KEY uniquement avec la clé brute gsk_..., sans Bearer, sans GROQ_API_KEY=, sans guillemets. Puis redéploie.'
        : 'Dans Vercel, garde XAI_API_KEY uniquement avec la clé brute xai_... et redéploie.',
    }
  }

  return {
    error: message || 'Erreur IA',
    code: code || undefined,
    hint: provider === 'Groq'
      ? 'Vérifie GROQ_API_KEY et GROQ_MODEL dans les variables Production Vercel.'
      : 'Vérifie XAI_API_KEY et XAI_MODEL dans les variables Production Vercel.',
  }
}

function pickAiProvider() {
  const requested = (cleanEnv(process.env.AI_PROVIDER) || cleanEnv(process.env.LLM_PROVIDER) || '').toLowerCase()
  const rawXaiKey = cleanEnv(process.env.XAI_API_KEY) || cleanEnv(process.env.GROK_API_KEY)
  const xaiKeyLooksLikeGroq = Boolean(rawXaiKey?.startsWith('gsk_') || rawXaiKey?.startsWith('gsk-') || rawXaiKey?.startsWith('gs'))
  const xaiKey = xaiKeyLooksLikeGroq ? undefined : rawXaiKey
  const groqKey = cleanEnv(process.env.GROQ_API_KEY)
  const groqKeyLooksLikeXai = Boolean(groqKey?.startsWith('xai-') || groqKey?.startsWith('xai_'))

  // Si GROQ_API_KEY est renseignée, elle gagne. On évite toute heuristique fragile
  // sur le préfixe, car certains environnements masquent/formatent la clé.
  if (groqKey && !groqKeyLooksLikeXai) {
    return {
      provider: 'Groq',
      apiKey: groqKey,
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      model: cleanModel(process.env.GROQ_MODEL, 'llama-3.1-8b-instant'),
    }
  }

  if (requested === 'xai' || requested === 'grok') {
    const apiKey = xaiKey || (groqKeyLooksLikeXai ? groqKey : undefined)
    if (!apiKey) return null
    return {
      provider: 'xAI/Grok',
      apiKey,
      endpoint: 'https://api.x.ai/v1/chat/completions',
      model: cleanModel(process.env.XAI_MODEL || process.env.GROK_MODEL, 'grok-4-fast-non-reasoning'),
    }
  }

  if (requested === 'groq') {
    const apiKey = groqKey || (xaiKeyLooksLikeGroq ? rawXaiKey : undefined)
    if (!apiKey) return null
    return {
      provider: 'Groq',
      apiKey,
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      model: cleanModel(process.env.GROQ_MODEL, 'llama-3.1-8b-instant'),
    }
  }

  if (xaiKey || groqKeyLooksLikeXai) {
    return {
      provider: 'xAI/Grok',
      apiKey: xaiKey || groqKey!,
      endpoint: 'https://api.x.ai/v1/chat/completions',
      model: cleanModel(process.env.XAI_MODEL || process.env.GROK_MODEL, 'grok-4-fast-non-reasoning'),
    }
  }

  return null
}

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

    const ai = pickAiProvider()
    if (!ai) {
      return NextResponse.json({
        error: 'Clé IA manquante ou incompatible',
        hint: 'Pour Grok/xAI: mets AI_PROVIDER=xai avec XAI_API_KEY. Pour Groq: mets AI_PROVIDER=groq avec GROQ_API_KEY.',
      }, { status: 500 })
    }
    const history = (body.history || []).slice(-6).filter(m => m.content?.trim())

    const response = await fetch(ai.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ai.apiKey}`,
        ...(body.session_id && ai.provider === 'xAI/Grok' ? { 'x-grok-conv-id': body.session_id } : {}),
      },
      body: JSON.stringify({
        model: ai.model,
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
      const formatted = providerErrorMessage(ai.provider, errText)
      console.error('[bot] AI provider error', {
        provider: ai.provider,
        model: ai.model,
        status: response.status,
        code: formatted.code,
        message: formatted.error,
        key: maskSecret(ai.apiKey),
      })
      return NextResponse.json({
        error: formatted.error,
        provider: ai.provider,
        model: ai.model,
        code: formatted.code,
        hint: formatted.hint,
      }, { status: 502 })
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content || 'Je ne suis pas sûre. Demandez au personnel du restaurant.'

    return NextResponse.json({ reply })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}
