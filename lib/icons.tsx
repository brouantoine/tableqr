import {
  Beef,
  Beer,
  CakeSlice,
  Coffee,
  CookingPot,
  CupSoda,
  Drumstick,
  Fish,
  GlassWater,
  IceCreamBowl,
  Pizza,
  Salad,
  Sandwich,
  Soup,
  UtensilsCrossed,
  Wheat,
  type LucideIcon,
} from 'lucide-react'
import type { CSSProperties } from 'react'

export type MenuIconKey =
  | 'utensils'
  | 'chicken'
  | 'meat'
  | 'fish'
  | 'rice'
  | 'salad'
  | 'soup'
  | 'pot'
  | 'pizza'
  | 'sandwich'
  | 'snack'
  | 'drink'
  | 'juice'
  | 'beer'
  | 'coffee'
  | 'dessert'
  | 'cake'
  | 'ice-cream'
  | 'water'

export const MENU_ICON_OPTIONS: Array<{ key: MenuIconKey; label: string; Icon: LucideIcon }> = [
  { key: 'utensils', label: 'Menu', Icon: UtensilsCrossed },
  { key: 'chicken', label: 'Poulet', Icon: Drumstick },
  { key: 'meat', label: 'Viande', Icon: Beef },
  { key: 'fish', label: 'Poisson', Icon: Fish },
  { key: 'rice', label: 'Riz', Icon: Wheat },
  { key: 'salad', label: 'Salade', Icon: Salad },
  { key: 'soup', label: 'Soupe', Icon: Soup },
  { key: 'pot', label: 'Plat mijote', Icon: CookingPot },
  { key: 'pizza', label: 'Pizza', Icon: Pizza },
  { key: 'sandwich', label: 'Sandwich', Icon: Sandwich },
  { key: 'snack', label: 'Snack', Icon: Wheat },
  { key: 'drink', label: 'Boisson', Icon: CupSoda },
  { key: 'juice', label: 'Jus', Icon: GlassWater },
  { key: 'beer', label: 'Biere', Icon: Beer },
  { key: 'coffee', label: 'Cafe', Icon: Coffee },
  { key: 'dessert', label: 'Dessert', Icon: CakeSlice },
  { key: 'cake', label: 'Gateau', Icon: CakeSlice },
  { key: 'ice-cream', label: 'Glace', Icon: IceCreamBowl },
  { key: 'water', label: 'Eau', Icon: GlassWater },
]

const MENU_ICON_MAP = Object.fromEntries(
  MENU_ICON_OPTIONS.map(option => [option.key, option])
) as Record<MenuIconKey, { key: MenuIconKey; label: string; Icon: LucideIcon }>

const LEGACY_MENU_ICON_MAP: Record<string, MenuIconKey> = {
  ['\u{1F37D}']: 'utensils',
  ['\u{1F37D}\uFE0F']: 'utensils',
  ['\u{1F357}']: 'chicken',
  ['\u{1F969}']: 'meat',
  ['\u{1F41F}']: 'fish',
  ['\u{1F35A}']: 'rice',
  ['\u{1F957}']: 'salad',
  ['\u{1F35C}']: 'soup',
  ['\u{1F958}']: 'pot',
  ['\u{1F355}']: 'pizza',
  ['\u{1F96A}']: 'sandwich',
  ['\u{1F9C6}']: 'snack',
  ['\u{1F35F}']: 'snack',
  ['\u{1F964}']: 'drink',
  ['\u{1F9C3}']: 'juice',
  ['\u{1F37A}']: 'beer',
  ['\u{2615}']: 'coffee',
  ['\u{1F9C1}']: 'dessert',
  ['\u{1F370}']: 'cake',
  ['\u{1F366}']: 'ice-cream',
  ['\u{1F9C7}']: 'dessert',
  ['\u{1F36E}']: 'dessert',
}

export function normalizeMenuIcon(value?: string | null): MenuIconKey {
  if (!value) return 'utensils'
  if (value in MENU_ICON_MAP) return value as MenuIconKey
  return LEGACY_MENU_ICON_MAP[value] || 'utensils'
}

export function getMenuIconOption(value?: string | null) {
  return MENU_ICON_MAP[normalizeMenuIcon(value)]
}

export function MenuCategoryIcon({
  value,
  size = 16,
  className,
  style,
}: {
  value?: string | null
  size?: number
  className?: string
  style?: CSSProperties
}) {
  const { Icon } = getMenuIconOption(value)
  return <Icon size={size} className={className} style={style} strokeWidth={2.3} aria-hidden="true" />
}
