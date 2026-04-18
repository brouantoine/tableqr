'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'
import { Mail, Lock, Eye, EyeOff, Shield, Activity } from 'lucide-react'

export default function SuperAdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

      if (authError || !data.user) {
        setError('Identifiants incorrects')
        setLoading(false)
        return
      }

      // Vérifier accès super admin — maybeSingle évite l'erreur 0 résultats
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('admin_email', email)
        .eq('slug', 'superadmin')
        .maybeSingle()

      if (!restaurant) {
        setError('Accès non autorisé — compte non reconnu')
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      window.location.replace('/superadmin')
    } catch {
      setError('Erreur serveur')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0D1117' }}>

      {/* LEFT — Branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12"
        style={{ background: 'linear-gradient(135deg, #0D1117 0%, #161B22 100%)', borderRight: '1px solid #21262D' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: '#F26522' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M3 12h18M3 18h18"/>
            </svg>
          </div>
          <span className="font-black text-white text-lg">TABLE<span style={{ color: '#F26522' }}>QR</span></span>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-mono text-green-400">SYSTÈME OPÉRATIONNEL</span>
          </div>
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            Panneau de<br />
            <span style={{ color: '#F26522' }}>contrôle</span><br />
            global
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            Accès réservé aux administrateurs de la plateforme TableQR. Toutes les actions sont enregistrées.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Restaurants', value: '∞', color: '#F26522' },
            { label: 'Uptime', value: '99.9%', color: '#10B981' },
            { label: 'Sécurité', value: 'AES-256', color: '#3B82F6' },
            { label: 'Accès', value: 'Contrôlé', color: '#8B5CF6' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4" style={{ backgroundColor: '#161B22', border: '1px solid #21262D' }}>
              <p className="font-black text-lg" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT — Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F26522' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M3 12h18M3 18h18"/>
            </svg>
          </div>
          <span className="font-black text-white text-lg">TABLE<span style={{ color: '#F26522' }}>QR</span></span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm">

          {/* Badge */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#F2652220', border: '1px solid #F2652240' }}>
              <Shield size={14} style={{ color: '#F26522' }} />
            </div>
            <div>
              <p className="text-white font-black text-sm">Accès administrateur</p>
              <p className="text-gray-500 text-xs">Authentification sécurisée requise</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs font-bold text-gray-400 block mb-1.5 uppercase tracking-wide">
                Identifiant
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#4B5563' }} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required placeholder="admin@tableqr.com"
                  className="w-full pl-10 pr-4 py-3 text-sm text-white outline-none rounded-xl font-mono"
                  style={{
                    backgroundColor: '#161B22',
                    border: '1px solid #21262D',
                    caretColor: '#F26522',
                  }} />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-bold text-gray-400 block mb-1.5 uppercase tracking-wide">
                Mot de passe
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#4B5563' }} />
                <input type={showPwd ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  required placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-3 text-sm text-white outline-none rounded-xl font-mono"
                  style={{
                    backgroundColor: '#161B22',
                    border: '1px solid #21262D',
                    caretColor: '#F26522',
                  }} />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: '#4B5563' }}>
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                style={{ backgroundColor: '#FF000015', border: '1px solid #FF000030', color: '#F87171' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl font-black text-sm text-white disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              style={{
                background: loading ? '#374151' : 'linear-gradient(135deg, #F26522, #D4A017)',
                boxShadow: loading ? 'none' : '0 4px 20px #F2652240',
              }}>
              {loading ? (
                <>
                  <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  Authentification...
                </>
              ) : (
                <>
                  <Activity size={15} />
                  Accéder au panneau
                </>
              )}
            </motion.button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6" style={{ borderTop: '1px solid #21262D' }}>
            <div className="flex items-center justify-between text-xs" style={{ color: '#4B5563' }}>
              <span className="font-mono">TableQR Platform v1.0</span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span>Sécurisé</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}