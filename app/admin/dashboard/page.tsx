'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getSupabaseAdmin } from '@/lib/supabase/client'
import CaissePage from '@/components/admin/CaissePage'
import AdminShell from '@/components/admin/AdminShell'

export default function AdminDashboard() {
  const [restaurant, setRestaurant] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { window.location.href = '/admin/login'; return }

      const email = session.user.email!.toLowerCase()

      const { data: resto } = await supabase
        .from('restaurants')
        .select('*')
        .eq('admin_email', email)
        .maybeSingle()

      if (!resto) { window.location.href = '/admin/login'; return }

      const { data: ords } = await supabase
        .from('orders')
        .select('*, items:order_items(*), table:restaurant_tables(table_number)')
        .eq('restaurant_id', resto.id)
        .order('created_at', { ascending: false })
        .limit(100)

      setRestaurant(resto)
      setOrders(ords || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-orange-500 animate-spin" />
    </div>
  )

  return (
    <AdminShell restaurantName={restaurant.name} primaryColor={restaurant.primary_color}>
      <CaissePage restaurant={restaurant} initialOrders={orders} />
    </AdminShell>
  )
}
