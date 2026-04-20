import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ImageUpload";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatFCFA } from "@/lib/currency";
import type { MenuItemLite } from "./MenuItemCard";

interface Variant {
  id: string;
  name: string;
  price: number | null;
  price_delta: number;
  image_url: string | null;
  is_default: boolean;
  is_available: boolean;
  sort_order: number;
  _new?: boolean;
  _dirty?: boolean;
}

interface ModGroup {
  id: string;
  name: string;
  selection_type: "single" | "multiple";
  is_required: boolean;
  min_select: number;
  max_select: number;
  sort_order: number;
  _new?: boolean;
  _dirty?: boolean;
  modifiers: Modifier[];
}

interface Modifier {
  id: string;
  group_id: string;
  name: string;
  price_delta: number;
  is_default: boolean;
  is_available: boolean;
  sort_order: number;
  _new?: boolean;
  _dirty?: boolean;
}

interface Props {
  item: MenuItemLite | null;
  restaurantId: string;
  onClose: () => void;
}

export const VariantsModifiersDialog = ({ item, restaurantId, onClose }: Props) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [groups, setGroups] = useState<ModGroup[]>([]);
  const [deletedVariants, setDeletedVariants] = useState<string[]>([]);
  const [deletedGroups, setDeletedGroups] = useState<string[]>([]);
  const [deletedModifiers, setDeletedModifiers] = useState<string[]>([]);

  useEffect(() => {
    if (!item) return;
    setDeletedVariants([]);
    setDeletedGroups([]);
    setDeletedModifiers([]);
    setLoading(true);
    (async () => {
      const [vRes, gRes, mRes] = await Promise.all([
        supabase.from("menu_item_variants").select("*").eq("menu_item_id", item.id).order("sort_order"),
        supabase.from("menu_item_modifier_groups").select("*").eq("menu_item_id", item.id).order("sort_order"),
        supabase.from("menu_item_modifiers").select("*").order("sort_order"),
      ]);
      const groupsData = (gRes.data ?? []) as Omit<ModGroup, "modifiers">[];
      const allMods = (mRes.data ?? []) as Modifier[];
      setVariants((vRes.data ?? []) as Variant[]);
      setGroups(
        groupsData.map((g) => ({
          ...g,
          modifiers: allMods.filter((m) => m.group_id === g.id),
        }))
      );
      setLoading(false);
    })();
  }, [item]);

  // ============ VARIANTS ============
  const addVariant = () => {
    setVariants([
      ...variants,
      {
        id: `new-${Date.now()}`,
        name: "",
        price: null,
        price_delta: 0,
        image_url: null,
        is_default: variants.length === 0,
        is_available: true,
        sort_order: variants.length,
        _new: true,
        _dirty: true,
      },
    ]);
  };

  const updateVariant = (idx: number, patch: Partial<Variant>) => {
    setVariants(variants.map((v, i) => (i === idx ? { ...v, ...patch, _dirty: true } : v)));
  };

  const removeVariant = (idx: number) => {
    const v = variants[idx];
    if (!v._new) setDeletedVariants([...deletedVariants, v.id]);
    setVariants(variants.filter((_, i) => i !== idx));
  };

  const setDefaultVariant = (idx: number) => {
    setVariants(variants.map((v, i) => ({ ...v, is_default: i === idx, _dirty: true })));
  };

  // ============ GROUPS ============
  const addGroup = () => {
    setGroups([
      ...groups,
      {
        id: `new-${Date.now()}`,
        name: "",
        selection_type: "single",
        is_required: false,
        min_select: 0,
        max_select: 1,
        sort_order: groups.length,
        _new: true,
        _dirty: true,
        modifiers: [],
      },
    ]);
  };

  const updateGroup = (idx: number, patch: Partial<ModGroup>) => {
    setGroups(groups.map((g, i) => (i === idx ? { ...g, ...patch, _dirty: true } : g)));
  };

  const removeGroup = (idx: number) => {
    const g = groups[idx];
    if (!g._new) setDeletedGroups([...deletedGroups, g.id]);
    setGroups(groups.filter((_, i) => i !== idx));
  };

  // ============ MODIFIERS ============
  const addModifier = (gIdx: number) => {
    const g = groups[gIdx];
    const newMod: Modifier = {
      id: `new-${Date.now()}`,
      group_id: g.id,
      name: "",
      price_delta: 0,
      is_default: false,
      is_available: true,
      sort_order: g.modifiers.length,
      _new: true,
      _dirty: true,
    };
    updateGroup(gIdx, { modifiers: [...g.modifiers, newMod] });
  };

  const updateModifier = (gIdx: number, mIdx: number, patch: Partial<Modifier>) => {
    const g = groups[gIdx];
    const newMods = g.modifiers.map((m, i) => (i === mIdx ? { ...m, ...patch, _dirty: true } : m));
    updateGroup(gIdx, { modifiers: newMods });
  };

  const removeModifier = (gIdx: number, mIdx: number) => {
    const g = groups[gIdx];
    const m = g.modifiers[mIdx];
    if (!m._new) setDeletedModifiers([...deletedModifiers, m.id]);
    updateGroup(gIdx, { modifiers: g.modifiers.filter((_, i) => i !== mIdx) });
  };

  // ============ SAVE ============
  const save = async () => {
    if (!item) return;
    setSaving(true);
    try {
      // Validation
      for (const v of variants) {
        if (!v.name.trim()) throw new Error("Toutes les variantes doivent avoir un nom");
      }
      for (const g of groups) {
        if (!g.name.trim()) throw new Error("Tous les groupes de suppléments doivent avoir un nom");
        for (const m of g.modifiers) {
          if (!m.name.trim()) throw new Error(`Tous les suppléments du groupe "${g.name}" doivent avoir un nom`);
        }
      }

      // Variants: deletes
      if (deletedVariants.length) {
        await supabase.from("menu_item_variants").delete().in("id", deletedVariants);
      }
      // Variants: upserts
      for (const [idx, v] of variants.entries()) {
        if (!v._dirty) continue;
        const payload = {
          restaurant_id: restaurantId,
          menu_item_id: item.id,
          name: v.name.trim(),
          price: v.price,
          price_delta: Number(v.price_delta) || 0,
          image_url: v.image_url,
          is_default: v.is_default,
          is_available: v.is_available,
          sort_order: idx,
        };
        if (v._new) {
          const { error } = await supabase.from("menu_item_variants").insert(payload);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("menu_item_variants").update(payload).eq("id", v.id);
          if (error) throw error;
        }
      }

      // Modifiers: deletes (before group deletes to avoid FK orphan)
      if (deletedModifiers.length) {
        await supabase.from("menu_item_modifiers").delete().in("id", deletedModifiers);
      }
      // Groups: deletes (cascade kills children too but we already cleaned)
      if (deletedGroups.length) {
        await supabase.from("menu_item_modifier_groups").delete().in("id", deletedGroups);
      }

      // Groups + modifiers upsert
      for (const [gIdx, g] of groups.entries()) {
        let groupId = g.id;
        const groupPayload = {
          restaurant_id: restaurantId,
          menu_item_id: item.id,
          name: g.name.trim(),
          selection_type: g.selection_type,
          is_required: g.is_required,
          min_select: Number(g.min_select) || 0,
          max_select: Number(g.max_select) || 1,
          sort_order: gIdx,
        };
        if (g._new) {
          const { data, error } = await supabase
            .from("menu_item_modifier_groups")
            .insert(groupPayload)
            .select("id")
            .single();
          if (error) throw error;
          groupId = data.id;
        } else if (g._dirty) {
          const { error } = await supabase
            .from("menu_item_modifier_groups")
            .update(groupPayload)
            .eq("id", g.id);
          if (error) throw error;
        }

        for (const [mIdx, m] of g.modifiers.entries()) {
          if (!m._dirty && !g._new) continue;
          const modPayload = {
            restaurant_id: restaurantId,
            group_id: groupId,
            name: m.name.trim(),
            price_delta: Number(m.price_delta) || 0,
            is_default: m.is_default,
            is_available: m.is_available,
            sort_order: mIdx,
          };
          if (m._new || g._new) {
            const { error } = await supabase.from("menu_item_modifiers").insert(modPayload);
            if (error) throw error;
          } else {
            const { error } = await supabase.from("menu_item_modifiers").update(modPayload).eq("id", m.id);
            if (error) throw error;
          }
        }
      }

      toast.success("Variantes & suppléments enregistrés");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const computeVariantPrice = (v: Variant) =>
    v.price !== null && v.price !== undefined && !isNaN(Number(v.price))
      ? Number(v.price)
      : (item?.price ?? 0) + Number(v.price_delta || 0);

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Variantes & suppléments — {item?.name}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="variants" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="variants">Variantes ({variants.length})</TabsTrigger>
              <TabsTrigger value="modifiers">Suppléments ({groups.length})</TabsTrigger>
            </TabsList>

            {/* VARIANTS */}
            <TabsContent value="variants" className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Déclinaisons du plat (ex: petit/moyen/grand, rouge/blanc). Le client doit en choisir une. Prix absolu OU écart vs prix de base ({formatFCFA(item?.price ?? 0)}).
              </p>
              {variants.length === 0 && (
                <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  Aucune variante. Le plat sera vendu au prix de base.
                </p>
              )}
              {variants.map((v, idx) => (
                <div key={v.id} className="space-y-2 rounded-md border border-border p-3">
                  <div className="flex gap-3">
                    <ImageUpload
                      bucket="menu-images"
                      folder={restaurantId}
                      value={v.image_url}
                      onChange={(url) => updateVariant(idx, { image_url: url })}
                      prefix="variant-"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Nom (ex: Grand, Rouge...)"
                          value={v.name}
                          onChange={(e) => updateVariant(idx, { name: e.target.value })}
                        />
                        <Button variant="ghost" size="sm" onClick={() => removeVariant(idx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Prix absolu (FCFA)</Label>
                          <Input
                            type="number"
                            placeholder="Vide = utiliser delta"
                            value={v.price ?? ""}
                            onChange={(e) =>
                              updateVariant(idx, {
                                price: e.target.value === "" ? null : parseFloat(e.target.value),
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Écart prix (+/-)</Label>
                          <Input
                            type="number"
                            value={v.price_delta}
                            onChange={(e) => updateVariant(idx, { price_delta: parseFloat(e.target.value) || 0 })}
                            disabled={v.price !== null}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          → Prix final : <span className="font-semibold text-foreground">{formatFCFA(computeVariantPrice(v))}</span>
                        </span>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1">
                            <Switch
                              checked={v.is_default}
                              onCheckedChange={() => setDefaultVariant(idx)}
                            />
                            <span>Défaut</span>
                          </label>
                          <label className="flex items-center gap-1">
                            <Switch
                              checked={v.is_available}
                              onCheckedChange={(c) => updateVariant(idx, { is_available: c })}
                            />
                            <span>Dispo</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addVariant}>
                <Plus className="mr-2 h-4 w-4" />Ajouter une variante
              </Button>
            </TabsContent>

            {/* MODIFIERS */}
            <TabsContent value="modifiers" className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Groupes d'options (ex: "Cuisson" — choix unique, "Suppléments" — multi). Chaque option peut ajouter un coût.
              </p>
              {groups.length === 0 && (
                <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  Aucun groupe de suppléments.
                </p>
              )}
              {groups.map((g, gIdx) => (
                <div key={g.id} className="space-y-3 rounded-md border border-border p-3">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Nom du groupe (ex: Cuisson)"
                      value={g.name}
                      onChange={(e) => updateGroup(gIdx, { name: e.target.value })}
                    />
                    <Button variant="ghost" size="sm" onClick={() => removeGroup(gIdx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={g.selection_type}
                        onValueChange={(v: "single" | "multiple") =>
                          updateGroup(gIdx, {
                            selection_type: v,
                            max_select: v === "single" ? 1 : Math.max(g.max_select, 2),
                          })
                        }
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Choix unique</SelectItem>
                          <SelectItem value="multiple">Multi-choix</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Min.</Label>
                      <Input
                        type="number"
                        min={0}
                        value={g.min_select}
                        onChange={(e) => updateGroup(gIdx, { min_select: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Max.</Label>
                      <Input
                        type="number"
                        min={1}
                        value={g.max_select}
                        onChange={(e) => updateGroup(gIdx, { max_select: parseInt(e.target.value) || 1 })}
                        disabled={g.selection_type === "single"}
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <label className="flex items-center gap-1 text-xs">
                        <Switch
                          checked={g.is_required}
                          onCheckedChange={(c) => updateGroup(gIdx, { is_required: c, min_select: c ? Math.max(1, g.min_select) : g.min_select })}
                        />
                        <span>Obligatoire</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {g.modifiers.map((m, mIdx) => (
                      <div key={m.id} className="flex items-center gap-2">
                        <Input
                          placeholder="Option (ex: Bien cuit)"
                          className="flex-1"
                          value={m.name}
                          onChange={(e) => updateModifier(gIdx, mIdx, { name: e.target.value })}
                        />
                        <Input
                          type="number"
                          placeholder="+0"
                          className="w-24"
                          value={m.price_delta}
                          onChange={(e) => updateModifier(gIdx, mIdx, { price_delta: parseFloat(e.target.value) || 0 })}
                        />
                        <label className="flex items-center gap-1 text-xs">
                          <Switch
                            checked={m.is_available}
                            onCheckedChange={(c) => updateModifier(gIdx, mIdx, { is_available: c })}
                          />
                        </label>
                        <Button variant="ghost" size="sm" onClick={() => removeModifier(gIdx, mIdx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => addModifier(gIdx)}>
                      <Plus className="mr-2 h-3 w-3" />Option
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addGroup}>
                <Plus className="mr-2 h-4 w-4" />Ajouter un groupe
              </Button>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={save} disabled={saving || loading}>
            {saving ? "..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};