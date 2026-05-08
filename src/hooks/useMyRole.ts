import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type EmployeeRole = "manager" | "waiter" | "kitchen" | "cashier";

/**
 * Returns the current user's role for their restaurant (from user_roles).
 * Owners are always considered "manager".
 */
export const useMyRole = () => {
  const { user, profile, restaurant } = useAuth();
  const [role, setRole] = useState<EmployeeRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!user || !restaurant?.id) { setRole(null); setLoading(false); return; }
      if (profile?.is_owner) { setRole("manager"); setLoading(false); return; }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("restaurant_id", restaurant.id)
        .maybeSingle();
      if (!cancelled) {
        setRole(((data?.role as EmployeeRole) ?? "waiter"));
        setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [user?.id, restaurant?.id, profile?.is_owner]);

  return { role, loading, isManager: role === "manager" };
};

/**
 * Allowlist of routes (sidebar `to` paths) per non-manager role.
 * Managers / owners see everything.
 */
export const ROLE_ROUTE_ALLOWLIST: Record<Exclude<EmployeeRole, "manager">, string[]> = {
  waiter: [
    "/app/orders",
    "/app/incoming",
    "/app/floor",
    "/app/reservations",
    "/app/menu",
    "/app/customers",
    "/app/timeclock",
    "/app/help",
  ],
  kitchen: [
    "/app/kitchen",
    "/app/incoming",
    "/app/printers",
    "/app/stock",
    "/app/menu",
    "/app/timeclock",
    "/app/help",
  ],
  cashier: [
    "/app/orders",
    "/app/floor",
    "/app/reports",
    "/app/customers",
    "/app/timeclock",
    "/app/billing",
    "/app/help",
  ],
};