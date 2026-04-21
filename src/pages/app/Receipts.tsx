import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, CheckCircle2, FileText } from "lucide-react";
import { formatFCFA } from "@/lib/currency";
import { format } from "date-fns";

interface Supplier { id: string; name: string; }
interface StockItem { id: string; name: string; unit: string; cost_per_unit: number; }
interface ReceiptLine { stock_item_id: string; quantity: number; unit_cost: number; }
interface Receipt { id: string; receipt_date: string; status: string; total: number; supplier_id: string | null; notes: string | null; }

const Receipts = () => {
  const { restaurant } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ supplier_id: "none", receipt_date: format(new Date(), "yyyy-MM-dd"), notes: "" });
  const [lines, setLines] = useState<ReceiptLine[]>([]);

  const load = async () => {
    if (!restaurant) return;
    const [r, s, st] = await Promise.all([
      supabase.from("stock_receipts").select("*").eq("restaurant_id", restaurant.id).order("receipt_date", { ascending: false }),
      supabase.from("suppliers").select("id,name").eq("restaurant_id", restaurant.id).order("name"),
      supabase.from("stock_items").select("id,name,unit,cost_per_unit").eq("restaurant_id", restaurant.id).order("name"),
    ]);
    setReceipts((r.data ?? []) as Receipt[]);
    setSuppliers((s.data ?? []) as Supplier[]);
    setStockItems((st.data ?? []) as StockItem[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [restaurant]);

  const total = lines.reduce((s, l) => s + Number(l.quantity) * Number(l.unit_cost), 0);

  const addLine = () => setLines([...lines, { stock_item_id: stockItems[0]?.id ?? "", quantity: 1, unit_cost: stockItems[0]?.cost_per_unit ?? 0 }]);
  const updateLine = (i: number, patch: Partial<ReceiptLine>) => setLines(lines.map((l, idx) => {
    if (idx !== i) return l;
    const next = { ...l, ...patch };
    if (patch.stock_item_id) {
      const s = stockItems.find((x) => x.id === patch.stock_item_id);
      if (s && !patch.unit_cost) next.unit_cost = s.cost_per_unit;
    }
    return next;
  }));
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));

  const create = async () => {
    if (!restaurant || lines.length === 0) return toast.error("Ajoutez au moins une ligne");
    const { data: receipt, error } = await supabase.from("stock_receipts").insert({
      restaurant_id: restaurant.id,
      supplier_id: form.supplier_id === "none" ? null : form.supplier_id,
      receipt_date: form.receipt_date, notes: form.notes || null, total, status: "draft",
    }).select().single();
    if (error || !receipt) return toast.error(error?.message ?? "Erreur");
    const valid = lines.filter((l) => l.stock_item_id && l.quantity > 0);
    if (valid.length > 0) {
      await supabase.from("stock_receipt_items").insert(valid.map((l) => ({ receipt_id: receipt.id, ...l })));
    }
    toast.success("Bon créé en brouillon");
    setOpen(false); setLines([]); setForm({ supplier_id: "none", receipt_date: format(new Date(), "yyyy-MM-dd"), notes: "" });
    load();
  };

  const validate = async (id: string) => {
    if (!confirm("Valider ce bon ? Le stock sera mis à jour.")) return;
    const { error } = await supabase.from("stock_receipts").update({ status: "validated" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Bon validé, stock mis à jour");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce bon ?")) return;
    const { error } = await supabase.from("stock_receipts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bons de réception</h1>
          <p className="mt-1 text-muted-foreground">Enregistrez vos arrivages fournisseurs. Le stock se met à jour à la validation.</p>
        </div>
        <Button onClick={() => { setOpen(true); setLines([]); }}><Plus className="mr-2 h-4 w-4" />Nouveau bon</Button>
      </div>

      {receipts.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun bon de réception.</CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Fournisseur</TableHead><TableHead>Total</TableHead><TableHead>Statut</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {receipts.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{format(new Date(r.receipt_date), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{suppliers.find((s) => s.id === r.supplier_id)?.name ?? "—"}</TableCell>
                  <TableCell className="font-semibold">{formatFCFA(r.total)}</TableCell>
                  <TableCell><Badge variant={r.status === "validated" ? "default" : "outline"}>{r.status === "validated" ? "Validé" : "Brouillon"}</Badge></TableCell>
                  <TableCell className="text-right">
                    {r.status === "draft" && <Button size="sm" variant="outline" onClick={() => validate(r.id)}><CheckCircle2 className="h-4 w-4 mr-1" />Valider</Button>}
                    {r.status === "draft" && <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nouveau bon de réception</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Fournisseur</Label>
                <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">— Aucun —</SelectItem>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.receipt_date} onChange={(e) => setForm({ ...form, receipt_date: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>

            <div className="space-y-2">
              <Label>Articles reçus</Label>
              {lines.map((l, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Select value={l.stock_item_id} onValueChange={(v) => updateLine(i, { stock_item_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Article..." /></SelectTrigger>
                      <SelectContent>{stockItems.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.unit})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="w-24 space-y-1"><Label className="text-xs">Qté</Label><Input type="number" step="0.01" value={l.quantity} onChange={(e) => updateLine(i, { quantity: parseFloat(e.target.value) || 0 })} /></div>
                  <div className="w-32 space-y-1"><Label className="text-xs">Coût/u</Label><Input type="number" value={l.unit_cost} onChange={(e) => updateLine(i, { unit_cost: parseFloat(e.target.value) || 0 })} /></div>
                  <Button variant="ghost" size="icon" onClick={() => removeLine(i)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addLine}><Plus className="mr-2 h-4 w-4" />Ajouter une ligne</Button>
            </div>

            <div className="flex justify-between border-t pt-3">
              <span className="font-medium">Total</span>
              <span className="text-xl font-bold">{formatFCFA(total)}</span>
            </div>
          </div>
          <DialogFooter><Button onClick={create}>Enregistrer en brouillon</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Receipts;
