import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Users, LayoutGrid, Move } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { FloorPlanEditor } from "@/components/floor/FloorPlanEditor";

type TableStatus = "available" | "occupied" | "needs_cleaning" | "reserved";

interface RestaurantTable {
  id: string;
  label: string;
  seats: number;
  status: TableStatus;
  sort_order: number;
}

const STATUS_LABEL: Record<TableStatus, string> = {
  available: "Libre",
  occupied: "Occupée",
  needs_cleaning: "À débarrasser",
  reserved: "Réservée",
};

const STATUS_NEXT: Record<TableStatus, TableStatus> = {
  available: "occupied",
  occupied: "needs_cleaning",
  needs_cleaning: "available",
  reserved: "occupied",
};

const STATUS_COLORS: Record<TableStatus, string> = {
  available:
    "border-primary/40 bg-primary/5 hover:bg-primary/10 text-foreground",
  occupied:
    "border-destructive/50 bg-destructive/10 hover:bg-destructive/20 text-foreground",
  needs_cleaning:
    "border-amber-500/60 bg-amber-500/10 hover:bg-amber-500/20 text-foreground",
  reserved:
    "border-secondary bg-secondary/40 hover:bg-secondary/60 text-secondary-foreground",
};

const Floor = () => {
  const { restaurant } = useAuth();
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "plan">("grid");

  const load = async () => {
    if (!restaurant) return;
    const { data } = await supabase
      .from("restaurant_tables")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true });
    setTables((data ?? []) as RestaurantTable[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [restaurant]);

  // Realtime
  useEffect(() => {
    if (!restaurant) return;
    const ch = supabase
      .channel(`tables-${restaurant.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "restaurant_tables", filter: `restaurant_id=eq.${restaurant.id}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [restaurant]);

  const cycleStatus = async (t: RestaurantTable) => {
    const next = STATUS_NEXT[t.status];
    const { error } = await supabase
      .from("restaurant_tables")
      .update({ status: next })
      .eq("id", t.id);
    if (error) { toast.error(error.message); return; }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const counts = tables.reduce(
    (acc, t) => { acc[t.status] = (acc[t.status] ?? 0) + 1; return acc; },
    {} as Record<TableStatus, number>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Salle</h1>
          <p className="mt-1 text-muted-foreground">Vue d'ensemble des tables — cliquez pour changer le statut.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={view === "grid" ? "default" : "outline"} onClick={() => setView("grid")}>
            <LayoutGrid className="mr-2 h-4 w-4" /> Grille
          </Button>
          <Button size="sm" variant={view === "plan" ? "default" : "outline"} onClick={() => setView("plan")}>
            <Move className="mr-2 h-4 w-4" /> Plan visuel
          </Button>
        </div>
      </div>

      {view === "plan" && restaurant && (
        <FloorPlanEditor
          restaurantId={restaurant.id}
          editable
          onTableClick={(t) => {
            const full = tables.find((x) => x.id === t.id);
            if (full) cycleStatus(full);
          }}
        />
      )}

      {view === "plan" ? null : (
      <>

      {tables.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucune table configurée. Ajoutez vos tables depuis <strong>Paramètres</strong>.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 text-sm">
            {(Object.keys(STATUS_LABEL) as TableStatus[]).map((s) => (
              <span key={s} className={cn("rounded-md border px-2.5 py-1", STATUS_COLORS[s])}>
                {STATUS_LABEL[s]} : <strong>{counts[s] ?? 0}</strong>
              </span>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {tables.map((t) => (
              <button
                key={t.id}
                onClick={() => cycleStatus(t)}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 p-3 transition-all active:scale-95",
                  STATUS_COLORS[t.status]
                )}
              >
                <span className="text-2xl font-bold">{t.label}</span>
                <span className="flex items-center gap-1 text-xs">
                  <Users className="h-3 w-3" /> {t.seats}
                </span>
                <span className="text-xs font-medium">{STATUS_LABEL[t.status]}</span>
              </button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Cycle : Libre → Occupée → À débarrasser → Libre. Les tables réservées passent à occupée.
          </p>
        </>
      )}
      </>
      )}
    </div>
  );
};

export default Floor;