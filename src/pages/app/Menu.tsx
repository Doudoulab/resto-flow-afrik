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
import { Loader2, Plus, Pencil, Trash2, FolderPlus } from "lucide-react";
import { formatFCFA } from "@/lib/currency";

interface Category { id: string; name: string; sort_order: number; }
interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_available: boolean;
  category_id: string | null;
}

const Menu = () => {
  const { restaurant } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [itemDialog, setItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemForm, setItemForm] = useState({
    name: "", description: "", price: "", category_id: "", is_available: true,
  });

  const [catDialog, setCatDialog] = useState(false);
  const [catName, setCatName] = useState("");

  const load = async () => {
    if (!restaurant) return;
    const [catsRes, itemsRes] = await Promise.all([
      supabase.from("menu_categories").select("*").eq("restaurant_id", restaurant.id).order("sort_order"),
      supabase.from("menu_items").select("*").eq("restaurant_id", restaurant.id).order("created_at", { ascending: false }),
    ]);
    setCategories((catsRes.data ?? []) as Category[]);
    setItems((itemsRes.data ?? []) as MenuItem[]);
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
      });
    } else {
      setEditingItem(null);
      setItemForm({ name: "", description: "", price: "", category_id: "", is_available: true });
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
            ) : catItems.map((item) => <ItemCard key={item.id} item={item} onEdit={openItem} onDelete={deleteItem} onToggle={toggleAvailable} />)}
          </div>
        </div>
      ))}

      {uncategorized.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Sans catégorie</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {uncategorized.map((item) => <ItemCard key={item.id} item={item} onEdit={openItem} onDelete={deleteItem} onToggle={toggleAvailable} />)}
          </div>
        </div>
      )}

      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingItem ? "Modifier le plat" : "Nouveau plat"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
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
    </div>
  );
};

const ItemCard = ({
  item, onEdit, onDelete, onToggle,
}: {
  item: MenuItem;
  onEdit: (i: MenuItem) => void;
  onDelete: (id: string) => void;
  onToggle: (i: MenuItem) => void;
}) => (
  <Card className="shadow-sm">
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
        <Button variant="ghost" size="sm" onClick={() => onEdit(item)}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(item.id)}><Trash2 className="h-4 w-4" /></Button>
      </div>
    </CardContent>
  </Card>
);

export default Menu;
