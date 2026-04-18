'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import ActivitesPage from '@/components/admin/ActivitesPage'
import AdminShell from '@/components/admin/AdminShell'

export default function AdminActivitesPage() {
  const [restaurant, setRestaurant] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { window.location.href = '/admin/login'; return }
      const email = session.user.email!.toLowerCase()
      const { data: resto } = await supabase.from('restaurants').select('*').eq('admin_email', email).maybeSingle()
      if (!resto) { window.location.href = '/admin/login'; return }
      setRestaurant(resto)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-t-transparent border-orange-500 animate-spin" /></div>
  return <AdminShell restaurantName={restaurant.name} primaryColor={restaurant.primary_color}><ActivitesPage restaurant={restaurant} /></AdminShell>
}
