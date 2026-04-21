import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Plus, CheckCircle2, Trash2, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";

interface Count { id: string; count_date: string; status: string; notes: string | null; }
interface StockItem { id: string; name: string; unit: string; quantity: number; }
interface CountLine { stock_item_id: string; expected_quantity: number; counted_quantity: number; }

const Inventory = () => {
  const { restaurant } = useAuth();
  const [counts, setCounts] = useState<Count[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [lines, setLines] = useState<CountLine[]>([]);
  const [notes, setNotes] = useState("");
  const [editingCountId, setEditingCountId] = useState<string | null>(null);

  const load = async () => {
    if (!restaurant) return;
    const { data } = await supabase.from("stock_counts").select("*").eq("restaurant_id", restaurant.id).order("count_date", { ascending: false });
    setCounts((data ?? []) as Count[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [restaurant]);

  const startNew = async () => {
    if (!restaurant) return;
    const { data: items } = await supabase.from("stock_items").select("id,name,unit,quantity").eq("restaurant_id", restaurant.id).order("name");
    const list = (items ?? []) as StockItem[];
    setStockItems(list);
    setLines(list.map((s) => ({ stock_item_id: s.id, expected_quantity: Number(s.quantity), counted_quantity: Number(s.quantity) })));
    setNotes("");
    setEditingCountId(null);
    setOpen(true);
  };

  const updateCounted = (i: number, v: number) => setLines(lines.map((l, idx) => idx === i ? { ...l, counted_quantity: v } : l));

  const saveDraft = async () => {
    if (!restaurant) return;
    const { data: c, error } = await supabase.from("stock_counts").insert({
      restaurant_id: restaurant.id, count_date: format(new Date(), "yyyy-MM-dd"), notes: notes || null, status: "draft",
    }).select().single();
    if (error || !c) return toast.error(error?.message ?? "Erreur");
    await supabase.from("stock_count_items").insert(lines.map((l) => ({ count_id: c.id, ...l })));
    setEditingCountId(c.id);
    toast.success("Brouillon enregistré");
    load();
  };

  const validate = async () => {
    let countId = editingCountId;
    if (!countId) {
      if (!restaurant) return;
      const { data: c, error } = await supabase.from("stock_counts").insert({
        restaurant_id: restaurant.id, count_date: format(new Date(), "yyyy-MM-dd"), notes: notes || null, status: "draft",
      }).select().single();
      if (error || !c) return toast.error(error?.message ?? "Erreur");
      await supabase.from("stock_count_items").insert(lines.map((l) => ({ count_id: c.id, ...l })));
      countId = c.id;
    }
    if (!confirm("Valider l'inventaire ? Le stock sera ajusté définitivement.")) return;
    const { error } = await supabase.from("stock_counts").update({ status: "validated" }).eq("id", countId);
    if (error) return toast.error(error.message);
    toast.success("Inventaire validé, stock ajusté");
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cet inventaire ?")) return;
    await supabase.from("stock_counts").delete().eq("id", id);
    load();
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventaires</h1>
          <p className="mt-1 text-muted-foreground">Comptez le stock physique et ajustez les écarts.</p>
        </div>
        <Button onClick={startNew}><Plus className="mr-2 h-4 w-4" />Nouvel inventaire</Button>
      </div>

      {counts.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun inventaire enregistré.</CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Statut</TableHead><TableHead>Notes</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {counts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{format(new Date(c.count_date), "dd/MM/yyyy")}</TableCell>
                  <TableCell><Badge variant={c.status === "validated" ? "default" : "outline"}>{c.status === "validated" ? "Validé" : "Brouillon"}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.notes ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {c.status === "draft" && <Button size="sm" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Inventaire — {format(new Date(), "dd/MM/yyyy")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Notes (optionnel)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <Table>
              <TableHeader><TableRow><TableHead>Article</TableHead><TableHead>Théorique</TableHead><TableHead>Compté</TableHead><TableHead>Écart</TableHead></TableRow></TableHeader>
              <TableBody>
                {lines.map((l, i) => {
                  const s = stockItems.find((x) => x.id === l.stock_item_id);
                  const ecart = l.counted_quantity - l.expected_quantity;
                  return (
                    <TableRow key={l.stock_item_id}>
                      <TableCell>{s?.name} <span className="text-xs text-muted-foreground">({s?.unit})</span></TableCell>
                      <TableCell>{l.expected_quantity}</TableCell>
                      <TableCell><Input type="number" step="0.01" className="w-24" value={l.counted_quantity} onChange={(e) => updateCounted(i, parseFloat(e.target.value) || 0)} /></TableCell>
                      <TableCell className={ecart === 0 ? "text-muted-foreground" : ecart < 0 ? "text-destructive" : "text-success"}>{ecart > 0 ? "+" : ""}{ecart.toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={saveDraft}>Brouillon</Button>
            <Button onClick={validate}><CheckCircle2 className="mr-2 h-4 w-4" />Valider</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
