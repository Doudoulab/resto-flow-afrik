import { supabase } from "@/integrations/supabase/client";

export async function logAudit(params: {
  restaurantId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  reason?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("audit_log").insert({
    restaurant_id: params.restaurantId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    reason: params.reason ?? null,
    before_data: (params.before ?? null) as never,
    after_data: (params.after ?? null) as never,
    user_id: user?.id ?? null,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
  });
}