'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Eye, EyeOff, Edit2, X, Check, Flame, Leaf, Search, Image, UtensilsCrossed, Camera } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'
import type { MenuCategory, MenuItem, Restaurant } from '@/types'
import ImagePickerModal from './ImagePickerModal'



export default function MenuAdminPage({ restaurant, initialCategories }: {
  restaurant: Restaurant
  initialCategories: MenuCategory[]
}) {
  const [categories, setCategories] = useState(initialCategories)
  const [activeCategory, setActiveCategory] = useState(initialCategories[0]?.id)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Partial<MenuItem> | null>(null)
  const [showCatForm, setShowCatForm] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatIcon, setNewCatIcon] = useState('🍽️')
  const [search, setSearch] = useState('')
  const p = restaurant.primary_color

  const activeItems = search
    ? categories.flatMap(c => c.items || []).filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : categories.find(c => c.id === activeCategory)?.items || []

  async function toggleAvailable(item: MenuItem) {
    await supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id)
    setCategories(prev => prev.map(c => ({
      ...c, items: (c.items || []).map(i => i.id === item.id ? { ...i, is_available: !i.is_available } : i)
    })))
  }

  async function deleteItem(item: MenuItem) {
    if (!confirm(`Supprimer "${item.name}" ?`)) return
    await supabase.from('menu_items').delete().eq('id', item.id)
    setCategories(prev => prev.map(c => ({
      ...c, items: (c.items || []).filter(i => i.id !== item.id)
    })))
  }

  async function saveItem(data: Partial<MenuItem>) {
    if (data.id) {
      const { data: updated } = await supabase.from('menu_items').update(data).eq('id', data.id).select().single()
      if (updated) setCategories(prev => prev.map(c => ({
        ...c, items: (c.items || []).map(i => i.id === data.id ? { ...i, ...updated } : i)
      })))
    } else {
      const { data: created } = await supabase.from('menu_items')
        .insert({ ...data, restaurant_id: restaurant.id }).select().single()
      if (created) setCategories(prev => prev.map(c =>
        c.id === data.category_id ? { ...c, items: [...(c.items || []), created as MenuItem] } : c
      ))
    }
    setEditItem(null)
    setShowForm(false)
  }

  async function addCategory() {
    if (!newCatName.trim()) return
    const { data } = await supabase.from('menu_categories')
      .insert({ restaurant_id: restaurant.id, name: newCatName, icon: newCatIcon, position: categories.length, is_active: true })
      .select().single()
    if (data) { setCategories(prev => [...prev, { ...data as MenuCategory, items: [] }]); setActiveCategory(data.id) }
    setNewCatName(''); setShowCatForm(false)
  }

  const ICONS = ['🍽️','🍗','🥩','🐟','🍚','🥗','🍜','🥘','🍕','🥪','🧆','🍟','🥤','🧃','🍺','☕','🧁','🍰','🍦','🧇']

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-gray-900">Gestion du menu</h2>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => {
            setEditItem({ category_id: activeCategory, allergens: [], is_vegetarian: false, is_vegan: false, is_halal: false, is_spicy: false, spicy_level: 0, is_available: true, order_count: 0, position: 0 })
            setShowForm(true)
          }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-white text-sm font-bold"
            style={{ backgroundColor: p }}>
            <Plus size={15} /> Ajouter
          </motion.button>
        </div>
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-50 text-sm outline-none" />
        </div>
      </div>

      {/* Catégories */}
      {!search && (
        <div className="bg-white border-b">
          <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                style={activeCategory === cat.id ? { backgroundColor: p, color: '#fff' } : { backgroundColor: '#F5F5F5', color: '#555' }}>
                {cat.icon} {cat.name}
                <span className="opacity-60">({(cat.items || []).length})</span>
              </button>
            ))}
            <button onClick={() => setShowCatForm(true)}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-gray-100 text-gray-500 border border-dashed border-gray-300">
              <Plus size={12} /> Catégorie
            </button>
          </div>
        </div>
      )}

      {/* Liste plats */}
      <div className="p-4 space-y-3">
        <AnimatePresence>
          {activeItems.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`bg-white rounded-2xl p-4 shadow-sm flex gap-3 ${!item.is_available ? 'opacity-60' : ''}`}>
              {item.image_url
                ? <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                : <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: p + '15' }}><UtensilsCrossed size={24} style={{ color: p }} /></div>
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-sm text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {item.is_spicy && <Flame size={12} className="text-red-500" />}
                    {item.is_vegetarian && <Leaf size={12} className="text-green-500" />}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-black text-sm" style={{ color: p }}>{formatPrice(item.price, restaurant.currency)}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleAvailable(item)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100">
                      {item.is_available ? <Eye size={13} className="text-gray-500" /> : <EyeOff size={13} className="text-gray-400" />}
                    </button>
                    <button onClick={() => { setEditItem(item); setShowForm(true) }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100">
                      <Edit2 size={13} className="text-gray-500" />
                    </button>
                    <button onClick={() => deleteItem(item)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-50">
                      <X size={13} className="text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {activeItems.length === 0 && (
          <div className="text-center py-16">
            <UtensilsCrossed size={40} className="text-gray-300 mb-2 mx-auto" />
            <p className="text-gray-400 font-medium">Aucun plat dans cette catégorie</p>
            <button onClick={() => { setEditItem({ category_id: activeCategory, allergens: [], is_vegetarian: false, is_vegan: false, is_halal: false, is_spicy: false, spicy_level: 0, is_available: true, order_count: 0, position: 0 }); setShowForm(true) }}
              className="mt-3 text-sm font-bold" style={{ color: p }}>+ Ajouter un plat</button>
          </div>
        )}
      </div>

      {/* MODAL NOUVELLE CATÉGORIE */}
      <AnimatePresence>
        {showCatForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowCatForm(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28 }}
              className="relative bg-white w-full max-w-md mx-auto rounded-t-3xl p-6"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <h3 className="font-black text-lg mb-4">Nouvelle catégorie</h3>
              <input type="text" placeholder="Ex: Plats principaux" value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-gray-50 text-sm outline-none mb-4" />
              <p className="text-xs font-bold text-gray-500 mb-2">Icône</p>
              <div className="grid grid-cols-10 gap-2 mb-5">
                {ICONS.map(icon => (
                  <button key={icon} onClick={() => setNewCatIcon(icon)}
                    className={`text-xl p-1.5 rounded-xl ${newCatIcon === icon ? 'bg-orange-100 ring-2 ring-orange-400' : 'bg-gray-50'}`}>
                    {icon}
                  </button>
                ))}
              </div>
              <button onClick={addCategory} disabled={!newCatName.trim()}
                className="w-full py-3.5 rounded-2xl text-white font-bold disabled:opacity-40"
                style={{ backgroundColor: p }}>
                Créer la catégorie
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL PLAT */}
      <AnimatePresence>
        {showForm && editItem && (
          <ItemFormModal
            item={editItem}
            restaurant={restaurant}
            categories={categories}
            onSave={saveItem}
            onClose={() => { setShowForm(false); setEditItem(null) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function ItemFormModal({ item, restaurant, categories, onSave, onClose }: {
  item: Partial<MenuItem>
  restaurant: Restaurant
  categories: MenuCategory[]
  onSave: (data: Partial<MenuItem>) => void
  onClose: () => void
}) {
  const [form, setForm] = useState(item)
  const [loading, setLoading] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const p = restaurant.primary_color

  function set(key: string, value: any) { setForm(prev => ({ ...prev, [key]: value })) }

  async function handleSave() {
    if (!form.name || !form.price) return
    setLoading(true)
    await onSave(form)
    setLoading(false)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="relative bg-white w-full max-w-md mx-auto rounded-t-[2rem] max-h-[92vh] flex flex-col"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="font-black text-lg">{form.id ? 'Modifier le plat' : 'Nouveau plat'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-2xl bg-gray-100 flex items-center justify-center">
            <X size={15} className="text-gray-600" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
          {/* Catégorie */}
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1.5">Catégorie</label>
            <select value={form.category_id || ''} onChange={e => set('category_id', e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-gray-50 text-sm outline-none">
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          {/* Nom + Prix */}
          {[
            { label: 'Nom du plat *', key: 'name', type: 'text', placeholder: 'Ex: Attiéké Poisson' },
            { label: `Prix (${restaurant.currency}) *`, key: 'price', type: 'number', placeholder: '2500' },
            { label: 'Description', key: 'description', type: 'text', placeholder: 'Description courte...' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs font-bold text-gray-500 block mb-1.5">{f.label}</label>
              <input type={f.type} placeholder={f.placeholder}
                value={(form as any)[f.key] || ''}
                onChange={e => set(f.key, f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-gray-50 text-sm outline-none" />
            </div>
          ))}
          {/* Image picker */}
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1.5">Photo du plat</label>
            {form.image_url ? (
              <div className="relative rounded-2xl overflow-hidden">
                <img src={form.image_url} alt="" className="w-full h-40 object-cover" />
                <button onClick={() => setShowPicker(true)}
                  className="absolute bottom-2 right-2 px-3 py-1.5 rounded-xl bg-black/60 text-white text-xs font-bold backdrop-blur">
                  Changer
                </button>
                <button onClick={() => set('image_url', '')}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center backdrop-blur">
                  <X size={13} className="text-white" />
                </button>
              </div>
            ) : (
              <button onClick={() => setShowPicker(true)}
                className="w-full h-32 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-2 hover:bg-gray-100 transition-colors">
                <Camera size={24} className="text-gray-400" />
                <span className="text-sm font-bold text-gray-500">Ajouter une photo</span>
                <span className="text-xs text-gray-400">Bibliothèque · Caméra · URL</span>
              </button>
            )}
          </div>
          <AnimatePresence>
            {showPicker && (
              <ImagePickerModal
                restaurantId={restaurant.id}
                onSelect={(url: string) => { set('image_url', url); setShowPicker(false) }}
                onClose={() => setShowPicker(false)}
              />
            )}
          </AnimatePresence>
          {/* Options */}
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-2">Options</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'is_vegetarian', label: '🌿 Végétarien' },
                { key: 'is_vegan', label: '🥦 Vegan' },
                { key: 'is_halal', label: '✅ Halal' },
                { key: 'is_spicy', label: '🌶️ Épicé' },
              ].map(opt => (
                <button key={opt.key} onClick={() => set(opt.key, !(form as any)[opt.key])}
                  className="flex items-center gap-2 p-3 rounded-2xl text-sm font-medium border-2 transition-all"
                  style={(form as any)[opt.key] ? { borderColor: p, backgroundColor: p + '10', color: p } : { borderColor: '#E5E7EB', color: '#6B7280' }}>
                  <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${(form as any)[opt.key] ? '' : 'border-gray-300'}`}
                    style={(form as any)[opt.key] ? { borderColor: p, backgroundColor: p } : {}}>
                    {(form as any)[opt.key] && <Check size={10} className="text-white" strokeWidth={3} />}
                  </div>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {/* Disponible */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50">
            <div>
              <p className="font-bold text-sm text-gray-900">Disponible</p>
              <p className="text-xs text-gray-400">Affiché sur le menu client</p>
            </div>
            <button onClick={() => set('is_available', !form.is_available)}
              className="w-12 h-6 rounded-full transition-all relative"
              style={{ backgroundColor: form.is_available ? p : '#D1D5DB' }}>
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.is_available ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>
        <div className="p-5 border-t">
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave}
            disabled={!form.name || !form.price || loading}
            className="w-full py-4 rounded-2xl text-white font-black text-base disabled:opacity-40"
            style={{ backgroundColor: p }}>
            {loading ? 'Sauvegarde...' : form.id ? '✓ Sauvegarder' : '+ Ajouter le plat'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}