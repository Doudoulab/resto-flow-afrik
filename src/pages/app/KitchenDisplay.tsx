import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Flame, Check, AlertTriangle, ChefHat } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Station { id: string; name: string; color: string; }
interface KitchenItem {
  id: string;
  order_id: string;
  name_snapshot: string;
  quantity: number;
  station_id: string | null;
  course_number: number;
  fired_at: string | null;
  status: string;
  special_request: string | null;
  is_allergy_alert: boolean;
  created_at: string;
  order: { order_number: number; table_number: string | null };
}

const KitchenDisplay = () => {
  const { restaurant } = useAuth();
  const [stations, setStations] = useState<Station[]>([]);
  const [items, setItems] = useState<KitchenItem[]>([]);
  const [activeStation, setActiveStation] = useState<string | "all">("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!restaurant) return;
    const [stRes, itRes] = await Promise.all([
      supabase.from("kitchen_stations").select("*").eq("restaurant_id", restaurant.id).eq("is_active", true).order("sort_order"),
      supabase.from("order_items")
        .select("*, order:orders!inner(order_number, table_number, status, restaurant_id)")
        .eq("order.restaurant_id", restaurant.id)
        .neq("status", "cancelled")
        .not("fired_at", "is", null)
        .order("fired_at", { ascending: true }),
    ]);
    setStations((stRes.data ?? []) as Station[]);
    const filtered = (itRes.data ?? []).filter((i: KitchenItem) =>
      i.order && (i.order as { status?: string }).status !== "paid" && (i.order as { status?: string }).status !== "cancelled"
    );
    setItems(filtered as KitchenItem[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [restaurant]);

  useEffect(() => {
    if (!restaurant) return;
    const ch = supabase.channel(`kds-${restaurant.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurant.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [restaurant]);

  const markReady = async (id: string) => {
    const { error } = await supabase.from("order_items").update({ status: "ready" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Plat prêt");
    load();
  };

  const filtered = activeStation === "all" ? items : items.filter((i) => i.station_id === activeStation);
  const grouped = filtered.reduce<Record<string, KitchenItem[]>>((acc, it) => {
    const key = `${it.order_id}::${it.course_number}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(it);
    return acc;
  }, {});

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><ChefHat className="h-7 w-7" /> Écran cuisine</h1>
          <p className="mt-1 text-muted-foreground">Tickets envoyés en cuisine, par poste et par cours.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={activeStation === "all" ? "default" : "outline"} onClick={() => setActiveStation("all")}>
          Tous ({items.length})
        </Button>
        {stations.map((s) => {
          const count = items.filter((i) => i.station_id === s.id).length;
          return (
            <Button key={s.id} size="sm" variant={activeStation === s.id ? "default" : "outline"}
              onClick={() => setActiveStation(s.id)}
              style={activeStation === s.id ? { backgroundColor: s.color, borderColor: s.color } : { borderColor: s.color }}>
              {s.name} ({count})
            </Button>
          );
        })}
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Aucun plat à préparer pour le moment.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Object.entries(grouped).map(([key, lines]) => {
            const head = lines[0];
            const elapsed = head.fired_at ? Math.floor((Date.now() - new Date(head.fired_at).getTime()) / 60000) : 0;
            const urgent = elapsed >= 15;
            return (
              <Card key={key} className={cn("shadow-sm", urgent && "border-destructive")}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold">#{head.order.order_number}</span>
                    {head.order.table_number && <span className="text-muted-foreground">Table {head.order.table_number}</span>}
                    <Badge variant={urgent ? "destructive" : "secondary"}>Cours {head.course_number} • {elapsed} min</Badge>
                  </div>
                  <div className="space-y-1.5">
                    {lines.map((l) => (
                      <div key={l.id} className={cn(
                        "rounded-md border p-2",
                        l.status === "ready" ? "bg-success/10 border-success/30" : "bg-muted/40",
                        l.is_allergy_alert && "border-destructive bg-destructive/10",
                      )}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-semibold">{l.quantity}× {l.name_snapshot}</p>
                            {l.special_request && <p className="text-xs italic text-muted-foreground">{l.special_request}</p>}
                            {l.is_allergy_alert && (
                              <p className="text-xs font-bold text-destructive flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> ALLERGIE
                              </p>
                            )}
                          </div>
                          {l.status !== "ready" && (
                            <Button size="sm" variant="outline" onClick={() => markReady(l.id)}>
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default KitchenDisplay;