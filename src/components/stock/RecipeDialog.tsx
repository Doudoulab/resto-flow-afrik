import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatFCFA } from "@/lib/currency";
import { Trash2, Plus } from "lucide-react";

interface Props {
  menuItemId: string | null;
  menuItemName?: string;
  menuItemPrice?: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface StockItem { id: string; name: string; unit: string; cost_per_unit: number; }
interface Recipe { id?: string; stock_item_id: string; quantity: number; }

export const RecipeDialog = ({ menuItemId, menuItemName, menuItemPrice, open, onOpenChange }: Props) => {
  const { restaurant } = useAuth();
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !restaurant || !menuItemId) return;
    (async () => {
      const [s, r] = await Promise.all([
        supabase.from("stock_items").select("id,name,unit,cost_per_unit").eq("restaurant_id", restaurant.id).order("name"),
        supabase.from("menu_item_recipes").select("id,stock_item_id,quantity").eq("menu_item_id", menuItemId),
      ]);
      setStockItems((s.data ?? []) as StockItem[]);
      setRecipes((r.data ?? []) as Recipe[]);
    })();
  }, [open, restaurant, menuItemId]);

  const cost = recipes.reduce((sum, r) => {
    const s = stockItems.find((x) => x.id === r.stock_item_id);
    return sum + (s ? Number(s.cost_per_unit) * Number(r.quantity) : 0);
  }, 0);
  const margin = (menuItemPrice ?? 0) - cost;
  const marginPct = menuItemPrice && menuItemPrice > 0 ? (margin / menuItemPrice) * 100 : 0;

  const addLine = () => setRecipes([...recipes, { stock_item_id: stockItems[0]?.id ?? "", quantity: 1 }]);
  const updateLine = (i: number, patch: Partial<Recipe>) => setRecipes(recipes.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const removeLine = (i: number) => setRecipes(recipes.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!restaurant || !menuItemId) return;
    setSaving(true);
    await supabase.from("menu_item_recipes").delete().eq("menu_item_id", menuItemId);
    const valid = recipes.filter((r) => r.stock_item_id && r.quantity > 0);
    if (valid.length > 0) {
      const { error } = await supabase.from("menu_item_recipes").insert(
        valid.map((r) => ({ menu_item_id: menuItemId, restaurant_id: restaurant.id, stock_item_id: r.stock_item_id, quantity: r.quantity }))
      );
      if (error) { toast.error(error.message); setSaving(false); return; }
    }
    toast.success("Recette enregistrée");
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Recette — {menuItemName}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {recipes.length === 0 && <p className="text-sm text-muted-foreground">Aucun ingrédient. Ajoutez-en pour calculer le food cost.</p>}
          {recipes.map((r, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Ingrédient</Label>
                <Select value={r.stock_item_id} onValueChange={(v) => updateLine(i, { stock_item_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>{stockItems.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.unit})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="w-32 space-y-1">
                <Label className="text-xs">Quantité</Label>
                <Input type="number" step="0.01" value={r.quantity} onChange={(e) => updateLine(i, { quantity: parseFloat(e.target.value) || 0 })} />
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeLine(i)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addLine}><Plus className="mr-2 h-4 w-4" />Ajouter un ingrédient</Button>

          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1">
            <div className="flex justify-between text-sm"><span>Coût matière</span><span className="font-semibold">{formatFCFA(cost)}</span></div>
            <div className="flex justify-between text-sm"><span>Prix de vente</span><span>{formatFCFA(menuItemPrice ?? 0)}</span></div>
            <div className="flex justify-between text-sm border-t border-border pt-1 mt-1">
              <span className="font-medium">Marge</span>
              <span className={`font-semibold ${margin < 0 ? "text-destructive" : "text-success"}`}>{formatFCFA(margin)} ({marginPct.toFixed(0)}%)</span>
            </div>
          </div>
        </div>
        <DialogFooter><Button onClick={save} disabled={saving}>Enregistrer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
