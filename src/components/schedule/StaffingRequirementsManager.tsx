import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Req { id: string; day_of_week: number; shift_template_id: string | null; role: string | null; required_count: number; }
interface Template { id: string; name: string; }

const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const ROLES = [
  { v: "", l: "Tous" },
  { v: "manager", l: "Gérant" }, { v: "waiter", l: "Serveur" },
  { v: "kitchen", l: "Cuisine" }, { v: "cashier", l: "Caissier" },
];

export const StaffingRequirementsManager = ({ restaurantId, onChange }: { restaurantId: string; onChange?: () => void }) => {
  const [reqs, setReqs] = useState<Req[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ day_of_week: 1, shift_template_id: "", role: "", required_count: 1 });

  const load = async () => {
    const [r, t] = await Promise.all([
      supabase.from("staffing_requirements").select("*").eq("restaurant_id", restaurantId).order("day_of_week"),
      supabase.from("shift_templates").select("id, name").eq("restaurant_id", restaurantId).eq("is_active", true).order("start_time"),
    ]);
    setReqs((r.data ?? []) as Req[]);
    setTemplates((t.data ?? []) as Template[]);
  };
  useEffect(() => { load(); }, [restaurantId]);

  const save = async () => {
    if (!form.shift_template_id) { toast.error("Sélectionnez un modèle"); return; }
    const { error } = await supabase.from("staffing_requirements").insert({
      restaurant_id: restaurantId,
      day_of_week: form.day_of_week,
      shift_template_id: form.shift_template_id,
      role: form.role || null,
      required_count: form.required_count,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Besoin ajouté");
    setOpen(false);
    setForm({ day_of_week: 1, shift_template_id: "", role: "", required_count: 1 });
    load();
    onChange?.();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("staffing_requirements").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
    onChange?.();
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Besoins en personnel</h3>
            <p className="text-xs text-muted-foreground">Effectif minimum par jour et créneau</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" disabled={templates.length === 0}><Plus className="mr-1 h-4 w-4" /> Besoin</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Définir un besoin</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Jour</Label>
                  <Select value={String(form.day_of_week)} onValueChange={(v) => setForm({ ...form, day_of_week: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d === "Dim" ? "Dimanche" : d === "Lun" ? "Lundi" : d === "Mar" ? "Mardi" : d === "Mer" ? "Mercredi" : d === "Jeu" ? "Jeudi" : d === "Ven" ? "Vendredi" : "Samedi"}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Modèle de shift</Label>
                  <Select value={form.shift_template_id} onValueChange={(v) => setForm({ ...form, shift_template_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>{templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Poste</Label>
                  <Select value={form.role || "all"} onValueChange={(v) => setForm({ ...form, role: v === "all" ? "" : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous postes</SelectItem>
                      {ROLES.filter(r => r.v).map(r => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nombre requis</Label>
                  <Input type="number" min={1} value={form.required_count} onChange={(e) => setForm({ ...form, required_count: Math.max(1, Number(e.target.value)) })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button onClick={save}>Ajouter</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {templates.length === 0 && (
          <p className="text-xs text-muted-foreground">Créez d'abord un modèle de shift.</p>
        )}
        {reqs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Aucun besoin défini. Sans cela, pas d'alerte sous-effectif.</p>
        ) : (
          <div className="space-y-1.5">
            {reqs.map(r => {
              const tpl = templates.find(t => t.id === r.shift_template_id);
              return (
                <div key={r.id} className="flex items-center gap-2 rounded-md border bg-card p-2 text-sm">
                  <span className="font-medium w-12">{DAYS[r.day_of_week]}</span>
                  <span className="flex-1 truncate">{tpl?.name ?? "—"} · {ROLES.find(x => x.v === (r.role ?? ""))?.l ?? r.role}</span>
                  <span className="font-semibold tabular-nums">{r.required_count}</span>
                  <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
