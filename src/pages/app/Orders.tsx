import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Minus, Printer, ChefHat, Smartphone } from "lucide-react";
import { formatFCFA } from "@/lib/currency";
import { KitchenTicket, CustomerReceipt } from "@/components/print/KitchenTicket";
import { PrintStyles } from "@/components/print/PrintStyles";
import { MobileMoneyDialog } from "@/components/payments/MobileMoneyDialog";

type OrderStatus = "pending" | "preparing" | "ready" | "served" | "paid" | "cancelled";

interface MenuItem { id: string; name: string; price: number; is_available: boolean; }
interface Order {
  id: string;
  order_number: number;
  table_number: string | null;
  status: OrderStatus;
  total: number;
  notes: string | null;
  created_at: string;
}
interface OrderItem {
  id: string;
  name_snapshot: string;
  unit_price: number;
  quantity: number;
}
interface CartLine { menu_item_id: string; name: string; price: number; quantity: number; }

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "En attente",
  preparing: "En préparation",
  ready: "Prête",
  served: "Servie",
  paid: "Payée",
  cancelled: "Annulée",
};
const STATUS_VARIANT: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  preparing: "default",
  ready: "secondary",
  served: "secondary",
  paid: "default",
  cancelled: "destructive",
};

const Orders = () => {
  const { restaurant, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);

  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [detailItems, setDetailItems] = useState<OrderItem[]>([]);
  const [printMode, setPrintMode] = useState<"kitchen" | "receipt" | null>(null);
  const [mobileMoneyOpen, setMobileMoneyOpen] = useState(false);
  const lastSeenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Short notification beep (base64 wav, ~150ms)
    audioRef.current = new Audio(
      "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="
    );
  }, []);

  const load = async () => {
    if (!restaurant) return;
    const [oRes, mRes] = await Promise.all([
      supabase.from("orders").select("*").eq("restaurant_id", restaurant.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("menu_items").select("id, name, price, is_available").eq("restaurant_id", restaurant.id).eq("is_available", true).order("name"),
    ]);
    const incoming = (oRes.data ?? []) as Order[];
    if (initializedRef.current) {
      // Detect new pending orders not previously seen
      const newOnes = incoming.filter(
        (o) => !lastSeenIdsRef.current.has(o.id) && o.status === "pending"
      );
      if (newOnes.length > 0) {
        toast.success(`🔔 Nouvelle commande #${newOnes[0].order_number}${newOnes[0].table_number ? ` — Table ${newOnes[0].table_number}` : ""}`);
        try { audioRef.current?.play().catch(() => {}); } catch {}
      }
    }
    lastSeenIdsRef.current = new Set(incoming.map((o) => o.id));
    initializedRef.current = true;
    setOrders(incoming);
    setMenu((mRes.data ?? []) as MenuItem[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [restaurant]);

  // realtime
  useEffect(() => {
    if (!restaurant) return;
    const channel = supabase.channel(`orders-${restaurant.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurant.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [restaurant]);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menu_item_id === item.id);
      if (existing) return prev.map((c) => c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menu_item_id: item.id, name: item.name, price: Number(item.price), quantity: 1 }];
    });
  };
  const incrementCart = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => c.menu_item_id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c)
        .filter((c) => c.quantity > 0)
    );
  };
  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  const submitOrder = async () => {
    if (!restaurant || cart.length === 0) return;
    const { data: order, error: orderErr } = await supabase.from("orders").insert({
      restaurant_id: restaurant.id,
      table_number: tableNumber || null,
      notes: notes || null,
      total: cartTotal,
      created_by: user?.id,
      status: "pending" as OrderStatus,
    }).select().single();

    if (orderErr || !order) { toast.error(orderErr?.message || "Erreur"); return; }

    const lines = cart.map((c) => ({
      order_id: order.id,
      menu_item_id: c.menu_item_id,
      name_snapshot: c.name,
      unit_price: c.price,
      quantity: c.quantity,
    }));
    const { error: liErr } = await supabase.from("order_items").insert(lines);
    if (liErr) { toast.error(liErr.message); return; }

    toast.success(`Commande #${order.order_number} créée`);
    setCart([]); setTableNumber(""); setNotes("");
    setNewOrderOpen(false);
    load();
  };

  const updateStatus = async (id: string, status: OrderStatus) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Statut mis à jour");
    load();
  };

  const openDetail = async (order: Order) => {
    setDetailOrder(order);
    const { data } = await supabase.from("order_items").select("*").eq("order_id", order.id);
    setDetailItems((data ?? []) as OrderItem[]);
  };

  const handlePrint = (mode: "kitchen" | "receipt") => {
    setPrintMode(mode);
    // Wait for ticket render
    setTimeout(() => {
      window.print();
      setPrintMode(null);
    }, 100);
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Commandes</h1>
          <p className="mt-1 text-muted-foreground">Suivi en temps réel des commandes du restaurant.</p>
        </div>
        <Button onClick={() => setNewOrderOpen(true)}><Plus className="mr-2 h-4 w-4" />Nouvelle commande</Button>
      </div>

      {orders.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Aucune commande pour l'instant. Créez la première !
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {orders.map((o) => (
            <Card key={o.id} className="cursor-pointer shadow-sm transition-all hover:shadow-md" onClick={() => openDetail(o)}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-bold">#{o.order_number}</span>
                  <Badge variant={STATUS_VARIANT[o.status]}>{STATUS_LABEL[o.status]}</Badge>
                </div>
                {o.table_number && <p className="text-sm text-muted-foreground">Table {o.table_number}</p>}
                <p className="mt-2 text-lg font-bold text-primary">{formatFCFA(o.total)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New order dialog */}
      <Dialog open={newOrderOpen} onOpenChange={setNewOrderOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>Nouvelle commande</DialogTitle></DialogHeader>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-3 font-semibold">Plats disponibles</h3>
              {menu.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun plat disponible. Ajoutez-en dans le menu.</p>
              ) : (
                <div className="max-h-96 space-y-1.5 overflow-y-auto pr-1">
                  {menu.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => addToCart(m)}
                      className="flex w-full items-center justify-between rounded-md border border-border bg-card p-3 text-left transition-colors hover:bg-accent"
                    >
                      <span className="font-medium">{m.name}</span>
                      <span className="text-sm text-primary">{formatFCFA(m.price)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h3 className="mb-3 font-semibold">Panier ({cart.length})</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="N° table" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} />
                </div>
                {cart.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Cliquez sur un plat pour l'ajouter.</p>
                ) : (
                  <div className="max-h-60 space-y-2 overflow-y-auto">
                    {cart.map((c) => (
                      <div key={c.menu_item_id} className="flex items-center gap-2 rounded-md border border-border p-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{formatFCFA(c.price)}</p>
                        </div>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => incrementCart(c.menu_item_id, -1)}><Minus className="h-3 w-3" /></Button>
                        <span className="w-6 text-center text-sm font-bold">{c.quantity}</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => incrementCart(c.menu_item_id, 1)}><Plus className="h-3 w-3" /></Button>
                      </div>
                    ))}
                  </div>
                )}
                <Textarea placeholder="Notes (optionnel)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="font-medium">Total</span>
                  <span className="text-xl font-bold text-primary">{formatFCFA(cartTotal)}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOrderOpen(false)}>Annuler</Button>
            <Button onClick={submitOrder} disabled={cart.length === 0}>Valider la commande</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail */}
      <Dialog open={!!detailOrder} onOpenChange={(o) => !o && setDetailOrder(null)}>
        {detailOrder && (
          <DialogContent>
            <DialogHeader><DialogTitle>Commande #{detailOrder.order_number}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {detailOrder.table_number && <p className="text-sm">Table : <span className="font-medium">{detailOrder.table_number}</span></p>}
              <div className="space-y-1.5">
                {detailItems.map((it) => (
                  <div key={it.id} className="flex justify-between rounded-md bg-muted px-3 py-2 text-sm">
                    <span>{it.quantity}× {it.name_snapshot}</span>
                    <span className="font-medium">{formatFCFA(Number(it.unit_price) * it.quantity)}</span>
                  </div>
                ))}
              </div>
              {detailOrder.notes && <p className="rounded-md bg-accent p-3 text-sm text-accent-foreground">{detailOrder.notes}</p>}
              <div className="flex justify-between border-t border-border pt-3">
                <span className="font-medium">Total</span>
                <span className="text-lg font-bold text-primary">{formatFCFA(detailOrder.total)}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handlePrint("kitchen")}>
                  <ChefHat className="mr-2 h-4 w-4" /> Ticket cuisine
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handlePrint("receipt")}>
                  <Printer className="mr-2 h-4 w-4" /> Addition client
                </Button>
              </div>
              {detailOrder.status !== "paid" && detailOrder.status !== "cancelled" && (
                <Button className="w-full" onClick={() => setMobileMoneyOpen(true)}>
                  <Smartphone className="mr-2 h-4 w-4" /> Encaisser via Mobile Money
                </Button>
              )}
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={detailOrder.status} onValueChange={(v) => updateStatus(detailOrder.id, v as OrderStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      <PrintStyles />
      {printMode === "kitchen" && detailOrder && (
        <KitchenTicket
          orderNumber={detailOrder.order_number}
          tableNumber={detailOrder.table_number}
          notes={detailOrder.notes}
          items={detailItems.map(i => ({ name_snapshot: i.name_snapshot, quantity: i.quantity }))}
          createdAt={detailOrder.created_at}
        />
      )}
      {printMode === "receipt" && detailOrder && restaurant && (
        <CustomerReceipt
          orderNumber={detailOrder.order_number}
          tableNumber={detailOrder.table_number}
          items={detailItems}
          total={detailOrder.total}
          restaurantName={restaurant.name}
          restaurantAddress={restaurant.address}
          restaurantPhone={restaurant.phone}
          createdAt={detailOrder.created_at}
        />
      )}

      {detailOrder && restaurant && (
        <MobileMoneyDialog
          open={mobileMoneyOpen}
          onOpenChange={setMobileMoneyOpen}
          restaurantId={restaurant.id}
          orderId={detailOrder.id}
          amount={Number(detailOrder.total)}
          onPaid={() => {
            setMobileMoneyOpen(false);
            updateStatus(detailOrder.id, "paid");
          }}
        />
      )}
    </div>
  );
};

export default Orders;
