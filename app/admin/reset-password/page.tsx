'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'
import { Lock, Eye, EyeOff, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return }
    if (password.length < 8) { setError('Minimum 8 caractères'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) { setError(err.message); setLoading(false); return }
    setDone(true)
    setTimeout(() => router.push('/admin/dashboard'), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-5">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          {done ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-3xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Check size={28} className="text-green-600" strokeWidth={3} />
              </div>
              <h2 className="font-black text-xl text-gray-900 mb-2">Mot de passe modifié !</h2>
              <p className="text-gray-500 text-sm">Redirection vers votre dashboard...</p>
            </div>
          ) : (
            <>
              <h2 className="font-black text-xl text-gray-900 mb-1">Nouveau mot de passe</h2>
              <p className="text-gray-400 text-sm mb-6">Choisissez un mot de passe sécurisé</p>
              <form onSubmit={handleReset} className="space-y-4">
                {[
                  { label: 'Nouveau mot de passe', value: password, onChange: setPassword },
                  { label: 'Confirmer', value: confirm, onChange: setConfirm },
                ].map((f, i) => (
                  <div key={i}>
                    <label className="text-xs font-bold text-gray-500 block mb-1.5">{f.label}</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type={showPwd ? 'text' : 'password'} value={f.value}
                        onChange={e => f.onChange(e.target.value)} required minLength={8}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-3 rounded-2xl bg-gray-50 text-sm outline-none border border-gray-100" />
                      {i === 0 && (
                        <button type="button" onClick={() => setShowPwd(!showPwd)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                          {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-2xl">{error}</p>}
                <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={loading}
                  className="w-full py-4 rounded-2xl text-white font-black disabled:opacity-60"
                  style={{ backgroundColor: '#F26522' }}>
                  {loading ? 'Modification...' : 'Modifier le mot de passe'}
                </motion.button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
