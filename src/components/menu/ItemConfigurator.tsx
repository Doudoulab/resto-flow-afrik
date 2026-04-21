import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { formatFCFA } from "@/lib/currency";
import { Loader2 } from "lucide-react";

export interface BaseItem { id: string; name: string; price: number; image_url?: string | null; description?: string | null; }

interface Variant { id: string; name: string; price: number | null; price_delta: number; image_url: string | null; is_default: boolean; is_available: boolean; sort_order: number; }
interface ModifierGroup { id: string; name: string; selection_type: string; is_required: boolean; min_select: number; max_select: number; sort_order: number; }
interface Modifier { id: string; group_id: string; name: string; price_delta: number; is_default: boolean; is_available: boolean; sort_order: number; }

export interface ConfiguredSelection {
  item: BaseItem;
  variant: Variant | null;
  modifiers: Modifier[];
  unitPrice: number;
  label: string; // "Pizza (Large) + Extra cheese, Olives"
}

interface Props {
  open: boolean;
  item: BaseItem | null;
  onOpenChange: (o: boolean) => void;
  onConfirm: (sel: ConfiguredSelection) => void;
}

/** Returns true if this item needs the configurator (has variants or any modifier group). */
export async function itemNeedsConfig(itemId: string): Promise<boolean> {
  const [v, g] = await Promise.all([
    supabase.from("menu_item_variants").select("id", { count: "exact", head: true }).eq("menu_item_id", itemId).eq("is_available", true),
    supabase.from("menu_item_modifier_groups").select("id", { count: "exact", head: true }).eq("menu_item_id", itemId),
  ]);
  return (v.count ?? 0) > 0 || (g.count ?? 0) > 0;
}

export const ItemConfigurator = ({ open, item, onOpenChange, onConfirm }: Props) => {
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    if (!open || !item) return;
    setLoading(true);
    setVariantId(null);
    setSelected({});
    (async () => {
      const [v, g, m] = await Promise.all([
        supabase.from("menu_item_variants").select("*").eq("menu_item_id", item.id).eq("is_available", true).order("sort_order"),
        supabase.from("menu_item_modifier_groups").select("*").eq("menu_item_id", item.id).order("sort_order"),
        supabase.from("menu_item_modifiers").select("*").eq("is_available", true),
      ]);
      const vs = (v.data ?? []) as Variant[];
      const gs = (g.data ?? []) as ModifierGroup[];
      const ms = ((m.data ?? []) as Modifier[]).filter((mod) => gs.some((gr) => gr.id === mod.group_id));
      setVariants(vs);
      setGroups(gs);
      setModifiers(ms);
      const def = vs.find((x) => x.is_default) ?? vs[0];
      if (def) setVariantId(def.id);
      const initial: Record<string, Set<string>> = {};
      gs.forEach((gr) => {
        const defaults = ms.filter((mm) => mm.group_id === gr.id && mm.is_default).map((mm) => mm.id);
        initial[gr.id] = new Set(defaults.slice(0, gr.max_select));
      });
      setSelected(initial);
      setLoading(false);
    })();
  }, [open, item?.id]);

  const variant = useMemo(() => variants.find((v) => v.id === variantId) ?? null, [variants, variantId]);

  const chosenModifiers = useMemo(() => {
    const ids = new Set<string>();
    Object.values(selected).forEach((s) => s.forEach((id) => ids.add(id)));
    return modifiers.filter((m) => ids.has(m.id));
  }, [selected, modifiers]);

  const unitPrice = useMemo(() => {
    if (!item) return 0;
    const base = variant
      ? (variant.price != null ? Number(variant.price) : Number(item.price) + Number(variant.price_delta))
      : Number(item.price);
    const mods = chosenModifiers.reduce((s, m) => s + Number(m.price_delta), 0);
    return base + mods;
  }, [item, variant, chosenModifiers]);

  const toggle = (group: ModifierGroup, modId: string) => {
    setSelected((prev) => {
      const cur = new Set(prev[group.id] ?? []);
      if (group.selection_type === "single" || group.max_select === 1) {
        cur.clear();
        cur.add(modId);
      } else {
        if (cur.has(modId)) cur.delete(modId);
        else if (cur.size < group.max_select) cur.add(modId);
      }
      return { ...prev, [group.id]: cur };
    });
  };

  const validationError = useMemo(() => {
    if (variants.length > 0 && !variantId) return "Choisissez une variante.";
    for (const g of groups) {
      const count = (selected[g.id]?.size) ?? 0;
      if (g.is_required && count < Math.max(1, g.min_select)) return `« ${g.name} » est obligatoire.`;
      if (count < g.min_select) return `« ${g.name} » : choisissez au moins ${g.min_select}.`;
    }
    return null;
  }, [variants, variantId, groups, selected]);

  const confirm = () => {
    if (!item || validationError) return;
    const parts: string[] = [];
    if (variant) parts.push(variant.name);
    const modNames = chosenModifiers.map((m) => m.name);
    const suffix = [parts.length ? `(${parts.join(", ")})` : "", modNames.length ? `+ ${modNames.join(", ")}` : ""].filter(Boolean).join(" ");
    const label = suffix ? `${item.name} ${suffix}` : item.name;
    onConfirm({ item, variant, modifiers: chosenModifiers, unitPrice, label });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>{item?.name ?? ""}</DialogTitle></DialogHeader>
        {loading ? (
          <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-5">
            {item?.image_url && (
              <div className="-mx-6 -mt-2 aspect-video w-[calc(100%+3rem)] overflow-hidden bg-muted">
                <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
              </div>
            )}
            {item?.description && (
              <p className="text-sm text-muted-foreground">{item.description}</p>
            )}
            {variants.length === 0 && groups.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune option à choisir pour ce plat.</p>
            )}
            {variants.length > 0 && (
              <div>
                <Label className="mb-2 block font-semibold">Variante</Label>
                <RadioGroup value={variantId ?? ""} onValueChange={setVariantId} className="space-y-2">
                  {variants.map((v) => {
                    const price = v.price != null ? Number(v.price) : Number(item?.price ?? 0) + Number(v.price_delta);
                    return (
                      <label key={v.id} htmlFor={`var-${v.id}`} className="flex cursor-pointer items-center justify-between rounded-md border border-border p-3 hover:bg-accent">
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value={v.id} id={`var-${v.id}`} />
                          {v.image_url && <img src={v.image_url} alt={v.name} className="h-10 w-10 rounded object-cover" />}
                          <span className="font-medium">{v.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-primary">{formatFCFA(price)}</span>
                      </label>
                    );
                  })}
                </RadioGroup>
              </div>
            )}

            {groups.map((g) => {
              const groupMods = modifiers.filter((m) => m.group_id === g.id);
              if (groupMods.length === 0) return null;
              const cur = selected[g.id] ?? new Set();
              return (
                <div key={g.id}>
                  <div className="mb-2 flex items-center justify-between">
                    <Label className="font-semibold">{g.name}</Label>
                    <div className="flex gap-1">
                      {g.is_required && <Badge variant="outline">Obligatoire</Badge>}
                      <Badge variant="secondary">
                        {g.selection_type === "single" || g.max_select === 1 ? "1 choix" : `${g.min_select}-${g.max_select}`}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {groupMods.map((m) => {
                      const checked = cur.has(m.id);
                      const single = g.selection_type === "single" || g.max_select === 1;
                      return (
                        <label key={m.id} className="flex cursor-pointer items-center justify-between rounded-md border border-border p-2.5 hover:bg-accent">
                          <div className="flex items-center gap-3">
                            {single ? (
                              <button
                                type="button"
                                onClick={() => toggle(g, m.id)}
                                aria-checked={checked}
                                role="radio"
                                className="flex h-4 w-4 items-center justify-center rounded-full border border-primary"
                              >
                                {checked && <span className="h-2 w-2 rounded-full bg-primary" />}
                              </button>
                            ) : (
                              <Checkbox checked={checked} onCheckedChange={() => toggle(g, m.id)} />
                            )}
                            <span>{m.name}</span>
                          </div>
                          {Number(m.price_delta) !== 0 && (
                            <span className="text-sm text-muted-foreground">
                              {Number(m.price_delta) > 0 ? "+" : ""}{formatFCFA(Number(m.price_delta))}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-between border-t pt-3">
              <span className="font-medium">Prix unitaire</span>
              <span className="text-xl font-bold text-primary">{formatFCFA(unitPrice)}</span>
            </div>
            {validationError && <p className="text-sm text-destructive">{validationError}</p>}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={confirm} disabled={!!validationError || loading}>Ajouter au panier</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};