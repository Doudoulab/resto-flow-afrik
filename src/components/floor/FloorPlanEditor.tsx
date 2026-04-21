import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Move, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type TableStatus = "available" | "occupied" | "needs_cleaning" | "reserved";

interface RTable {
  id: string;
  label: string;
  seats: number;
  status: TableStatus;
  pos_x: number;
  pos_y: number;
  shape: string;
}

const STATUS_BG: Record<TableStatus, string> = {
  available: "bg-primary/10 border-primary/40",
  occupied: "bg-destructive/10 border-destructive/50",
  needs_cleaning: "bg-amber-500/10 border-amber-500/60",
  reserved: "bg-secondary border-secondary-foreground/30",
};

interface Props {
  restaurantId: string;
  editable?: boolean;
  onTableClick?: (t: RTable) => void;
}

export const FloorPlanEditor = ({ restaurantId, editable = false, onTableClick }: Props) => {
  const [tables, setTables] = useState<RTable[]>([]);
  const [dirty, setDirty] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const load = async () => {
    const { data } = await supabase.from("restaurant_tables")
      .select("*").eq("restaurant_id", restaurantId)
      .order("sort_order");
    setTables((data ?? []) as RTable[]);
  };

  useEffect(() => { load(); }, [restaurantId]);

  useEffect(() => {
    const ch = supabase.channel(`floor-${restaurantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_tables", filter: `restaurant_id=eq.${restaurantId}` }, () => { if (!dirty) load(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [restaurantId, dirty]);

  const onPointerDown = (e: React.PointerEvent, t: RTable) => {
    if (!editable) return;
    e.preventDefault();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    offsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragId(t.id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!editable || !dragId || !containerRef.current) return;
    const cRect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(cRect.width - 80, e.clientX - cRect.left - offsetRef.current.x));
    const y = Math.max(0, Math.min(cRect.height - 80, e.clientY - cRect.top - offsetRef.current.y));
    setTables((prev) => prev.map((t) => t.id === dragId ? { ...t, pos_x: Math.round(x), pos_y: Math.round(y) } : t));
    setDirty(true);
  };

  const onPointerUp = () => setDragId(null);

  const savePositions = async () => {
    for (const t of tables) {
      await supabase.from("restaurant_tables").update({ pos_x: t.pos_x, pos_y: t.pos_y }).eq("id", t.id);
    }
    setDirty(false);
    toast.success("Plan de salle enregistré");
  };

  if (tables.length === 0) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">Aucune table. Ajoutez-en dans Paramètres.</CardContent></Card>;
  }

  return (
    <div className="space-y-3">
      {editable && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Move className="h-4 w-4" /> Glissez les tables pour positionner votre plan de salle.
          </p>
          {dirty && <Button size="sm" onClick={savePositions}><Save className="mr-2 h-4 w-4" />Enregistrer</Button>}
        </div>
      )}
      <div
        ref={containerRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="relative w-full rounded-lg border-2 border-dashed border-border bg-muted/20"
        style={{ height: 520, touchAction: "none" }}
      >
        {tables.map((t) => (
          <div
            key={t.id}
            onPointerDown={(e) => onPointerDown(e, t)}
            onClick={() => !dragId && onTableClick?.(t)}
            className={cn(
              "absolute flex flex-col items-center justify-center rounded-xl border-2 shadow-sm transition-colors",
              STATUS_BG[t.status],
              editable ? "cursor-move" : "cursor-pointer hover:opacity-80",
              t.shape === "round" && "rounded-full",
            )}
            style={{ left: t.pos_x, top: t.pos_y, width: 80, height: 80 }}
          >
            <span className="font-bold">{t.label}</span>
            <span className="flex items-center gap-1 text-xs"><Users className="h-3 w-3" /> {t.seats}</span>
          </div>
        ))}
      </div>
    </div>
  );
};