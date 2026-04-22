import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Wallet, Webhook, Link as LinkIcon, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

type ChariowProduct = {
  id: string;
  name: string;
  slug: string;
  type: string;
  pricing_type: string;
  price_amount: number;
  price_formatted: string;
  currency: string;
};

const PLAN_OPTIONS: Array<{ value: string; label: string; plan_key: string; cycle: string }> = [
  { value: "pro_plan|monthly", label: "Pro — Mensuel", plan_key: "pro_plan", cycle: "monthly" },
  { value: "pro_plan|yearly",  label: "Pro — Annuel",  plan_key: "pro_plan", cycle: "yearly" },
  { value: "pro_plan|lifetime", label: "Pro — À vie", plan_key: "pro_plan", cycle: "lifetime" },
  { value: "business_plan|monthly", label: "Business — Mensuel", plan_key: "business_plan", cycle: "monthly" },
  { value: "business_plan|yearly",  label: "Business — Annuel",  plan_key: "business_plan", cycle: "yearly" },
  { value: "business_plan|lifetime", label: "Business — À vie", plan_key: "business_plan", cycle: "lifetime" },
  { value: "starter_plan|monthly", label: "Starter — Mensuel", plan_key: "starter_plan", cycle: "monthly" },
  { value: "starter_plan|yearly", label: "Starter — Annuel", plan_key: "starter_plan", cycle: "yearly" },
];

export default function AdminChariow() {
  const [rows, setRows] = useState<Row[]>([]);
  const [chariowProducts, setChariowProducts] = useState<ChariowProduct[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({}); // chariow product_id -> plan|cycle
  const [loading, setLoading] = useState(true);
  const [fetchingChariow, setFetchingChariow] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

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

  const fetchChariowProducts = async () => {
    setFetchingChariow(true);
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
      setChariowProducts((data?.products ?? []) as ChariowProduct[]);
      toast.success(`${data?.products?.length ?? 0} produit(s) Chariow récupéré(s)`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Erreur: " + msg);
    } finally {
      setFetchingChariow(false);
    }
  };

  const saveMapping = async (product: ChariowProduct) => {
    const sel = assignments[product.id];
    if (!sel) { toast.error("Choisis un plan"); return; }
    const opt = PLAN_OPTIONS.find((o) => o.value === sel);
    if (!opt) return;
    setSavingId(product.id);
    // Upsert by (plan_key, cycle): we treat (plan_key, cycle) as the unique mapping target
    const { error } = await supabase.from("chariow_products").upsert({
      plan_key: opt.plan_key,
      cycle: opt.cycle,
      chariow_product_id: product.id,
      chariow_price_id: null,
      amount: product.price_amount,
      currency: product.currency || "XOF",
      is_active: true,
    }, { onConflict: "plan_key,cycle" });
    setSavingId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Mappé");
    await fetchRows();
  };

  const removeMapping = async (id: string) => {
    const { error } = await supabase.from("chariow_products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Mapping supprimé");
    await fetchRows();
  };

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chariow-webhook`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6" /> Paiements Chariow
          </h1>
          <p className="text-muted-foreground mt-1">Mappez vos produits Chariow aux plans RestoFlow.</p>
        </div>
        <Button onClick={fetchRows} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" /> Rafraîchir
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Crée tes produits dans Chariow</CardTitle>
          <CardDescription>
            L'API Chariow ne permet pas la création de produits. Va dans ton dashboard Chariow et crée <strong>les 8 produits payants</strong> de type <code>license</code>, puis marque-les <strong>Published</strong> :
            <br /><br />
            • <strong>Starter</strong> — Mensuel (9 900 XOF), Annuel (95 000 XOF)<br />
            • <strong>Pro</strong> — Mensuel (25 000 XOF), Annuel (240 000 XOF), À vie (600 000 XOF)<br />
            • <strong>Business</strong> — Mensuel (52 000 XOF), Annuel (499 000 XOF), À vie (1 800 000 XOF — sur demande WhatsApp)
            <br /><br />
            <strong>⚠️ Ne crée PAS de produit gratuit dans Chariow</strong> — l'essai gratuit de 7 jours est géré directement par RestoFlow (pas de checkout, pas de CB).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" size="sm">
            <a href="https://app.chariow.com" target="_blank" rel="noopener noreferrer">
              <LinkIcon className="h-4 w-4 mr-2" /> Ouvrir le dashboard Chariow
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Webhook className="h-5 w-5" /> 2. Webhook (Pulse) à configurer dans Chariow</CardTitle>
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
              <CardTitle>3. Mapper les produits Chariow</CardTitle>
              <CardDescription>Récupère tes produits Chariow puis assigne chacun à un plan RestoFlow.</CardDescription>
            </div>
            <Button onClick={fetchChariowProducts} disabled={fetchingChariow}>
              {fetchingChariow ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Charger les produits Chariow
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {chariowProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Clique sur "Charger les produits Chariow" pour récupérer la liste depuis l'API.
            </p>
          ) : (
            <div className="space-y-2">
              {chariowProducts.map((p) => {
                const existing = rows.find((r) => r.chariow_product_id === p.id);
                return (
                  <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3">
                    <div className="flex-1 min-w-[200px]">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        <code>{p.id}</code> · {p.type} · {p.price_formatted || `${p.price_amount} ${p.currency}`}
                      </p>
                      {existing && (
                        <Badge variant="default" className="mt-1">
                          Mappé : {existing.plan_key.replace("_plan","")} {existing.cycle === "monthly" ? "Mensuel" : existing.cycle === "yearly" ? "Annuel" : "À vie"}
                        </Badge>
                      )}
                    </div>
                    <Select value={assignments[p.id] ?? ""} onValueChange={(v) => setAssignments((s) => ({ ...s, [p.id]: v }))}>
                      <SelectTrigger className="w-[200px]"><SelectValue placeholder="Choisir un plan" /></SelectTrigger>
                      <SelectContent>
                        {PLAN_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => saveMapping(p)} disabled={savingId === p.id}>
                      {savingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mapper"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {rows.length > 0 && (
            <div className="pt-4 border-t border-border">
              <p className="text-sm font-medium mb-2">Mappings actifs ({rows.length})</p>
              <div className="space-y-1">
                {rows.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm rounded-md bg-muted/50 px-3 py-2">
                    <span>
                      <strong className="capitalize">{r.plan_key.replace("_plan","")} {r.cycle === "monthly" ? "Mensuel" : r.cycle === "yearly" ? "Annuel" : "À vie"}</strong>
                      {" → "}<code className="text-xs">{r.chariow_product_id}</code>
                      {" · "}{Number(r.amount).toLocaleString("fr-FR")} {r.currency}
                    </span>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeMapping(r.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}