import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChefHat, ClipboardList, Package, BarChart3, Users, Smartphone, Check } from "lucide-react";

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

const Landing = () => {
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
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost">Se connecter</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button>Commencer gratuitement</Button>
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
      <section className="container py-20">
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

      {/* CTA */}
      <section className="container pb-20">
        <div className="rounded-2xl bg-gradient-hero p-10 text-center shadow-lg md:p-16">
          <h2 className="mb-4 text-3xl font-bold text-primary-foreground md:text-4xl">
            Prêt à transformer votre restaurant ?
          </h2>
          <p className="mb-8 text-lg text-primary-foreground/90">
            Rejoignez les restaurateurs qui ont choisi la simplicité.
          </p>
          <Link to="/auth?mode=signup">
            <Button size="lg" variant="secondary" className="shadow-md">
              Démarrer maintenant
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} RestoFlow — Conçu pour l'Afrique francophone
        </div>
      </footer>
    </div>
  );
};

export default Landing;
