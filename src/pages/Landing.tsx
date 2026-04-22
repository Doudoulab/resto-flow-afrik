import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ChefHat, ClipboardList, Package, BarChart3, Users, Smartphone, Check,
  Wifi, Receipt, Calculator, Wallet, Star, Quote, ArrowRight, Info,
} from "lucide-react";

const features = [
  {
    icon: ClipboardList,
    title: "Commandes en temps réel",
    description: "Prise de commande rapide, suivi du statut, historique complet.",
  },
  {
    icon: ChefHat,
    title: "Menu dynamique",
    description: "Catégories, plats, prix en FCFA. Activez ou suspendez en un clic.",
  },
  {
    icon: Package,
    title: "Stock & alertes",
    description: "Suivez vos stocks et soyez alerté avant la rupture.",
  },
  {
    icon: Users,
    title: "Équipe & rôles",
    description: "Invitez vos serveurs, cuisiniers, caissiers avec leurs permissions.",
  },
  {
    icon: BarChart3,
    title: "Tableau de bord",
    description: "CA du jour, plats populaires, performances de l'équipe.",
  },
  {
    icon: Smartphone,
    title: "Mobile-first",
    description: "Conçu pour fonctionner aussi bien en cuisine qu'au comptoir.",
  },
];

const problems = [
  { before: "Carnets papier perdus, additions fausses", after: "Commandes digitales, totaux automatiques" },
  { before: "Stock géré de tête, ruptures surprises", after: "Alertes seuils, recettes liées aux ventes" },
  { before: "Comptabilité manuelle en fin de mois", after: "Journal SYSCOHADA généré en 1 clic" },
  { before: "Mobile Money saisi à la main", after: "Wave, Orange, MTN, Moov intégrés" },
];

const westAfricaFeatures = [
  { icon: Calculator, title: "SYSCOHADA & TVA", description: "Plan comptable OHADA, journaux ventes/achats, déclarations TVA mensuelles." },
  { icon: Wallet, title: "Mobile Money natif", description: "Wave, Orange Money, MTN, Moov. Liens USSD et deeplinks générés automatiquement." },
  { icon: Receipt, title: "Factures conformes", description: "Numérotation chaînée SHA-256, archivage légal, exports PDF prêts pour le fisc." },
  { icon: Wifi, title: "Mode hors-ligne", description: "Continuez à encaisser même sans internet. Synchronisation automatique au retour du réseau." },
];

const testimonials = [
  {
    name: "Aïssatou D.",
    role: "Gérante, Le Baobab — Dakar",
    quote: "On a divisé par 3 le temps de clôture de caisse. Les serveurs adorent l'interface mobile.",
    rating: 5,
  },
  {
    name: "Moussa K.",
    role: "Propriétaire, Saveurs d'Abidjan",
    quote: "Enfin un outil qui parle Mobile Money et SYSCOHADA. Mon comptable me remercie chaque mois.",
    rating: 5,
  },
  {
    name: "Fatou N.",
    role: "Directrice, Hôtel Restaurant Téranga",
    quote: "L'intégration PMS pour les charges chambres a changé notre quotidien. Zéro saisie en double.",
    rating: 5,
  },
];

type PlanDetailSection = { title: string; items: string[] };
type PricingTier = {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlight: boolean;
  details: PlanDetailSection[];
};

const pricingTiers: PricingTier[] = [
  {
    name: "Starter",
    price: "9 900",
    period: "FCFA / mois",
    description: "Maquis & petits restos qui démarrent",
    features: ["1 restaurant", "Jusqu'à 3 employés", "Caisse & menu simple", "Mobile Money (Wave, OM, MTN)", "Tickets de caisse"],
    cta: "Choisir Starter",
    highlight: false,
    details: [
      {
        title: "Idéal pour",
        items: [
          "Maquis, gargotes, petits restos de quartier",
          "Boulangeries et points de vente simples",
          "Restos qui démarrent leur digitalisation",
          "Équipes de 1 à 3 personnes",
        ],
      },
      {
        title: "Inclus",
        items: [
          "Caisse simple avec impression de tickets",
          "Gestion basique du menu (catégories + plats)",
          "Suivi des stocks en quantités",
          "Encaissement Mobile Money & espèces",
          "Historique des ventes du jour/mois",
          "Sauvegarde automatique de vos données",
        ],
      },
      {
        title: "Non inclus (passez Pro)",
        items: [
          "Plan de salle, réservations, KDS cuisine",
          "Variantes, modificateurs, recettes",
          "Multi-langues, fiches clients VIP",
          "Module fiscal avancé, exports comptables",
        ],
      },
    ],
  },
  {
    name: "Pro",
    price: "25 000",
    period: "FCFA / mois",
    description: "Pour restaurants en croissance",
    features: ["Staff illimité", "KDS + plan de salle", "Réservations & dépôts", "Module fiscal & factures", "Multi-langues + analytics"],
    cta: "Passer Pro",
    highlight: true,
    details: [
      {
        title: "Restaurant & équipe",
        items: [
          "1 restaurant",
          "Employés illimités avec rôles (manager, serveur, cuisine, caisse)",
          "Pointage avec PIN, planning hebdomadaire",
          "Documents employés (contrats, pièces d'identité)",
        ],
      },
      {
        title: "Salle & service",
        items: [
          "Plan de salle interactif (tables, statuts, transferts)",
          "Réservations avec dépôts en ligne (Wave, OM, MTN)",
          "Fiches clients VIP, allergies, préférences sommelier",
          "Service au guéridon, menus dégustation",
        ],
      },
      {
        title: "Cuisine & menu",
        items: [
          "Cuisine display (KDS) par station",
          "Stations multiples (chaud, froid, bar, pâtisserie)",
          "Menu multi-langues (FR, EN, ES, etc.)",
          "Variantes, modificateurs, recettes & coût matière",
          "Carte des vins avec accords mets & vins",
        ],
      },
      {
        title: "Caisse, factures & fiscal",
        items: [
          "Caisse complète avec impressions ESC/POS",
          "Factures conformes avec chaînage cryptographique",
          "Module fiscal (TVA, signature, archivage)",
          "Mobile Money (Wave, Orange Money, MTN, Moov)",
          "Split bill, pourboires, remises avec audit",
        ],
      },
      {
        title: "Analytics & support",
        items: [
          "Tableaux de bord avancés (CA, marges, top items)",
          "Menu engineering (étoiles, vaches à lait, énigmes)",
          "Exports CSV/Excel, sauvegardes manuelles",
          "Support par email sous 24h",
        ],
      },
    ],
  },
  {
    name: "Business",
    price: "75 000",
    period: "FCFA / mois",
    description: "Groupes & chaînes multi-restos",
    features: ["Tout Pro inclus", "Multi-restaurants", "Comptabilité SYSCOHADA", "Paie CNSS/IPRES/IRPP", "PMS hôtelier + API", "Support prioritaire"],
    cta: "Passer Business",
    highlight: false,
    details: [
      {
        title: "Multi-établissements",
        items: [
          "Restaurants illimités sous un même compte",
          "Vue consolidée groupe (CA, performances, comparatifs)",
          "Transferts de stock inter-restaurants",
          "Rôles cross-restaurant pour managers régionaux",
        ],
      },
      {
        title: "Comptabilité SYSCOHADA",
        items: [
          "Plan comptable SYSCOHADA pré-configuré",
          "Journaux automatiques (ventes, achats, paie)",
          "Grand livre, balance, exports comptables",
          "TVA collectée/déductible automatique",
        ],
      },
      {
        title: "Paie & RH avancée",
        items: [
          "Bulletins de paie avec CNSS, IPRES, IRPP",
          "Déclarations fiscales mensuelles",
          "Gestion des congés et avances",
          "Charges patronales calculées automatiquement",
        ],
      },
      {
        title: "Intégrations & API",
        items: [
          "Intégration PMS hôtelier (room charge, réconciliation)",
          "API REST pour vos outils internes",
          "Webhooks pour événements clés",
          "Export comptable vers Sage, Ciel, etc.",
        ],
      },
      {
        title: "Sécurité & support",
        items: [
          "Backups automatiques quotidiens",
          "Journal d'audit complet (qui a fait quoi)",
          "Authentification renforcée (MFA)",
          "Support prioritaire (réponse < 4h)",
          "Onboarding personnalisé",
        ],
      },
    ],
  },
];

const faqs = [
  { q: "Faut-il une carte bancaire pour s'inscrire ?", a: "Non. Le plan Starter est gratuit à vie, sans carte. Vous pouvez tester l'app et passer à Pro quand vous êtes prêt." },
  { q: "Est-ce que ça marche sans internet ?", a: "Oui. Le mode hors-ligne permet de continuer à prendre des commandes et encaisser. Tout se synchronise automatiquement au retour du réseau." },
  { q: "Quels moyens de paiement Mobile Money sont supportés ?", a: "Wave, Orange Money, MTN MoMo, Moov Money. Vous configurez vos numéros marchands et les liens de paiement sont générés automatiquement." },
  { q: "Mes données sont-elles conformes SYSCOHADA ?", a: "Oui. Le plan comptable, la TVA et les journaux respectent la norme SYSCOHADA. Vos factures sont chaînées cryptographiquement (SHA-256) pour la traçabilité fiscale." },
  { q: "Puis-je gérer plusieurs restaurants ?", a: "Le plan Business permet de gérer plusieurs établissements depuis un seul compte, avec rapports consolidés." },
  { q: "Y a-t-il un engagement ?", a: "Aucun engagement. Vous payez au mois et vous pouvez arrêter quand vous voulez. Vos données restent exportables." },
];

const Landing = () => {
  const [detailsPlan, setDetailsPlan] = useState<PricingTier | null>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <ChefHat className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">RestoFlow</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Fonctionnalités</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Tarifs</a>
            <a href="#testimonials" className="hover:text-foreground transition-colors">Témoignages</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Se connecter</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button size="sm">Essayer gratuitement</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-subtle">
        <div className="container py-20 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-success" />
              Conçu pour l'Afrique francophone — paiements en FCFA
            </div>
            <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight md:text-6xl">
              Gérez votre restaurant{" "}
              <span className="bg-gradient-hero bg-clip-text text-transparent">
                comme jamais auparavant
              </span>
            </h1>
            <p className="mb-8 text-lg text-muted-foreground md:text-xl">
              RestoFlow centralise vos commandes, votre menu, votre stock et votre équipe
              dans une interface simple, rapide et accessible depuis n'importe quel appareil.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="w-full shadow-lg sm:w-auto">
                  Créer mon compte gratuitement
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  J'ai déjà un compte
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-success" /> Sans carte bancaire</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-success" /> Configuration en 2 min</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-success" /> 100% en français</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container py-20">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Tout ce dont votre restaurant a besoin
          </h2>
          <p className="text-lg text-muted-foreground">
            Des outils pensés pour la réalité du terrain : rapides, fiables, accessibles partout.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Problems / Solutions */}
      <section className="bg-muted/40 py-20">
        <div className="container">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Du chaos quotidien à la sérénité</h2>
            <p className="text-lg text-muted-foreground">Voici ce que RestoFlow change concrètement dans votre journée.</p>
          </div>
          <div className="mx-auto max-w-4xl space-y-3">
            {problems.map(({ before, after }) => (
              <div key={before} className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-4">
                <div className="flex items-start gap-2 text-sm text-muted-foreground line-through decoration-destructive/60">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">✕</span>
                  {before}
                </div>
                <ArrowRight className="hidden h-4 w-4 text-muted-foreground sm:block" />
                <div className="flex items-start gap-2 text-sm font-medium text-foreground">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                  {after}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* West Africa specific */}
      <section className="container py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            🌍 Pensé pour l'Afrique de l'Ouest
          </div>
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">Conformité locale, sans compromis</h2>
          <p className="text-lg text-muted-foreground">Les outils internationaux ignorent SYSCOHADA et Mobile Money. Pas nous.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {westAfricaFeatures.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="bg-muted/40 py-20">
        <div className="container">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Ils nous font confiance</h2>
            <p className="text-lg text-muted-foreground">Des restaurateurs comme vous, partout en Afrique francophone.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map(({ name, role, quote, rating }) => (
              <div key={name} className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm">
                <Quote className="mb-3 h-6 w-6 text-primary/60" />
                <p className="mb-4 flex-1 text-sm text-foreground">« {quote} »</p>
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
                <div>
                  <p className="font-semibold text-sm">{name}</p>
                  <p className="text-xs text-muted-foreground">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">Des tarifs simples et honnêtes</h2>
          <p className="text-lg text-muted-foreground">7 jours d'essai Pro gratuit, sans carte. Puis sans engagement.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-xl border p-6 ${
                tier.highlight ? "border-primary bg-card shadow-lg ring-2 ring-primary/20" : "border-border bg-card"
              }`}
            >
              {tier.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                  Plus populaire
                </span>
              )}
              <h3 className="text-lg font-semibold">{tier.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{tier.description}</p>
              <div className="mt-4 mb-6">
                <span className="text-3xl font-bold">{tier.price}</span>
                <span className="ml-1 text-sm text-muted-foreground">{tier.period}</span>
              </div>
              <ul className="mb-6 space-y-2 text-sm">
                {tier.features.map((f) => (
                  <li key={f} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-success mt-0.5" /> {f}</li>
                ))}
              </ul>
              <div className="mt-auto flex flex-col gap-2">
                <Link to="/auth?mode=signup">
                  <Button className="w-full" variant={tier.highlight ? "default" : "outline"}>{tier.cta}</Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={() => setDetailsPlan(tier)}
                >
                  <Info className="h-4 w-4 mr-1" />
                  Voir tous les détails
                </Button>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Voir <Link to="/pricing" className="text-primary underline-offset-4 hover:underline">tous les détails et plans</Link>.
        </p>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-muted/40 py-20">
        <div className="container max-w-3xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">Questions fréquentes</h2>
            <p className="text-lg text-muted-foreground">Tout ce que vous devez savoir avant de commencer.</p>
          </div>
          <Accordion type="single" collapsible className="rounded-xl border border-border bg-card px-4">
            {faqs.map((faq, i) => (
              <AccordionItem key={faq.q} value={`item-${i}`} className="border-border">
                <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-20">
        <div className="rounded-2xl bg-gradient-hero p-10 text-center shadow-lg md:p-16">
          <h2 className="mb-4 text-3xl font-bold text-primary-foreground md:text-4xl">
            Prêt à transformer votre restaurant ?
          </h2>
          <p className="mb-8 text-lg text-primary-foreground/90">
            Configuration en 2 minutes. Aucune carte bancaire requise.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/auth?mode=signup">
              <Button size="lg" variant="secondary" className="shadow-md">Créer mon compte gratuit</Button>
            </Link>
            <a href="https://wa.me/221000000000" target="_blank" rel="noreferrer">
              <Button size="lg" variant="outline" className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
                Parler à un conseiller
              </Button>
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-12">
        <div className="container grid gap-8 md:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <ChefHat className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">RestoFlow</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">La plateforme de gestion pensée pour les restaurants d'Afrique francophone.</p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold">Produit</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground">Fonctionnalités</a></li>
              <li><a href="#pricing" className="hover:text-foreground">Tarifs</a></li>
              <li><Link to="/pricing" className="hover:text-foreground">Comparatif des plans</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#faq" className="hover:text-foreground">FAQ</a></li>
              <li><Link to="/auth" className="hover:text-foreground">Se connecter</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold">Légal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Conditions d'utilisation</li>
              <li>Politique de confidentialité</li>
            </ul>
          </div>
        </div>
        <div className="container mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} RestoFlow — Conçu en Afrique, pour l'Afrique 🌍
        </div>
      </footer>
    </div>
  );
};

export default Landing;
