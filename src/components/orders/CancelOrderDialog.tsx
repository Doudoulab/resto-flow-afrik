import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAudit } from "@/lib/orders/audit";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
  restaurantId: string | null;
  onCancelled: () => void;
}

export const CancelOrderDialog = ({ open, onOpenChange, orderId, restaurantId, onCancelled }: Props) => {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!orderId || !restaurantId) return;
    if (reason.trim().length < 3) { toast.error("Motif requis (3 caractères min.)"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("orders").update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: user?.id ?? null,
      cancelled_reason: reason.trim(),
    }).eq("id", orderId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await logAudit({
      restaurantId,
      action: "cancel",
      entityType: "order",
      entityId: orderId,
      reason: reason.trim(),
    });
    toast.success("Commande annulée");
    setReason("");
    onOpenChange(false);
    onCancelled();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Annuler la commande</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">L'annulation est tracée dans le journal d'audit. Indiquez un motif clair.</p>
          <div className="space-y-2">
            <Label>Motif de l'annulation *</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Ex: client parti, erreur de saisie, double commande…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Retour</Button>
          <Button variant="destructive" onClick={submit} disabled={saving}>Confirmer l'annulation</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};