import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Bell, PackageCheck, Utensils, Flame, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatFCFA } from "@/lib/currency";
import { toast } from "sonner";
import { playNewOrderAlert } from "@/lib/audio/beep";
import { computeTotals } from "@/lib/orders/totals";

interface PublicOrderItem { menu_item_id: string; name: string; unit_price: number; quantity: number; }
interface PublicOrder {
  id: string; restaurant_id: string; table_number: string | null;
  customer_name: string | null; customer_phone: string | null;
  items: PublicOrderItem[]; total: number; notes: string | null; status: string; created_at: string;
  converted_order_id?: string | null;
}

const IncomingOrders = () => {
  const { restaurant } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PublicOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!restaurant) return;
    const { data, error } = await supabase
      .from("public_orders")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .in("status", ["new", "accepted", "preparing", "ready"])
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setOrders((data ?? []) as unknown as PublicOrder[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!restaurant) return;
    const channel = supabase
      .channel("public_orders_admin")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "public_orders", filter: `restaurant_id=eq.${restaurant.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            toast.success("🔔 Nouvelle commande client !");
            playNewOrderAlert();
          }
          load();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [restaurant?.id]);

  const accept = async (o: PublicOrder, sendToKitchen = false) => {
    if (!restaurant) return;
    const { data: resto } = await supabase.from("restaurants")
      .select("default_vat_rate, vat_mode, default_service_pct")
      .eq("id", restaurant.id).maybeSingle();
    const vatRate = Number(resto?.default_vat_rate ?? 18);
    const totals = computeTotals({
      lines: o.items.map((it) => ({ quantity: it.quantity, unit_price: it.unit_price, vat_rate: vatRate })),
      vatMode: (resto?.vat_mode as "inclusive" | "exclusive") ?? "exclusive",
      defaultVatRate: vatRate,
      servicePct: Number(resto?.default_service_pct ?? 0),
      orderDiscountAmount: 0,
      tipAmount: 0,
    });
    // Create real order
    const { data: newOrder, error: orderErr } = await supabase
      .from("orders")
      .insert({
        restaurant_id: restaurant.id,
        table_number: o.table_number,
        notes: [o.customer_name && `Client: ${o.customer_name}`, o.customer_phone && `Tél: ${o.customer_phone}`, o.notes]
          .filter(Boolean).join(" | ") || null,
        subtotal: totals.subtotal,
        tax_amount: totals.taxAmount,
        service_amount: totals.serviceAmount,
        tip_amount: 0,
        discount_amount: 0,
        total: totals.total,
        status: sendToKitchen ? "preparing" : "pending",
      })
      .select()
      .single();
    if (orderErr || !newOrder) { toast.error(orderErr?.message ?? "Erreur"); return; }

    const orderItems = await Promise.all(o.items.map(async (it) => {
      const { data: mi } = await supabase.from("menu_items")
        .select("station_id, category_id, menu_categories(station_id)")
        .eq("id", it.menu_item_id).maybeSingle();
      const stationId = (mi?.station_id as string | null) ?? ((mi?.menu_categories as { station_id?: string } | null)?.station_id ?? null);
      return {
        order_id: newOrder.id,
        menu_item_id: it.menu_item_id,
        name_snapshot: it.name,
        unit_price: it.unit_price,
        quantity: it.quantity,
        vat_rate: vatRate,
        station_id: stationId,
        fired_at: sendToKitchen ? new Date().toISOString() : null,
      };
    }));
    const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
    if (itemsErr) { toast.error(itemsErr.message); return; }

    await supabase.from("public_orders").update({ status: sendToKitchen ? "preparing" : "accepted", converted_order_id: newOrder.id } as never).eq("id", o.id);
    toast.success(sendToKitchen ? `Commande #${newOrder.order_number} envoyée en cuisine` : `Commande acceptée — n° ${newOrder.order_number}`);
    load();
  };

  const reject = async (o: PublicOrder) => {
    if (!confirm("Refuser cette commande ?")) return;
    await supabase.from("public_orders").update({ status: "rejected" }).eq("id", o.id);
    toast.success("Commande refusée");
    load();
  };

  const advance = async (o: PublicOrder, next: string, label: string) => {
    const { error } = await supabase.from("public_orders").update({ status: next }).eq("id", o.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Statut: ${label}`);
    load();
  };

  const sendExistingToKitchen = async (o: PublicOrder) => {
    if (!o.converted_order_id) return accept(o, true);
    const firedAt = new Date().toISOString();
    const { error: itemsErr } = await supabase.from("order_items")
      .update({ fired_at: firedAt })
      .eq("order_id", o.converted_order_id)
      .is("fired_at", null);
    if (itemsErr) { toast.error(itemsErr.message); return; }
    await supabase.from("orders").update({ status: "preparing" }).eq("id", o.converted_order_id);
    await supabase.from("public_orders").update({ status: "preparing" }).eq("id", o.id);
    toast.success("Commande envoyée en cuisine");
    load();
  };

  const markReady = async (o: PublicOrder) => {
    if (o.converted_order_id) {
      await supabase.from("order_items").update({ status: "ready" }).eq("order_id", o.converted_order_id).neq("status", "cancelled");
      await supabase.from("orders").update({ status: "ready" }).eq("id", o.converted_order_id);
    }
    await advance(o, "ready", "Prête");
  };

  const markServed = async (o: PublicOrder) => {
    if (o.converted_order_id) await supabase.from("orders").update({ status: "served" }).eq("id", o.converted_order_id);
    await advance(o, "delivered", "Servie");
  };

  const STATUS_LABEL: Record<string, string> = {
    new: "Nouveau",
    accepted: "Envoyée en cuisine",
    preparing: "En préparation",
    ready: "Prête",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold"><Bell className="h-7 w-7" />Commandes clients (QR)</h1>
        <p className="text-sm text-muted-foreground">Commandes envoyées par les clients depuis leur téléphone</p>
      </div>

      {loading ? <p className="text-muted-foreground">Chargement…</p> :
        orders.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Aucune commande en attente.</CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {orders.map((o) => (
              <Card key={o.id} className={o.status === "new" ? "border-primary" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {o.table_number ? `Table ${o.table_number}` : "Sans table"}
                    </CardTitle>
                    <Badge variant={o.status === "new" ? "default" : "secondary"}>
                      {STATUS_LABEL[o.status] ?? o.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString("fr-FR")}
                    {o.customer_name && ` • ${o.customer_name}`}
                    {o.customer_phone && ` • ${o.customer_phone}`}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="space-y-1 text-sm">
                    {o.items.map((it, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{it.quantity}× {it.name}</span>
                        <span className="text-muted-foreground">{formatFCFA(it.unit_price * it.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                  {o.notes && <p className="rounded bg-muted p-2 text-xs italic">{o.notes}</p>}
                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <span>Total</span><span>{formatFCFA(o.total)}</span>
                  </div>
                  {o.status === "new" && (
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <Button className="min-w-0" onClick={() => accept(o, true)}><Flame className="mr-1 h-4 w-4" />Accepter + cuisine</Button>
                      <Button variant="outline" onClick={() => reject(o)}><X className="h-4 w-4" /></Button>
                    </div>
                  )}
                  {o.status === "accepted" && (
                    <Button className="w-full" variant="secondary" onClick={() => sendExistingToKitchen(o)}>
                      <Utensils className="mr-2 h-4 w-4" /> Envoyer en cuisine
                    </Button>
                  )}
                  {o.status === "preparing" && (
                    <Button className="w-full" variant="secondary" onClick={() => markReady(o)}>
                      <PackageCheck className="mr-2 h-4 w-4" /> Marquer prête
                    </Button>
                  )}
                  {o.status === "ready" && (
                    <Button className="w-full" onClick={() => markServed(o)}>
                      <Check className="mr-2 h-4 w-4" /> Marquer servie
                    </Button>
                  )}
                  {o.converted_order_id && (
                    <Button className="w-full" variant="outline" onClick={() => navigate(`/app/orders?order=${o.converted_order_id}`)}>
                      <CreditCard className="mr-2 h-4 w-4" /> Ouvrir pour encaisser
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      }
    </div>
  );
};

export default IncomingOrders;