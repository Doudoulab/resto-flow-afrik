import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, CreditCard, ShoppingCart, AlertTriangle, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Overview() {
  const { data, isLoading } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_platform_stats");
      if (error) throw error;
      return data as Record<string, number | string>;
    },
  });

  const fmt = (n: any) => typeof n === "number" ? n.toLocaleString("fr-FR") : n;
  const stats = [
    { label: "Restaurants actifs", value: data?.active_restaurants, icon: Building2, color: "text-emerald-500" },
    { label: "Restaurants suspendus", value: data?.suspended_restaurants, icon: AlertTriangle, color: "text-amber-500" },
    { label: "Utilisateurs", value: data?.total_users, icon: Users, color: "text-blue-500" },
    { label: "Abonnements actifs", value: data?.active_subscriptions, icon: CreditCard, color: "text-violet-500" },
    { label: "Commandes (30j)", value: data?.orders_last_30d, icon: ShoppingCart, color: "text-cyan-500" },
    { label: "MRR estimé (USD)", value: data ? `$${fmt(data.mrr_estimate)}` : null, icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Vue d'ensemble</h1>
        <p className="text-muted-foreground mt-1">État global de la plateforme RestoFlow</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-3xl font-bold">{fmt(s.value) ?? "—"}</div>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}