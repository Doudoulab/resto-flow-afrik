import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "@supabase/supabase-js";

const CHARIOW_API = "https://api.chariow.com/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const key = Deno.env.get("CHARIOW_API_KEY");
    if (!key) throw new Error("CHARIOW_API_KEY missing");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const auth = req.headers.get("Authorization") ?? "";
    const jwt = auth.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(jwt);
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;
    const userEmail = userData.user.email ?? "";

    const body = await req.json().catch(() => ({}));
    const planKey = String(body.plan_key ?? "");
    const cycle = String(body.cycle ?? "");
    if (!["pro_plan", "business_plan"].includes(planKey) || !["monthly", "yearly"].includes(cycle)) {
      return new Response(JSON.stringify({ error: "invalid_plan" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: prod, error: prodErr } = await supabase
      .from("chariow_products")
      .select("*")
      .eq("plan_key", planKey)
      .eq("cycle", cycle)
      .eq("is_active", true)
      .maybeSingle();
    if (prodErr || !prod) {
      return new Response(JSON.stringify({ error: "plan_not_configured", details: "Run chariow-bootstrap first" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = req.headers.get("origin") ?? "";
    const successUrl = body.success_url || `${origin}/checkout-success?provider=chariow`;
    const cancelUrl = body.cancel_url || `${origin}/pricing`;

    const checkoutRes = await fetch(`${CHARIOW_API}/checkout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: prod.chariow_product_id,
        customer_email: userEmail,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          user_id: userId,
          plan_key: planKey,
          cycle,
        },
      }),
    });
    const checkoutText = await checkoutRes.text();
    if (!checkoutRes.ok) {
      return new Response(JSON.stringify({ error: "chariow_error", status: checkoutRes.status, details: checkoutText }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const checkoutJson = JSON.parse(checkoutText);
    const data = checkoutJson.data ?? checkoutJson;
    const url = data.checkout_url ?? data.url ?? data.payment_url;
    if (!url) {
      return new Response(JSON.stringify({ error: "no_checkout_url", raw: checkoutJson }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url, raw: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});