import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Role = "manager" | "waiter" | "kitchen" | "cashier";

interface Body {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  role: Role;
  job_title?: string;
  base_salary?: number;
  hourly_rate?: number;
  contract_type?: "cdi" | "cdd" | "extra" | "stagiaire";
  hired_at?: string;
  phone?: string;
  pin?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "missing auth" }, 401);

    // Caller context (verifies JWT and identifies the owner)
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "unauthorized" }, 401);
    const callerId = userData.user.id;

    const { data: callerProfile } = await userClient
      .from("profiles")
      .select("restaurant_id, is_owner")
      .eq("id", callerId)
      .maybeSingle();

    if (!callerProfile?.is_owner || !callerProfile.restaurant_id) {
      return json({ error: "forbidden — only owner can create employees" }, 403);
    }
    const restaurantId = callerProfile.restaurant_id as string;

    const body = (await req.json()) as Body;
    if (!body.email || !body.password || !body.role) {
      return json({ error: "email, password and role are required" }, 400);
    }
    if (body.password.length < 6) {
      return json({ error: "password must be at least 6 characters" }, 400);
    }

    // Admin client — service role
    const admin = createClient(SUPABASE_URL, SERVICE);

    // Create auth user (auto-confirmed so they can sign in immediately)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: body.email.trim().toLowerCase(),
      password: body.password,
      email_confirm: true,
      user_metadata: {
        first_name: body.first_name ?? "",
        last_name: body.last_name ?? "",
        phone: body.phone ?? "",
      },
    });
    if (createErr || !created.user) {
      return json({ error: createErr?.message || "could not create user" }, 400);
    }
    const newUserId = created.user.id;

    // Profile (the trigger may have created one — we upsert to be safe)
    await admin.from("profiles").upsert({
      id: newUserId,
      first_name: body.first_name ?? null,
      last_name: body.last_name ?? null,
      restaurant_id: restaurantId,
      is_owner: false,
      hourly_rate: body.hourly_rate ?? 0,
    }, { onConflict: "id" });

    // Role
    await admin.from("user_roles").insert({
      user_id: newUserId,
      restaurant_id: restaurantId,
      role: body.role,
    });

    // Employee details
    await admin.from("employee_details").insert({
      restaurant_id: restaurantId,
      user_id: newUserId,
      contract_type: body.contract_type ?? "cdi",
      hired_at: body.hired_at ?? new Date().toISOString().slice(0, 10),
      job_title: body.job_title ?? null,
      base_salary: body.base_salary ?? 0,
      hourly_rate: body.hourly_rate ?? 0,
      is_active: true,
    });

    // Optional PIN
    if (body.pin && /^[0-9]{4,6}$/.test(body.pin)) {
      await admin.rpc("set_clock_pin", { _user_id: newUserId, _pin: body.pin });
    }

    return json({ ok: true, user_id: newUserId }, 200);
  } catch (e: any) {
    console.error("create-employee-account error", e);
    return json({ error: e?.message ?? "internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}