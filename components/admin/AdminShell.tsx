'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, UtensilsCrossed, QrCode, BarChart3, Settings, Gamepad2, LogOut, ChefHat, Headset } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import PushToggle from './PushToggle'

const NAV = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Caisse' },
  { href: '/admin/assistance', icon: Headset, label: 'Aide' },
  { href: '/admin/menu', icon: UtensilsCrossed, label: 'Menu' },
  { href: '/admin/tables', icon: QrCode, label: 'Tables' },
  { href: '/admin/activites', icon: Gamepad2, label: 'Activités' },
  { href: '/admin/stats', icon: BarChart3, label: 'Stats' },
  { href: '/admin/settings', icon: Settings, label: 'Config' },
]

export default function AdminShell({ children, restaurantName, primaryColor }: {
  children: React.ReactNode
  restaurantName: string
  primaryColor: string
}) {
  const pathname = usePathname()
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/admin/login'; return }
      const email = data.session.user.email?.toLowerCase()
      const { data: resto } = await supabase.from('restaurants').select('slug').eq('admin_email', email).maybeSingle()
      if (resto?.slug === 'superadmin') setIsSuperAdmin(true)
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/admin/login'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm"
            style={{ backgroundColor: primaryColor }}>
            <ChefHat size={16} strokeWidth={2.2} />
          </div>
          <span className="font-black text-sm text-gray-900 truncate max-w-[140px] sm:max-w-none">{restaurantName}</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {isSuperAdmin && (
            <Link href="/superadmin" className="text-xs font-semibold text-gray-400 hover:text-gray-600">
              ← Tous les restos
            </Link>
          )}
          <PushToggle />
          <button onClick={handleLogout}
            className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-red-50 transition-colors">
            <LogOut size={14} className="text-gray-500" />
          </button>
        </div>
      </div>
      <div className="flex-1 pb-20">{children}</div>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-30"
        style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}>
        <div className="flex max-w-lg mx-auto">
          {NAV.map(item => {
            const active = pathname === item.href
            return (
              <Link key={item.href} href={item.href}
                className="flex-1 flex flex-col items-center py-2.5 gap-0.5 relative transition-all">
                <item.icon size={20} strokeWidth={active ? 2.5 : 1.8}
                  style={{ color: active ? primaryColor : '#9CA3AF' }} />
                <span className="text-xs font-medium" style={{ color: active ? primaryColor : '#9CA3AF' }}>
                  {item.label}
                </span>
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                    style={{ backgroundColor: primaryColor }} />
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
