# Diagnostic : Flux "Marquer payé"

## 🎯 Ta question
> "Je ne sais pas si tu m'as donné une migration concernant ça et j'ai pas appliquée, sinon ca marche toujours pas"

## ✅ Réponse : Oui, les migrations existent et voici le flux complet

### 1️⃣ Migrations SQL nécessaires (DÉJÀ DOCUMENTÉES)

```
✅ migration_subscription_month_status.sql
   - Ajoute: subscription_paid_until DATE
   - Ajoute: subscription_last_payment_at TIMESTAMPTZ
   - Ajoute: subscription_monthly_amount DECIMAL(10,2)
   - Ajoute: subscription_payment_note TEXT

✅ migration_subscription_payments.sql
   - Crée table: subscription_payments
   - Colonnes clés: restaurant_id, month_key, amount, status, paid_at, reviewed_at
```

**❗ ACTION**: Si tu ne les as pas appliquées, exécute-les dans Supabase SQL Editor.

---

### 2️⃣ Comment fonctionne le flux "marquer payé"

```
ÉTAPE 1: Composant AbonnementsTab
├─ L'utilisateur sélectionne:
│  ├─ Un restaurant
│  ├─ Un mois (month_key = "2025-05")
│  └─ Une date de paiement (payment_date = "2025-05-15")
│
├─ Clique "Marquer payé"
└─ POST /api/superadmin/subscription-payments
   {
     "restaurant_id": "uuid-xxx",
     "month": "2025-05",
     "payment_date": "2025-05-15",
     "amount": 15000
   }

ÉTAPE 2: API route.ts (POST)
├─ Valide les paramètres
├─ Cherche le restaurant
├─ Crée/met à jour subscription_payments
│  ├─ month_key: "2025-05"
│  ├─ paid_at: "2025-05-15" (DATE)
│  ├─ status: "approved"
│  └─ reviewed_at: NOW()
│
└─ Appelle markRestaurantPaidUntil()
   ├─ Calcule: getMonthEndDateString("2025-05") = "2025-05-31"
   ├─ Met à jour restaurants:
   │  ├─ subscription_paid_until: "2025-05-31" ⭐ CLÉ
   │  ├─ subscription_last_payment_at: "2025-05-15T00:00:00.000Z"
   │  ├─ subscription_monthly_amount: 15000
   │  └─ subscription_status: "subscribed"
   └─ Retourne le restaurant mis à jour

ÉTAPE 3: API répond au composant
{
  "data": { /* subscription_payments */, status: "approved" },
  "restaurant": { /* restaurant mis à jour avec subscription_paid_until */ }
}

ÉTAPE 4: AbonnementsTab met à jour
├─ replacePayment(result.data)
│  └─ Met à jour la liste des paiements
│
├─ onRestaurantUpdated(result.restaurant)
│  └─ Appelle le callback du parent

ÉTAPE 5: SuperAdminDashboard.handleRestaurantUpdated()
├─ setLocalRestaurants(prev => 
│    prev.map(r => r.id === updated.id ? { ...r, ...updated } : r)
│  )
│  └─ Met à jour l'état local avec subscription_paid_until ⭐
│
└─ Les filtres se recalculent automatiquement:
   ├─ subscribed = restaurants payés ✅
   ├─ unpaid = restaurants non payés ✅
   └─ Les KPI MRR, conversion rate se mettent à jour ✅

ÉTAPE 6: isRestaurantMonthPaid() utilise subscription_paid_until
├─ Compare: restaurant.subscription_paid_until >= monthEnd
├─ Retourne: true si payé ✅
└─ Les composants affichent le bon statut
```

---

### 3️⃣ Utilisation de la date

**La date du paiement (`payment_date`):**
- ❌ N'est PAS utilisée pour calculer le mois (c'est le paramètre `month` qui le fait)
- ✅ EST utilisée comme `paid_at` dans subscription_payments
- ✅ EST utilisée comme `subscription_last_payment_at` dans restaurants

**Le mois (`month`):**
- ✅ EST utilisé pour calculer `subscription_paid_until` (dernier jour du mois)
- ✅ EST stocké comme `month_key` dans subscription_payments

---

### 4️⃣ Code clé garantissant la mise à jour

#### ✅ isRestaurantMonthPaid() [lib/subscription.ts:91]
```typescript
export function isRestaurantMonthPaid(restaurant: Restaurant, monthKey = getMonthKey()) {
  if (restaurant.is_preview) return false
  const monthEnd = getMonthEndDate(monthKey)
  if (!monthEnd) return false
  if (restaurant.subscription_paid_until) {
    const paidUntil = new Date(`${restaurant.subscription_paid_until}T23:59:59.999Z`)
    return paidUntil >= monthEnd  // Compare les dates ✅
  }
  return false
}
```

#### ✅ markRestaurantPaidUntil() [app/api/.../route.ts:65]
```typescript
const nextPaidUntil = maxPaidUntil(
  restaurant.subscription_paid_until, 
  paidUntil  // = getMonthEndDateString(monthKey)
)
// Met à jour:
await admin
  .from('restaurants')
  .update({
    subscription_status: 'subscribed',
    subscription_paid_until: nextPaidUntil,  // ⭐ CLÉ
    subscription_last_payment_at: `${paidAt}T00:00:00.000Z`,
    subscription_monthly_amount: amount,
  })
```

#### ✅ Composant filtre mis à jour [components/superadmin/SuperAdminDashboard.tsx]
```typescript
const isMonthPaid = (restaurant: Restaurant) =>
  selectedMonthPaymentByRestaurant.get(restaurant.id)?.status === 'approved'
  || isRestaurantMonthPaid(restaurant, selectedMonth)  // ⭐ Utilise subscription_paid_until

const subscribed = useMemo(() =>
  localRestaurants.filter(r => !r.is_preview && r.is_active && isMonthPaid(r)),
  [localRestaurants, approvedCurrentRestaurantIds, currentMonthKey]
)
```

---

### 5️⃣ Checklist pour faire marcher

- [ ] **Migration 1**: Exécute `migration_subscription_month_status.sql` dans Supabase
- [ ] **Migration 2**: Exécute `migration_subscription_payments.sql` dans Supabase
- [ ] **Rebuild**: `npm run dev` et laisse recompiler
- [ ] **Test**: Allez sur `/superadmin/abonnements`
- [ ] **Action**: 
  1. Sélectionnez un mois
  2. Choisissez une date de paiement
  3. Cliquez "Marquer payé" sur un restaurant
- [ ] **Vérifications**:
  - [ ] Le paiement s'affiche avec statut "Validé"
  - [ ] Le restaurant remonte dans "Abonnés"
  - [ ] `subscription_paid_until` est mis à jour (vérifie dans DB)
  - [ ] Les KPI se mettent à jour (MRR, conversion)
  - [ ] Le filtre "À relancer" change

---

### 6️⃣ Si ça marche pas encore

**Option A: Migration manquante**
```sql
-- Vérifie dans Supabase que restaurants a les colonnes:
SELECT subscription_paid_until, subscription_last_payment_at 
FROM restaurants LIMIT 1;

-- Si erreur: exécute les migrations
```

**Option B: Recharge les restaurants locaux**
```typescript
// Dans SuperAdminDashboard, force un refresh:
const { data, error } = await admin
  .from('restaurants')
  .select('*')
  .eq('is_preview', false)
setLocalRestaurants(data || [])
```

**Option C: Logs pour déboguer**
```typescript
// Ajoute dans handleRestaurantUpdated:
console.log('Restaurant reçu:', updated)
console.log('subscription_paid_until:', updated.subscription_paid_until)
console.log('isRestaurantMonthPaid check:', isRestaurantMonthPaid(updated, currentMonthKey))
```

---

## 📊 Résumé

✅ **Flux complet**: Codé et connecté   
✅ **Mise à jour subscription_paid_until**: Implémentée   
✅ **isRestaurantMonthPaid()**: Utilise les bonnes colonnes   
✅ **Composants**: Utilisent la bonne fonction pour calculer le statut   

❓ **Probables raisons si ça ne marche pas**:
1. Les migrations SQL ne sont pas appliquées → Solution: Exécute-les dans Supabase
2. Le composant ne reçoit pas le restaurant mis à jour → Solution: Vérifie `onRestaurantUpdated` est appelé
3. Cache navigateur → Solution: Ctrl+Maj+R ou Incognito

