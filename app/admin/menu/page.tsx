'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import MenuAdminPage from '@/components/admin/MenuAdminPage'
import AdminShell from '@/components/admin/AdminShell'
import type { MenuCategory, Restaurant } from '@/types'

export default function AdminMenuPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { window.location.href = '/admin/login'; return }
      const email = session.user.email!.toLowerCase()
      const { data: resto } = await supabase.from('restaurants').select('*').eq('admin_email', email).maybeSingle()
      if (!resto) { window.location.href = '/admin/login'; return }
      const { data: cats } = await supabase
        .from('menu_categories')
        .select('*, items:menu_items(*)')
        .eq('restaurant_id', resto.id)
        .eq('is_active', true)
        .order('position')
        .order('position', { referencedTable: 'items', ascending: true })
        .order('name', { referencedTable: 'items', ascending: true })
      setRestaurant(resto)
      setCategories(cats || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading || !restaurant) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-t-transparent border-orange-500 animate-spin" /></div>
  return <AdminShell restaurantName={restaurant.name} primaryColor={restaurant.primary_color} restaurantLogoUrl={restaurant.logo_url}><MenuAdminPage restaurant={restaurant} initialCategories={categories} /></AdminShell>
}
