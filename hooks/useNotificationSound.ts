import { useEffect, useRef, useCallback } from 'react'

export function useNotificationSound() {
  const audioCtxRef = useRef<AudioContext | null>(null)
  const unlockedRef = useRef(false)

  // Unlock AudioContext sur iOS après premier tap
  useEffect(() => {
    function unlock() {
      if (unlockedRef.current) return
      try {
        const ctx = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!)()
        // Jouer un son silencieux pour débloquer iOS
        const buf = ctx.createBuffer(1, 1, 22050)
        const src = ctx.createBufferSource()
        src.buffer = buf
        src.connect(ctx.destination)
        src.start(0)
        audioCtxRef.current = ctx
        unlockedRef.current = true
      } catch {}
    }

    // Écouter le premier touch/click pour débloquer
    document.addEventListener('touchstart', unlock, { once: true })
    document.addEventListener('touchend', unlock, { once: true })
    document.addEventListener('click', unlock, { once: true })

    return () => {
      document.removeEventListener('touchstart', unlock)
      document.removeEventListener('touchend', unlock)
      document.removeEventListener('click', unlock)
    }
  }, [])

  const playSound = useCallback((type: 'order' | 'message' | 'ready' | 'coucou' | 'match' = 'order') => {
    try {
      // Réutiliser le contexte débloqué ou en créer un nouveau
      const ctx = audioCtxRef.current && audioCtxRef.current.state !== 'closed'
        ? audioCtxRef.current
        : new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!)()

      audioCtxRef.current = ctx

      // Reprendre si suspendu (iOS met en pause automatiquement)
      if (ctx.state === 'suspended') ctx.resume()

      const configs: Record<string, { freqs: number[]; duration: number }> = {
        order:   { freqs: [523, 659, 784],       duration: 0.15 }, // Do Mi Sol
        ready:   { freqs: [784, 1047],           duration: 0.2  }, // Sol Do aigu
        message: { freqs: [440, 554],            duration: 0.12 }, // La Do#
        coucou:  { freqs: [659, 988],            duration: 0.09 }, // Mi Si - cristallin court
        match:   { freqs: [659, 784, 988, 1318], duration: 0.13 }, // Mi Sol Si Mi - festif
      }

      const config = configs[type]
      let t = ctx.currentTime

      config.freqs.forEach(freq => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.4, t + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, t + config.duration)
        osc.start(t)
        osc.stop(t + config.duration + 0.05)
        t += config.duration * 0.75
      })

      if ('vibrate' in navigator) {
        if (type === 'order') navigator.vibrate([100, 50, 100])
        else if (type === 'ready') navigator.vibrate([200])
        else if (type === 'match') navigator.vibrate([60, 40, 60, 40, 120])
        else if (type === 'coucou') navigator.vibrate([40, 30, 40])
        else navigator.vibrate([50])
      }

    } catch (e) {
      console.warn('Sound error:', e)
    }
  }, [])

  return { playSound }
}
