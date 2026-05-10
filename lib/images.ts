const STORAGE_BUCKET = 'restaurant-images'

export function resolveStorageImageUrl(value?: string | null) {
  const raw = value?.trim()
  if (!raw) return ''

  if (/^(https?:|data:|blob:|\/)/i.test(raw)) return raw

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  if (!supabaseUrl) return raw

  const path = raw
    .replace(/^\/+/, '')
    .replace(new RegExp(`^${STORAGE_BUCKET}/`), '')

  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`
}
