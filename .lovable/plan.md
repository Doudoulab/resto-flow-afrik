# Refonte Landing Page — Style "Aurora Dark"

Inspirée de l'image fournie : fond sombre profond, halos bleus lumineux, cartes glassmorphism, micro-animations partout, mockups visuels qui représentent les vraies fonctionnalités du SaaS.

## Direction visuelle

- **Mode sombre permanent** sur la landing (bg `slate-950`), même si le reste de l'app reste en clair.
- **Halos / glows bleus** en arrière-plan (radial gradients animés qui pulsent).
- **Cartes glassmorphism** : `bg-white/5 backdrop-blur border-white/10`, lueur bleue au hover.
- **Boutons "qui bombent"** : effet 3D avec shadow-glow, scale au hover, shimmer animé.
- **Textes qui circulent** : marquee horizontal de logos/mots-clés (Wave, Orange Money, MTN, SYSCOHADA, KDS, Mobile Money…).
- **Sections qui "explosent"** : fade-in + scale au scroll (Intersection Observer + classes `animate-fade-in`).

## Sections (ordre)

1. **Hero refondu**
   - Halo bleu animé en fond + grille subtile.
   - Headline géant gradient bleu→cyan, sous-titre qui se tape (typewriter) parmi : "Commandes", "Cuisine", "Caisse", "Stock", "Paie", "SYSCOHADA".
   - Double CTA bombé + badge "★ 4.9 par 200+ restaurateurs".
   - Mockup flottant à droite : carte "Commande #142" avec items animés (apparition séquentielle), badge "Payée Wave ✓" qui pulse.

2. **Marquee de confiance** (texte qui circule)
   - Bandeau infini : `Wave · Orange Money · MTN MoMo · Moov · SYSCOHADA · CNSS · IPRES · Mode Offline · Multi-sites · KDS · QR Menu …`

3. **"Pourquoi choisir RestoFlow ?"** (style image fournie — bento grid)
   - Grille bento 6 cartes asymétriques (grandes/petites), fond sombre + glow bleu :
     - **Commandes éclair** : mockup ticket animé (lignes qui apparaissent).
     - **Mobile Money natif** : 4 logos opérateurs en orbite.
     - **Cuisine KDS** : mini écran avec tickets qui changent de couleur (rouge→vert).
     - **Stock intelligent** : barres de stock animées + alerte qui clignote.
     - **SYSCOHADA 1-clic** : icône document avec "✓ Conforme" qui s'écrit.
     - **Multi-restaurants** : 3 pins sur une carte stylisée.

4. **Toutes les fonctionnalités du SaaS** (grille complète)
   - 18+ tuiles compactes : Commandes & salle, KDS, Stock, Recettes, Mobile Money, SYSCOHADA, Factures fiscales, Paie CNSS/IPRES, Planning, Pointeuse PIN, Réservations, QR Menu, Plan de salle, Gueridon, Multi-établissements, Marque blanche, API/Webhooks, Mode hors-ligne, IA conseiller, Analytics & menu engineering, Imprimantes ESC/POS, Sauvegardes, Audit log, Exports comptables.
   - Chaque tuile : icône colorée + glow au hover + scale.

5. **"Vu dans l'app"** — mockups visuels des écrans
   - 3 captures stylisées CSS (pas d'image) :
     - **Caisse** : grille de plats + total qui s'incrémente.
     - **Cuisine** : colonnes "À faire / En cours / Prêt" avec tickets qui glissent.
     - **Dashboard** : mini graphe SVG animé (chiffre d'affaires) + KPIs.
   - Tabs cliquables (Caisse / Cuisine / Gérant / QR Client) qui changent le mockup.

6. **Avant / Après** (existant, restylé sombre).

7. **Témoignages** (existant, en glass cards).

8. **Pricing** (existant, restylé : carte Pro avec gradient border animé).

9. **CTA final "explosif"**
   - Pleine largeur, gros halo, headline géant, bouton mega-bombé "Démarrer gratuitement →".
   - Liste en ligne : ✓ Sans CB ✓ 7 jours offerts ✓ Support FR ✓ Annulable.

10. **FAQ + Footer** (existants, restylés sombre).

## Détails techniques

- Fichier modifié : `src/pages/Landing.tsx` (refonte complète, garde les data arrays existants + en ajoute).
- Wrapper racine en `dark` class forcée pour ne pas casser le reste de l'app : `<div className="dark min-h-screen bg-slate-950 text-slate-100">`.
- Ajout de keyframes dans `tailwind.config.ts` : `marquee`, `shimmer`, `float`, `pulse-glow`, `gradient-shift`, `typewriter`.
- Ajout d'un petit hook `useInView` (Intersection Observer, ~15 lignes) pour déclencher animations au scroll — pas de dépendance.
- Mockups = pure JSX/Tailwind/SVG (aucune image générée nécessaire).
- Boutons "bombés" : nouvelle classe utilitaire `.btn-glow` (scale + shadow bleu + shimmer) appliquée localement.
- Tout reste responsive (mobile : bento se simplifie en stack, marquee garde sa vitesse).

## Hors scope
- Pas de changement aux autres pages (Pricing, Auth, app/...).
- Pas de nouveaux assets uploadés.
- Pas de changement DB / backend.
