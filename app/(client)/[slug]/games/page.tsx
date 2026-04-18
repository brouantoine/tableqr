import { notFound } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase/client'
import GamesPage from '@/components/client/GamesPage'
import ClientLayout from '@/components/client/ClientLayout'

export default async function GamesRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const admin = getSupabaseAdmin()
  const { data: restaurant } = await admin.from('restaurants')
    .select('*').eq('slug', slug).eq('is_active', true).single()
  if (!restaurant) return notFound()

  return (
    <ClientLayout restaurant={restaurant}>
      <GamesPage restaurant={restaurant} />
    </ClientLayout>
  )
}
