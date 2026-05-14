import Link from 'next/link'
import { Brain, CookingPot, Gamepad2, Heart, Type } from 'lucide-react'
import type { Restaurant } from '@/types'

const GAMES = [
  { type: 'quiz', name: 'Quiz Culture G.', Icon: Brain, desc: 'Testez vos connaissances', min: 1, max: 4 },
  { type: 'trivia', name: 'Trivia Cuisine', Icon: CookingPot, desc: 'Questions sur la gastronomie', min: 1, max: 6 },
  { type: 'couple_quiz', name: 'Quiz Couple', Icon: Heart, desc: 'Vous connaissez-vous vraiment ?', min: 2, max: 2 },
  { type: 'mots_croises', name: 'Mots Croisés', Icon: Type, desc: 'Défi vocabulaire en solo', min: 1, max: 1 },
]

export default function GamesPage({ restaurant }: { restaurant: Restaurant }) {
  const p = restaurant.primary_color

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white px-4 py-4 shadow-sm">
        <h1 className="font-bold text-gray-900 text-lg inline-flex items-center gap-2">
          <Gamepad2 size={18} style={{ color: p }} />
          <span>Mini-jeux</span>
        </h1>
        <p className="text-sm text-gray-500">Jouez avec d&apos;autres clients du restaurant</p>
      </div>

      <div className="px-4 pt-5">
        <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Choisir un jeu</p>
        <div className="grid grid-cols-2 gap-3">
          {GAMES.map(game => (
            <Link key={game.type} href={`/${restaurant.slug}/games/${game.type}`}
              className="bg-white rounded-2xl p-4 text-left shadow-sm border-2 border-transparent hover:border-orange-200 transition-all active:scale-[0.98]">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3" style={{ backgroundColor: p + '15' }}>
                <game.Icon size={22} style={{ color: p }} />
              </div>
              <p className="font-bold text-sm text-gray-900">{game.name}</p>
              <p className="text-xs text-gray-500 mt-1">{game.desc}</p>
              <p className="text-xs mt-2 font-medium" style={{ color: p }}>
                {game.min === game.max ? `${game.min} joueur${game.min > 1 ? 's' : ''}` : `${game.min}-${game.max} joueurs`}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
