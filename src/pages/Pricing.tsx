import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useChariowCheckout } from "@/hooks/useChariowCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

type Cycle = "monthly" | "yearly";

const PLANS = [
  {
    id: "free" as const,
    name: "Free",
    description: "Pour démarrer ou tester l'app",
    monthly: { price: 0, planKey: null },
    yearly: { price: 0, planKey: null },
    features: [
      "1 restaurant",
      "Jusqu'à 3 employés",
      "Menu & commandes basiques",
      "Plan de salle simple",
      "Caisse & tickets",
    ],
    cta: "Commencer gratuitement",
  },
  {
    id: "pro" as const,
    name: "Pro",
    description: "Pour les restaurants en croissance",
    monthly: { price: 19000, planKey: "pro_plan" as const },
    yearly: { price: 182000, planKey: "pro_plan" as const },
    features: [
      "Staff illimité",
      "Analytics avancés",
      "Module fiscal & factures",
      "Multi-langues menu",
      "Réservations & dépôts",
      "Cuisine display & stations",
      "Support email",
    ],
    cta: "Passer Pro",
    highlight: true,
  },
  {
    id: "business" as const,
    name: "Business",
    description: "Pour les groupes et chaînes",
    monthly: { price: 52000, planKey: "business_plan" as const },
    yearly: { price: 499000, planKey: "business_plan" as const },
    features: [
      "Tout Pro inclus",
      "Multi-restaurants",
      "API & intégrations PMS",
      "Comptabilité SYSCOHADA",
      "Paie & déclarations fiscales",
      "Backups & audit avancé",
      "Support prioritaire",
    ],
    cta: "Passer Business",
  },
];

export default function Pricing() {
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const { user } = useAuth();
  const { tier, isActive } = useSubscription();
  const { openCheckout, loading } = useChariowCheckout();
  const navigate = useNavigate();

  const handleSelect = (planKey: "pro_plan" | "business_plan" | null, planId: string) => {
    if (!planKey) {
      navigate(user ? "/app" : "/auth");
      return;
    }
    if (!user) {
      navigate("/auth");
      return;
    }
    if (isActive && tier === planId) {
      navigate("/app/billing");
      return;
    }
    openCheckout({ plan_key: planKey, cycle });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="font-bold text-xl">RestoFlow</Link>
          <div className="flex items-center gap-2">
            {user ? (
              <Link to="/app">
                <Button variant="outline">Mon espace</Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button variant="outline">Se connecter</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Des tarifs simples, pensés pour la restauration</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Démarrez gratuitement. Passez Pro ou Business quand vous êtes prêt.
          </p>

          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2">
            <span className={cycle === "monthly" ? "font-semibold" : "text-muted-foreground"}>Mensuel</span>
            <Switch checked={cycle === "yearly"} onCheckedChange={(c) => setCycle(c ? "yearly" : "monthly")} />
            <span className={cycle === "yearly" ? "font-semibold" : "text-muted-foreground"}>Annuel</span>
            <Badge variant="secondary">-20%</Badge>
          </div>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const cycleData = cycle === "monthly" ? plan.monthly : plan.yearly;
            const isCurrent = isActive && tier === plan.id;
            const monthlyEquiv = cycle === "yearly" && plan.yearly.price > 0
              ? Math.round(plan.yearly.price / 12).toLocaleString("fr-FR")
              : null;

            return (
              <Card key={plan.id} className={plan.highlight ? "border-primary shadow-lg" : ""}>
                {plan.highlight && (
                  <div className="bg-primary px-4 py-1 text-center text-xs font-semibold text-primary-foreground">
                    POPULAIRE
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{plan.name}</CardTitle>
                    {isCurrent && <Badge>Actuel</Badge>}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">
                        {cycleData.price === 0 ? "Gratuit" : `${cycleData.price.toLocaleString("fr-FR")} FCFA`}
                      </span>
                      {cycleData.price > 0 && (
                        <span className="text-muted-foreground">/{cycle === "monthly" ? "mois" : "an"}</span>
                      )}
                    </div>
                    {monthlyEquiv && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Soit {monthlyEquiv} FCFA/mois
                      </p>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.highlight ? "default" : "outline"}
                    disabled={loading || isCurrent}
                    onClick={() => handleSelect(cycleData.planKey, plan.id)}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isCurrent ? "Plan actuel" : plan.cta}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Paiements sécurisés via Chariow • Wave, Orange Money, MTN MoMo, Moov & Carte bancaire
        </p>
      </main>
    </div>
  );
}