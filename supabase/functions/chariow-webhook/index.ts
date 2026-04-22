import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "@supabase/supabase-js";

/**
 * Chariow Pulse (webhook) handler.
 * Expected events: sale.completed, license.created, license.renewed, license.cancelled, license.expired
 */

function addInterval(from: Date, cycle: string): Date {
  const d = new Date(from);
  if (cycle === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const payload = await req.json();
    console.log("[chariow-webhook] event:", payload?.event ?? payload?.type, "id:", payload?.id);

    const event = String(payload.event ?? payload.type ?? "");
    const data = payload.data ?? payload;
    const meta = (data.metadata ?? data.meta ?? {}) as Record<string, string>;
    const userId = meta.user_id;
    const planKey = meta.plan_key;
    const cycle = meta.cycle ?? "monthly";

    if (!userId || !planKey) {
      console.warn("[chariow-webhook] missing metadata", meta);
      return new Response(JSON.stringify({ ok: true, ignored: "missing_metadata" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const env = "live"; // Chariow doesn't have sandbox split for now; treat as live
    const now = new Date();

    if (event.startsWith("sale.completed") || event.startsWith("license.created") || event.startsWith("license.renewed")) {
      const periodEnd = addInterval(now, cycle);
      const externalId = String(data.id ?? data.sale_id ?? data.license_id ?? `chariow_${Date.now()}`);
      const customerId = String(data.customer_id ?? data.customer?.id ?? data.customer_email ?? userId);
      const priceId = `${planKey === "pro_plan" ? "pro" : "business"}_${cycle}`;

      const { error } = await supabase.from("subscriptions").upsert({
        user_id: userId,
        environment: env,
        provider: "chariow",
        product_id: planKey,
        price_id: priceId,
        status: "active",
        paddle_subscription_id: externalId,
        paddle_customer_id: customerId,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
        updated_at: now.toISOString(),
      }, { onConflict: "user_id,environment" });

      if (error) {
        console.error("[chariow-webhook] upsert error", error);
        throw error;
      }
    } else if (event.startsWith("license.cancelled") || event.startsWith("subscription.cancelled")) {
      await supabase.from("subscriptions")
        .update({ cancel_at_period_end: true, updated_at: now.toISOString() })
        .eq("user_id", userId).eq("environment", env);
    } else if (event.startsWith("license.expired") || event.startsWith("subscription.expired")) {
      await supabase.from("subscriptions")
        .update({ status: "canceled", updated_at: now.toISOString() })
        .eq("user_id", userId).eq("environment", env);
    } else {
      console.log("[chariow-webhook] unhandled event", event);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[chariow-webhook] error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});