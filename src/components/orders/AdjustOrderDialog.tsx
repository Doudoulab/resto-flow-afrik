import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { computeTotals } from "@/lib/orders/totals";
import { formatFCFA } from "@/lib/currency";
import { logAudit } from "@/lib/orders/audit";

interface OrderLite {
  id: string;
  restaurant_id: string;
  discount_amount: number;
  discount_reason: string | null;
  tip_amount: number;
  service_amount: number;
  subtotal: number;
  tax_amount: number;
  total: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderLite | null;
  onSaved: () => void;
}

export const AdjustOrderDialog = ({ open, onOpenChange, order, onSaved }: Props) => {
  const [discount, setDiscount] = useState(0);
  const [reason, setReason] = useState("");
  const [tip, setTip] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (order) {
      setDiscount(Number(order.discount_amount ?? 0));
      setReason(order.discount_reason ?? "");
      setTip(Number(order.tip_amount ?? 0));
    }
  }, [order]);

  const save = async () => {
    if (!order) return;
    setSaving(true);

    // Recompute from existing items
    const { data: items } = await supabase
      .from("order_items")
      .select("quantity, unit_price, vat_rate, discount_amount, status")
      .eq("order_id", order.id);

    const { data: resto } = await supabase
      .from("restaurants")
      .select("default_vat_rate, vat_mode, default_service_pct")
      .eq("id", order.restaurant_id)
      .maybeSingle();

    const lines = (items ?? [])
      .filter((i) => i.status !== "cancelled")
      .map((i) => ({
        quantity: i.quantity,
        unit_price: Number(i.unit_price),
        discount_amount: Number(i.discount_amount ?? 0),
        vat_rate: i.vat_rate != null ? Number(i.vat_rate) : undefined,
      }));

    const totals = computeTotals({
      lines,
      vatMode: (resto?.vat_mode as "inclusive" | "exclusive") ?? "exclusive",
      defaultVatRate: Number(resto?.default_vat_rate ?? 18),
      servicePct: Number(resto?.default_service_pct ?? 0),
      orderDiscountAmount: discount,
      tipAmount: tip,
    });

    const { error } = await supabase.from("orders").update({
      discount_amount: discount,
      discount_reason: discount > 0 ? (reason || "Remise commerciale") : null,
      tip_amount: tip,
      subtotal: totals.subtotal,
      tax_amount: totals.taxAmount,
      service_amount: totals.serviceAmount,
      total: totals.total,
    }).eq("id", order.id);

    setSaving(false);
    if (error) { toast.error(error.message); return; }

    await logAudit({
      restaurantId: order.restaurant_id,
      action: "adjust",
      entityType: "order",
      entityId: order.id,
      reason: `Remise ${formatFCFA(discount)} | Pourboire ${formatFCFA(tip)}`,
      before: { discount: order.discount_amount, tip: order.tip_amount, total: order.total },
      after: { discount, tip, total: totals.total },
    });

    toast.success("Commande ajustée");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Remise & pourboire</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Montant de la remise (FCFA)</Label>
            <Input type="number" min={0} value={discount} onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))} />
          </div>
          {discount > 0 && (
            <div className="space-y-2">
              <Label>Motif de la remise</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: client fidèle, geste commercial…" />
            </div>
          )}
          <div className="space-y-2">
            <Label>Pourboire (FCFA)</Label>
            <Input type="number" min={0} value={tip} onChange={(e) => setTip(Math.max(0, parseFloat(e.target.value) || 0))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={save} disabled={saving}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};