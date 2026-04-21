import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Flame } from "lucide-react";

interface Item {
  id: string;
  name_snapshot: string;
  quantity: number;
  course_number: number;
  fired_at: string | null;
  status: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
  onFired: () => void;
}

export const CourseFireDialog = ({ open, onOpenChange, orderId, onFired }: Props) => {
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !orderId) return;
    (async () => {
      const { data } = await supabase.from("order_items")
        .select("id, name_snapshot, quantity, course_number, fired_at, status")
        .eq("order_id", orderId)
        .neq("status", "cancelled")
        .order("course_number")
        .order("created_at");
      setItems((data ?? []) as Item[]);
      // pré-cocher les non-fired du plus petit cours non encore envoyé
      const unfired = (data ?? []).filter((i) => !i.fired_at);
      const minCourse = unfired.length > 0 ? Math.min(...unfired.map((i) => i.course_number)) : 1;
      setSelected(new Set(unfired.filter((i) => i.course_number === minCourse).map((i) => i.id)));
    })();
  }, [open, orderId]);

  const fire = async () => {
    if (selected.size === 0) { toast.error("Sélectionnez au moins un plat"); return; }
    setSaving(true);
    const { error } = await supabase.from("order_items")
      .update({ fired_at: new Date().toISOString() })
      .in("id", Array.from(selected));
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${selected.size} plat${selected.size > 1 ? "s" : ""} envoyé${selected.size > 1 ? "s" : ""} en cuisine`);
    onOpenChange(false);
    onFired();
  };

  const grouped = items.reduce<Record<number, Item[]>>((acc, it) => {
    if (!acc[it.course_number]) acc[it.course_number] = [];
    acc[it.course_number].push(it);
    return acc;
  }, {});

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Flame className="h-5 w-5 text-orange-500" /> Envoyer en cuisine</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Cochez les plats à envoyer maintenant. Vous pouvez gérer les cours (entrée → plat → dessert) en plusieurs vagues.</p>
        <div className="space-y-3">
          {Object.entries(grouped).map(([course, list]) => (
            <div key={course} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge>Cours {course}</Badge>
              </div>
              {list.map((it) => (
                <label key={it.id} className="flex items-center gap-3 rounded-md border p-2 cursor-pointer">
                  <Checkbox checked={selected.has(it.id)} disabled={!!it.fired_at} onCheckedChange={() => toggle(it.id)} />
                  <span className="flex-1 text-sm">{it.quantity}× {it.name_snapshot}</span>
                  {it.fired_at && <Badge variant="secondary" className="text-xs">Envoyé</Badge>}
                </label>
              ))}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          <Button onClick={fire} disabled={saving || selected.size === 0}>
            <Flame className="mr-2 h-4 w-4" /> Envoyer ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};