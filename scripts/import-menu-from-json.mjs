import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const BUCKET = 'restaurant-images'
const IMAGE_PREFIX = 'menu-import'

const ICONS = new Set([
  'utensils',
  'chicken',
  'meat',
  'fish',
  'rice',
  'salad',
  'soup',
  'pot',
  'pizza',
  'sandwich',
  'snack',
  'drink',
  'juice',
  'beer',
  'coffee',
  'dessert',
  'cake',
  'ice-cream',
  'water',
])

function loadEnv(file) {
  if (!existsSync(file)) return
  const content = readFileSync(file, 'utf8')
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const index = line.indexOf('=')
    if (index === -1) continue
    const key = line.slice(0, index).trim()
    const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

function argValue(name, fallback = null) {
  const prefix = `--${name}=`
  const found = process.argv.find((arg) => arg.startsWith(prefix))
  return found ? found.slice(prefix.length) : fallback
}

function requiredArg(name) {
  const value = argValue(name)
  if (!value) throw new Error(`Argument manquant: --${name}=...`)
  return value
}

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function slugify(value) {
  return normalize(value).replace(/\s+/g, '-').replace(/^-|-$/g, '') || 'image'
}

function contentType(file) {
  const ext = path.extname(file).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  return 'image/jpeg'
}

function isRemoteImage(value) {
  return /^https?:\/\//i.test(String(value || ''))
}

function normalizePriceMode(value) {
  return value === 'customer_entered' ? 'customer_entered' : 'fixed'
}

function optionalPositiveNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function guessIcon(categoryName) {
  const value = normalize(categoryName)
  if (value.includes('pizza')) return 'pizza'
  if (value.includes('salade')) return 'salad'
  if (value.includes('poulet')) return 'chicken'
  if (value.includes('sandwich') || value.includes('tacos')) return 'sandwich'
  if (value.includes('jus') || value.includes('smoothie') || value.includes('milk')) return 'juice'
  if (value.includes('boisson') || value.includes('soda')) return 'drink'
  if (value.includes('cafe') || value.includes('the')) return 'coffee'
  if (value.includes('glace')) return 'ice-cream'
  if (value.includes('dessert')) return 'dessert'
  if (value.includes('viande') || value.includes('steak')) return 'meat'
  if (value.includes('poisson') || value.includes('thon')) return 'fish'
  return 'utensils'
}

function readMenu(file) {
  const data = JSON.parse(readFileSync(file, 'utf8'))
  if (!Array.isArray(data.items)) throw new Error('Le fichier menu doit contenir un tableau "items".')

  const categoryNames = []
  for (const category of data.categories || []) {
    if (category?.name && !categoryNames.some((name) => normalize(name) === normalize(category.name))) {
      categoryNames.push(category.name)
    }
  }
  for (const entry of data.items) {
    if (entry?.category && !categoryNames.some((name) => normalize(name) === normalize(entry.category))) {
      categoryNames.push(entry.category)
    }
  }

  const categories = categoryNames.map((name, index) => {
    const fromInput = data.categories?.find((category) => normalize(category.name) === normalize(name))
    const icon = fromInput?.icon && ICONS.has(fromInput.icon) ? fromInput.icon : guessIcon(name)
    return {
      name: String(name || '').trim(),
      icon,
      position: Number.isFinite(Number(fromInput?.position)) ? Number(fromInput.position) : index + 1,
    }
  })

  const categoryOrder = new Map(categories.map((category, index) => [normalize(category.name), index]))
  const items = data.items.map((entry) => {
    const priceMode = normalizePriceMode(entry.price_mode)
    const price = priceMode === 'customer_entered' && entry.price === undefined ? 0 : Number(entry.price)
    const minPrice = optionalPositiveNumber(entry.min_price ?? entry.minimum_price)
    const maxPrice = optionalPositiveNumber(entry.max_price ?? entry.maximum_price)
    if (!entry.category) throw new Error(`Categorie manquante pour le plat: ${entry.name || '(sans nom)'}`)
    if (!entry.name) throw new Error('Un plat a un nom manquant.')
    if (!Number.isFinite(price)) throw new Error(`Prix invalide pour "${entry.name}".`)
    if (priceMode === 'customer_entered' && !minPrice) throw new Error(`Prix minimum manquant pour "${entry.name}".`)

    const image = entry.image || entry.image_file || null
    const imageUrl = entry.image_url || (isRemoteImage(image) ? image : null)
    const imageFile = image && !isRemoteImage(image) ? image : null

    return {
      category: String(entry.category).trim(),
      name: String(entry.name).trim(),
      price,
      price_mode: priceMode,
      min_price: priceMode === 'customer_entered' ? minPrice : null,
      max_price: priceMode === 'customer_entered' ? maxPrice : null,
      price_hint: priceMode === 'customer_entered' ? String(entry.price_hint || '').trim() || null : null,
      description: String(entry.description || '').trim(),
      imageFile,
      imageUrl,
      allergens: Array.isArray(entry.allergens) ? entry.allergens : [],
      is_vegetarian: Boolean(entry.is_vegetarian),
      is_vegan: Boolean(entry.is_vegan),
      is_halal: Boolean(entry.is_halal),
      is_spicy: Boolean(entry.is_spicy),
      spicy_level: Number.isFinite(Number(entry.spicy_level)) ? Number(entry.spicy_level) : 0,
      is_available: entry.is_available !== false,
      position: Number.isFinite(Number(entry.position)) ? Number(entry.position) : null,
      categoryIndex: categoryOrder.get(normalize(entry.category)) ?? Number.MAX_SAFE_INTEGER,
    }
  })

  const sortedItems = items.sort((a, b) => {
    if (a.categoryIndex !== b.categoryIndex) return a.categoryIndex - b.categoryIndex
    return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
  })

  const positionByCategory = new Map()
  for (const entry of sortedItems) {
    if (entry.position !== null) continue
    const key = normalize(entry.category)
    const next = (positionByCategory.get(key) || 0) + 1
    positionByCategory.set(key, next)
    entry.position = next
  }

  return { categories, items: sortedItems }
}

async function ensureImageFiles(items, imageDir) {
  const missing = []
  const uniqueImages = [...new Set(items.map((entry) => entry.imageFile).filter(Boolean))]
  for (const image of uniqueImages) {
    try {
      await stat(path.join(imageDir, image))
    } catch {
      missing.push(image)
    }
  }
  return { uniqueImages, missing }
}

async function ensureBucket(supabase) {
  const { data, error } = await supabase.storage.listBuckets()
  if (error) throw new Error(`Impossible de lister les buckets: ${error.message}`)
  if (data.some((bucket) => bucket.name === BUCKET)) return

  const { error: createError } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  })
  if (createError) throw new Error(`Impossible de creer le bucket ${BUCKET}: ${createError.message}`)
}

async function uploadImages(supabase, restaurantId, imageDir, uniqueImages) {
  const uploaded = new Map()

  for (let index = 0; index < uniqueImages.length; index += 1) {
    const image = uniqueImages[index]
    const buffer = await readFile(path.join(imageDir, image))
    const ext = path.extname(image).toLowerCase()
    const storagePath = `${restaurantId}/${IMAGE_PREFIX}/${slugify(path.basename(image, ext))}${ext}`

    let uploadError = null
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
        contentType: contentType(image),
        upsert: true,
      })
      uploadError = error
      if (!error) break
      console.log(`Retry upload ${attempt}/4 pour ${image}: ${error.message}`)
      await wait(1000 * attempt)
    }

    if (uploadError) throw new Error(`Upload echoue pour ${image}: ${uploadError.message}`)

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
    uploaded.set(image, data.publicUrl)
    console.log(`Image ${index + 1}/${uniqueImages.length}: ${image}`)
  }

  return uploaded
}

async function getRestaurant(supabase, restaurantId) {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, slug')
    .eq('id', restaurantId)
    .maybeSingle()

  if (error) throw new Error(`Lecture restaurant echouee: ${error.message}`)
  if (!data) throw new Error(`Restaurant introuvable: ${restaurantId}`)
  return data
}

async function ensureCustomerPriceSchema(supabase, items) {
  if (!items.some((entry) => entry.price_mode === 'customer_entered')) return

  const { error } = await supabase
    .from('menu_items')
    .select('price_mode, min_price, max_price, price_hint')
    .limit(1)

  if (error) {
    throw new Error('Migration prix client manquante: executez migration_menu_item_price_mode.sql dans Supabase SQL Editor puis relancez l import.')
  }
}

async function upsertCategories(supabase, restaurantId, categories) {
  const { data: existing, error } = await supabase
    .from('menu_categories')
    .select('id, name')
    .eq('restaurant_id', restaurantId)

  if (error) throw new Error(`Lecture categories echouee: ${error.message}`)

  const byName = new Map((existing || []).map((category) => [normalize(category.name), category]))
  const result = new Map()

  for (const category of categories) {
    const current = byName.get(normalize(category.name))
    if (current) {
      const { error: updateError } = await supabase
        .from('menu_categories')
        .update({ icon: category.icon, position: category.position, is_active: true })
        .eq('id', current.id)
      if (updateError) throw new Error(`Mise a jour categorie ${category.name} echouee: ${updateError.message}`)
      result.set(normalize(category.name), current.id)
      continue
    }

    const { data: created, error: insertError } = await supabase
      .from('menu_categories')
      .insert({
        restaurant_id: restaurantId,
        name: category.name,
        icon: category.icon,
        position: category.position,
        is_active: true,
      })
      .select('id')
      .single()

    if (insertError) throw new Error(`Creation categorie ${category.name} echouee: ${insertError.message}`)
    result.set(normalize(category.name), created.id)
  }

  return result
}

async function upsertItems(supabase, restaurantId, items, categoryIds, uploadedImages) {
  const { data: existing, error } = await supabase
    .from('menu_items')
    .select('id, name')
    .eq('restaurant_id', restaurantId)

  if (error) throw new Error(`Lecture plats echouee: ${error.message}`)

  const byName = new Map((existing || []).map((entry) => [normalize(entry.name), entry]))
  const stats = { created: 0, updated: 0 }

  for (const entry of items) {
    const categoryId = categoryIds.get(normalize(entry.category))
    if (!categoryId) throw new Error(`Categorie manquante pour ${entry.name}: ${entry.category}`)

    const payload = {
      restaurant_id: restaurantId,
      category_id: categoryId,
      name: entry.name,
      description: entry.description,
      price: entry.price,
      price_mode: entry.price_mode,
      min_price: entry.min_price,
      max_price: entry.max_price,
      price_hint: entry.price_hint,
      allergens: entry.allergens,
      is_vegetarian: entry.is_vegetarian,
      is_vegan: entry.is_vegan,
      is_halal: entry.is_halal,
      is_spicy: entry.is_spicy,
      spicy_level: entry.spicy_level,
      is_available: entry.is_available,
      order_count: 0,
      position: entry.position,
    }

    const imageUrl = entry.imageUrl || (entry.imageFile ? uploadedImages.get(entry.imageFile) : null)
    if (imageUrl) payload.image_url = imageUrl

    const current = byName.get(normalize(entry.name))
    if (current) {
      const { error: updateError } = await supabase
        .from('menu_items')
        .update(payload)
        .eq('id', current.id)
      if (updateError) throw new Error(`Mise a jour plat ${entry.name} echouee: ${updateError.message}`)
      stats.updated += 1
      continue
    }

    const { error: insertError } = await supabase.from('menu_items').insert(payload)
    if (insertError) throw new Error(`Creation plat ${entry.name} echouee: ${insertError.message}`)
    stats.created += 1
  }

  return stats
}

function printPlan({ restaurantId, imageDir, menuFile, execute, categories, items, uniqueImages, missing }) {
  const withoutImage = items.filter((entry) => !entry.imageFile && !entry.imageUrl)
  const remoteImages = items.filter((entry) => entry.imageUrl).length

  console.log(`Restaurant: ${restaurantId}`)
  console.log(`Dossier images: ${imageDir}`)
  console.log(`Fichier menu: ${menuFile}`)
  console.log(`Mode: ${execute ? 'EXECUTE' : 'DRY RUN'}`)
  console.log(`Categories: ${categories.length}`)
  console.log(`Plats: ${items.length}`)
  console.log(`Images locales a uploader: ${uniqueImages.length}`)
  console.log(`Images URL externes: ${remoteImages}`)
  console.log(`Plats sans image: ${withoutImage.length}`)
  for (const entry of withoutImage) console.log(`- sans image: ${entry.name}`)

  if (missing.length) {
    console.log(`Images manquantes: ${missing.length}`)
    for (const image of missing) console.log(`- manquante: ${image}`)
  }
}

async function main() {
  loadEnv(path.resolve('.env.local'))

  const restaurantId = requiredArg('restaurant')
  const imageDir = argValue('images', 'Biblio_images')
  const menuFile = requiredArg('menu')
  const execute = process.argv.includes('--execute')

  const { categories, items } = readMenu(menuFile)
  const { uniqueImages, missing } = await ensureImageFiles(items, imageDir)

  printPlan({ restaurantId, imageDir, menuFile, execute, categories, items, uniqueImages, missing })

  if (missing.length) {
    process.exitCode = 1
    return
  }

  if (!execute) return

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Variables NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquantes.')
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const restaurant = await getRestaurant(supabase, restaurantId)
  console.log(`Restaurant trouve: ${restaurant.name} (${restaurant.slug})`)

  await ensureCustomerPriceSchema(supabase, items)
  await ensureBucket(supabase)
  const uploadedImages = await uploadImages(supabase, restaurantId, imageDir, uniqueImages)
  const categoryIds = await upsertCategories(supabase, restaurantId, categories)
  const stats = await upsertItems(supabase, restaurantId, items, categoryIds, uploadedImages)

  console.log(`Import termine: ${stats.created} crees, ${stats.updated} mis a jour.`)
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
