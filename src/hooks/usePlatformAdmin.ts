import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PlatformRole = "super_admin" | "support" | "finance" | "viewer";

const CAN_WRITE: PlatformRole[] = ["super_admin", "support"];
const CAN_MANAGE_ADMINS: PlatformRole[] = ["super_admin"];
const CAN_VIEW_FINANCE: PlatformRole[] = ["super_admin", "finance"];

export function usePlatformAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [role, setRole] = useState<PlatformRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshAdminStatus = () => {
    setLoading(true);
    setRefreshKey((current) => current + 1);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setIsAdmin(false); setRole(null); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      // Prefer the new role assignment table, fall back to legacy platform_admins
      const [{ data: assignment }, { data: legacy }] = await Promise.all([
        supabase.from("platform_role_assignments").select("role").eq("user_id", user.id).maybeSingle(),
        supabase.from("platform_admins").select("id").eq("user_id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      const resolvedRole: PlatformRole | null =
        (assignment?.role as PlatformRole | undefined) ?? (legacy ? "super_admin" : null);
      setRole(resolvedRole);
      setIsAdmin(!!resolvedRole);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, authLoading, refreshKey]);

  const can = {
    write: !!role && CAN_WRITE.includes(role),
    manageAdmins: !!role && CAN_MANAGE_ADMINS.includes(role),
    viewFinance: !!role && CAN_VIEW_FINANCE.includes(role),
  };

  return { isAdmin: !!isAdmin, role, can, loading: loading || authLoading, refreshAdminStatus };
}