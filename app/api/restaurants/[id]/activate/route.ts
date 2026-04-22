import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/client'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = getSupabaseAdmin()
    const { id } = await params
    const body = await req.json()
    const { email, password } = body

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Mot de passe trop court (min. 6 caractères)' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const { data: restaurant } = await admin.from('restaurants').select('id, name, is_preview').eq('id', id).maybeSingle()
    if (!restaurant) return NextResponse.json({ error: 'Restaurant introuvable' }, { status: 404 })
    if (!restaurant.is_preview) return NextResponse.json({ error: 'Ce restaurant n\'est pas en mode preview' }, { status: 400 })

    const { data: existingEmail } = await admin.from('restaurants').select('id').eq('admin_email', normalizedEmail).maybeSingle()
    if (existingEmail && existingEmail.id !== id) {
      return NextResponse.json({ error: 'Cet email est déjà utilisé pour un autre restaurant' }, { status: 400 })
    }

    const { data: existingUsers } = await admin.auth.admin.listUsers()
    const existingAuthUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === normalizedEmail)

    if (existingAuthUser) {
      await admin.auth.admin.updateUserById(existingAuthUser.id, { password, email_confirm: true })
    } else {
      const { error: authError } = await admin.auth.admin.createUser({
        email: normalizedEmail, password, email_confirm: true,
      })
      if (authError) return NextResponse.json({ error: `Erreur Auth: ${authError.message}` }, { status: 500 })
    }

    const { error: updateError } = await admin
      .from('restaurants')
      .update({ is_preview: false, admin_email: normalizedEmail })
      .eq('id', id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/login`
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-welcome-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, restaurantName: restaurant.name, password, loginUrl })
    }).catch(() => {})

    return NextResponse.json({ credentials: { email: normalizedEmail, password, login_url: loginUrl } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
