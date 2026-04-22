'use client'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { UtensilsCrossed, MessageCircle, Gamepad2, Bell } from 'lucide-react'
import { useSessionStore } from '@/lib/store'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function BottomNav({ slug, primaryColor }: { slug: string; primaryColor: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const { unread_count, session } = useSessionStore()
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => {
    router.prefetch(`/${slug}/menu`)
    router.prefetch(`/${slug}/social`)
    router.prefetch(`/${slug}/games`)
    router.prefetch(`/${slug}/notifications`)
    router.prefetch(`/${slug}/commandes`)
  }, [slug, router])

  useEffect(() => {
    if (!session) return
    async function load() {
      const { count } = await supabase.from('notifications')
        .select('id', { count: 'exact' })
        .eq('session_id', session!.id).eq('is_read', false)
      setNotifCount(count || 0)
    }
    load()
    const channel = supabase.channel(`nav-${session.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `session_id=eq.${session.id}` }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [session])

  const tabs = [
    { href: `/${slug}/menu`,          label: 'Menu',   badge: 0,            Icon: UtensilsCrossed },
    { href: `/${slug}/social`,         label: 'Social', badge: unread_count, Icon: MessageCircle },
    { href: `/${slug}/games`,          label: 'Jeux',   badge: 0,            Icon: Gamepad2 },
    { href: `/${slug}/notifications`,  label: 'Alertes',badge: notifCount,   Icon: Bell },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 z-40"
      style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}>
      <div className="flex">
        {tabs.map(tab => {
          const active = pathname.startsWith(tab.href)
          return (
            <Link key={tab.href} href={tab.href} prefetch={true}
              className="flex-1 flex flex-col items-center py-2.5 relative transition-all active:opacity-70">
              <div className="relative">
                <tab.Icon
                  size={22}
                  color={active ? primaryColor : '#9CA3AF'}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                {tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-black rounded-full flex items-center justify-center"
                    style={{ fontSize: '8px', minWidth: '14px', height: '14px', padding: '0 3px' }}>
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1 font-medium transition-colors"
                style={{ color: active ? primaryColor : '#9CA3AF' }}>
                {tab.label}
              </span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                  style={{ backgroundColor: primaryColor }} />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
