import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const CHARIOW_API = "https://api.chariow.com/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const key = Deno.env.get("CHARIOW_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ ok: false, error: "CHARIOW_API_KEY missing in edge function secrets" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const auth = req.headers.get("Authorization") ?? "";
    const jwt = auth.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(jwt);
    if (!userData.user) {
      return new Response(JSON.stringify({ ok: false, error: "unauthenticated" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;
    const userEmail = userData.user.email ?? "";

    const body = await req.json().catch(() => ({}));
    const planKey = String(body.plan_key ?? "");
    const cycle = String(body.cycle ?? "");
    if (!["pro_plan", "business_plan"].includes(planKey) || !["monthly", "yearly"].includes(cycle)) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_plan", details: { planKey, cycle } }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      return new Response(JSON.stringify({ ok: false, error: "plan_not_configured", details: "Allez dans /admin/chariow et cliquez sur 'Créer les produits dans Chariow' avant de tester le paiement." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        email: userEmail,
        redirect_url: successUrl,
        custom_metadata: {
          user_id: userId,
          plan_key: planKey,
          cycle,
          cancel_url: cancelUrl,
        },
      }),
    });
    const checkoutText = await checkoutRes.text();
    if (!checkoutRes.ok) {
      return new Response(JSON.stringify({ ok: false, error: "chariow_api_error", status: checkoutRes.status, details: checkoutText }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const checkoutJson = JSON.parse(checkoutText);
    const data = checkoutJson.data ?? checkoutJson;
    // Per Chariow docs: data.payment.checkout_url
    const url =
      data?.payment?.checkout_url ??
      data?.checkout_url ??
      data?.url ??
      null;
    // Free products complete immediately (step === "completed") — treat as success
    if (!url && data?.step === "completed") {
      return new Response(JSON.stringify({ ok: true, url: successUrl, completed: true, raw: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!url) {
      return new Response(JSON.stringify({ ok: false, error: "no_checkout_url", raw: checkoutJson }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, url, raw: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});