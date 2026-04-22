import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";

export default function Billing() {
  const { subscription, tier, isActive, loading } = useSubscription();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">Facturation & abonnement</h1>
        <p className="text-muted-foreground mt-1">Gérez votre plan et vos paiements (Mobile Money & Carte).</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="capitalize">Plan {tier}</CardTitle>
              <CardDescription>
                {isActive ? "Votre abonnement est actif" : "Aucun abonnement payant actif"}
              </CardDescription>
            </div>
            <Badge variant={isActive ? "default" : "secondary"}>
              {subscription?.status || "free"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription?.current_period_end && (
            <div className="text-sm">
              <span className="text-muted-foreground">
                {subscription.cancel_at_period_end ? "Accès jusqu'au : " : "Prochain renouvellement : "}
              </span>
              <span className="font-medium">
                {new Date(subscription.current_period_end).toLocaleDateString("fr-FR", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </span>
            </div>
          )}

          {subscription?.cancel_at_period_end && (
            <div className="rounded-md border border-border bg-muted p-3 text-sm">
              Votre abonnement est annulé. Vous gardez l'accès jusqu'à la fin de la période, puis vous repasserez automatiquement en Free.
            </div>
          )}

          <div className="rounded-md border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
            Paiements gérés par <strong>Chariow</strong> (Wave, Orange Money, MTN MoMo, Moov, Carte bancaire). Pour annuler ou modifier ton abonnement, contacte le support.
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" asChild>
              <Link to="/pricing">{isActive ? "Changer de plan" : "Voir les plans"}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}