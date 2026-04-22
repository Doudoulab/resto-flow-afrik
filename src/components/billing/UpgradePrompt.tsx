import { Link } from "react-router-dom";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSubscription, type PlanTier } from "@/hooks/useSubscription";

interface Props {
  required: PlanTier;
  feature: string;
  children?: React.ReactNode;
}

export function UpgradePrompt({ required, feature }: Props) {
  const { isTrialing, trialDaysLeft } = useSubscription();
  const planLabel = required === "pro" ? "Pro" : "Business";
  return (
    <Card className="max-w-lg mx-auto my-8">
      <CardContent className="pt-8 text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Fonctionnalité {planLabel}</h2>
        <p className="text-muted-foreground">
          {feature} est disponible avec le plan {planLabel}.
        </p>
        {isTrialing && (
          <p className="text-sm text-primary font-medium">
            Votre essai expire dans {trialDaysLeft} jour{trialDaysLeft > 1 ? "s" : ""}.
          </p>
        )}
        <Button asChild>
          <Link to="/pricing">
            <Sparkles className="h-4 w-4 mr-2" />
            Voir les plans
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

interface GateProps {
  required: PlanTier;
  feature: string;
  children: React.ReactNode;
}

export function FeatureGate({ required, feature, children }: GateProps) {
  const { hasTier, loading } = useSubscription();
  if (loading) return null;
  if (!hasTier(required)) return <UpgradePrompt required={required} feature={feature} />;
  return <>{children}</>;
}