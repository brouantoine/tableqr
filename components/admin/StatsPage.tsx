'use client'
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Users, MessageCircle, Heart, ShoppingBag, Star, ArrowUpRight, DollarSign, Trophy, BarChart3 } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { Restaurant, Order } from '@/types'

interface Props {
  restaurant: Restaurant
  orders: Order[]
  sessions: any[]
  messages: any[]
  matches: any[]
}

export default function StatsPage({ restaurant, orders, sessions, messages, matches }: Props) {
  const p = restaurant.primary_color

  const stats = useMemo(() => {
    const today = new Date().toDateString()
    const thisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const thisMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const paidOrders = orders.filter(o => o.payment_status === 'paid')
    const todayRevenue = paidOrders.filter(o => new Date(o.created_at).toDateString() === today).reduce((s, o) => s + o.total, 0)
    const weekRevenue = paidOrders.filter(o => new Date(o.created_at) >= thisWeek).reduce((s, o) => s + o.total, 0)
    const monthRevenue = paidOrders.filter(o => new Date(o.created_at) >= thisMonth).reduce((s, o) => s + o.total, 0)
    const totalRevenue = paidOrders.reduce((s, o) => s + o.total, 0)
    const avgBasket = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0
    const todaySessions = sessions.filter(s => new Date(s.created_at).toDateString() === today).length
    const profileCounts = sessions.reduce((acc: any, s) => { acc[s.profile_type] = (acc[s.profile_type] || 0) + 1; return acc }, {})
    const itemCounts: Record<string, { name: string; count: number; revenue: number }> = {}
    orders.forEach(o => (o.items || []).forEach((item: any) => {
      if (!itemCounts[item.item_name]) itemCounts[item.item_name] = { name: item.item_name, count: 0, revenue: 0 }
      itemCounts[item.item_name].count += item.quantity
      itemCounts[item.item_name].revenue += item.total
    }))
    const topItems = Object.values(itemCounts).sort((a, b) => b.count - a.count).slice(0, 5)
    return { todayRevenue, weekRevenue, monthRevenue, totalRevenue, avgBasket, todaySessions, totalSessions: sessions.length, profileCounts, topItems, totalMatches: matches.filter(m => m.is_matched).length }
  }, [orders, sessions, matches])

  const revenueCards = [
    { label: "Aujourd'hui", value: formatPrice(stats.todayRevenue, restaurant.currency), icon: TrendingUp, color: '#10B981', bg: '#ECFDF5' },
    { label: 'Cette semaine', value: formatPrice(stats.weekRevenue, restaurant.currency), icon: TrendingUp, color: '#3B82F6', bg: '#EFF6FF' },
    { label: 'Ce mois', value: formatPrice(stats.monthRevenue, restaurant.currency), icon: TrendingUp, color: '#8B5CF6', bg: '#F5F3FF' },
    { label: 'Total', value: formatPrice(stats.totalRevenue, restaurant.currency), icon: TrendingUp, color: p, bg: p + '15' },
  ]

  const socialCards = [
    { label: 'Clients aujourd\'hui', value: String(stats.todaySessions), icon: Users, color: '#F59E0B', bg: '#FFFBEB' },
    { label: 'Total clients', value: String(stats.totalSessions), icon: Users, color: '#EC4899', bg: '#FDF2F8' },
    { label: 'Panier moyen', value: formatPrice(stats.avgBasket, restaurant.currency), icon: ShoppingBag, color: '#06B6D4', bg: '#ECFEFF' },
    { label: 'Messages', value: String(messages.length), icon: MessageCircle, color: '#6366F1', bg: '#EEF2FF' },
    { label: 'Matchs', value: String(stats.totalMatches), icon: Heart, color: '#EF4444', bg: '#FEF2F2' },
    { label: 'Commandes total', value: String(orders.length), icon: Star, color: '#84CC16', bg: '#F7FEE7' },
  ]

  const profiles = [
    { key: 'solo', label: 'Solo', emoji: '🧑' },
    { key: 'couple', label: 'Couple', emoji: '💑' },
    { key: 'famille', label: 'Famille', emoji: '👨‍👩‍👧' },
    { key: 'groupe', label: 'Groupe', emoji: '🎉' },
  ]

  const medalColors = ['#F59E0B', '#9CA3AF', '#B45309', p, p]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-black text-xl text-gray-900">Statistiques</h2>
          <p className="text-sm text-gray-400 mt-0.5">Analyse complète de votre activité</p>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-5 max-w-7xl mx-auto space-y-6 pb-24">

        {/* Revenus */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><DollarSign size={12} /> Revenus</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {revenueCards.map((card, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-14 h-14 rounded-full -translate-y-5 translate-x-5 opacity-10"
                  style={{ backgroundColor: card.color }} />
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                  style={{ backgroundColor: card.bg }}>
                  <card.icon size={17} style={{ color: card.color }} />
                </div>
                <p className="text-xl font-black text-gray-900 leading-none mb-1">{card.value}</p>
                <p className="text-xs text-gray-400">{card.label}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Social */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Users size={12} /> Clients & Social</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {socialCards.map((card, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 + 0.2 }}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-14 h-14 rounded-full -translate-y-5 translate-x-5 opacity-10"
                  style={{ backgroundColor: card.color }} />
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                  style={{ backgroundColor: card.bg }}>
                  <card.icon size={17} style={{ color: card.color }} />
                </div>
                <p className="text-xl font-black text-gray-900 leading-none mb-1">{card.value}</p>
                <p className="text-xs text-gray-400">{card.label}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Profils + Top plats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Profils */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <p className="font-black text-gray-900 mb-4">Types de clients</p>
            <div className="space-y-3">
              {profiles.map(prof => {
                const count = stats.profileCounts[prof.key] || 0
                const pct = stats.totalSessions > 0 ? Math.round((count / stats.totalSessions) * 100) : 0
                return (
                  <div key={prof.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-700">{prof.emoji} {prof.label}</span>
                      <span className="text-sm font-black text-gray-900">{count} <span className="text-xs text-gray-400 font-normal">({pct}%)</span></span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
                        className="h-full rounded-full" style={{ backgroundColor: p }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top plats */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <p className="font-black text-gray-900 mb-4 flex items-center gap-2"><Trophy size={16} className="text-yellow-500" /> Plats populaires</p>
            {stats.topItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BarChart3 size={32} className="text-gray-300 mb-2" />
                <p className="text-gray-400 text-sm">Pas encore de données</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.topItems.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                      style={{ backgroundColor: medalColors[i] }}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">{formatPrice(item.revenue, restaurant.currency)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-black" style={{ color: p }}>{item.count}x</span>
                      <ArrowUpRight size={12} style={{ color: p }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
