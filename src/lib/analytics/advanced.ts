import { supabase } from "@/integrations/supabase/client";

export interface ServerPerformance {
  user_id: string;
  name: string;
  orders_count: number;
  revenue: number;
  avg_ticket: number;
}
export interface CategoryMargin {
  category: string;
  revenue: number;
  food_cost: number;
  margin: number;
  margin_pct: number;
}
export interface TopWine {
  wine_id: string;
  name: string;
  vintage: number | null;
  units_sold: number;
  revenue: number;
  current_stock: number;
  rotation_days: number | null;
}

export async function fetchServerPerformance(restaurantId: string, fromISO: string, toISO: string): Promise<ServerPerformance[]> {
  const { data: orders } = await supabase
    .from("orders")
    .select("created_by,total")
    .eq("restaurant_id", restaurantId)
    .eq("status", "paid")
    .gte("created_at", fromISO)
    .lte("created_at", toISO);

  const map = new Map<string, { count: number; revenue: number }>();
  for (const o of orders ?? []) {
    if (!o.created_by) continue;
    const cur = map.get(o.created_by) ?? { count: 0, revenue: 0 };
    cur.count += 1; cur.revenue += Number(o.total ?? 0);
    map.set(o.created_by, cur);
  }
  if (map.size === 0) return [];

  const ids = Array.from(map.keys());
  const { data: profiles } = await supabase
    .from("profiles").select("id,first_name,last_name").in("id", ids);
  const nameById = new Map<string, string>();
  (profiles ?? []).forEach((p) => nameById.set(p.id, `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Sans nom"));

  return Array.from(map.entries()).map(([id, v]) => ({
    user_id: id,
    name: nameById.get(id) ?? "Sans nom",
    orders_count: v.count,
    revenue: v.revenue,
    avg_ticket: v.count > 0 ? v.revenue / v.count : 0,
  })).sort((a, b) => b.revenue - a.revenue);
}

export async function fetchCategoryMargins(restaurantId: string, fromISO: string, toISO: string): Promise<CategoryMargin[]> {
  const { data: orders } = await supabase
    .from("orders").select("id")
    .eq("restaurant_id", restaurantId).eq("status", "paid")
    .gte("created_at", fromISO).lte("created_at", toISO);
  const orderIds = (orders ?? []).map((o) => o.id);
  if (orderIds.length === 0) return [];

  const [itemsRes, menuRes, recipesRes, stockRes] = await Promise.all([
    supabase.from("order_items").select("menu_item_id,quantity,unit_price").in("order_id", orderIds).neq("status", "cancelled"),
    supabase.from("menu_items").select("id,category_id,menu_categories(name)").eq("restaurant_id", restaurantId),
    supabase.from("menu_item_recipes").select("menu_item_id,stock_item_id,quantity").eq("restaurant_id", restaurantId),
    supabase.from("stock_items").select("id,cost_per_unit").eq("restaurant_id", restaurantId),
  ]);

  const stockCost = new Map<string, number>();
  (stockRes.data ?? []).forEach((s) => stockCost.set(s.id, Number(s.cost_per_unit ?? 0)));
  const unitCostByItem = new Map<string, number>();
  for (const r of recipesRes.data ?? []) {
    const c = (stockCost.get(r.stock_item_id) ?? 0) * Number(r.quantity);
    unitCostByItem.set(r.menu_item_id, (unitCostByItem.get(r.menu_item_id) ?? 0) + c);
  }
  const catByItem = new Map<string, string>();
  (menuRes.data ?? []).forEach((m) => {
    const cat = (m.menu_categories as unknown as { name?: string } | null)?.name ?? "Sans catégorie";
    catByItem.set(m.id, cat);
  });

  const agg = new Map<string, { revenue: number; cost: number }>();
  for (const it of itemsRes.data ?? []) {
    if (!it.menu_item_id) continue;
    const cat = catByItem.get(it.menu_item_id) ?? "Sans catégorie";
    const cur = agg.get(cat) ?? { revenue: 0, cost: 0 };
    cur.revenue += Number(it.unit_price) * it.quantity;
    cur.cost += (unitCostByItem.get(it.menu_item_id) ?? 0) * it.quantity;
    agg.set(cat, cur);
  }

  return Array.from(agg.entries()).map(([category, v]) => ({
    category,
    revenue: v.revenue,
    food_cost: v.cost,
    margin: v.revenue - v.cost,
    margin_pct: v.revenue > 0 ? ((v.revenue - v.cost) / v.revenue) * 100 : 0,
  })).sort((a, b) => b.revenue - a.revenue);
}

export async function fetchTopWines(restaurantId: string, fromISO: string, toISO: string): Promise<TopWine[]> {
  const { data: movs } = await supabase
    .from("wine_movements")
    .select("wine_id,quantity,movement_type,created_at,wines(name,vintage,bottle_price,bottles_in_stock)")
    .eq("restaurant_id", restaurantId)
    .eq("movement_type", "out")
    .gte("created_at", fromISO)
    .lte("created_at", toISO);

  const agg = new Map<string, { name: string; vintage: number | null; units: number; revenue: number; stock: number }>();
  for (const m of movs ?? []) {
    const w = m.wines as unknown as { name?: string; vintage?: number | null; bottle_price?: number; bottles_in_stock?: number } | null;
    if (!w) continue;
    const cur = agg.get(m.wine_id) ?? { name: w.name ?? "—", vintage: w.vintage ?? null, units: 0, revenue: 0, stock: w.bottles_in_stock ?? 0 };
    cur.units += Number(m.quantity);
    cur.revenue += Number(w.bottle_price ?? 0) * Number(m.quantity);
    agg.set(m.wine_id, cur);
  }

  const days = Math.max(1, (new Date(toISO).getTime() - new Date(fromISO).getTime()) / (1000 * 60 * 60 * 24));

  return Array.from(agg.entries()).map(([id, v]) => ({
    wine_id: id,
    name: v.name,
    vintage: v.vintage,
    units_sold: v.units,
    revenue: v.revenue,
    current_stock: v.stock,
    rotation_days: v.units > 0 ? Math.round((v.stock / v.units) * days) : null,
  })).sort((a, b) => b.revenue - a.revenue);
}