'use client'
import { useEffect, useRef, useState } from 'react'
import { Bell, BellOff, BellRing, Loader2, Power, Send, Smartphone, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i)
  return out
}

type State = 'unsupported-ios' | 'unsupported' | 'denied' | 'idle' | 'subscribed' | 'loading'
type Hint = null | 'ok' | 'ios' | 'menu' | 'test-ok' | 'test-empty' | 'test-error'
type NavigatorWithStandalone = Navigator & { standalone?: boolean }

function detectIOS() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document)
}

function isStandalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches
    || (window.navigator as NavigatorWithStandalone).standalone === true
}

export default function PushToggle() {
  const [state, setState] = useState<State>('loading')
  const [showHint, setShowHint] = useState<Hint>(null)
  const [testStatus, setTestStatus] = useState<'idle' | 'sending'>('idle')
  const [testMessage, setTestMessage] = useState('')
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showTemporaryHint(hint: Exclude<Hint, null>, duration = 4500) {
    if (hintTimer.current) clearTimeout(hintTimer.current)
    setShowHint(hint)
    hintTimer.current = setTimeout(() => setShowHint(null), duration)
  }

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

  useEffect(() => () => {
    if (hintTimer.current) clearTimeout(hintTimer.current)
  }, [])

  async function authJsonHeaders() {
    const { data } = await supabase.auth.getSession()
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (data.session?.access_token) headers.authorization = `Bearer ${data.session.access_token}`
    return headers
  }

  async function enable() {
    setState('loading')
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setState(perm === 'denied' ? 'denied' : 'idle'); return }

      const reg = await navigator.serviceWorker.ready
      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapid) {
        setTestMessage('Clé VAPID publique manquante.')
        showTemporaryHint('test-error', 9000)
        setState('idle')
        return
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      })

      const res = await fetch('/api/admin/push/subscribe', {
        method: 'POST',
        headers: await authJsonHeaders(),
        body: JSON.stringify({ subscription: sub.toJSON() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        await sub.unsubscribe().catch(() => {})
        setTestMessage(data.error || 'Abonnement impossible côté serveur.')
        showTemporaryHint('test-error', 9000)
        setState('idle')
        return
      }
      setState('subscribed')
      showTemporaryHint('ok', 7000)
    } catch (e) {
      setTestMessage(e instanceof Error ? e.message : 'Abonnement impossible')
      showTemporaryHint('test-error', 9000)
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
          headers: await authJsonHeaders(),
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {})
        await sub.unsubscribe().catch(() => {})
      }
      setState('idle')
    } catch {
      setState('idle')
    }
  }

  async function sendTest() {
    if (testStatus === 'sending') return
    setTestStatus('sending')
    setTestMessage('')
    try {
      const res = await fetch('/api/admin/push/test', {
        method: 'POST',
        headers: await authJsonHeaders(),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Test impossible')

      if ((data.sent || 0) > 0) {
        setTestMessage('Test envoyé. Si rien ne s’affiche, vérifie les notifications de TableQR dans Réglages iPhone.')
        showTemporaryHint('test-ok', 8000)
      } else {
        setTestMessage('Aucun appareil abonné côté serveur. Désactive puis réactive la cloche depuis l’app installée.')
        showTemporaryHint('test-empty', 9000)
      }
    } catch (e) {
      setTestMessage(e instanceof Error ? e.message : 'Test impossible')
      showTemporaryHint('test-error', 9000)
    } finally {
      setTestStatus('idle')
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
    if (isOn) { setShowHint(showHint === 'menu' ? null : 'menu'); return }
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
          isOn ? 'Notifications activées — clique pour tester ou désactiver' :
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
        <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-emerald-600 text-white text-xs font-semibold rounded-xl shadow-lg z-50">
          <p>Notifications activées ✓</p>
          <button
            onClick={sendTest}
            disabled={testStatus === 'sending'}
            className="mt-2 w-full py-2 rounded-lg bg-white/15 hover:bg-white/20 flex items-center justify-center gap-2 disabled:opacity-70">
            {testStatus === 'sending' ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            <span>Envoyer un test</span>
          </button>
        </div>
      )}

      {showHint === 'menu' && (
        <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-white rounded-xl shadow-xl border border-gray-100 z-50">
          <p className="font-black text-gray-900 text-sm mb-2">Notifications admin</p>
          <button
            onClick={sendTest}
            disabled={testStatus === 'sending'}
            className="w-full py-2.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-70">
            {testStatus === 'sending' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            <span>{testStatus === 'sending' ? 'Envoi du test...' : 'Tester une notification'}</span>
          </button>
          <button
            onClick={() => { setShowHint(null); disable() }}
            className="mt-2 w-full py-2.5 rounded-lg bg-gray-100 text-gray-600 font-bold text-xs flex items-center justify-center gap-2">
            <Power size={14} />
            <span>Désactiver</span>
          </button>
          <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
            Sur iPhone, le son dépend des réglages iOS de l’app TableQR et du mode silencieux.
          </p>
        </div>
      )}

      {(showHint === 'test-ok' || showHint === 'test-empty' || showHint === 'test-error') && (
        <div className={`absolute right-0 top-full mt-2 w-72 p-3 text-white text-xs font-semibold rounded-xl shadow-lg z-50 ${
          showHint === 'test-ok' ? 'bg-emerald-600' : showHint === 'test-empty' ? 'bg-amber-600' : 'bg-red-600'
        }`}>
          {testMessage}
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
