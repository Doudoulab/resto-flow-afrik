import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatFCFA } from "@/lib/currency";
import { Loader2, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { startOfDay, startOfWeek, startOfMonth, parseISO, getHours, format } from "date-fns";
import { Button } from "@/components/ui/button";

type Period = "day" | "week" | "month";

interface OrderItem { quantity: number; unit_price: number; menu_item_id: string | null; name_snapshot: string; created_at: string; order_id: string; }
interface MenuItem { id: string; name: string; price: number; }
interface Recipe { menu_item_id: string; stock_item_id: string; quantity: number; }
interface StockItem { id: string; cost_per_unit: number; }
interface Order { id: string; created_at: string; status: string; }

const Reports = () => {
  const { restaurant } = useAuth();
  const [period, setPeriod] = useState<Period>("day");
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);

  useEffect(() => {
    if (!restaurant) return;
    (async () => {
      const [o, oi, m, r, s] = await Promise.all([
        supabase.from("orders").select("id,created_at,status").eq("restaurant_id", restaurant.id).eq("status", "paid"),
        supabase.from("order_items").select("quantity,unit_price,menu_item_id,name_snapshot,created_at,order_id"),
        supabase.from("menu_items").select("id,name,price").eq("restaurant_id", restaurant.id),
        supabase.from("menu_item_recipes").select("menu_item_id,stock_item_id,quantity").eq("restaurant_id", restaurant.id),
        supabase.from("stock_items").select("id,cost_per_unit").eq("restaurant_id", restaurant.id),
      ]);
      setOrders((o.data ?? []) as Order[]);
      setItems((oi.data ?? []) as OrderItem[]);
      setMenu((m.data ?? []) as MenuItem[]);
      setRecipes((r.data ?? []) as Recipe[]);
      setStock((s.data ?? []) as StockItem[]);
      setLoading(false);
    })();
  }, [restaurant]);

  const periodStart = useMemo(() => {
    const now = new Date();
    if (period === "day") return startOfDay(now);
    if (period === "week") return startOfWeek(now, { weekStartsOn: 1 });
    return startOfMonth(now);
  }, [period]);

  const paidOrderIds = new Set(orders.filter((o) => parseISO(o.created_at) >= periodStart).map((o) => o.id));
  const periodItems = items.filter((i) => paidOrderIds.has(i.order_id));

  // Food cost par menu_item
  const costByMenu = useMemo(() => {
    const map = new Map<string, number>();
    recipes.forEach((r) => {
      const stockCost = stock.find((s) => s.id === r.stock_item_id)?.cost_per_unit ?? 0;
      map.set(r.menu_item_id, (map.get(r.menu_item_id) ?? 0) + Number(r.quantity) * Number(stockCost));
    });
    return map;
  }, [recipes, stock]);

  const dishStats = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number; cost: number }>();
    periodItems.forEach((i) => {
      const key = i.menu_item_id ?? i.name_snapshot;
      const e = map.get(key) ?? { name: i.name_snapshot, qty: 0, revenue: 0, cost: 0 };
      const cost = i.menu_item_id ? (costByMenu.get(i.menu_item_id) ?? 0) : 0;
      e.qty += Number(i.quantity);
      e.revenue += Number(i.quantity) * Number(i.unit_price);
      e.cost += Number(i.quantity) * cost;
      map.set(key, e);
    });
    return Array.from(map.values()).map((d) => ({
      ...d, margin: d.revenue - d.cost,
      marginPct: d.revenue > 0 ? ((d.revenue - d.cost) / d.revenue) * 100 : 0,
    }));
  }, [periodItems, costByMenu]);

  const top = [...dishStats].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  const flop = [...dishStats].sort((a, b) => a.qty - b.qty).slice(0, 10);
  const totalRevenue = dishStats.reduce((s, d) => s + d.revenue, 0);
  const totalCost = dishStats.reduce((s, d) => s + d.cost, 0);
  const totalMargin = totalRevenue - totalCost;
  const foodCostPct = totalRevenue > 0 ? (totalCost / totalRevenue) * 100 : 0;

  // Heures de pointe
  const hourly = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, orders: 0, revenue: 0 }));
    orders.filter((o) => parseISO(o.created_at) >= periodStart).forEach((o) => {
      const h = getHours(parseISO(o.created_at));
      const itemsRev = items.filter((i) => i.order_id === o.id).reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
      buckets[h].orders += 1;
      buckets[h].revenue += itemsRev;
    });
    return buckets;
  }, [orders, items, periodStart]);

  const maxHourRev = Math.max(1, ...hourly.map((h) => h.revenue));

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Rapports rentabilité</h1>
        <p className="mt-1 text-muted-foreground">Marges, plats stars, créneaux les plus rentables.</p>
      </div>

      <div className="flex gap-2">
        {(["day", "week", "month"] as Period[]).map((p) => (
          <Button key={p} variant={period === p ? "default" : "outline"} size="sm" onClick={() => setPeriod(p)}>
            {p === "day" ? "Aujourd'hui" : p === "week" ? "Semaine" : "Mois"}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">CA</p><p className="text-2xl font-bold">{formatFCFA(totalRevenue)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Coût matières</p><p className="text-2xl font-bold">{formatFCFA(totalCost)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Marge brute</p><p className={`text-2xl font-bold ${totalMargin < 0 ? "text-destructive" : "text-success"}`}>{formatFCFA(totalMargin)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Food cost %</p><p className={`text-2xl font-bold ${foodCostPct > 35 ? "text-warning" : ""}`}>{foodCostPct.toFixed(1)}%</p></CardContent></Card>
      </div>

      <Tabs defaultValue="top">
        <TabsList>
          <TabsTrigger value="top"><TrendingUp className="h-4 w-4 mr-2" />Top plats</TabsTrigger>
          <TabsTrigger value="flop"><TrendingDown className="h-4 w-4 mr-2" />Flop plats</TabsTrigger>
          <TabsTrigger value="hours"><Clock className="h-4 w-4 mr-2" />Heures de pointe</TabsTrigger>
        </TabsList>
        <TabsContent value="top">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Plat</TableHead><TableHead>Qté</TableHead><TableHead>CA</TableHead><TableHead>Coût</TableHead><TableHead>Marge</TableHead><TableHead>%</TableHead></TableRow></TableHeader>
              <TableBody>
                {top.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucune donnée.</TableCell></TableRow>}
                {top.map((d, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{d.qty}</TableCell>
                    <TableCell>{formatFCFA(d.revenue)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatFCFA(d.cost)}</TableCell>
                    <TableCell className={d.margin < 0 ? "text-destructive" : "text-success"}>{formatFCFA(d.margin)}</TableCell>
                    <TableCell>{d.marginPct.toFixed(0)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="flop">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Plat</TableHead><TableHead>Qté vendue</TableHead><TableHead>CA</TableHead><TableHead>Marge %</TableHead></TableRow></TableHeader>
              <TableBody>
                {flop.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Aucune donnée.</TableCell></TableRow>}
                {flop.map((d, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{d.qty}</TableCell>
                    <TableCell>{formatFCFA(d.revenue)}</TableCell>
                    <TableCell>{d.marginPct.toFixed(0)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="hours">
          <Card><CardContent className="p-4 space-y-2">
            {hourly.filter((h) => h.orders > 0).length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Aucune commande sur la période.</p>
            ) : hourly.filter((h) => h.orders > 0).map((h) => (
              <div key={h.hour} className="flex items-center gap-3">
                <span className="w-12 text-sm font-mono">{h.hour.toString().padStart(2, "0")}h</span>
                <div className="flex-1 bg-muted rounded h-6 relative overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${(h.revenue / maxHourRev) * 100}%` }} />
                  <span className="absolute inset-0 flex items-center px-2 text-xs font-medium">
                    {h.orders} cmd · {formatFCFA(h.revenue)}
                  </span>
                </div>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
