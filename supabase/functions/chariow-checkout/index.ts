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

    // Chariow requires first_name, last_name and phone (number + country_code)
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, restaurant_id")
      .eq("id", userId)
      .maybeSingle();

    let restaurantPhone: string | null = null;
    let restaurantCountry: string | null = null;
    if (profile?.restaurant_id) {
      const { data: resto } = await supabase
        .from("restaurants")
        .select("phone, whatsapp, country_code, name")
        .eq("id", profile.restaurant_id)
        .maybeSingle();
      restaurantPhone = resto?.phone || resto?.whatsapp || null;
      restaurantCountry = resto?.country_code || null;
    }

    const emailLocal = userEmail.split("@")[0] || "Client";
    const firstName = String(body.first_name || profile?.first_name || emailLocal || "Client").trim();
    const lastName = String(body.last_name || profile?.last_name || "RestoFlow").trim();

     // Phone: accept body override, else restaurant phone.
     const rawPhone = String(body.phone || restaurantPhone || "").trim();
     // Chariow expects ISO 3166-1 alpha-2 country code (e.g. "CI"), NOT the dial code.
     let countryIso = String(body.country_code || restaurantCountry || "CI").toUpperCase().slice(0, 2);
     // Map dial code -> ISO if someone passes "225" instead of "CI"
     const dialToIso: Record<string, string> = {
       "225": "CI", "221": "SN", "229": "BJ", "226": "BF", "228": "TG",
       "223": "ML", "227": "NE", "224": "GN", "237": "CM", "241": "GA",
       "242": "CG", "243": "CD", "235": "TD", "236": "CF",
       "33": "FR", "32": "BE", "41": "CH", "1": "US",
       "212": "MA", "213": "DZ", "216": "TN",
     };
     // Strip phone to digits, detect leading dial code if present
     let phoneNumber = rawPhone.replace(/[^\d+]/g, "");
     if (phoneNumber.startsWith("+")) {
       const m = phoneNumber.match(/^\+(\d{1,4})/);
       if (m && dialToIso[m[1]]) {
         countryIso = dialToIso[m[1]];
         phoneNumber = phoneNumber.slice(m[0].length);
       } else {
         phoneNumber = phoneNumber.replace(/^\+/, "");
       }
     } else {
       // If number starts with a known dial code, strip it
       for (const dc of Object.keys(dialToIso).sort((a, b) => b.length - a.length)) {
         if (phoneNumber.startsWith(dc)) {
           if (!body.country_code && !restaurantCountry) countryIso = dialToIso[dc];
           phoneNumber = phoneNumber.slice(dc.length);
           break;
         }
       }
     }
     // If countryIso looks like a dial code (digits), convert it
     if (/^\d+$/.test(countryIso)) {
       countryIso = dialToIso[countryIso] || "CI";
     }
     if (!phoneNumber) phoneNumber = "0000000000";

    const checkoutRes = await fetch(`${CHARIOW_API}/checkout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: prod.chariow_product_id,
        email: userEmail,
        first_name: firstName,
        last_name: lastName,
        phone: {
          number: phoneNumber,
          country_code: countryIso,
        },
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
      console.error("Chariow /checkout failed", {
        status: checkoutRes.status,
        body: checkoutText,
        product_id: prod.chariow_product_id,
        plan_key: planKey,
        cycle,
      });
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