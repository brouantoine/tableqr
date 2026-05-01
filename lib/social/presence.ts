import type { ClientSession } from '@/types'

export const SOCIAL_PRESENCE_HEARTBEAT_MS = 45 * 1000
export const SOCIAL_PRESENCE_STALE_MS = 5 * 60 * 1000

type PresenceClient = Pick<
  ClientSession,
  'id' | 'restaurant_id' | 'social_mode' | 'is_present' | 'is_remote' | 'entered_at' | 'created_at' | 'last_seen_at'
>

export function getPresenceCutoffIso(now = new Date()) {
  return new Date(now.getTime() - SOCIAL_PRESENCE_STALE_MS).toISOString()
}

export function getPresenceStamp() {
  return new Date().toISOString()
}

export function isLiveSocialClient(client: PresenceClient, restaurantId: string, excludedSessionId?: string) {
  if (excludedSessionId && client.id === excludedSessionId) return false
  if (client.restaurant_id !== restaurantId) return false
  if (!client.is_present || client.is_remote || client.social_mode === 'invisible') return false

  const seenAt = client.last_seen_at || client.entered_at || client.created_at
  return seenAt ? new Date(seenAt).getTime() >= Date.now() - SOCIAL_PRESENCE_STALE_MS : true
}
