import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  ChefHat, ClipboardList, Package, BarChart3, Users, Smartphone, Check,
  Wifi, Receipt, Calculator, Wallet, Star, Quote, ArrowRight, Sparkles,
  TrendingUp, Clock, Shield, Globe, Zap, Building2, QrCode, Calendar,
  Printer, KeyRound, FileText, Bot, Database, Activity, Layers, Tags,
  CreditCard, MapPin, Cpu, ShieldCheck, PlayCircle,
} from "lucide-react";
import logo from "@/assets/restoflow-logo.png";
import oryntaLogo from "@/assets/orynta-labs-logo.png";

/* ────────────────────────────────────────────────────────────
   DATA
──────────────────────────────────────────────────────────── */
const demoAccounts = [
  { role: "Gérant", email: "demo@restoflow.africa", password: "DemoResto2026!", access: "Plan Business · tous les modules" },
  { role: "Serveur", email: "serveur@restoflow.africa", password: "DemoResto2026!", access: "Commandes, salle, clients" },
  { role: "Cuisine", email: "cuisine@restoflow.africa", password: "DemoResto2026!", access: "Écran cuisine, tickets, statuts" },
  { role: "Caisse", email: "caisse@restoflow.africa", password: "DemoResto2026!", access: "Encaissement, factures, paiements" },
];

const stats = [
  { value: "+30%", label: "Encaissements plus rapides" },
  { value: "−12h", label: "Économisées / semaine" },
  { value: "0 FCFA", label: "Pour démarrer" },
  { value: "100%", label: "Conforme SYSCOHADA" },
];

const marqueeItems = [
  "Wave", "Orange Money", "MTN MoMo", "Moov Money", "SYSCOHADA",
  "CNSS · IPRES", "Mode Hors-ligne", "Multi-établissements", "QR Menu",
  "Kitchen Display", "Plan de salle", "Marque blanche", "API & Webhooks",
  "IA Conseiller", "ESC/POS",
];

const allFeatures = [
  { icon: ClipboardList, title: "Commandes & salle" },
  { icon: ChefHat, title: "Cuisine KDS" },
  { icon: Package, title: "Stock & inventaires" },
  { icon: Layers, title: "Recettes liées aux ventes" },
  { icon: Wallet, title: "Mobile Money intégré" },
  { icon: Calculator, title: "Comptabilité SYSCOHADA" },
  { icon: Receipt, title: "Factures fiscales" },
  { icon: Users, title: "Paie CNSS / IPRES / IRPP" },
  { icon: Calendar, title: "Planning & shifts" },
  { icon: KeyRound, title: "Pointeuse PIN" },
  { icon: ClipboardList, title: "Réservations & VIP" },
  { icon: QrCode, title: "QR Menu client" },
  { icon: MapPin, title: "Plan de salle visuel" },
  { icon: ChefHat, title: "Gueridon & courses" },
  { icon: Building2, title: "Multi-établissements" },
  { icon: Tags, title: "Marque blanche" },
  { icon: Cpu, title: "API & Webhooks" },
  { icon: Wifi, title: "Mode hors-ligne complet" },
  { icon: Bot, title: "IA conseiller métier" },
  { icon: BarChart3, title: "Menu engineering" },
  { icon: Printer, title: "Imprimantes ESC/POS" },
  { icon: Database, title: "Sauvegardes auto" },
  { icon: ShieldCheck, title: "Audit log complet" },
  { icon: FileText, title: "Exports comptables" },
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
  { quote: "Depuis qu'on est sur RestoFlow, on a divisé par 3 le temps d'encaissement. Mes serveurs adorent.", name: "Aïssatou D.", role: "Propriétaire — Le Baobab, Dakar" },
  { quote: "La comptabilité SYSCOHADA générée automatiquement nous fait gagner 2 jours par mois.", name: "Mamadou S.", role: "Directeur — Chez Mama, Abidjan" },
  { quote: "On gère nos 4 restaurants depuis un seul compte. Les rapports consolidés sont une révolution.", name: "Fatou N.", role: "Groupe Saveurs d'Afrique, Lomé" },
];

const plans = [
  { name: "Essai gratuit", price: "0", cycle: "FCFA · 7 jours", description: "Toutes les fonctionnalités Pro pendant 7 jours.", features: ["Accès complet Pro", "Aucune CB", "1 restaurant", "Bascule lecture seule après 7j"], cta: "Démarrer l'essai", highlight: false },
  { name: "Starter", price: "9 900", cycle: "FCFA / mois", description: "Pour les maquis et petits restos.", features: ["1 restaurant", "Jusqu'à 3 employés", "Caisse & commandes", "Mobile Money", "Tickets de caisse"], cta: "Choisir Starter", highlight: false },
  { name: "Pro", price: "25 000", cycle: "FCFA / mois", description: "Pour les restaurants en croissance.", features: ["Staff illimité", "KDS & plan de salle", "Stock + recettes", "SYSCOHADA", "Réservations", "Analytics avancés"], cta: "Essayer Pro 14 jours", highlight: true },
  { name: "Business", price: "75 000", cycle: "FCFA / mois", description: "Pour les groupes multi-sites.", features: ["Tout Pro", "Multi-établissements", "Rapports consolidés", "API & Webhooks", "Marque blanche", "Support prioritaire"], cta: "Passer Business", highlight: false },
];

const faqs = [
  { q: "Combien de temps pour démarrer ?", a: "10 minutes. Créez un compte, ajoutez votre menu, et commencez à encaisser. Aucune carte bancaire demandée." },
  { q: "Est-ce que ça marche sans internet ?", a: "Oui. Le mode hors-ligne complet permet de prendre des commandes, encaisser et imprimer même sans connexion. Tout se synchronise dès le retour du réseau." },
  { q: "Quels Mobile Money sont supportés ?", a: "Wave, Orange Money, MTN MoMo, Moov Money. Configuration en 2 minutes, en mode test ou production." },
  { q: "La comptabilité est-elle vraiment SYSCOHADA ?", a: "Oui. Plan comptable OHADA complet, écritures automatiques, journaux, balance, grand livre, exports Sage/Excel." },
  { q: "Puis-je gérer plusieurs restaurants ?", a: "Oui, avec le plan Business : un seul compte, plusieurs établissements, rapports consolidés, équipes séparées." },
  { q: "Mes données sont-elles sécurisées ?", a: "Hébergement sécurisé, chiffrement, sauvegardes automatiques, RLS sur chaque table. Données exportables à tout moment." },
];

const heroWords = ["Commandes", "Cuisine", "Caisse", "Stock", "SYSCOHADA", "Mobile Money"];

/* ────────────────────────────────────────────────────────────
   HOOKS / HELPERS
──────────────────────────────────────────────────────────── */
function useInView<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current || inView) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setInView(true);
    }, { threshold });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [inView, threshold]);
  return { ref, inView };
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={{ animationDelay: `${delay}ms` }}
      className={`${inView ? "animate-slide-up" : "opacity-0"} ${className}`}
    >
      {children}
    </div>
  );
}

/* Bouton "bombé" : gradient + glow + shimmer */
const glowBtn =
  "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_10px_40px_-10px_rgba(59,130,246,0.8)] ring-1 ring-blue-400/40 transition-all hover:scale-[1.04] hover:shadow-[0_20px_60px_-10px_rgba(59,130,246,1)] active:scale-[0.98]";

const ghostBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition-all hover:bg-white/10 hover:border-white/30";

/* ────────────────────────────────────────────────────────────
   PAGE
──────────────────────────────────────────────────────────── */
export default function Landing() {
  const [wordIdx, setWordIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setWordIdx((i) => (i + 1) % heroWords.length), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="dark min-h-screen overflow-x-hidden bg-[#050816] text-slate-100 antialiased">
      {/* Background ambient */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute top-[40%] -left-40 h-[500px] w-[500px] rounded-full bg-indigo-600/15 blur-[120px] animate-pulse-glow" />
        <div className="absolute top-[70%] -right-40 h-[500px] w-[500px] rounded-full bg-cyan-500/15 blur-[120px] animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="relative z-10">
        {/* NAV */}
        <header className="sticky top-0 z-50 border-b border-white/5 bg-[#050816]/80 backdrop-blur-xl">
          <div className="container mx-auto flex h-16 items-center justify-between gap-2 px-4">
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <img src={logo} alt="RestoFlow" className="h-8 w-auto" />
              <span className="hidden text-xs font-medium text-slate-400 sm:inline">
                by <span className="font-semibold text-white">Orynta Labs</span>
              </span>
            </Link>
            <nav className="hidden items-center gap-8 md:flex">
              {[
                ["#features", "Fonctionnalités"],
                ["#showcase", "Aperçu"],
                ["#pricing", "Tarifs"],
                ["#faq", "FAQ"],
              ].map(([href, label]) => (
                <a key={href} href={href} className="text-sm font-medium text-slate-300 transition-colors hover:text-white">
                  {label}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <Link to="/auth" className="hidden sm:block">
                <button className="text-sm font-medium text-slate-300 hover:text-white px-3 py-2">Connexion</button>
              </Link>
              <Link to="/auth">
                <button className={glowBtn + " !px-5 !py-2.5"}>
                  Démarrer
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </div>
          </div>
        </header>

        {/* HERO */}
        <section className="relative">
          <div className="container mx-auto grid gap-12 px-4 py-16 md:py-24 lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:py-32">
            <div className="flex flex-col justify-center">
              <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 backdrop-blur">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                </span>
                Nouvelle génération · Conçu pour l'Afrique
              </div>

              <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-7xl">
                Pilotez vos{" "}
                <span className="relative inline-block">
                  <span
                    key={wordIdx}
                    className="inline-block animate-slide-up bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent"
                  >
                    {heroWords[wordIdx]}
                  </span>
                </span>
                <br />
                <span className="bg-gradient-to-r from-white via-blue-100 to-white bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-shift">
                  en un seul écran.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-slate-400 md:text-lg">
                Commandes, cuisine, stock, Mobile Money, comptabilité SYSCOHADA. Tout-en-un, fonctionne hors-ligne, configuré en 10 minutes.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link to="/auth">
                  <button className={glowBtn + " w-full sm:w-auto group"}>
                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:animate-shimmer" />
                    Démarrer gratuitement
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
                <a href="#showcase">
                  <button className={ghostBtn + " w-full sm:w-auto"}>
                    <PlayCircle className="h-4 w-4" /> Voir la démo
                  </button>
                </a>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Sans CB</span>
                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> 7 jours offerts</span>
                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Support en français</span>
              </div>

              <div className="mt-8 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500"].map((c, i) => (
                    <div key={i} className={`h-8 w-8 rounded-full border-2 border-[#050816] ${c}`} />
                  ))}
                </div>
                <div className="text-sm">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(5)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
                  </div>
                  <p className="text-xs text-slate-400">200+ restaurateurs nous font confiance</p>
                </div>
              </div>
            </div>

            {/* Hero mockup */}
            <div className="relative animate-float">
              <div className="absolute -inset-8 rounded-3xl bg-gradient-to-tr from-blue-600/30 via-cyan-500/20 to-transparent blur-3xl" />
              <HeroMockup />
            </div>
          </div>

          {/* Stats */}
          <div className="container mx-auto px-4 pb-16">
            <Reveal>
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur md:grid-cols-4">
                {stats.map((s) => (
                  <div key={s.label} className="bg-white/[0.02] p-6 text-center">
                    <div className="bg-gradient-to-r from-blue-300 to-cyan-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent md:text-4xl">{s.value}</div>
                    <div className="mt-1 text-xs uppercase tracking-wide text-slate-400 md:text-sm">{s.label}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* MARQUEE */}
        <section className="relative border-y border-white/5 bg-white/[0.02] py-6">
          <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
            <div className="flex w-max animate-marquee gap-12">
              {[...marqueeItems, ...marqueeItems].map((item, i) => (
                <div key={i} className="flex shrink-0 items-center gap-3 text-sm font-medium text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WHY — BENTO */}
        <section className="relative py-20 md:py-28">
          <div className="container mx-auto px-4">
            <Reveal>
              <div className="mx-auto mb-14 max-w-2xl text-center">
                <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
                  Pourquoi choisir{" "}
                  <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">RestoFlow</span> ?
                </h2>
                <p className="mt-4 text-base text-slate-400 md:text-lg">
                  Des fonctionnalités pensées pour le terrain africain, pas adaptées à la va-vite.
                </p>
              </div>
            </Reveal>

            <div className="grid auto-rows-[280px] grid-cols-1 gap-5 md:grid-cols-3 md:auto-rows-[260px]">
              {/* Card 1 — Commandes éclair */}
              <Reveal delay={0} className="md:col-span-2">
                <BentoCard title="Commandes éclair" subtitle="Prise en 3 taps, addition automatique" icon={ClipboardList}>
                  <OrderTicketMock />
                </BentoCard>
              </Reveal>

              {/* Card 2 — Mobile Money orbit */}
              <Reveal delay={80}>
                <BentoCard title="Mobile Money natif" subtitle="Wave · Orange · MTN · Moov" icon={Wallet}>
                  <MobileMoneyOrbit />
                </BentoCard>
              </Reveal>

              {/* Card 3 — Cuisine KDS */}
              <Reveal delay={120}>
                <BentoCard title="Cuisine KDS" subtitle="Tickets temps réel par station" icon={ChefHat}>
                  <KDSMock />
                </BentoCard>
              </Reveal>

              {/* Card 4 — SYSCOHADA */}
              <Reveal delay={160}>
                <BentoCard title="SYSCOHADA en 1 clic" subtitle="Journal, balance, exports Sage" icon={Calculator}>
                  <SyscohadaMock />
                </BentoCard>
              </Reveal>

              {/* Card 5 — Stock */}
              <Reveal delay={200} className="md:col-span-1">
                <BentoCard title="Stock intelligent" subtitle="Alertes seuils, recettes liées" icon={Package}>
                  <StockMock />
                </BentoCard>
              </Reveal>

              {/* Card 6 — Multi-restos (large) */}
              <Reveal delay={240} className="md:col-span-3">
                <BentoCard title="Pilotez 1, 5, 50 établissements" subtitle="Rapports consolidés en temps réel" icon={Building2} large>
                  <MultiRestoMock />
                </BentoCard>
              </Reveal>
            </div>
          </div>
        </section>

        {/* SHOWCASE — mockups d'écrans */}
        <section id="showcase" className="relative border-y border-white/5 bg-white/[0.02] py-20 md:py-28">
          <div className="container mx-auto px-4">
            <Reveal>
              <div className="mx-auto mb-12 max-w-2xl text-center">
                <Badge className="mb-4 border-blue-400/30 bg-blue-500/10 text-blue-300">Aperçu en direct</Badge>
                <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
                  Conçu pour <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">chaque rôle</span>
                </h2>
                <p className="mt-4 text-base text-slate-400 md:text-lg">
                  Caisse, Cuisine, Gérant, Client QR — chaque écran est pensé pour son utilisateur.
                </p>
              </div>
            </Reveal>
            <ShowcaseTabs />
          </div>
        </section>

        {/* ALL FEATURES */}
        <section id="features" className="relative py-20 md:py-28">
          <div className="container mx-auto px-4">
            <Reveal>
              <div className="mx-auto mb-14 max-w-2xl text-center">
                <Badge className="mb-4 border-blue-400/30 bg-blue-500/10 text-blue-300">Tout-en-un</Badge>
                <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
                  24 modules. Une seule plateforme.
                </h2>
                <p className="mt-4 text-base text-slate-400 md:text-lg">
                  Du carnet de commandes à la déclaration fiscale — sans changer d'outil.
                </p>
              </div>
            </Reveal>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {allFeatures.map((f, i) => (
                <Reveal key={f.title} delay={i * 25}>
                  <div className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-all hover:-translate-y-1 hover:border-blue-400/40 hover:bg-white/[0.06]">
                    <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-500/0 via-blue-500/0 to-cyan-500/0 opacity-0 transition-opacity group-hover:opacity-100 group-hover:from-blue-500/10 group-hover:to-cyan-500/5" />
                    <div className="mb-3 inline-flex rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 p-2.5 text-blue-300 ring-1 ring-blue-400/20 transition-transform group-hover:scale-110">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold text-white">{f.title}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* AVANT / APRÈS */}
        <section className="border-t border-white/5 py-20 md:py-28">
          <div className="container mx-auto px-4">
            <Reveal>
              <div className="mx-auto mb-14 max-w-2xl text-center">
                <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
                  De la galère à la sérénité
                </h2>
                <p className="mt-4 text-base text-slate-400 md:text-lg">
                  Ce qui change concrètement dès la première semaine.
                </p>
              </div>
            </Reveal>
            <div className="mx-auto max-w-4xl space-y-3">
              {problems.map((p, i) => (
                <Reveal key={i} delay={i * 60}>
                  <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur md:grid-cols-2">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-300">✕</span>
                      <span className="text-sm text-slate-400 line-through decoration-rose-500/40">{p.before}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                      <span className="text-sm font-medium text-white">{p.after}</span>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* DEMO ACCOUNTS */}
        <section className="border-t border-white/5 bg-white/[0.02] py-20">
          <div className="container mx-auto px-4">
            <Reveal>
              <div className="mx-auto mb-12 max-w-2xl text-center">
                <Badge className="mb-4 border-blue-400/30 bg-blue-500/10 text-blue-300">Démo Business</Badge>
                <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
                  Testez avec chaque rôle
                </h2>
                <p className="mt-4 text-base text-slate-400 md:text-lg">
                  Connectez-vous immédiatement avec un compte de démonstration.
                </p>
              </div>
            </Reveal>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {demoAccounts.map((a, i) => (
                <Reveal key={a.email} delay={i * 80}>
                  <div className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur transition-all hover:border-blue-400/40 hover:bg-white/[0.06]">
                    <Badge className="mb-4 border-blue-400/30 bg-blue-500/10 text-blue-300">{a.role}</Badge>
                    <p className="text-sm font-medium text-white">{a.email}</p>
                    <p className="mt-1 font-mono text-sm text-slate-400">{a.password}</p>
                    <p className="mt-3 min-h-10 text-xs text-slate-500">{a.access}</p>
                    <Link to={`/auth?demo=${a.role.toLowerCase()}`} className="mt-4 block">
                      <button className={`w-full ${a.role === "Gérant" ? glowBtn : ghostBtn}`}>Utiliser</button>
                    </Link>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-4">
            <Reveal>
              <div className="mx-auto mb-14 max-w-2xl text-center">
                <div className="mb-4 inline-flex items-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
                  Des restaurateurs qui dorment mieux
                </h2>
              </div>
            </Reveal>
            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.map((t, i) => (
                <Reveal key={t.name} delay={i * 100}>
                  <figure className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur">
                    <Quote className="h-6 w-6 text-blue-400/60" />
                    <blockquote className="mt-4 text-base leading-relaxed text-slate-200">"{t.quote}"</blockquote>
                    <figcaption className="mt-5 border-t border-white/10 pt-4">
                      <div className="text-sm font-semibold text-white">{t.name}</div>
                      <div className="text-xs text-slate-400">{t.role}</div>
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="border-t border-white/5 bg-white/[0.02] py-20 md:py-28">
          <div className="container mx-auto px-4">
            <Reveal>
              <div className="mx-auto mb-14 max-w-2xl text-center">
                <Badge className="mb-4 border-blue-400/30 bg-blue-500/10 text-blue-300">Tarifs simples</Badge>
                <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
                  Démarrez gratuitement,{" "}
                  <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">scalez</span> quand vous voulez
                </h2>
                <p className="mt-4 text-base text-slate-400 md:text-lg">Pas d'engagement. Annulez à tout moment.</p>
              </div>
            </Reveal>
            <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((plan, i) => (
                <Reveal key={plan.name} delay={i * 80}>
                  <div
                    className={`relative h-full rounded-2xl p-6 backdrop-blur transition-all sm:p-7 ${
                      plan.highlight
                        ? "border-2 border-blue-400/60 bg-gradient-to-b from-blue-500/15 to-blue-900/5 shadow-[0_20px_60px_-20px_rgba(59,130,246,0.6)]"
                        : "border border-white/10 bg-white/[0.03] hover:border-white/25"
                    }`}
                  >
                    {plan.highlight && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 border-0 bg-gradient-to-r from-blue-500 to-cyan-400 px-3 py-1 text-xs text-white shadow-lg">
                        ⭐ Le plus populaire
                      </Badge>
                    )}
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    <p className="mt-1 text-sm text-slate-400">{plan.description}</p>
                    <div className="mt-5 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                      <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">{plan.price}</span>
                      <span className="text-xs text-slate-400 sm:text-sm">/{plan.cycle}</span>
                    </div>
                    <Link to="/auth" className="mt-6 block">
                      <button className={`w-full ${plan.highlight ? glowBtn : ghostBtn}`}>{plan.cta}</button>
                    </Link>
                    <ul className="mt-6 space-y-2.5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>
            <p className="mt-8 text-center text-sm text-slate-400">Tous les prix en FCFA, hors taxes. Paiement par carte ou Mobile Money.</p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-20 md:py-28">
          <div className="container mx-auto max-w-3xl px-4">
            <Reveal>
              <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">Questions fréquentes</h2>
            </Reveal>
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 backdrop-blur">
                  <AccordionTrigger className="py-4 text-left text-base font-semibold text-white hover:no-underline">{f.q}</AccordionTrigger>
                  <AccordionContent className="pb-4 text-slate-400">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* FINAL CTA — explosif */}
        <section className="relative overflow-hidden border-t border-white/5">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.4),transparent_50%)]" />
          <div className="absolute -top-20 right-1/3 h-96 w-96 rounded-full bg-cyan-300/30 blur-3xl animate-pulse-glow" />
          <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="container relative mx-auto px-4 py-24 text-center md:py-32">
            <Sparkles className="mx-auto mb-6 h-10 w-10 text-white animate-float" />
            <h2 className="mx-auto max-w-3xl text-balance text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
              Prêt à reprendre le contrôle de votre restaurant&nbsp;?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-base text-white/85 md:text-lg">
              Rejoignez les restaurateurs qui ont choisi la simplicité. <strong>10 minutes</strong> pour démarrer.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/auth">
                <button className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-white px-10 py-5 text-base font-bold text-blue-700 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] ring-2 ring-white/40 transition-all hover:scale-110 hover:shadow-[0_30px_80px_-15px_rgba(0,0,0,0.7)] active:scale-100">
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-blue-200/60 to-transparent group-hover:animate-shimmer" />
                  <Zap className="h-5 w-5" />
                  Démarrer maintenant — Gratuit
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/90">
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4" /> Sans CB</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4" /> 7 jours offerts</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4" /> Support en français</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4" /> Annulable à tout moment</span>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-white/5 bg-[#030610]">
          <div className="container mx-auto grid gap-8 px-4 py-12 md:grid-cols-4">
            <div>
              <img src={logo} alt="RestoFlow" className="mb-3 h-8 w-auto" />
              <p className="text-sm text-slate-400">Le POS tout-en-un pour les restaurants africains modernes.</p>
              <div className="mt-4 flex items-center gap-2">
                <img src={oryntaLogo} alt="Orynta Labs" className="h-8 w-8 object-contain" />
                <div className="text-xs leading-tight">
                  <p className="font-semibold text-white">Un produit Orynta Labs</p>
                  <p className="text-slate-400">Construire. Gérer. Grandir.</p>
                </div>
              </div>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold text-white">Produit</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#features" className="hover:text-white">Fonctionnalités</a></li>
                <li><a href="#pricing" className="hover:text-white">Tarifs</a></li>
                <li><a href="#faq" className="hover:text-white">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold text-white">Entreprise</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link to="/auth" className="hover:text-white">Connexion</Link></li>
                <li><Link to="/auth" className="hover:text-white">Créer un compte</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold text-white">Support</h4>
              <p className="text-sm text-slate-400">Une question ? Contactez-nous, on répond en français sous 24h.</p>
            </div>
          </div>
          <div className="border-t border-white/5">
            <div className="container mx-auto px-4 py-5 text-center text-xs text-slate-500">
              © {new Date().getFullYear()} RestoFlow — un produit <span className="font-semibold text-white">Orynta Labs</span>. Conçu en Afrique, pour l'Afrique.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   COMPONENTS — Mockups visuels
──────────────────────────────────────────────────────────── */

function BentoCard({
  title, subtitle, icon: Icon, children, large = false,
}: { title: string; subtitle: string; icon: any; children: React.ReactNode; large?: boolean }) {
  return (
    <div className="group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 backdrop-blur transition-all hover:border-blue-400/40 hover:shadow-[0_20px_60px_-20px_rgba(59,130,246,0.5)]">
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl transition-all group-hover:bg-blue-500/30" />
      <div className="relative flex h-full flex-col">
        <div className="mb-3 flex items-center gap-2">
          <div className="rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-400/10 p-1.5 text-blue-300 ring-1 ring-blue-400/30">
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-xs font-medium uppercase tracking-wider text-blue-300/80">Live</span>
        </div>
        <h3 className={`font-bold tracking-tight text-white ${large ? "text-2xl md:text-3xl" : "text-lg md:text-xl"}`}>{title}</h3>
        <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        <div className="mt-auto pt-4">{children}</div>
      </div>
    </div>
  );
}

function HeroMockup() {
  return (
    <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-5 shadow-2xl backdrop-blur-xl">
      {/* Window chrome */}
      <div className="mb-4 flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-3 text-xs text-slate-400">caisse · table 7</span>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400">Commande</p>
          <p className="text-2xl font-bold text-white">#0142</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-400/30 animate-pulse-glow">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Payée · Wave
        </span>
      </div>
      <div className="mt-4 space-y-2">
        {[
          { name: "Thieboudienne", qty: 2, price: "7 000" },
          { name: "Yassa poulet", qty: 1, price: "4 500" },
          { name: "Bissap glacé", qty: 3, price: "1 500" },
          { name: "Pastels (×6)", qty: 1, price: "2 000" },
        ].map((it, i) => (
          <div
            key={it.name}
            style={{ animationDelay: `${i * 150}ms` }}
            className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 animate-ticket-in"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/20 text-xs font-bold text-blue-300">{it.qty}</span>
              <span className="text-sm text-white">{it.name}</span>
            </div>
            <span className="text-sm font-medium text-slate-300">{it.price} <span className="text-xs text-slate-500">F</span></span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl bg-gradient-to-r from-blue-500/20 to-cyan-400/10 px-4 py-3 ring-1 ring-blue-400/30">
        <span className="text-sm font-semibold text-white">Total</span>
        <span className="text-xl font-bold text-white">15 000 <span className="text-xs text-blue-200">FCFA</span></span>
      </div>
      {/* Floating mini cards */}
      <div className="absolute -left-6 top-1/3 hidden rounded-2xl border border-white/15 bg-[#0a1228]/90 p-3 shadow-2xl backdrop-blur md:block animate-float">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-emerald-500/20 p-2 text-emerald-300"><TrendingUp className="h-4 w-4" /></div>
          <div>
            <p className="text-[10px] uppercase text-slate-400">Aujourd'hui</p>
            <p className="text-sm font-bold text-white">+342 000 F</p>
          </div>
        </div>
      </div>
      <div className="absolute -right-4 bottom-1/4 hidden rounded-2xl border border-white/15 bg-[#0a1228]/90 p-3 shadow-2xl backdrop-blur md:block animate-float" style={{ animationDelay: "1s" }}>
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-blue-500/20 p-2 text-blue-300"><ChefHat className="h-4 w-4" /></div>
          <div>
            <p className="text-[10px] uppercase text-slate-400">Cuisine</p>
            <p className="text-sm font-bold text-white">3 tickets prêts</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderTicketMock() {
  return (
    <div className="space-y-1.5">
      {[
        { qty: 2, name: "Thieb", t: "150ms" },
        { qty: 1, name: "Yassa", t: "300ms" },
        { qty: 3, name: "Bissap", t: "450ms" },
      ].map((i, idx) => (
        <div
          key={idx}
          style={{ animationDelay: i.t }}
          className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 animate-ticket-in"
        >
          <span className="text-xs text-slate-200"><span className="font-bold text-blue-300">{i.qty}×</span> {i.name}</span>
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        </div>
      ))}
      <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-blue-500/20 to-transparent px-3 py-1.5">
        <span className="text-xs font-semibold text-white">Total</span>
        <span className="text-xs font-bold text-white">12 500 F</span>
      </div>
    </div>
  );
}

function MobileMoneyOrbit() {
  const ops = [
    { name: "Wave", color: "from-sky-400 to-blue-600" },
    { name: "Orange", color: "from-orange-400 to-orange-600" },
    { name: "MTN", color: "from-yellow-300 to-amber-500" },
    { name: "Moov", color: "from-blue-400 to-indigo-600" },
  ];
  return (
    <div className="relative mx-auto h-32 w-32">
      <div className="absolute inset-0 animate-spin-slow">
        {ops.map((o, i) => {
          const angle = (i / ops.length) * 360;
          return (
            <div
              key={o.name}
              style={{ transform: `rotate(${angle}deg) translateX(56px) rotate(-${angle}deg)` }}
              className="absolute left-1/2 top-1/2 -ml-5 -mt-5"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${o.color} text-[10px] font-bold text-white shadow-lg ring-2 ring-white/20`}>
                {o.name.slice(0, 2).toUpperCase()}
              </div>
            </div>
          );
        })}
      </div>
      <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-[0_0_30px_rgba(59,130,246,0.6)]">
        <Wallet className="h-5 w-5" />
      </div>
    </div>
  );
}

function KDSMock() {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {[
        { c: "bg-rose-500/20 border-rose-400/40 text-rose-200", l: "À faire", n: 2 },
        { c: "bg-amber-500/20 border-amber-400/40 text-amber-200", l: "Cuisson", n: 3 },
        { c: "bg-emerald-500/20 border-emerald-400/40 text-emerald-200", l: "Prêt", n: 1 },
      ].map((s) => (
        <div key={s.l} className={`rounded-lg border ${s.c} p-2 text-center`}>
          <div className="text-[9px] uppercase tracking-wide opacity-80">{s.l}</div>
          <div className="text-lg font-bold">{s.n}</div>
        </div>
      ))}
    </div>
  );
}

function StockMock() {
  const items = [
    { name: "Riz", pct: 80, color: "bg-emerald-400" },
    { name: "Poulet", pct: 35, color: "bg-amber-400" },
    { name: "Tomate", pct: 12, color: "bg-rose-400" },
  ];
  return (
    <div className="space-y-2">
      {items.map((i) => (
        <div key={i.name}>
          <div className="mb-1 flex justify-between text-[10px]">
            <span className="text-slate-300">{i.name}</span>
            <span className="text-slate-400">{i.pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className={`h-full ${i.color} transition-all`} style={{ width: `${i.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SyscohadaMock() {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3 font-mono text-[10px] text-slate-300">
      <div className="flex justify-between border-b border-white/5 pb-1"><span>411 Clients</span><span className="text-emerald-300">+15 000</span></div>
      <div className="flex justify-between border-b border-white/5 py-1"><span>701 Ventes</span><span className="text-emerald-300">+12 712</span></div>
      <div className="flex justify-between py-1"><span>443 TVA</span><span className="text-emerald-300">+2 288</span></div>
      <div className="mt-1 flex items-center gap-1 text-emerald-400">
        <Check className="h-3 w-3" /> <span>Conforme OHADA</span>
      </div>
    </div>
  );
}

function MultiRestoMock() {
  const restos = [
    { name: "Le Baobab · Dakar", ca: "1.2M", up: "+18%" },
    { name: "Chez Mama · Abidjan", ca: "850k", up: "+9%" },
    { name: "Saveurs · Lomé", ca: "640k", up: "+22%" },
    { name: "Tropic · Cotonou", ca: "420k", up: "+5%" },
  ];
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {restos.map((r, i) => (
        <div
          key={r.name}
          style={{ animationDelay: `${i * 100}ms` }}
          className="rounded-xl border border-white/10 bg-white/[0.04] p-3 animate-ticket-in"
        >
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-blue-400" />
            <p className="truncate text-xs font-medium text-white">{r.name}</p>
          </div>
          <p className="mt-2 text-lg font-bold text-white">{r.ca} <span className="text-xs font-normal text-slate-400">F</span></p>
          <p className="text-xs text-emerald-300">{r.up} cette semaine</p>
        </div>
      ))}
    </div>
  );
}

/* Showcase tabs */
function ShowcaseTabs() {
  const tabs = [
    { key: "caisse", label: "Caisse" },
    { key: "cuisine", label: "Cuisine" },
    { key: "gerant", label: "Gérant" },
    { key: "qr", label: "Client QR" },
  ] as const;
  const [active, setActive] = useState<(typeof tabs)[number]["key"]>("caisse");

  return (
    <div>
      <div className="mx-auto mb-8 flex max-w-md flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 backdrop-blur">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              active === t.key
                ? "bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-lg"
                : "text-slate-300 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mx-auto max-w-5xl">
        <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-2xl backdrop-blur-xl sm:p-6">
          <div className="mb-4 flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          </div>
          {active === "caisse" && <CaisseScreen />}
          {active === "cuisine" && <CuisineScreen />}
          {active === "gerant" && <GerantScreen />}
          {active === "qr" && <QrScreen />}
        </div>
      </div>
    </div>
  );
}

function CaisseScreen() {
  const items = ["Thieb", "Yassa", "Mafé", "Pastel", "Bissap", "Gingembre", "Café", "Eau"];
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {items.map((it, i) => (
          <div key={it} style={{ animationDelay: `${i * 40}ms` }} className="aspect-square rounded-xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-cyan-400/5 p-3 text-center transition-all hover:scale-105 hover:border-blue-400/40 animate-ticket-in">
            <div className="mx-auto mb-2 h-8 w-8 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-300 opacity-80" />
            <p className="text-xs font-medium text-white">{it}</p>
            <p className="text-[10px] text-slate-400">2 500 F</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <p className="text-xs uppercase tracking-wider text-slate-400">Table 7 · Commande</p>
        <div className="mt-3 space-y-2">
          {["Thieb ×2", "Bissap ×3"].map((l) => (
            <div key={l} className="flex justify-between text-sm">
              <span className="text-slate-200">{l}</span>
              <span className="text-slate-300">5 000</span>
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-white/10 pt-3">
          <div className="flex justify-between text-base font-bold text-white">
            <span>Total</span><span>15 000 F</span>
          </div>
        </div>
        <button className={glowBtn + " mt-4 w-full !py-2.5 !text-xs"}><Wallet className="h-4 w-4" /> Encaisser Wave</button>
      </div>
    </div>
  );
}

function CuisineScreen() {
  const cols = [
    { title: "À faire", color: "border-rose-400/40 bg-rose-500/5", tickets: ["#142 — Table 7", "#143 — Comptoir"] },
    { title: "En cours", color: "border-amber-400/40 bg-amber-500/5", tickets: ["#140 — Table 3", "#141 — Table 5", "#138 — Livraison"] },
    { title: "Prêt", color: "border-emerald-400/40 bg-emerald-500/5", tickets: ["#139 — Table 1"] },
  ];
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {cols.map((c) => (
        <div key={c.title} className={`rounded-2xl border ${c.color} p-3`}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/80">{c.title} · {c.tickets.length}</p>
          <div className="space-y-2">
            {c.tickets.map((t, i) => (
              <div key={t} style={{ animationDelay: `${i * 100}ms` }} className="rounded-lg border border-white/10 bg-[#050816]/60 p-3 backdrop-blur animate-ticket-in">
                <p className="text-sm font-bold text-white">{t}</p>
                <p className="mt-1 text-xs text-slate-400">Thieb · Yassa · Bissap</p>
                <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-500"><Clock className="h-3 w-3" /> 4 min</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function GerantScreen() {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {[
        { l: "Chiffre d'affaires", v: "1 248 000 F", up: "+18%" },
        { l: "Tickets servis", v: "142", up: "+9%" },
        { l: "Ticket moyen", v: "8 790 F", up: "+4%" },
      ].map((k) => (
        <div key={k.l} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">{k.l}</p>
          <p className="mt-2 text-2xl font-bold text-white">{k.v}</p>
          <p className="text-xs text-emerald-300">{k.up} vs hier</p>
        </div>
      ))}
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 lg:col-span-3">
        <p className="mb-2 text-sm font-semibold text-white">Ventes · 7 derniers jours</p>
        <svg viewBox="0 0 400 100" className="h-24 w-full">
          <defs>
            <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgb(96,165,250)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="rgb(96,165,250)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,80 L60,60 L120,70 L180,40 L240,50 L300,25 L360,35 L400,15 L400,100 L0,100 Z" fill="url(#g)" />
          <path d="M0,80 L60,60 L120,70 L180,40 L240,50 L300,25 L360,35 L400,15" fill="none" stroke="rgb(96,165,250)" strokeWidth="2" />
        </svg>
      </div>
    </div>
  );
}

function QrScreen() {
  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <div className="rounded-xl bg-white p-3">
          <div className="grid h-32 w-32 grid-cols-8 gap-0.5">
            {Array.from({ length: 64 }).map((_, i) => (
              <div key={i} className={Math.random() > 0.5 ? "bg-black" : "bg-white"} />
            ))}
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">Table 7 — Scannez & commandez</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <p className="text-xs uppercase tracking-wider text-slate-400">Menu Le Baobab</p>
        <div className="mt-3 space-y-2">
          {[
            { n: "Thieboudienne", p: "3 500" },
            { n: "Yassa Poulet", p: "4 500" },
            { n: "Mafé", p: "4 000" },
            { n: "Bissap", p: "500" },
          ].map((m) => (
            <div key={m.n} className="flex items-center justify-between rounded-lg border border-white/5 bg-[#050816]/50 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-white">{m.n}</p>
                <p className="text-[10px] text-slate-400">Plat traditionnel</p>
              </div>
              <button className="rounded-lg bg-gradient-to-b from-blue-500 to-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg hover:scale-105 transition-transform">
                + {m.p} F
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}