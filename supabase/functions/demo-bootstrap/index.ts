import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALL_MODULES = [
  "kitchen", "printers", "incoming", "reports", "accounting", "customers", "suppliers", "receipts", "inventory", "timeclock",
  "payroll", "wines", "tasting", "gueridon", "pms", "menu_engineering", "analytics", "advisor", "audit", "security",
  "backups", "health", "fiscal", "exports", "errors", "multi_restaurant", "api_webhooks", "white_label",
  "consolidated_reports", "priority_support",
];

const DEMO_USERS = [
  { email: "demo@restoflow.africa", first_name: "Aminata", last_name: "Gérante", role: "manager", is_owner: true, job_title: "Gérante générale" },
  { email: "serveur@restoflow.africa", first_name: "Moussa", last_name: "Service", role: "waiter", is_owner: false, job_title: "Chef de rang", pin: "1234" },
  { email: "cuisine@restoflow.africa", first_name: "Khadija", last_name: "Cuisine", role: "kitchen", is_owner: false, job_title: "Chef de cuisine", pin: "2345" },
  { email: "caisse@restoflow.africa", first_name: "Ibrahima", last_name: "Caisse", role: "cashier", is_owner: false, job_title: "Caissier", pin: "3456" },
] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const restaurantId = crypto.randomUUID();
    const password = "DemoResto2026!";
    const userIds: Record<string, string> = {};

    for (const demoUser of DEMO_USERS) {
      const email = demoUser.email.toLowerCase();
      let userId: string | undefined;
      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: demoUser.first_name,
          last_name: demoUser.last_name,
        },
      });

      if (created?.user) userId = created.user.id;
      if (!userId && error?.message.toLowerCase().includes("already")) {
        for (let page = 1; page <= 10 && !userId; page += 1) {
          const { data } = await admin.auth.admin.listUsers({ page, perPage: 100 });
          userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id;
        }
      }
      if (!userId) throw new Error(error?.message || `Unable to create ${email}`);
      userIds[email] = userId;
    }

    const ownerId = userIds["demo@restoflow.africa"];
    await admin.from("restaurants").upsert({
      id: restaurantId,
      owner_id: ownerId,
      name: "RestoFlow Palace — Démo Business",
      slug: "demo-business",
      currency: "FCFA",
      country_code: "SN",
      description: "Restaurant de démonstration avec accès Business complet.",
      enabled_modules: ALL_MODULES,
      accepts_online_orders: true,
    }, { onConflict: "id" });

    for (const demoUser of DEMO_USERS) {
      const userId = userIds[demoUser.email];
      await admin.from("profiles").upsert({
        id: userId,
        first_name: demoUser.first_name,
        last_name: demoUser.last_name,
        restaurant_id: restaurantId,
        is_owner: demoUser.is_owner,
      }, { onConflict: "id" });
      await admin.from("user_roles").upsert({
        user_id: userId,
        restaurant_id: restaurantId,
        role: demoUser.role,
      }, { onConflict: "user_id,restaurant_id,role" });
      if (!demoUser.is_owner) {
        await admin.from("employee_details").upsert({
          restaurant_id: restaurantId,
          user_id: userId,
          job_title: demoUser.job_title,
          contract_type: "cdi",
          hired_at: new Date().toISOString().slice(0, 10),
          is_active: true,
        }, { onConflict: "restaurant_id,user_id" });
        await admin.rpc("admin_set_clock_pin", { _user_id: userId, _pin: demoUser.pin });
      }
    }

    await admin.from("subscriptions").upsert({
      user_id: ownerId,
      paddle_subscription_id: `demo_business_${ownerId}`,
      paddle_customer_id: "demo_customer",
      product_id: "business_plan",
      price_id: "demo_business_live",
      status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      cancel_at_period_end: false,
      environment: "live",
      provider: "demo",
      updated_at: new Date().toISOString(),
    }, { onConflict: "paddle_subscription_id" });

    return json({ ok: true, restaurant_id: restaurantId, users: DEMO_USERS.map((u) => u.email) });
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}