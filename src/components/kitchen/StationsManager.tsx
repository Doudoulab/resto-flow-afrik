import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ChefHat, Plus, Trash2, Loader2 } from "lucide-react";

interface Station {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
  sort_order: number;
}

const PRESET_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#0ea5e9", "#8b5cf6", "#ec4899", "#64748b"];

export const StationsManager = ({ restaurantId }: { restaurantId: string }) => {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", color: "#64748b" });

  const load = async () => {
    const { data } = await supabase
      .from("kitchen_stations")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("sort_order");
    setStations((data ?? []) as Station[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [restaurantId]);

  const add = async () => {
    if (!form.name.trim()) { toast.error("Nom requis"); return; }
    const { error } = await supabase.from("kitchen_stations").insert({
      restaurant_id: restaurantId,
      name: form.name.trim(),
      color: form.color,
      sort_order: stations.length,
    });
    if (error) { toast.error(error.message); return; }
    setForm({ name: "", color: "#64748b" });
    load();
  };

  const toggle = async (s: Station) => {
    await supabase.from("kitchen_stations").update({ is_active: !s.is_active }).eq("id", s.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce poste ?")) return;
    await supabase.from("kitchen_stations").delete().eq("id", id);
    load();
  };

  if (loading) return <Card><CardContent className="py-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></CardContent></Card>;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ChefHat className="h-5 w-5" /> Postes de cuisine</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Créez vos postes (Chaud, Froid, Bar, Pâtisserie…) pour router automatiquement les tickets vers le bon écran.</p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[140px] space-y-1">
            <Label>Nom du poste</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Chaud" />
          </div>
          <div className="space-y-1">
            <Label>Couleur</Label>
            <div className="flex gap-1">
              {PRESET_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                  className={`h-8 w-8 rounded-md border-2 ${form.color === c ? "border-foreground" : "border-transparent"}`}
                  style={{ backgroundColor: c }} aria-label={c} />
              ))}
            </div>
          </div>
          <Button onClick={add}><Plus className="mr-2 h-4 w-4" />Ajouter</Button>
        </div>

        {stations.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Aucun poste configuré.</p>
        ) : (
          <div className="space-y-2">
            {stations.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-md border p-3">
                <div className="h-8 w-8 rounded" style={{ backgroundColor: s.color }} />
                <span className="flex-1 font-medium">{s.name}</span>
                <Switch checked={s.is_active} onCheckedChange={() => toggle(s)} />
                <Button size="icon" variant="ghost" onClick={() => remove(s.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};