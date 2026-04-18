import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/client'

export async function POST(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin()
    const body = await req.json()

    // Validation email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!body.email || !emailRegex.test(body.email)) {
      return NextResponse.json({ error: 'Adresse email invalide' }, { status: 400 })
    }

    // Normaliser email en minuscules
    const email = body.email.toLowerCase().trim()

    // Vérifier que le slug est unique
    const { data: existingSlug } = await admin
      .from('restaurants').select('id').eq('slug', body.slug).maybeSingle()
    if (existingSlug) {
      return NextResponse.json({ error: 'Ce slug est déjà utilisé' }, { status: 400 })
    }

    // Vérifier que l'email n'est pas déjà utilisé pour un autre restaurant
    const { data: existingEmail } = await admin
      .from('restaurants').select('id, name').eq('admin_email', email).maybeSingle()
    if (existingEmail) {
      return NextResponse.json({ error: `Cet email est déjà utilisé pour un autre restaurant` }, { status: 400 })
    }

    // Mot de passe — utiliser celui saisi ou en générer un
    const tempPassword = (body.password && body.password.length >= 6)
      ? body.password
      : Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase() + '!'

    // Vérifier si le compte Auth existe déjà
    const { data: existingUsers } = await admin.auth.admin.listUsers()
    const existingAuthUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email)

    if (existingAuthUser) {
      // Mettre à jour le mot de passe si l'user existe déjà
      await admin.auth.admin.updateUserById(existingAuthUser.id, {
        password: tempPassword,
        email_confirm: true,
      })
    } else {
      // Créer le compte Auth
      const { error: authError } = await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
      })
      if (authError) {
        return NextResponse.json({ error: `Erreur Auth: ${authError.message}` }, { status: 500 })
      }
    }

    // Créer le restaurant — retirer les champs non DB
    const { password: _pwd, ...bodyClean } = body
    const { data, error } = await admin
      .from('restaurants')
      .insert({ ...bodyClean, admin_email: email, is_active: true })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Email de bienvenue — non bloquant
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/login`
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-welcome-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, restaurantName: body.name, password: tempPassword, loginUrl })
    }).catch(() => {})

    return NextResponse.json({
      data,
      credentials: { email, password: tempPassword, login_url: loginUrl }
    })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET() {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('restaurants').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
