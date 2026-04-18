'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import StatsPage from '@/components/admin/StatsPage'
import AdminShell from '@/components/admin/AdminShell'

export default function AdminStatsPage() {
  const [restaurant, setRestaurant] = useState<any>(null)
  const [data, setData] = useState<any>({ orders: [], sessions: [], messages: [], matches: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { window.location.href = '/admin/login'; return }
      const email = session.user.email!.toLowerCase()
      const { data: resto } = await supabase.from('restaurants').select('*').eq('admin_email', email).maybeSingle()
      if (!resto) { window.location.href = '/admin/login'; return }
      const [orders, sessions, messages, matches] = await Promise.all([
        supabase.from('orders').select('*, items:order_items(*)').eq('restaurant_id', resto.id).order('created_at', { ascending: false }),
        supabase.from('client_sessions').select('id, profile_type, gender, created_at, is_present').eq('restaurant_id', resto.id),
        supabase.from('social_messages').select('id, created_at').eq('restaurant_id', resto.id),
        supabase.from('matches').select('id, is_matched, created_at').eq('restaurant_id', resto.id),
      ])
      setRestaurant(resto)
      setData({ orders: orders.data || [], sessions: sessions.data || [], messages: messages.data || [], matches: matches.data || [] })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-t-transparent border-orange-500 animate-spin" /></div>
  return <AdminShell restaurantName={restaurant.name} primaryColor={restaurant.primary_color}><StatsPage restaurant={restaurant} {...data} /></AdminShell>
}
