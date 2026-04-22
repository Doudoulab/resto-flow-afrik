import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSubscription } from "@/hooks/useSubscription";

export default function CheckoutSuccess() {
  const { subscription, isActive, tier, refetch } = useSubscription();
  const [waited, setWaited] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (isActive) return;
    const interval = setInterval(() => {
      setWaited((w) => w + 1);
      refetch();
    }, 2000);
    return () => clearInterval(interval);
  }, [isActive, refetch]);

  useEffect(() => {
    if (isActive) {
      const t = setTimeout(() => navigate("/app?welcome=1"), 1500);
      return () => clearTimeout(t);
    }
  }, [isActive, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 text-center space-y-4">
          {isActive ? (
            <>
              <CheckCircle2 className="h-16 w-16 mx-auto text-primary" />
              <h1 className="text-2xl font-bold">Bienvenue dans {tier === "pro" ? "Pro" : "Business"} !</h1>
              <p className="text-muted-foreground">
                Votre plan est actif. On vous amène au tableau de bord…
              </p>
            </>
          ) : (
            <>
              <Loader2 className="h-16 w-16 mx-auto animate-spin text-primary" />
              <h1 className="text-2xl font-bold">Activation en cours…</h1>
              <p className="text-muted-foreground">
                Paiement reçu. On finalise votre abonnement (quelques secondes).
              </p>
              {waited > 10 && (
                <Button asChild variant="outline">
                  <Link to="/app">Aller au tableau de bord</Link>
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}