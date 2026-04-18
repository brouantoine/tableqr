'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useSessionStore } from '@/lib/store'
import { formatTimeAgo } from '@/lib/utils'
import type { Notification } from '@/types'

export default function NotificationBell({ primaryColor }: { primaryColor: string }) {
  const { session, notifications, unread_count, addNotification, markAllRead } = useSessionStore()
  const [open, setOpen] = (typeof window !== 'undefined' ? [false, () => {}] : [false, () => {}]) as any

  useEffect(() => {
    if (!session) return
    const channel = supabase.channel(`notifs-${session.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `session_id=eq.${session.id}`
      }, (payload) => addNotification(payload.new as Notification))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [session])

  return (
    <div className="relative">
      <button onClick={() => { setOpen((v: boolean) => !v); if (unread_count > 0) markAllRead() }}
        className="relative p-2 rounded-full bg-gray-100">
        <span className="text-xl">🔔</span>
        {unread_count > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
            {unread_count}
          </span>
        )}
      </button>
    </div>
  )
}
