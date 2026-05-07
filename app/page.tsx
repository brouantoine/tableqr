'use client'

import { motion } from 'framer-motion'
import {
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  Gamepad2,
  Mail,
  Menu,
  MessageCircle,
  Phone,
  QrCode,
  Shield,
  Star,
  User,
  Zap,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { type FormEvent, type HTMLInputTypeAttribute, useState } from 'react'

type ContactForm = {
  name: string
  phone: string
  restaurant: string
  ville: string
  quartier: string
}

type ContactField = {
  label: string
  key: keyof ContactForm
  placeholder: string
  type: HTMLInputTypeAttribute
  required?: boolean
}

const ORANGE = '#F26522'

const HERO_IMAGE = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5'

const FEATURES = [
  { icon: QrCode, title: 'QR Code intelligent', desc: 'Chaque table a son QR unique. Le client scanne et commande en 30 secondes.', color: ORANGE },
  { icon: MessageCircle, title: 'Espace social', desc: 'Les clients chattent anonymement entre tables. Une ambiance unique dans votre salle.', color: '#2563EB' },
  { icon: Gamepad2, title: 'Mini-jeux', desc: 'Quiz, trivia, jeux couple en attendant la commande. Zéro ennui.', color: '#7C3AED' },
  { icon: BarChart3, title: 'Analytics live', desc: 'CA temps réel, plats populaires, heures de pointe.', color: '#059669' },
  { icon: Zap, title: 'Caisse intégrée', desc: 'Wave, Orange Money, espèces. Récap journalier complet.', color: '#D97706' },
  { icon: Shield, title: 'Multi-restaurant', desc: 'Un compte, plusieurs adresses. Parfait pour les franchises.', color: '#DB2777' },
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
  { name: 'Kouassi Adjoumani', role: 'Gérant, Maquis Le Plateau', text: "Depuis TableQR, mes clients commandent 3x plus vite. Le chiffre d'affaires a augmenté de 30% en 2 mois.", stars: 5 },
  { name: 'Fatou Diallo', role: 'Propriétaire, Restaurant Dakar', text: "L'espace social est incroyable. Les clients restent plus longtemps et reviennent.", stars: 5 },
  { name: 'Jean-Marc Koffi', role: 'Directeur, Fast Food Cocody', text: "La caisse intégrée m'évite d'utiliser 3 applications différentes. Tout est là.", stars: 5 },
]

const FOOD_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8', label: 'Pommes de terre sautées', price: '3 500 FCFA' },
  { url: 'https://images.unsplash.com/photo-1574484284002-952d92456975', label: 'Filet de poisson crémeux', price: '6 500 FCFA' },
  { url: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8', label: 'Spaghetti aux crevettes', price: '5 500 FCFA' },
  { url: 'https://images.unsplash.com/photo-1529042410759-befb1204b468', label: 'Boulettes de viande', price: '4 000 FCFA' },
  { url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1', label: 'Grillades mixtes', price: '7 000 FCFA' },
  { url: 'https://images.unsplash.com/photo-1547592180-85f173990554', label: 'Bol riz et légumes', price: '4 500 FCFA' },
]

const CONTACT_FIELDS: ContactField[] = [
  { label: 'Votre nom *', key: 'name', placeholder: 'Jean-Marc Koffi', type: 'text', required: true },
  { label: 'Téléphone / WhatsApp *', key: 'phone', placeholder: '+225 07 00 00 00', type: 'tel', required: true },
  { label: 'Nom de votre restaurant *', key: 'restaurant', placeholder: 'Maquis Le Plateau', type: 'text', required: true },
  { label: 'Ville *', key: 'ville', placeholder: 'Abidjan, Dakar, Douala...', type: 'text', required: true },
  { label: 'Quartier', key: 'quartier', placeholder: 'Cocody, Plateau, Yopougon...', type: 'text', required: true },
]

const TRUST_ITEMS = ['+30% CA moyen', 'Sans papier', 'Démarrage en 24h']

const CITIES = ['Abidjan', 'Dakar', 'Douala', 'Lomé', 'Accra', 'Lagos']

const STATS = [
  { value: '+30%', label: 'CA moyen en plus' },
  { value: '30s', label: 'Pour commander' },
  { value: '100%', label: 'Sans papier' },
  { value: '24h', label: 'Pour démarrer' },
]

export default function LandingPage() {
  const [form, setForm] = useState<ContactForm>({ name: '', phone: '', restaurant: '', ville: '', quartier: '' })
  const [sent, setSent] = useState(false)

  async function handleContact(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-gray-950/80 text-white backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg text-white shadow-sm" style={{ backgroundColor: ORANGE }}>
              <QrCode size={19} strokeWidth={2.6} />
            </span>
            <span className="text-lg font-black tracking-normal">
              TABLE<span style={{ color: ORANGE }}>QR</span>
            </span>
          </div>

          <div className="hidden items-center gap-7 text-sm font-semibold text-white/70 md:flex">
            <a href="#features" className="transition-colors hover:text-white">Fonctionnalités</a>
            <a href="#menu" className="transition-colors hover:text-white">Aperçu</a>
            <a href="#pricing" className="transition-colors hover:text-white">Tarif</a>
            <a href="#contact" className="transition-colors hover:text-white">Contact</a>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/login"
              className="hidden rounded-lg border border-white/15 px-4 py-2 text-sm font-bold text-white/85 transition-colors hover:bg-white/10 sm:inline-flex"
            >
              Mon restaurant
            </Link>
            <a
              href="#contact"
              className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-black text-white shadow-lg shadow-orange-950/30 transition-transform hover:-translate-y-0.5"
              style={{ backgroundColor: ORANGE }}
            >
              <Phone size={14} />
              Contact
            </a>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative isolate overflow-hidden px-4 pb-12 pt-24 text-white sm:px-6 lg:pb-16">
          <Image
            src={HERO_IMAGE}
            alt="Table de restaurant servie"
            fill
            priority
            sizes="100vw"
            className="absolute inset-0 -z-20 object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-gray-950 via-gray-950/82 to-gray-950/38" />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-white to-transparent" />

          <div className="mx-auto grid min-h-[82svh] max-w-6xl items-center gap-10 lg:grid-cols-[1fr_380px]">
            <div className="max-w-2xl py-10">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/85 backdrop-blur"
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ORANGE }} />
                Disponible en Côte d&apos;Ivoire, Sénégal, Cameroun
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="max-w-3xl text-4xl font-black leading-[1.02] text-white sm:text-5xl lg:text-6xl"
              >
                TableQR pour restaurants
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-5 max-w-xl text-base leading-8 text-white/78 sm:text-lg"
              >
                Menu digital, commandes QR, caisse intégrée et expérience client interactive. Votre salle se modernise en 24h, sans matériel compliqué.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mt-8 flex flex-col gap-3 sm:flex-row"
              >
                <a
                  href="#contact"
                  className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-4 text-sm font-black text-white shadow-xl shadow-orange-950/30 transition-transform hover:-translate-y-0.5"
                  style={{ backgroundColor: ORANGE }}
                >
                  <Phone size={16} />
                  Demander une démo
                </a>
                <Link
                  href="/admin/login"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-6 py-4 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/16"
                >
                  Accéder à mon restaurant
                  <ArrowRight size={16} />
                </Link>
              </motion.div>

              <div className="mt-8 flex flex-wrap gap-3">
                {TRUST_ITEMS.map((item) => (
                  <span key={item} className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-2 text-xs font-bold text-white/82 backdrop-blur">
                    <Check size={13} style={{ color: ORANGE }} strokeWidth={3} />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mx-auto hidden w-full max-w-[330px] lg:block"
              aria-hidden="true"
            >
              <div className="rounded-[2rem] border-[10px] border-gray-950 bg-gray-950 shadow-2xl shadow-black/40">
                <div className="flex h-6 items-center justify-center">
                  <div className="h-1 w-16 rounded-full bg-white/18" />
                </div>
                <div className="overflow-hidden rounded-[1.25rem] bg-gray-100 text-gray-950">
                  <div className="bg-gray-950 px-4 pb-4 pt-5">
                    <p className="text-xs font-semibold text-white/45">Table 12</p>
                    <p className="mt-1 text-base font-black text-white">Qu&apos;est-ce qui vous fait envie ?</p>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[10px] font-bold text-white/70">
                      <span className="rounded-md px-2 py-1.5" style={{ backgroundColor: ORANGE }}>Menu</span>
                      <span className="rounded-md bg-white/10 px-2 py-1.5">Chat</span>
                      <span className="rounded-md bg-white/10 px-2 py-1.5">Jeux</span>
                    </div>
                  </div>

                  <div className="space-y-2 p-2.5">
                    {FOOD_IMAGES.slice(0, 3).map((food) => (
                      <div key={food.label} className="grid grid-cols-[64px_1fr_auto] items-center gap-3 rounded-lg bg-white p-2 shadow-sm">
                        <div className="relative h-16 overflow-hidden rounded-md">
                          <Image src={food.url} alt="" fill sizes="64px" className="object-cover" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black text-gray-900">{food.label}</p>
                          <p className="mt-1 text-[11px] font-bold" style={{ color: ORANGE }}>{food.price}</p>
                        </div>
                        <span className="flex h-7 w-7 items-center justify-center rounded-md text-sm font-black text-white" style={{ backgroundColor: ORANGE }}>
                          +
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-4 border-t border-gray-200 bg-white px-3 py-3">
                    {[
                      { icon: Menu, active: true },
                      { icon: MessageCircle, active: false },
                      { icon: Gamepad2, active: false },
                      { icon: Bell, active: false },
                    ].map(({ icon: Icon, active }, index) => (
                      <Icon key={index} size={17} className="mx-auto" style={{ color: active ? ORANGE : '#9CA3AF' }} />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="border-y border-gray-100 bg-white px-4 py-7 sm:px-6">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-9 gap-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Présent dans</p>
            {CITIES.map((city) => (
              <span key={city} className="text-sm font-black text-gray-600">{city}</span>
            ))}
          </div>
        </section>

        <section id="menu" className="bg-white px-4 py-16 sm:px-6 lg:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <p className="mb-3 text-xs font-black uppercase tracking-widest" style={{ color: ORANGE }}>Aperçu client</p>
              <h2 className="text-3xl font-black text-gray-950 sm:text-4xl">Ce que voient vos clients</h2>
              <p className="mt-3 text-sm leading-7 text-gray-500 sm:text-base">Après le scan du QR code, vos plats s&apos;affichent avec photos, prix et bouton commander.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FOOD_IMAGES.map((food, index) => (
                <motion.div
                  key={food.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="group overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-xl"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                    <Image
                      src={food.url}
                      alt={food.label}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-gray-950">{food.label}</p>
                      <p className="mt-1 text-xs font-bold text-gray-500">{food.price}</p>
                    </div>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg font-black text-white" style={{ backgroundColor: ORANGE }}>
                      +
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            <p className="mt-6 text-center text-sm font-medium text-gray-400">Vos propres plats avec vos photos. Bibliothèque intégrée disponible.</p>
          </div>
        </section>

        <section id="features" className="bg-gray-50 px-4 py-16 sm:px-6 lg:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <p className="mb-3 text-xs font-black uppercase tracking-widest" style={{ color: ORANGE }}>Fonctionnalités</p>
              <h2 className="text-3xl font-black text-gray-950 sm:text-4xl">Tout ce dont vous avez besoin</h2>
              <p className="mt-3 text-sm leading-7 text-gray-500 sm:text-base">Une seule application pour gérer commandes, caisse et expérience client.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg"
                >
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg" style={{ backgroundColor: `${feature.color}14` }}>
                    <feature.icon size={21} style={{ color: feature.color }} />
                  </div>
                  <h3 className="text-base font-black text-gray-950">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-500">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-gray-950 px-4 py-14 sm:px-6">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 text-center md:grid-cols-4">
            {STATS.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06 }}
                className="rounded-lg border border-white/8 bg-white/5 px-4 py-5"
              >
                <p className="text-3xl font-black sm:text-4xl" style={{ color: ORANGE }}>{stat.value}</p>
                <p className="mt-1 text-xs font-semibold text-white/55 sm:text-sm">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="pricing" className="bg-gray-50 px-4 py-16 sm:px-6 lg:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <p className="mb-3 text-xs font-black uppercase tracking-widest" style={{ color: ORANGE }}>Tarif</p>
              <h2 className="text-3xl font-black text-gray-950 sm:text-4xl">Un seul abonnement</h2>
              <p className="mt-3 text-sm leading-7 text-gray-500 sm:text-base">Tout inclus. Aucune surprise. Résiliable à tout moment.</p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mx-auto grid max-w-4xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl md:grid-cols-[0.95fr_1.05fr]"
            >
              <div className="flex flex-col justify-between bg-gray-950 p-7 text-white sm:p-8">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-white/48">Abonnement mensuel</p>
                  <div className="mt-5 flex flex-wrap items-end gap-x-2 gap-y-1">
                    <span className="text-5xl font-black leading-none">15 000</span>
                    <span className="pb-1 text-base font-bold text-white/60">FCFA / mois</span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-white/55">Pas d&apos;engagement. Activation en 24h.</p>
                </div>
                <a
                  href="#contact"
                  className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg px-5 py-4 text-sm font-black text-white shadow-lg shadow-orange-950/30 transition-transform hover:-translate-y-0.5"
                  style={{ backgroundColor: ORANGE }}
                >
                  <Phone size={16} />
                  Démarrer
                </a>
              </div>

              <div className="p-7 sm:p-8">
                <p className="mb-5 text-xs font-black uppercase tracking-widest text-gray-400">Tout inclus</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {INCLUDED.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: '#FFF0E8' }}>
                        <Check size={12} style={{ color: ORANGE }} strokeWidth={3} />
                      </span>
                      <span className="text-sm font-semibold leading-6 text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="testimonials" className="bg-white px-4 py-16 sm:px-6 lg:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <p className="mb-3 text-xs font-black uppercase tracking-widest" style={{ color: ORANGE }}>Témoignages</p>
              <h2 className="text-3xl font-black text-gray-950 sm:text-4xl">Ils nous font confiance</h2>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {TESTIMONIALS.map((testimonial, index) => (
                <motion.div
                  key={testimonial.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                  className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm"
                >
                  <div className="mb-4 flex">
                    {Array.from({ length: testimonial.stars }).map((_, starIndex) => (
                      <Star key={starIndex} size={15} fill="#F59E0B" color="#F59E0B" />
                    ))}
                  </div>
                  <p className="text-sm leading-7 text-gray-600">&ldquo;{testimonial.text}&rdquo;</p>
                  <div className="mt-6 flex items-center gap-3 border-t border-gray-100 pt-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: ORANGE }}>
                      <User size={17} strokeWidth={2.4} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-gray-950">{testimonial.name}</p>
                      <p className="truncate text-xs font-semibold text-gray-400">{testimonial.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="bg-gray-50 px-4 py-16 sm:px-6 lg:py-20">
          <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="mb-3 text-xs font-black uppercase tracking-widest" style={{ color: ORANGE }}>Contact</p>
              <h2 className="text-3xl font-black text-gray-950 sm:text-4xl">Parlons de votre restaurant</h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-gray-500 sm:text-base">Laissez vos coordonnées, on vous rappelle dans les 24h ouvrées avec une démo adaptée à votre salle.</p>

              <div className="mt-8 space-y-3">
                <a href="tel:+2250788339882" className="flex items-center gap-3 text-sm font-bold text-gray-700 transition-colors hover:text-gray-950">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-gray-900 shadow-sm">
                    <Phone size={16} />
                  </span>
                  +225 07 88 33 98 82
                </a>
                <a href="mailto:lemenunumerique@gmail.com" className="flex min-w-0 items-center gap-3 text-sm font-bold text-gray-700 transition-colors hover:text-gray-950">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-gray-900 shadow-sm">
                    <Mail size={16} />
                  </span>
                  <span className="min-w-0 break-all">lemenunumerique@gmail.com</span>
                </a>
              </div>
            </div>

            <div className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
              {sent ? (
                <div className="py-10 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-green-100">
                    <Check size={28} className="text-green-600" strokeWidth={3} />
                  </div>
                  <p className="text-xl font-black text-gray-950">Message reçu</p>
                  <p className="mt-2 text-sm text-gray-500">On vous rappelle dans les 24h ouvrées.</p>
                </div>
              ) : (
                <form onSubmit={handleContact} className="space-y-4">
                  {CONTACT_FIELDS.map((field) => (
                    <div key={field.key}>
                      <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500">
                        {field.label}
                      </label>
                      <input
                        type={field.type}
                        placeholder={field.placeholder}
                        required={field.required}
                        value={form[field.key]}
                        onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-orange-300 focus:bg-white"
                      />
                    </div>
                  ))}

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-lg px-5 py-4 text-base font-black text-white shadow-lg shadow-orange-100"
                    style={{ backgroundColor: ORANGE }}
                  >
                    <Phone size={16} />
                    Être rappelé gratuitement
                  </motion.button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-950 px-4 py-8 text-gray-400 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 md:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ backgroundColor: ORANGE }}>
              <QrCode size={17} strokeWidth={2.6} />
            </span>
            <span className="text-lg font-black text-white">
              TABLE<span style={{ color: ORANGE }}>QR</span>
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-semibold">
            <Link href="/legal/cgu" className="transition-colors hover:text-white">CGU</Link>
            <Link href="/legal/privacy" className="transition-colors hover:text-white">Confidentialité</Link>
            <Link href="/admin/login" className="transition-colors hover:text-white">Espace restaurateur</Link>
          </div>
          <p className="text-center text-xs text-gray-500">© 2025 TableQR. Fait en Afrique de l&apos;Ouest.</p>
        </div>
      </footer>
    </div>
  )
}
