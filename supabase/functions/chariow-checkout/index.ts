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

    // Build the Chariow hosted checkout page URL.
    // The customer fills in their information (name, phone, etc.) on Chariow's
    // page before being redirected to the actual payment step. This avoids
    // requiring (and failing on) pre-filled data for brand-new restaurants
    // that haven't yet entered profile/phone information.
    const metadata = encodeURIComponent(
      JSON.stringify({ user_id: userId, plan_key: planKey, cycle, email: userEmail })
    );
    const url = `https://checkout.chariow.com/${prod.chariow_product_id}?metadata=${metadata}`;

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