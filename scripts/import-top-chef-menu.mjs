import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const DEFAULT_RESTAURANT_ID = '385e4947-5a7e-4f10-9874-4ee31ed3f3b8'
const DEFAULT_IMAGE_DIR = 'Biblio_images'
const BUCKET = 'restaurant-images'
const IMAGE_PREFIX = 'menu-import'

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

function argValue(name, fallback) {
  const prefix = `--${name}=`
  const found = process.argv.find((arg) => arg.startsWith(prefix))
  return found ? found.slice(prefix.length) : fallback
}

const restaurantId = argValue('restaurant', DEFAULT_RESTAURANT_ID)
const imageDir = argValue('images', DEFAULT_IMAGE_DIR)
const execute = process.argv.includes('--execute')

loadEnv(path.resolve('.env.local'))

function item(category, name, price, image, description, extra = {}) {
  return {
    category,
    name,
    price,
    image,
    description,
    is_vegetarian: false,
    is_vegan: false,
    is_halal: false,
    is_spicy: false,
    spicy_level: 0,
    allergens: [],
    ...extra,
  }
}

function pizza(name, prices, image, description, extra = {}) {
  const sizes = ['Petite', 'Moyenne', 'Grande']
  return prices.map((price, index) =>
    item('Pizzas', `Pizza ${name} - ${sizes[index]}`, price, image, description, extra)
  )
}

const categories = [
  { name: 'Boissons', icon: 'drink' },
  { name: 'Salades', icon: 'salad' },
  { name: 'Poulet braisé', icon: 'chicken' },
  { name: 'Poulets rôtis', icon: 'chicken' },
  { name: 'Tacos & Sandwiches', icon: 'sandwich' },
  { name: 'Jus & Milkshakes', icon: 'juice' },
  { name: 'Desserts', icon: 'dessert' },
  { name: 'Glaces', icon: 'ice-cream' },
  { name: 'Espace événementiel', icon: 'utensils' },
  { name: 'Pizzas', icon: 'pizza' },
  { name: 'Assiettes', icon: 'utensils' },
]

const rawItems = [
  item('Boissons', 'Eau minérale', 1000, null, 'Bouteille d eau fraîche.'),
  item('Boissons', 'Fresco', 1000, 'coca_fanta_sprite.jpg', 'Boisson gazeuse fraîche.'),
  item('Boissons', 'Coca Cola', 1000, 'canette-coca-cola.png', 'Canette de Coca Cola fraîche.'),

  item('Salades', 'Salade libanaise', 3000, 'Salade-libanaise.png', 'Salade fraîche aux saveurs libanaises.', { is_vegetarian: true }),
  item('Salades', 'Salade niçoise', 3000, 'salade-nicoise.jpg', 'Salade garnie façon niçoise.'),
  item('Salades', 'Salade au thon', 3000, 'salade-au-thon.jpg', 'Salade fraîche au thon.'),
  item('Salades', 'Fattouche', 4000, 'fattouche .jpg', 'Salade levantine croquante.', { is_vegetarian: true }),
  item('Salades', 'Salade maison', 4000, 'salade-maison.jpg', 'Salade fraîche de la maison.', { is_vegetarian: true }),
  item('Salades', 'Salade avocat', 4000, 'salde-avocat.jpg', 'Salade fraîche à l avocat.', { is_vegetarian: true }),

  item('Poulet braisé', '1/2 poulet braisé + frites', 5000, 'demi-poulet braisé-avec-frittes.png', 'Demi poulet braisé servi avec frites.'),
  item('Poulet braisé', '1 poulet braisé + frites', 10000, 'pouletèbraisé-entier plus frittes .png', 'Poulet braisé entier servi avec frites.'),
  item('Poulet braisé', '1/2 poulet braisé simple', 4000, null, 'Demi poulet braisé sans accompagnement.'),
  item('Poulet braisé', '1 poulet braisé simple', 9000, null, 'Poulet braisé entier sans accompagnement.'),
  item('Poulet braisé', 'Plat de frites simple', 1500, 'plat de frittes simple.jpg', 'Portion de frites croustillantes.', { is_vegetarian: true }),

  item('Poulets rôtis', '1/2 poulet rôti + frites', 4000, 'demi-poulet-roti-fritte.jpg', 'Demi poulet rôti servi avec frites.'),
  item('Poulets rôtis', 'Poulet rôti + frites', 7000, 'poulet-roti-frites.jpg', 'Poulet rôti servi avec frites.'),
  item('Poulets rôtis', '1/2 poulet pané + frites', 5000, 'demi-poulet-pané-frittes.jpg', 'Demi poulet pané servi avec frites.'),
  item('Poulets rôtis', 'Poulet pané + frites', 10000, 'poulet-pané-frittes.jpg', 'Poulet pané servi avec frites.'),
  item('Poulets rôtis', 'Demi poulet simple', 3000, 'demi-poulet-roti-simple.jpg', 'Demi poulet rôti sans accompagnement.'),
  item('Poulets rôtis', 'Poulet simple', 6000, 'poulet_rotis_entier.png', 'Poulet rôti entier sans accompagnement.'),

  item('Tacos & Sandwiches', 'Sandwich + frites', 6000, 'Sandwiches + frites.png', 'Sandwich servi avec frites.'),
  item('Tacos & Sandwiches', 'Sandwich', 5000, 'Sandwiches-simple.png', 'Sandwich garni maison.'),
  item('Tacos & Sandwiches', 'Tacos', 6000, 'tacos.jpg', 'Tacos garni et généreux.'),

  item('Jus & Milkshakes', 'Milk-shake vanille', 3000, 'vanille milk shake.png', 'Milk-shake frais à la vanille.', { is_vegetarian: true }),
  item('Jus & Milkshakes', 'Milk-shake américain', 3000, 'Milkshak americain.png', 'Milk-shake américain onctueux.', { is_vegetarian: true }),
  item('Jus & Milkshakes', 'Milk-shake chocolat', 3000, 'milk-shake chocolat.png', 'Milk-shake frais au chocolat.', { is_vegetarian: true }),
  item('Jus & Milkshakes', 'Milk-shake fraise', 3000, 'milk-shake-fraise.jpg', 'Milk-shake frais à la fraise.', { is_vegetarian: true }),
  item('Jus & Milkshakes', 'Jus de carotte', 2500, 'milkshake-carotte.jpeg', 'Jus frais de carotte.', { is_vegetarian: true, is_vegan: true }),
  item('Jus & Milkshakes', 'Jus de pomme', 2500, 'jus-pomme.jpeg', 'Jus frais de pomme.', { is_vegetarian: true, is_vegan: true }),
  item('Jus & Milkshakes', 'Limonade', 1500, 'limonade.png', 'Limonade fraîche et acidulée.', { is_vegetarian: true, is_vegan: true }),
  item('Jus & Milkshakes', 'Jus d orange', 1500, 'jus-orange.png', 'Jus d orange frais.', { is_vegetarian: true, is_vegan: true }),
  item('Jus & Milkshakes', 'Jus d ananas', 2000, 'jus-ananas.png', 'Jus frais d ananas.', { is_vegetarian: true, is_vegan: true }),
  item('Jus & Milkshakes', 'Avocat au lait', 2500, 'avocat-au-lait.png', 'Boisson onctueuse avocat et lait.', { is_vegetarian: true }),
  item('Jus & Milkshakes', 'Avocat banane', 2500, 'avocat-banane.png', 'Boisson fraîche avocat et banane.', { is_vegetarian: true }),
  item('Jus & Milkshakes', 'Mojito fraise', 2500, 'majito-fraise.png', 'Mojito frais à la fraise.', { is_vegetarian: true, is_vegan: true }),
  item('Jus & Milkshakes', 'Smoothie pomme', 3000, 'smoothie-pomme.png', 'Smoothie frais à la pomme.', { is_vegetarian: true }),
  item('Jus & Milkshakes', 'Smoothie banane', 3000, 'smoothie-banane.png', 'Smoothie frais à la banane.', { is_vegetarian: true }),

  item('Desserts', 'Café espresso', 1000, 'café-expresso.jpg', 'Café court et intense.', { is_vegetarian: true }),
  item('Desserts', 'Thé à la menthe', 1000, 'thé-a-la-menthe.jpg', 'Thé parfumé à la menthe.', { is_vegetarian: true, is_vegan: true }),
  item('Desserts', 'Salade de fruits', 3000, 'salade-de-fruits.jpg', 'Fruits frais de saison.', { is_vegetarian: true, is_vegan: true }),

  item('Glaces', 'Glace 2 boules', 1000, 'glace-deux-boules.png', 'Deux boules de glace au choix.', { is_vegetarian: true }),
  item('Glaces', 'Glace spéciale', 2000, 'glace-spéciales.jpg', 'Coupe glacée spéciale.', { is_vegetarian: true }),
  item('Glaces', 'Glace 2 boules + crème', 2000, 'glace-deux-boules-plus-cremes.png', 'Deux boules de glace avec crème.', { is_vegetarian: true }),

  item('Espace événementiel', 'Formule 10 personnes', 50000, null, 'Formule événementielle pour 10 personnes.'),
  item('Espace événementiel', 'Formule 15 personnes', 75000, null, 'Formule événementielle pour 15 personnes.'),

  ...pizza('Royale', [4000, 5000, 6000], 'pizza-royale.webp', 'Pizza garnie façon royale.'),
  ...pizza('Margherita', [4000, 5000, 6000], 'pizza-magarita.jpg', 'Pizza tomate, fromage et herbes.', { is_vegetarian: true }),
  ...pizza('Reine', [4000, 5000, 6000], 'pizza-reine.webp', 'Pizza classique jambon et champignons.'),
  ...pizza('Végétarienne', [5000, 6000, 7000], 'pizza-vegetarienne.webp', 'Pizza garnie de légumes.', { is_vegetarian: true }),
  ...pizza('Thon', [5000, 6000, 7000], 'pizza-thon.jpg', 'Pizza généreuse au thon.'),
  ...pizza('Viande hachée', [4000, 5000, 6000], 'pizza-viande-hachée.png', 'Pizza à la viande hachée.'),
  ...pizza('Poulet', [4000, 5000, 6000], 'pizza-poulet.jpg', 'Pizza garnie au poulet.'),
  ...pizza('Merguez', [6000, 7000, 8000], 'pizza-merguez.webp', 'Pizza relevée aux merguez.', { is_spicy: true, spicy_level: 1 }),
  ...pizza('Calabraise', [6000, 7000, 9000], 'pizza-calabraise.jpg', 'Pizza calabraise savoureuse.', { is_spicy: true, spicy_level: 1 }),
  ...pizza('4 saisons', [6000, 7000, 9000], 'pizza-4-Saison.webp', 'Pizza aux garnitures variées.'),
  ...pizza('Top Chef', [7000, 8000, 9000], 'pizza-top-chef.jpg', 'Pizza signature Top Chef.'),
  ...pizza('Mexicaine', [6000, 8000, 9000], 'pizza-mexicaine.jpg', 'Pizza mexicaine épicée.', { is_spicy: true, spicy_level: 1 }),

  item('Assiettes', 'Assiette hamburger', 4000, 'Assiette de humbergeur.jpg', 'Assiette hamburger servie complète.'),
  item('Assiettes', 'Assiette ailes de poulet', 5000, 'Assiettes-ail-de-poulet.webp', 'Ailes de poulet servies en assiette.'),
  item('Assiettes', 'Assiette viande mixte + frites', 5000, 'Assiette-viande-mixte-frittes.jpg', 'Viandes mixtes servies avec frites.'),
  item('Assiettes', 'Assiette double burger', 5000, 'Assiette-6-Double-bergeur.webp', 'Assiette double burger généreuse.'),
  item('Assiettes', 'Assiette chicken burger', 5000, 'Assiette-chiken-berger.jpg', 'Chicken burger servi en assiette.'),
  item('Assiettes', 'Assiette steak à la crème fraîche', 5000, 'Assiette-steak-a-la-creme-fraiche.jpg', 'Steak nappé de crème fraîche.'),
  item('Assiettes', 'Assiette steak poivre vert', 6000, 'steak-poivre-vert.webp', 'Steak sauce poivre vert.'),
  item('Assiettes', 'Assiette escalope de poulet', 5500, 'assiette-escalope-poulet.webp', 'Escalope de poulet servie en assiette.'),
  item('Assiettes', 'Assiette crispy + frites (5 pcs)', 5000, 'assiette-crispy(frittes-plus-5pcs.jpg', 'Crispy de poulet servis avec frites.'),
  item('Assiettes', 'Assiette poulet poivre vert', 5000, 'Poulet-poivres-verts.webp', 'Poulet sauce poivre vert.'),
  item('Assiettes', 'Assiette poulet crème', 6000, 'assiette-de-poulet-a-la-creme.png', 'Poulet nappé de crème.'),
  item('Assiettes', '2 brochettes taouk', 4000, 'brochettes taouk .png', 'Deux brochettes taouk grillées.'),
  item('Assiettes', '2 brochettes de filet + frites', 4000, '2 brochettes-filet+frite.png', 'Deux brochettes de filet avec frites.'),
  item('Assiettes', '2 brochettes kebab + frites', 4000, 'brochettes kabab + frite.png', 'Deux brochettes kebab avec frites.'),
  item('Assiettes', 'Assiette pasta', 6000, 'Assiette-pasta.jpg', 'Assiette de pâtes généreuse.'),
]

const items = rawItems
  .map((entry) => ({ ...entry }))
  .sort((a, b) => {
    const categoryDiff = categoryIndex(a.category) - categoryIndex(b.category)
    if (categoryDiff !== 0) return categoryDiff
    return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
  })
  .map((entry, index, sorted) => ({
    ...entry,
    position: sorted
      .filter((candidate) => candidate.category === entry.category && candidate.name.localeCompare(entry.name, 'fr', { sensitivity: 'base' }) <= 0)
      .length,
  }))

function categoryIndex(name) {
  const index = categories.findIndex((category) => category.name === name)
  return index === -1 ? Number.MAX_SAFE_INTEGER : index
}

function normalize(value) {
  return value
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

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function ensureImageFiles() {
  const missing = []
  const uniqueImages = [...new Set(items.map((entry) => entry.image).filter(Boolean))]
  for (const image of uniqueImages) {
    const fullPath = path.join(imageDir, image)
    try {
      await stat(fullPath)
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
  if (createError) throw new Error(`Impossible de créer le bucket ${BUCKET}: ${createError.message}`)
}

async function uploadImages(supabase, uniqueImages) {
  const uploaded = new Map()
  for (let index = 0; index < uniqueImages.length; index += 1) {
    const image = uniqueImages[index]
    const fullPath = path.join(imageDir, image)
    const buffer = await readFile(fullPath)
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

    if (uploadError) throw new Error(`Upload échoué pour ${image}: ${uploadError.message}`)

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
    uploaded.set(image, data.publicUrl)
    console.log(`Image ${index + 1}/${uniqueImages.length}: ${image}`)
  }
  return uploaded
}

async function getRestaurant(supabase) {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, slug')
    .eq('id', restaurantId)
    .maybeSingle()

  if (error) throw new Error(`Lecture restaurant échouée: ${error.message}`)
  if (!data) throw new Error(`Restaurant introuvable: ${restaurantId}`)
  return data
}

async function upsertCategories(supabase) {
  const { data: existing, error } = await supabase
    .from('menu_categories')
    .select('id, name')
    .eq('restaurant_id', restaurantId)

  if (error) throw new Error(`Lecture catégories échouée: ${error.message}`)

  const byName = new Map((existing || []).map((category) => [normalize(category.name), category]))
  const result = new Map()

  for (let i = 0; i < categories.length; i += 1) {
    const category = categories[i]
    const current = byName.get(normalize(category.name))
    if (current) {
      const { error: updateError } = await supabase
        .from('menu_categories')
        .update({ icon: category.icon, position: i + 1, is_active: true })
        .eq('id', current.id)
      if (updateError) throw new Error(`Mise à jour catégorie ${category.name} échouée: ${updateError.message}`)
      result.set(category.name, current.id)
      continue
    }

    const { data: created, error: insertError } = await supabase
      .from('menu_categories')
      .insert({
        restaurant_id: restaurantId,
        name: category.name,
        icon: category.icon,
        position: i + 1,
        is_active: true,
      })
      .select('id')
      .single()

    if (insertError) throw new Error(`Création catégorie ${category.name} échouée: ${insertError.message}`)
    result.set(category.name, created.id)
  }

  return result
}

async function upsertItems(supabase, categoryIds, uploadedImages) {
  const { data: existing, error } = await supabase
    .from('menu_items')
    .select('id, name')
    .eq('restaurant_id', restaurantId)

  if (error) throw new Error(`Lecture plats échouée: ${error.message}`)

  const byName = new Map((existing || []).map((entry) => [normalize(entry.name), entry]))
  const stats = { created: 0, updated: 0 }

  for (const entry of items) {
    const categoryId = categoryIds.get(entry.category)
    if (!categoryId) throw new Error(`Catégorie manquante pour ${entry.name}: ${entry.category}`)

    const payload = {
      restaurant_id: restaurantId,
      category_id: categoryId,
      name: entry.name,
      description: entry.description,
      price: entry.price,
      allergens: entry.allergens,
      is_vegetarian: entry.is_vegetarian,
      is_vegan: entry.is_vegan,
      is_halal: entry.is_halal,
      is_spicy: entry.is_spicy,
      spicy_level: entry.spicy_level,
      is_available: true,
      order_count: 0,
      position: entry.position,
    }

    if (entry.image) payload.image_url = uploadedImages.get(entry.image)

    const current = byName.get(normalize(entry.name))
    if (current) {
      const { error: updateError } = await supabase
        .from('menu_items')
        .update(payload)
        .eq('id', current.id)
      if (updateError) throw new Error(`Mise à jour plat ${entry.name} échouée: ${updateError.message}`)
      stats.updated += 1
      continue
    }

    const { error: insertError } = await supabase.from('menu_items').insert(payload)
    if (insertError) throw new Error(`Création plat ${entry.name} échouée: ${insertError.message}`)
    stats.created += 1
  }

  return stats
}

function printPlan(uniqueImages, missing) {
  const imageLess = items.filter((entry) => !entry.image).map((entry) => entry.name)
  console.log(`Restaurant: ${restaurantId}`)
  console.log(`Dossier images: ${imageDir}`)
  console.log(`Mode: ${execute ? 'EXECUTE' : 'DRY RUN'}`)
  console.log(`Catégories: ${categories.length}`)
  console.log(`Plats: ${items.length}`)
  console.log(`Images à uploader: ${uniqueImages.length}`)
  console.log(`Plats sans image: ${imageLess.length}`)
  for (const name of imageLess) console.log(`- sans image: ${name}`)
  if (missing.length) {
    console.log(`Images manquantes: ${missing.length}`)
    for (const image of missing) console.log(`- manquante: ${image}`)
  }
}

async function main() {
  const { uniqueImages, missing } = await ensureImageFiles()
  printPlan(uniqueImages, missing)

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

  const restaurant = await getRestaurant(supabase)
  console.log(`Restaurant trouvé: ${restaurant.name} (${restaurant.slug})`)

  await ensureBucket(supabase)
  const uploadedImages = await uploadImages(supabase, uniqueImages)
  const categoryIds = await upsertCategories(supabase)
  const stats = await upsertItems(supabase, categoryIds, uploadedImages)

  console.log(`Import terminé: ${stats.created} créés, ${stats.updated} mis à jour.`)
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
