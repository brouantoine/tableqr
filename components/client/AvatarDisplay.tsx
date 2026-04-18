'use client'

// Avatars unifiés — emojis pros
export const AVATAR_MAP: Record<string, { emoji: string; label: string; bg: string }> = {
  ninja:      { emoji: '🥷', label: 'Ninja',      bg: '#1F2937' },
  king:       { emoji: '🤴', label: 'Roi',        bg: '#7C3AED' },
  queen:      { emoji: '👸', label: 'Reine',      bg: '#DB2777' },
  astronaut:  { emoji: '👨‍🚀', label: 'Astronaute', bg: '#0EA5E9' },
  chef:       { emoji: '👨‍🍳', label: 'Chef',       bg: '#F26522' },
  artist:     { emoji: '🧑‍🎨', label: 'Artiste',    bg: '#10B981' },
  vampire:    { emoji: '🧛', label: 'Vampire',    bg: '#DC2626' },
  mage:       { emoji: '🧙', label: 'Mage',       bg: '#6D28D9' },
  robot:      { emoji: '🤖', label: 'Robot',      bg: '#374151' },
  alien:      { emoji: '👽', label: 'Alien',      bg: '#059669' },
  ghost:      { emoji: '👻', label: 'Ghost',      bg: '#6B7280' },
  fire:       { emoji: '🔥', label: 'Fire',       bg: '#DC2626' },
  // Anciens IDs SVG — fallback
  lion:       { emoji: '🦁', label: 'Lion',       bg: '#F59E0B' },
  fox:        { emoji: '🦊', label: 'Renard',     bg: '#F97316' },
  panda:      { emoji: '🐼', label: 'Panda',      bg: '#374151' },
  eagle:      { emoji: '🦅', label: 'Aigle',      bg: '#3B82F6' },
  cat:        { emoji: '🐱', label: 'Chat',       bg: '#8B5CF6' },
  dragon:     { emoji: '🐉', label: 'Dragon',     bg: '#DC2626' },
  wolf:       { emoji: '🐺', label: 'Loup',       bg: '#6B7280' },
  bear:       { emoji: '🐻', label: 'Ours',       bg: '#92400E' },
  tiger:      { emoji: '🐯', label: 'Tigre',      bg: '#F59E0B' },
  rabbit:     { emoji: '🐰', label: 'Lapin',      bg: '#EC4899' },
  owl:        { emoji: '🦉', label: 'Hibou',      bg: '#7C3AED' },
  shark:      { emoji: '🦈', label: 'Requin',     bg: '#0EA5E9' },
}

interface Props {
  avatarId: string
  size?: number
  className?: string
}

export default function AvatarDisplay({ avatarId, size = 40, className = '' }: Props) {
  const av = AVATAR_MAP[avatarId]

  if (!av) {
    return (
      <div className={`rounded-2xl flex items-center justify-center font-black ${className}`}
        style={{ width: size, height: size, backgroundColor: '#F26522', fontSize: size * 0.45, color: '#fff' }}>
        ?
      </div>
    )
  }

  return (
    <div className={`rounded-2xl flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: size, height: size, backgroundColor: av.bg, fontSize: size * 0.55 }}>
      {av.emoji}
    </div>
  )
}

export function getAvatarLabel(avatarId: string): string {
  return AVATAR_MAP[avatarId]?.label || 'Inconnu'
}
