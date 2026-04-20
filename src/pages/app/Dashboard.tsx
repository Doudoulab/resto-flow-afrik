import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFCFA } from "@/lib/currency";
import { ClipboardList, TrendingUp, Package, UtensilsCrossed, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

interface Stats {
  todayRevenue: number;
  todayOrders: number;
  pendingOrders: number;
  menuCount: number;
  lowStock: number;
  topItems: { name: string; count: number }[];
  weekRevenue: { day: string; revenue: number }[];
}

const Dashboard = () => {
  const { restaurant, profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurant) return;
    const load = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - 6);
      const weekStartIso = weekStart.toISOString();

      const [ordersRes, menuRes, stockRes, topRes, weekRes] = await Promise.all([
        supabase
          .from("orders")
          .select("total, status, created_at")
          .eq("restaurant_id", restaurant.id)
          .gte("created_at", todayIso),
        supabase
          .from("menu_items")
          .select("id", { count: "exact", head: true })
          .eq("restaurant_id", restaurant.id),
        supabase
          .from("stock_items")
          .select("quantity, alert_threshold")
          .eq("restaurant_id", restaurant.id),
        supabase
          .from("order_items")
          .select("name_snapshot, quantity, orders!inner(restaurant_id, created_at)")
          .eq("orders.restaurant_id", restaurant.id)
          .gte("orders.created_at", todayIso),
        supabase
          .from("orders")
          .select("total, status, created_at")
          .eq("restaurant_id", restaurant.id)
          .gte("created_at", weekStartIso)
          .neq("status", "cancelled"),
      ]);

      const todayOrders = ordersRes.data?.length ?? 0;
      const todayRevenue = (ordersRes.data ?? [])
        .filter((o) => o.status !== "cancelled")
        .reduce((sum, o) => sum + Number(o.total), 0);
      const pendingOrders = (ordersRes.data ?? []).filter((o) =>
        ["pending", "preparing", "ready"].includes(o.status)
      ).length;

      const lowStock = (stockRes.data ?? []).filter(
        (s) => Number(s.quantity) <= Number(s.alert_threshold)
      ).length;

      const tally: Record<string, number> = {};
      (topRes.data ?? []).forEach((it: any) => {
        tally[it.name_snapshot] = (tally[it.name_snapshot] ?? 0) + it.quantity;
      });
      const topItems = Object.entries(tally)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      const dayLabels = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
      const buckets: { day: string; revenue: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        buckets.push({ day: dayLabels[d.getDay()], revenue: 0 });
      }
      (weekRes.data ?? []).forEach((o: any) => {
        const d = new Date(o.created_at);
        d.setHours(0, 0, 0, 0);
        const diff = Math.round((d.getTime() - weekStart.getTime()) / 86400000);
        if (diff >= 0 && diff < 7) buckets[diff].revenue += Number(o.total);
      });

      setStats({
        todayRevenue,
        todayOrders,
        pendingOrders,
        menuCount: menuRes.count ?? 0,
        lowStock,
        topItems,
        weekRevenue: buckets,
      });
      setLoading(false);
    };
    load();
  }, [restaurant]);

  if (loading || !stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const cards = [
    { title: "Chiffre d'affaires (jour)", value: formatFCFA(stats.todayRevenue), icon: TrendingUp, color: "text-success" },
    { title: "Commandes du jour", value: stats.todayOrders.toString(), icon: ClipboardList, color: "text-primary" },
    { title: "En cours", value: stats.pendingOrders.toString(), icon: ClipboardList, color: "text-warning" },
    { title: "Plats au menu", value: stats.menuCount.toString(), icon: UtensilsCrossed, color: "text-foreground" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bonjour {profile?.first_name} 👋</h1>
        <p className="mt-1 text-muted-foreground">
          Voici un aperçu de l'activité de {restaurant?.name} aujourd'hui.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.title} className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{c.title}</p>
                  <p className={`mt-2 text-2xl font-bold ${c.color}`}>{c.value}</p>
                </div>
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Plats les plus commandés aujourd'hui</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aucune commande aujourd'hui pour le moment.
              </p>
            ) : (
              <ul className="space-y-3">
                {stats.topItems.map((item, idx) => (
                  <li key={item.name} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                      {idx + 1}
                    </span>
                    <span className="flex-1 font-medium">{item.name}</span>
                    <span className="text-sm text-muted-foreground">×{item.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Alertes stock</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.lowStock === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Package className="mb-2 h-8 w-8 text-success" />
                <p className="text-sm text-muted-foreground">Tout va bien côté stock !</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-3xl font-bold text-destructive">{stats.lowStock}</p>
                <p className="mt-1 mb-4 text-sm text-muted-foreground">
                  article{stats.lowStock > 1 ? "s" : ""} sous le seuil
                </p>
                <Link to="/app/stock">
                  <Button variant="outline" size="sm" className="w-full">
                    Voir le stock
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
