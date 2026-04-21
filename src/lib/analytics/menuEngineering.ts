import { supabase } from "@/integrations/supabase/client";

export type MenuClass = "star" | "plowhorse" | "puzzle" | "dog";

export interface MenuEngineeringRow {
  menu_item_id: string;
  name: string;
  category_name: string | null;
  units_sold: number;
  revenue: number;
  food_cost: number;
  margin: number;
  margin_pct: number;
  popularity_score: number;   // 0-1, normalized vs avg sales
  margin_score: number;        // 0-1, normalized vs avg margin
  classification: MenuClass;
  emoji: string;
}

export interface FetchOptions {
  restaurantId: string;
  fromISO: string;
  toISO: string;
}

/**
 * Compute Boston-Consulting-style menu engineering matrix:
 * - Star      : high popularity + high margin  → keep, promote
 * - Plowhorse : high popularity + low margin   → re-engineer cost
 * - Puzzle    : low popularity  + high margin  → re-position, upsell
 * - Dog       : low popularity  + low margin   → drop or rework
 */
export async function fetchMenuEngineering({ restaurantId, fromISO, toISO }: FetchOptions): Promise<MenuEngineeringRow[]> {
  // Pull paid orders in window
  const { data: orders } = await supabase
    .from("orders")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("status", "paid")
    .gte("created_at", fromISO)
    .lte("created_at", toISO);

  const orderIds = (orders ?? []).map((o) => o.id);
  if (orderIds.length === 0) return [];

  const { data: items } = await supabase
    .from("order_items")
    .select("menu_item_id,name_snapshot,quantity,unit_price")
    .in("order_id", orderIds)
    .neq("status", "cancelled");

  // Aggregate per menu_item_id
  const byItem = new Map<string, { name: string; units: number; revenue: number }>();
  for (const it of items ?? []) {
    if (!it.menu_item_id) continue;
    const cur = byItem.get(it.menu_item_id) ?? { name: it.name_snapshot, units: 0, revenue: 0 };
    cur.units += it.quantity;
    cur.revenue += Number(it.unit_price) * it.quantity;
    byItem.set(it.menu_item_id, cur);
  }

  if (byItem.size === 0) return [];

  const ids = Array.from(byItem.keys());

  // Pull recipes + categories
  const [recipesRes, menuItemsRes, stockRes] = await Promise.all([
    supabase.from("menu_item_recipes").select("menu_item_id,stock_item_id,quantity").in("menu_item_id", ids),
    supabase.from("menu_items").select("id,name,category_id,menu_categories(name)").in("id", ids),
    supabase.from("stock_items").select("id,cost_per_unit").eq("restaurant_id", restaurantId),
  ]);

  const stockCost = new Map<string, number>();
  (stockRes.data ?? []).forEach((s) => stockCost.set(s.id, Number(s.cost_per_unit ?? 0)));

  const foodCostByItem = new Map<string, number>();
  for (const r of recipesRes.data ?? []) {
    const c = (stockCost.get(r.stock_item_id) ?? 0) * Number(r.quantity);
    foodCostByItem.set(r.menu_item_id, (foodCostByItem.get(r.menu_item_id) ?? 0) + c);
  }

  const catByItem = new Map<string, string | null>();
  (menuItemsRes.data ?? []).forEach((m) => {
    const cat = (m.menu_categories as unknown as { name?: string } | null)?.name ?? null;
    catByItem.set(m.id, cat);
  });

  // First pass: build raw rows
  const raw = ids.map((id) => {
    const a = byItem.get(id)!;
    const unitCost = foodCostByItem.get(id) ?? 0;
    const totalCost = unitCost * a.units;
    const margin = a.revenue - totalCost;
    return {
      menu_item_id: id,
      name: a.name,
      category_name: catByItem.get(id) ?? null,
      units_sold: a.units,
      revenue: a.revenue,
      food_cost: totalCost,
      margin,
      margin_pct: a.revenue > 0 ? (margin / a.revenue) * 100 : 0,
      unit_margin: a.units > 0 ? margin / a.units : 0,
    };
  });

  // Compute averages for classification (median is more robust than mean for skewed restaurant sales)
  const sortedUnits = [...raw].map((r) => r.units_sold).sort((a, b) => a - b);
  const sortedMargin = [...raw].map((r) => r.unit_margin).sort((a, b) => a - b);
  const median = (arr: number[]) => arr.length === 0 ? 0 : arr[Math.floor(arr.length / 2)];
  const medUnits = median(sortedUnits);
  const medMargin = median(sortedMargin);
  const maxUnits = Math.max(...sortedUnits, 1);
  const maxMargin = Math.max(...sortedMargin, 1);

  return raw.map((r) => {
    const popHigh = r.units_sold >= medUnits;
    const marginHigh = r.unit_margin >= medMargin;
    let classification: MenuClass;
    let emoji: string;
    if (popHigh && marginHigh) { classification = "star"; emoji = "⭐"; }
    else if (popHigh && !marginHigh) { classification = "plowhorse"; emoji = "🐎"; }
    else if (!popHigh && marginHigh) { classification = "puzzle"; emoji = "🧩"; }
    else { classification = "dog"; emoji = "🐕"; }
    return {
      menu_item_id: r.menu_item_id,
      name: r.name,
      category_name: r.category_name,
      units_sold: r.units_sold,
      revenue: r.revenue,
      food_cost: r.food_cost,
      margin: r.margin,
      margin_pct: r.margin_pct,
      popularity_score: r.units_sold / maxUnits,
      margin_score: Math.max(0, r.unit_margin) / maxMargin,
      classification,
      emoji,
    };
  }).sort((a, b) => b.revenue - a.revenue);
}

export const CLASS_META: Record<MenuClass, { label: string; description: string; advice: string; color: string }> = {
  star: {
    label: "Stars",
    description: "Populaires & rentables",
    advice: "Mettre en avant, protéger la qualité.",
    color: "bg-success/20 text-success border-success/40",
  },
  plowhorse: {
    label: "Plowhorses (Chevaux de trait)",
    description: "Populaires mais peu rentables",
    advice: "Réduire le coût matière, ajuster la portion ou le prix.",
    color: "bg-warning/20 text-warning border-warning/40",
  },
  puzzle: {
    label: "Puzzles",
    description: "Rentables mais peu vendus",
    advice: "Repositionner sur la carte, suggérer en upsell.",
    color: "bg-primary/20 text-primary border-primary/40",
  },
  dog: {
    label: "Dogs",
    description: "Peu vendus & peu rentables",
    advice: "Retirer ou retravailler la recette.",
    color: "bg-destructive/20 text-destructive border-destructive/40",
  },
};