import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseAdmin } from './supabase/client'
import { redirect } from 'next/navigation'

export async function getAdminRestaurant() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect('/admin/login')

  const email = user.email.toLowerCase()
  const admin = getSupabaseAdmin()

  const { data: restaurant } = await admin
    .from('restaurants')
    .select('*')
    .eq('admin_email', email)
    .maybeSingle()

  if (!restaurant) redirect('/admin/login')
  return restaurant
}
