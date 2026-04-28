'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, Check, AlertTriangle, RefreshCw } from 'lucide-react'
import jsQR from 'jsqr'

interface Props {
  primaryColor: string
  onClose: () => void
  onScanned: (code: string) => void
}

// Extrait le code 8 caractères depuis une URL `.../t/CODE` ou un texte brut
function extractCode(raw: string): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  // Si URL → on prend le dernier segment
  const m = trimmed.match(/\/t\/([A-Za-z0-9]{4,16})/i)
  if (m) return m[1].toUpperCase()
  // Sinon, si déjà un code propre
  const clean = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (clean.length >= 4 && clean.length <= 16) return clean
  return null
}

export default function QRScannerModal({ primaryColor, onClose, onScanned }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const lockedRef = useRef(false)

  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(true)
  const [detectedCode, setDetectedCode] = useState<string | null>(null)

  async function startCamera() {
    setError(null)
    setStarting(true)
    try {
      // facingMode: environment → caméra arrière sur mobile
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      video.setAttribute('playsinline', 'true')
      await video.play()
      setStarting(false)
      tick()
    } catch (e: any) {
      setStarting(false)
      const name = e?.name || ''
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setError('Autorisez l\'accès à la caméra dans les paramètres du navigateur')
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setError('Aucune caméra détectée sur cet appareil')
      } else if (name === 'NotReadableError') {
        setError('La caméra est utilisée par une autre application')
      } else {
        setError('Impossible d\'ouvrir la caméra')
      }
    }
  }

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    const stream = streamRef.current
    if (stream) {
      stream.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  function tick() {
    if (lockedRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick)
      return
    }
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const result = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
    if (result && result.data) {
      const code = extractCode(result.data)
      if (code) {
        lockedRef.current = true
        setDetectedCode(code)
        if ('vibrate' in navigator) navigator.vibrate(80)
        // Petit délai pour laisser voir le feedback de succès avant de transmettre
        setTimeout(() => {
          stopCamera()
          onScanned(code)
        }, 600)
        return
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => {
    startCamera()
    return () => { stopCamera() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function retry() {
    lockedRef.current = false
    setDetectedCode(null)
    startCamera()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80]"
      style={{ backgroundColor: '#000' }}>

      <canvas ref={canvasRef} className="hidden" />

      {/* Vidéo plein écran */}
      <video
        ref={videoRef}
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Overlay assombri avec viseur découpé */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at center, transparent 0, transparent 130px, rgba(0,0,0,0.65) 200px)',
        }}
      />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 px-5 pt-5 pb-4 flex items-center justify-between"
        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.6), transparent)' }}>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
            <Camera size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-black text-sm">Scanner un QR</p>
            <p className="text-white/60 text-xs">Centrez le code dans le cadre</p>
          </div>
        </div>
        <button onClick={() => { stopCamera(); onClose() }}
          className="w-9 h-9 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
          <X size={16} className="text-white" />
        </button>
      </div>

      {/* Cadre viseur animé */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative" style={{ width: 260, height: 260 }}>
          {/* Coins du viseur */}
          {[
            { top: 0, left: 0, borderTop: 3, borderLeft: 3 },
            { top: 0, right: 0, borderTop: 3, borderRight: 3 },
            { bottom: 0, left: 0, borderBottom: 3, borderLeft: 3 },
            { bottom: 0, right: 0, borderBottom: 3, borderRight: 3 },
          ].map((s, i) => (
            <div key={i} className="absolute w-9 h-9 rounded-md transition-colors"
              style={{
                ...s,
                borderColor: detectedCode ? '#10B981' : primaryColor,
                borderTopWidth: s.borderTop || 0, borderLeftWidth: s.borderLeft || 0,
                borderBottomWidth: s.borderBottom || 0, borderRightWidth: s.borderRight || 0,
                borderStyle: 'solid',
              }}
            />
          ))}

          {/* Ligne scanner animée */}
          {!detectedCode && !error && !starting && (
            <motion.div
              initial={{ top: 0 }}
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute left-2 right-2 h-0.5 rounded-full"
              style={{
                backgroundColor: primaryColor,
                boxShadow: `0 0 18px ${primaryColor}, 0 0 32px ${primaryColor}80`,
              }}
            />
          )}

          {/* Pulse de succès */}
          <AnimatePresence>
            {detectedCode && (
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0.5 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 14, stiffness: 220 }}
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#10B981' }}>
                  <Check size={38} strokeWidth={3} className="text-white" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-5 pb-8 pt-6"
        style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.7), transparent)' }}>
        <AnimatePresence mode="wait">
          {detectedCode ? (
            <motion.p key="ok" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-white text-center font-black text-base">
              Code détecté : <span style={{ color: '#34D399' }}>{detectedCode}</span>
            </motion.p>
          ) : starting ? (
            <motion.div key="start" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2 text-white/80 text-sm">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white" />
              <span>Démarrage de la caméra...</span>
            </motion.div>
          ) : error ? (
            <motion.div key="err" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-3">
              <div className="flex items-start gap-2 px-4 py-3 rounded-2xl bg-red-500/15 border border-red-400/30">
                <AlertTriangle size={16} className="text-red-300 flex-shrink-0 mt-0.5" />
                <p className="text-red-100 text-xs font-semibold">{error}</p>
              </div>
              <motion.button whileTap={{ scale: 0.97 }} onClick={retry}
                className="w-full py-3 rounded-2xl bg-white/15 backdrop-blur text-white font-bold text-sm flex items-center justify-center gap-2">
                <RefreshCw size={14} /> Réessayer
              </motion.button>
            </motion.div>
          ) : (
            <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-white/70 text-center text-xs">
              Le scan se fait automatiquement
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
