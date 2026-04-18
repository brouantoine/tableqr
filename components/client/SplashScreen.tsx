'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  onDone: () => void
  duration?: number
}

export default function SplashScreen({ onDone, duration = 2800 }: Props) {
  const [msgIndex, setMsgIndex] = useState(0)
  const [msgVisible, setMsgVisible] = useState(true)

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

        {/* Cercles déco */}
        <div className="absolute inset-0 overflow-hidden flex items-center justify-center pointer-events-none">
          {[380, 260, 160].map((size, i) => (
            <motion.div key={size}
              animate={{ scale: [1, 1.08, 1], opacity: [0.06, 0.02, 0.06] }}
              transition={{ duration: 3.5, delay: i * 0.6, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute rounded-full border"
              style={{ width: size, height: size, borderColor: '#F26522', backgroundColor: i === 2 ? '#F265220A' : 'transparent' }} />
          ))}
        </div>

        {/* Logo icône */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 200 }}
          className="relative z-10 mb-6">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{ backgroundColor: '#F26522', boxShadow: '0 12px 40px #F2652230, 0 4px 12px #F2652220' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </div>
        </motion.div>

        {/* Nom */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="relative z-10 text-center mb-2">
          <h1 className="text-3xl font-black text-gray-900" style={{ letterSpacing: '-0.5px' }}>
            TABLE<span style={{ color: '#F26522' }}>QR</span>
          </h1>
        </motion.div>

        {/* Sous-titre */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative z-10 mb-14">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest">
            Restaurant Experience
          </p>
        </motion.div>

        {/* Dots */}
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

        {/* Barre + texte */}
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
              style={{ background: 'linear-gradient(90deg, #F26522, #D4A017)' }} />
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