'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, QrCode, Download, ToggleLeft, ToggleRight, Users, Link, X, Check, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import type { RestaurantTable, Restaurant, QRCode } from '@/types'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')

export default function TablesAdminPage({ restaurant, initialTables }: {
  restaurant: Restaurant
  initialTables: RestaurantTable[]
}) {
  const [tables, setTables] = useState(initialTables)
  const [qrCodes, setQrCodes] = useState<QRCode[]>([])
  const [newTable, setNewTable] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const p = restaurant.primary_color

  useEffect(() => {
    fetch(`/api/qr-codes?restaurant_id=${restaurant.id}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(r => { if (r.data) setQrCodes(r.data) })
      .catch(() => {})

    // Realtime — sync automatique sur tous les appareils
    const channel = supabase.channel('qr-codes-changes')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'qr_codes',
        filter: `restaurant_id=eq.${restaurant.id}`
      }, () => {
        fetch(`/api/qr-codes?restaurant_id=${restaurant.id}`, { cache: 'no-store' })
          .then(r => r.json())
          .then(r => { if (r.data) setQrCodes(r.data) })
          .catch(() => {})
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [restaurant.id])

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

  async function unlinkQR(code: string) {
    await fetch('/api/qr-codes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unlink', code }),
    })
    setQrCodes(prev => prev.filter(q => q.code !== code))
  }

  function getQRUrl(table: RestaurantTable) {
    return `${APP_URL}/${restaurant.slug}/table/${table.id}`
  }

  function downloadQR(table: RestaurantTable) {
    const link = document.createElement('a')
    link.href = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(getQRUrl(table))}&color=000000&bgcolor=ffffff&qzone=2`
    link.download = `QR-Table-${table.table_number}-${restaurant.name}.png`
    link.target = '_blank'
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
  }

  function getPhysicalQRUrl(code: string) {
    return `${APP_URL}/t/${code}`
  }

  function downloadPhysicalQR(code: string, tableName: string) {
    const link = document.createElement('a')
    link.href = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(getPhysicalQRUrl(code))}&color=000000&bgcolor=ffffff&qzone=2`
    link.download = `QR-${tableName}-${code}.png`
    link.target = '_blank'
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
  }

  const activeTables = tables.filter(t => t.is_active).length + qrCodes.length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h2 className="font-black text-xl text-gray-900">Tables & QR Codes</h2>
            <p className="text-sm text-gray-400 mt-0.5">{activeTables} table{activeTables > 1 ? 's' : ''} active{activeTables > 1 ? 's' : ''}</p>
          </div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowLinkModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-black"
            style={{ backgroundColor: p }}>
            <Link size={15} strokeWidth={2.5} />
            Lier un QR
          </motion.button>
        </div>
      </div>

      {/* Ajouter table manuelle */}
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

      {/* Grille tables classiques */}
      <div className="px-4 sm:px-6 pb-6 max-w-7xl mx-auto">
        {tables.length > 0 && (
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Tables classiques</p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <AnimatePresence>
            {tables.map((table, i) => (
              <motion.div key={table.id}
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className={`bg-white rounded-3xl overflow-hidden shadow-sm border transition-all ${!table.is_active ? 'opacity-50' : 'border-gray-100'}`}>
                <button onClick={() => setSelectedTable(table)} className="w-full p-4 block">
                  <div className="aspect-square rounded-2xl overflow-hidden mb-3 mx-auto relative" style={{ maxWidth: '120px', backgroundColor: '#F9FAFB' }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getQRUrl(table))}&color=111111&bgcolor=FAFAFA&qzone=1`}
                      alt={`QR Table ${table.table_number}`} className="w-full h-full" />
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
                <div className="flex border-t border-gray-50">
                  <button onClick={() => downloadQR(table)}
                    className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors">
                    <Download size={13} /> QR
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
        {tables.length === 0 && qrCodes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center text-3xl mb-4">📱</div>
            <p className="font-black text-gray-900 text-lg">Aucune table</p>
            <p className="text-gray-400 text-sm mt-1 max-w-xs">Ajoutez une table manuellement ou liez un QR code physique en haut à droite</p>
          </div>
        )}
      </div>

      {/* Section QR Codes physiques */}
      {qrCodes.length > 0 && (
        <div className="px-4 sm:px-6 pb-24 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">QR Codes physiques liés</p>
            <span className="text-xs text-gray-400">{qrCodes.length} code{qrCodes.length > 1 ? 's' : ''}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {qrCodes.map((qr, i) => (
              <motion.div key={qr.id}
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className="bg-white rounded-3xl overflow-hidden shadow-sm border border-blue-100">
                <div className="p-4">
                  <div className="aspect-square rounded-2xl overflow-hidden mb-3 mx-auto relative" style={{ maxWidth: '120px', backgroundColor: '#F0F9FF' }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getPhysicalQRUrl(qr.code))}&color=111111&bgcolor=F0F9FF&qzone=1`}
                      alt={qr.code} className="w-full h-full" />
                    <div className="absolute top-1 right-1">
                      <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-bold">PHY</span>
                    </div>
                  </div>
                  <p className="font-black text-gray-900 text-center text-sm">{qr.table_name}</p>
                  <p className="text-xs text-gray-400 text-center mt-0.5 font-mono tracking-wide">{qr.code}</p>
                  {qr.scan_count > 0 && (
                    <p className="text-xs text-blue-500 text-center mt-1 font-semibold">{qr.scan_count} scan{qr.scan_count > 1 ? 's' : ''}</p>
                  )}
                </div>
                <div className="flex border-t border-blue-50">
                  <button onClick={() => downloadPhysicalQR(qr.code, qr.table_name || qr.code)}
                    className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors">
                    <Download size={13} /> QR
                  </button>
                  <div className="w-px bg-blue-50" />
                  <button onClick={() => unlinkQR(qr.code)}
                    className="flex-1 py-2.5 flex items-center justify-center gap-1 text-xs font-bold text-red-400 hover:bg-red-50 transition-colors">
                    <Trash2 size={13} /> Délier
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Modal détail QR classique */}
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
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(getQRUrl(selectedTable))}&color=111111&bgcolor=F9FAFB&qzone=2`}
                    alt="QR Code" className="w-48 h-48 rounded-xl" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-5 font-mono break-all bg-gray-50 px-3 py-2 rounded-xl">{getQRUrl(selectedTable)}</p>
              <div className="flex gap-3">
                <button onClick={() => navigator.clipboard.writeText(getQRUrl(selectedTable))}
                  className="flex-1 py-3.5 rounded-2xl bg-gray-100 text-gray-700 font-bold text-sm">
                  Copier le lien
                </button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => downloadQR(selectedTable)}
                  className="flex-1 py-3.5 rounded-2xl text-white font-bold text-sm" style={{ backgroundColor: p }}>
                  ⬇️ Télécharger
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Lier un QR */}
      <AnimatePresence>
        {showLinkModal && (
          <LinkQRModal
            restaurantId={restaurant.id}
            onClose={() => setShowLinkModal(false)}
            onLinked={(qr) => setQrCodes(prev => [qr, ...prev.filter(q => q.code !== qr.code)])}
            primaryColor={p}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function LinkQRModal({ restaurantId, onClose, onLinked, primaryColor }: {
  restaurantId: string
  onClose: () => void
  onLinked: (qr: QRCode) => void
  primaryColor: string
}) {
  const [code, setCode] = useState('')
  const [tableName, setTableName] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function link() {
    const cleanCode = code.trim().toUpperCase()
    if (!cleanCode || !tableName.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/qr-codes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'link', code: cleanCode, restaurant_id: restaurantId, table_name: tableName.trim() }),
      })
      const result = await res.json()
      if (res.ok) {
        setSuccess(true)
        onLinked(result.data)
        setTimeout(() => {
          setSuccess(false); setCode(''); setTableName('')
        }, 1500)
      } else {
        setError(result.error || 'Erreur')
      }
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="relative bg-white w-full max-w-md mx-auto rounded-t-[2rem] p-6"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-black text-xl text-gray-900">Lier un QR Code</h3>
            <p className="text-xs text-gray-400 mt-0.5">Associer un QR physique à une table</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-2xl bg-gray-100 flex items-center justify-center">
            <X size={15} className="text-gray-600" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1.5">Code QR *</label>
            <input
              type="text"
              placeholder="Ex: A3F7K2M9"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              maxLength={8}
              className="w-full px-4 py-3 rounded-2xl bg-gray-50 text-sm outline-none border border-gray-100 focus:border-blue-300 font-mono tracking-widest text-center text-lg font-black uppercase"
            />
            <p className="text-xs text-gray-400 mt-1.5">Le code est imprimé sous le QR (8 caractères)</p>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1.5">Nom de la table *</label>
            <input
              type="text"
              placeholder="Ex: Table 4, Terrasse 2, Bar..."
              value={tableName}
              onChange={e => setTableName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-gray-50 text-sm outline-none border border-gray-100 focus:border-blue-300"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 font-semibold bg-red-50 px-3 py-2 rounded-xl">{error}</p>
          )}
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={link}
          disabled={loading || !code.trim() || !tableName.trim() || success}
          className="w-full mt-6 py-4 rounded-2xl font-black text-white text-sm disabled:opacity-40 transition-colors"
          style={{ backgroundColor: success ? '#10B981' : primaryColor }}>
          {success ? '✅ QR lié avec succès !' : loading ? 'Liaison...' : `🔗 Lier ce QR à "${tableName || '...'}`}
        </motion.button>

        <p className="text-xs text-center text-gray-400 mt-3">
          Reste en mode liaison — tu peux enchaîner plusieurs QR
        </p>
      </motion.div>
    </motion.div>
  )
}
