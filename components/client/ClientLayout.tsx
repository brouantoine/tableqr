'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSessionStore } from '@/lib/store'
import BottomNav from './BottomNav'
import SplashScreen from './SplashScreen'
import GlobalClientNotifier from './GlobalClientNotifier'
import { useClientPresence } from '@/hooks/useClientPresence'
import type { Restaurant } from '@/types'

export default function ClientLayout({ children, restaurant }: { children: React.ReactNode; restaurant: Restaurant }) {
  const setRestaurant = useSessionStore(s => s.setRestaurant)
  const pathname = usePathname()
  const [showSplash, setShowSplash] = useState(false)

  const showNav = !pathname.includes('/table/')
  useClientPresence(restaurant.id)

  useEffect(() => {
    // Splash uniquement au tout premier chargement de la session
    const key = `splash_${restaurant.id}`
    let splashTimer: number | null = null
    if (!sessionStorage.getItem(key)) {
      splashTimer = window.setTimeout(() => setShowSplash(true), 0)
      sessionStorage.setItem(key, '1')
    }
    setRestaurant(restaurant)
    document.documentElement.style.setProperty('--primary', restaurant.primary_color)
    document.documentElement.style.setProperty('--secondary', restaurant.secondary_color)
    document.documentElement.style.setProperty('--accent', restaurant.accent_color)

    return () => {
      if (splashTimer) window.clearTimeout(splashTimer)
    }
  }, [restaurant, setRestaurant])

  return (
    <div className="min-h-screen bg-gray-50 w-full max-w-md mx-auto relative">
      {showSplash && (
        <SplashScreen
          onDone={() => setShowSplash(false)}
          duration={2800}
        />
      )}
      <GlobalClientNotifier primaryColor={restaurant.primary_color} />
      {children}
      {showNav && (
        <BottomNav
          slug={restaurant.slug}
          primaryColor={restaurant.primary_color}
        />
      )}
    </div>
  )
}
