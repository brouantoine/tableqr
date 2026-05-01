'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'
import { Plus, X, Check, Users, ChefHat, User, UserCog } from 'lucide-react'

function iconForRole(role: string) {
  const r = role.toLowerCase()
  if (r.includes('chef') || r.includes('cuisin')) return ChefHat
  if (r.includes('manager') || r.includes('gérant') || r.includes('gerant') || r.includes('patron') || r.includes('proprié')) return UserCog
  return User
}

interface Staff {
  id: string
  restaurant_id: string
  name: string
  role: string
  color: string
  is_active_today: boolean
}

const COLORS = ['#F26522', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444', '#06B6D4']

export function StaffSelector({ restaurantId, primaryColor }: { restaurantId: string; primaryColor: string }) {
  const [staff, setStaff] = useState<Staff[]>([])
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('Serveur')
  const [newColor, setNewColor] = useState('#F26522')
  const p = primaryColor

  useEffect(() => {
    loadStaff()
  }, [restaurantId])

  async function loadStaff() {
    const { data } = await supabase.from('restaurant_staff')
      .select('*').eq('restaurant_id', restaurantId).order('name')
    setStaff(data || [])
  }

  async function toggleActive(member: Staff) {
    await supabase.from('restaurant_staff')
      .update({ is_active_today: !member.is_active_today })
      .eq('id', member.id)
    setStaff(prev => prev.map(s => s.id === member.id ? { ...s, is_active_today: !s.is_active_today } : s))
  }

  async function addStaff() {
    if (!newName.trim()) return
    const { data } = await supabase.from('restaurant_staff').insert({
      restaurant_id: restaurantId, name: newName.trim(), role: newRole, color: newColor, is_active_today: false
    }).select().single()
    if (data) setStaff(prev => [...prev, data as Staff])
    setNewName('')
    setShowForm(false)
  }

  async function deleteStaff(id: string) {
    await supabase.from('restaurant_staff').delete().eq('id', id)
    setStaff(prev => prev.filter(s => s.id !== id))
  }

  const activeStaff = staff.filter(s => s.is_active_today)

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: p + '15' }}>
            <Users size={16} style={{ color: p }} />
          </div>
          <div>
            <p className="font-black text-gray-900 text-sm">Équipe du jour</p>
            <p className="text-xs text-gray-400">{activeStaff.length} actif{activeStaff.length > 1 ? 's' : ''} aujourd&apos;hui</p>
          </div>
        </div>
        <motion.button whileTap={{ scale: 0.94 }} onClick={() => setShowForm(true)}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
          style={{ backgroundColor: p }}>
          <Plus size={15} strokeWidth={3} />
        </motion.button>
      </div>

      {staff.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-400 text-sm">Aucun membre — ajoutez votre équipe</p>
        </div>
      ) : (
        <div className="space-y-2">
          {staff.map(member => (
            <motion.div key={member.id} layout
              className="flex items-center gap-3 p-3 rounded-2xl transition-all"
              style={{ backgroundColor: member.is_active_today ? member.color + '10' : '#F9FAFB', border: `1.5px solid ${member.is_active_today ? member.color + '30' : '#E5E7EB'}` }}>
              {(() => {
                const RoleIcon = iconForRole(member.role)
                return (
                  <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-white flex-shrink-0"
                    style={{ backgroundColor: member.color }}>
                    <RoleIcon size={16} strokeWidth={2.2} />
                  </div>
                )
              })()}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-900">{member.name}</p>
                <p className="text-xs text-gray-400">{member.role}</p>
              </div>
              <div className="flex items-center gap-2">
                {member.is_active_today && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold text-white"
                    style={{ backgroundColor: member.color }}>En service</span>
                )}
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => toggleActive(member)}
                  className="w-7 h-7 rounded-xl flex items-center justify-center transition-all"
                  style={member.is_active_today
                    ? { backgroundColor: member.color, color: '#fff' }
                    : { backgroundColor: '#E5E7EB', color: '#9CA3AF' }}>
                  <Check size={13} strokeWidth={3} />
                </motion.button>
                <button onClick={() => deleteStaff(member.id)}
                  className="w-7 h-7 rounded-xl bg-red-50 flex items-center justify-center text-red-400">
                  <X size={13} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Formulaire ajout */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Nom</label>
                <input type="text" placeholder="Rosa Evelyne" value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 outline-none text-sm"
                  style={{ fontSize: '16px' }} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Rôle</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 outline-none text-sm">
                  <option>Serveur</option>
                  <option>Serveuse</option>
                  <option>Chef</option>
                  <option>Caissier</option>
                  <option>Caissière</option>
                  <option>Manager</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5">Couleur</label>
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setNewColor(c)}
                    className="w-7 h-7 rounded-full border-2 transition-all"
                    style={{ backgroundColor: c, borderColor: newColor === c ? '#111' : 'transparent' }} />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <motion.button whileTap={{ scale: 0.97 }} onClick={addStaff}
                disabled={!newName.trim()}
                className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-40"
                style={{ backgroundColor: p }}>
                Ajouter
              </motion.button>
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-xl bg-gray-200 text-gray-600 font-bold text-sm">
                Annuler
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
