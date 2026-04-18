import { useEffect, useCallback } from 'react'


export function useRealtimeRefresh(
  onRefresh: () => void | Promise<void>,
  intervalMs = 30000
) {
  const refresh = useCallback(async () => {
    try { await onRefresh() } catch {}
  }, [onRefresh])

  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', refresh)
    window.addEventListener('online', refresh)
    const interval = setInterval(refresh, intervalMs)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('online', refresh)
      clearInterval(interval)
    }
  }, [refresh, intervalMs])
}

