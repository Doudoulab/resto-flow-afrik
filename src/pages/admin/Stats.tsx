import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Stats() {
  const { data: subs } = useQuery({
    queryKey: ["admin-stats-subs"],
    queryFn: async () => (await supabase.from("subscriptions").select("status, environment, product_id, created_at")).data || [],
  });
  const { data: orders } = useQuery({
    queryKey: ["admin-stats-orders"],
    queryFn: async () => (await supabase.from("orders").select("created_at, total, restaurant_id").gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString())).data || [],
  });

  const planBreakdown = (subs || []).reduce((acc: Record<string, number>, s: any) => {
    if (s.status === "active" || s.status === "trialing") acc[s.product_id] = (acc[s.product_id] || 0) + 1;
    return acc;
  }, {});

  const totalRevenue = (orders || []).reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
  const uniqueRestos = new Set((orders || []).map((o: any) => o.restaurant_id)).size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Statistiques détaillées</h1>
        <p className="text-muted-foreground mt-1">Métriques globales de la plateforme</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Répartition des plans actifs</CardTitle></CardHeader>
          <CardContent>
            {!subs ? <Skeleton className="h-20" /> : (
              <div className="space-y-2">
                {Object.entries(planBreakdown).length === 0 && <p className="text-muted-foreground text-sm">Aucun abonnement actif</p>}
                {Object.entries(planBreakdown).map(([plan, count]) => (
                  <div key={plan} className="flex justify-between items-center">
                    <span className="font-medium">{plan}</span>
                    <span className="text-2xl font-bold">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Activité 30 derniers jours</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!orders ? <Skeleton className="h-20" /> : (
              <>
                <div className="flex justify-between"><span>Commandes totales</span><span className="font-bold">{orders.length}</span></div>
                <div className="flex justify-between"><span>Restos actifs</span><span className="font-bold">{uniqueRestos}</span></div>
                <div className="flex justify-between"><span>CA cumulé (FCFA)</span><span className="font-bold">{totalRevenue.toLocaleString("fr-FR")}</span></div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}