'use client'
import { useEffect, useState } from 'react'
import { Bell, BellOff, BellRing } from 'lucide-react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i)
  return out
}

type State = 'unsupported' | 'denied' | 'idle' | 'subscribed' | 'loading'

export default function PushToggle() {
  const [state, setState] = useState<State>('loading')
  const [showHint, setShowHint] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setState('unsupported'); return
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
      setShowHint(true)
      setTimeout(() => setShowHint(false), 3000)
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
  const Icon = isOn ? BellRing : isDenied ? BellOff : Bell

  return (
    <div className="relative">
      <button
        onClick={isOn ? disable : enable}
        disabled={state === 'loading' || isDenied}
        title={
          isDenied ? 'Notifications bloquées (autorise dans les réglages du navigateur)' :
          isOn ? 'Notifications activées — clique pour désactiver' :
          'Activer les notifications de commandes'
        }
        className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-50">
        <Icon size={14} className={isOn ? 'text-emerald-600' : isDenied ? 'text-red-400' : 'text-gray-500'} />
        {isOn && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
        )}
      </button>
      {showHint && (
        <div className="absolute right-0 top-full mt-2 px-3 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-lg whitespace-nowrap z-50">
          Notifications activées ✓
        </div>
      )}
    </div>
  )
}
