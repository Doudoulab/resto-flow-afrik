import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, BarChart3 } from "lucide-react";
import { formatFCFA } from "@/lib/currency";
import { fetchMenuEngineering, type MenuEngineeringRow, CLASS_META, type MenuClass } from "@/lib/analytics/menuEngineering";

const RANGES = [
  { v: "7", label: "7 j" },
  { v: "30", label: "30 j" },
  { v: "90", label: "90 j" },
  { v: "365", label: "12 mois" },
];

const MenuEngineering = () => {
  const { restaurant } = useAuth();
  const [days, setDays] = useState("90");
  const [rows, setRows] = useState<MenuEngineeringRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurant) return;
    setLoading(true);
    const to = new Date();
    const from = new Date(Date.now() - parseInt(days, 10) * 24 * 60 * 60 * 1000);
    fetchMenuEngineering({ restaurantId: restaurant.id, fromISO: from.toISOString(), toISO: to.toISOString() })
      .then(setRows)
      .finally(() => setLoading(false));
  }, [restaurant?.id, days]);

  const grouped = useMemo(() => {
    const m: Record<MenuClass, MenuEngineeringRow[]> = { star: [], plowhorse: [], puzzle: [], dog: [] };
    rows.forEach((r) => m[r.classification].push(r));
    return m;
  }, [rows]);

  const totals = useMemo(() => {
    const rev = rows.reduce((s, r) => s + r.revenue, 0);
    const cost = rows.reduce((s, r) => s + r.food_cost, 0);
    return { rev, cost, margin: rev - cost, marginPct: rev > 0 ? ((rev - cost) / rev) * 100 : 0 };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" /> Menu Engineering
          </h1>
          <p className="text-sm text-muted-foreground">Matrice popularité × marge — décidez quoi promouvoir, retravailler ou retirer.</p>
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <Button key={r.v} size="sm" variant={days === r.v ? "default" : "outline"} onClick={() => setDays(r.v)}>
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Aucune vente sur cette période. Essayez une plage plus large.
        </CardContent></Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">CA</p><p className="text-xl font-bold">{formatFCFA(totals.rev)}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Coût matière</p><p className="text-xl font-bold">{formatFCFA(totals.cost)}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Marge brute</p><p className="text-xl font-bold text-success">{formatFCFA(totals.margin)}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Marge %</p><p className="text-xl font-bold text-primary">{totals.marginPct.toFixed(1)}%</p></CardContent></Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {(["star", "plowhorse", "puzzle", "dog"] as MenuClass[]).map((cls) => {
              const meta = CLASS_META[cls];
              const list = grouped[cls];
              return (
                <Card key={cls} className={`border ${meta.color.split(" ").find((c) => c.startsWith("border-")) ?? ""}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <span className="text-2xl">{list[0]?.emoji ?? (cls === "star" ? "⭐" : cls === "plowhorse" ? "🐎" : cls === "puzzle" ? "🧩" : "🐕")}</span>
                          {meta.label}
                          <Badge variant="outline">{list.length}</Badge>
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">{meta.description}</p>
                      </div>
                    </div>
                    <p className="text-xs italic text-primary mt-1 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {meta.advice}</p>
                  </CardHeader>
                  <CardContent>
                    {list.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2 text-center">Aucun plat dans cette catégorie.</p>
                    ) : (
                      <div className="space-y-1 max-h-[280px] overflow-y-auto">
                        {list.map((r) => (
                          <div key={r.menu_item_id} className="flex items-center justify-between gap-2 rounded p-2 hover:bg-muted/50 text-sm">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{r.name}</p>
                              {r.category_name && <p className="text-xs text-muted-foreground">{r.category_name}</p>}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs text-muted-foreground">{r.units_sold} ventes</p>
                              <p className="font-bold text-primary">{formatFCFA(r.margin)}</p>
                              <p className="text-[10px] text-muted-foreground">marge {r.margin_pct.toFixed(0)}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default MenuEngineering;