import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_CODES = 500

type KitItem = {
  code: string
  label?: string
}

type KitRequest = {
  restaurant_id?: string
  codes?: KitItem[]
  batch_name?: string
  app_url?: string
  include_png?: boolean
}

type TableRow = {
  id: string
  table_number: string
  zone?: string | null
}

type QRRow = {
  code: string
  table_name?: string | null
}

type ZipEntry = {
  name: string
  data: Buffer
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as KitRequest
    const appUrl = normalizeUrl(body.app_url) || normalizeUrl(process.env.NEXT_PUBLIC_APP_URL) || req.nextUrl.origin
    const includePng = body.include_png !== false

    const { items, defaultName } = body.restaurant_id
      ? await loadRestaurantItems(body.restaurant_id)
      : { items: normalizeItems(body.codes || []), defaultName: 'qr-designer-kit' }

    if (!items.length) {
      return NextResponse.json({ error: 'Aucun QR code a exporter' }, { status: 400 })
    }

    const kitName = safeFilename(body.batch_name || defaultName || 'qr-designer-kit')
    const entries: ZipEntry[] = []
    const csvRows = [
      ['code', 'label', 'url', 'svg_file', 'png_file'],
    ]

    const assetSets = await mapLimit(items.slice(0, MAX_CODES), 6, async (item) => {
      const qrUrl = `${appUrl}/t/${item.code}`
      const svgName = `svg/QR-${item.code}.svg`
      const pngName = `png-1000px/QR-${item.code}.png`
      const [svg, png] = await Promise.all([
        fetchQrAsset(qrUrl, 'svg'),
        includePng ? fetchQrAsset(qrUrl, 'png') : Promise.resolve(null),
      ])

      const files: ZipEntry[] = [{ name: svgName, data: svg }]
      if (png) files.push({ name: pngName, data: png })

      return {
        files,
        csvRow: [
        item.code,
        item.label || '',
        qrUrl,
        svgName,
        includePng ? pngName : '',
        ],
      }
    })

    for (const assetSet of assetSets) {
      entries.push(...assetSet.files)
      csvRows.push(assetSet.csvRow)
    }

    entries.unshift(
      { name: 'README.txt', data: Buffer.from(buildReadme({ appUrl, count: items.length }), 'utf8') },
      { name: 'mapping.csv', data: Buffer.from(toCsv(csvRows), 'utf8') },
    )

    const zip = createZip(entries)

    return new Response(new Uint8Array(zip), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${kitName}.zip"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Export impossible'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function loadRestaurantItems(restaurantId: string) {
  const admin = getSupabaseAdmin()

  const [{ data: restaurant }, { data: qrRows, error }, { data: tableRows }] = await Promise.all([
    admin.from('restaurants').select('name').eq('id', restaurantId).maybeSingle(),
    admin
      .from('qr_codes')
      .select('code, table_name')
      .eq('restaurant_id', restaurantId)
      .order('linked_at', { ascending: false }),
    admin
      .from('restaurant_tables')
      .select('id, table_number, zone')
      .eq('restaurant_id', restaurantId),
  ])

  if (error) throw new Error(error.message)

  const tables = new Map<string, TableRow>()
  ;((tableRows || []) as TableRow[]).forEach(table => tables.set(table.id, table))

  const items = ((qrRows || []) as QRRow[])
    .map(qr => {
      const cleanCode = cleanQrCode(qr.code)
      if (!cleanCode) return null

      let label = qr.table_name || ''
      if (label && UUID_REGEX.test(label)) {
        const table = tables.get(label)
        if (table) label = `${table.zone ? table.zone + ' - ' : ''}Table ${table.table_number}`
      }

      return { code: cleanCode, label }
    })
    .filter(Boolean) as KitItem[]

  return {
    items,
    defaultName: restaurant?.name ? `kit-designer-${restaurant.name}` : 'kit-designer-qr',
  }
}

function normalizeItems(items: KitItem[]): KitItem[] {
  const seen = new Set<string>()
  const result: KitItem[] = []

  for (const item of items) {
    const code = cleanQrCode(item.code)
    if (!code || seen.has(code)) continue
    seen.add(code)
    result.push({ code, label: item.label || '' })
  }

  return result
}

async function mapLimit<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex
      nextIndex += 1
      results[currentIndex] = await mapper(items[currentIndex])
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker)
  await Promise.all(workers)
  return results
}

function cleanQrCode(code: string): string {
  return String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 32)
}

function normalizeUrl(url?: string): string {
  if (!url) return ''
  try {
    const parsed = new URL(url)
    return parsed.origin
  } catch {
    return ''
  }
}

async function fetchQrAsset(qrUrl: string, format: 'svg' | 'png'): Promise<Buffer> {
  const url = new URL('https://api.qrserver.com/v1/create-qr-code/')
  url.searchParams.set('data', qrUrl)
  url.searchParams.set('size', format === 'png' ? '1000x1000' : '2000x2000')
  url.searchParams.set('format', format)
  url.searchParams.set('ecc', 'M')
  url.searchParams.set('qzone', '4')
  url.searchParams.set('color', '000000')
  url.searchParams.set('bgcolor', 'FFFFFF')
  url.searchParams.set('charset-source', 'UTF-8')
  url.searchParams.set('charset-target', 'UTF-8')

  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Generation QR ${format.toUpperCase()} impossible pour ${qrUrl}`)
  }

  return Buffer.from(await res.arrayBuffer())
}

function buildReadme({ appUrl, count }: { appUrl: string; count: number }) {
  return [
    'TABLEQR - Kit designer QR',
    '',
    `Nombre de QR: ${Math.min(count, MAX_CODES)}`,
    `URL de base encodee: ${appUrl}/t/CODE`,
    '',
    'Contenu du ZIP:',
    '- svg/: QR vectoriels, a utiliser en priorite dans Illustrator, InDesign, Canva ou Figma.',
    '- png-1000px/: PNG haute resolution, utile seulement si le logiciel refuse le SVG.',
    '- mapping.csv: correspondance code, libelle, URL et fichiers.',
    '',
    'Regles impression:',
    '- Ne pas rogner la marge blanche autour du QR.',
    '- Garder un QR noir sur fond blanc ou tres clair.',
    '- Taille conseillee sur chevalet de table: 4 a 5 cm minimum.',
    '- Eviter les finitions trop brillantes sur la zone QR.',
    '- Tester un BAT imprime avec plusieurs telephones avant production.',
    '',
    'Les QR sont generes avec une quiet zone de 4 modules et une correction M.',
    'Le SVG reste le format imprimeur recommande; le PNG 1000 px sert de secours.',
    '',
  ].join('\n')
}

function safeFilename(value: string): string {
  const fallback = 'kit-designer-qr'
  const clean = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return clean || fallback
}

function toCsv(rows: string[][]): string {
  return rows.map(row => row.map(csvEscape).join(',')).join('\n') + '\n'
}

function csvEscape(value: string): string {
  const clean = String(value ?? '')
  if (!/[",\n\r]/.test(clean)) return clean
  return `"${clean.replace(/"/g, '""')}"`
}

function createZip(entries: ZipEntry[]): Buffer {
  const chunks: Buffer[] = []
  const centralDirectory: Buffer[] = []
  let offset = 0
  const { date, time } = getDosDateTime(new Date())

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8')
    const data = entry.data
    const crc = crc32(data)
    const localHeader = Buffer.alloc(30)

    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt16LE(0x0800, 6)
    localHeader.writeUInt16LE(0, 8)
    localHeader.writeUInt16LE(time, 10)
    localHeader.writeUInt16LE(date, 12)
    localHeader.writeUInt32LE(crc, 14)
    localHeader.writeUInt32LE(data.length, 18)
    localHeader.writeUInt32LE(data.length, 22)
    localHeader.writeUInt16LE(name.length, 26)
    localHeader.writeUInt16LE(0, 28)

    chunks.push(localHeader, name, data)

    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(0x02014b50, 0)
    centralHeader.writeUInt16LE(20, 4)
    centralHeader.writeUInt16LE(20, 6)
    centralHeader.writeUInt16LE(0x0800, 8)
    centralHeader.writeUInt16LE(0, 10)
    centralHeader.writeUInt16LE(time, 12)
    centralHeader.writeUInt16LE(date, 14)
    centralHeader.writeUInt32LE(crc, 16)
    centralHeader.writeUInt32LE(data.length, 20)
    centralHeader.writeUInt32LE(data.length, 24)
    centralHeader.writeUInt16LE(name.length, 28)
    centralHeader.writeUInt16LE(0, 30)
    centralHeader.writeUInt16LE(0, 32)
    centralHeader.writeUInt16LE(0, 34)
    centralHeader.writeUInt16LE(0, 36)
    centralHeader.writeUInt32LE(0, 38)
    centralHeader.writeUInt32LE(offset, 42)

    centralDirectory.push(centralHeader, name)
    offset += localHeader.length + name.length + data.length
  }

  const centralStart = offset
  const centralSize = centralDirectory.reduce((sum, chunk) => sum + chunk.length, 0)
  const end = Buffer.alloc(22)

  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralSize, 12)
  end.writeUInt32LE(centralStart, 16)
  end.writeUInt16LE(0, 20)

  return Buffer.concat([...chunks, ...centralDirectory, end])
}

function getDosDateTime(date: Date) {
  const year = Math.max(date.getFullYear(), 1980)
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  }
}

const CRC_TABLE = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  CRC_TABLE[i] = c >>> 0
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff
  for (const byte of data) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}
