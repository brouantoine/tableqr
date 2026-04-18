'use client'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSessionStore } from '@/lib/store'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function BottomNav({ slug, primaryColor }: { slug: string; primaryColor: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const { unread_count, session } = useSessionStore()
  const [notifCount, setNotifCount] = useState(0)

  // Prefetch toutes les pages au montage pour navigation instantanée
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
    {
      href: `/${slug}/menu`,
      label: 'Menu',
      badge: 0,
      svg: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? primaryColor : '#9CA3AF'} strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      ),
    },
    {
      href: `/${slug}/social`,
      label: 'Social',
      badge: unread_count,
      svg: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? primaryColor : '#9CA3AF'} strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <circle cx="9" cy="10" r="1" fill={active ? primaryColor : '#9CA3AF'} stroke="none" />
          <circle cx="12" cy="10" r="1" fill={active ? primaryColor : '#9CA3AF'} stroke="none" />
          <circle cx="15" cy="10" r="1" fill={active ? primaryColor : '#9CA3AF'} stroke="none" />
        </svg>
      ),
    },
    {
      href: `/${slug}/games`,
      label: 'Jeux',
      badge: 0,
      svg: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? primaryColor : '#9CA3AF'} strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="6" width="20" height="12" rx="4" />
          <path d="M6 12h4M8 10v4" />
          <circle cx="15" cy="11" r="1" fill={active ? primaryColor : '#9CA3AF'} stroke="none" />
          <circle cx="17" cy="13" r="1" fill={active ? primaryColor : '#9CA3AF'} stroke="none" />
        </svg>
      ),
    },
    {
      href: `/${slug}/notifications`,
      label: 'Alertes',
      badge: notifCount,
      svg: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? primaryColor : '#9CA3AF'} strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 z-40"
      style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}>
      <div className="flex">
        {tabs.map(tab => {
          const active = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch={true}
              className="flex-1 flex flex-col items-center py-2.5 relative transition-all active:opacity-70">
              <div className="relative">
                {tab.svg(active)}
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