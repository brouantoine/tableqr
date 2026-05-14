import { notFound } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase/client'
import ClientLayout from '@/components/client/ClientLayout'
import UnavailableFeaturePage from '@/components/client/UnavailableFeaturePage'

export default async function GameUnavailableRoute({
  params,
}: {
  params: Promise<{ slug: string; game: string }>
}) {
  const { slug } = await params
  const admin = getSupabaseAdmin()
  const { data: restaurant } = await admin.from('restaurants')
    .select('*').eq('slug', slug).eq('is_active', true).single()
  if (!restaurant) return notFound()

  return (
    <ClientLayout restaurant={restaurant}>
      <UnavailableFeaturePage restaurant={restaurant} />
    </ClientLayout>
  )
}
