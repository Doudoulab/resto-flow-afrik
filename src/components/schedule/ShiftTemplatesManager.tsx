import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  role: string | null;
  color: string;
  is_active: boolean;
}

const ROLES = [
  { v: "", l: "Tous" },
  { v: "manager", l: "Gérant" },
  { v: "waiter", l: "Serveur" },
  { v: "kitchen", l: "Cuisine" },
  { v: "cashier", l: "Caissier" },
];

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

export const ShiftTemplatesManager = ({ restaurantId, onChange }: { restaurantId: string; onChange?: () => void }) => {
  const [items, setItems] = useState<Template[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState({ name: "", start_time: "11:00", end_time: "15:00", role: "", color: COLORS[0] });

  const load = async () => {
    const { data } = await supabase.from("shift_templates").select("*").eq("restaurant_id", restaurantId).order("sort_order").order("start_time");
    setItems((data ?? []) as Template[]);
  };

  useEffect(() => { load(); }, [restaurantId]);

  const reset = () => { setEditing(null); setForm({ name: "", start_time: "11:00", end_time: "15:00", role: "", color: COLORS[0] }); };

  const openEdit = (t: Template) => {
    setEditing(t);
    setForm({ name: t.name, start_time: t.start_time.slice(0, 5), end_time: t.end_time.slice(0, 5), role: t.role ?? "", color: t.color });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Nom requis"); return; }
    const payload = {
      restaurant_id: restaurantId,
      name: form.name.trim(),
      start_time: form.start_time,
      end_time: form.end_time,
      role: form.role || null,
      color: form.color,
    };
    const { error } = editing
      ? await supabase.from("shift_templates").update(payload).eq("id", editing.id)
      : await supabase.from("shift_templates").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Modèle enregistré");
    setOpen(false);
    reset();
    load();
    onChange?.();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("shift_templates").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
    onChange?.();
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Modèles de shifts</h3>
            <p className="text-xs text-muted-foreground">Créneaux récurrents réutilisables</p>
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><Plus className="mr-1 h-4 w-4" /> Modèle</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>{editing ? "Modifier" : "Nouveau"} modèle</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ex: Service midi" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Début</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
                  <div><Label>Fin</Label><Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
                </div>
                <div>
                  <Label>Poste cible</Label>
                  <Select value={form.role || "all"} onValueChange={(v) => setForm({ ...form, role: v === "all" ? "" : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      {ROLES.filter(r => r.v).map(r => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Couleur</Label>
                  <div className="flex gap-2 mt-1">
                    {COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                        className="h-7 w-7 rounded-full border-2"
                        style={{ background: c, borderColor: form.color === c ? "hsl(var(--foreground))" : "transparent" }} />
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button onClick={save}>Enregistrer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Aucun modèle. Créez-en un pour accélérer la planification.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {items.map(t => (
              <div key={t.id} className="flex items-center gap-2 rounded-md border p-2">
                <div className="h-8 w-2 rounded" style={{ background: t.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.start_time.slice(0, 5)} – {t.end_time.slice(0, 5)} {t.role && `· ${ROLES.find(r => r.v === t.role)?.l ?? t.role}`}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
