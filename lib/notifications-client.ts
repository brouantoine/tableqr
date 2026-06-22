let cleanupPromise: Promise<void> | null = null
let lastCleanupAt = 0

const CLEANUP_THROTTLE_MS = 5 * 60 * 1000

export async function ensureNotificationCleanup() {
  if (typeof window === 'undefined') return

  const now = Date.now()
  if (cleanupPromise) return cleanupPromise
  if (now - lastCleanupAt < CLEANUP_THROTTLE_MS) return

  cleanupPromise = fetch('/api/notifications/cleanup', {
    method: 'POST',
    cache: 'no-store',
  })
    .then(() => {
      lastCleanupAt = Date.now()
    })
    .catch((error) => {
      console.warn('Notification cleanup request failed', error)
    })
    .finally(() => {
      cleanupPromise = null
    })

  return cleanupPromise
}
