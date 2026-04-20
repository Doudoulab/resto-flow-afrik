import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";

interface StockItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  alert_threshold: number;
  cost_per_unit: number;
}

const Stock = () => {
  const { restaurant } = useAuth();
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<StockItem | null>(null);
  const [form, setForm] = useState({ name: "", unit: "unité", quantity: "0", alert_threshold: "0", cost_per_unit: "0" });

  const load = async () => {
    if (!restaurant) return;
    const { data } = await supabase.from("stock_items").select("*").eq("restaurant_id", restaurant.id).order("name");
    setItems((data ?? []) as StockItem[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [restaurant]);

  const open = (item?: StockItem) => {
    if (item) {
      setEditing(item);
      setForm({ name: item.name, unit: item.unit, quantity: String(item.quantity), alert_threshold: String(item.alert_threshold), cost_per_unit: String(item.cost_per_unit ?? 0) });
    } else {
      setEditing(null);
      setForm({ name: "", unit: "unité", quantity: "0", alert_threshold: "0", cost_per_unit: "0" });
    }
    setDialog(true);
  };

  const save = async () => {
    if (!restaurant) return;
    const payload = {
      restaurant_id: restaurant.id,
      name: form.name,
      unit: form.unit || "unité",
      quantity: parseFloat(form.quantity) || 0,
      alert_threshold: parseFloat(form.alert_threshold) || 0,
      cost_per_unit: parseFloat(form.cost_per_unit) || 0,
    };
    const res = editing
      ? await supabase.from("stock_items").update(payload).eq("id", editing.id)
      : await supabase.from("stock_items").insert(payload);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(editing ? "Article mis à jour" : "Article ajouté");
    setDialog(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cet article ?")) return;
    const { error } = await supabase.from("stock_items").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const adjust = async (item: StockItem, delta: number) => {
    const newQty = Math.max(0, Number(item.quantity) + delta);
    const { error } = await supabase.from("stock_items").update({ quantity: newQty }).eq("id", item.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Stock</h1>
          <p className="mt-1 text-muted-foreground">Suivez vos articles et soyez alerté avant la rupture.</p>
        </div>
        <Button onClick={() => open()}><Plus className="mr-2 h-4 w-4" />Article</Button>
      </div>

      {items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Aucun article en stock. Ajoutez-en pour commencer.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const low = Number(item.quantity) <= Number(item.alert_threshold);
            return (
              <Card key={item.id} className={`shadow-sm ${low ? "border-warning" : ""}`}>
                <CardContent className="p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <h3 className="font-semibold">{item.name}</h3>
                    {low && <Badge variant="outline" className="border-warning text-warning"><AlertTriangle className="mr-1 h-3 w-3" />Faible</Badge>}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">{Number(item.quantity)}</p>
                      <p className="text-xs text-muted-foreground">{item.unit} · seuil {Number(item.alert_threshold)}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => adjust(item, -1)}>−</Button>
                      <Button size="sm" variant="outline" onClick={() => adjust(item, 1)}>+</Button>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end gap-1 border-t border-border pt-2">
                    <Button variant="ghost" size="sm" onClick={() => open(item)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(item.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Modifier l'article" : "Nouvel article"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tomates, Riz, Coca..." />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Quantité</Label>
                <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Unité</Label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="kg, L, unité..." />
              </div>
              <div className="space-y-2">
                <Label>Alerte si ≤</Label>
                <Input type="number" value={form.alert_threshold} onChange={(e) => setForm({ ...form, alert_threshold: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={save}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Stock;
