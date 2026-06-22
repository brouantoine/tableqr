import type { SupabaseClient } from '@supabase/supabase-js'
import { getNotificationRetentionCutoffIso } from '@/lib/notifications'

type SupabaseLike = Pick<SupabaseClient<any, any, any>, 'from'>

export async function purgeExpiredNotifications(admin: SupabaseLike) {
  const { error, count } = await admin
    .from('notifications')
    .delete({ count: 'exact' })
    .lt('created_at', getNotificationRetentionCutoffIso())

  if (error) throw error
  return count || 0
}

export async function purgeExpiredNotificationsSafely(admin: SupabaseLike) {
  try {
    return await purgeExpiredNotifications(admin)
  } catch (error) {
    console.warn('Notification cleanup failed', error)
    return 0
  }
}
