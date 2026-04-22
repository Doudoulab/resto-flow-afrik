import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Bell } from "lucide-react";
import { formatFCFA } from "@/lib/currency";
import { toast } from "sonner";
import { playNewOrderAlert } from "@/lib/audio/beep";

interface PublicOrderItem { menu_item_id: string; name: string; unit_price: number; quantity: number; }
interface PublicOrder {
  id: string; restaurant_id: string; table_number: string | null;
  customer_name: string | null; customer_phone: string | null;
  items: PublicOrderItem[]; total: number; notes: string | null; status: string; created_at: string;
}

const IncomingOrders = () => {
  const { restaurant } = useAuth();
  const [orders, setOrders] = useState<PublicOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!restaurant) return;
    const { data, error } = await supabase
      .from("public_orders")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .in("status", ["new", "accepted"])
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

  const accept = async (o: PublicOrder) => {
    if (!restaurant) return;
    // Create real order
    const { data: newOrder, error: orderErr } = await supabase
      .from("orders")
      .insert({
        restaurant_id: restaurant.id,
        table_number: o.table_number,
        notes: [o.customer_name && `Client: ${o.customer_name}`, o.customer_phone && `Tél: ${o.customer_phone}`, o.notes]
          .filter(Boolean).join(" | ") || null,
        total: o.total,
        status: "pending",
      })
      .select()
      .single();
    if (orderErr || !newOrder) { toast.error(orderErr?.message ?? "Erreur"); return; }

    const orderItems = o.items.map((it) => ({
      order_id: newOrder.id,
      menu_item_id: it.menu_item_id,
      name_snapshot: it.name,
      unit_price: it.unit_price,
      quantity: it.quantity,
    }));
    const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
    if (itemsErr) { toast.error(itemsErr.message); return; }

    await supabase.from("public_orders").update({ status: "accepted" }).eq("id", o.id);
    toast.success(`Commande acceptée — n° ${newOrder.order_number}`);
    load();
  };

  const reject = async (o: PublicOrder) => {
    if (!confirm("Refuser cette commande ?")) return;
    await supabase.from("public_orders").update({ status: "rejected" }).eq("id", o.id);
    toast.success("Commande refusée");
    load();
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
                      {o.status === "new" ? "Nouveau" : "Accepté"}
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
                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={() => accept(o)}><Check className="mr-1 h-4 w-4" />Accepter</Button>
                      <Button variant="outline" onClick={() => reject(o)}><X className="h-4 w-4" /></Button>
                    </div>
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