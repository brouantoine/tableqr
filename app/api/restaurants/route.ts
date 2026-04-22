import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/client'

const DEMO_MENU = [
  { name: 'Entrées', name_en: 'Starters', icon: '🥗', position: 1, items: [
    { name: 'Salade fraîche', price: 2500, description: 'Salade de légumes frais de saison' },
    { name: 'Soupe du jour', price: 3000, description: 'Soupe maison préparée chaque matin' },
    { name: 'Alloco', price: 1500, description: 'Banane plantain frite croustillante' },
    { name: 'Beignets de crevettes', price: 4000, description: 'Crevettes marinées en beignet doré' },
  ]},
  { name: 'Plats', name_en: 'Main Dishes', icon: '🍽️', position: 2, items: [
    { name: 'Riz sauce tomate poulet', price: 5500, description: 'Riz parfumé avec poulet mijoté sauce tomate' },
    { name: 'Attiéké poisson braisé', price: 4500, description: 'Attiéké frais avec poisson braisé aux épices' },
    { name: 'Foutou banane sauce graine', price: 5000, description: 'Foutou maison avec sauce graine traditionnelle' },
    { name: 'Poulet grillé & frites', price: 6500, description: 'Demi-poulet grillé accompagné de frites maison' },
    { name: 'Riz jollof', price: 5000, description: 'Riz jollof épicé avec légumes' },
  ]},
  { name: 'Desserts', name_en: 'Desserts', icon: '🍮', position: 3, items: [
    { name: 'Gâteau fondant chocolat', price: 2000, description: 'Fondant au chocolat avec coulant chaud' },
    { name: 'Fruits de saison', price: 1500, description: 'Assortiment de fruits frais tropicaux' },
    { name: 'Glace 2 boules', price: 1500, description: 'Glace vanille ou chocolat, au choix' },
  ]},
  { name: 'Boissons', name_en: 'Drinks', icon: '🥤', position: 4, items: [
    { name: 'Eau minérale', price: 500, description: 'Bouteille 50cl' },
    { name: 'Jus de bissap', price: 1000, description: 'Jus naturel de fleurs d\'hibiscus' },
    { name: 'Jus de gingembre', price: 1000, description: 'Jus artisanal de gingembre frais' },
    { name: 'Bière 33cl', price: 1500, description: 'Bière locale bien fraîche' },
    { name: 'Soft drink', price: 800, description: 'Coca-Cola, Fanta ou Sprite' },
  ]},
]

async function generateDemoMenu(admin: ReturnType<typeof getSupabaseAdmin>, restaurantId: string) {
  for (const cat of DEMO_MENU) {
    const { data: category } = await admin.from('menu_categories').insert({
      restaurant_id: restaurantId,
      name: cat.name, name_en: cat.name_en, icon: cat.icon,
      position: cat.position, is_active: true,
    }).select().single()

    if (category) {
      for (let j = 0; j < cat.items.length; j++) {
        const item = cat.items[j]
        await admin.from('menu_items').insert({
          restaurant_id: restaurantId, category_id: category.id,
          name: item.name, description: item.description, price: item.price,
          position: j + 1, is_available: true, is_vegetarian: false,
          is_vegan: false, is_halal: false, is_spicy: false,
          spicy_level: 0, allergens: [], order_count: 0,
        })
      }
    }
  }
}

const PREVIEW_COLORS = ['#F26522', '#E91E63', '#9C27B0', '#3F51B5', '#2196F3', '#009688', '#4CAF50', '#FF5722']

export async function POST(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin()
    const body = await req.json()

    // ── MODE PREVIEW ──
    if (body.is_preview) {
      if (!body.name) return NextResponse.json({ error: 'Le nom du restaurant est requis' }, { status: 400 })

      const slug = body.name.toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

      const { data: existingSlug } = await admin.from('restaurants').select('id').eq('slug', slug).maybeSingle()
      const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug

      const randomColor = PREVIEW_COLORS[Math.floor(Math.random() * PREVIEW_COLORS.length)]

      const { data, error } = await admin.from('restaurants').insert({
        name: body.name,
        slug: finalSlug,
        city: body.city || null,
        phone: body.phone || null,
        country: body.country || 'CI',
        currency: body.currency || 'XOF',
        primary_color: randomColor,
        secondary_color: '#D4A017',
        accent_color: '#C0392B',
        bot_name: 'Tantie',
        bot_personality: 'chaleureux',
        plan: 'starter',
        is_active: true,
        is_preview: true,
        module_social: true, module_games: true,
        module_delivery: true, module_loyalty: true, module_birthday: true,
        tax_rate: 0,
      }).select().single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      await generateDemoMenu(admin, data.id)

      return NextResponse.json({ data, preview: true })
    }

    // ── MODE NORMAL ──
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!body.email || !emailRegex.test(body.email)) {
      return NextResponse.json({ error: 'Adresse email invalide' }, { status: 400 })
    }

    const email = body.email.toLowerCase().trim()

    const { data: existingSlug } = await admin.from('restaurants').select('id').eq('slug', body.slug).maybeSingle()
    if (existingSlug) return NextResponse.json({ error: 'Ce slug est déjà utilisé' }, { status: 400 })

    const { data: existingEmail } = await admin.from('restaurants').select('id, name').eq('admin_email', email).maybeSingle()
    if (existingEmail) return NextResponse.json({ error: 'Cet email est déjà utilisé pour un autre restaurant' }, { status: 400 })

    const tempPassword = (body.password && body.password.length >= 6)
      ? body.password
      : Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase() + '!'

    const { data: existingUsers } = await admin.auth.admin.listUsers()
    const existingAuthUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email)

    if (existingAuthUser) {
      await admin.auth.admin.updateUserById(existingAuthUser.id, { password: tempPassword, email_confirm: true })
    } else {
      const { error: authError } = await admin.auth.admin.createUser({ email, password: tempPassword, email_confirm: true })
      if (authError) return NextResponse.json({ error: `Erreur Auth: ${authError.message}` }, { status: 500 })
    }

    const { password: _pwd, ...bodyClean } = body
    const { data, error } = await admin
      .from('restaurants')
      .insert({ ...bodyClean, admin_email: email, is_active: true, is_preview: false })
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/login`
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-welcome-email`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, restaurantName: body.name, password: tempPassword, loginUrl })
    }).catch(() => {})

    return NextResponse.json({ data, credentials: { email, password: tempPassword, login_url: loginUrl } })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET() {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.from('restaurants').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
