'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/admin/dashboard', icon: '🔴', label: 'Caisse Live' },
  { href: '/admin/menu', icon: '🍽️', label: 'Menu' },
  { href: '/admin/tables', icon: '📱', label: 'Tables & QR' },
  { href: '/admin/stats', icon: '📊', label: 'Statistiques' },
  { href: '/admin/settings', icon: '⚙️', label: 'Paramètres' },
]

export default function AdminNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40 md:relative md:border-t-0 md:border-r md:h-screen md:w-56 md:flex-shrink-0">
      <div className="flex md:flex-col">
        {NAV.map(item => {
          const active = pathname === item.href
          return (
            <Link key={item.href} href={item.href}
              className={`flex-1 md:flex-initial flex flex-col md:flex-row items-center md:gap-3 py-3 md:py-3 md:px-4 text-center md:text-left transition-all ${active ? 'text-orange-500 md:bg-orange-50 font-medium' : 'text-gray-400 hover:text-gray-600'}`}>
              <span className="text-xl md:text-base">{item.icon}</span>
              <span className="text-xs md:text-sm">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
