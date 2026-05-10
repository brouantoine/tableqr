'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'
import { Globe, Phone, Mail, Store, Palette, Check } from 'lucide-react'
import RestaurantLogo, { getRestaurantLogoUrl } from '@/components/RestaurantLogo'
import type { Restaurant } from '@/types'

type EditableRestaurantKey =
  | 'name'
  | 'description'
  | 'city'
  | 'phone'
  | 'email'
  | 'primary_color'
  | 'secondary_color'
  | 'accent_color'
  | 'bot_name'
  | 'currency'
type TextFieldKey = Extract<EditableRestaurantKey, 'name' | 'city' | 'phone' | 'email'>
type ColorFieldKey = Extract<EditableRestaurantKey, 'primary_color' | 'secondary_color' | 'accent_color'>

export default function SettingsPage({ restaurant: init }: { restaurant: Restaurant }) {
  const [restaurant, setRestaurant] = useState(init)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const p = restaurant.primary_color
  const logoUrl = getRestaurantLogoUrl(restaurant.logo_url)

  function set(key: EditableRestaurantKey, value: string) { setRestaurant(prev => ({ ...prev, [key]: value })) }

  async function save() {
    setSaving(true)
    await supabase.from('restaurants').update({
      name: restaurant.name, description: restaurant.description,
      city: restaurant.city, phone: restaurant.phone, email: restaurant.email,
      primary_color: restaurant.primary_color, secondary_color: restaurant.secondary_color,
      accent_color: restaurant.accent_color, bot_name: restaurant.bot_name, currency: restaurant.currency,
    }).eq('id', restaurant.id)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-black text-xl text-gray-900">Paramètres</h2>
          <p className="text-sm text-gray-400 mt-0.5">Configuration de votre restaurant</p>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-5 max-w-7xl mx-auto pb-32 space-y-4">

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50">
            {logoUrl ? (
              <RestaurantLogo src={logoUrl} alt={restaurant.name} className="w-9 h-9 rounded-xl bg-white border border-gray-100" />
            ) : (
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: p + '15' }}>
                <Store size={16} style={{ color: p }} />
              </div>
            )}
            <p className="font-black text-gray-900 text-sm">Informations générales</p>
          </div>
          <div className="px-5 py-4 space-y-4">
            {([
              { label: 'Nom du restaurant', key: 'name', type: 'text', placeholder: 'Chez Kofi', icon: Store },
              { label: 'Ville', key: 'city', type: 'text', placeholder: 'Abidjan', icon: Globe },
              { label: 'Téléphone', key: 'phone', type: 'tel', placeholder: '+225 07 00 00 00', icon: Phone },
              { label: 'Email', key: 'email', type: 'email', placeholder: 'contact@restaurant.com', icon: Mail },
            ] satisfies Array<{ label: string; key: TextFieldKey; type: string; placeholder: string; icon: typeof Store }>).map(f => (
              <div key={f.key}>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">{f.label}</label>
                <div className="relative">
                  <f.icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={f.type} placeholder={f.placeholder}
                    value={restaurant[f.key] || ''}
                    onChange={e => set(f.key, e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-50 text-sm outline-none border border-gray-100 focus:border-orange-300" />
                </div>
              </div>
            ))}
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5">Description</label>
              <textarea value={restaurant.description || ''} onChange={e => set('description', e.target.value)}
                placeholder="Décrivez votre restaurant..." rows={3}
                className="w-full px-4 py-3 rounded-2xl bg-gray-50 text-sm outline-none border border-gray-100 resize-none" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: p + '15' }}>
              <Palette size={16} style={{ color: p }} />
            </div>
            <p className="font-black text-gray-900 text-sm">Couleurs & Design</p>
          </div>
          <div className="px-5 py-4 space-y-4">
            {([
              { label: 'Couleur principale', key: 'primary_color' },
              { label: 'Couleur secondaire', key: 'secondary_color' },
              { label: 'Couleur accent', key: 'accent_color' },
            ] satisfies Array<{ label: string; key: ColorFieldKey }>).map(c => (
              <div key={c.key}>
                <label className="text-xs font-bold text-gray-500 block mb-2">{c.label}</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={restaurant[c.key]}
                    onChange={e => set(c.key, e.target.value)}
                    className="w-12 h-12 rounded-2xl border-0 cursor-pointer p-1 bg-gray-50" />
                  <input type="text" value={restaurant[c.key]}
                    onChange={e => set(c.key, e.target.value)}
                    className="flex-1 px-4 py-3 rounded-2xl bg-gray-50 text-sm font-mono outline-none border border-gray-100" />
                  <div className="w-12 h-12 rounded-2xl flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: restaurant[c.key] }} />
                </div>
              </div>
            ))}
            <div className="rounded-2xl p-4 mt-2" style={{ backgroundColor: restaurant.primary_color + '08' }}>
              <p className="text-xs text-gray-500 mb-2 font-bold">Aperçu</p>
              <div className="flex gap-2">
                {(['primary_color', 'secondary_color', 'accent_color'] satisfies ColorFieldKey[]).map((k, i) => (
                  <div key={k} className="flex-1 py-2.5 rounded-xl text-xs text-white text-center font-bold"
                    style={{ backgroundColor: restaurant[k] }}>
                    {['Principal', 'Secondaire', 'Accent'][i]}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: p + '15' }}>
              <Globe size={16} style={{ color: p }} />
            </div>
            <p className="font-black text-gray-900 text-sm">Devise & Plan</p>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5">Devise</label>
              <select value={restaurant.currency} onChange={e => set('currency', e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-gray-50 text-sm outline-none border border-gray-100">
                <option value="XOF">XOF — Franc CFA (UEMOA)</option>
                <option value="XAF">XAF — Franc CFA (CEMAC)</option>
                <option value="EUR">EUR — Euro</option>
                <option value="USD">USD — Dollar</option>
                <option value="GHS">GHS — Cedi ghanéen</option>
                <option value="NGN">NGN — Naira nigérian</option>
              </select>
            </div>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50">
              <div>
                <p className="font-bold text-sm text-gray-900">Plan actuel</p>
                <p className="text-xs text-gray-400 mt-0.5">Votre abonnement TableQR</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm px-3 py-1 rounded-full font-black ${
                  restaurant.plan === 'enterprise' ? 'bg-purple-100 text-purple-600' :
                  restaurant.plan === 'pro' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                }`}>{restaurant.plan?.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="fixed bottom-16 left-0 right-0 px-4 sm:px-6 max-w-lg mx-auto z-20">
        <motion.button whileTap={{ scale: 0.97 }} onClick={save} disabled={saving}
          className="w-full py-4 rounded-2xl text-white font-black shadow-xl flex items-center justify-center gap-2 transition-all disabled:opacity-60"
          style={{
            backgroundColor: saved ? '#10B981' : p,
            boxShadow: `0 8px 30px ${saved ? '#10B98150' : p + '50'}`
          }}>
          {saved ? <><Check size={18} strokeWidth={3} /> Sauvegardé !</> : saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
        </motion.button>
      </div>
    </div>
  )
}
