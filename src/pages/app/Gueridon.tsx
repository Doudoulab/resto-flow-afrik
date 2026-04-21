import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ChefHat, Plus, Minus, Check, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatFCFA } from "@/lib/currency";

interface MenuItem { id: string; name: string; price: number; category_id: string | null; is_available: boolean; }
interface Category { id: string; name: string; sort_order: number; }
interface Table { id: string; label: string; status: string; }
interface CartLine { menu_item_id: string; name: string; price: number; quantity: number; allergy: boolean; note: string; }

const Gueridon = () => {
  const { restaurant, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [activeCat, setActiveCat] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [tableNumber, setTableNumber] = useState<string>("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!restaurant) return;
    Promise.all([
      supabase.from("menu_items").select("id,name,price,category_id,is_available").eq("restaurant_id", restaurant.id).eq("is_available", true).order("name"),
      supabase.from("menu_categories").select("id,name,sort_order").eq("restaurant_id", restaurant.id).order("sort_order"),
      supabase.from("restaurant_tables").select("id,label,status").eq("restaurant_id", restaurant.id).order("sort_order"),
    ]).then(([i, c, t]) => {
      setItems((i.data ?? []) as MenuItem[]);
      setCats((c.data ?? []) as Category[]);
      setTables((t.data ?? []) as Table[]);
      setLoading(false);
    });
  }, [restaurant?.id]);

  const filtered = items.filter((it) => {
    if (activeCat !== "all" && it.category_id !== activeCat) return false;
    if (search && !it.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const addItem = (it: MenuItem) => {
    setCart((p) => {
      const idx = p.findIndex((l) => l.menu_item_id === it.id);
      if (idx >= 0) {
        const next = [...p];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...p, { menu_item_id: it.id, name: it.name, price: it.price, quantity: 1, allergy: false, note: "" }];
    });
  };
  const decItem = (id: string) => setCart((p) => p.flatMap((l) => l.menu_item_id === id ? (l.quantity > 1 ? [{ ...l, quantity: l.quantity - 1 }] : []) : [l]));
  const removeLine = (id: string) => setCart((p) => p.filter((l) => l.menu_item_id !== id));
  const toggleAllergy = (id: string) => setCart((p) => p.map((l) => l.menu_item_id === id ? { ...l, allergy: !l.allergy } : l));
  const setNote = (id: string, note: string) => setCart((p) => p.map((l) => l.menu_item_id === id ? { ...l, note } : l));

  const total = cart.reduce((s, l) => s + l.price * l.quantity, 0);

  const send = async () => {
    if (!restaurant || !user) return;
    if (cart.length === 0) { toast.error("Ajoutez au moins un plat"); return; }
    if (!tableNumber) { toast.error("Sélectionnez une table"); return; }
    setSending(true);
    try {
      const { data: order, error: e1 } = await supabase.from("orders").insert({
        restaurant_id: restaurant.id,
        table_number: tableNumber,
        status: "pending",
        created_by: user.id,
        subtotal: total,
        total,
      }).select().single();
      if (e1 || !order) throw e1 ?? new Error("create order");

      const lines = cart.map((l) => ({
        order_id: order.id,
        menu_item_id: l.menu_item_id,
        name_snapshot: l.name,
        quantity: l.quantity,
        unit_price: l.price,
        is_allergy_alert: l.allergy,
        special_request: l.note || null,
      }));
      const { error: e2 } = await supabase.from("order_items").insert(lines);
      if (e2) throw e2;

      toast.success(`Commande envoyée — table ${tableNumber}`);
      setCart([]); setTableNumber("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ChefHat className="h-6 w-6 text-primary" /> Service guéridon
          </h1>
          <p className="text-sm text-muted-foreground">Prise de commande tactile au guéridon — discret, rapide.</p>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 h-10 text-base" placeholder="Rechercher un plat…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1">
          <Button size="sm" variant={activeCat === "all" ? "default" : "outline"} onClick={() => setActiveCat("all")}>Tout</Button>
          {cats.map((c) => (
            <Button key={c.id} size="sm" variant={activeCat === c.id ? "default" : "outline"} onClick={() => setActiveCat(c.id)} className="shrink-0">
              {c.name}
            </Button>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {filtered.map((it) => (
            <button
              key={it.id}
              onClick={() => addItem(it)}
              className="text-left rounded-lg border bg-card p-3 hover:border-primary hover:bg-accent transition-colors active:scale-[0.98]"
            >
              <p className="font-medium leading-tight">{it.name}</p>
              <p className="text-primary font-bold mt-1">{formatFCFA(it.price)}</p>
            </button>
          ))}
          {filtered.length === 0 && <p className="col-span-full text-center text-sm text-muted-foreground py-8">Aucun plat trouvé.</p>}
        </div>
      </div>

      <Card className="lg:sticky lg:top-4 h-fit">
        <CardContent className="p-3 space-y-3">
          <div>
            <label className="text-xs font-medium">Table</label>
            <div className="flex flex-wrap gap-1 mt-1">
              {tables.length === 0 ? (
                <Input value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} placeholder="Numéro de table" />
              ) : tables.map((t) => (
                <Button key={t.id} size="sm" variant={tableNumber === t.label ? "default" : "outline"} onClick={() => setTableNumber(t.label)}>
                  {t.label}
                  {t.status === "occupied" && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-destructive inline-block" />}
                </Button>
              ))}
            </div>
          </div>

          <div className="border-t pt-2">
            <p className="text-xs font-medium mb-2">Panier ({cart.length})</p>
            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Touchez un plat pour l'ajouter.</p>
            ) : (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {cart.map((l) => (
                  <div key={l.menu_item_id} className="rounded border p-2 text-sm space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex-1 font-medium">{l.name}</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => decItem(l.menu_item_id)}><Minus className="h-3 w-3" /></Button>
                      <Badge variant="secondary">{l.quantity}</Badge>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => addItem({ id: l.menu_item_id, name: l.name, price: l.price, category_id: null, is_available: true })}><Plus className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeLine(l.menu_item_id)}><X className="h-3 w-3" /></Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input value={l.note} onChange={(e) => setNote(l.menu_item_id, e.target.value)} placeholder="Note (saignant, sans oignon…)" className="h-7 text-xs" />
                      <Button size="icon" variant={l.allergy ? "destructive" : "ghost"} className="h-7 w-7 shrink-0" onClick={() => toggleAllergy(l.menu_item_id)} title="Alerte allergie">
                        <AlertTriangle className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-right">{formatFCFA(l.price * l.quantity)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t pt-2 flex items-center justify-between">
            <span className="font-medium">Total</span>
            <span className="text-xl font-bold text-primary">{formatFCFA(total)}</span>
          </div>

          <Button className="w-full h-12 text-base" onClick={send} disabled={sending || cart.length === 0 || !tableNumber}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Envoyer en cuisine
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Gueridon;