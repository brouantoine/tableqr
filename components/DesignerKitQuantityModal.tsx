'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Loader2, QrCode, X } from 'lucide-react'

const QUICK_COUNTS = [50, 100, 200, 300, 500]
const MAX_CODES = 500

export default function DesignerKitQuantityModal({
  defaultCount = 200,
  loading,
  primaryColor = '#F26522',
  onClose,
  onConfirm,
}: {
  defaultCount?: number
  loading: boolean
  primaryColor?: string
  onClose: () => void
  onConfirm: (count: number) => void
}) {
  const [count, setCount] = useState(() => clampCount(defaultCount))

  function updateCount(value: number) {
    setCount(clampCount(value))
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={loading ? undefined : onClose} />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="relative bg-white w-full max-w-md mx-auto rounded-t-[2rem] p-5"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}>

        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3"
              style={{ backgroundColor: `${primaryColor}18`, color: primaryColor }}>
              <QrCode size={20} strokeWidth={2.5} />
            </div>
            <h3 className="font-black text-xl text-gray-900">Kit designer</h3>
            <p className="text-xs text-gray-400 mt-1">Modele dense SVG</p>
          </div>
          <button onClick={onClose} disabled={loading}
            className="w-8 h-8 rounded-2xl bg-gray-100 flex items-center justify-center disabled:opacity-40">
            <X size={15} className="text-gray-600" />
          </button>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 block mb-2">Nombre de QR</label>
          <input
            type="number"
            min={1}
            max={MAX_CODES}
            value={count}
            onChange={e => updateCount(Number(e.target.value))}
            className="w-full px-4 py-3 rounded-2xl bg-gray-50 text-gray-900 text-lg font-black outline-none border-2 border-gray-100 focus:border-orange-300"
          />
        </div>

        <div className="grid grid-cols-5 gap-2 mt-3">
          {QUICK_COUNTS.map(value => (
            <button key={value} onClick={() => updateCount(value)} disabled={loading}
              className="py-2.5 rounded-xl text-xs font-black border-2 transition-all disabled:opacity-50"
              style={count === value
                ? { borderColor: primaryColor, backgroundColor: `${primaryColor}12`, color: primaryColor }
                : { borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', color: '#6B7280' }}>
              {value}
            </button>
          ))}
        </div>

        <motion.button whileTap={{ scale: 0.97 }}
          onClick={() => onConfirm(count)}
          disabled={loading}
          className="w-full mt-5 py-4 rounded-2xl font-black text-white text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ backgroundColor: primaryColor }}>
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Preparation...</>
          ) : (
            <><Download size={16} /> Generer le kit</>
          )}
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

function clampCount(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(MAX_CODES, Math.max(1, Math.floor(value)))
}
