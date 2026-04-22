import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatFCFA } from "@/lib/currency";
import { Plus, Trash2 } from "lucide-react";
import { logAudit } from "@/lib/orders/audit";

interface Payment {
  amount: number;
  method: string;
  reference?: string;
  payer_name?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
  restaurantId: string | null;
  total: number;
  amountPaid: number;
  onPaymentAdded: () => void;
}

const METHODS = [
  { value: "cash", label: "Espèces" },
  { value: "card", label: "Carte bancaire" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "transfer", label: "Virement" },
  { value: "credit", label: "Crédit client" },
];

export const SplitBillDialog = ({ open, onOpenChange, orderId, restaurantId, total, amountPaid, onPaymentAdded }: Props) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [history, setHistory] = useState<{ amount: number; method: string; created_at: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const remaining = Math.max(0, total - amountPaid);

  useEffect(() => {
    if (!open || !orderId) return;
    setPayments([{ amount: remaining, method: "cash" }]);
    (async () => {
      const { data } = await supabase.from("order_payments")
        .select("amount, method, created_at")
        .eq("order_id", orderId)
        .order("created_at");
      setHistory((data ?? []) as never);
    })();
  }, [open, orderId, remaining]);

  const totalNew = payments.reduce((s, p) => s + (p.amount || 0), 0);

  const submit = async () => {
    if (!orderId || !restaurantId) return;
    if (totalNew <= 0) { toast.error("Aucun paiement saisi"); return; }
    if (totalNew > remaining + 0.01) { toast.error(`Le total dépasse le restant dû (${formatFCFA(remaining)})`); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("order_payments").insert(
      payments.filter((p) => p.amount > 0).map((p) => ({
        order_id: orderId,
        restaurant_id: restaurantId,
        amount: p.amount,
        method: p.method,
        reference: p.reference || null,
        payer_name: p.payer_name || null,
        created_by: user?.id ?? null,
      }))
    );
    if (error) { setSaving(false); toast.error(error.message); return; }

    const newPaid = amountPaid + totalNew;
    const fullyPaid = newPaid >= total - 0.01;
    if (fullyPaid) {
      // Verrou atomique côté DB pour empêcher tout double-encaissement
      const { error: payErr } = await supabase.rpc("mark_order_paid", {
        _order_id: orderId,
        _payment_method: payments[0]?.method ?? "cash",
        _amount_paid: newPaid,
      });
      if (payErr) {
        setSaving(false);
        toast.error(payErr.message.includes("déjà encaissée") ? "Cette commande est déjà encaissée" : payErr.message);
        return;
      }
    } else {
      await supabase.from("orders").update({
        amount_paid: newPaid,
        payment_status: "partial",
      }).eq("id", orderId);
    }

    await logAudit({
      restaurantId,
      action: "payment",
      entityType: "order",
      entityId: orderId,
      reason: `Encaissement ${formatFCFA(totalNew)} (${payments.length} paiement${payments.length > 1 ? "s" : ""})`,
    });

    setSaving(false);
    toast.success(fullyPaid ? "Commande soldée" : `Encaissement partiel — restant ${formatFCFA(total - newPaid)}`);
    onOpenChange(false);
    onPaymentAdded();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Encaissement & addition partagée</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <div className="flex justify-between"><span>Total commande</span><span className="font-semibold">{formatFCFA(total)}</span></div>
            <div className="flex justify-between"><span>Déjà payé</span><span>{formatFCFA(amountPaid)}</span></div>
            <div className="flex justify-between border-t pt-1 mt-1"><span className="font-medium">Restant dû</span><span className="font-bold text-primary">{formatFCFA(remaining)}</span></div>
          </div>

          {history.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">Paiements précédents</Label>
              {history.map((h, i) => (
                <div key={i} className="flex justify-between text-xs text-muted-foreground">
                  <span>{METHODS.find((m) => m.value === h.method)?.label ?? h.method}</span>
                  <span>{formatFCFA(h.amount)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Nouveaux paiements</Label>
              <Button size="sm" variant="ghost" onClick={() => setPayments([...payments, { amount: 0, method: "cash" }])}>
                <Plus className="h-3 w-3 mr-1" /> Ajouter
              </Button>
            </div>
            {payments.map((p, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5 space-y-1">
                  <Label className="text-xs">Montant</Label>
                  <Input type="number" min={0} value={p.amount}
                    onChange={(e) => setPayments(payments.map((x, j) => j === i ? { ...x, amount: Math.max(0, parseFloat(e.target.value) || 0) } : x))} />
                </div>
                <div className="col-span-5 space-y-1">
                  <Label className="text-xs">Mode</Label>
                  <Select value={p.method} onValueChange={(v) => setPayments(payments.map((x, j) => j === i ? { ...x, method: v } : x))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button size="icon" variant="ghost" className="col-span-2"
                  onClick={() => setPayments(payments.filter((_, j) => j !== i))} disabled={payments.length === 1}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <div className="flex justify-between text-sm pt-2 border-t">
              <span>Total saisi</span>
              <span className="font-bold">{formatFCFA(totalNew)}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          <Button onClick={submit} disabled={saving || totalNew <= 0}>Encaisser</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};