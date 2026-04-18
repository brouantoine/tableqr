import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const ADJECTIVES = ['Tigre','Lion','Panthère','Aigle','Soleil','Lune','Étoile','Flamme','Océan','Foudre','Vent','Rivière','Diamant','Rubis','Saphir']
const COLORS = ['Bleu','Rouge','Vert','Doré','Noir','Violet','Orange','Rose','Turquoise','Pourpre','Indigo','Écarlate']

export function generatePseudo(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const color = COLORS[Math.floor(Math.random() * COLORS.length)]
  return `${adj} ${color}`
}

export const PROFILE_ICONS = ['🦁','🐯','🦊','🐺','🦅','🦋','🐉','🦄','🌟','⚡','🔥','🌊','🌙','☀️','💎','🎭']

export const GENDER_OPTIONS = [
  { value: 'homme', emoji: '👨', label: 'Homme' },
  { value: 'femme', emoji: '👩', label: 'Femme' },
  { value: 'jeune_homme', emoji: '👦', label: 'Jeune homme' },
  { value: 'fille', emoji: '👧', label: 'Fille' },
  { value: 'maman', emoji: '👩‍👧', label: 'Maman' },
] as const

export const PROFILE_OPTIONS = [
  { value: 'solo', emoji: '🧑', label: 'Solo', desc: 'Seul(e) ce soir' },
  { value: 'couple', emoji: '💑', label: 'En couple', desc: 'À deux' },
  { value: 'famille', emoji: '👨‍👩‍👧', label: 'Famille', desc: 'En famille' },
  { value: 'groupe', emoji: '🎉', label: 'Groupe', desc: 'Entre amis' },
] as const

export function formatPrice(amount: number, currency = 'XOF'): string {
  if (currency === 'XOF') {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(amount)
  }
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}

export function formatTimeAgo(date: string | Date): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60) return 'À l\'instant'
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(date))
}

export function generateDeviceFingerprint(): string {
  if (typeof navigator === 'undefined') return Math.random().toString(36).substr(2, 16)
  const raw = [navigator.userAgent, navigator.language, `${screen.width}x${screen.height}`, new Date().getTimezoneOffset()].join('|')
  let hash = 0
  for (let i = 0; i < raw.length; i++) { hash = ((hash << 5) - hash) + raw.charCodeAt(i); hash |= 0 }
  return Math.abs(hash).toString(36)
}

export const ORDER_STATUS_CONFIG = {
  pending:   { label: 'En attente',      color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-400' },
  confirmed: { label: 'Confirmée',       color: 'bg-blue-100 text-blue-800',     dot: 'bg-blue-400' },
  preparing: { label: 'En préparation',  color: 'bg-orange-100 text-orange-800', dot: 'bg-orange-400' },
  ready:     { label: 'Prête !',         color: 'bg-green-100 text-green-800',   dot: 'bg-green-500 animate-pulse' },
  served:    { label: 'Servie',          color: 'bg-gray-100 text-gray-600',     dot: 'bg-gray-400' },
  cancelled: { label: 'Annulée',         color: 'bg-red-100 text-red-800',       dot: 'bg-red-400' },
}

export const PAYMENT_METHOD_CONFIG = {
  cash:         { label: 'Espèces',           icon: '💵' },
  wave:         { label: 'Wave',              icon: '🌊' },
  orange_money: { label: 'Orange Money',      icon: '🟠' },
  mtn:          { label: 'MTN MoMo',          icon: '🟡' },
  moov:         { label: 'Moov Money',        icon: '🔵' },
  card:         { label: 'Carte bancaire',    icon: '💳' },
}
