'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { QrCode, UtensilsCrossed, LayoutDashboard, ChevronRight, ArrowRight } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()
  const [restaurantName, setRestaurantName] = useState('votre restaurant')
  const p = '#F26522'

  useEffect(() => {
    // Récupérer le nom du restaurant du proprio connecté
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/admin/login'); return }
      const { data } = await supabase
        .from('restaurants')
        .select('name')
        .eq('admin_email', user.email)
        .maybeSingle()
      if (data) setRestaurantName(data.name)
    })
  }, [])

  function goTo(href: string) {
    localStorage.setItem('onboarding_done', '1')
    router.push(href)
  }

  const cards = [
    {
      step: '01',
      icon: QrCode,
      title: 'Créez vos tables',
      desc: 'Ajoutez chaque table de votre salle. Chaque table génère automatiquement un QR code unique à imprimer et poser.',
      action: 'Créer mes tables',
      href: '/admin/tables',
      color: '#F26522',
      bg: '#FFF7F0',
      tip: 'Exemple : Table 1, Table 2, Terrasse 1...',
    },
    {
      step: '02',
      icon: UtensilsCrossed,
      title: 'Ajoutez votre menu',
      desc: 'Créez vos catégories (Plats, Boissons, Desserts) puis ajoutez vos plats avec prix et photos depuis notre bibliothèque.',
      action: 'Créer mon menu',
      href: '/admin/menu',
      color: '#3B82F6',
      bg: '#EFF6FF',
      tip: 'Les photos viennent de notre bibliothèque intégrée',
    },
    {
      step: '03',
      icon: LayoutDashboard,
      title: 'Découvrez votre caisse',
      desc: 'Recevez les commandes en temps réel, encaissez via Wave, Orange Money ou espèces, et consultez votre récap journalier.',
      action: 'Voir la caisse',
      href: '/admin/dashboard',
      color: '#10B981',
      bg: '#ECFDF5',
      tip: 'Un seul bouton "Servie ✓" à appuyer',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 py-5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black"
              style={{ backgroundColor: p }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M3 12h18M3 18h18"/>
              </svg>
            </div>
            <span className="font-black text-gray-900 text-sm">TABLE<span style={{ color: p }}>QR</span></span>
          </div>
          <button onClick={() => goTo('/admin/dashboard')}
            className="text-xs text-gray-400 font-medium hover:text-gray-600 flex items-center gap-1">
            Passer <ArrowRight size={12} />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-8 pb-16">

        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="mb-8">
          <p className="text-sm font-semibold mb-1" style={{ color: p }}>Bienvenue sur TableQR 👋</p>
          <h1 className="text-2xl font-black text-gray-900 leading-tight">
            Configurons<br /><span style={{ color: p }}>{restaurantName}</span>
          </h1>
          <p className="text-gray-400 text-sm mt-2">3 étapes simples pour être opérationnel en 10 minutes.</p>
        </motion.div>

        {/* Cards */}
        <div className="space-y-4">
          {cards.map((card, i) => (
            <motion.div key={card.step}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">

              {/* Top coloré */}
              <div className="px-5 pt-5 pb-4 flex items-start gap-4"
                style={{ backgroundColor: card.bg }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: card.color + '20' }}>
                  <card.icon size={22} style={{ color: card.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-black px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: card.color }}>
                      Étape {card.step}
                    </span>
                  </div>
                  <h3 className="font-black text-gray-900 text-base">{card.title}</h3>
                </div>
              </div>

              {/* Contenu */}
              <div className="px-5 py-4">
                <p className="text-sm text-gray-600 leading-relaxed mb-3">{card.desc}</p>
                <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-gray-50">
                  <span className="text-xs">💡</span>
                  <p className="text-xs text-gray-500 font-medium">{card.tip}</p>
                </div>
                <motion.button whileTap={{ scale: 0.97 }}
                  onClick={() => goTo(card.href)}
                  className="w-full py-3.5 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2"
                  style={{ backgroundColor: card.color, boxShadow: `0 4px 16px ${card.color}30` }}>
                  {card.action}
                  <ChevronRight size={16} strokeWidth={2.5} />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-6 text-center">
          <button onClick={() => goTo('/admin/dashboard')}
            className="text-sm text-gray-400 hover:text-gray-600 font-medium">
            J&apos;ai déjà configuré mon restaurant → Accéder au dashboard
          </button>
        </motion.div>
      </div>
    </div>
  )
}
