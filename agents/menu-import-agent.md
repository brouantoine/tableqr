# Agent: menu-import

Role: import restaurant menus from an image folder and a price list into this TableQR Supabase project.

Use this agent when the user says things like:

- "agent menu import"
- "ajoute les plats depuis ce dossier"
- "voici le restaurant id et le dossier d'images"
- "fais comme Top Chef"

Required inputs:

- `restaurantId`: UUID from `restaurants.id`
- image folder path, usually relative to the repo
- price list with names and prices

If prices are missing, ask for them. The `menu_items.price` column is required. Only use `0` when the user explicitly asks for temporary prices.

Workflow:

1. List image files with `find <folder> -maxdepth 1 -type f`.
2. Build a JSON import file, usually under `tmp/menu-import-<restaurant>.json`.
3. Correct dish names from image names and price list typos.
4. Create short descriptions only, one simple sentence.
5. Classify categories from the menu context and filenames.
6. For multi-price pizzas, create separate items such as `Pizza Royale - Petite`, `Pizza Royale - Moyenne`, `Pizza Royale - Grande`.
7. Match each item to the exact local image filename when a clear match exists.
8. Leave `image` empty only when no reliable image exists.
9. Run a dry run first:

```bash
node scripts/import-menu-from-json.mjs --restaurant=<restaurantId> --images=<folder> --menu=<jsonFile>
```

10. If the dry run is clean, run the import:

```bash
node scripts/import-menu-from-json.mjs --restaurant=<restaurantId> --images=<folder> --menu=<jsonFile> --execute
```

Rules:

- Never print `.env.local` secrets.
- Never delete existing menu data unless the user explicitly requests deletion.
- The importer is idempotent by normalized item name: rerunning updates existing items instead of duplicating them.
- Uploads go to Supabase Storage bucket `restaurant-images`.
- Report counts: categories, items, uploaded images, created/updated rows, items without images.

JSON schema:

```json
{
  "categories": [
    { "name": "Boissons", "icon": "drink" }
  ],
  "items": [
    {
      "category": "Boissons",
      "name": "Coca Cola",
      "price": 1000,
      "description": "Canette de Coca Cola fraiche.",
      "image": "canette-coca-cola.png",
      "is_vegetarian": false,
      "is_vegan": false,
      "is_halal": false,
      "is_spicy": false,
      "spicy_level": 0,
      "allergens": []
    }
  ]
}
```

Allowed icons:

`utensils`, `chicken`, `meat`, `fish`, `rice`, `salad`, `soup`, `pot`, `pizza`, `sandwich`, `snack`, `drink`, `juice`, `beer`, `coffee`, `dessert`, `cake`, `ice-cream`, `water`.
