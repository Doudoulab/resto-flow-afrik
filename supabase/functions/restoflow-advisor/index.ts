import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages = [] } = await req.json().catch(() => ({ messages: [] }));

    // Get the user's restaurant id
    const { data: profile } = await supabase
      .from("profiles")
      .select("restaurant_id")
      .eq("id", claims.claims.sub)
      .maybeSingle();

    if (!profile?.restaurant_id) {
      return new Response(JSON.stringify({ error: "no_restaurant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const restaurantId = profile.restaurant_id;

    // Aggregate context: sales last 30 days, top dishes, low stock, pending orders
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceISO = since.toISOString();

    const [ordersRes, itemsRes, stockRes, menuCountRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id, total, status, created_at")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", sinceISO)
        .limit(1000),
      supabase
        .from("order_items")
        .select("name_snapshot, quantity, unit_price, order_id, orders!inner(restaurant_id, created_at, status)")
        .gte("orders.created_at", sinceISO)
        .eq("orders.restaurant_id", restaurantId)
        .limit(2000),
      supabase
        .from("stock_items")
        .select("name, quantity, alert_threshold, unit")
        .eq("restaurant_id", restaurantId),
      supabase
        .from("menu_items")
        .select("id, name, price, is_available")
        .eq("restaurant_id", restaurantId)
        .limit(200),
    ]);

    const orders = ordersRes.data ?? [];
    const items = itemsRes.data ?? [];
    const stock = stockRes.data ?? [];
    const menu = menuCountRes.data ?? [];

    const paidOrders = orders.filter((o: any) => o.status === "paid");
    const revenue30d = paidOrders.reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);
    const avgTicket = paidOrders.length ? Math.round(revenue30d / paidOrders.length) : 0;

    // Top selling dishes by qty
    const dishMap = new Map<string, { qty: number; revenue: number }>();
    for (const it of items as any[]) {
      const cur = dishMap.get(it.name_snapshot) ?? { qty: 0, revenue: 0 };
      cur.qty += it.quantity;
      cur.revenue += Number(it.unit_price) * it.quantity;
      dishMap.set(it.name_snapshot, cur);
    }
    const topDishes = [...dishMap.entries()]
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 8)
      .map(([name, v]) => ({ name, qty: v.qty, revenue: Math.round(v.revenue) }));

    const lowStock = stock.filter((s: any) =>
      Number(s.quantity) <= Number(s.alert_threshold)
    );

    const context = {
      période: "30 derniers jours",
      ventes: {
        nb_commandes_payées: paidOrders.length,
        chiffre_affaires_FCFA: Math.round(revenue30d),
        ticket_moyen_FCFA: avgTicket,
      },
      top_plats: topDishes,
      stock_alerte: lowStock.map((s: any) => ({
        nom: s.name,
        quantité: Number(s.quantity),
        seuil: Number(s.alert_threshold),
        unité: s.unit,
      })),
      total_plats_au_menu: menu.length,
    };

    const systemPrompt = `Tu es "Conseil RestoFlow", un assistant IA expert en gestion de restaurant en Afrique de l'Ouest (devise FCFA).
Ton rôle : analyser les données réelles du restaurant ci-dessous et donner des conseils concrets, courts et actionnables.

Règles :
- Réponds toujours en français.
- Utilise des chiffres précis tirés du contexte fourni.
- Sois concis : maximum 4-6 puces ou 1 court paragraphe.
- Suggère des actions concrètes (ex: "promouvez X car...", "réapprovisionnez Y avant...").
- Ne JAMAIS inventer de données : si une info manque, dis-le.

Contexte du restaurant :
${JSON.stringify(context, null, 2)}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (aiRes.status === 429) {
      return new Response(
        JSON.stringify({ error: "Trop de requêtes, réessayez dans un instant." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (aiRes.status === 402) {
      return new Response(
        JSON.stringify({ error: "Crédits IA épuisés. Ajoutez-en dans votre workspace Lovable." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "Erreur du moteur IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const reply = data?.choices?.[0]?.message?.content ?? "";

    return new Response(
      JSON.stringify({ reply, context }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("restoflow-advisor error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});