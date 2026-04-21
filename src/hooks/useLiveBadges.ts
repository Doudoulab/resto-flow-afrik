import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface LiveBadges {
  incomingOrders: number;
  todayReservations: number;
  lowStock: number;
  pendingKitchen: number;
}

export const useLiveBadges = () => {
  const { restaurant } = useAuth();
  const [badges, setBadges] = useState<LiveBadges>({
    incomingOrders: 0, todayReservations: 0, lowStock: 0, pendingKitchen: 0,
  });

  useEffect(() => {
    if (!restaurant?.id) return;
    const rid = restaurant.id;

    const refresh = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

      const [incoming, reservations, stock, kitchen] = await Promise.all([
        supabase.from("public_orders").select("id", { count: "exact", head: true })
          .eq("restaurant_id", rid).eq("status", "pending"),
        supabase.from("reservations").select("id", { count: "exact", head: true })
          .eq("restaurant_id", rid).gte("reserved_at", today).lt("reserved_at", tomorrow)
          .in("status", ["confirmed"]),
        supabase.from("stock_items").select("id, quantity, alert_threshold")
          .eq("restaurant_id", rid),
        supabase.from("order_items").select("id, status, orders!inner(restaurant_id, status)", { count: "exact", head: true })
          .eq("orders.restaurant_id", rid).in("status", ["pending", "preparing"])
          .neq("orders.status", "cancelled").neq("orders.status", "paid"),
      ]);

      const lowCount = (stock.data || []).filter((s: any) =>
        s.alert_threshold != null && s.quantity != null && Number(s.quantity) <= Number(s.alert_threshold)
      ).length;

      setBadges({
        incomingOrders: incoming.count || 0,
        todayReservations: reservations.count || 0,
        lowStock: lowCount,
        pendingKitchen: kitchen.count || 0,
      });
    };

    refresh();

    // Subscribe to realtime changes
    const channel = supabase.channel(`badges-${rid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "public_orders", filter: `restaurant_id=eq.${rid}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations", filter: `restaurant_id=eq.${rid}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_items", filter: `restaurant_id=eq.${rid}` }, refresh)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [restaurant?.id]);

  return badges;
};
