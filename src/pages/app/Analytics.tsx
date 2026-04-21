import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, TrendingUp, Users, Wine, PieChart } from "lucide-react";
import { formatFCFA } from "@/lib/currency";
import {
  fetchServerPerformance, fetchCategoryMargins, fetchTopWines,
  type ServerPerformance, type CategoryMargin, type TopWine,
} from "@/lib/analytics/advanced";

const RANGES = [
  { v: "7", label: "7 j" },
  { v: "30", label: "30 j" },
  { v: "90", label: "90 j" },
  { v: "365", label: "12 mois" },
];

const Analytics = () => {
  const { restaurant } = useAuth();
  const [days, setDays] = useState("30");
  const [loading, setLoading] = useState(true);
  const [servers, setServers] = useState<ServerPerformance[]>([]);
  const [cats, setCats] = useState<CategoryMargin[]>([]);
  const [wines, setWines] = useState<TopWine[]>([]);

  useEffect(() => {
    if (!restaurant) return;
    setLoading(true);
    const to = new Date().toISOString();
    const from = new Date(Date.now() - parseInt(days, 10) * 24 * 60 * 60 * 1000).toISOString();
    Promise.all([
      fetchServerPerformance(restaurant.id, from, to),
      fetchCategoryMargins(restaurant.id, from, to),
      fetchTopWines(restaurant.id, from, to),
    ]).then(([s, c, w]) => { setServers(s); setCats(c); setWines(w); })
      .finally(() => setLoading(false));
  }, [restaurant?.id, days]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-7 w-7 text-primary" /> Analytics avancés
          </h1>
          <p className="text-sm text-muted-foreground">Pilotage gastronomique : marges, équipe, cave.</p>
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <Button key={r.v} size="sm" variant={days === r.v ? "default" : "outline"} onClick={() => setDays(r.v)}>{r.label}</Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <Tabs defaultValue="categories">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="categories"><PieChart className="mr-1 h-4 w-4" />Marges catégories</TabsTrigger>
            <TabsTrigger value="servers"><Users className="mr-1 h-4 w-4" />Performance équipe</TabsTrigger>
            <TabsTrigger value="wines"><Wine className="mr-1 h-4 w-4" />Cave & rotation</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-2 pt-4">
            {cats.length === 0 ? <Card><CardContent className="py-8 text-center text-muted-foreground">Aucune donnée.</CardContent></Card> :
              cats.map((c) => (
                <Card key={c.category}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{c.category}</span>
                      <Badge variant={c.margin_pct >= 60 ? "default" : c.margin_pct >= 40 ? "secondary" : "destructive"}>
                        Marge {c.margin_pct.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div><p className="text-xs text-muted-foreground">CA</p><p className="font-medium">{formatFCFA(c.revenue)}</p></div>
                      <div><p className="text-xs text-muted-foreground">Coût matière</p><p className="font-medium">{formatFCFA(c.food_cost)}</p></div>
                      <div><p className="text-xs text-muted-foreground">Marge brute</p><p className="font-bold text-primary">{formatFCFA(c.margin)}</p></div>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-success transition-all" style={{ width: `${Math.min(100, c.margin_pct)}%` }} />
                    </div>
                  </CardContent>
                </Card>
              ))}
          </TabsContent>

          <TabsContent value="servers" className="space-y-2 pt-4">
            {servers.length === 0 ? <Card><CardContent className="py-8 text-center text-muted-foreground">Aucune donnée.</CardContent></Card> :
              servers.map((s, i) => (
                <Card key={s.user_id}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">#{i + 1}</div>
                    <div className="flex-1">
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.orders_count} additions · ticket moyen {formatFCFA(s.avg_ticket)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary text-lg">{formatFCFA(s.revenue)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </TabsContent>

          <TabsContent value="wines" className="space-y-2 pt-4">
            {wines.length === 0 ? <Card><CardContent className="py-8 text-center text-muted-foreground">Aucune sortie de cave.</CardContent></Card> :
              wines.map((w) => (
                <Card key={w.wine_id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-semibold">{w.name} {w.vintage && <span className="text-muted-foreground">{w.vintage}</span>}</p>
                        <p className="text-xs text-muted-foreground">
                          {w.units_sold} bouteilles vendues · stock actuel : {w.current_stock}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{formatFCFA(w.revenue)}</p>
                        {w.rotation_days !== null && (
                          <Badge variant={w.rotation_days < 30 ? "default" : w.rotation_days < 90 ? "secondary" : "outline"} className="text-[10px]">
                            Rotation ~{w.rotation_days} j
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Analytics;