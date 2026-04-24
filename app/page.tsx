'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useState } from 'react'
import { Check, ChevronRight, Star, Zap, Shield, BarChart3, MessageCircle, Gamepad2, QrCode, Phone, Mail, ArrowRight, Menu, Bell, Hand } from 'lucide-react'

const FEATURES = [
  { icon: QrCode, title: 'QR Code intelligent', desc: 'Chaque table a son QR unique. Le client scanne et commande en 30 secondes.', color: '#F26522' },
  { icon: MessageCircle, title: 'Espace social', desc: 'Les clients chattent anonymement entre tables. Une ambiance unique dans votre salle.', color: '#3B82F6' },
  { icon: Gamepad2, title: 'Mini-jeux', desc: 'Quiz, trivia, jeux couple en attendant la commande. Zéro ennui.', color: '#8B5CF6' },
  { icon: BarChart3, title: 'Analytics live', desc: 'CA temps réel, plats populaires, heures de pointe.', color: '#10B981' },
  { icon: Zap, title: 'Caisse intégrée', desc: 'Wave, Orange Money, espèces. Récap journalier complet.', color: '#F59E0B' },
  { icon: Shield, title: 'Multi-restaurant', desc: 'Un compte, plusieurs adresses. Parfait pour les franchises.', color: '#EC4899' },
]

const INCLUDED = [
  'Menu digital illimité avec photos',
  'Tables & QR codes personnalisés',
  'Commandes en temps réel',
  'Espace social & mini-jeux',
  'Caisse complète (Wave, OM, Cash)',
  'Statistiques & analytics',
  'Bot assistant Tantie (IA)',
  'Support dédié inclus',
]

const TESTIMONIALS = [
  { name: 'Kouassi Adjoumani', role: 'Gérant, Maquis Le Plateau', text: 'Depuis TableQR, mes clients commandent 3x plus vite. Le chiffre d\'affaires a augmenté de 30% en 2 mois.', stars: 5 },
  { name: 'Fatou Diallo', role: 'Propriétaire, Restaurant Dakar', text: 'L\'espace social est incroyable. Les clients restent plus longtemps et reviennent.', stars: 5 },
  { name: 'Jean-Marc Koffi', role: 'Directeur, Fast Food Cocody', text: 'La caisse intégrée m\'évite d\'utiliser 3 applications différentes. Tout est là.', stars: 5 },
]

const FOOD_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&q=80', label: 'Poulet grillé' },
  { url: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80', label: 'Poisson braisé' },
  { url: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&q=80', label: 'Riz sauté' },
  { url: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=400&q=80', label: 'Banane plantain' },
  { url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80', label: 'Brochettes' },
  { url: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80', label: 'Soupe locale' },
]

export default function LandingPage() {
  const [form, setForm] = useState({ name: '', phone: '', restaurant: '', ville: '', quartier: '' })
  const [sent, setSent] = useState(false)

  async function handleContact(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: '#F26522' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M3 12h18M3 18h18"/>
              </svg>
            </div>
            <span className="font-black text-gray-900 text-lg">TABLE<span style={{ color: '#F26522' }}>QR</span></span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500">
            <a href="#features" className="hover:text-gray-900 transition-colors">Fonctionnalités</a>
            <a href="#menu" className="hover:text-gray-900 transition-colors">Aperçu</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Tarif</a>
            <a href="#contact" className="hover:text-gray-900 transition-colors">Contact</a>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/admin/login"
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors">
              Mon restaurant
            </Link>
            <a href="#contact"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-bold transition-all"
              style={{ backgroundColor: '#F26522', boxShadow: '0 4px 15px #F2652240' }}>
              <Phone size={13} />
              Nous contacter
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="pt-28 pb-16 px-5 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #FFFAF7 0%, #FFFFFF 60%, #F5F3FF 100%)' }}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Left */}
          <div>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6 border"
              style={{ backgroundColor: '#FFF7F0', color: '#F26522', borderColor: '#FDDCB5' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              Disponible en Côte d'Ivoire, Sénégal, Cameroun
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="text-4xl md:text-6xl font-black text-gray-900 leading-tight mb-5">
              Votre restaurant<br />
              <span style={{ color: '#F26522' }}>mérite mieux</span><br />
              qu&apos;un stylo
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="text-lg text-gray-500 mb-8 leading-relaxed max-w-lg">
              Menu digital, commandes QR, caisse intégrée, espace social. Modernisez votre restaurant en 24h — sans matériel, sans technique.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="flex flex-col sm:flex-row gap-3">
              <a href="#contact"
                className="flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-white font-black text-sm"
                style={{ backgroundColor: '#F26522', boxShadow: '0 8px 30px #F2652250' }}>
                <Phone size={16} />
                Demander une démo
              </a>
              <Link href="/admin/login"
                className="flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-gray-700 font-bold text-sm border-2 border-gray-200 hover:bg-gray-50 transition-colors">
                Accéder à mon restaurant
                <ArrowRight size={15} />
              </Link>
            </motion.div>

            <div className="flex items-center gap-6 mt-8">
              {['+30% CA', 'Sans papier', '24h pour démarrer'].map((s, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#F2652215' }}>
                    <Check size={9} style={{ color: '#F26522' }} strokeWidth={3} />
                  </div>
                  <span className="text-xs font-semibold text-gray-500">{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Phone mockup */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            className="relative flex justify-center lg:justify-end">
            <div className="relative">
              {/* Phone */}
              <div className="w-64 rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-gray-900 bg-gray-900 relative z-10">
                <div className="h-5 bg-gray-900 flex items-center justify-center">
                  <div className="w-14 h-1 rounded-full bg-gray-700" />
                </div>
                <div className="bg-white">
                  {/* Header sombre */}
                  <div className="px-4 pt-4 pb-3" style={{ background: 'linear-gradient(160deg, #1A1208, #2D1F0A)' }}>
                    <p className="text-white/50 text-xs mb-0.5">Bonsoir,</p>
                    <p className="text-white font-black text-sm">Qu&apos;est-ce qui vous fait envie ?</p>
                  </div>
                  {/* Plats avec vraies photos */}
                  <div className="p-2 space-y-2" style={{ backgroundColor: '#F8F8F8' }}>
                    {FOOD_IMAGES.slice(0, 3).map((food, i) => (
                      <div key={i} className="relative h-16 rounded-2xl overflow-hidden">
                        <img src={food.url} alt={food.label} className="w-full h-full object-cover" />
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />
                        <div className="absolute bottom-2 left-2">
                          <p className="text-white font-black text-xs">{food.label}</p>
                        </div>
                        <div className="absolute bottom-2 right-2 w-6 h-6 rounded-lg flex items-center justify-center text-white"
                          style={{ backgroundColor: '#F26522' }}>
                          <span className="text-xs font-black">+</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Bottom nav mockup */}
                  <div className="flex justify-around py-2 bg-white border-t border-gray-100">
                    {[
                      { icon: Menu, color: '#F26522' },
                      { icon: MessageCircle, color: '#D1D5DB' },
                      { icon: Gamepad2, color: '#D1D5DB' },
                      { icon: Bell, color: '#D1D5DB' },
                    ].map(({ icon: Icon, color }, i) => (
                      <Icon key={i} size={16} style={{ color }} />
                    ))}
                  </div>
                </div>
              </div>
              {/* Déco */}
              <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-20"
                style={{ background: 'radial-gradient(circle, #F26522, transparent)' }} />
              <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full opacity-10"
                style={{ background: 'radial-gradient(circle, #8B5CF6, transparent)' }} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── VILLES ── */}
      <section className="py-8 border-y border-gray-100 bg-gray-50">
        <div className="max-w-4xl mx-auto px-5">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest">Présent dans</p>
            {['Abidjan', 'Dakar', 'Douala', 'Lomé', 'Accra', 'Lagos'].map(city => (
              <span key={city} className="text-sm font-bold text-gray-500">{city}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── MENU APERÇU ── */}
      <section id="menu" className="py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#F26522' }}>Aperçu client</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">Ce que voient vos clients</h2>
            <p className="text-gray-500 max-w-lg mx-auto">Après le scan du QR code, vos plats s&apos;affichent avec photos, prix et bouton commander.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {FOOD_IMAGES.map((food, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="relative rounded-3xl overflow-hidden group cursor-pointer"
                style={{ height: '200px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
                <img src={food.url} alt={food.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)' }} />
                <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
                  <p className="text-white font-black text-sm">{food.label}</p>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: '#F26522' }}>
                    <span className="text-base font-black">+</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <p className="text-center text-sm text-gray-400 mt-6">
            Vos propres plats avec vos photos · Bibliothèque de photos intégrée
          </p>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-20 px-5 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#F26522' }}>Fonctionnalités</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">Tout ce dont vous avez besoin</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Une seule application pour gérer commandes, caisse et expérience client.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                className="bg-white rounded-3xl p-6 border border-gray-100 hover:shadow-lg transition-all group">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: f.color + '15' }}>
                  <f.icon size={22} style={{ color: f.color }} />
                </div>
                <h3 className="font-black text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-16 px-5" style={{ background: 'linear-gradient(135deg, #1A1208 0%, #2D1F0A 100%)' }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '+30%', label: 'CA moyen en plus' },
            { value: '30s', label: 'Pour passer commande' },
            { value: '100%', label: 'Sans papier' },
            { value: '24h', label: 'Pour démarrer' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <p className="text-4xl font-black mb-1" style={{ color: '#F26522' }}>{s.value}</p>
              <p className="text-gray-400 text-sm">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-20 px-5 bg-gray-50">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#F26522' }}>Tarif</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">Un seul abonnement</h2>
            <p className="text-gray-500">Tout inclus. Aucune surprise. Résiliable à tout moment.</p>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-3xl overflow-hidden border-2 shadow-xl"
            style={{ borderColor: '#F26522' }}>
            <div className="px-8 pt-8 pb-6" style={{ background: 'linear-gradient(135deg,#F26522,#C0392B)' }}>
              <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-3">Abonnement mensuel</p>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-5xl font-black text-white">15 000</span>
                <span className="text-white/70 text-lg">FCFA / mois</span>
              </div>
              <p className="text-white/60 text-sm">Résiliable à tout moment · Pas d&apos;engagement</p>
            </div>

            <div className="px-8 py-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Tout inclus</p>
              <div className="grid grid-cols-1 gap-3">
                {INCLUDED.map(item => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#FFF0E8' }}>
                      <Check size={11} style={{ color: '#F26522' }} strokeWidth={3} />
                    </div>
                    <span className="text-sm text-gray-700 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-8 pb-8">
              <a href="#contact"
                className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-white font-black text-base"
                style={{ backgroundColor: '#F26522', boxShadow: '0 8px 30px #F2652240' }}>
                <Phone size={16} />
                Nous contacter pour démarrer
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" className="py-20 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#F26522' }}>Témoignages</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">Ils nous font confiance</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                <div className="flex mb-4">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} size={14} fill="#F59E0B" color="#F59E0B" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-5 italic">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                  <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                    style={{ backgroundColor: '#F26522' }}>
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-black text-gray-900 text-sm">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" className="py-20 px-5 bg-gray-50">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#F26522' }}>Contact</p>
            <h2 className="text-3xl font-black text-gray-900 mb-3">Parlons de votre restaurant</h2>
            <p className="text-gray-500 text-sm">Laissez vos coordonnées, on vous rappelle dans les 24h.</p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            {sent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-3xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Check size={28} className="text-green-600" strokeWidth={3} />
                </div>
                <p className="font-black text-xl text-gray-900 mb-2">Message reçu !</p>
                <p className="text-gray-500 text-sm">On vous rappelle dans les 24h ouvrées.</p>
              </div>
            ) : (
              <form onSubmit={handleContact} className="space-y-4">
                {[
                  { label: 'Votre nom *', key: 'name', placeholder: 'Jean-Marc Koffi', type: 'text' },
                  { label: 'Téléphone / WhatsApp *', key: 'phone', placeholder: '+225 07 00 00 00', type: 'tel' },
                  { label: 'Nom de votre restaurant *', key: 'restaurant', placeholder: 'Maquis Le Plateau', type: 'text' },
                  { label: 'Ville *', key: 'ville', placeholder: 'Abidjan, Dakar, Douala...', type: 'text' },
                  { label: 'Quartier', key: 'quartier', placeholder: 'Cocody, Plateau, Yopougon...', type: 'text' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-bold text-gray-500 block mb-1.5">{f.label}</label>
                    <input type={f.type} placeholder={f.placeholder} required
                      value={(form as any)[f.key]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl bg-gray-50 text-sm outline-none border border-gray-100 focus:border-orange-300" />
                  </div>
                ))}
                <motion.button whileTap={{ scale: 0.97 }} type="submit"
                  className="w-full py-4 rounded-2xl text-white font-black text-base flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#F26522', boxShadow: '0 4px 20px #F2652240' }}>
                  <Phone size={16} />
                  Être rappelé gratuitement
                </motion.button>
              </form>
            )}

            <div className="flex items-center justify-center gap-6 mt-6 pt-5 border-t border-gray-100">
              <a href="tel:+2250788339882" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
                <Phone size={14} />
                <span className="font-medium">+225 07 88 33 98 82</span>
              </a>
              <a href="mailto:lemenunumerique@gmail.com" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
                <Mail size={14} />
                <span className="font-medium">lemenunumerique@gmail.com</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F26522' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M3 12h18M3 18h18"/>
              </svg>
            </div>
            <span className="font-black text-white text-lg">TABLE<span style={{ color: '#F26522' }}>QR</span></span>
          </div>
          <div className="flex gap-6 text-sm">
            <Link href="/legal/cgu" className="hover:text-white transition-colors">CGU</Link>
            <Link href="/legal/privacy" className="hover:text-white transition-colors">Confidentialité</Link>
            <Link href="/admin/login" className="hover:text-white transition-colors">Espace restaurateur</Link>
          </div>
          <p className="text-xs text-gray-500">© 2025 TableQR · Fait avec ❤️ en Afrique de l&apos;Ouest</p>
        </div>
      </footer>
    </div>
  )
}