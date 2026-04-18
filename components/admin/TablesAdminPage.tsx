'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, QrCode, Download, ToggleLeft, ToggleRight, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import type { RestaurantTable, Restaurant } from '@/types'

export default function TablesAdminPage({ restaurant, initialTables }: {
  restaurant: Restaurant
  initialTables: RestaurantTable[]
}) {
  const [tables, setTables] = useState(initialTables)
  const [newTable, setNewTable] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null)
  const p = restaurant.primary_color
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')

  async function addTable() {
    if (!newTable.trim()) return
    setLoading(true)
    const qr_code = crypto.randomUUID()
    const { data } = await supabase.from('restaurant_tables')
      .insert({ restaurant_id: restaurant.id, table_number: newTable.trim(), qr_code, capacity: 4, is_active: true })
      .select().single()
    if (data) setTables(prev => [...prev, data as RestaurantTable])
    setNewTable('')
    setLoading(false)
  }

  async function toggleTable(table: RestaurantTable) {
    await supabase.from('restaurant_tables').update({ is_active: !table.is_active }).eq('id', table.id)
    setTables(prev => prev.map(t => t.id === table.id ? { ...t, is_active: !t.is_active } : t))
  }

  function getQRUrl(table: RestaurantTable) {
    return `${appUrl}/${restaurant.slug}/table/${table.id}`
  }

  function downloadQR(table: RestaurantTable) {
    const link = document.createElement('a')
    link.href = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(getQRUrl(table))}&color=000000&bgcolor=ffffff&qzone=2`
    link.download = `QR-Table-${table.table_number}-${restaurant.name}.png`
    link.target = '_blank'
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
  }

  const activeTables = tables.filter(t => t.is_active).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h2 className="font-black text-xl text-gray-900">Tables & QR Codes</h2>
            <p className="text-sm text-gray-400 mt-0.5">{activeTables} table{activeTables > 1 ? 's' : ''} active{activeTables > 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Ajouter table */}
      <div className="px-4 sm:px-6 py-4 max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-3">
          <input value={newTable} onChange={e => setNewTable(e.target.value)}
            placeholder="N° de table (ex: 1, A1, Terrasse 3...)"
            onKeyDown={e => e.key === 'Enter' && addTable()}
            className="flex-1 px-4 py-3 rounded-xl bg-gray-50 text-sm outline-none border border-gray-100" />
          <motion.button whileTap={{ scale: 0.95 }} onClick={addTable} disabled={loading || !newTable.trim()}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-black disabled:opacity-40 flex-shrink-0"
            style={{ backgroundColor: p }}>
            <Plus size={16} strokeWidth={3} />
            Ajouter
          </motion.button>
        </div>
      </div>

      {/* Grille tables */}
      <div className="px-4 sm:px-6 pb-24 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <AnimatePresence>
            {tables.map((table, i) => (
              <motion.div key={table.id}
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className={`bg-white rounded-3xl overflow-hidden shadow-sm border transition-all ${!table.is_active ? 'opacity-50' : 'border-gray-100'}`}>

                {/* QR Code */}
                <button onClick={() => setSelectedTable(table)} className="w-full p-4 block">
                  <div className="aspect-square rounded-2xl overflow-hidden mb-3 mx-auto relative"
                    style={{ maxWidth: '120px', backgroundColor: '#F9FAFB' }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getQRUrl(table))}&color=111111&bgcolor=FAFAFA&qzone=1`}
                      alt={`QR Table ${table.table_number}`}
                      className="w-full h-full"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/10 rounded-2xl">
                      <QrCode size={24} className="text-white" />
                    </div>
                  </div>
                  <p className="font-black text-gray-900 text-center text-sm">Table {table.table_number}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Users size={11} className="text-gray-400" />
                    <p className="text-xs text-gray-400">{table.capacity} pers.</p>
                  </div>
                </button>

                {/* Actions */}
                <div className="flex border-t border-gray-50">
                  <button onClick={() => downloadQR(table)}
                    className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors">
                    <Download size={13} />
                    QR
                  </button>
                  <div className="w-px bg-gray-50" />
                  <button onClick={() => toggleTable(table)}
                    className="flex-1 py-2.5 flex items-center justify-center gap-1 text-xs font-bold hover:bg-gray-50 transition-colors"
                    style={{ color: table.is_active ? '#10B981' : '#9CA3AF' }}>
                    {table.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    {table.is_active ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {tables.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center text-3xl mb-4">📱</div>
            <p className="font-black text-gray-900 text-lg">Aucune table</p>
            <p className="text-gray-400 text-sm mt-1">Ajoutez votre première table ci-dessus</p>
          </div>
        )}
      </div>

      {/* Modal détail QR */}
      <AnimatePresence>
        {selectedTable && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center p-0 sm:p-4">
            <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedTable(null)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28 }}
              className="relative bg-white w-full sm:max-w-sm sm:rounded-3xl rounded-t-[2rem] p-6 text-center"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <h3 className="font-black text-xl text-gray-900 mb-1">Table {selectedTable.table_number}</h3>
              <p className="text-xs text-gray-400 mb-5">{restaurant.name}</p>

              <div className="flex justify-center mb-5">
                <div className="p-4 bg-gray-50 rounded-3xl shadow-inner">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(getQRUrl(selectedTable))}&color=111111&bgcolor=F9FAFB&qzone=2`}
                    alt="QR Code" className="w-48 h-48 rounded-xl" />
                </div>
              </div>

              <p className="text-xs text-gray-400 mb-5 font-mono break-all bg-gray-50 px-3 py-2 rounded-xl">
                {getQRUrl(selectedTable)}
              </p>

              <div className="flex gap-3">
                <button onClick={() => navigator.clipboard.writeText(getQRUrl(selectedTable))}
                  className="flex-1 py-3.5 rounded-2xl bg-gray-100 text-gray-700 font-bold text-sm">
                  Copier le lien
                </button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => downloadQR(selectedTable)}
                  className="flex-1 py-3.5 rounded-2xl text-white font-bold text-sm"
                  style={{ backgroundColor: p }}>
                  ⬇️ Télécharger
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
