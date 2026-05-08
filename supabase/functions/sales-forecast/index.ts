import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Prédit le CA et le nb de commandes des 7 prochains jours à partir des 8 dernières semaines.
// Méthode : moyenne pondérée par jour de la semaine (les semaines récentes pèsent plus).
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return j({ error: "Unauthorized" }, 401);
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: claims } = await supabase.auth.getClaims(auth.replace("Bearer ", ""));
    if (!claims?.claims) return j({ error: "Unauthorized" }, 401);

    const { data: profile } = await supabase
      .from("profiles").select("restaurant_id").eq("id", claims.claims.sub).maybeSingle();
    const restaurantId = profile?.restaurant_id;
    if (!restaurantId) return j({ error: "no_restaurant" }, 400);

    const since = new Date();
    since.setDate(since.getDate() - 56); // 8 semaines
    since.setHours(0, 0, 0, 0);

    const { data: orders, error } = await supabase
      .from("orders").select("total, status, created_at")
      .eq("restaurant_id", restaurantId)
      .gte("created_at", since.toISOString())
      .neq("status", "cancelled")
      .limit(20000);
    if (error) return j({ error: error.message }, 500);

    // Group by date YYYY-MM-DD
    const dayMap = new Map<string, { revenue: number; count: number }>();
    for (const o of orders ?? []) {
      if (o.status !== "paid") continue;
      const d = new Date(o.created_at).toISOString().slice(0, 10);
      const cur = dayMap.get(d) ?? { revenue: 0, count: 0 };
      cur.revenue += Number(o.total ?? 0); cur.count += 1;
      dayMap.set(d, cur);
    }

    // Per weekday (0=Sun..6=Sat) collect samples with weights (recent weeks weigh more)
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const samples: Record<number, { rev: number; cnt: number; w: number; n: number }> = {};
    for (let i = 1; i <= 56; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const wd = d.getDay();
      const data = dayMap.get(key) ?? { revenue: 0, count: 0 };
      const weeksAgo = Math.ceil(i / 7); // 1..8
      const weight = 1 / weeksAgo; // récent = plus de poids
      const s = samples[wd] ?? { rev: 0, cnt: 0, w: 0, n: 0 };
      s.rev += data.revenue * weight; s.cnt += data.count * weight; s.w += weight; s.n += 1;
      samples[wd] = s;
    }

    const weekdayNames = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
    const forecast: Array<{ date: string; weekday: string; revenue: number; orders: number }> = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today); d.setDate(d.getDate() + i);
      const wd = d.getDay();
      const s = samples[wd];
      const rev = s && s.w ? s.rev / s.w : 0;
      const cnt = s && s.w ? s.cnt / s.w : 0;
      forecast.push({
        date: d.toISOString().slice(0, 10),
        weekday: weekdayNames[wd],
        revenue: Math.round(rev),
        orders: Math.round(cnt),
      });
    }

    const totalRevenue = forecast.reduce((s, f) => s + f.revenue, 0);
    const totalOrders = forecast.reduce((s, f) => s + f.orders, 0);
    const dataPoints = dayMap.size;
    const confidence = dataPoints >= 28 ? "haute" : dataPoints >= 14 ? "moyenne" : "faible";

    return j({ ok: true, forecast, totalRevenue, totalOrders, dataPoints, confidence });
  } catch (e) {
    console.error(e);
    return j({ error: e instanceof Error ? e.message : "Erreur" }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}