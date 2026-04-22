// Public read-only REST API for Business plan subscribers
// Endpoints:
//   GET /public-api/orders?limit=50&since=ISO
//   GET /public-api/menu
//   GET /public-api/stats?from=ISO&to=ISO
// Auth: Authorization: Bearer <api_key>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // --- Auth ---
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return json({ error: "missing_api_key" }, 401);

  const hash = await sha256Hex(token);
  const { data: keyRow } = await supabase
    .from("api_keys")
    .select("id, restaurant_id, scopes, expires_at, revoked_at")
    .eq("key_hash", hash)
    .maybeSingle();

  if (!keyRow || keyRow.revoked_at || (keyRow.expires_at && new Date(keyRow.expires_at) < new Date())) {
    return json({ error: "invalid_or_revoked_api_key" }, 401);
  }

  // Touch last_used_at (fire and forget)
  supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id).then(() => {});

  const url = new URL(req.url);
  // Path: /public-api/<resource>
  const parts = url.pathname.split("/").filter(Boolean);
  const resource = parts[parts.length - 1];
  const restaurantId = keyRow.restaurant_id;

  try {
    if (resource === "orders") {
      if (!keyRow.scopes.includes("read:orders")) return json({ error: "scope_missing" }, 403);
      const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 200);
      const since = url.searchParams.get("since");
      let q = supabase
        .from("orders")
        .select("id, order_number, status, payment_status, payment_method, table_number, subtotal, tax_amount, service_amount, tip_amount, discount_amount, total, amount_paid, created_at, updated_at")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (since) q = q.gte("created_at", since);
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 500);
      return json({ data });
    }

    if (resource === "menu") {
      if (!keyRow.scopes.includes("read:menu")) return json({ error: "scope_missing" }, 403);
      const [items, cats] = await Promise.all([
        supabase.from("menu_items").select("id, name, description, price, vat_rate, is_available, category_id, image_url, sort_order").eq("restaurant_id", restaurantId).order("sort_order"),
        supabase.from("menu_categories").select("id, name, sort_order").eq("restaurant_id", restaurantId).order("sort_order"),
      ]);
      if (items.error) return json({ error: items.error.message }, 500);
      return json({ data: { categories: cats.data ?? [], items: items.data ?? [] } });
    }

    if (resource === "stats") {
      if (!keyRow.scopes.includes("read:stats")) return json({ error: "scope_missing" }, 403);
      const from = url.searchParams.get("from") ?? new Date(Date.now() - 30 * 86400_000).toISOString();
      const to = url.searchParams.get("to") ?? new Date().toISOString();
      const { data, error } = await supabase
        .from("orders")
        .select("total, tax_amount, status, payment_status")
        .eq("restaurant_id", restaurantId)
        .eq("payment_status", "paid")
        .gte("created_at", from)
        .lte("created_at", to);
      if (error) return json({ error: error.message }, 500);
      const revenue = (data ?? []).reduce((s, o: any) => s + Number(o.total ?? 0), 0);
      const tax = (data ?? []).reduce((s, o: any) => s + Number(o.tax_amount ?? 0), 0);
      return json({ data: { from, to, orders_count: data?.length ?? 0, revenue, tax, average_ticket: data?.length ? revenue / data.length : 0 } });
    }

    return json({ error: "unknown_resource", available: ["orders", "menu", "stats"] }, 404);
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});