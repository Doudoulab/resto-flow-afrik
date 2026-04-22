import { useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Billing() {
  const { subscription, tier, isActive, environment, loading } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: { environment },
      });
      if (error) throw error;
      window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error("Impossible d'ouvrir le portail: " + e.message);
    } finally {
      setPortalLoading(false);
    }
  };

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
        <p className="text-muted-foreground mt-1">Gérez votre plan, vos paiements et vos factures.</p>
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

          <div className="flex flex-wrap gap-2 pt-2">
            {isActive && (
              <Button onClick={openPortal} disabled={portalLoading}>
                {portalLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
                Gérer mon abonnement
                <ExternalLink className="h-3 w-3 ml-2" />
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to="/pricing">{isActive ? "Changer de plan" : "Voir les plans"}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}