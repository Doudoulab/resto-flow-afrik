import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Sparkles, Clock, AlertCircle, Receipt, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface SubInvoice {
  id: string;
  event_type: string;
  plan_key: string | null;
  cycle: string | null;
  amount: number;
  currency: string;
  status: string;
  invoice_url: string | null;
  occurred_at: string;
  external_id: string | null;
}

export default function Billing() {
  const { subscription, tier, isActive, loading, isTrialing, trialDaysLeft, refetch } = useSubscription();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<SubInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("subscription_invoices")
        .select("id, event_type, plan_key, cycle, amount, currency, status, invoice_url, occurred_at, external_id")
        .eq("user_id", user.id)
        .order("occurred_at", { ascending: false })
        .limit(50);
      setInvoices((data as SubInvoice[]) ?? []);
      setInvoicesLoading(false);
    })();
  }, [user]);

  async function handleSubscriptionAction(action: "cancel" | "reactivate") {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("subscription-cancel", { body: { action } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).message || (data as any).error);
      toast.success(action === "cancel" ? "Abonnement annulé. Accès maintenu jusqu'à la fin de la période." : "Abonnement réactivé.");
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur inattendue");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const planLabel = tier === "business" ? "Business" : tier === "pro" ? "Pro" : "Gratuit";
  const isExpired = !isActive && subscription;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">Facturation & abonnement</h1>
        <p className="text-muted-foreground mt-1">Gérez votre plan et vos paiements (Mobile Money & Carte).</p>
      </div>

      {isTrialing && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="pt-6 flex items-start gap-3">
            <Clock className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-primary">
                Essai Pro — {trialDaysLeft} jour{trialDaysLeft > 1 ? "s" : ""} restant{trialDaysLeft > 1 ? "s" : ""}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Toutes les fonctionnalités Pro sont débloquées. À la fin de l'essai, votre compte passera en lecture seule jusqu'à souscription.
              </p>
            </div>
            <Button asChild size="sm">
              <Link to="/pricing"><Sparkles className="h-4 w-4 mr-1" />Choisir un plan</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {isExpired && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-destructive">Abonnement expiré</p>
              <p className="text-sm text-muted-foreground mt-1">
                Vos données sont conservées. Réactivez un plan pour reprendre l'usage complet.
              </p>
            </div>
            <Button asChild size="sm" variant="destructive">
              <Link to="/pricing">Réactiver</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Plan {planLabel}</CardTitle>
              <CardDescription>
                {isTrialing ? "Essai Pro en cours" : isActive ? "Votre abonnement est actif" : "Aucun abonnement actif"}
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
                {isTrialing
                  ? "Fin de l'essai : "
                  : subscription.cancel_at_period_end ? "Accès jusqu'au : " : "Prochain renouvellement : "}
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
              Votre abonnement est annulé. Vous gardez l'accès jusqu'à la fin de la période, puis vous repasserez automatiquement en Gratuit.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm pt-2">
            <div className="rounded-md border border-border p-3">
              <p className="text-muted-foreground text-xs">Restaurants autorisés</p>
              <p className="font-semibold mt-1">
                {tier === "business" ? "Illimités" : tier === "pro" ? "1 restaurant" : "1 restaurant"}
              </p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-muted-foreground text-xs">Modules débloqués</p>
              <p className="font-semibold mt-1">
                {tier === "business" ? "Tous (Pro + Business)" : tier === "pro" ? "Pack Pro" : "Lecture seule"}
              </p>
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
            Paiements gérés par <strong>Chariow</strong> (Wave, Orange Money, MTN MoMo, Moov, Carte bancaire). Pour annuler ou modifier votre abonnement, contactez le support.
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" asChild>
              <Link to="/pricing">{isTrialing ? "Souscrire maintenant" : isActive ? "Changer de plan" : "Voir les plans"}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Historique des paiements</CardTitle>
              <CardDescription>Vos paiements d'abonnement Chariow</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Aucun paiement enregistré pour le moment.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">
                      {inv.plan_key === "business_plan" ? "Business" : inv.plan_key === "pro_plan" ? "Pro" : "Abonnement"}
                      {inv.cycle && <span className="text-muted-foreground"> · {inv.cycle === "yearly" ? "Annuel" : "Mensuel"}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(inv.occurred_at).toLocaleDateString("fr-FR", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                      {inv.external_id && <span> · Réf {inv.external_id.slice(0, 12)}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-semibold text-sm">
                      {inv.amount.toLocaleString("fr-FR")} {inv.currency}
                    </span>
                    <Badge variant={inv.status === "paid" ? "default" : "secondary"} className="text-xs">
                      {inv.status === "paid" ? "Payé" : inv.status}
                    </Badge>
                    {inv.invoice_url && (
                      <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                        <a href={inv.invoice_url} target="_blank" rel="noopener noreferrer" aria-label="Voir le reçu">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}