import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Loader2, Info, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useChariowCheckout } from "@/hooks/useChariowCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

type Cycle = "monthly" | "yearly";

type PlanDetailSection = { title: string; items: string[] };

const PLANS = [
  {
    id: "free" as const,
    name: "Essai gratuit",
    description: "7 jours de Pro offerts, sans carte bancaire",
    monthly: { price: 0, planKey: null },
    yearly: { price: 0, planKey: null },
    features: [
      "7 jours d'essai Pro 100% gratuit",
      "Aucune carte bancaire requise",
      "Toutes les fonctionnalités Pro",
      "1 restaurant inclus",
      "Bascule en lecture seule après 7j",
    ],
    cta: "Démarrer l'essai 7 jours",
    badge: "7 jours offerts",
    details: [
      {
        title: "Pendant les 7 jours",
        items: [
          "Accès complet aux fonctionnalités Pro",
          "Création illimitée de menus, commandes, factures",
          "Plan de salle, cuisine display, stations",
          "Réservations, clients VIP, multi-langues",
          "Aucun engagement, aucune CB demandée",
        ],
      },
      {
        title: "Après les 7 jours",
        items: [
          "Vos données restent intactes",
          "Passez Pro ou Business pour continuer",
          "Sinon, mode lecture seule (consultation uniquement)",
        ],
      },
    ] satisfies PlanDetailSection[],
  },
  {
    id: "pro" as const,
    name: "Pro",
    description: "Pour les restaurants en croissance",
    monthly: { price: 19000, planKey: "pro_plan" as const },
    yearly: { price: 182000, planKey: "pro_plan" as const },
    features: [
      "1 restaurant",
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
    ] satisfies PlanDetailSection[],
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
    ] satisfies PlanDetailSection[],
  },
];

export default function Pricing() {
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [detailsPlan, setDetailsPlan] = useState<typeof PLANS[number] | null>(null);
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
              <Card key={plan.id} className={plan.highlight ? "border-primary shadow-lg relative overflow-hidden" : "relative overflow-hidden"}>
                {plan.highlight && (
                  <div className="bg-primary px-4 py-1 text-center text-xs font-semibold text-primary-foreground">
                    POPULAIRE
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{plan.name}</CardTitle>
                    {isCurrent ? <Badge>Actuel</Badge> : ("badge" in plan && plan.badge ? <Badge variant="secondary">{plan.badge}</Badge> : null)}
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
                    {plan.id === "free" && (
                      <p className="text-sm text-muted-foreground mt-1">
                        7 jours • Sans CB • Sans engagement
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
                  <div className="flex flex-col gap-2">
                    <Button
                      className="w-full"
                      variant={plan.highlight ? "default" : "outline"}
                      disabled={loading || isCurrent}
                      onClick={() => handleSelect(cycleData.planKey, plan.id)}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isCurrent ? "Plan actuel" : plan.cta}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-muted-foreground"
                      onClick={() => setDetailsPlan(plan)}
                    >
                      <Info className="h-4 w-4 mr-1" />
                      Voir tous les détails
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Paiements sécurisés via Chariow • Wave, Orange Money, MTN MoMo, Moov & Carte bancaire
        </p>
      </main>

      <Dialog open={!!detailsPlan} onOpenChange={(o) => !o && setDetailsPlan(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailsPlan && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <DialogTitle className="text-2xl">Plan {detailsPlan.name}</DialogTitle>
                </div>
                <DialogDescription>{detailsPlan.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                {detailsPlan.details?.map((section) => (
                  <div key={section.title}>
                    <h3 className="font-semibold text-base mb-2 text-foreground">{section.title}</h3>
                    <ul className="space-y-1.5">
                      {section.items.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Check className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <div className="pt-4 border-t">
                  <Button
                    className="w-full"
                    onClick={() => {
                      const cycleData = cycle === "monthly" ? detailsPlan.monthly : detailsPlan.yearly;
                      handleSelect(cycleData.planKey, detailsPlan.id);
                      setDetailsPlan(null);
                    }}
                  >
                    {detailsPlan.cta}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}