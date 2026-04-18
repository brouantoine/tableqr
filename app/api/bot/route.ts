import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/client'

export async function POST(req: NextRequest) {
  const { message, restaurant_id } = await req.json()
  if (!message || !restaurant_id) return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })

  const admin = getSupabaseAdmin()

  const { data: items } = await admin.from('menu_items')
    .select('name, description, price, is_vegetarian, is_halal, is_spicy, allergens')
    .eq('restaurant_id', restaurant_id)
    .eq('is_available', true)

  const { data: restaurant } = await admin.from('restaurants')
    .select('name, bot_name, currency')
    .eq('id', restaurant_id)
    .single()

  const menuText = (items || []).map(item =>
    `- ${item.name} (${item.price} ${restaurant?.currency || 'FCFA'})${item.description ? ': ' + item.description : ''}${item.is_halal ? ' [Halal]' : ''}${item.is_vegetarian ? ' [Végétarien]' : ''}${item.is_spicy ? ' [Épicé]' : ''}`
  ).join('\n')

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      max_tokens: 200,
      messages: [
        {
          role: 'system',
          content: `Tu es ${restaurant?.bot_name || 'Tantie'}, l'assistant virtuel chaleureux du restaurant ${restaurant?.name}.
Tu réponds aux questions sur le menu, les plats, les allergènes, les recommandations.
Tu es sympa, en français, et tu donnes des réponses courtes (2-3 phrases max).
Si on te demande quelque chose hors menu, tu recentres gentiment sur la nourriture.

Menu disponible ce soir:
${menuText}`
        },
        { role: 'user', content: message }
      ]
    })
  })

  const data = await response.json()
  const reply = data.choices?.[0]?.message?.content || 'Désolée, je n\'ai pas compris. Pouvez-vous reformuler ?'

  return NextResponse.json({ reply })
}