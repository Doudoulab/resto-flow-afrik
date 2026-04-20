import { supabase } from "@/integrations/supabase/client";
import { cacheSet } from "./db";

export const prefetchForOffline = async (restaurantId: string) => {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const isoStart = startOfDay.toISOString();

    const [cats, items, recipes, stock, tables, customers, ordersToday, orderItemsToday] = await Promise.all([
      supabase.from("menu_categories").select("*").eq("restaurant_id", restaurantId).order("sort_order"),
      supabase.from("menu_items").select("*").eq("restaurant_id", restaurantId),
      supabase.from("menu_item_recipes").select("*").eq("restaurant_id", restaurantId),
      supabase.from("stock_items").select("*").eq("restaurant_id", restaurantId),
      supabase.from("restaurant_tables").select("*").eq("restaurant_id", restaurantId).order("sort_order"),
      supabase.from("customers").select("*").eq("restaurant_id", restaurantId),
      supabase.from("orders").select("*").eq("restaurant_id", restaurantId).gte("created_at", isoStart).order("created_at", { ascending: false }),
      supabase.from("order_items").select("*, orders!inner(restaurant_id, created_at)").eq("orders.restaurant_id", restaurantId).gte("orders.created_at", isoStart),
    ]);

    await Promise.all([
      cacheSet(`menu_categories:${restaurantId}`, cats.data ?? []),
      cacheSet(`menu_items:${restaurantId}`, items.data ?? []),
      cacheSet(`menu_item_recipes:${restaurantId}`, recipes.data ?? []),
      cacheSet(`stock_items:${restaurantId}`, stock.data ?? []),
      cacheSet(`restaurant_tables:${restaurantId}`, tables.data ?? []),
      cacheSet(`customers:${restaurantId}`, customers.data ?? []),
      cacheSet(`orders_today:${restaurantId}`, ordersToday.data ?? []),
      cacheSet(`order_items_today:${restaurantId}`, orderItemsToday.data ?? []),
      cacheSet(`prefetch_meta:${restaurantId}`, { at: Date.now() }),
    ]);
  } catch (e) {
    console.warn("prefetchForOffline failed", e);
  }
};
