/**
 * In-app help articles. Add new entries here — they appear in the Help center
 * with full-text search.
 *
 * To add a video, use a YouTube/Loom embed URL in `videoUrl`.
 *   YouTube: https://www.youtube.com/embed/VIDEO_ID
 *   Loom:    https://www.loom.com/embed/VIDEO_ID
 */

export type HelpCategory =
  | "getting_started"
  | "menu"
  | "orders"
  | "kitchen"
  | "stock"
  | "staff"
  | "finances"
  | "payments"
  | "settings";

export interface HelpArticle {
  id: string;
  category: HelpCategory;
  title: string;
  summary: string;
  body: string; // Markdown-ish plain text; rendered with whitespace-pre-line
  keywords: string[];
  videoUrl?: string; // Optional embedded video
}

export const HELP_CATEGORIES: { id: HelpCategory; label: string; emoji: string }[] = [
  { id: "getting_started", label: "Démarrage", emoji: "🚀" },
  { id: "menu", label: "Menu & Carte", emoji: "📖" },
  { id: "orders", label: "Commandes", emoji: "🍽️" },
  { id: "kitchen", label: "Cuisine", emoji: "👨‍🍳" },
  { id: "stock", label: "Stock & Recettes", emoji: "📦" },
  { id: "staff", label: "Personnel & Paie", emoji: "👥" },
  { id: "finances", label: "Finances & Comptabilité", emoji: "💰" },
  { id: "payments", label: "Paiements", emoji: "💳" },
  { id: "settings", label: "Paramètres", emoji: "⚙️" },
];

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "first-steps",
    category: "getting_started",
    title: "Vos 5 premières étapes",
    summary: "Configurer votre restaurant en moins de 15 minutes.",
    keywords: ["démarrer", "configuration", "onboarding", "premier", "départ"],
    body: `1. **Renseignez les infos du restaurant** — Paramètres → Personnalisation : nom, logo, devise, TVA par défaut.
2. **Créez votre carte** — Menu → ajoutez catégories puis articles avec photos.
3. **Configurez votre plan de salle** — Salle → glissez-déposez tables et serveurs.
4. **Invitez votre équipe** — Personnel → Inviter (rôles : caisse, serveur, cuisine, gérant).
5. **Activez Mobile Money** — Paramètres → Opérateurs : Wave, Orange Money, MTN MoMo, etc.`,
  },
  {
    id: "modules-toggle",
    category: "getting_started",
    title: "Activer/désactiver des modules",
    summary: "Personnalisez l'app selon vos besoins.",
    keywords: ["modules", "activer", "désactiver", "fonctionnalités"],
    body: `Allez dans **Configuration → Modules**. Activez uniquement ce dont vous avez besoin pour garder l'interface simple. Vous pouvez réactiver à tout moment. Certains modules avancés (Comptabilité, Paie, PMS) nécessitent un plan Pro ou Business.`,
  },
  {
    id: "menu-create",
    category: "menu",
    title: "Créer et organiser votre carte",
    summary: "Catégories, articles, variantes et modificateurs.",
    keywords: ["menu", "carte", "plat", "boisson", "catégorie", "variante"],
    body: `**Catégories** : entrées, plats, desserts, boissons… Glissez-déposez pour réordonner.

**Article** : nom, prix, photo, description, station de cuisine, TVA.

**Variantes** : ex. taille (S/M/L), cuisson (saignant/à point/bien cuit). Cliquez sur l'article → onglet "Variantes".

**Modificateurs** : suppléments (fromage +500F, sauces…). Min/max sélection configurable.

**Traductions** : ajoutez plusieurs langues (FR/EN/AR…) pour le menu QR public.`,
  },
  {
    id: "menu-recipes",
    category: "stock",
    title: "Lier les articles aux ingrédients (recettes)",
    summary: "Décrément automatique du stock à chaque vente.",
    keywords: ["recette", "ingrédient", "stock", "décrément", "déstockage"],
    body: `Pour chaque article du menu, ouvrez **Recettes** et liez les ingrédients du Stock avec leurs quantités. Le stock se décrémente automatiquement quand la commande est encaissée (ou envoyée en cuisine, selon votre réglage).

**Réglage du moment de décrément** : Paramètres → Stock → "Décrémenter le stock à : Encaissement / Envoi cuisine".`,
  },
  {
    id: "orders-flow",
    category: "orders",
    title: "Flux d'une commande de A à Z",
    summary: "Du clic du serveur au paiement.",
    keywords: ["commande", "flux", "service", "encaissement"],
    body: `1. Le serveur ouvre **Commandes** ou **Salle** → choisit une table.
2. Ajoute les articles, services, notes (allergies, demandes spéciales).
3. **Envoyer en cuisine** → ticket imprimé + écran KDS.
4. Cuisine marque les plats prêts → notification serveur.
5. **Encaissement** : choisir mode (espèces, CB, Mobile Money…), partager l'addition si nécessaire.
6. La facture est générée et **chaînée cryptographiquement** pour la conformité fiscale.`,
  },
  {
    id: "split-bill",
    category: "orders",
    title: "Diviser l'addition entre plusieurs clients",
    summary: "Split par parts égales, par article, ou montant libre.",
    keywords: ["addition", "diviser", "split", "partage"],
    body: `Sur une commande, cliquez **Diviser** :
- **Parts égales** : ex. 4 personnes → 4 parts.
- **Par article** : assignez chaque article à une personne.
- **Montant libre** : tapez le montant de chaque paiement.

Chaque part peut être encaissée séparément avec un mode différent (un en cash, l'autre en Wave…).`,
  },
  {
    id: "kitchen-display",
    category: "kitchen",
    title: "Utiliser l'écran de cuisine (KDS)",
    summary: "Organiser la brigade par stations.",
    keywords: ["kds", "cuisine", "écran", "brigade", "station"],
    body: `Créez des **stations** (chaud, froid, dessert, bar) dans Paramètres. Chaque article du menu est rattaché à une station.

Sur l'écran cuisine :
- Filtrer par station (le pizzaiolo voit ses pizzas, le bar voit les boissons).
- **Marquer prêt** → déclenche notification serveur.
- **Marquer servi** → libère l'item.
- **Course fire** : envoyer un service entier d'un coup (entrées, puis plats, puis desserts).`,
  },
  {
    id: "stock-receipt",
    category: "stock",
    title: "Enregistrer une réception fournisseur",
    summary: "Bons de réception + mise à jour du coût moyen pondéré.",
    keywords: ["fournisseur", "réception", "achat", "stock", "approvisionnement"],
    body: `**Réceptions → Nouvelle** : sélectionnez le fournisseur, ajoutez les articles reçus avec quantité et prix unitaire. À la validation :
- Les quantités sont **ajoutées au stock**.
- Le **coût moyen pondéré (CMP)** de chaque article est recalculé automatiquement.
- Une écriture comptable est générée (compte 604 ou 601 selon le type).`,
  },
  {
    id: "stock-inventory",
    category: "stock",
    title: "Faire un inventaire physique",
    summary: "Comptage périodique et ajustement automatique.",
    keywords: ["inventaire", "comptage", "stock physique", "ajustement"],
    body: `**Inventaires → Nouveau comptage** : l'app génère la liste de tous les articles avec leur quantité théorique. Saisissez les quantités réellement comptées. À la validation :
- Les écarts sont consignés dans le **journal d'audit**.
- Le stock est ajusté.
- Les pertes/surplus apparaissent dans les rapports.`,
  },
  {
    id: "staff-invite",
    category: "staff",
    title: "Inviter un employé",
    summary: "Comptes, rôles et code PIN de pointage.",
    keywords: ["employé", "inviter", "personnel", "rôle", "pin"],
    body: `**Personnel → Ajouter un employé** : email + rôle (caisse, serveur, cuisine, gérant). Un email d'invitation est envoyé. L'employé crée son mot de passe et obtient l'accès aux modules autorisés par son rôle.

**Code PIN** : pour le pointage rapide (clock-in/out), définissez un PIN à 4-6 chiffres dans le profil employé.`,
  },
  {
    id: "payroll-run",
    category: "staff",
    title: "Générer la paie du mois",
    summary: "Bulletins, CNSS, IPRES, IRPP automatiques.",
    keywords: ["paie", "salaire", "bulletin", "cnss", "ipres", "irpp"],
    body: `**Paie → Nouvelle période** : choisissez le mois. L'app calcule automatiquement pour chaque employé :
- Salaire brut (selon contrat + heures pointées + ajustements).
- Cotisations CNSS, IPRES, IRPP (taux configurables).
- Charges patronales.
- Salaire net.

À la **validation** : les écritures comptables sont générées (641 brut, 645 charges patronales, 421 net à payer, 431/432/4471 cotisations).`,
  },
  {
    id: "accounting-syscohada",
    category: "finances",
    title: "Comptabilité SYSCOHADA automatique",
    summary: "Plan comptable, journaux, grand livre.",
    keywords: ["comptabilité", "syscohada", "journal", "grand livre", "écriture"],
    body: `Toutes vos opérations génèrent automatiquement les **écritures SYSCOHADA** :
- **Vente encaissée** → débit caisse/banque, crédit ventes (706/707) + TVA collectée (4431).
- **Achat fournisseur** → débit charges (601/604/605…), crédit caisse.
- **Paie validée** → débit 641/645, crédit 421/431/432/4471.

Consultez le **Grand livre** pour voir tous les mouvements par compte. Exportez en **FEC** ou Excel pour votre comptable.`,
  },
  {
    id: "vat-mode",
    category: "finances",
    title: "Mode TVA inclusive vs exclusive",
    summary: "Quel mode choisir et comment ça affecte les prix.",
    keywords: ["tva", "taxe", "inclusif", "exclusif", "ttc", "ht"],
    body: `**TVA inclusive (TTC)** : le prix affiché au client inclut déjà la TVA. C'est le standard pour la restauration grand public en zone UEMOA.

**TVA exclusive (HT)** : le prix affiché est hors taxes ; la TVA est ajoutée à l'addition. Adapté au B2B / catering.

Réglage : **Paramètres → Fiscal → Mode TVA**.

Le **service** est toujours calculé sur le HT (norme SYSCOHADA).`,
  },
  {
    id: "fiscal-chain",
    category: "finances",
    title: "Vérification fiscale (chaînage cryptographique)",
    summary: "Détecter toute altération des factures.",
    keywords: ["fiscal", "chaînage", "hash", "sha256", "audit", "tamper"],
    body: `Chaque facture est **chaînée à la précédente** via un hash SHA-256 (incluant numéro, total, date, items et hash précédent). Toute modification d'une facture passée casserait la chaîne.

Lancez **Système → Vérif. fiscale** pour scanner toute la chaîne et détecter d'éventuelles incohérences. À présenter en cas de contrôle fiscal.`,
  },
  {
    id: "mobile-money",
    category: "payments",
    title: "Configurer Mobile Money (Wave, Orange, MTN…)",
    summary: "Paiement par USSD ou deeplink, sans frais d'agrégateur.",
    keywords: ["mobile money", "wave", "orange money", "mtn", "moov", "paiement"],
    body: `**Paramètres → Opérateurs Mobile Money** : activez les opérateurs disponibles dans votre pays.

Pour chaque opérateur, renseignez :
- **Numéro marchand** ou **Merchant ID** (Wave Business : M_xxxx).
- Optionnel : USSD ou deeplink personnalisé.

À l'encaissement, le client scanne un QR ou tape un code USSD. Aucun frais d'intermédiaire — vous touchez directement.`,
  },
  {
    id: "qr-menu",
    category: "menu",
    title: "Menu public via QR code",
    summary: "Vos clients commandent depuis leur téléphone.",
    keywords: ["qr", "menu public", "commande en ligne", "table"],
    body: `Chaque restaurant a une URL publique : **/r/votre-restaurant**. Imprimez le QR code (Paramètres → QR menu) sur les tables.

Les clients :
- Consultent la carte traduite dans leur langue.
- Commandent directement (si activé).
- La commande arrive dans **Commandes QR** pour validation par votre équipe.`,
  },
  {
    id: "backups",
    category: "settings",
    title: "Sauvegardes de vos données",
    summary: "Export complet en JSON pour archivage.",
    keywords: ["sauvegarde", "backup", "export", "données"],
    body: `**Système → Sauvegardes** : générez un export complet de votre base (commandes, factures, menu, stock, personnel, comptabilité). Le fichier JSON est téléchargeable.

Recommandé : faire une sauvegarde **mensuelle** et la conserver hors-ligne (clé USB, drive personnel).`,
  },
  {
    id: "two-factor",
    category: "settings",
    title: "Activer la double authentification (2FA)",
    summary: "Protéger votre compte gérant avec un code temporaire.",
    keywords: ["2fa", "mfa", "sécurité", "authentificator", "google authenticator"],
    body: `**Système → Sécurité (2FA)** : scannez le QR code avec Google Authenticator, Authy ou 1Password. Saisissez le code à 6 chiffres pour confirmer. À chaque connexion, un nouveau code vous sera demandé.

⚠️ Conservez les codes de récupération en lieu sûr — sans eux et sans le téléphone, vous perdez l'accès au compte.`,
  },
];

export function searchArticles(query: string): HelpArticle[] {
  const q = query.trim().toLowerCase();
  if (!q) return HELP_ARTICLES;
  return HELP_ARTICLES.filter((a) => {
    const hay = [
      a.title,
      a.summary,
      a.body,
      ...a.keywords,
    ].join(" ").toLowerCase();
    return hay.includes(q);
  });
}
