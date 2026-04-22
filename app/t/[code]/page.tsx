import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase/client'

export default async function QRRedirectPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const upperCode = code.toUpperCase()
  const admin = getSupabaseAdmin()

  const { data: qr } = await admin
    .from('qr_codes')
    .select('restaurant_id, table_name, scan_count, restaurants(slug, is_active, name, primary_color)')
    .eq('code', upperCode)
    .maybeSingle()

  if (qr) {
    admin.from('qr_codes').update({ scan_count: (qr.scan_count || 0) + 1 }).eq('code', upperCode).then(() => {})
  }

  const resto = qr?.restaurants as any
  if (qr?.restaurant_id && resto?.is_active) {
    const tableParam = qr.table_name ? `?table=${encodeURIComponent(qr.table_name)}` : ''
    redirect(`/${resto.slug}/menu${tableParam}`)
  }

  const color = resto?.primary_color || '#F26522'
  const restoName = resto?.name

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-xs w-full">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg"
          style={{ backgroundColor: color }}
        >
          <span className="text-white text-3xl font-black">T</span>
        </div>

        <h1 className="text-2xl font-black text-gray-900 mb-1">
          TABLE<span style={{ color: '#F26522' }}>QR</span>
        </h1>

        {restoName ? (
          <>
            <p className="text-gray-700 font-bold mt-3 mb-1">{restoName}</p>
            <p className="text-gray-400 text-sm mb-8">Ce restaurant arrive bientôt sur TableQR.</p>
          </>
        ) : (
          <p className="text-gray-400 text-sm mt-3 mb-8">
            Ce QR code n&apos;est pas encore configuré.
          </p>
        )}

        <div className="bg-white rounded-2xl px-4 py-3 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">Code</p>
          <p className="text-lg font-black tracking-widest text-gray-800">{upperCode}</p>
        </div>
      </div>
    </div>
  )
}
