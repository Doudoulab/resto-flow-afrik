import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Database, Wifi, WifiOff, AlertTriangle, CheckCircle2 } from "lucide-react";

type Check = { name: string; status: "ok" | "warn" | "error"; detail: string };

export default function Health() {
  const { restaurant } = useAuth();
  const [checks, setChecks] = useState<Check[]>([]);
  const [latency, setLatency] = useState<number | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!restaurant) return;
    (async () => {
      const out: Check[] = [];
      // DB latency
      const t0 = performance.now();
      const { error: pingErr } = await supabase.from("restaurants").select("id").eq("id", restaurant.id).maybeSingle();
      const dt = Math.round(performance.now() - t0);
      setLatency(dt);
      out.push({ name: "Base de données", status: pingErr ? "error" : dt < 500 ? "ok" : "warn", detail: pingErr ? pingErr.message : `${dt} ms` });
      // Connectivity
      out.push({ name: "Connexion réseau", status: navigator.onLine ? "ok" : "error", detail: navigator.onLine ? "En ligne" : "Hors ligne" });
      // Recent backup
      const { data: lastBackup } = await supabase.from("backup_jobs").select("created_at,status").eq("restaurant_id", restaurant.id).eq("status", "completed").order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (lastBackup) {
        const ageDays = (Date.now() - new Date(lastBackup.created_at).getTime()) / 86400000;
        out.push({ name: "Dernière sauvegarde", status: ageDays < 7 ? "ok" : ageDays < 30 ? "warn" : "error", detail: `Il y a ${Math.floor(ageDays)} j` });
      } else {
        out.push({ name: "Dernière sauvegarde", status: "warn", detail: "Aucune sauvegarde" });
      }
      // Pending orders count
      const { count: pendingOrders } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurant.id).in("status", ["pending", "preparing", "ready"]);
      out.push({ name: "Commandes ouvertes", status: "ok", detail: `${pendingOrders ?? 0}` });
      // Stock alerts
      const { data: stocks } = await supabase.from("stock_items").select("quantity,alert_threshold").eq("restaurant_id", restaurant.id);
      const alerts = (stocks || []).filter((s) => s.quantity <= s.alert_threshold).length;
      out.push({ name: "Alertes stock", status: alerts > 0 ? "warn" : "ok", detail: `${alerts} article${alerts > 1 ? "s" : ""}` });

      // Counts
      const tableNames = ["orders", "invoices", "menu_items", "customers"];
      const c: Record<string, number> = {};
      for (const t of tableNames) {
        const { count } = await (supabase as any).from(t).select("id", { count: "exact", head: true }).eq("restaurant_id", restaurant.id);
        c[t] = count ?? 0;
      }
      setCounts(c);
      setChecks(out);
    })();
  }, [restaurant?.id]);

  const StatusIcon = ({ s }: { s: Check["status"] }) =>
    s === "ok" ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> :
    s === "warn" ? <AlertTriangle className="h-5 w-5 text-amber-500" /> :
    <AlertTriangle className="h-5 w-5 text-destructive" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Activity className="h-7 w-7" /> État du système</h1>
        <p className="text-muted-foreground">Vue temps réel de la santé de votre installation.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {checks.map((c) => (
          <Card key={c.name}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <StatusIcon s={c.status} />
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-muted-foreground">{c.detail}</p>
                </div>
              </div>
              <Badge variant={c.status === "ok" ? "default" : c.status === "warn" ? "secondary" : "destructive"}>{c.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" /> Volumétrie</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(counts).map(([k, v]) => (
              <div key={k} className="rounded-lg border p-4">
                <p className="text-2xl font-bold">{v}</p>
                <p className="text-sm text-muted-foreground capitalize">{k}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}