import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const CHARIOW_API = "https://api.chariow.com/v1";

async function chariow(path: string, init: RequestInit = {}) {
  const key = Deno.env.get("CHARIOW_API_KEY");
  if (!key) throw new Error("CHARIOW_API_KEY missing in edge function secrets");
  const method = init.method ?? "GET";
  const headers = new Headers(init.headers ?? undefined);
  headers.set("Authorization", `Bearer ${key}`);
  if (init.body) {
    headers.set("Content-Type", "application/json");
  } else {
    headers.delete("Content-Type");
  }

  const res = await fetch(`${CHARIOW_API}${path}`, {
    ...init,
    method,
    body: method === "GET" || method === "HEAD" ? undefined : init.body,
    headers,
  });
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  if (!res.ok) {
    throw new Error(`Chariow API ${path} → HTTP ${res.status}: ${text.slice(0, 500)}`);
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
      return new Response(JSON.stringify({ ok: false, error: "unauthenticated" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: admin } = await supabase
      .from("platform_admins").select("id").eq("user_id", userData.user.id).maybeSingle();
    if (!admin) {
      return new Response(JSON.stringify({ ok: false, error: "forbidden — platform admin only" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Chariow API does NOT allow product creation — only listing.
    // We fetch all published products from Chariow so the admin can map them.
    const listed = await chariow("/products?per_page=100", { method: "GET" });
    const items = (((listed.data as Record<string, unknown>)?.data) ?? listed.data ?? []) as Array<Record<string, unknown>>;

    const products = items.map((p) => ({
      id: String(p.id ?? ""),
      name: String(p.name ?? ""),
      slug: String(p.slug ?? ""),
      type: String(p.type ?? ""),
      pricing_type: String(p.pricing_type ?? ""),
      price_amount: Number(p.price_amount ?? 0),
      price_formatted: String(p.price_formatted ?? ""),
      currency: String(p.currency ?? ""),
      thumbnail: p.thumbnail ?? null,
    }));

    return new Response(JSON.stringify({ ok: true, products }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[chariow-bootstrap]", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});