import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase/client'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function QRRedirectPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const upperCode = code.toUpperCase()
  const admin = getSupabaseAdmin()

  const { data: qr, error: qrError } = await admin
    .from('qr_codes')
    .select('restaurant_id, table_name, scan_count')
    .eq('code', upperCode)
    .maybeSingle()

  if (qrError || !qr) {
    return <NotLinkedPage code={upperCode} color="#F26522" restoName={null} migrationMissing={qrError?.code === '42P01'} />
  }

  await admin
    .from('qr_codes')
    .update({ scan_count: (qr.scan_count || 0) + 1 })
    .eq('code', upperCode)

  if (!qr.restaurant_id) {
    return <NotLinkedPage code={upperCode} color="#F26522" restoName={null} />
  }

  const { data: resto } = await admin
    .from('restaurants')
    .select('slug, is_active, name, primary_color')
    .eq('id', qr.restaurant_id)
    .maybeSingle()

  if (!resto || !resto.is_active) {
    return <NotLinkedPage code={upperCode} color={resto?.primary_color || '#F26522'} restoName={resto?.name || null} />
  }

  let tableParam = ''
  if (qr.table_name) {
    if (UUID_REGEX.test(qr.table_name)) {
      const { data: t } = await admin
        .from('restaurant_tables')
        .select('table_number, zone')
        .eq('id', qr.table_name)
        .maybeSingle()

      const displayName = t
        ? `${t.zone ? t.zone + ' · ' : ''}Table ${t.table_number}`
        : qr.table_name
      tableParam = `?table=${qr.table_name}&tableName=${encodeURIComponent(displayName)}`
    } else {
      const { data: t } = await admin
        .from('restaurant_tables')
        .select('id')
        .eq('restaurant_id', qr.restaurant_id)
        .eq('table_number', qr.table_name)
        .maybeSingle()

      tableParam = t
        ? `?table=${t.id}&tableName=${encodeURIComponent(qr.table_name)}`
        : `?table=${encodeURIComponent(qr.table_name)}`
    }
  }

  redirect(`/${resto.slug}/menu${tableParam}`)
}

function NotLinkedPage({ code, color, restoName, migrationMissing }: {
  code: string; color: string; restoName: string | null; migrationMissing?: boolean
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-xs w-full">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg"
          style={{ backgroundColor: color }}>
          <span className="text-white text-3xl font-black">T</span>
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-1">
          TABLE<span style={{ color: '#F26522' }}>QR</span>
        </h1>
        {migrationMissing ? (
          <p className="text-amber-600 text-sm mt-3 mb-8 font-semibold">
            Configuration en cours — revenez dans quelques instants.
          </p>
        ) : restoName ? (
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
          <p className="text-lg font-black tracking-widest text-gray-800">{code}</p>
        </div>
      </div>
    </div>
  )
}
