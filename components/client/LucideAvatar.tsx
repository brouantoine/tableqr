'use client'

import {
  Bot,
  ChefHat,
  Crown,
  Flame,
  Palette,
  Rocket,
  Shield,
  Sparkles,
  Star,
  UserRound,
  WandSparkles,
  type LucideIcon,
} from 'lucide-react'

type AvatarConfig = {
  Icon: LucideIcon
  label: string
  bg: string
}

export const AVATAR_MAP: Record<string, AvatarConfig> = {
  ninja: { Icon: Shield, label: 'Ninja', bg: '#1F2937' },
  king: { Icon: Crown, label: 'Roi', bg: '#7C3AED' },
  queen: { Icon: Crown, label: 'Reine', bg: '#DB2777' },
  astronaut: { Icon: Rocket, label: 'Astro', bg: '#0EA5E9' },
  chef: { Icon: ChefHat, label: 'Chef', bg: '#F26522' },
  artist: { Icon: Palette, label: 'Artiste', bg: '#10B981' },
  vampire: { Icon: WandSparkles, label: 'Vampire', bg: '#DC2626' },
  mage: { Icon: WandSparkles, label: 'Mage', bg: '#6D28D9' },
  robot: { Icon: Bot, label: 'Robot', bg: '#374151' },
  alien: { Icon: UserRound, label: 'Alien', bg: '#059669' },
  ghost: { Icon: UserRound, label: 'Ghost', bg: '#4B5563' },
  fire: { Icon: Flame, label: 'Fire', bg: '#B45309' },
  lion: { Icon: Crown, label: 'Lion', bg: '#F59E0B' },
  fox: { Icon: Sparkles, label: 'Renard', bg: '#F97316' },
  panda: { Icon: UserRound, label: 'Panda', bg: '#374151' },
  eagle: { Icon: Rocket, label: 'Aigle', bg: '#3B82F6' },
  cat: { Icon: Star, label: 'Chat', bg: '#8B5CF6' },
  dragon: { Icon: Flame, label: 'Dragon', bg: '#DC2626' },
  wolf: { Icon: Shield, label: 'Loup', bg: '#6B7280' },
  bear: { Icon: UserRound, label: 'Ours', bg: '#92400E' },
  tiger: { Icon: Flame, label: 'Tigre', bg: '#F59E0B' },
  rabbit: { Icon: Sparkles, label: 'Lapin', bg: '#EC4899' },
  owl: { Icon: Star, label: 'Hibou', bg: '#7C3AED' },
  shark: { Icon: Rocket, label: 'Requin', bg: '#0EA5E9' },
}

export const AVATAR_OPTIONS = [
  'ninja',
  'king',
  'queen',
  'astronaut',
  'chef',
  'artist',
  'vampire',
  'mage',
  'robot',
  'alien',
  'ghost',
  'fire',
].map(id => ({ id, ...AVATAR_MAP[id] }))

export function getAvatarLabel(id: string): string {
  return AVATAR_MAP[id]?.label || 'Inconnu'
}

export default function LucideAvatar({
  avatarId,
  size = 40,
  className = '',
}: {
  avatarId: string
  size?: number
  className?: string
}) {
  const avatar = AVATAR_MAP[avatarId] || AVATAR_MAP.ghost
  const Icon = avatar.Icon

  return (
    <div
      className={`rounded-2xl flex items-center justify-center flex-shrink-0 ${className}`}
      aria-label={avatar.label}
      style={{ width: size, height: size, backgroundColor: avatar.bg }}
    >
      <Icon size={Math.max(14, size * 0.52)} color="white" strokeWidth={2.4} aria-hidden="true" />
    </div>
  )
}
