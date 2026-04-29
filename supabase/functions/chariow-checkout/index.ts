import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const firstName = String(userData.user.user_metadata?.first_name ?? "Client").slice(0, 50);
    const lastName = String(userData.user.user_metadata?.last_name ?? "RestoFlow").slice(0, 50);

    const body = await req.json().catch(() => ({}));
    const planKey = String(body.plan_key ?? "");
    const cycle = String(body.cycle ?? "");
    if (!["starter_plan", "pro_plan", "business_plan"].includes(planKey) || !["monthly", "yearly", "lifetime"].includes(cycle)) {
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("restaurant_id")
      .eq("id", userId)
      .maybeSingle();
    const { data: restaurant } = profile?.restaurant_id
      ? await supabase.from("restaurants").select("phone, whatsapp").eq("id", profile.restaurant_id).maybeSingle()
      : { data: null };

    const rawPhone = String(restaurant?.phone ?? restaurant?.whatsapp ?? "58444818").replace(/\D/g, "");
    const phoneNumber = rawPhone.startsWith("226") ? rawPhone.slice(3) : rawPhone;
    const origin = req.headers.get("Origin") ?? "https://resto-flow-afrik.lovable.app";

    const checkoutRes = await fetch(`${CHARIOW_API}/checkout`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_id: prod.chariow_product_id,
        email: userEmail,
        first_name: firstName || "Client",
        last_name: lastName || "RestoFlow",
        phone: { number: phoneNumber || "58444818", country_code: "BF" },
        payment_currency: prod.currency || "XOF",
        redirect_url: `${origin}/checkout-success`,
        custom_metadata: { user_id: userId, plan_key: planKey, cycle, email: userEmail },
      }),
    });
    const checkoutText = await checkoutRes.text();
    let checkout: any = null;
    try { checkout = checkoutText ? JSON.parse(checkoutText) : null; } catch { /* ignore */ }
    if (!checkoutRes.ok) {
      return new Response(JSON.stringify({ ok: false, error: "chariow_checkout_failed", status: checkoutRes.status, details: checkout ?? checkoutText }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = checkout?.data?.payment?.checkout_url;
    if (!url) {
      return new Response(JSON.stringify({ ok: false, error: "no_checkout_url", details: checkout }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});