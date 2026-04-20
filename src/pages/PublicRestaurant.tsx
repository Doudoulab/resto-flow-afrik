import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { ShoppingCart, Plus, Minus, CheckCircle2, MapPin, Phone, Instagram, Facebook, Clock, ChefHat, MessageCircle } from "lucide-react";
import { formatFCFA } from "@/lib/currency";
import { toast } from "sonner";

interface PublicResto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  theme_color: string | null;
  opening_hours: Record<string, { open: string; close: string; closed?: boolean }> | null;
  currency: string;
  country_code: string;
  accepts_online_orders: boolean;
}
interface Category { id: string; name: string; sort_order: number }
interface MenuItem { id: string; name: string; description: string | null; price: number; category_id: string | null; image_url: string | null; sort_order: number }

const DAY_LABELS: Record<string, string> = {
  mon: "Lun", tue: "Mar", wed: "Mer", thu: "Jeu", fri: "Ven", sat: "Sam", sun: "Dim",
};
const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const PublicRestaurant = () => {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const tableNumber = params.get("table") ?? "";

  const [resto, setResto] = useState<PublicResto | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCat, setActiveCat] = useState<string>("");

  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhoneInput] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      const { data: rpcData } = await supabase.rpc("get_public_restaurant", { _slug: slug });
      const r = (rpcData ?? null) as unknown as PublicResto | null;
      if (!r || !r.id) { setLoading(false); return; }
      setResto(r);
      const [c, m] = await Promise.all([
        supabase.from("menu_categories").select("*").eq("restaurant_id", r.id).order("sort_order"),
        supabase.from("menu_items").select("id,name,description,price,category_id,image_url,sort_order").eq("restaurant_id", r.id).eq("is_available", true).order("sort_order").order("name"),
      ]);
      setCategories((c.data ?? []) as Category[]);
      setItems((m.data ?? []) as MenuItem[]);
      setLoading(false);
    };
    load();
  }, [slug]);

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    items.forEach((i) => {
      const k = i.category_id ?? "_none";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(i);
    });
    return map;
  }, [items]);

  const orderedCategories = useMemo(() => [
    ...categories,
    ...(itemsByCategory.has("_none") ? [{ id: "_none", name: "Autres", sort_order: 999 }] : []),
  ].filter((c) => (itemsByCategory.get(c.id) ?? []).length > 0), [categories, itemsByCategory]);

  const total = useMemo(() => Object.entries(cart).reduce((s, [id, q]) => {
    const it = items.find((i) => i.id === id);
    return s + (it ? Number(it.price) * q : 0);
  }, 0), [cart, items]);
  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0);

  const inc = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const dec = (id: string) => setCart((c) => {
    const next = (c[id] ?? 0) - 1;
    const cp = { ...c };
    if (next <= 0) delete cp[id]; else cp[id] = next;
    return cp;
  });

  const submit = async () => {
    if (!resto) return;
    if (cartCount === 0) { toast.error("Panier vide"); return; }
    if (name.trim().length > 80 || phone.trim().length > 20 || notes.trim().length > 500) {
      toast.error("Champs trop longs"); return;
    }
    setSubmitting(true);
    const orderItems = Object.entries(cart).map(([id, qty]) => {
      const it = items.find((i) => i.id === id)!;
      return { menu_item_id: id, name: it.name, unit_price: Number(it.price), quantity: qty };
    });
    const { error } = await supabase.from("public_orders").insert({
      restaurant_id: resto.id,
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
  if (!resto) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Restaurant introuvable.</div>;
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-600" />
        <h1 className="text-2xl font-bold">Commande envoyée !</h1>
        <p className="max-w-sm text-muted-foreground">
          {resto.name} a bien reçu votre commande{tableNumber && ` (table ${tableNumber})`}.
        </p>
        <Button onClick={() => setSubmitted(false)}>Nouvelle commande</Button>
      </div>
    );
  }

  const themeColor = resto.theme_color || "#16a34a";
  const styleVars = { "--brand": themeColor } as React.CSSProperties;

  return (
    <div className="min-h-screen bg-background pb-28" style={styleVars}>
      {/* Cover */}
      <div className="relative h-48 w-full overflow-hidden bg-muted sm:h-64">
        {resto.cover_url ? (
          <img src={resto.cover_url} alt={resto.name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}99)` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      {/* Header info */}
      <div className="mx-auto -mt-12 max-w-3xl px-4">
        <div className="flex items-end gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-2xl border-4 border-background bg-card shadow-lg sm:h-24 sm:w-24">
            {resto.logo_url ? (
              <img src={resto.logo_url} alt={`Logo ${resto.name}`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center" style={{ background: themeColor }}>
                <ChefHat className="h-10 w-10 text-white" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 pb-2">
            <h1 className="truncate text-2xl font-bold sm:text-3xl">{resto.name}</h1>
            {tableNumber && <Badge variant="secondary" className="mt-1">Table {tableNumber}</Badge>}
          </div>
        </div>

        {resto.description && (
          <p className="mt-4 text-sm text-muted-foreground">{resto.description}</p>
        )}

        {/* Contacts */}
        <div className="mt-4 flex flex-wrap gap-2">
          {resto.address && (
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(resto.address)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1.5 text-xs hover:bg-accent">
              <MapPin className="h-3.5 w-3.5" /> {resto.address}
            </a>
          )}
          {resto.phone && (
            <a href={`tel:${resto.phone}`} className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1.5 text-xs hover:bg-accent">
              <Phone className="h-3.5 w-3.5" /> {resto.phone}
            </a>
          )}
          {resto.whatsapp && (
            <a href={`https://wa.me/${resto.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1.5 text-xs hover:bg-accent">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>
          )}
          {resto.instagram_url && (
            <a href={resto.instagram_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1.5 text-xs hover:bg-accent">
              <Instagram className="h-3.5 w-3.5" /> Instagram
            </a>
          )}
          {resto.facebook_url && (
            <a href={resto.facebook_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1.5 text-xs hover:bg-accent">
              <Facebook className="h-3.5 w-3.5" /> Facebook
            </a>
          )}
        </div>

        {/* Hours */}
        {resto.opening_hours && Object.keys(resto.opening_hours).length > 0 && (
          <details className="mt-4 rounded-lg border bg-card p-3 text-sm">
            <summary className="flex cursor-pointer items-center gap-2 font-medium">
              <Clock className="h-4 w-4" /> Horaires d'ouverture
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
              {DAY_ORDER.map((k) => {
                const h = resto.opening_hours?.[k];
                if (!h) return null;
                return (
                  <div key={k} className="flex justify-between">
                    <span className="font-medium">{DAY_LABELS[k]}</span>
                    <span className="text-muted-foreground">{h.closed ? "Fermé" : `${h.open} – ${h.close}`}</span>
                  </div>
                );
              })}
            </div>
          </details>
        )}
      </div>

      {/* Category nav */}
      {orderedCategories.length > 1 && (
        <div className="sticky top-0 z-30 mt-6 border-y bg-background/95 backdrop-blur">
          <div className="mx-auto max-w-3xl overflow-x-auto px-4 py-2">
            <div className="flex gap-2">
              {orderedCategories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveCat(c.id);
                    document.getElementById(`cat-${c.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors ${activeCat === c.id ? "text-white" : "bg-card hover:bg-accent"}`}
                  style={activeCat === c.id ? { background: themeColor, borderColor: themeColor } : undefined}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Menu */}
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-6">
        {orderedCategories.map((cat) => {
          const list = itemsByCategory.get(cat.id) ?? [];
          return (
            <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-16">
              <h2 className="mb-3 text-xl font-bold">{cat.name}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {list.map((it) => {
                  const qty = cart[it.id] ?? 0;
                  return (
                    <Card key={it.id} className="overflow-hidden">
                      <div className="flex">
                        <div className="flex-1 p-3">
                          <p className="font-semibold">{it.name}</p>
                          {it.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{it.description}</p>}
                          <p className="mt-2 font-bold" style={{ color: themeColor }}>{formatFCFA(it.price)}</p>
                          <div className="mt-2">
                            {qty === 0 ? (
                              <Button size="sm" onClick={() => inc(it.id)} disabled={!resto.accepts_online_orders} style={{ background: themeColor }}>
                                <Plus className="mr-1 h-3 w-3" /> Ajouter
                              </Button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => dec(it.id)}><Minus className="h-3 w-3" /></Button>
                                <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                                <Button size="icon" className="h-8 w-8" onClick={() => inc(it.id)} style={{ background: themeColor }}><Plus className="h-3 w-3" /></Button>
                              </div>
                            )}
                          </div>
                        </div>
                        {it.image_url && (
                          <div className="h-28 w-28 flex-shrink-0 bg-muted">
                            <img src={it.image_url} alt={it.name} className="h-full w-full object-cover" />
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}
        {items.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">Aucun plat disponible pour le moment.</p>
        )}
        {!resto.accepts_online_orders && (
          <p className="rounded-md border bg-muted p-3 text-center text-sm text-muted-foreground">
            Les commandes en ligne sont actuellement désactivées. Contactez le restaurant pour commander.
          </p>
        )}
      </main>

      {/* Cart bar */}
      {cartCount > 0 && resto.accepts_online_orders && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card p-3 shadow-lg">
          <div className="mx-auto max-w-3xl">
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button className="w-full" size="lg" style={{ background: themeColor }}>
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Panier ({cartCount}) — {formatFCFA(total)}
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
                          <Button size="icon" onClick={() => inc(id)} style={{ background: themeColor }}><Plus className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-between border-t pt-3 text-lg font-bold">
                    <span>Total</span><span>{formatFCFA(total)}</span>
                  </div>
                  <div className="space-y-2 pt-2">
                    {!tableNumber && (
                      <Badge variant="outline">Aucune table — indiquez votre place au serveur.</Badge>
                    )}
                    <Input placeholder="Votre nom (optionnel)" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
                    <Input placeholder="Téléphone (optionnel)" maxLength={20} value={phone} onChange={(e) => setPhoneInput(e.target.value)} />
                    <Textarea placeholder="Notes (allergies, cuisson…)" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                </div>
                <SheetFooter>
                  <Button className="w-full" size="lg" onClick={submit} disabled={submitting} style={{ background: themeColor }}>
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

export default PublicRestaurant;
