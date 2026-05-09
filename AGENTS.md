<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:menu-import-agent -->
# Menu Import Agent

When the user asks to import menu items from an image folder into a restaurant, use `agents/menu-import-agent.md`.

The reusable importer is:

```bash
node scripts/import-menu-from-json.mjs --restaurant=<restaurantId> --images=<folder> --menu=<jsonFile>
node scripts/import-menu-from-json.mjs --restaurant=<restaurantId> --images=<folder> --menu=<jsonFile> --execute
```

Always dry-run first. Do not delete existing menu data unless the user explicitly asks.
<!-- END:menu-import-agent -->
