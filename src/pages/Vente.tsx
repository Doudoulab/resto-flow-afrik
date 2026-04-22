import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  ArrowRight, Check, X, Star, Quote, Clock, Shield, Sparkles, Zap,
  TrendingUp, AlertTriangle, Award, Phone, Wifi, Lock, Building2,
  ChefHat, Wallet, Calculator, BarChart3, Users, Receipt, Flame,
} from "lucide-react";
import logo from "@/assets/restoflow-logo.png";
import heroImg from "@/assets/landing-hero.jpg";

const StickyCta = () => (
  <Link to="/auth">
    <Button size="lg" className="gap-2 shadow-xl">
      Démarrer mon essai gratuit 7 jours <ArrowRight className="h-4 w-4" />
    </Button>
  </Link>
);

const painPoints = [
  { icon: AlertTriangle, text: "Vos serveurs perdent du temps avec des carnets papier et des additions à refaire." },
  { icon: AlertTriangle, text: "Vous découvrez les ruptures de stock en plein service — clients déçus, ventes perdues." },
  { icon: AlertTriangle, text: "La fin du mois est un cauchemar : compter, recompter, justifier à l'expert-comptable." },
  { icon: AlertTriangle, text: "Le Mobile Money est saisi à la main, avec des erreurs et des oublis." },
  { icon: AlertTriangle, text: "Vous n'avez aucune visibilité réelle : qui vend quoi, quand, à quelle marge ?" },
  { icon: AlertTriangle, text: "Les logiciels existants sont mal traduits, chers, et ne comprennent rien à l'Afrique." },
];

const independantBenefits = [
  "Caisse mobile sur tablette ou smartphone — zéro investissement matériel lourd",
  "Mobile Money intégré (Wave, Orange, MTN, Moov) — vos clients paient comme ils veulent",
  "Mode hors-ligne complet — fonctionne même quand le réseau coupe",
  "Tarif accessible dès 9 900 FCFA/mois — rentabilisé en quelques couverts",
  "Support en français, par WhatsApp — on parle votre langue",
  "Configuration en 10 minutes — vous encaissez le jour même",
];

const groupBenefits = [
  "Multi-établissements : pilotez 2, 5, 50 restaurants depuis un seul compte",
  "Rapports consolidés : CA global, top plats, performance par site, en 1 clic",
  "Comptabilité SYSCOHADA conforme — exports Sage, Excel, validés expert-comptable",
  "API & Webhooks : connectez votre PMS hôtelier, ERP, BI, marketing",
  "Marque blanche : votre logo, vos couleurs, votre domaine sur les pages publiques",
  "Sécurité enterprise : 2FA, journal d'audit, sauvegardes, RLS sur chaque donnée",
];

const competitorRows = [
  { feature: "Mobile Money intégré (Wave, OM, MTN, Moov)", us: true, them: false },
  { feature: "Comptabilité SYSCOHADA native", us: true, them: false },
  { feature: "Mode hors-ligne complet", us: true, them: false },
  { feature: "Support en français par WhatsApp", us: true, them: "limité" },
  { feature: "Tarif en FCFA, sans carte internationale", us: true, them: false },
  { feature: "Multi-établissements + rapports consolidés", us: true, them: "option payante" },
  { feature: "Marque blanche complète", us: true, them: false },
  { feature: "Pensé pour l'Afrique francophone", us: true, them: false },
];

const objections = [
  {
    q: "« Je n'ai pas le temps de me former à un nouveau logiciel »",
    a: "RestoFlow est conçu pour être pris en main en 10 minutes. Pas de manuel, pas de formation. Vos serveurs comprennent l'interface dès la première commande. Et notre équipe vous accompagne par WhatsApp à chaque étape.",
  },
  {
    q: "« C'est trop cher pour mon petit restaurant »",
    a: "À 9 900 FCFA/mois (Starter), vous économisez en moyenne 12h de gestion par semaine. Si votre temps vaut ne serait-ce que 2 000 FCFA/h, vous êtes rentable dès la première semaine. Et vous démarrez gratuitement 7 jours, sans carte bancaire.",
  },
  {
    q: "« Et si internet coupe en plein service ? »",
    a: "Aucun problème. Le mode hors-ligne complet permet de prendre des commandes, encaisser, imprimer des tickets sans connexion. Tout se synchronise automatiquement dès le retour du réseau. Zéro vente perdue.",
  },
  {
    q: "« Mes données seront-elles en sécurité ? »",
    a: "Vos données sont chiffrées, sauvegardées automatiquement chaque jour, et hébergées sur une infrastructure sécurisée. Elles restent les vôtres et sont exportables à tout moment (CSV, Excel, PDF). Aucun lock-in.",
  },
  {
    q: "« Mon expert-comptable va-t-il accepter ? »",
    a: "Oui. RestoFlow génère un journal SYSCOHADA conforme, exportable en Sage et Excel, avec plan comptable OHADA complet. Plusieurs experts-comptables d'Afrique francophone valident déjà nos exports.",
  },
  {
    q: "« Et si ça ne me convient pas ? »",
    a: "Vous arrêtez quand vous voulez, sans engagement. Aucune carte bancaire pour démarrer l'essai. Vos données sont exportables à tout moment. Vous ne risquez rien.",
  },
];

const testimonials = [
  { quote: "On a divisé par 3 le temps d'encaissement. Mes serveurs servent 40% de tables en plus le soir.", name: "Aïssatou D.", role: "Le Baobab — Dakar", stars: 5 },
  { quote: "La compta SYSCOHADA générée auto, c'est 2 jours par mois économisés. Mon comptable est conquis.", name: "Mamadou S.", role: "Chez Mama — Abidjan", stars: 5 },
  { quote: "On gère nos 4 restaurants depuis un seul compte. Les rapports consolidés sont une révolution.", name: "Fatou N.", role: "Saveurs d'Afrique — Lomé", stars: 5 },
  { quote: "Le mode hors-ligne nous a sauvés mille fois. Plus jamais de vente perdue à cause du réseau.", name: "Ibrahim K.", role: "La Téranga — Saint-Louis", stars: 5 },
];

const features = [
  { icon: ChefHat, title: "Cuisine & KDS", desc: "Tickets stations, firings, alertes allergies." },
  { icon: Wallet, title: "Mobile Money", desc: "Wave, OM, MTN, Moov — encaissement direct." },
  { icon: Calculator, title: "SYSCOHADA", desc: "Plan comptable, écritures auto, exports Sage." },
  { icon: BarChart3, title: "Analytics & IA", desc: "Dashboards temps réel + conseiller IA." },
  { icon: Users, title: "Équipe & paie", desc: "Pointeuse PIN, planning, CNSS/IPRES/IRPP." },
  { icon: Receipt, title: "Factures conformes", desc: "Numérotation, signature, archivage légal." },
  { icon: Building2, title: "Multi-sites", desc: "Plusieurs restos, rapports consolidés." },
  { icon: Wifi, title: "Hors-ligne", desc: "Fonctionne sans réseau, sync auto." },
];

export default function Vente() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar minimaliste, focus conversion */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/85 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between gap-3 px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="RestoFlow" className="h-9 w-auto" width={160} height={36} />
          </Link>
          <Link to="/auth" className="hidden sm:block">
            <Button size="sm" className="shadow-md">Démarrer gratuitement</Button>
          </Link>
        </div>
      </header>

      {/* HERO commercial */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.18),transparent_60%)]" />
        <div className="container relative mx-auto grid gap-12 px-4 py-16 lg:grid-cols-2 lg:gap-16 lg:py-24">
          <div className="flex flex-col justify-center">
            <Badge variant="secondary" className="mb-5 w-fit gap-1.5 px-3 py-1 text-xs font-medium">
              <Flame className="h-3 w-3 text-primary" />
              Offre de lancement — 7 jours gratuits, sans CB
            </Badge>
            <h1 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl lg:text-6xl">
              Et si votre restaurant gagnait{" "}
              <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                12 heures par semaine
              </span>{" "}
              dès lundi prochain&nbsp;?
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              RestoFlow remplace votre carnet papier, votre cahier de stock, votre tableur Excel et votre logiciel de caisse — en une seule app, pensée pour l'Afrique francophone, qui marche même sans internet.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/auth">
                <Button size="lg" className="w-full gap-2 px-6 shadow-lg sm:w-auto">
                  Démarrer mon essai gratuit 7 jours <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#preuves">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">Voir les preuves</Button>
              </a>
            </div>

            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Sans carte bancaire</li>
              <li className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Configuration 10 min</li>
              <li className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Sans engagement</li>
            </ul>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -m-4 rounded-3xl bg-gradient-to-tr from-primary/20 via-primary-glow/10 to-transparent blur-2xl" />
            <div className="relative overflow-hidden rounded-3xl border border-border/60 shadow-2xl">
              <img src={heroImg} alt="Restaurant moderne avec RestoFlow" className="h-full w-full object-cover" width={1920} height={1080} />
            </div>
          </div>
        </div>
      </section>

      {/* DOULEURS */}
      <section className="border-t border-border/50 bg-secondary/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <Badge variant="outline" className="mb-4 border-destructive/40 text-destructive">Le constat</Badge>
            <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
              Vous reconnaissez-vous dans une de ces situations&nbsp;?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Si oui, ce n'est pas votre faute. C'est juste que personne n'avait conçu un outil <em>vraiment</em> pour vous.
            </p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-3 md:grid-cols-2">
            {painPoints.map((p, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-destructive/15 bg-card p-5">
                <p.icon className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <span className="text-sm leading-relaxed">{p.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUTION */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">La solution</Badge>
            <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
              Une seule app. Tous vos problèmes résolus.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Conçue avec des restaurateurs africains, du maquis de quartier au groupe multi-sites.
            </p>
          </div>
          <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <div className="mb-3 inline-flex rounded-xl bg-gradient-to-br from-primary/10 to-primary-glow/10 p-2.5 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEUX AUDIENCES */}
      <section className="border-t border-border/50 bg-secondary/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
              Pensé pour deux mondes. Imbattable dans les deux.
            </h2>
          </div>
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-8">
              <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/15">Restaurateurs indépendants</Badge>
              <h3 className="text-2xl font-bold tracking-tight">Maquis, gargotes, restos de quartier</h3>
              <p className="mt-2 text-sm text-muted-foreground">Démarrez à 9 900 FCFA/mois. Rentabilisé dès la première semaine.</p>
              <ul className="mt-6 space-y-3">
                {independantBenefits.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-primary/40 bg-card p-8 shadow-xl">
              <Badge className="mb-4">Chaînes & groupes</Badge>
              <h3 className="text-2xl font-bold tracking-tight">Hôtels, franchises, groupes multi-sites</h3>
              <p className="mt-2 text-sm text-muted-foreground">75 000 FCFA/mois. Une plateforme pour tout votre groupe.</p>
              <ul className="mt-6 space-y-3">
                {groupBenefits.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* COMPARATIF */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">Comparaison</Badge>
            <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
              RestoFlow vs les logiciels génériques
            </h2>
          </div>
          <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border bg-card">
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-border bg-secondary/40 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <div>Critère</div>
              <div className="w-20 text-center text-primary">RestoFlow</div>
              <div className="w-24 text-center">Autres POS</div>
            </div>
            {competitorRows.map((row, i) => (
              <div key={i} className={`grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-4 text-sm ${i % 2 ? "bg-secondary/20" : ""}`}>
                <div>{row.feature}</div>
                <div className="flex w-20 justify-center">
                  {row.us === true ? <Check className="h-5 w-5 text-primary" /> : <X className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="flex w-24 justify-center">
                  {row.them === true ? <Check className="h-5 w-5 text-primary" /> :
                   row.them === false ? <X className="h-5 w-5 text-destructive/70" /> :
                   <span className="text-xs text-muted-foreground">{row.them}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA INTERMÉDIAIRE */}
      <section className="border-y border-border/50 bg-gradient-to-br from-primary via-primary to-primary-glow py-14 text-primary-foreground">
        <div className="container mx-auto flex flex-col items-center gap-5 px-4 text-center">
          <h2 className="text-balance text-2xl font-bold md:text-3xl">
            Chaque jour sans RestoFlow, c'est du temps et de l'argent perdus.
          </h2>
          <Link to="/auth">
            <Button size="lg" variant="secondary" className="gap-2 shadow-xl">
              <Clock className="h-4 w-4" /> Je démarre mes 7 jours gratuits
            </Button>
          </Link>
        </div>
      </section>

      {/* PREUVES */}
      <section id="preuves" className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-1 text-primary">
              {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
            </div>
            <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
              Ils ont arrêté de jongler. Ils respirent.
            </h2>
          </div>
          <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
            {testimonials.map((t) => (
              <figure key={t.name} className="rounded-2xl border border-border bg-card p-7">
                <div className="mb-3 flex gap-0.5 text-primary">
                  {[...Array(t.stars)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <Quote className="h-5 w-5 text-primary/40" />
                <blockquote className="mt-2 text-base leading-relaxed">"{t.quote}"</blockquote>
                <figcaption className="mt-5 border-t border-border pt-4">
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* OBJECTIONS */}
      <section className="border-t border-border/50 bg-secondary/30 py-20">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="mb-10 text-center">
            <Badge variant="secondary" className="mb-4">Vos questions, nos réponses</Badge>
            <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
              On lève vos derniers doutes
            </h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {objections.map((o, i) => (
              <AccordionItem key={i} value={`o-${i}`} className="rounded-xl border border-border bg-card px-5">
                <AccordionTrigger className="py-4 text-left text-base font-semibold hover:no-underline">{o.q}</AccordionTrigger>
                <AccordionContent className="pb-4 text-muted-foreground">{o.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* GARANTIE */}
      <section className="py-20">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="grid items-center gap-8 rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card p-8 md:grid-cols-[auto_1fr] md:p-12">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
              <Award className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h2 className="text-balance text-2xl font-bold tracking-tight md:text-3xl">
                Notre engagement : zéro risque pour vous
              </h2>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span><strong>7 jours gratuits</strong> sans carte bancaire</span></li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span><strong>Sans engagement</strong> — annulez en 1 clic</span></li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span><strong>Vos données vous appartiennent</strong> — exports CSV/Excel à tout moment</span></li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span><strong>Support en français</strong> par WhatsApp, sous 24h</span></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="border-t border-border/50 bg-secondary/30 py-12">
        <div className="container mx-auto grid max-w-5xl gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-3"><Wifi className="h-5 w-5 text-primary" /><span className="text-sm font-medium">Mode hors-ligne</span></div>
          <div className="flex items-center gap-3"><Shield className="h-5 w-5 text-primary" /><span className="text-sm font-medium">Données chiffrées</span></div>
          <div className="flex items-center gap-3"><Lock className="h-5 w-5 text-primary" /><span className="text-sm font-medium">Conforme SYSCOHADA</span></div>
          <div className="flex items-center gap-3"><Zap className="h-5 w-5 text-primary" /><span className="text-sm font-medium">Mises à jour continues</span></div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden border-t border-border/50">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary-glow" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--primary-glow)/0.6),transparent_50%)]" />
        <div className="container relative mx-auto px-4 py-24 text-center">
          <Sparkles className="mx-auto mb-5 h-10 w-10 text-primary-foreground/80" />
          <h2 className="mx-auto max-w-3xl text-balance text-4xl font-bold tracking-tight text-primary-foreground md:text-5xl lg:text-6xl">
            Lundi matin, soit vous comptez à la main. Soit vous servez plus de clients.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-primary-foreground/90">
            Démarrez votre essai gratuit maintenant. 10 minutes. Sans carte bancaire.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="gap-2 px-8 shadow-2xl">
                <TrendingUp className="h-4 w-4" /> Démarrer mes 7 jours gratuits
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-primary-foreground/80">
            ✓ Aucune carte bancaire &nbsp;·&nbsp; ✓ Sans engagement &nbsp;·&nbsp; ✓ Support FR
          </p>
        </div>
      </section>

      {/* Sticky bottom CTA mobile */}
      <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 sm:hidden">
        <StickyCta />
      </div>

      {/* FOOTER léger */}
      <footer className="border-t border-border bg-card">
        <div className="container mx-auto flex flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between">
          <img src={logo} alt="RestoFlow" className="h-7 w-auto" width={140} height={28} />
          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Accueil</Link>
            <Link to="/pricing" className="hover:text-foreground">Tarifs</Link>
            <Link to="/auth" className="hover:text-foreground">Connexion</Link>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} RestoFlow</p>
        </div>
      </footer>
    </div>
  );
}
