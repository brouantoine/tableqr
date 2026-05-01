'use client'
import { useEffect, useState } from 'react'
import { Bell, BellOff, BellRing, Smartphone, X } from 'lucide-react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i)
  return out
}

type State = 'unsupported-ios' | 'unsupported' | 'denied' | 'idle' | 'subscribed' | 'loading'

function detectIOS() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document)
}

function isStandalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true
}

export default function PushToggle() {
  const [state, setState] = useState<State>('loading')
  const [showHint, setShowHint] = useState<null | 'ok' | 'ios'>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    if (!supported) {
      setState(detectIOS() && !isStandalone() ? 'unsupported-ios' : 'unsupported')
      return
    }
    if (Notification.permission === 'denied') { setState('denied'); return }

    ;(async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
        const sub = await reg.pushManager.getSubscription()
        setState(sub ? 'subscribed' : 'idle')
      } catch (e) {
        console.error('SW register error', e)
        setState('idle')
      }
    })()
  }, [])

  async function enable() {
    setState('loading')
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setState(perm === 'denied' ? 'denied' : 'idle'); return }

      const reg = await navigator.serviceWorker.ready
      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapid) { console.error('VAPID public key manquante'); setState('idle'); return }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      })

      const res = await fetch('/api/admin/push/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      })
      if (!res.ok) {
        await sub.unsubscribe().catch(() => {})
        setState('idle')
        return
      }
      setState('subscribed')
      setShowHint('ok')
      setTimeout(() => setShowHint(null), 3000)
    } catch (e) {
      console.error('Subscribe error', e)
      setState('idle')
    }
  }

  async function disable() {
    setState('loading')
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/admin/push/unsubscribe', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {})
        await sub.unsubscribe().catch(() => {})
      }
      setState('idle')
    } catch {
      setState('idle')
    }
  }

  if (state === 'unsupported') return null

  const isOn = state === 'subscribed'
  const isDenied = state === 'denied'
  const isIos = state === 'unsupported-ios'
  const Icon = isOn ? BellRing : isDenied ? BellOff : isIos ? Smartphone : Bell
  const iconColor = isOn ? 'text-emerald-600' : isDenied ? 'text-red-400' : isIos ? 'text-blue-500' : 'text-gray-500'

  function handleClick() {
    if (isIos) { setShowHint('ios'); return }
    if (isOn) return disable()
    return enable()
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={state === 'loading' || isDenied}
        title={
          isIos ? 'iOS : ajoute le site à l\'écran d\'accueil pour activer les notifications' :
          isDenied ? 'Notifications bloquées (autorise dans les réglages du navigateur)' :
          isOn ? 'Notifications activées — clique pour désactiver' :
          'Activer les notifications de commandes'
        }
        className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-50">
        <Icon size={15} className={iconColor} />
        {isOn && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
        )}
        {isIos && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white" />
        )}
      </button>

      {showHint === 'ok' && (
        <div className="absolute right-0 top-full mt-2 px-3 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-lg whitespace-nowrap z-50">
          Notifications activées ✓
        </div>
      )}

      {showHint === 'ios' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={() => setShowHint(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Smartphone size={22} className="text-blue-500" />
              </div>
              <button onClick={() => setShowHint(null)} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
                <X size={14} className="text-gray-500" />
              </button>
            </div>
            <h3 className="font-black text-gray-900 text-base mb-2">Activer sur iPhone</h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              Apple n&apos;autorise les notifications push que depuis l&apos;app installée. Pour recevoir les commandes :
            </p>
            <ol className="space-y-2 text-sm text-gray-700 mb-4">
              <li className="flex gap-2"><span className="font-black text-blue-500">1.</span><span>Ouvre ce site dans <b>Safari</b></span></li>
              <li className="flex gap-2"><span className="font-black text-blue-500">2.</span><span>Touche le bouton <b>Partager</b> (carré + flèche)</span></li>
              <li className="flex gap-2"><span className="font-black text-blue-500">3.</span><span>Choisis <b>Sur l&apos;écran d&apos;accueil</b></span></li>
              <li className="flex gap-2"><span className="font-black text-blue-500">4.</span><span>Lance l&apos;app depuis l&apos;icône, puis reviens activer la cloche</span></li>
            </ol>
            <button onClick={() => setShowHint(null)}
              className="w-full py-3 rounded-2xl bg-gray-900 text-white font-black text-sm">
              Compris
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
