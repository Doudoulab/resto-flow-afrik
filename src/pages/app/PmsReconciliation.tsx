import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Hotel, Loader2, CheckCircle2, AlertCircle, Send, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatFCFA } from "@/lib/currency";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface Order {
  id: string; invoice_number: string | null; created_at: string;
  room_number: string | null; guest_name: string | null; total: number;
  pms_export_status: string | null; pms_room_charge_id: string | null;
  pms_confirmed_at: string | null;
}
interface SyncLog {
  id: string; order_id: string; sync_status: string; sync_direction: string;
  external_ref: string | null; room_number: string | null;
  error_message: string | null; created_at: string; confirmed_at: string | null;
}

const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "En attente", variant: "outline" },
  sent: { label: "Envoyé", variant: "secondary" },
  confirmed: { label: "Confirmé PMS", variant: "default" },
  failed: { label: "Échec", variant: "destructive" },
  none: { label: "Non synchronisé", variant: "outline" },
};

const PmsReconciliation = () => {
  const { restaurant } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [logs, setLogs] = useState<Record<string, SyncLog[]>>({});
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [active, setActive] = useState<Order | null>(null);
  const [externalRef, setExternalRef] = useState("");

  const load = async () => {
    if (!restaurant) return;
    setLoading(true);
    const { data: o } = await supabase
      .from("orders")
      .select("id,invoice_number,created_at,room_number,guest_name,total,pms_export_status,pms_room_charge_id,pms_confirmed_at")
      .eq("restaurant_id", restaurant.id)
      .eq("payment_method", "room_charge")
      .order("created_at", { ascending: false })
      .limit(100);
    setOrders((o ?? []) as Order[]);

    const ids = (o ?? []).map((x) => x.id);
    if (ids.length > 0) {
      const { data: l } = await supabase
        .from("pms_sync_log").select("*").in("order_id", ids).order("created_at", { ascending: false });
      const map: Record<string, SyncLog[]> = {};
      (l ?? []).forEach((row) => {
        const r = row as SyncLog;
        (map[r.order_id] ||= []).push(r);
      });
      setLogs(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [restaurant?.id]);

  const sendToPms = async (o: Order) => {
    if (!restaurant) return;
    const { error } = await supabase.from("pms_sync_log").insert({
      restaurant_id: restaurant.id, order_id: o.id,
      pms_provider: "manual", room_number: o.room_number,
      sync_status: "sent", sync_direction: "outbound",
      payload: { invoice: o.invoice_number, total: o.total, room: o.room_number, guest: o.guest_name },
    });
    if (error) { toast.error(error.message); return; }
    await supabase.from("orders").update({
      pms_export_status: "sent", pms_exported_at: new Date().toISOString(),
    }).eq("id", o.id);
    toast.success("Envoyé au PMS — en attente confirmation");
    load();
  };

  const openConfirm = (o: Order) => {
    setActive(o);
    setExternalRef(o.pms_room_charge_id ?? "");
    setConfirmOpen(true);
  };

  const confirmReconciliation = async () => {
    if (!restaurant || !active) return;
    if (!externalRef.trim()) { toast.error("Référence PMS requise"); return; }
    const now = new Date().toISOString();
    const { error: e1 } = await supabase.from("orders").update({
      pms_room_charge_id: externalRef.trim(),
      pms_confirmed_at: now,
      pms_export_status: "confirmed",
    }).eq("id", active.id);
    if (e1) { toast.error(e1.message); return; }
    await supabase.from("pms_sync_log").insert({
      restaurant_id: restaurant.id, order_id: active.id,
      pms_provider: "manual", external_ref: externalRef.trim(),
      room_number: active.room_number, sync_status: "confirmed",
      sync_direction: "inbound", confirmed_at: now,
    });
    toast.success("Réconciliation confirmée");
    setConfirmOpen(false); setActive(null);
    load();
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Hotel className="h-7 w-7 text-primary" /> Réconciliation PMS
          </h1>
          <p className="text-sm text-muted-foreground">Suivi des charges chambres envoyées au PMS hôtelier (Opera, Mews, Cloudbeds…).</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Actualiser</Button>
      </div>

      {orders.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Aucune commande "facturation chambre". Sélectionnez "Room charge" comme moyen de paiement sur une addition pour la voir ici.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {orders.map((o) => {
            const status = o.pms_export_status ?? "none";
            const meta = STATUS_META[status] ?? STATUS_META.none;
            const orderLogs = logs[o.id] ?? [];
            return (
              <Card key={o.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {o.invoice_number ?? `Commande ${o.id.slice(0, 8)}`}
                        <span className="text-muted-foreground font-normal text-sm ml-2">
                          {format(parseISO(o.created_at), "d MMM yyyy HH:mm", { locale: fr })}
                        </span>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Chambre <strong>{o.room_number ?? "—"}</strong>
                        {o.guest_name && ` · ${o.guest_name}`}
                        {o.pms_room_charge_id && ` · réf PMS ${o.pms_room_charge_id}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary text-lg">{formatFCFA(o.total)}</p>
                      <Badge variant={meta.variant} className="mt-1">{meta.label}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {status === "none" || status === "pending" ? (
                      <Button size="sm" onClick={() => sendToPms(o)}>
                        <Send className="mr-2 h-4 w-4" />Envoyer au PMS
                      </Button>
                    ) : null}
                    {status !== "confirmed" && (
                      <Button size="sm" variant="outline" onClick={() => openConfirm(o)}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />Confirmer réception
                      </Button>
                    )}
                  </div>
                  {orderLogs.length > 0 && (
                    <div className="mt-3 space-y-1 border-t pt-2">
                      {orderLogs.slice(0, 3).map((l) => (
                        <div key={l.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                          {l.sync_status === "failed" ? <AlertCircle className="h-3 w-3 text-destructive" /> : <CheckCircle2 className="h-3 w-3 text-success" />}
                          {format(parseISO(l.created_at), "HH:mm", { locale: fr })}
                          {" · "}{l.sync_direction === "outbound" ? "→ PMS" : "← PMS"}
                          {" · "}{l.sync_status}
                          {l.external_ref && ` · ref ${l.external_ref}`}
                          {l.error_message && ` · ${l.error_message}`}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer réconciliation PMS</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Saisissez l'identifiant de la charge créée côté PMS (Opera, Mews, etc.) pour réconcilier cette addition.
            </p>
            <div>
              <Label>Référence PMS *</Label>
              <Input value={externalRef} onChange={(e) => setExternalRef(e.target.value)} placeholder="EXT-12345 ou ID Opera/Mews" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Annuler</Button>
            <Button onClick={confirmReconciliation}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PmsReconciliation;