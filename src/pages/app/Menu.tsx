import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, FolderPlus, X } from "lucide-react";
import { formatFCFA } from "@/lib/currency";
import { ImageUpload } from "@/components/ImageUpload";
import { MenuItemCard, type MenuItemLite } from "@/components/menu/MenuItemCard";
import { VariantsModifiersDialog } from "@/components/menu/VariantsModifiersDialog";

interface Category { id: string; name: string; sort_order: number; }
type MenuItem = MenuItemLite;
interface StockOpt { id: string; name: string; unit: string; cost_per_unit: number; }
interface RecipeRow { id: string; stock_item_id: string; quantity: number; }

const Menu = () => {
  const { restaurant } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [itemDialog, setItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemForm, setItemForm] = useState({
    name: "", description: "", price: "", category_id: "", is_available: true, image_url: null as string | null,
  });

  const [catDialog, setCatDialog] = useState(false);
  const [catName, setCatName] = useState("");

  const [recipeFor, setRecipeFor] = useState<MenuItem | null>(null);
  const [stockOpts, setStockOpts] = useState<StockOpt[]>([]);
  const [recipeRows, setRecipeRows] = useState<RecipeRow[]>([]);
  const [recipeSaving, setRecipeSaving] = useState(false);

  const load = async () => {
    if (!restaurant) return;
    const [catsRes, itemsRes, stockRes] = await Promise.all([
      supabase.from("menu_categories").select("*").eq("restaurant_id", restaurant.id).order("sort_order"),
      supabase.from("menu_items").select("*").eq("restaurant_id", restaurant.id).order("created_at", { ascending: false }),
      supabase.from("stock_items").select("id,name,unit,cost_per_unit").eq("restaurant_id", restaurant.id).order("name"),
    ]);
    setCategories((catsRes.data ?? []) as Category[]);
    setItems((itemsRes.data ?? []) as MenuItem[]);
    setStockOpts((stockRes.data ?? []) as StockOpt[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [restaurant]);

  const openItem = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        name: item.name,
        description: item.description ?? "",
        price: item.price.toString(),
        category_id: item.category_id ?? "",
        is_available: item.is_available,
        image_url: item.image_url ?? null,
      });
    } else {
      setEditingItem(null);
      setItemForm({ name: "", description: "", price: "", category_id: "", is_available: true, image_url: null });
    }
    setItemDialog(true);
  };

  const saveItem = async () => {
    if (!restaurant) return;
    const payload = {
      restaurant_id: restaurant.id,
      name: itemForm.name,
      description: itemForm.description || null,
      price: parseFloat(itemForm.price) || 0,
      category_id: itemForm.category_id || null,
      is_available: itemForm.is_available,
      image_url: itemForm.image_url,
    };
    const res = editingItem
      ? await supabase.from("menu_items").update(payload).eq("id", editingItem.id)
      : await supabase.from("menu_items").insert(payload);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(editingItem ? "Plat mis à jour" : "Plat ajouté");
    setItemDialog(false);
    load();
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Supprimer ce plat ?")) return;
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Plat supprimé");
    load();
  };

  const saveCategory = async () => {
    if (!restaurant || !catName.trim()) return;
    const { error } = await supabase.from("menu_categories").insert({
      restaurant_id: restaurant.id,
      name: catName.trim(),
      sort_order: categories.length,
    });
    if (error) { toast.error(error.message); return; }
    setCatName("");
    setCatDialog(false);
    toast.success("Catégorie ajoutée");
    load();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Supprimer cette catégorie ? Les plats associés ne seront pas supprimés.")) return;
    const { error } = await supabase.from("menu_categories").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const toggleAvailable = async (item: MenuItem) => {
    const { error } = await supabase.from("menu_items")
      .update({ is_available: !item.is_available }).eq("id", item.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const openRecipe = async (item: MenuItem) => {
    setRecipeFor(item);
    const { data } = await supabase
      .from("menu_item_recipes")
      .select("id,stock_item_id,quantity")
      .eq("menu_item_id", item.id);
    setRecipeRows((data ?? []) as RecipeRow[]);
  };

  const addRecipeRow = () => {
    const used = new Set(recipeRows.map((r) => r.stock_item_id));
    const next = stockOpts.find((s) => !used.has(s.id));
    if (!next) { toast.error("Tous les articles du stock sont déjà utilisés"); return; }
    setRecipeRows([...recipeRows, { id: `new-${Date.now()}`, stock_item_id: next.id, quantity: 1 }]);
  };

  const updateRecipeRow = (idx: number, patch: Partial<RecipeRow>) => {
    setRecipeRows(recipeRows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const removeRecipeRow = (idx: number) => {
    setRecipeRows(recipeRows.filter((_, i) => i !== idx));
  };

  const saveRecipe = async () => {
    if (!restaurant || !recipeFor) return;
    setRecipeSaving(true);
    // Strategy: delete all existing then insert all rows. Simple & reliable for small recipes.
    const { error: delErr } = await supabase.from("menu_item_recipes").delete().eq("menu_item_id", recipeFor.id);
    if (delErr) { toast.error(delErr.message); setRecipeSaving(false); return; }
    if (recipeRows.length > 0) {
      const payload = recipeRows
        .filter((r) => r.stock_item_id && Number(r.quantity) > 0)
        .map((r) => ({
          restaurant_id: restaurant.id,
          menu_item_id: recipeFor.id,
          stock_item_id: r.stock_item_id,
          quantity: Number(r.quantity),
        }));
      if (payload.length > 0) {
        const { error } = await supabase.from("menu_item_recipes").insert(payload);
        if (error) { toast.error(error.message); setRecipeSaving(false); return; }
      }
    }
    toast.success("Recette enregistrée");
    setRecipeSaving(false);
    setRecipeFor(null);
  };

  const recipeCost = recipeRows.reduce((sum, r) => {
    const s = stockOpts.find((o) => o.id === r.stock_item_id);
    return sum + (s ? s.cost_per_unit * Number(r.quantity || 0) : 0);
  }, 0);
  const recipeMargin = (recipeFor?.price ?? 0) - recipeCost;
  const marginPct = recipeFor && recipeFor.price > 0 ? (recipeMargin / recipeFor.price) * 100 : 0;

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const grouped = categories.map((c) => ({
    cat: c,
    items: items.filter((i) => i.category_id === c.id),
  }));
  const uncategorized = items.filter((i) => !i.category_id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Menu</h1>
          <p className="mt-1 text-muted-foreground">Gérez vos catégories et vos plats.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={catDialog} onOpenChange={setCatDialog}>
            <DialogTrigger asChild>
              <Button variant="outline"><FolderPlus className="mr-2 h-4 w-4" />Catégorie</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouvelle catégorie</DialogTitle></DialogHeader>
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Entrées, Plats, Boissons..." />
              </div>
              <DialogFooter>
                <Button onClick={saveCategory}>Ajouter</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button onClick={() => openItem()}><Plus className="mr-2 h-4 w-4" />Plat</Button>
        </div>
      </div>

      {categories.length === 0 && items.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Commencez par créer une catégorie puis ajoutez vos plats.
        </CardContent></Card>
      )}

      {grouped.map(({ cat, items: catItems }) => (
        <div key={cat.id}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{cat.name}</h2>
            <Button variant="ghost" size="sm" onClick={() => deleteCategory(cat.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {catItems.length === 0 ? (
              <p className="col-span-full text-sm text-muted-foreground">Aucun plat dans cette catégorie.</p>
            ) : catItems.map((item) => <ItemCard key={item.id} item={item} onEdit={openItem} onDelete={deleteItem} onToggle={toggleAvailable} onRecipe={openRecipe} />)}
          </div>
        </div>
      ))}

      {uncategorized.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Sans catégorie</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {uncategorized.map((item) => <ItemCard key={item.id} item={item} onEdit={openItem} onDelete={deleteItem} onToggle={toggleAvailable} onRecipe={openRecipe} />)}
          </div>
        </div>
      )}

      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingItem ? "Modifier le plat" : "Nouveau plat"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {restaurant && (
              <ImageUpload
                bucket="menu-images"
                folder={restaurant.id}
                value={itemForm.image_url}
                onChange={(url) => setItemForm({ ...itemForm, image_url: url })}
                label="Photo du plat"
                prefix="dish-"
              />
            )}
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Prix (FCFA)</Label>
                <Input type="number" value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select value={itemForm.category_id} onValueChange={(v) => setItemForm({ ...itemForm, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <Label className="cursor-pointer">Disponible</Label>
              <Switch checked={itemForm.is_available} onCheckedChange={(v) => setItemForm({ ...itemForm, is_available: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveItem}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!recipeFor} onOpenChange={(o) => !o && setRecipeFor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Recette — {recipeFor?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {stockOpts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun article en stock. Ajoutez d'abord des ingrédients dans la page Stock.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  {recipeRows.length === 0 && (
                    <p className="text-sm text-muted-foreground">Aucun ingrédient. Ajoutez-en pour calculer le coût matière.</p>
                  )}
                  {recipeRows.map((row, idx) => {
                    const stock = stockOpts.find((s) => s.id === row.stock_item_id);
                    return (
                      <div key={row.id} className="flex items-center gap-2">
                        <Select value={row.stock_item_id} onValueChange={(v) => updateRecipeRow(idx, { stock_item_id: v })}>
                          <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {stockOpts.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          step="0.01"
                          className="w-24"
                          value={row.quantity}
                          onChange={(e) => updateRecipeRow(idx, { quantity: parseFloat(e.target.value) || 0 })}
                        />
                        <span className="w-10 text-xs text-muted-foreground">{stock?.unit ?? ""}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeRecipeRow(idx)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
                <Button variant="outline" size="sm" onClick={addRecipeRow}>
                  <Plus className="mr-2 h-4 w-4" />Ajouter un ingrédient
                </Button>

                <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                  <div className="flex justify-between"><span>Prix de vente</span><span className="font-medium">{formatFCFA(recipeFor?.price ?? 0)}</span></div>
                  <div className="flex justify-between"><span>Coût matière</span><span className="font-medium">{formatFCFA(recipeCost)}</span></div>
                  <div className="mt-1 flex justify-between border-t border-border pt-1">
                    <span>Marge</span>
                    <span className={`font-bold ${recipeMargin >= 0 ? "text-success" : "text-destructive"}`}>
                      {formatFCFA(recipeMargin)} ({marginPct.toFixed(0)}%)
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecipeFor(null)}>Annuler</Button>
            <Button onClick={saveRecipe} disabled={recipeSaving || stockOpts.length === 0}>
              {recipeSaving ? "..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ItemCard = ({
  item, onEdit, onDelete, onToggle, onRecipe,
}: {
  item: MenuItem;
  onEdit: (i: MenuItem) => void;
  onDelete: (id: string) => void;
  onToggle: (i: MenuItem) => void;
  onRecipe: (i: MenuItem) => void;
}) => (
  <Card className="shadow-sm">
    <div className="aspect-video w-full overflow-hidden bg-muted">
      {item.image_url ? (
        <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">Pas de photo</div>
      )}
    </div>
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h3 className="font-semibold">{item.name}</h3>
          {item.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{item.description}</p>}
          <p className="mt-2 text-lg font-bold text-primary">{formatFCFA(item.price)}</p>
        </div>
        <Switch checked={item.is_available} onCheckedChange={() => onToggle(item)} />
      </div>
      <div className="mt-3 flex justify-end gap-1">
        <Button variant="ghost" size="sm" onClick={() => onRecipe(item)} title="Recette"><ChefHat className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => onEdit(item)}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(item.id)}><Trash2 className="h-4 w-4" /></Button>
      </div>
    </CardContent>
  </Card>
);

export default Menu;
