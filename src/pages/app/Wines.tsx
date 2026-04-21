import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Wine as WineIcon, Plus, Pencil, Trash2, Plus as PlusIcon, Minus, Star, Link2 } from "lucide-react";
import { toast } from "sonner";
import { formatFCFA } from "@/lib/currency";

interface Wine {
  id: string;
  name: string;
  producer: string | null;
  region: string | null;
  country: string | null;
  vintage: number | null;
  wine_type: string;
  grape_varieties: string[];
  bottle_price: number;
  glass_price: number | null;
  glasses_per_bottle: number;
  cost_per_bottle: number;
  bottles_in_stock: number;
  cellar_location: string | null;
  serving_temperature: string | null;
  tasting_notes: string | null;
  food_pairing_notes: string | null;
  is_available: boolean;
  is_featured: boolean;
}

interface MenuItemLite { id: string; name: string }
interface Pairing { id: string; menu_item_id: string; wine_id: string; sommelier_note: string | null }

const TYPES = [
  { v: "red", label: "Rouge" },
  { v: "white", label: "Blanc" },
  { v: "rose", label: "Rosé" },
  { v: "sparkling", label: "Effervescent" },
  { v: "champagne", label: "Champagne" },
  { v: "fortified", label: "Vin doux/muté" },
];
const TYPE_LABEL: Record<string, string> = Object.fromEntries(TYPES.map((t) => [t.v, t.label]));
const TYPE_COLOR: Record<string, string> = {
  red: "bg-red-700", white: "bg-yellow-200 text-foreground", rose: "bg-pink-400",
  sparkling: "bg-yellow-100 text-foreground", champagne: "bg-amber-400 text-foreground", fortified: "bg-amber-700",
};

const empty = {
  name: "", producer: "", region: "", country: "", vintage: "",
  wine_type: "red", grape_varieties: "",
  bottle_price: "0", glass_price: "", glasses_per_bottle: "6",
  cost_per_bottle: "0", bottles_in_stock: "0",
  cellar_location: "", serving_temperature: "",
  tasting_notes: "", food_pairing_notes: "",
  is_available: true, is_featured: false,
};

const Wines = () => {
  const { restaurant } = useAuth();
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Wine | null>(null);
  const [form, setForm] = useState(empty);

  const [moveOpen, setMoveOpen] = useState(false);
  const [moveWine, setMoveWine] = useState<Wine | null>(null);
  const [moveQty, setMoveQty] = useState("1");
  const [moveType, setMoveType] = useState<"in" | "out">("in");
  const [moveReason, setMoveReason] = useState("");

  const [pairOpen, setPairOpen] = useState(false);
  const [pairWine, setPairWine] = useState<Wine | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItemLite[]>([]);
  const [pairings, setPairings] = useState<Pairing[]>([]);
  const [pairItemId, setPairItemId] = useState("");
  const [pairNote, setPairNote] = useState("");

  const load = async () => {
    if (!restaurant) return;
    setLoading(true);
    const { data } = await supabase
      .from("wines")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("name");
    setWines((data ?? []) as Wine[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [restaurant?.id]);

  const openCreate = () => { setEditing(null); setForm(empty); setEditOpen(true); };
  const openEdit = (w: Wine) => {
    setEditing(w);
    setForm({
      name: w.name, producer: w.producer ?? "", region: w.region ?? "", country: w.country ?? "",
      vintage: w.vintage ? String(w.vintage) : "",
      wine_type: w.wine_type,
      grape_varieties: (w.grape_varieties ?? []).join(", "),
      bottle_price: String(w.bottle_price), glass_price: w.glass_price ? String(w.glass_price) : "",
      glasses_per_bottle: String(w.glasses_per_bottle),
      cost_per_bottle: String(w.cost_per_bottle), bottles_in_stock: String(w.bottles_in_stock),
      cellar_location: w.cellar_location ?? "", serving_temperature: w.serving_temperature ?? "",
      tasting_notes: w.tasting_notes ?? "", food_pairing_notes: w.food_pairing_notes ?? "",
      is_available: w.is_available, is_featured: w.is_featured,
    });
    setEditOpen(true);
  };

  const save = async () => {
    if (!restaurant) return;
    if (!form.name.trim()) { toast.error("Nom requis"); return; }
    const payload = {
      restaurant_id: restaurant.id,
      name: form.name.trim(),
      producer: form.producer.trim() || null,
      region: form.region.trim() || null,
      country: form.country.trim() || null,
      vintage: form.vintage ? parseInt(form.vintage, 10) : null,
      wine_type: form.wine_type,
      grape_varieties: form.grape_varieties.split(",").map((g) => g.trim()).filter(Boolean),
      bottle_price: parseFloat(form.bottle_price) || 0,
      glass_price: form.glass_price ? parseFloat(form.glass_price) : null,
      glasses_per_bottle: parseInt(form.glasses_per_bottle, 10) || 6,
      cost_per_bottle: parseFloat(form.cost_per_bottle) || 0,
      bottles_in_stock: parseInt(form.bottles_in_stock, 10) || 0,
      cellar_location: form.cellar_location.trim() || null,
      serving_temperature: form.serving_temperature.trim() || null,
      tasting_notes: form.tasting_notes.trim() || null,
      food_pairing_notes: form.food_pairing_notes.trim() || null,
      is_available: form.is_available, is_featured: form.is_featured,
    };
    const res = editing
      ? await supabase.from("wines").update(payload).eq("id", editing.id)
      : await supabase.from("wines").insert(payload);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(editing ? "Vin mis à jour" : "Vin ajouté à la cave");
    setEditOpen(false);
    load();
  };

  const remove = async (w: Wine) => {
    if (!confirm(`Retirer ${w.name} de la cave ?`)) return;
    const { error } = await supabase.from("wines").delete().eq("id", w.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Vin supprimé");
    load();
  };

  const openMove = (w: Wine, type: "in" | "out") => {
    setMoveWine(w); setMoveType(type); setMoveQty("1"); setMoveReason("");
    setMoveOpen(true);
  };
  const submitMove = async () => {
    if (!restaurant || !moveWine) return;
    const q = parseInt(moveQty, 10);
    if (!q || q <= 0) { toast.error("Quantité invalide"); return; }
    const newStock = moveType === "in" ? moveWine.bottles_in_stock + q : Math.max(0, moveWine.bottles_in_stock - q);
    const [movRes, updRes] = await Promise.all([
      supabase.from("wine_movements").insert({
        restaurant_id: restaurant.id, wine_id: moveWine.id,
        movement_type: moveType, quantity: q, reason: moveReason.trim() || null,
      }),
      supabase.from("wines").update({ bottles_in_stock: newStock }).eq("id", moveWine.id),
    ]);
    if (movRes.error || updRes.error) { toast.error(movRes.error?.message ?? updRes.error?.message ?? "Erreur"); return; }
    toast.success(moveType === "in" ? "Entrée enregistrée" : "Sortie enregistrée");
    setMoveOpen(false);
    load();
  };

  const openPair = async (w: Wine) => {
    if (!restaurant) return;
    setPairWine(w); setPairItemId(""); setPairNote("");
    const [m, p] = await Promise.all([
      supabase.from("menu_items").select("id,name").eq("restaurant_id", restaurant.id).order("name"),
      supabase.from("menu_wine_pairings").select("id,menu_item_id,wine_id,sommelier_note").eq("wine_id", w.id),
    ]);
    setMenuItems((m.data ?? []) as MenuItemLite[]);
    setPairings((p.data ?? []) as Pairing[]);
    setPairOpen(true);
  };
  const addPair = async () => {
    if (!restaurant || !pairWine || !pairItemId) return;
    const { error } = await supabase.from("menu_wine_pairings").insert({
      restaurant_id: restaurant.id, menu_item_id: pairItemId, wine_id: pairWine.id,
      sommelier_note: pairNote.trim() || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Accord ajouté");
    setPairItemId(""); setPairNote("");
    openPair(pairWine);
  };
  const removePair = async (id: string) => {
    const { error } = await supabase.from("menu_wine_pairings").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (pairWine) openPair(pairWine);
  };

  const filtered = useMemo(() => wines.filter((w) => {
    if (typeFilter !== "all" && w.wine_type !== typeFilter) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return [w.name, w.producer, w.region, w.country, ...(w.grape_varieties ?? [])]
      .filter(Boolean).some((s) => String(s).toLowerCase().includes(q));
  }), [wines, typeFilter, search]);

  const totalBottles = wines.reduce((s, w) => s + w.bottles_in_stock, 0);
  const cellarValue = wines.reduce((s, w) => s + w.bottles_in_stock * w.cost_per_bottle, 0);
  const lowStock = wines.filter((w) => w.is_available && w.bottles_in_stock <= 2).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <WineIcon className="h-7 w-7 text-primary" /> Cave à vins
          </h1>
          <p className="text-sm text-muted-foreground">Sommellerie : gestion des vins, stocks et accords mets-vins.</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nouveau vin</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Bouteilles en cave</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalBottles}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Valeur cave (coût)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatFCFA(cellarValue)}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Stock faible (≤ 2)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-orange-600">{lowStock}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input placeholder="Rechercher (nom, producteur, région, cépage)…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-md" />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Chargement…</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">Aucun vin dans la cave.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((w) => (
                <Card key={w.id} className="overflow-hidden">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate flex items-center gap-1">
                          {w.is_featured && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                          {w.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[w.producer, w.region, w.vintage].filter(Boolean).join(" • ")}
                        </p>
                      </div>
                      <Badge className={TYPE_COLOR[w.wine_type] ?? ""}>{TYPE_LABEL[w.wine_type]}</Badge>
                    </div>
                    {w.grape_varieties.length > 0 && (
                      <p className="text-xs text-muted-foreground italic">{w.grape_varieties.join(", ")}</p>
                    )}
                    <div className="flex items-baseline gap-3 text-sm pt-1">
                      <span className="font-bold text-primary">{formatFCFA(w.bottle_price)}</span>
                      <span className="text-muted-foreground">/ bouteille</span>
                      {w.glass_price && <span className="text-muted-foreground">— verre {formatFCFA(w.glass_price)}</span>}
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t">
                      <Badge variant={w.bottles_in_stock <= 2 ? "destructive" : "secondary"}>
                        {w.bottles_in_stock} btl. {w.cellar_location ? `· ${w.cellar_location}` : ""}
                      </Badge>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openMove(w, "in")} title="Entrée">
                          <PlusIcon className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openMove(w, "out")} title="Sortie">
                          <Minus className="h-4 w-4 text-orange-600" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openPair(w)} title="Accords mets-vins">
                          <Link2 className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(w)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(w)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Modifier le vin" : "Nouveau vin"}</DialogTitle></DialogHeader>
          <Tabs defaultValue="info">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Identité</TabsTrigger>
              <TabsTrigger value="price">Prix & stock</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>
            <TabsContent value="info" className="space-y-3 pt-3">
              <div><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Producteur</Label><Input value={form.producer} onChange={(e) => setForm({ ...form, producer: e.target.value })} /></div>
                <div><Label>Millésime</Label><Input type="number" value={form.vintage} onChange={(e) => setForm({ ...form, vintage: e.target.value })} placeholder="2018" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Région</Label><Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="Bordeaux, Toscane…" /></div>
                <div><Label>Pays</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="France, Italie…" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={form.wine_type} onValueChange={(v) => setForm({ ...form, wine_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Cépages (séparés par virgule)</Label><Input value={form.grape_varieties} onChange={(e) => setForm({ ...form, grape_varieties: e.target.value })} placeholder="Cabernet Sauvignon, Merlot" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label>Disponible</Label>
                  <Switch checked={form.is_available} onCheckedChange={(v) => setForm({ ...form, is_available: v })} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label>Coup de cœur</Label>
                  <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="price" className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Prix bouteille (FCFA) *</Label><Input type="number" value={form.bottle_price} onChange={(e) => setForm({ ...form, bottle_price: e.target.value })} /></div>
                <div><Label>Prix verre (FCFA)</Label><Input type="number" value={form.glass_price} onChange={(e) => setForm({ ...form, glass_price: e.target.value })} placeholder="Optionnel" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Verres par bouteille</Label><Input type="number" value={form.glasses_per_bottle} onChange={(e) => setForm({ ...form, glasses_per_bottle: e.target.value })} /></div>
                <div><Label>Coût d'achat / bouteille</Label><Input type="number" value={form.cost_per_bottle} onChange={(e) => setForm({ ...form, cost_per_bottle: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Bouteilles en stock</Label><Input type="number" value={form.bottles_in_stock} onChange={(e) => setForm({ ...form, bottles_in_stock: e.target.value })} /></div>
                <div><Label>Emplacement cave</Label><Input value={form.cellar_location} onChange={(e) => setForm({ ...form, cellar_location: e.target.value })} placeholder="Casier B-12" /></div>
              </div>
            </TabsContent>
            <TabsContent value="notes" className="space-y-3 pt-3">
              <div><Label>Température de service</Label><Input value={form.serving_temperature} onChange={(e) => setForm({ ...form, serving_temperature: e.target.value })} placeholder="16-18°C" /></div>
              <div><Label>Notes de dégustation</Label><Textarea rows={3} value={form.tasting_notes} onChange={(e) => setForm({ ...form, tasting_notes: e.target.value })} /></div>
              <div><Label>Suggestions d'accords</Label><Textarea rows={3} value={form.food_pairing_notes} onChange={(e) => setForm({ ...form, food_pairing_notes: e.target.value })} placeholder="Idéal avec viandes rouges, fromages affinés…" /></div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Annuler</Button>
            <Button onClick={save}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Movement dialog */}
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{moveType === "in" ? "Entrée en cave" : "Sortie de cave"} — {moveWine?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="rounded bg-muted p-3 text-sm flex justify-between">
              <span className="text-muted-foreground">Stock actuel</span>
              <span className="font-bold">{moveWine?.bottles_in_stock} btl.</span>
            </div>
            <div><Label>Quantité (bouteilles)</Label><Input type="number" min="1" value={moveQty} onChange={(e) => setMoveQty(e.target.value)} autoFocus /></div>
            <div><Label>Raison</Label><Input value={moveReason} onChange={(e) => setMoveReason(e.target.value)} placeholder={moveType === "in" ? "Réception fournisseur…" : "Casse, dégustation…"} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMoveOpen(false)}>Annuler</Button>
            <Button onClick={submitMove}>Valider</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pairing dialog */}
      <Dialog open={pairOpen} onOpenChange={setPairOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Accords mets-vins — {pairWine?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Ajouter un accord</Label>
              <div className="flex gap-2">
                <Select value={pairItemId} onValueChange={setPairItemId}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Choisir un plat…" /></SelectTrigger>
                  <SelectContent>
                    {menuItems.filter((m) => !pairings.some((p) => p.menu_item_id === m.id)).map((m) =>
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Button onClick={addPair} disabled={!pairItemId}><Plus className="h-4 w-4" /></Button>
              </div>
              <Input placeholder="Note du sommelier (optionnel)" value={pairNote} onChange={(e) => setPairNote(e.target.value)} />
            </div>
            <div className="space-y-1 pt-2 border-t">
              <Label className="text-xs text-muted-foreground">Accords existants</Label>
              {pairings.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun accord pour ce vin.</p>
              ) : pairings.map((p) => {
                const it = menuItems.find((m) => m.id === p.menu_item_id);
                return (
                  <div key={p.id} className="flex items-center justify-between rounded border p-2">
                    <div>
                      <p className="font-medium text-sm">{it?.name ?? "—"}</p>
                      {p.sommelier_note && <p className="text-xs text-muted-foreground italic">{p.sommelier_note}</p>}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removePair(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Wines;