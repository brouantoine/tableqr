import type { CSSProperties, ReactNode } from 'react'
import { resolveStorageImageUrl } from '@/lib/images'

type RestaurantLogoProps = {
  src?: string | null
  alt?: string
  className?: string
  imgClassName?: string
  fallback?: ReactNode
  zoom?: number
  style?: CSSProperties
}

export function getRestaurantLogoUrl(src?: string | null) {
  return resolveStorageImageUrl(src)
}

export default function RestaurantLogo({
  src,
  alt = '',
  className = '',
  imgClassName = 'w-full h-full object-contain',
  fallback = null,
  zoom = 1.5,
  style,
}: RestaurantLogoProps) {
  const url = getRestaurantLogoUrl(src)

  return (
    <div className={`overflow-hidden ${className}`} style={style}>
      {url ? (
        <img
          src={url}
          alt={alt}
          className={imgClassName}
          style={{ transform: `scale(${zoom})` }}
        />
      ) : fallback}
    </div>
  )
}
