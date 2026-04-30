import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { ShoppingCart, Plus, Minus, CheckCircle2, MapPin, Phone, Instagram, Facebook, Clock, ChefHat, MessageCircle, Mail, Search, CalendarCheck } from "lucide-react";
import { formatFCFA } from "@/lib/currency";
import { toast } from "sonner";
import { ItemConfigurator, type ConfiguredSelection } from "@/components/menu/ItemConfigurator";

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
  hide_powered_by?: boolean;
}
interface Category { id: string; name: string; sort_order: number }
interface MenuItem { id: string; name: string; description: string | null; price: number; category_id: string | null; image_url: string | null; sort_order: number }
interface CartLine { key: string; menu_item_id: string; name: string; unit_price: number; quantity: number }

const DAY_LABELS: Record<string, string> = {
  mon: "Lun", tue: "Mar", wed: "Mer", thu: "Jeu", fri: "Ven", sat: "Sam", sun: "Dim",
};
const DAY_LABELS_LONG: Record<string, string> = {
  mon: "Lundi", tue: "Mardi", wed: "Mercredi", thu: "Jeudi", fri: "Vendredi", sat: "Samedi", sun: "Dimanche",
};
const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const PublicRestaurant = () => {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tableNumber = params.get("table") ?? "";

  const [resto, setResto] = useState<PublicResto | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCat, setActiveCat] = useState<string>("");

  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhoneInput] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [configItem, setConfigItem] = useState<MenuItem | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [search, setSearch] = useState("");

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
    const filtered = search.trim()
      ? items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()) || (i.description ?? "").toLowerCase().includes(search.toLowerCase()))
      : items;
    filtered.forEach((i) => {
      const k = i.category_id ?? "_none";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(i);
    });
    return map;
  }, [items, search]);

  const orderedCategories = useMemo(() => [
    ...categories,
    ...(itemsByCategory.has("_none") ? [{ id: "_none", name: "Autres", sort_order: 999 }] : []),
  ].filter((c) => (itemsByCategory.get(c.id) ?? []).length > 0), [categories, itemsByCategory]);

  const total = useMemo(() => cart.reduce((s, l) => s + l.unit_price * l.quantity, 0), [cart]);
  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);
  const qtyForItem = (id: string) => cart.filter((l) => l.menu_item_id === id).reduce((s, l) => s + l.quantity, 0);

  const inc = (key: string) =>
    setCart((prev) => prev.map((l) => l.key === key ? { ...l, quantity: l.quantity + 1 } : l));
  const dec = (key: string) =>
    setCart((prev) => prev.flatMap((l) => l.key === key ? (l.quantity <= 1 ? [] : [{ ...l, quantity: l.quantity - 1 }]) : [l]));

  const openItem = (it: MenuItem) => {
    setConfigItem(it);
    setConfigOpen(true);
  };

  const onConfigured = (sel: ConfiguredSelection) => {
    const key = `${sel.item.id}::${sel.label}::${sel.unitPrice}`;
    setCart((prev) => {
      const ex = prev.find((l) => l.key === key);
      if (ex) return prev.map((l) => l.key === key ? { ...l, quantity: l.quantity + 1 } : l);
      return [...prev, { key, menu_item_id: sel.item.id, name: sel.label, unit_price: sel.unitPrice, quantity: 1 }];
    });
    setConfigOpen(false);
    setConfigItem(null);
    toast.success(`${sel.label} ajouté au panier`);
  };

  const submit = async () => {
    if (!resto) return;
    if (cartCount === 0) { toast.error("Panier vide"); return; }
    if (name.trim().length > 80 || phone.trim().length > 20 || notes.trim().length > 500) {
      toast.error("Champs trop longs"); return;
    }
    setSubmitting(true);
    const orderItems = cart.map((l) => ({
      menu_item_id: l.menu_item_id,
      name: l.name,
      unit_price: l.unit_price,
      quantity: l.quantity,
    }));
    const { data: inserted, error } = await supabase.functions.invoke("public-order", {
      body: {
        restaurant_id: resto.id,
        table_number: tableNumber || null,
        customer_name: name.trim() || null,
        customer_phone: phone.trim() || null,
        items: orderItems,
        total,
        notes: notes.trim() || null,
      },
    });
    setSubmitting(false);
    if (error || (inserted && (inserted as { error?: string }).error)) {
      toast.error(error?.message || (inserted as { error?: string })?.error || "Erreur d'envoi");
      return;
    }
    setCart([]);
    setCartOpen(false);
    const newId = (inserted as { id?: string })?.id;
    if (newId && slug) {
      navigate(`/r/${slug}/order/${newId}`);
      return;
    }
    setSubmitted(true);
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
  const todayKey = DAY_ORDER[(new Date().getDay() + 6) % 7];
  const todayHours = resto.opening_hours?.[todayKey];

  return (
    <div className="min-h-screen bg-[#fdfcf8] pb-28 text-neutral-900" style={styleVars}>
      {/* Top contact bar */}
      <div className="hidden bg-neutral-900 text-neutral-200 md:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 text-xs">
          <div className="flex items-center gap-5">
            {resto.phone && (
              <a href={`tel:${resto.phone}`} className="inline-flex items-center gap-1.5 hover:text-white"><Phone className="h-3.5 w-3.5" />{resto.phone}</a>
            )}
            {todayHours && (
              <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Aujourd'hui : {todayHours.closed ? "Fermé" : `${todayHours.open} – ${todayHours.close}`}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {resto.facebook_url && <a href={resto.facebook_url} target="_blank" rel="noreferrer" className="hover:text-white"><Facebook className="h-3.5 w-3.5" /></a>}
            {resto.instagram_url && <a href={resto.instagram_url} target="_blank" rel="noreferrer" className="hover:text-white"><Instagram className="h-3.5 w-3.5" /></a>}
            {resto.whatsapp && <a href={`https://wa.me/${resto.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="hover:text-white"><MessageCircle className="h-3.5 w-3.5" /></a>}
            <a href="#reserve" className="ml-2 inline-flex items-center gap-1.5 rounded-sm px-3 py-1 text-xs font-medium text-white" style={{ background: themeColor }}>
              <CalendarCheck className="h-3.5 w-3.5" /> Réserver une table
            </a>
          </div>
        </div>
      </div>

      {/* Sticky brand + nav */}
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-[#fdfcf8]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            {resto.logo_url ? (
              <img src={resto.logo_url} alt={`Logo ${resto.name}`} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: themeColor }}>
                <ChefHat className="h-5 w-5 text-white" />
              </div>
            )}
            <span className="font-serif text-2xl tracking-wide" style={{ color: themeColor }}>{resto.name}</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-neutral-700 md:flex">
            <a href="#menu" className="hover:text-neutral-900">Menu</a>
            <a href="#about" className="hover:text-neutral-900">À propos</a>
            <a href="#hours" className="hover:text-neutral-900">Horaires</a>
            <a href="#contact" className="hover:text-neutral-900">Contact</a>
          </nav>
          {tableNumber && <Badge variant="secondary">Table {tableNumber}</Badge>}
        </div>
      </header>

      {/* Hero */}
      <section className="relative h-[280px] w-full overflow-hidden bg-neutral-900 sm:h-[360px]">
        {resto.cover_url ? (
          <img src={resto.cover_url} alt={resto.name} className="h-full w-full object-cover opacity-60" />
        ) : (
          <div className="h-full w-full opacity-70" style={{ background: `linear-gradient(135deg, #1a1a1a, ${themeColor}55)` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center text-white">
          <h1 className="font-serif text-4xl font-light tracking-wide sm:text-6xl">Notre Menu</h1>
          <p className="mt-2 text-sm opacity-90">Accueil <span className="mx-1 opacity-60">›</span> Menu</p>
        </div>
      </section>

      {/* Intro / about */}
      {resto.description && (
        <section id="about" className="mx-auto max-w-3xl px-4 py-10 text-center">
          <p className="text-base leading-relaxed text-neutral-600">{resto.description}</p>
        </section>
      )}

      {/* Category nav + search */}
      <div className="sticky top-[64px] z-30 border-y border-neutral-200 bg-[#fdfcf8]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="-mx-1 flex flex-1 gap-2 overflow-x-auto px-1">
            {orderedCategories.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setActiveCat(c.id);
                  document.getElementById(`cat-${c.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${activeCat === c.id ? "border-transparent text-white" : "border-neutral-300 bg-transparent text-neutral-700 hover:bg-neutral-100"}`}
                style={activeCat === c.id ? { background: themeColor } : undefined}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un plat…" className="h-9 border-neutral-300 bg-white pl-9 text-sm" />
          </div>
        </div>
      </div>

      {/* Menu grid */}
      <main id="menu" className="mx-auto max-w-6xl space-y-14 px-4 py-12">
        {orderedCategories.map((cat) => {
          const list = itemsByCategory.get(cat.id) ?? [];
          return (
            <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-32">
              <div className="mb-8 text-center">
                <p className="text-xs uppercase tracking-[0.3em]" style={{ color: themeColor }}>Spécialités</p>
                <h2 className="mt-1 font-serif text-3xl font-light tracking-wide">{cat.name}</h2>
                <div className="mx-auto mt-3 h-px w-16" style={{ background: themeColor }} />
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {list.map((it) => {
                  const qty = qtyForItem(it.id);
                  return (
                    <div
                      key={it.id}
                      className="group cursor-pointer rounded-sm bg-white p-6 text-center shadow-sm transition-all hover:shadow-lg"
                      onClick={() => resto.accepts_online_orders ? openItem(it) : undefined}
                    >
                      <div className="mx-auto h-32 w-32 overflow-hidden rounded-full bg-neutral-100">
                        {it.image_url ? (
                          <img src={it.image_url} alt={it.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center"><ChefHat className="h-10 w-10 text-neutral-300" /></div>
                        )}
                      </div>
                      <h3 className="mt-4 font-serif text-lg">{it.name}</h3>
                      <div className="mx-auto my-2 h-px w-10 bg-neutral-200" />
                      {it.description && (
                        <p className="line-clamp-2 text-xs text-neutral-500">{it.description}</p>
                      )}
                      <p className="mt-3 font-semibold" style={{ color: themeColor }}>{formatFCFA(it.price)}</p>
                      {resto.accepts_online_orders && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); openItem(it); }}
                          className="mt-3 rounded-full border-neutral-300 text-xs uppercase tracking-wider hover:text-white"
                          style={qty > 0 ? { background: themeColor, borderColor: themeColor, color: "#fff" } : undefined}
                        >
                          {qty > 0 ? `${qty} ajouté${qty > 1 ? "s" : ""}` : (<><Plus className="mr-1 h-3 w-3" /> Ajouter</>)}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
        {items.length === 0 && (
          <p className="py-12 text-center text-neutral-500">Aucun plat disponible pour le moment.</p>
        )}
        {!resto.accepts_online_orders && (
          <p className="rounded-sm border border-neutral-200 bg-white p-4 text-center text-sm text-neutral-600">
            Les commandes en ligne sont actuellement désactivées. Contactez le restaurant pour commander.
          </p>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-neutral-900 text-neutral-300">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-3">
          {/* Hours */}
          <div id="hours" className="text-center md:text-left">
            <h3 className="font-serif text-xl text-white">Horaires d'ouverture</h3>
            <div className="mx-auto mt-3 h-px w-12 md:mx-0" style={{ background: themeColor }} />
            <ul className="mt-4 space-y-1.5 text-sm">
              {DAY_ORDER.map((k) => {
                const h = resto.opening_hours?.[k];
                if (!h) return null;
                return (
                  <li key={k} className="flex justify-between gap-4">
                    <span>{DAY_LABELS_LONG[k]}</span>
                    <span className={h.closed ? "" : "text-neutral-400"} style={h.closed ? { color: themeColor } : undefined}>
                      {h.closed ? "Fermé" : `${h.open} – ${h.close}`}
                    </span>
                  </li>
                );
              })}
              {(!resto.opening_hours || Object.keys(resto.opening_hours).length === 0) && (
                <li className="text-neutral-500">Horaires non communiqués</li>
              )}
            </ul>
          </div>

          {/* Brand */}
          <div className="flex flex-col items-center text-center">
            {resto.logo_url ? (
              <img src={resto.logo_url} alt={resto.name} className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: themeColor }}>
                <ChefHat className="h-8 w-8 text-white" />
              </div>
            )}
            <h3 className="mt-3 font-serif text-2xl text-white">{resto.name}</h3>
            {resto.description && <p className="mt-3 max-w-xs text-sm text-neutral-400">{resto.description}</p>}
            <div className="mt-4 flex gap-3">
              {resto.facebook_url && <a href={resto.facebook_url} target="_blank" rel="noreferrer" className="rounded-full border border-neutral-700 p-2 hover:border-white hover:text-white"><Facebook className="h-4 w-4" /></a>}
              {resto.instagram_url && <a href={resto.instagram_url} target="_blank" rel="noreferrer" className="rounded-full border border-neutral-700 p-2 hover:border-white hover:text-white"><Instagram className="h-4 w-4" /></a>}
              {resto.whatsapp && <a href={`https://wa.me/${resto.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="rounded-full border border-neutral-700 p-2 hover:border-white hover:text-white"><MessageCircle className="h-4 w-4" /></a>}
            </div>
          </div>

          {/* Contact */}
          <div id="contact" className="text-center md:text-right">
            <h3 className="font-serif text-xl text-white">Contact</h3>
            <div className="mx-auto mt-3 h-px w-12 md:ml-auto md:mr-0" style={{ background: themeColor }} />
            <ul className="mt-4 space-y-2 text-sm">
              {resto.address && (
                <li className="flex items-start justify-center gap-2 md:justify-end">
                  <span>{resto.address}</span>
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: themeColor }} />
                </li>
              )}
              {resto.phone && (
                <li className="flex items-center justify-center gap-2 md:justify-end">
                  <a href={`tel:${resto.phone}`} className="hover:text-white">{resto.phone}</a>
                  <Phone className="h-4 w-4" style={{ color: themeColor }} />
                </li>
              )}
              {resto.whatsapp && (
                <li className="flex items-center justify-center gap-2 md:justify-end">
                  <a href={`https://wa.me/${resto.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="hover:text-white">WhatsApp : {resto.whatsapp}</a>
                  <MessageCircle className="h-4 w-4" style={{ color: themeColor }} />
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="border-t border-neutral-800">
          <div className="mx-auto max-w-6xl px-6 py-4 text-center text-xs text-neutral-500">
            © {new Date().getFullYear()} {resto.name}. Tous droits réservés.
            {!resto?.hide_powered_by && (
              <> · Propulsé par <a href="https://resto-flow-afrik.lovable.app" target="_blank" rel="noreferrer" className="hover:text-white">RestoFlow by Orynta</a></>
            )}
          </div>
        </div>
      </footer>

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
                  {cart.map((l) => (
                    <div key={l.key} className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="font-medium">{l.name}</p>
                        <p className="text-sm text-muted-foreground">{formatFCFA(l.unit_price)} × {l.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="outline" onClick={() => dec(l.key)}><Minus className="h-4 w-4" /></Button>
                        <span className="w-6 text-center">{l.quantity}</span>
                        <Button size="icon" onClick={() => inc(l.key)} style={{ background: themeColor }}><Plus className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
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

      {/* Item detail / configurator (description + variants + supplements) */}
      <ItemConfigurator
        open={configOpen}
        item={configItem ? {
          id: configItem.id,
          name: configItem.name,
          price: Number(configItem.price),
          image_url: configItem.image_url,
          description: configItem.description,
        } : null}
        onOpenChange={(o) => { setConfigOpen(o); if (!o) setConfigItem(null); }}
        onConfirm={onConfigured}
      />
    </div>
  );
};

export default PublicRestaurant;
