import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InitBody {
  order_id?: string;
  restaurant_id: string;
  amount: number;
  customer_name?: string;
  customer_phone?: string;
  return_url?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as InitBody;
    if (!body.restaurant_id || !body.amount || body.amount <= 0) {
      return new Response(JSON.stringify({ error: "missing_params" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: cfg, error: cfgErr } = await supabase
      .from("payment_configs")
      .select("*")
      .eq("restaurant_id", body.restaurant_id)
      .maybeSingle();

    if (cfgErr || !cfg || !cfg.enabled) {
      return new Response(JSON.stringify({ error: "payment_not_configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create payment row first
    const { data: payment, error: payErr } = await supabase
      .from("payments")
      .insert({
        restaurant_id: body.restaurant_id,
        order_id: body.order_id ?? null,
        provider: cfg.provider,
        amount: body.amount,
        currency: "XOF",
        status: "pending",
        customer_name: body.customer_name ?? null,
        customer_phone: body.customer_phone ?? null,
      })
      .select()
      .single();

    if (payErr || !payment) throw new Error(payErr?.message ?? "payment_create_failed");

    const webhookBase = `${Deno.env.get("SUPABASE_URL")}/functions/v1/mobile-money-webhook`;
    let checkoutUrl = "";
    let externalRef = "";
    let raw: unknown = null;

    if (cfg.provider === "paydunya") {
      if (!cfg.paydunya_master_key || !cfg.paydunya_public_key || !cfg.paydunya_private_key || !cfg.paydunya_token) {
        throw new Error("paydunya_keys_missing");
      }
      const base = cfg.test_mode
        ? "https://app.paydunya.com/sandbox-api/v1"
        : "https://app.paydunya.com/api/v1";
      const res = await fetch(`${base}/checkout-invoice/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "PAYDUNYA-MASTER-KEY": cfg.paydunya_master_key,
          "PAYDUNYA-PRIVATE-KEY": cfg.paydunya_private_key,
          "PAYDUNYA-TOKEN": cfg.paydunya_token,
        },
        body: JSON.stringify({
          invoice: {
            total_amount: body.amount,
            description: `Commande${body.order_id ? ` ${body.order_id.slice(0, 8)}` : ""}`,
          },
          store: { name: "Restaurant" },
          actions: {
            callback_url: `${webhookBase}?provider=paydunya&payment_id=${payment.id}`,
            return_url: body.return_url ?? "",
            cancel_url: body.return_url ?? "",
          },
          custom_data: { payment_id: payment.id },
        }),
      });
      raw = await res.json() as Record<string, unknown>;
      const r = raw as Record<string, unknown>;
      if (r.response_code !== "00") throw new Error(`paydunya: ${r.response_text ?? "init_failed"}`);
      checkoutUrl = String(r.response_text ?? "");
      externalRef = String(r.token ?? "");
    } else if (cfg.provider === "cinetpay") {
      if (!cfg.cinetpay_apikey || !cfg.cinetpay_site_id) throw new Error("cinetpay_keys_missing");
      const transactionId = `RFA-${payment.id.slice(0, 8)}-${Date.now().toString(36)}`;
      const res = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apikey: cfg.cinetpay_apikey,
          site_id: cfg.cinetpay_site_id,
          transaction_id: transactionId,
          amount: body.amount,
          currency: "XOF",
          description: `Commande${body.order_id ? ` ${body.order_id.slice(0, 8)}` : ""}`,
          notify_url: `${webhookBase}?provider=cinetpay&payment_id=${payment.id}`,
          return_url: body.return_url ?? "",
          channels: "MOBILE_MONEY",
          customer_name: body.customer_name ?? "Client",
          customer_phone_number: body.customer_phone ?? "",
          metadata: payment.id,
        }),
      });
      raw = await res.json() as Record<string, unknown>;
      const r = raw as Record<string, unknown>;
      const data = r.data as Record<string, unknown> | undefined;
      if (r.code !== "201" || !data?.payment_url) {
        throw new Error(`cinetpay: ${r.message ?? "init_failed"}`);
      }
      checkoutUrl = String(data.payment_url);
      externalRef = transactionId;
    } else {
      // direct_link: build a wave.com pay link if available, else USSD instructions
      if (cfg.wave_number) {
        // Wave deep link: https://pay.wave.com/m/<merchantId>/c/<country>?amount=...
        // For personal numbers we use the public format
        checkoutUrl = `https://pay.wave.com/m/${encodeURIComponent(cfg.wave_number)}/c/sn?amount=${body.amount}`;
      } else if (cfg.orange_money_number) {
        // OM USSD code (Senegal) - displayed as info
        checkoutUrl = `tel:${encodeURIComponent(`#144#391*${cfg.orange_money_number}*${body.amount}#`)}`;
      } else {
        throw new Error("no_direct_link_configured");
      }
      externalRef = `direct-${payment.id.slice(0, 8)}`;
    }

    await supabase
      .from("payments")
      .update({ checkout_url: checkoutUrl, external_ref: externalRef, raw_response: raw })
      .eq("id", payment.id);

    return new Response(
      JSON.stringify({ payment_id: payment.id, checkout_url: checkoutUrl, external_ref: externalRef, provider: cfg.provider }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    console.error("mobile-money-init", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});