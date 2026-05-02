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
  const { session } = useSessionStore()
  const [notifCount, setNotifCount] = useState(0)
  const [socialUnreadCount, setSocialUnreadCount] = useState(0)
  const [supportUnreadCount, setSupportUnreadCount] = useState(0)

  useEffect(() => {
    router.prefetch(`/${slug}/menu`)
    router.prefetch(`/${slug}/social`)
    router.prefetch(`/${slug}/games`)
    router.prefetch(`/${slug}/notifications`)
    router.prefetch(`/${slug}/commandes`)
  }, [slug, router])

  useEffect(() => {
    if (!session) {
      const resetTimer = window.setTimeout(() => {
        setNotifCount(0)
        setSocialUnreadCount(0)
        setSupportUnreadCount(0)
      }, 0)
      return () => window.clearTimeout(resetTimer)
    }

    async function loadNotifications() {
      const { count } = await supabase.from('notifications')
        .select('id', { count: 'exact' })
        .eq('session_id', session!.id).eq('is_read', false)
      setNotifCount(count || 0)
    }

    async function loadSocialUnread() {
      const { count } = await supabase.from('social_messages')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', session!.restaurant_id)
        .eq('receiver_session_id', session!.id)
        .eq('is_read', false)
      setSocialUnreadCount(count || 0)
    }

    async function loadSupportUnread() {
      const { data: conv } = await supabase.from('support_conversations')
        .select('id')
        .eq('restaurant_id', session!.restaurant_id)
        .eq('client_session_id', session!.id)
        .maybeSingle()
      if (!conv?.id) { setSupportUnreadCount(0); return }
      const { count } = await supabase.from('support_messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .neq('sender_type', 'client')
        .eq('is_read', false)
      setSupportUnreadCount(count || 0)
    }

    void loadNotifications()
    void loadSocialUnread()
    void loadSupportUnread()

    const notificationsChannel = supabase.channel(`nav-notif-${session.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `session_id=eq.${session.id}` }, loadNotifications)
      .subscribe()

    const messagesChannel = supabase.channel(`nav-social-${session.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_messages', filter: `receiver_session_id=eq.${session.id}` }, loadSocialUnread)
      .subscribe()

    const supportChannel = supabase.channel(`nav-support-${session.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages', filter: `restaurant_id=eq.${session.restaurant_id}` }, loadSupportUnread)
      .subscribe()

    return () => {
      supabase.removeChannel(notificationsChannel)
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(supportChannel)
    }
  }, [session])

  const tabs = [
    { href: `/${slug}/menu`,          label: 'Menu',   badge: 0,            Icon: UtensilsCrossed },
    { href: `/${slug}/social`,         label: 'Social', badge: socialUnreadCount + supportUnreadCount, Icon: MessageCircle },
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
