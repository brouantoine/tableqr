'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const emailNorm = email.toLowerCase().trim()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email: emailNorm, password })

    if (authError || !data.user) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
      return
    }

    // Vérifier que cet email est bien un admin d'un restaurant
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, slug')
      .eq('admin_email', emailNorm)
      .eq('is_active', true)
      .maybeSingle()

    if (!restaurant) {
      setError('Aucun restaurant associé à ce compte')
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    // Première connexion → onboarding, sinon dashboard
    const onboardingDone = localStorage.getItem('onboarding_done')
    const dest = onboardingDone ? '/admin/dashboard' : '/admin/onboarding'
    window.location.href = dest
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-5">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg"
            style={{ backgroundColor: '#F26522', boxShadow: '0 8px 30px #F2652240' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M3 12h18M3 18h18"/>
            </svg>
          </div>
          <h1 className="text-2xl font-black text-gray-900">TABLE<span style={{ color: '#F26522' }}>QR</span></h1>
          <p className="text-gray-400 text-sm mt-1">Espace restaurateur</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-black text-gray-900 text-lg mb-1">Connexion</h2>
          <p className="text-gray-400 text-sm mb-6">Accédez à votre tableau de bord</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required placeholder="admin@restaurant.com"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-50 text-sm outline-none border border-gray-100 focus:border-orange-300" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type={showPwd ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  required placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-2xl bg-gray-50 text-sm outline-none border border-gray-100 focus:border-orange-300" />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600 font-medium">
                {error}
              </motion.div>
            )}

            <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={loading}
              className="w-full py-4 rounded-2xl text-white font-black text-base mt-2 disabled:opacity-60"
              style={{ backgroundColor: '#F26522', boxShadow: '0 4px 20px #F2652240' }}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </motion.button>

            <div className="text-center pt-1">
              <a href="/admin/forgot-password"
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                Mot de passe oublié ?
              </a>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          TableQR — Plateforme SaaS restaurant
        </p>
      </motion.div>
    </div>
  )
}
