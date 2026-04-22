import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "@supabase/supabase-js";

const CHARIOW_API = "https://api.chariow.com/v1";

type PlanDef = {
  plan_key: "pro_plan" | "business_plan";
  cycle: "monthly" | "yearly";
  name: string;
  amount: number; // in XOF
  currency: string;
  recurring_interval: "month" | "year";
};

const PLANS: PlanDef[] = [
  { plan_key: "pro_plan", cycle: "monthly", name: "RestoFlow Pro - Mensuel", amount: 19000, currency: "XOF", recurring_interval: "month" },
  { plan_key: "pro_plan", cycle: "yearly",  name: "RestoFlow Pro - Annuel",  amount: 182000, currency: "XOF", recurring_interval: "year" },
  { plan_key: "business_plan", cycle: "monthly", name: "RestoFlow Business - Mensuel", amount: 52000, currency: "XOF", recurring_interval: "month" },
  { plan_key: "business_plan", cycle: "yearly",  name: "RestoFlow Business - Annuel",  amount: 499000, currency: "XOF", recurring_interval: "year" },
];

async function chariow(path: string, init: RequestInit = {}) {
  const key = Deno.env.get("CHARIOW_API_KEY");
  if (!key) throw new Error("CHARIOW_API_KEY missing");
  const res = await fetch(`${CHARIOW_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  if (!res.ok) {
    throw new Error(`Chariow ${path} ${res.status}: ${text}`);
  }
  return json as Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // verify caller is platform admin
    const auth = req.headers.get("Authorization") ?? "";
    const jwt = auth.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(jwt);
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: admin } = await supabase
      .from("platform_admins").select("id").eq("user_id", userData.user.id).maybeSingle();
    if (!admin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<Record<string, unknown>> = [];

    for (const plan of PLANS) {
      // Skip if already in DB
      const { data: existing } = await supabase
        .from("chariow_products")
        .select("*")
        .eq("plan_key", plan.plan_key)
        .eq("cycle", plan.cycle)
        .maybeSingle();
      if (existing) {
        results.push({ plan_key: plan.plan_key, cycle: plan.cycle, status: "exists", id: existing.chariow_product_id });
        continue;
      }

      // Create product on Chariow as a "license" (subscription type)
      const created = await chariow("/products", {
        method: "POST",
        body: JSON.stringify({
          name: plan.name,
          type: "license",
          price: plan.amount,
          currency: plan.currency,
          recurring: true,
          recurring_interval: plan.recurring_interval,
          description: `Abonnement ${plan.plan_key === "pro_plan" ? "Pro" : "Business"} RestoFlow (${plan.cycle === "monthly" ? "mensuel" : "annuel"}).`,
        }),
      });

      const data = (created.data ?? created) as Record<string, unknown>;
      const productId = String(data.id ?? data.product_id ?? "");
      const priceId = data.price_id ? String(data.price_id) : null;

      await supabase.from("chariow_products").insert({
        plan_key: plan.plan_key,
        cycle: plan.cycle,
        chariow_product_id: productId,
        chariow_price_id: priceId,
        amount: plan.amount,
        currency: plan.currency,
      });

      results.push({ plan_key: plan.plan_key, cycle: plan.cycle, status: "created", id: productId });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});