# 🍽️ TableQR — Guide d'installation complet

## Ce dont tu as besoin

1. **Node.js** → https://nodejs.org (télécharge la version LTS)
2. **VS Code** → https://code.visualstudio.com (éditeur de code)
3. **Un compte Supabase** → https://supabase.com (gratuit)

---

## ÉTAPE 1 — Ouvrir le projet

1. Extrais le fichier ZIP sur ton bureau
2. Ouvre VS Code
3. Clique sur "File" → "Open Folder" → sélectionne le dossier `tableqr_final`
4. Ouvre le Terminal dans VS Code : menu "Terminal" → "New Terminal"

---

## ÉTAPE 2 — Installer les dépendances

Dans le terminal, tape cette commande et appuie sur Entrée :

```bash
npm install
```

Attends que ça se termine (1-2 minutes).

---

## ÉTAPE 3 — Créer le projet Supabase

1. Va sur **https://supabase.com**
2. Crée un compte gratuit
3. Clique **"New project"**
4. Donne un nom : `tableqr`
5. Choisis un mot de passe fort (note-le !)
6. Région : **Europe West** (ou la plus proche)
7. Clique **"Create new project"** — attends 2 minutes

---

## ÉTAPE 4 — Créer la base de données

1. Dans ton projet Supabase, clique sur **"SQL Editor"** (menu gauche)
2. Clique **"New query"**
3. Ouvre le fichier `database.sql` depuis VS Code
4. **Copie tout le contenu** (Ctrl+A puis Ctrl+C)
5. **Colle-le** dans l'éditeur SQL de Supabase
6. Clique **"Run"** (bouton vert)
7. Tu devrais voir "Success" ✅

---

## ÉTAPE 5 — Récupérer tes clés Supabase

1. Dans Supabase, clique sur **"Settings"** (roue dentée, menu gauche)
2. Clique sur **"API"**
3. Tu verras :
   - **Project URL** → copie-la
   - **anon public** → copie cette clé
   - **service_role** → copie cette clé (garde-la secrète !)

---

## ÉTAPE 6 — Configurer les variables d'environnement

1. Dans VS Code, ouvre le fichier `.env.local`
2. Remplace les valeurs :

```
NEXT_PUBLIC_SUPABASE_URL=COLLE_TON_PROJECT_URL_ICI
NEXT_PUBLIC_SUPABASE_ANON_KEY=COLLE_TON_ANON_KEY_ICI
SUPABASE_SERVICE_ROLE_KEY=COLLE_TON_SERVICE_ROLE_KEY_ICI
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. Sauvegarde (Ctrl+S)

---

## ÉTAPE 7 — Lancer l'application

Dans le terminal VS Code :

```bash
npm run dev
```

Ouvre ton navigateur sur **http://localhost:3000** 🎉

---

## ÉTAPE 8 — Créer un compte admin

1. Dans Supabase, clique **"Authentication"** → **"Users"**
2. Clique **"Invite user"**
3. Entre ton email
4. Tu reçois un email — clique le lien et crée ton mot de passe
5. Va sur http://localhost:3000/admin/login et connecte-toi

---

## URLs importantes

| Page | URL |
|------|-----|
| Accueil | http://localhost:3000 |
| Admin Login | http://localhost:3000/admin/login |
| Admin Dashboard | http://localhost:3000/admin/dashboard |
| Menu démo | http://localhost:3000/chez-kofi/menu |

---

## Ajouter un premier plat (test rapide)

Dans Supabase → **Table Editor** → table `menu_categories` :
Clique "Insert row" et ajoute :
- `restaurant_id` : copie l'ID du restaurant dans la table `restaurants`
- `name` : "Plats principaux"
- `icon` : "🍛"

Ensuite dans `menu_items`, ajoute un plat test.

---

## En cas de problème

**Erreur "Module not found"** → Relance `npm install`

**Page blanche** → Vérifie le fichier `.env.local`, les clés doivent être exactes

**Erreur Supabase** → Vérifie que le SQL a bien été exécuté dans Supabase

---

## Déployer en ligne (quand tu es prêt)

1. Crée un compte sur **https://vercel.com**
2. Connecte ton projet GitHub
3. Ajoute les variables d'environnement dans Vercel
4. Déploie en un clic !

Ton app sera accessible sur `https://tableqr.vercel.app` (ou ton domaine)
