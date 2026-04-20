import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { ShoppingCart, Plus, Minus, ChefHat, CheckCircle2 } from "lucide-react";
import { formatFCFA } from "@/lib/currency";
import { toast } from "sonner";

interface Restaurant { id: string; name: string; address: string | null; phone: string | null; }
interface Category { id: string; name: string; sort_order: number; }
interface MenuItem { id: string; name: string; description: string | null; price: number; category_id: string | null; }

const PublicMenu = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [params] = useSearchParams();
  const tableNumber = params.get("table") ?? "";

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!restaurantId) return;
      const [r, c, m] = await Promise.all([
        supabase.from("restaurants").select("id,name,address,phone").eq("id", restaurantId).maybeSingle(),
        supabase.from("menu_categories").select("*").eq("restaurant_id", restaurantId).order("sort_order"),
        supabase.from("menu_items").select("*").eq("restaurant_id", restaurantId).eq("is_available", true).order("name"),
      ]);
      setRestaurant(r.data as Restaurant | null);
      setCategories((c.data ?? []) as Category[]);
      setItems((m.data ?? []) as MenuItem[]);
      setLoading(false);
    };
    load();
  }, [restaurantId]);

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    items.forEach((i) => {
      const k = i.category_id ?? "_none";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(i);
    });
    return map;
  }, [items]);

  const total = useMemo(() => {
    return Object.entries(cart).reduce((s, [id, q]) => {
      const it = items.find((i) => i.id === id);
      return s + (it ? Number(it.price) * q : 0);
    }, 0);
  }, [cart, items]);

  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0);

  const inc = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const dec = (id: string) => setCart((c) => {
    const next = (c[id] ?? 0) - 1;
    const cp = { ...c };
    if (next <= 0) delete cp[id]; else cp[id] = next;
    return cp;
  });

  const submit = async () => {
    if (cartCount === 0) { toast.error("Votre panier est vide"); return; }
    if (!restaurantId) return;
    setSubmitting(true);
    const orderItems = Object.entries(cart).map(([id, qty]) => {
      const it = items.find((i) => i.id === id)!;
      return { menu_item_id: id, name: it.name, unit_price: Number(it.price), quantity: qty };
    });
    const { error } = await supabase.from("public_orders").insert({
      restaurant_id: restaurantId,
      table_number: tableNumber || null,
      customer_name: name.trim() || null,
      customer_phone: phone.trim() || null,
      items: orderItems,
      total,
      notes: notes.trim() || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    setSubmitted(true);
    setCart({});
    setCartOpen(false);
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Chargement…</div>;
  }

  if (!restaurant) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Restaurant introuvable.</div>;
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-600" />
        <h1 className="text-2xl font-bold">Commande envoyée !</h1>
        <p className="text-muted-foreground max-w-sm">
          Le restaurant a bien reçu votre commande{tableNumber && ` (table ${tableNumber})`}. Un serveur va vous l'apporter.
        </p>
        <Button onClick={() => setSubmitted(false)}>Passer une autre commande</Button>
      </div>
    );
  }

  const orderedCategories = [
    ...categories,
    ...(itemsByCategory.has("_none") ? [{ id: "_none", name: "Autres", sort_order: 999 }] : []),
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 border-b bg-card px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <ChefHat className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1 overflow-hidden">
            <h1 className="truncate font-semibold">{restaurant.name}</h1>
            {tableNumber && <p className="text-xs text-muted-foreground">Table {tableNumber}</p>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 p-4">
        {orderedCategories.map((cat) => {
          const list = itemsByCategory.get(cat.id) ?? [];
          if (list.length === 0) return null;
          return (
            <section key={cat.id}>
              <h2 className="mb-2 text-lg font-semibold">{cat.name}</h2>
              <div className="space-y-2">
                {list.map((it) => {
                  const qty = cart[it.id] ?? 0;
                  return (
                    <Card key={it.id}>
                      <CardContent className="flex items-center gap-3 p-3">
                        <div className="flex-1 overflow-hidden">
                          <p className="font-medium">{it.name}</p>
                          {it.description && <p className="line-clamp-2 text-sm text-muted-foreground">{it.description}</p>}
                          <p className="mt-1 font-semibold text-primary">{formatFCFA(it.price)}</p>
                        </div>
                        {qty === 0 ? (
                          <Button size="sm" onClick={() => inc(it.id)}><Plus className="h-4 w-4" /></Button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Button size="icon" variant="outline" onClick={() => dec(it.id)}><Minus className="h-4 w-4" /></Button>
                            <span className="w-6 text-center font-semibold">{qty}</span>
                            <Button size="icon" onClick={() => inc(it.id)}><Plus className="h-4 w-4" /></Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}
        {items.length === 0 && (
          <p className="text-center text-muted-foreground">Aucun plat disponible pour le moment.</p>
        )}
      </main>

      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card p-3 shadow-lg">
          <div className="mx-auto max-w-2xl">
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button className="w-full" size="lg">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Voir le panier ({cartCount}) — {formatFCFA(total)}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
                <SheetHeader><SheetTitle>Votre commande</SheetTitle></SheetHeader>
                <div className="space-y-3 py-4">
                  {Object.entries(cart).map(([id, qty]) => {
                    const it = items.find((i) => i.id === id);
                    if (!it) return null;
                    return (
                      <div key={id} className="flex items-center gap-3">
                        <div className="flex-1">
                          <p className="font-medium">{it.name}</p>
                          <p className="text-sm text-muted-foreground">{formatFCFA(it.price)} × {qty}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="icon" variant="outline" onClick={() => dec(id)}><Minus className="h-4 w-4" /></Button>
                          <span className="w-6 text-center">{qty}</span>
                          <Button size="icon" onClick={() => inc(id)}><Plus className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-between border-t pt-3 text-lg font-bold">
                    <span>Total</span><span>{formatFCFA(total)}</span>
                  </div>
                  <div className="space-y-2 pt-2">
                    {!tableNumber && (
                      <Badge variant="outline">Aucune table sélectionnée — pensez à indiquer votre place au serveur.</Badge>
                    )}
                    <Input placeholder="Votre nom (optionnel)" value={name} onChange={(e) => setName(e.target.value)} />
                    <Input placeholder="Téléphone (optionnel)" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    <Textarea placeholder="Notes pour la cuisine (allergies, cuissons…)" value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                </div>
                <SheetFooter>
                  <Button className="w-full" size="lg" onClick={submit} disabled={submitting}>
                    {submitting ? "Envoi…" : "Envoyer la commande"}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicMenu;