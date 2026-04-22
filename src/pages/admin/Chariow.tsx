import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Wallet, Webhook } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string;
  plan_key: string;
  cycle: string;
  chariow_product_id: string;
  chariow_price_id: string | null;
  amount: number;
  currency: string;
  is_active: boolean;
};

export default function AdminChariow() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [bootstrapping, setBootstrapping] = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("chariow_products")
      .select("*")
      .order("plan_key").order("cycle");
    if (error) toast.error(error.message);
    setRows((data as Row[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchRows(); }, []);

  const runBootstrap = async () => {
    setBootstrapping(true);
    try {
      const { data, error } = await supabase.functions.invoke("chariow-bootstrap");
      if (error) {
        const ctx: any = (error as any).context;
        let detail = error.message;
        try {
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            detail = body?.error || JSON.stringify(body);
          }
        } catch { /* ignore */ }
        throw new Error(detail);
      }
      if (data?.ok === false) throw new Error(data.error || "Erreur inconnue");
      console.log("[chariow-bootstrap]", data);
      toast.success("Bootstrap terminé");
      await fetchRows();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Erreur: " + msg);
    } finally {
      setBootstrapping(false);
    }
  };

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chariow-webhook`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6" /> Paiements Chariow
          </h1>
          <p className="text-muted-foreground mt-1">Gestion des produits d'abonnement et du webhook Chariow.</p>
        </div>
        <Button onClick={fetchRows} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" /> Rafraîchir
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Webhook className="h-5 w-5" /> Webhook (Pulse) à configurer dans Chariow</CardTitle>
          <CardDescription>Copie cette URL dans ton dashboard Chariow → Pulses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <code className="block rounded-md bg-muted p-3 text-sm break-all">{webhookUrl}</code>
          <p className="text-sm text-muted-foreground">
            Événements à activer : <code>sale.completed</code>, <code>license.created</code>, <code>license.renewed</code>, <code>license.cancelled</code>, <code>license.expired</code>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Produits d'abonnement</CardTitle>
              <CardDescription>4 plans attendus : Pro/Business × Mensuel/Annuel</CardDescription>
            </div>
            <Button onClick={runBootstrap} disabled={bootstrapping}>
              {bootstrapping ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {rows.length === 0 ? "Créer les produits dans Chariow" : "Synchroniser à nouveau"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucun produit. Clique sur le bouton ci-dessus pour les créer dans Chariow.
            </p>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <p className="font-medium capitalize">
                      {r.plan_key.replace("_plan", "")} — {r.cycle === "monthly" ? "Mensuel" : "Annuel"}
                    </p>
                    <p className="text-xs text-muted-foreground">ID Chariow: <code>{r.chariow_product_id}</code></p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{Number(r.amount).toLocaleString("fr-FR")} {r.currency}</p>
                    <Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Actif" : "Inactif"}</Badge>
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