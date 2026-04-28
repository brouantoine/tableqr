import { getSupabaseAdmin } from '@/lib/supabase/client'
import SuperAdminDashboard from '@/components/superadmin/SuperAdminDashboard'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SuperAdminPage() {
  const admin = getSupabaseAdmin()

  const { data: restaurants } = await admin
    .from('restaurants')
    .select('*')
    .order('created_at', { ascending: false })

  return <SuperAdminDashboard restaurants={restaurants || []} />
}
