import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  ChefHat, ClipboardList, Package, BarChart3, Users, Smartphone, Check,
  Wifi, Receipt, Calculator, Wallet, Star, Quote, ArrowRight, Sparkles,
  TrendingUp, Clock, Shield, Globe, Zap, Building2,
} from "lucide-react";
import logo from "@/assets/restoflow-logo.png";
import heroImg from "@/assets/landing-hero.jpg";

const stats = [
  { value: "+30%", label: "Encaissements plus rapides" },
  { value: "−12h", label: "Économisées par semaine" },
  { value: "0 FCFA", label: "Pour démarrer" },
  { value: "100%", label: "Conforme SYSCOHADA" },
];

const pillars = [
  {
    icon: TrendingUp,
    badge: "ROI",
    title: "Encaissez 30% plus vite",
    description: "Prise de commande en 3 taps, addition automatique, paiement Mobile Money intégré. Vos serveurs servent plus de tables.",
    points: ["Commandes en temps réel", "Split bill instantané", "Wave / Orange / MTN / Moov"],
  },
  {
    icon: Globe,
    badge: "Afrique",
    title: "Le seul POS pensé pour vous",
    description: "Mobile Money natif, comptabilité SYSCOHADA, factures conformes, FCFA partout. Aucune adaptation bricolée.",
    points: ["Journal SYSCOHADA en 1 clic", "Mobile Money intégré", "Multi-établissements"],
  },
  {
    icon: Sparkles,
    badge: "Premium",
    title: "L'expérience d'un grand groupe",
    description: "Interface élégante, mode hors-ligne, tableaux de bord temps réel. Conçu avec des chefs étoilés et des restaurateurs exigeants.",
    points: ["Mode offline complet", "Tablette, mobile, desktop", "Marque blanche disponible"],
  },
];

const features = [
  { icon: ClipboardList, title: "Commandes & salle", description: "Prise de commande rapide, plan de salle, transferts, courses, gueridon." },
  { icon: ChefHat, title: "Cuisine & KDS", description: "Kitchen display, tickets stations, gestion des firings, alertes allergies." },
  { icon: Package, title: "Stock & recettes", description: "Suivi en temps réel, alertes seuil, recettes liées aux ventes, inventaires." },
  { icon: Wallet, title: "Mobile Money", description: "Wave, Orange Money, MTN, Moov. Test mode + production. Réconciliation auto." },
  { icon: Calculator, title: "Comptabilité SYSCOHADA", description: "Plan comptable, écritures auto, journal, états financiers exportables." },
  { icon: Receipt, title: "Factures conformes", description: "Numérotation séquentielle, signature de chaîne, archivage légal, PDF." },
  { icon: Users, title: "Équipe & paie", description: "Rôles, pointeuse PIN, planning, calcul de paie CNSS/IPRES/IRPP." },
  { icon: BarChart3, title: "Analytics & IA", description: "Dashboards temps réel, menu engineering, conseiller IA pour décisions." },
  { icon: Building2, title: "Multi-établissements", description: "Gérez 2, 5, 50 restaurants depuis un seul compte. Rapports consolidés." },
];

const problems = [
  { before: "Carnets papier perdus, additions fausses", after: "Commandes digitales, totaux automatiques" },
  { before: "Stock géré de tête, ruptures surprises", after: "Alertes seuils, recettes liées aux ventes" },
  { before: "Comptabilité manuelle en fin de mois", after: "Journal SYSCOHADA généré en 1 clic" },
  { before: "Mobile Money saisi à la main", after: "Wave, Orange, MTN, Moov intégrés" },
  { before: "Aucune visibilité sur la performance", after: "Dashboards temps réel + IA" },
  { before: "Logiciel américain mal traduit", after: "100% pensé pour l'Afrique francophone" },
];

const testimonials = [
  {
    quote: "Depuis qu'on est sur RestoFlow, on a divisé par 3 le temps d'encaissement. Mes serveurs adorent.",
    name: "Aïssatou D.",
    role: "Propriétaire — Le Baobab, Dakar",
  },
  {
    quote: "La comptabilité SYSCOHADA générée automatiquement nous fait gagner 2 jours par mois. Mon expert-comptable est conquis.",
    name: "Mamadou S.",
    role: "Directeur — Chez Mama, Abidjan",
  },
  {
    quote: "On gère nos 4 restaurants depuis un seul compte. Les rapports consolidés sont une révolution.",
    name: "Fatou N.",
    role: "Groupe Saveurs d'Afrique, Lomé",
  },
];

const plans = [
  {
    name: "Essai gratuit",
    price: "0",
    cycle: "FCFA · 7 jours offerts",
    description: "Toutes les fonctionnalités Pro pendant 7 jours. Sans CB.",
    features: ["Accès complet Pro", "Aucune carte requise", "1 restaurant", "Bascule lecture seule après 7j"],
    cta: "Démarrer l'essai 7 jours",
    highlight: false,
  },
  {
    name: "Starter",
    price: "9 900",
    cycle: "FCFA / mois",
    description: "Pour les maquis et petits restos.",
    features: ["1 restaurant", "Jusqu'à 3 employés", "Caisse & commandes", "Mobile Money intégré", "Tickets de caisse"],
    cta: "Choisir Starter",
    highlight: false,
  },
  {
    name: "Pro",
    price: "25 000",
    cycle: "FCFA / mois",
    description: "Pour les restaurants en croissance.",
    features: ["Staff illimité", "Plan de salle & KDS", "Stock + recettes", "Comptabilité SYSCOHADA", "Réservations & VIP", "Analytics avancés"],
    cta: "Essayer Pro 14 jours",
    highlight: true,
  },
  {
    name: "Business",
    price: "75 000",
    cycle: "FCFA / mois",
    description: "Pour les groupes multi-sites.",
    features: ["Tout Pro", "Multi-établissements", "Rapports consolidés", "API & Webhooks", "Marque blanche", "Support prioritaire"],
    cta: "Passer Business",
    highlight: false,
  },
];

const faqs = [
  { q: "Combien de temps pour démarrer ?", a: "10 minutes. Créez un compte, ajoutez votre menu, et commencez à encaisser. Aucune carte bancaire demandée." },
  { q: "Est-ce que ça marche sans internet ?", a: "Oui. Le mode hors-ligne complet permet de prendre des commandes, encaisser et imprimer même sans connexion. Tout se synchronise dès le retour du réseau." },
  { q: "Quels Mobile Money sont supportés ?", a: "Wave, Orange Money, MTN MoMo, Moov Money. Vous configurez vos comptes en 2 minutes, en mode test ou production." },
  { q: "La comptabilité est-elle vraiment SYSCOHADA ?", a: "Oui. Plan comptable OHADA complet, écritures automatiques, journaux, balance, grand livre, exports Sage/Excel. Validé par des experts-comptables." },
  { q: "Puis-je gérer plusieurs restaurants ?", a: "Oui, avec le plan Business : un seul compte, plusieurs établissements, rapports consolidés, équipes séparées." },
  { q: "Mes données sont-elles sécurisées ?", a: "Hébergement sécurisé, chiffrement, sauvegardes automatiques, RLS sur chaque table. Vos données restent les vôtres et sont exportables à tout moment." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center justify-between gap-2 px-3 sm:h-16 sm:px-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src={logo} alt="RestoFlow" className="h-7 w-auto sm:h-9" width={160} height={36} />
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Fonctionnalités</a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Tarifs</a>
            <a href="#faq" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link to="/auth" className="hidden sm:block"><Button variant="ghost" size="sm">Connexion</Button></Link>
            <Link to="/auth">
              <Button size="sm" className="shadow-md">
                <span className="sm:hidden">Démarrer</span>
                <span className="hidden sm:inline">Démarrer gratuitement</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_60%)]" />
        <div className="container relative mx-auto grid gap-12 px-4 py-20 lg:grid-cols-2 lg:gap-16 lg:py-28">
          <div className="flex flex-col justify-center">
            <Badge variant="secondary" className="mb-6 w-fit gap-1.5 px-3 py-1 text-xs font-medium">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="truncate">Le POS nouvelle génération pour l'Afrique</span>
            </Badge>
            <h1 className="text-balance text-3xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-4xl md:text-6xl lg:text-7xl">
              Pilotez votre restaurant en{" "}
              <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">un seul écran</span>
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg md:text-xl">
              Commandes, cuisine, stock, Mobile Money, comptabilité SYSCOHADA. Tout-en-un, pensé pour l'Afrique francophone, fonctionne hors-ligne.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/auth">
                <Button size="lg" className="w-full gap-2 shadow-lg sm:w-auto">
                  Démarrer gratuitement <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">Voir la démo</Button>
              </a>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              ✓ Sans carte bancaire &nbsp;·&nbsp; ✓ Configuration en 10 min &nbsp;·&nbsp; ✓ Support en français
            </p>
          </div>
          <div className="relative">
            <div className="absolute inset-0 -m-4 rounded-3xl bg-gradient-to-tr from-primary/20 via-primary-glow/10 to-transparent blur-2xl" />
            <div className="relative overflow-hidden rounded-3xl border border-border/60 shadow-2xl">
              <img src={heroImg} alt="Restaurant moderne avec RestoFlow" className="h-full w-full object-cover" width={1920} height={1080} />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="container mx-auto px-4 pb-16">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/60 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-card p-6 text-center">
                <div className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">{s.value}</div>
                <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground md:text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3 PILIERS */}
      <section className="border-t border-border/50 bg-secondary/30 py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Pourquoi RestoFlow change la donne
            </h2>
            <p className="mt-4 text-base text-muted-foreground md:text-lg">
              Trois promesses, tenues sur chaque écran de l'application.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {pillars.map((p) => (
              <div key={p.title} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/40 hover:shadow-xl">
                <div className="mb-5 inline-flex items-center gap-2">
                  <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                    <p.icon className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="border-primary/30 text-xs text-primary">{p.badge}</Badge>
                </div>
                <h3 className="text-xl font-semibold tracking-tight">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.description}</p>
                <ul className="mt-5 space-y-2">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AVANT / APRÈS */}
      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              De la galère quotidienne à la sérénité
            </h2>
            <p className="mt-4 text-base text-muted-foreground md:text-lg">
              Concrètement, ce qui change dans votre restaurant dès la première semaine.
            </p>
          </div>
          <div className="mx-auto max-w-4xl space-y-3">
            {problems.map((p, i) => (
              <div key={i} className="grid gap-4 rounded-xl border border-border bg-card p-5 md:grid-cols-2">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">✕</span>
                  <span className="text-sm text-muted-foreground line-through decoration-destructive/40">{p.before}</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-sm font-medium">{p.after}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="border-t border-border/50 bg-secondary/30 py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
            <Badge variant="secondary" className="mb-4">Tout-en-un</Badge>
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Une plateforme, tous vos besoins
            </h2>
            <p className="mt-4 text-base text-muted-foreground md:text-lg">
              Du carnet de commandes à la déclaration fiscale, sans changer d'outil.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
                <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-primary/10 to-primary-glow/10 p-2.5 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>

          {/* Trust strip */}
          <div className="mt-12 grid gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-3">
            <div className="flex items-center gap-3"><Wifi className="h-5 w-5 text-primary" /><span className="text-sm font-medium">Mode hors-ligne</span></div>
            <div className="flex items-center gap-3"><Shield className="h-5 w-5 text-primary" /><span className="text-sm font-medium">Données chiffrées & sauvegardées</span></div>
            <div className="flex items-center gap-3"><Zap className="h-5 w-5 text-primary" /><span className="text-sm font-medium">Mises à jour continues</span></div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-1 text-primary">
              {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
            </div>
            <h2 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">
              Des restaurateurs qui dorment mieux
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.name} className="rounded-2xl border border-border bg-card p-7">
                <Quote className="h-6 w-6 text-primary/40" />
                <blockquote className="mt-4 text-base leading-relaxed">"{t.quote}"</blockquote>
                <figcaption className="mt-5 border-t border-border pt-4">
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="border-t border-border/50 bg-secondary/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">Tarifs simples</Badge>
            <h2 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">
              Démarrez gratuitement, scalez quand vous voulez
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Pas d'engagement. Annulez à tout moment.
            </p>
          </div>
          <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border bg-card p-8 ${
                  plan.highlight
                    ? "border-primary shadow-2xl ring-2 ring-primary/20"
                    : "border-border"
                }`}
              >
                {plan.highlight && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs">
                    ⭐ Le plus populaire
                  </Badge>
                )}
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">/{plan.cycle}</span>
                </div>
                <Link to="/auth" className="mt-6 block">
                  <Button className="w-full" variant={plan.highlight ? "default" : "outline"} size="lg">
                    {plan.cta}
                  </Button>
                </Link>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Tous les prix en FCFA, hors taxes. Paiement par carte ou Mobile Money.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <h2 className="mb-10 text-center text-4xl font-bold tracking-tight md:text-5xl">Questions fréquentes</h2>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="rounded-xl border border-border bg-card px-5">
                <AccordionTrigger className="py-4 text-left text-base font-semibold hover:no-underline">{f.q}</AccordionTrigger>
                <AccordionContent className="pb-4 text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden border-t border-border/50">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary-glow" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary-glow)/0.6),transparent_50%)]" />
        <div className="container relative mx-auto px-4 py-24 text-center">
          <h2 className="mx-auto max-w-3xl text-balance text-4xl font-bold tracking-tight text-primary-foreground md:text-6xl">
            Prêt à reprendre le contrôle de votre restaurant&nbsp;?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-primary-foreground/85">
            Rejoignez les restaurateurs qui ont choisi la simplicité. 10 minutes pour démarrer.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="gap-2 px-8 shadow-xl">
                <Clock className="h-4 w-4" /> Démarrer maintenant — Gratuit
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-primary-foreground/70">Aucune carte bancaire requise</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border bg-card">
        <div className="container mx-auto grid gap-8 px-4 py-12 md:grid-cols-4">
          <div>
            <img src={logo} alt="RestoFlow" className="mb-3 h-8 w-auto" width={150} height={32} />
            <p className="text-sm text-muted-foreground">Le POS tout-en-un pour les restaurants africains modernes.</p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold">Produit</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground">Fonctionnalités</a></li>
              <li><a href="#pricing" className="hover:text-foreground">Tarifs</a></li>
              <li><a href="#faq" className="hover:text-foreground">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold">Entreprise</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/auth" className="hover:text-foreground">Connexion</Link></li>
              <li><Link to="/auth" className="hover:text-foreground">Créer un compte</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold">Support</h4>
            <p className="text-sm text-muted-foreground">Une question ? Contactez-nous, on répond en français sous 24h.</p>
          </div>
        </div>
        <div className="border-t border-border">
          <div className="container mx-auto px-4 py-5 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} RestoFlow. Conçu en Afrique, pour l'Afrique.
          </div>
        </div>
      </footer>
    </div>
  );
}
