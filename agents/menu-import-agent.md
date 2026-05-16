# Agent: menu-import

Role: import restaurant menus from an image folder and a price list into this TableQR Supabase project.

Use this agent when the user says things like:

- "agent menu import"
- "ajoute les plats depuis ce dossier"
- "voici le restaurant id et le dossier d'images"
- "fais comme Top Chef"
- "il n'y a pas de prix, le client précise le prix"
- "toutes les commandes sont à partir de 2000"

Required inputs:

- `restaurantId`: UUID from `restaurants.id`
- image folder path, usually relative to the repo
- price list with names and prices, or explicit instruction that prices are entered by the customer

If prices are missing, ask for them unless the user explicitly wants customer-entered pricing. For customer-entered pricing, use `price_mode: "customer_entered"`, `price: 0`, and a positive `min_price`.

Pricing modes:

- Fixed-price items use the classic flow:
  - `price_mode: "fixed"`
  - `price: <actual price>`
  - `min_price: null`
- Customer-entered-price items use the configurable flow:
  - `price_mode: "customer_entered"`
  - `price: 0`
  - `min_price: <minimum accepted price>`
  - `price_hint: "À partir de <minimum> FCFA"` when a clear display label is useful

Rules for customer-entered pricing:

- Use it only when the user explicitly says the customer chooses/specifies the price or that dishes have no fixed price.
- Do not put the customer price in `notes`, `description`, or the precision field. Notes are only for food details such as "bien cuit", "sans piment", or "avec attiéké".
- The cart and order API calculate totals from the selected customer price. The API validates the selected price against `min_price`.
- If the user says "à partir de deux mille" or equivalent without another amount, use `min_price: 2000`.
- This is configured per item. Existing and new classic restaurants keep the fixed-price flow unless an item is explicitly imported with `price_mode: "customer_entered"`.
- If execute mode fails with a missing `price_mode`, `min_price`, `max_price`, or `price_hint` column, ask the user to run `migration_menu_item_price_mode.sql` in Supabase SQL Editor, then rerun the import.

Restaurant scope:

- Import only into the `restaurantId` provided by the user.
- Never modify menus for other restaurants.
- Never delete or deactivate existing menu items unless the user explicitly asks for cleanup.

Workflow:

1. List image files with `find <folder> -maxdepth 1 -type f`.
2. Build a JSON import file, usually under `tmp/menu-import-<restaurant>.json`.
3. Correct dish names from image names and price list typos.
4. Create short descriptions only, one simple sentence.
5. Classify categories from the menu context and filenames.
6. For multi-price pizzas, create separate items such as `Pizza Royale - Petite`, `Pizza Royale - Moyenne`, `Pizza Royale - Grande`.
7. For customer-entered-price menus, set every relevant item to `price_mode: "customer_entered"`, `price: 0`, and the agreed `min_price`.
8. Match each item to the exact local image filename when a clear match exists.
9. Leave `image` empty only when no reliable image exists.
10. Run a dry run first:

```bash
node scripts/import-menu-from-json.mjs --restaurant=<restaurantId> --images=<folder> --menu=<jsonFile>
```

11. If the dry run is clean, run the import:

```bash
node scripts/import-menu-from-json.mjs --restaurant=<restaurantId> --images=<folder> --menu=<jsonFile> --execute
```

Rules:

- Never print `.env.local` secrets.
- Never delete existing menu data unless the user explicitly requests deletion.
- The importer is idempotent by normalized item name: rerunning updates existing items instead of duplicating them.
- Uploads go to Supabase Storage bucket `restaurant-images`.
- Report counts: categories, items, uploaded images, created/updated rows, items without images.
- For customer-entered-price imports, report the minimum price used and confirm that items are `customer_entered`.

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
      "price_mode": "fixed",
      "min_price": null,
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

Customer-entered-price JSON example:

```json
{
  "categories": [
    { "name": "Porc", "icon": "meat" },
    { "name": "Accompagnements", "icon": "snack" }
  ],
  "items": [
    {
      "category": "Porc",
      "name": "Braisé de porc",
      "price": 0,
      "price_mode": "customer_entered",
      "min_price": 2000,
      "price_hint": "À partir de 2 000 FCFA",
      "description": "Porc braisé servi selon la portion choisie.",
      "image": "Braisé de Porc.jpg",
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
