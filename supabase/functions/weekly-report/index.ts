import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return j({ error: "LOVABLE_API_KEY missing" }, 500);

    let scheduled = false;
    try { const body = await req.clone().json(); scheduled = body?.scheduled === true; } catch {}

    const auth = req.headers.get("Authorization");
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let restaurantIds: string[] = [];
    if (scheduled) {
      const { data: rests } = await adminClient.from("restaurants").select("id");
      restaurantIds = (rests ?? []).map((r: any) => r.id);
    } else {
      if (!auth?.startsWith("Bearer ")) return j({ error: "Unauthorized" }, 401);
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: auth } } });
      const { data: claims } = await userClient.auth.getClaims(auth.replace("Bearer ", ""));
      if (!claims?.claims) return j({ error: "Unauthorized" }, 401);
      const { data: profile } = await userClient.from("profiles").select("restaurant_id").eq("id", claims.claims.sub).maybeSingle();
      const restaurantId = profile?.restaurant_id;
      if (!restaurantId) return j({ error: "no_restaurant" }, 400);
      restaurantIds = [restaurantId];
    }

    const results: any[] = [];
    for (const restaurantId of restaurantIds) {
      try {
        const r = await generateForRestaurant(adminClient, restaurantId, LOVABLE_API_KEY);
        results.push({ restaurantId, ok: true, report: r });
      } catch (e) {
        results.push({ restaurantId, ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return j(scheduled ? { ok: true, processed: results.length, results } : (results[0]?.ok ? { ok: true, report: results[0].report } : { error: results[0]?.error ?? "unknown" }));
  } catch (e) {
    console.error(e);
    return j({ error: e instanceof Error ? e.message : "Erreur" }, 500);
  }
});

async function generateForRestaurant(supabase: any, restaurantId: string, LOVABLE_API_KEY: string) {
  const now = new Date();
  const day = now.getUTCDay() || 7;
  const endOfLastWeek = new Date(now);
  endOfLastWeek.setUTCDate(now.getUTCDate() - day);
  endOfLastWeek.setUTCHours(23, 59, 59, 999);
  const startOfLastWeek = new Date(endOfLastWeek);
  startOfLastWeek.setUTCDate(endOfLastWeek.getUTCDate() - 6);
  startOfLastWeek.setUTCHours(0, 0, 0, 0);
  const prevStart = new Date(startOfLastWeek);
  prevStart.setUTCDate(prevStart.getUTCDate() - 7);

  const weekStartStr = startOfLastWeek.toISOString().slice(0, 10);
  const weekEndStr = endOfLastWeek.toISOString().slice(0, 10);

  const [thisWeekOrders, prevWeekOrders, itemsRes, stockRes] = await Promise.all([
    supabase.from("orders").select("total, status, created_at")
      .eq("restaurant_id", restaurantId).gte("created_at", startOfLastWeek.toISOString()).lte("created_at", endOfLastWeek.toISOString()).limit(5000),
    supabase.from("orders").select("total, status, created_at")
      .eq("restaurant_id", restaurantId).gte("created_at", prevStart.toISOString()).lt("created_at", startOfLastWeek.toISOString()).limit(5000),
    supabase.from("order_items")
      .select("name_snapshot, quantity, unit_price, orders!inner(restaurant_id, created_at, status)")
      .gte("orders.created_at", startOfLastWeek.toISOString()).lte("orders.created_at", endOfLastWeek.toISOString())
      .eq("orders.restaurant_id", restaurantId).limit(5000),
    supabase.from("stock_items").select("name, quantity, alert_threshold, unit").eq("restaurant_id", restaurantId),
  ]);

  const sumPaid = (rows: any[]) => rows.filter((o) => o.status === "paid").reduce((s, o) => s + Number(o.total ?? 0), 0);
  const cnt = (rows: any[]) => rows.filter((o) => o.status === "paid").length;
  const revenue = sumPaid(thisWeekOrders.data ?? []);
  const prevRevenue = sumPaid(prevWeekOrders.data ?? []);
  const orderCount = cnt(thisWeekOrders.data ?? []);
  const prevOrderCount = cnt(prevWeekOrders.data ?? []);
  const evol = prevRevenue ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : null;

  const dishMap = new Map<string, { qty: number; revenue: number }>();
  for (const it of (itemsRes.data ?? []) as any[]) {
    const cur = dishMap.get(it.name_snapshot) ?? { qty: 0, revenue: 0 };
    cur.qty += it.quantity; cur.revenue += Number(it.unit_price) * it.quantity;
    dishMap.set(it.name_snapshot, cur);
  }
  const top = [...dishMap.entries()].sort((a, b) => b[1].qty - a[1].qty).slice(0, 5)
    .map(([name, v]) => ({ name, qty: v.qty, revenue: Math.round(v.revenue) }));
  const flop = [...dishMap.entries()].sort((a, b) => a[1].qty - b[1].qty).slice(0, 3)
    .map(([name, v]) => ({ name, qty: v.qty }));
  const lowStock = (stockRes.data ?? []).filter((s: any) => Number(s.quantity) <= Number(s.alert_threshold))
    .map((s: any) => ({ nom: s.name, quantité: Number(s.quantity), seuil: Number(s.alert_threshold), unité: s.unit }));

  const metrics = {
    revenue, prevRevenue, evolutionPct: evol, orderCount, prevOrderCount,
    avgTicket: orderCount ? Math.round(revenue / orderCount) : 0,
    topDishes: top, flopDishes: flop, lowStock,
  };

  const sys = `Tu es l'analyste IA de RestoFlow. Tu rédiges un rapport hebdomadaire CONCIS (8-12 lignes max) en français pour le gérant.
Structure :
1) Une phrase de synthèse (CA, évolution vs semaine précédente).
2) 2-3 puces de points forts.
3) 2-3 puces de points à surveiller.
4) 2-3 actions concrètes pour la semaine qui arrive.
Devise FCFA. Pas d'invention : utilise uniquement les données fournies.`;

  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: `Données de la semaine ${weekStartStr} au ${weekEndStr} :\n${JSON.stringify(metrics, null, 2)}` },
      ],
    }),
  });
  if (!aiRes.ok) throw new Error(`AI ${aiRes.status}`);
  const data = await aiRes.json();
  const summary = data?.choices?.[0]?.message?.content ?? "";

  const { data: saved, error: upErr } = await supabase
    .from("weekly_reports")
    .upsert({ restaurant_id: restaurantId, week_start: weekStartStr, week_end: weekEndStr, summary, metrics }, { onConflict: "restaurant_id,week_start" })
    .select().single();
  if (upErr) throw new Error(upErr.message);
  return saved;
}

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
