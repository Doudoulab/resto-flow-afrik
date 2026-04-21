import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRightLeft } from "lucide-react";
import { formatFCFA } from "@/lib/currency";

interface Item { id: string; name_snapshot: string; quantity: number; unit_price: number; status: string; }
interface OrderLite { id: string; order_number: number; table_number: string | null; status: string; }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromOrderId: string | null;
  restaurantId: string | null;
  onTransferred: () => void;
}

export const TransferItemsDialog = ({ open, onOpenChange, fromOrderId, restaurantId, onTransferred }: Props) => {
  const [items, setItems] = useState<Item[]>([]);
  const [orders, setOrders] = useState<OrderLite[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<string>("__new__");
  const [newTable, setNewTable] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !fromOrderId || !restaurantId) return;
    (async () => {
      const [iRes, oRes] = await Promise.all([
        supabase.from("order_items").select("id, name_snapshot, quantity, unit_price, status").eq("order_id", fromOrderId).neq("status", "cancelled"),
        supabase.from("orders").select("id, order_number, table_number, status").eq("restaurant_id", restaurantId).in("status", ["pending", "preparing", "ready", "served"]).neq("id", fromOrderId).order("created_at", { ascending: false }).limit(20),
      ]);
      setItems((iRes.data ?? []) as Item[]);
      setOrders((oRes.data ?? []) as OrderLite[]);
      setSelected(new Set());
      setReason("");
    })();
  }, [open, fromOrderId, restaurantId]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const submit = async () => {
    if (!fromOrderId || !restaurantId) return;
    if (selected.size === 0) { toast.error("Sélectionnez au moins un plat"); return; }
    if (reason.trim().length < 3) { toast.error("Motif requis"); return; }
    setSaving(true);
    let targetId = target;
    if (target === "__new__") {
      const { data: newOrder, error: createErr } = await supabase.from("orders").insert({
        restaurant_id: restaurantId,
        table_number: newTable.trim() || null,
        status: "pending" as const,
      }).select().single();
      if (createErr || !newOrder) { setSaving(false); toast.error(createErr?.message || "Erreur création commande"); return; }
      targetId = newOrder.id;
    }
    for (const itemId of selected) {
      const { error } = await supabase.rpc("transfer_order_item", {
        _item_id: itemId, _to_order_id: targetId, _reason: reason.trim(),
      });
      if (error) { setSaving(false); toast.error(error.message); return; }
    }
    setSaving(false);
    toast.success(`${selected.size} plat${selected.size > 1 ? "s" : ""} transféré${selected.size > 1 ? "s" : ""}`);
    onOpenChange(false);
    onTransferred();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5" /> Transférer des plats</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Plats à transférer</Label>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun plat actif.</p>
            ) : items.map((it) => (
              <label key={it.id} className="flex items-center gap-3 rounded-md border p-2 cursor-pointer">
                <Checkbox checked={selected.has(it.id)} onCheckedChange={() => toggle(it.id)} />
                <span className="flex-1 text-sm">{it.quantity}× {it.name_snapshot}</span>
                <span className="text-xs text-muted-foreground">{formatFCFA(Number(it.unit_price) * it.quantity)}</span>
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Destination</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__new__">➕ Nouvelle commande</SelectItem>
                {orders.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    #{o.order_number}{o.table_number ? ` — Table ${o.table_number}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {target === "__new__" && (
              <Input value={newTable} onChange={(e) => setNewTable(e.target.value)} placeholder="N° de la nouvelle table (optionnel)" />
            )}
          </div>

          <div className="space-y-2">
            <Label>Motif du transfert *</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: changement de table, regroupement de l'addition" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={saving || selected.size === 0}>Transférer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};