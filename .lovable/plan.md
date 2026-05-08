# Plan d'exécution

## 1. Suppression douce des employés (soft delete)

**DB :**
- Ajouter colonne `deleted_at TIMESTAMPTZ` sur `public.profiles` et sur `public.employee_details`.
- Créer une fonction RPC `soft_delete_employee(_user_id uuid)` (SECURITY DEFINER) qui :
  - vérifie que l'appelant est owner du même restaurant,
  - empêche de se supprimer soi-même et de supprimer le propriétaire,
  - met `deleted_at = now()` sur profile + employee_details,
  - met `is_active = false`,
  - supprime les `user_roles` du resto pour cet utilisateur (révoque l'accès),
  - écrit un `audit_log`.
- Fonction `restore_employee(_user_id uuid)` symétrique pour restaurer.

**UI (`Staff.tsx` + `EmployeeProfileDialog.tsx`) :**
- Filtrer par défaut les employés `deleted_at IS NULL`.
- Bouton "Supprimer" (rouge, avec `AlertDialog` de confirmation) à côté de "Désactiver".
- Onglet/toggle "Voir les supprimés" pour lister les supprimés et proposer "Restaurer".
- Texte clair : "L'historique (commandes, paie, pointages) est conservé."

## 2. Page qui s'actualise au retour d'onglet

Cause : `react-query` re-fetch par défaut quand la fenêtre regagne le focus.
- Dans `src/App.tsx`, configurer le `QueryClient` avec :
  - `refetchOnWindowFocus: false`
  - `refetchOnReconnect: true` (utile si réseau coupé)
  - `staleTime: 60_000`

## 3. Mises à jour qui ne s'appliquent pas (cache navigateur)

Cause : un Service Worker PWA est déjà actif chez les utilisateurs et sert une coquille HTML cachée.
- Retirer `vite-plugin-pwa` de `vite.config.ts` (on passe au natif via Capacitor, plus besoin de PWA web).
- Désinstaller la dépendance `vite-plugin-pwa`.
- Retirer l'import `virtual:pwa-register` dans `src/main.tsx`.
- Créer `public/sw.js` et `public/service-worker.js` = **kill-switch SW** qui :
  - vide tous les caches,
  - se désinscrit lui-même,
  - force un reload de toutes les pages ouvertes.
- À garder en place 2-3 cycles de release puis supprimer.

Résultat : à la prochaine visite, le vieux SW est remplacé par le kill-switch, qui se nettoie tout seul. Les futures mises à jour passent immédiatement.

## 4. Application installable (Capacitor) avec sons + push

**Installation des dépendances :**
- `@capacitor/core`, `@capacitor/cli` (dev), `@capacitor/ios`, `@capacitor/android`
- `@capacitor/local-notifications` (sons + alertes locales : nouvelles commandes)
- `@capacitor/push-notifications` (notifications serveur)
- `@capacitor/haptics` (vibration)
- `@capacitor/app` (gestion cycle de vie)

**Fichier `capacitor.config.ts`** à la racine :
- appId: `app.lovable.c93390b35d5f488191c31deb382d2107`
- appName: `resto-flow-afrik`
- server.url pointant vers le sandbox preview pour hot-reload pendant le dev
- config notifications (icône, son par défaut)

**Code applicatif :**
- Helper `src/lib/native/notifications.ts` qui :
  - détecte la plateforme native via `Capacitor.isNativePlatform()`,
  - demande les permissions au démarrage,
  - expose `notifyNewOrder()` qui joue un son natif + vibre + affiche une notification (et fallback sur le `playBeep` web existant si non-natif),
  - s'enregistre pour les push et stocke le `device_token` dans une table `push_tokens`.
- Brancher `notifyNewOrder()` dans `useStaffNotifications.ts` (déjà appelé sur nouvelles commandes via Realtime).

**DB pour les push :**
- Table `push_tokens (id, user_id, restaurant_id, platform, token, created_at)` avec RLS : un user ne voit/édite que ses tokens.

**Documentation utilisateur :**
- Petit composant/page expliquant la procédure pour publier sur App Store / Play Store (export GitHub → `npm install` → `npx cap add ios/android` → `npx cap sync` → `npx cap run`).

## Fichiers principaux modifiés / créés

- `supabase/migrations/...` (soft delete + push_tokens)
- `src/App.tsx` (QueryClient options)
- `src/pages/app/Staff.tsx`, `src/components/staff/EmployeeProfileDialog.tsx`
- `vite.config.ts` (retirer VitePWA)
- `src/main.tsx` (retirer registerSW)
- `public/sw.js`, `public/service-worker.js` (kill-switch)
- `capacitor.config.ts` (nouveau)
- `src/lib/native/notifications.ts` (nouveau)
- `src/hooks/useStaffNotifications.ts` (intégrer natif)
- `package.json` (deps Capacitor)

## Notes importantes pour l'utilisateur

- **Capacitor** : pour tester réellement sur ton téléphone tu devras exporter le projet vers GitHub, faire `npm install`, puis `npx cap add ios` (ou `android`) et `npx cap run`. Il faut Xcode (Mac) pour iOS et Android Studio pour Android. Pour publier sur les stores : compte Apple Developer (99 $/an) et Google Play Console (25 $ unique).
- **Kill-switch SW** : les utilisateurs déjà touchés par le bug verront la mise à jour au prochain rechargement (1 à 2 visites max), sans avoir besoin de Ctrl+Shift+R.
- **Soft delete** : un employé "supprimé" disparaît de la liste mais toutes ses données historiques restent intactes pour la conformité comptable et fiscale.