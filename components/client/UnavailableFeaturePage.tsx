import Link from 'next/link'
import { Clock3, Gamepad2, UtensilsCrossed } from 'lucide-react'
import type { Restaurant } from '@/types'

export default function UnavailableFeaturePage({
  restaurant,
  title = 'Espace en cours de développement',
}: {
  restaurant: Restaurant
  title?: string
}) {
  const p = restaurant.primary_color

  return (
    <div className="min-h-screen bg-gray-50 px-4 pb-24 pt-6">
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: p + '15' }}>
            <Gamepad2 size={24} style={{ color: p }} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Mini-jeux</p>
            <h1 className="text-xl font-black leading-tight text-gray-900">{title}</h1>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-gray-100">
            <Clock3 size={36} className="text-gray-500" strokeWidth={2.4} />
          </div>
          <p className="mt-5 text-lg font-black text-gray-900">Pas disponible pour le moment</p>
          <p className="mt-2 max-w-xs text-sm leading-6 text-gray-500">
            Cet espace sera activé prochainement. Vous pouvez revenir au menu et continuer votre commande.
          </p>
        </div>

        <div className="mt-8">
          <Link
            href={`/${restaurant.slug}/menu`}
            className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black text-white active:scale-[0.98]"
            style={{ backgroundColor: p }}
          >
            <UtensilsCrossed size={18} />
            <span>Retour au menu</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
