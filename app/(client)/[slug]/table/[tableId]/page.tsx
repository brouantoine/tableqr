import { notFound, redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase/client'

export default async function TableScanPage({ params }: { params: Promise<{ slug: string; tableId: string }> }) {
  const { slug, tableId } = await params
  const admin = getSupabaseAdmin()

  const { data: restaurant } = await admin.from('restaurants')
    .select('id').eq('slug', slug).eq('is_active', true).single()
  if (!restaurant) return notFound()

  const { data: table } = await admin.from('restaurant_tables')
    .select('id').eq('id', tableId).eq('restaurant_id', restaurant.id).single()
  if (!table) return notFound()

  redirect(`/${slug}/menu?table=${tableId}`)
}
