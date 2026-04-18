import { notFound } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase/client'
import NotificationsPage from '@/components/client/NotificationsPage'
import ClientLayout from '@/components/client/ClientLayout'

export default async function NotificationsRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const admin = getSupabaseAdmin()
  const { data: restaurant } = await admin.from('restaurants')
    .select('*').eq('slug', slug).eq('is_active', true).single()
  if (!restaurant) return notFound()
  return (
    <ClientLayout restaurant={restaurant}>
      <NotificationsPage restaurant={restaurant} />
    </ClientLayout>
  )
}