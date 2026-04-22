import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Cancel or reactivate auto-renewal of the current user's subscription.
 * Body: { action: "cancel" | "reactivate" }
 *
 * "cancel" sets cancel_at_period_end = true (user keeps access until period_end).
 * "reactivate" clears cancel_at_period_end (only valid before period_end).
 * Optionally calls Chariow API to stop/resume billing if a real subscription id exists.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return json({ error: "missing_auth" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "unauthorized" }, 401);
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    if (!["cancel", "reactivate"].includes(action)) {
      return json({ error: "invalid_action" }, 400);
    }

    const { data: sub, error: subErr } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("environment", "live")
      .maybeSingle();

    if (subErr || !sub) return json({ error: "no_subscription" }, 404);

    if (action === "cancel") {
      if (sub.status === "trialing") {
        return json({ error: "cannot_cancel_trial", message: "L'essai gratuit n'est pas facturé." }, 400);
      }
      // Best-effort Chariow API call (non-blocking on failure)
      const key = Deno.env.get("CHARIOW_API_KEY");
      if (key && sub.paddle_subscription_id && !sub.paddle_subscription_id.startsWith("trial_") && !sub.paddle_subscription_id.startsWith("admin_grant_")) {
        try {
          await fetch(`https://api.chariow.com/v1/subscriptions/${sub.paddle_subscription_id}/cancel`, {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          });
        } catch (e) {
          console.warn("[subscription-cancel] chariow api warn", e);
        }
      }
      await supabase.from("subscriptions")
        .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
        .eq("id", sub.id);
      return json({ ok: true, action: "cancelled", access_until: sub.current_period_end });
    }

    // reactivate
    if (!sub.cancel_at_period_end) {
      return json({ ok: true, action: "noop", message: "Abonnement déjà actif." });
    }
    if (sub.current_period_end && new Date(sub.current_period_end) < new Date()) {
      return json({ error: "period_ended", message: "Période expirée, souscrivez un nouveau plan." }, 400);
    }
    await supabase.from("subscriptions")
      .update({ cancel_at_period_end: false, updated_at: new Date().toISOString() })
      .eq("id", sub.id);
    return json({ ok: true, action: "reactivated" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[subscription-cancel] error", msg);
    return json({ error: msg }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}