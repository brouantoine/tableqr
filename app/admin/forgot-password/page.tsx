'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase/client'
import { Mail, ArrowLeft, Check } from 'lucide-react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    })

    if (err) { setError(err.message); setLoading(false); return }
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-5">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <Link href="/admin/login" className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 mb-8">
          <ArrowLeft size={14} /> Retour à la connexion
        </Link>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-3xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Check size={28} className="text-green-600" strokeWidth={3} />
              </div>
              <h2 className="font-black text-xl text-gray-900 mb-2">Email envoyé !</h2>
              <p className="text-gray-500 text-sm">Vérifiez votre boîte mail et cliquez sur le lien pour réinitialiser votre mot de passe.</p>
              <Link href="/admin/login" className="block mt-6 text-sm font-bold" style={{ color: '#F26522' }}>
                Retour à la connexion →
              </Link>
            </div>
          ) : (
            <>
              <h2 className="font-black text-xl text-gray-900 mb-1">Mot de passe oublié</h2>
              <p className="text-gray-400 text-sm mb-6">On vous envoie un lien de réinitialisation</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      placeholder="admin@restaurant.com"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-50 text-sm outline-none border border-gray-100" />
                  </div>
                </div>
                {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-2xl">{error}</p>}
                <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={loading}
                  className="w-full py-4 rounded-2xl text-white font-black disabled:opacity-60"
                  style={{ backgroundColor: '#F26522' }}>
                  {loading ? 'Envoi...' : 'Envoyer le lien'}
                </motion.button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
