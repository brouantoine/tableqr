import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useSessionStore } from '@/lib/store'
import { getPresenceStamp, SOCIAL_PRESENCE_HEARTBEAT_MS } from '@/lib/social/presence'
import type { ClientSession } from '@/types'

export function useClientPresence(restaurantId: string) {
  const session = useSessionStore(s => s.session)
  const setSession = useSessionStore(s => s.setSession)
  const sessionRef = useRef<ClientSession | null>(session)
  const sessionId = session?.id
  const sessionRestaurantId = session?.restaurant_id

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    if (!sessionId || sessionRestaurantId !== restaurantId) return

    let stopped = false

    async function touch() {
      const current = sessionRef.current
      if (!current?.id || current.restaurant_id !== restaurantId) return

      const now = getPresenceStamp()
      const update = { is_present: true, left_at: null, last_seen_at: now }

      const { error } = await supabase
        .from('client_sessions')
        .update(update)
        .eq('id', current.id)
        .eq('restaurant_id', restaurantId)

      if (!error && !stopped) {
        setSession({ ...current, ...update })
      }
    }

    void touch()

    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') void touch()
    }, SOCIAL_PRESENCE_HEARTBEAT_MS)

    const handleVisible = () => {
      if (document.visibilityState === 'visible') void touch()
    }
    const handleOnline = () => void touch()

    document.addEventListener('visibilitychange', handleVisible)
    window.addEventListener('focus', handleOnline)
    window.addEventListener('online', handleOnline)

    return () => {
      stopped = true
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisible)
      window.removeEventListener('focus', handleOnline)
      window.removeEventListener('online', handleOnline)
    }
  }, [restaurantId, sessionId, sessionRestaurantId, setSession])
}
