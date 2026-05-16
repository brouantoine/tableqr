import { notFound } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase/client'
import MenuPage from '@/components/client/MenuPage'
import ClientLayout from '@/components/client/ClientLayout'

export default async function MenuRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const admin = getSupabaseAdmin()

  const { data: restaurant } = await admin.from('restaurants')
    .select('*').eq('slug', slug).eq('is_active', true).single()
  if (!restaurant) return notFound()

  const categoriesResult = await admin.from('menu_categories')
    .select('*, items:menu_items(*, images:menu_item_images(*))')
    .eq('restaurant_id', restaurant.id)
    .eq('is_active', true)
    .order('position')

  let categories = categoriesResult.data
  if (categoriesResult.error) {
    const fallback = await admin.from('menu_categories')
      .select('*, items:menu_items(*)')
      .eq('restaurant_id', restaurant.id)
      .eq('is_active', true)
      .order('position')
    categories = fallback.data
  }

  return (
    <ClientLayout restaurant={restaurant}>
      <MenuPage restaurant={restaurant} categories={categories || []} />
    </ClientLayout>
  )
}
