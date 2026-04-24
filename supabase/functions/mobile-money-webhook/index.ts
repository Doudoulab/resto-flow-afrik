import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HMAC-SHA512 hex helper for PayDunya IPN verification
async function hmacSha512Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", enc.encode(key), { name: "HMAC", hash: "SHA-512" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

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
    // Read raw body once so we can also use it for signature verification
    const rawBody = await req.text();
    if (rawBody) {
      try {
        body = JSON.parse(rawBody) as Record<string, unknown>;
      } catch {
        // Try x-www-form-urlencoded / form-data
        try {
          const params = new URLSearchParams(rawBody);
          body = Object.fromEntries(params.entries());
        } catch { /* ignore */ }
      }
    }

    let newStatus: "success" | "failed" | "pending" = "pending";

    if (provider === "paydunya") {
      // Load PayDunya credentials for this restaurant to verify the IPN hash
      const { data: cfg } = await supabase
        .from("payment_configs")
        .select("paydunya_master_key,paydunya_private_key,paydunya_token")
        .eq("restaurant_id", payment.restaurant_id)
        .maybeSingle();

      // PayDunya IPN sends a `hash` field = SHA512(master_key) and the payload.
      // Reference: https://paydunya.com/developers/api/payment-status
      // We verify by recomputing the SHA-512 of the master key (PayDunya's documented IPN hash).
      const receivedHash = String(
        body.hash ??
        (body.data as Record<string, unknown> | undefined)?.hash ??
        "",
      );
      if (!cfg?.paydunya_master_key || !receivedHash) {
        console.warn("paydunya: missing hash or master key — rejecting");
        return new Response("invalid_signature", { status: 401, headers: corsHeaders });
      }
      // SHA-512 of master key (PayDunya IPN convention)
      const enc = new TextEncoder();
      const digest = await crypto.subtle.digest("SHA-512", enc.encode(cfg.paydunya_master_key));
      const expectedHash = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      if (!timingSafeEqual(expectedHash, receivedHash.toLowerCase())) {
        console.warn("paydunya: hash mismatch — rejecting");
        return new Response("invalid_signature", { status: 401, headers: corsHeaders });
      }

      const status = String(body["data[status]"] ?? (body.data as Record<string, unknown>)?.status ?? "");
      if (status === "completed") newStatus = "success";
      else if (status === "cancelled") newStatus = "failed";
    } else if (provider === "cinetpay") {
      // CinetPay sends transaction_id and an HMAC token in the `x-token` header.
      // We additionally verify via their check API (server-to-server) which is
      // the authoritative source of truth and cannot be spoofed.
      const { data: cfg } = await supabase
        .from("payment_configs")
        .select("cinetpay_apikey,cinetpay_site_id,cinetpay_secret_key")
        .eq("restaurant_id", payment.restaurant_id)
        .maybeSingle();

      // Optional: verify HMAC token if secret key configured
      // CinetPay HMAC = HMAC-SHA256(secret, cpm_site_id + cpm_trans_id + cpm_trans_date + cpm_amount + cpm_currency + signature + payment_method + cel_phone_num + cpm_phone_prefixe + cpm_language + cpm_version + cpm_payment_config + cpm_page_action + cpm_custom + cpm_designation + cpm_error_message)
      // See: https://docs.cinetpay.com/api/1.0-fr/checkout/hmac
      const cpmToken = req.headers.get("x-token") ?? "";
      if (cfg?.cinetpay_secret_key && cpmToken) {
        const fields = [
          "cpm_site_id","cpm_trans_id","cpm_trans_date","cpm_amount","cpm_currency",
          "signature","payment_method","cel_phone_num","cpm_phone_prefixe","cpm_language",
          "cpm_version","cpm_payment_config","cpm_page_action","cpm_custom","cpm_designation","cpm_error_message",
        ];
        const concat = fields.map((f) => String(body[f] ?? "")).join("");
        const expected = await hmacSha512Hex(cfg.cinetpay_secret_key, concat);
        if (!timingSafeEqual(expected, cpmToken.toLowerCase())) {
          console.warn("cinetpay: HMAC token mismatch — rejecting");
          return new Response("invalid_signature", { status: 401, headers: corsHeaders });
        }
      }

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
      } else {
        // Without API credentials we cannot trust the webhook payload
        console.warn("cinetpay: missing api credentials — cannot verify");
        return new Response("verification_unavailable", { status: 503, headers: corsHeaders });
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