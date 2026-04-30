import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface OrderItem {
  menu_item_id: string;
  name: string;
  unit_price: number;
  quantity: number;
}

interface Payload {
  restaurant_id: string;
  table_number?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  items: OrderItem[];
  total: number;
  notes?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Payload;
    if (!body?.restaurant_id || !Array.isArray(body.items) || body.items.length === 0) {
      return new Response(JSON.stringify({ error: "invalid_payload" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if ((body.customer_name?.length ?? 0) > 80 || (body.customer_phone?.length ?? 0) > 20 || (body.notes?.length ?? 0) > 500) {
      return new Response(JSON.stringify({ error: "fields_too_long" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Vérifier que le restaurant accepte les commandes
    const { data: resto, error: rErr } = await supabase
      .from("restaurants")
      .select("id, accepts_online_orders, suspended_at")
      .eq("id", body.restaurant_id)
      .maybeSingle();
    if (rErr || !resto) {
      return new Response(JSON.stringify({ error: "restaurant_not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resto.accepts_online_orders || resto.suspended_at) {
      return new Response(JSON.stringify({ error: "orders_disabled" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: inserted, error: insErr } = await supabase
      .from("public_orders")
      .insert({
        restaurant_id: body.restaurant_id,
        table_number: body.table_number ?? null,
        customer_name: body.customer_name?.trim() || null,
        customer_phone: body.customer_phone?.trim() || null,
        items: body.items,
        total: body.total,
        notes: body.notes?.trim() || null,
      })
      .select("id")
      .single();

    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ id: inserted.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});