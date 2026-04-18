'use client'
import { AVATARS } from '@/lib/utils/avatars'

interface Props {
  avatarId: string
  size?: number
  className?: string
}

export default function AvatarDisplay({ avatarId, size = 40, className = '' }: Props) {
  const avatar = AVATARS.find(a => a.id === avatarId)

  if (!avatar) {
    // Fallback — initiale
    return (
      <div className={`rounded-2xl flex items-center justify-center text-white font-black ${className}`}
        style={{ width: size, height: size, backgroundColor: '#F26522', fontSize: size * 0.4 }}>
        ?
      </div>
    )
  }

  return (
    <div className={`rounded-2xl flex items-center justify-center overflow-hidden ${className}`}
      style={{ width: size, height: size, backgroundColor: avatar.bg, flexShrink: 0 }}>
      <div style={{ width: size * 0.85, height: size * 0.85 }}
        dangerouslySetInnerHTML={{ __html: avatar.svg }} />
    </div>
  )
}