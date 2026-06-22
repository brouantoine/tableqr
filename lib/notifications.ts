export const NOTIFICATION_RETENTION_HOURS = 24
export const NOTIFICATION_RETENTION_MS = NOTIFICATION_RETENTION_HOURS * 60 * 60 * 1000

export function getNotificationRetentionCutoffIso(now = new Date()) {
  return new Date(now.getTime() - NOTIFICATION_RETENTION_MS).toISOString()
}
