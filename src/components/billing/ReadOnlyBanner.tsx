import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";

export function ReadOnlyBanner() {
  const { loading, isActive, subscription, isTrialing, trialDaysLeft } = useSubscription();
  if (loading) return null;

  // Trial ending soon (≤2 days)
  if (isTrialing && trialDaysLeft <= 2) {
    return (
      <div className="border-b border-primary/30 bg-primary/10 px-4 py-2 text-sm flex items-center gap-3">
        <Lock className="h-4 w-4 text-primary shrink-0" />
        <span className="flex-1 text-primary">
          Votre essai Pro se termine dans {trialDaysLeft} jour{trialDaysLeft > 1 ? "s" : ""}.
          Souscrivez pour conserver l'accès.
        </span>
        <Button size="sm" asChild>
          <Link to="/pricing">Choisir un plan</Link>
        </Button>
      </div>
    );
  }

  // Expired / no active sub
  if (!isActive && subscription) {
    return (
      <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm flex items-center gap-3">
        <Lock className="h-4 w-4 text-destructive shrink-0" />
        <span className="flex-1 text-destructive font-medium">
          Mode lecture seule — votre abonnement a expiré. Réactivez un plan pour modifier vos données.
        </span>
        <Button size="sm" variant="destructive" asChild>
          <Link to="/pricing">Réactiver</Link>
        </Button>
      </div>
    );
  }

  return null;
}