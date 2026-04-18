import { notFound } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase/client'
import SocialPage from '@/components/client/SocialPage'
import ClientLayout from '@/components/client/ClientLayout'

export default async function SocialRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const admin = getSupabaseAdmin()
  const { data: restaurant } = await admin.from('restaurants')
    .select('*').eq('slug', slug).eq('is_active', true).single()
  if (!restaurant) return notFound()

  return (
    <ClientLayout restaurant={restaurant}>
      <SocialPage restaurant={restaurant} />
    </ClientLayout>
  )
}
