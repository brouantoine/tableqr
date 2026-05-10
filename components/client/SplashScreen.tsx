'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QrCode } from 'lucide-react'
import RestaurantLogo, { getRestaurantLogoUrl } from '@/components/RestaurantLogo'

interface Props {
  onDone: () => void
  duration?: number
  restaurantName?: string
  logoUrl?: string | null
  primaryColor?: string
}

export default function SplashScreen({ onDone, duration = 2800, restaurantName, logoUrl, primaryColor = '#F26522' }: Props) {
  const [msgIndex, setMsgIndex] = useState(0)
  const [msgVisible, setMsgVisible] = useState(true)
  const resolvedLogoUrl = getRestaurantLogoUrl(logoUrl)

  const msgs = [
    "Connexion au restaurant...",
    "Chargement du menu...",
    "La table vous attend...",
    "Presque prêt...",
    "Bonne dégustation !",
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgVisible(false)
      setTimeout(() => {
        setMsgIndex(i => (i + 1) % msgs.length)
        setMsgVisible(true)
      }, 280)
    }, 1800)

    const timer = setTimeout(() => {
      clearInterval(interval)
      onDone()
    }, duration)

    return () => { clearInterval(interval); clearTimeout(timer) }
  }, [])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>

        <div className="absolute inset-0 overflow-hidden flex items-center justify-center pointer-events-none">
          {[380, 260, 160].map((size, i) => (
            <motion.div key={size}
              animate={{ scale: [1, 1.08, 1], opacity: [0.06, 0.02, 0.06] }}
              transition={{ duration: 3.5, delay: i * 0.6, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute rounded-full border"
              style={{ width: size, height: size, borderColor: primaryColor, backgroundColor: i === 2 ? primaryColor + '0A' : 'transparent' }} />
          ))}
        </div>

        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 200 }}
          className="relative z-10 mb-6">
          {resolvedLogoUrl ? (
            <RestaurantLogo
              src={resolvedLogoUrl}
              alt={restaurantName || ''}
              className="w-24 h-24 rounded-3xl bg-white border border-gray-100 shadow-2xl"
            />
          ) : (
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ backgroundColor: primaryColor, boxShadow: `0 12px 40px ${primaryColor}30, 0 4px 12px ${primaryColor}20` }}>
              <QrCode size={40} color="#fff" strokeWidth={2.2} />
            </div>
          )}
        </motion.div>

        {!resolvedLogoUrl && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="relative z-10 text-center mb-2">
            <h1 className="text-3xl font-black text-gray-900">
              {restaurantName || <>TABLE<span style={{ color: primaryColor }}>QR</span></>}
            </h1>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative z-10 mb-14">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest">
            Restaurant Experience
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="relative z-10 flex gap-2 mb-8">
          {['#F26522', '#D4A017', '#C0392B'].map((color, i) => (
            <motion.div key={color}
              animate={{ y: [0, -8, 0], opacity: [0.25, 1, 0.25] }}
              transition={{ duration: 1.4, delay: i * 0.12, repeat: Infinity, ease: 'easeInOut' }}
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: color }} />
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="relative z-10 w-44">
          <div className="h-0.5 rounded-full overflow-hidden mb-3.5" style={{ backgroundColor: '#F265220F' }}>
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: duration / 1000, ease: 'easeInOut' }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${primaryColor}, #D4A017)` }} />
          </div>
          <motion.p
            animate={{ opacity: msgVisible ? 1 : 0, y: msgVisible ? 0 : -5 }}
            transition={{ duration: 0.28 }}
            className="text-center text-xs text-gray-400 font-medium">
            {msgs[msgIndex]}
          </motion.p>
        </motion.div>

      </motion.div>
    </AnimatePresence>
  )
}
