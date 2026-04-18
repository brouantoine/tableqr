'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Email ou mot de passe incorrect'); setLoading(false); return }
    window.location.replace('/admin/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg,#1A1008,#2A1F10)' }}>
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-gray-900">
            TABLE<span style={{ color: '#F26522' }}>QR</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Espace admin restaurant</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-orange-400 text-sm"
              placeholder="admin@restaurant.com" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-orange-400 text-sm"
              placeholder="••••••••" />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-4 rounded-2xl text-white font-bold text-lg disabled:opacity-60 mt-2"
            style={{ backgroundColor: '#F26522' }}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
