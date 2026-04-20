import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider");
    const paymentId = url.searchParams.get("payment_id");
    if (!provider || !paymentId) {
      return new Response("missing_params", { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .maybeSingle();

    if (!payment) return new Response("not_found", { status: 404, headers: corsHeaders });

    let body: Record<string, unknown> = {};
    try { body = await req.json() as Record<string, unknown>; } catch { /* form data */ }
    if (Object.keys(body).length === 0) {
      try {
        const form = await req.formData();
        body = Object.fromEntries(form.entries());
      } catch { /* ignore */ }
    }

    let newStatus: "success" | "failed" | "pending" = "pending";

    if (provider === "paydunya") {
      const status = String(body["data[status]"] ?? (body.data as Record<string, unknown>)?.status ?? "");
      if (status === "completed") newStatus = "success";
      else if (status === "cancelled") newStatus = "failed";
    } else if (provider === "cinetpay") {
      // CinetPay sends transaction_id; we must verify via their check API
      const { data: cfg } = await supabase
        .from("payment_configs")
        .select("cinetpay_apikey,cinetpay_site_id")
        .eq("restaurant_id", payment.restaurant_id)
        .maybeSingle();
      if (cfg?.cinetpay_apikey && cfg.cinetpay_site_id && payment.external_ref) {
        const verify = await fetch("https://api-checkout.cinetpay.com/v2/payment/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apikey: cfg.cinetpay_apikey,
            site_id: cfg.cinetpay_site_id,
            transaction_id: payment.external_ref,
          }),
        });
        const v = await verify.json() as Record<string, unknown>;
        const data = v.data as Record<string, unknown> | undefined;
        if (data?.status === "ACCEPTED") newStatus = "success";
        else if (data?.status === "REFUSED") newStatus = "failed";
      }
    }

    await supabase
      .from("payments")
      .update({ status: newStatus, raw_response: body })
      .eq("id", paymentId);

    if (newStatus === "success" && payment.order_id) {
      await supabase
        .from("orders")
        .update({ status: "paid", payment_method: `mobile_money:${provider}` })
        .eq("id", payment.order_id);
    }

    return new Response("ok", { status: 200, headers: corsHeaders });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    console.error("mobile-money-webhook", msg);
    return new Response(msg, { status: 500, headers: corsHeaders });
  }
});