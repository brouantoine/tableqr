'use client'
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, QrCode, Download, ToggleLeft, ToggleRight, Link, X, Check, Trash2, Printer, Layers, Link2, ChevronRight, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { generateQRPrintHTML } from '@/lib/qr-print-template'
import type { RestaurantTable, Restaurant, QRCode } from '@/types'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function getAppUrl(): string {
  return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
}

const TABLES_PER_TERRACE = 20

export default function TablesAdminPage({ restaurant, initialTables }: {
  restaurant: Restaurant
  initialTables: RestaurantTable[]
}) {
  const [tables, setTables] = useState(initialTables)
  const [qrCodes, setQrCodes] = useState<QRCode[]>([])
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [creatingTerrace, setCreatingTerrace] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const p = restaurant.primary_color

  const zones = useMemo(() => {
    const map: Record<string, RestaurantTable[]> = {}
    tables.forEach(t => {
      const z = t.zone || 'Sans section'
      if (!map[z]) map[z] = []
      map[z].push(t)
    })
    Object.values(map).forEach(arr => arr.sort((a, b) => Number(a.table_number) - Number(b.table_number)))
    return map
  }, [tables])

  const linkedMap = useMemo(() => {
    const map: Record<string, QRCode> = {}
    qrCodes.forEach(q => {
      if (q.table_name && UUID_REGEX.test(q.table_name)) map[q.table_name] = q
    })
    return map
  }, [qrCodes])

  const linkedTableIds = useMemo(() => new Set(Object.keys(linkedMap)), [linkedMap])

  useEffect(() => {
    if (initialTables.length === 0) createTerrace(1)

    fetch(`/api/qr-codes?restaurant_id=${restaurant.id}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(r => { if (r.data) setQrCodes(r.data) })
      .catch(() => {})

    const channel = supabase.channel('qr-codes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'qr_codes', filter: `restaurant_id=eq.${restaurant.id}` },
        () => {
          fetch(`/api/qr-codes?restaurant_id=${restaurant.id}`, { cache: 'no-store' })
            .then(r => r.json())
            .then(r => { if (r.data) setQrCodes(r.data) })
            .catch(() => {})
        })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [restaurant.id])

  async function createTerrace(n: number) {
    setCreatingTerrace(true)
    const zoneName = `Terrasse ${n}`
    const rows = Array.from({ length: TABLES_PER_TERRACE }, (_, i) => ({
      restaurant_id: restaurant.id,
      table_number: String(i + 1),
      zone: zoneName,
      qr_code: crypto.randomUUID(),
      capacity: 4,
      is_active: true,
    }))
    const { data } = await supabase.from('restaurant_tables').insert(rows).select()
    if (data) setTables(prev => [...prev, ...data as RestaurantTable[]])
    setCreatingTerrace(false)
  }

  async function migrateUnzoned() {
    const unzoned = tables.filter(t => !t.zone)
    if (!unzoned.length) return
    setMigrating(true)
    const ids = unzoned.map(t => t.id)
    await supabase
      .from('restaurant_tables')
      .update({ zone: 'Terrasse 1' })
      .in('id', ids)
    setTables(prev => prev.map(t => !t.zone ? { ...t, zone: 'Terrasse 1' } : t))
    setMigrating(false)
  }

  function handleAddTerrace() {
    const existingZones = Object.keys(zones).filter(z => z !== 'Sans section')
    createTerrace(existingZones.length + 1)
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

  function getTableQRUrl(table: RestaurantTable) {
    return `${getAppUrl()}/${restaurant.slug}/table/${table.id}`
  }

  function getPhysicalQRUrl(code: string) {
    return `${getAppUrl()}/t/${code}`
  }

  function getQRDisplayName(qr: QRCode): string {
    if (qr.table_name && UUID_REGEX.test(qr.table_name)) {
      const t = tables.find(t => t.id === qr.table_name)
      if (t) return `${t.zone ? t.zone + ' · ' : ''}Table ${t.table_number}`
    }
    return qr.table_name || qr.code
  }

  function downloadQR(table: RestaurantTable) {
    const url = getTableQRUrl(table)
    const link = document.createElement('a')
    link.href = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(url)}&color=000000&bgcolor=ffffff&qzone=2`
    link.download = `QR-${table.zone || ''}-Table${table.table_number}-${restaurant.name}.png`
    link.target = '_blank'
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
  }

  function downloadPhysicalQR(code: string, displayName: string) {
    const link = document.createElement('a')
    link.href = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(getPhysicalQRUrl(code))}&color=000000&bgcolor=ffffff&qzone=2`
    link.download = `QR-${displayName}-${code}.png`
    link.target = '_blank'
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
  }

  function printZone(zoneName: string, zoneTables: RestaurantTable[]) {
    const active = zoneTables.filter(t => t.is_active)
    if (!active.length) return
    const appUrl = getAppUrl()
    const rows = active.map(table => {
      const url = `${appUrl}/${restaurant.slug}/table/${table.id}`
      const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}&color=000000&bgcolor=FFFFFF&qzone=1`
      return `<div class="label"><div class="card"><div class="badge">${zoneName} · ${table.table_number}</div><img class="qr-img" src="${qrSrc}" alt="${table.table_number}" /><div class="text-main">Scanner pour le menu</div></div><div class="code-text">${restaurant.name}</div></div>`
    }).join('')
    openPrintWindow(rows, `${zoneName} — ${restaurant.name}`)
  }

  function printPhysicalQRCodes() {
    if (!qrCodes.length) return
    const items = qrCodes.map(qr => ({ code: qr.code, label: getQRDisplayName(qr) }))
    const html = generateQRPrintHTML(items, getAppUrl(), `QR Codes physiques — ${restaurant.name}`)
    const win = window.open('', '_blank')
    win?.document.write(html); win?.document.close()
  }

  function openPrintWindow(rows: string, title: string) {
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${title}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}@page{size:A4 portrait;margin:0}body{font-family:'Segoe UI',sans-serif;background:#d0d0d0;padding:24px}.page{width:210mm;min-height:297mm;padding:8mm;display:grid;grid-template-columns:repeat(2,1fr);grid-template-rows:repeat(4,1fr);gap:4mm;background:#fff;margin:0 auto 24px;box-shadow:0 4px 20px rgba(0,0,0,.2)}.label{position:relative;border:1.2px dashed #bbb;border-radius:2px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:6mm 3.5mm 2.5mm}.card{width:100%;flex:1;background:#000;border-radius:3mm;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:5mm 3mm 4mm;position:relative;gap:2mm}.badge{position:absolute;top:-10px;left:8px;min-width:22px;height:22px;padding:0 5px;background:#FF8C00;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#000;z-index:5;box-shadow:0 1px 5px rgba(0,0,0,.4)}.qr-img{width:38mm;height:38mm;display:block;border-radius:1.5mm}.text-main{font-size:8px;font-weight:700;color:#FF8C00;text-align:center}.code-text{font-family:'Courier New',monospace;font-size:6px;color:#888;letter-spacing:1.2px;margin-top:2mm;text-align:center}@media print{body{background:white;padding:0}.page{box-shadow:none}}</style></head><body>
<div class="page">${rows}</div>
<script>window.addEventListener('load',()=>{const imgs=document.querySelectorAll('img');let done=0;const fire=()=>{if(++done>=imgs.length)setTimeout(()=>window.print(),400)};if(!imgs.length)return setTimeout(()=>window.print(),400);imgs.forEach(img=>{if(img.complete)fire();else{img.addEventListener('load',fire);img.addEventListener('error',fire)}})});</script>
</body></html>`
    const win = window.open('', '_blank')
    win?.document.write(html); win?.document.close()
  }

  const totalActive = tables.filter(t => t.is_active).length + qrCodes.length

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h2 className="font-black text-xl text-gray-900">Tables & Sections</h2>
            <p className="text-sm text-gray-400 mt-0.5">{totalActive} table{totalActive > 1 ? 's' : ''} active{totalActive > 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleAddTerrace}
              disabled={creatingTerrace}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-black disabled:opacity-60"
              style={{ backgroundColor: p }}>
              {creatingTerrace
                ? <Loader2 size={15} className="animate-spin" />
                : <Plus size={15} strokeWidth={2.5} />}
              Ajouter une terrasse
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowLinkModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-black"
              style={{ backgroundColor: p }}>
              <Link size={15} strokeWidth={2.5} />
              Lier un QR
            </motion.button>
          </div>
        </div>
      </div>

      {creatingTerrace && tables.length === 0 && (
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <Loader2 size={32} className="animate-spin mx-auto mb-3" style={{ color: p }} />
            <p className="font-bold text-gray-600">Création de Terrasse 1...</p>
          </div>
        </div>
      )}

      {zones['Sans section'] && (
        <div className="px-4 sm:px-6 pt-4 max-w-7xl mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="font-bold text-amber-800 text-sm">Tables sans section détectées</p>
              <p className="text-xs text-amber-600 mt-0.5">
                {zones['Sans section'].length} table{zones['Sans section'].length > 1 ? 's' : ''} créée{zones['Sans section'].length > 1 ? 's' : ''} avec l&apos;ancienne méthode — assigne-les à Terrasse 1 pour les intégrer au nouveau système.
              </p>
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={migrateUnzoned} disabled={migrating}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-black disabled:opacity-60"
              style={{ backgroundColor: '#F59E0B' }}>
              {migrating ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Migrer vers Terrasse 1
            </motion.button>
          </div>
        </div>
      )}

      <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto space-y-8">

        {Object.entries(zones).map(([zoneName, zoneTables]) => (
          <div key={zoneName}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers size={16} style={{ color: p }} />
                <p className="font-black text-gray-900">{zoneName}</p>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {zoneTables.filter(t => t.is_active).length} actives
                </span>
              </div>
              <button onClick={() => printZone(zoneName, zoneTables)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
                <Printer size={13} />
                Imprimer
              </button>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-10 gap-2">
              {zoneTables.map(table => {
                const physicalQR = linkedMap[table.id]
                return (
                  <motion.div key={table.id}
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className={`bg-white rounded-2xl overflow-hidden shadow-sm border transition-all ${!table.is_active ? 'opacity-40' : 'border-gray-100'}`}>
                    <button onClick={() => setSelectedTable(table)} className="w-full p-2 block">
                      <div className="aspect-square rounded-xl overflow-hidden mb-2 mx-auto flex items-center justify-center" style={{ backgroundColor: '#F9FAFB' }}>
                        {physicalQR ? (
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(getPhysicalQRUrl(physicalQR.code))}&color=111111&bgcolor=FAFAFA&qzone=1`}
                            alt={`Table ${table.table_number}`} className="w-full h-full" />
                        ) : (
                          <QrCode size={22} className="text-gray-200" />
                        )}
                      </div>
                      <p className="font-black text-gray-900 text-center text-xs">{table.table_number}</p>
                    </button>
                    <div className="flex border-t border-gray-50">
                      <button onClick={() => downloadQR(table)}
                        className="flex-1 py-1.5 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors">
                        <Download size={11} />
                      </button>
                      <div className="w-px bg-gray-50" />
                      <button onClick={() => toggleTable(table)}
                        className="flex-1 py-1.5 flex items-center justify-center hover:bg-gray-50 transition-colors"
                        style={{ color: table.is_active ? '#10B981' : '#9CA3AF' }}>
                        {table.is_active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        ))}

        {qrCodes.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <QrCode size={16} className="text-blue-500" />
                <p className="font-black text-gray-900">QR Codes physiques</p>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{qrCodes.length}</span>
              </div>
              <button onClick={printPhysicalQRCodes}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors">
                <Printer size={13} />
                Imprimer
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {qrCodes.map(qr => {
                const displayName = getQRDisplayName(qr)
                return (
                  <motion.div key={qr.id}
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
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
                      <p className="font-black text-gray-900 text-center text-sm">{displayName}</p>
                      <p className="text-xs text-gray-400 text-center mt-0.5 font-mono tracking-wide">{qr.code}</p>
                      {qr.scan_count > 0 && (
                        <p className="text-xs text-blue-500 text-center mt-1 font-semibold">{qr.scan_count} scan{qr.scan_count > 1 ? 's' : ''}</p>
                      )}
                    </div>
                    <div className="flex border-t border-blue-50">
                      <button onClick={() => downloadPhysicalQR(qr.code, displayName)}
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
                )
              })}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedTable && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center p-0 sm:p-4">
            <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedTable(null)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28 }}
              className="relative bg-white w-full sm:max-w-sm sm:rounded-3xl rounded-t-[2rem] p-6 text-center"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <p className="text-xs text-gray-400 mb-1">{selectedTable.zone}</p>
              <h3 className="font-black text-xl text-gray-900 mb-1">Table {selectedTable.table_number}</h3>
              <p className="text-xs text-gray-400 mb-5">{restaurant.name}</p>
              <div className="flex justify-center mb-5">
                <div className="p-4 bg-gray-50 rounded-3xl shadow-inner">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(getTableQRUrl(selectedTable))}&color=111111&bgcolor=F9FAFB&qzone=2`}
                    alt="QR Code" className="w-48 h-48 rounded-xl" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => navigator.clipboard.writeText(getTableQRUrl(selectedTable))}
                  className="flex-1 py-3.5 rounded-2xl bg-gray-100 text-gray-700 font-bold text-sm">
                  Copier le lien
                </button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => downloadQR(selectedTable)}
                  className="flex-1 py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2"
                  style={{ backgroundColor: p }}>
                  <Download size={16} />
                  Télécharger
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLinkModal && (
          <LinkQRModal
            restaurantId={restaurant.id}
            zones={zones}
            linkedTableIds={linkedTableIds}
            primaryColor={p}
            onClose={() => setShowLinkModal(false)}
            onLinked={(qr) => setQrCodes(prev => [qr, ...prev.filter(q => q.code !== qr.code)])}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function LinkQRModal({ restaurantId, zones, linkedTableIds, primaryColor, onClose, onLinked }: {
  restaurantId: string
  zones: Record<string, RestaurantTable[]>
  linkedTableIds: Set<string>
  primaryColor: string
  onClose: () => void
  onLinked: (qr: QRCode) => void
}) {
  const [code, setCode] = useState('')
  const [selectedZone, setSelectedZone] = useState<string | null>(null)
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const zoneNames = Object.keys(zones)
  const tablesInZone = selectedZone ? zones[selectedZone] : []

  async function link() {
    const cleanCode = code.trim().toUpperCase()
    if (!cleanCode || !selectedTable) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/qr-codes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'link', code: cleanCode, restaurant_id: restaurantId, table_name: selectedTable.id }),
      })
      const result = await res.json()
      if (res.ok) {
        setSuccess(true)
        onLinked(result.data)
        setTimeout(() => { setSuccess(false); setCode(''); setSelectedZone(null); setSelectedTable(null) }, 1500)
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
        className="relative bg-white w-full max-w-md mx-auto rounded-t-[2rem] p-6 max-h-[85vh] overflow-y-auto"
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

        <div className="space-y-5">
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
            <p className="text-xs text-gray-400 mt-1">8 caractères imprimés sous le QR physique</p>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 block mb-2">Sélectionner la section</label>
            <div className="grid grid-cols-2 gap-2">
              {zoneNames.map(z => (
                <button key={z}
                  onClick={() => { setSelectedZone(z); setSelectedTable(null) }}
                  className="py-3 rounded-2xl text-sm font-bold transition-all border-2 flex items-center justify-between px-4"
                  style={selectedZone === z
                    ? { backgroundColor: primaryColor + '15', borderColor: primaryColor, color: primaryColor }
                    : { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', color: '#374151' }}>
                  {z}
                  <ChevronRight size={14} />
                </button>
              ))}
            </div>
          </div>

          {selectedZone && (
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-2">
                Table dans {selectedZone}
              </label>
              <div className="grid grid-cols-5 gap-2">
                {tablesInZone.map(t => {
                  const isLinked = linkedTableIds.has(t.id)
                  return (
                    <button key={t.id}
                      onClick={() => setSelectedTable(t)}
                      disabled={!t.is_active || isLinked}
                      className="py-2 rounded-xl text-xs font-black transition-all border-2 flex flex-col items-center justify-center gap-0.5 disabled:cursor-not-allowed"
                      style={selectedTable?.id === t.id
                        ? { backgroundColor: primaryColor, color: '#fff', borderColor: primaryColor }
                        : isLinked
                        ? { backgroundColor: '#F3F4F6', color: '#D1D5DB', borderColor: '#E5E7EB' }
                        : { backgroundColor: '#F9FAFB', color: '#374151', borderColor: '#E5E7EB' }}>
                      <span>{t.table_number}</span>
                      {isLinked && <span style={{ fontSize: '8px', color: '#9CA3AF' }}>liée</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {selectedTable && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-100">
              <Check size={14} className="text-green-600" />
              <p className="text-xs text-green-700 font-semibold">
                {selectedZone} · Table {selectedTable.table_number}
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500 font-semibold bg-red-50 px-3 py-2 rounded-xl">{error}</p>
          )}
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={link}
          disabled={loading || !code.trim() || !selectedTable || success}
          className="w-full mt-6 py-4 rounded-2xl font-black text-white text-sm disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
          style={{ backgroundColor: success ? '#10B981' : primaryColor }}>
          {success ? (
            <><Check size={16} /> QR lié avec succès !</>
          ) : loading ? (
            <><Loader2 size={16} className="animate-spin" /> Liaison...</>
          ) : (
            <><Link2 size={16} /> Lier ce QR{selectedTable ? ` à "${selectedZone} · Table ${selectedTable.table_number}"` : ''}</>
          )}
        </motion.button>

        <p className="text-xs text-center text-gray-400 mt-3">
          Tu peux enchaîner plusieurs liaisons sans fermer cette fenêtre
        </p>
      </motion.div>
    </motion.div>
  )
}
