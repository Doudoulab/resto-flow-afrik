import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tool definitions — the AI will call these to apply config to the DB.
const tools = [
  {
    type: "function",
    function: {
      name: "update_restaurant_info",
      description: "Met à jour les informations générales et la personnalisation publique du restaurant (nom, adresse, téléphone, description, whatsapp, instagram, facebook, couleur, slug, horaires).",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          address: { type: "string" },
          phone: { type: "string" },
          description: { type: "string" },
          whatsapp: { type: "string" },
          instagram_url: { type: "string" },
          facebook_url: { type: "string" },
          theme_color: { type: "string", description: "Couleur principale en hex, ex #16a34a" },
          slug: { type: "string", description: "URL publique, lettres/chiffres/tirets" },
          accepts_online_orders: { type: "boolean" },
          opening_hours: {
            type: "object",
            description: "Clés mon,tue,wed,thu,fri,sat,sun avec {open,close,closed}",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "configure_payroll",
      description: "Configure les taux de paie SYSCOHADA/CNSS/IPRES/IRPP pour un pays donné (sn, ci, etc.).",
      parameters: {
        type: "object",
        properties: {
          country_code: { type: "string" },
          cnss_employee_pct: { type: "number" },
          cnss_employer_pct: { type: "number" },
          ipres_employee_pct: { type: "number" },
          ipres_employer_pct: { type: "number" },
          irpp_pct: { type: "number" },
        },
        required: ["country_code"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "configure_fiscal",
      description: "Configure les paramètres fiscaux du restaurant (TVA, mode TVA, identifiant fiscal, registre, préfixe facture, service %).",
      parameters: {
        type: "object",
        properties: {
          default_vat_rate: { type: "number" },
          vat_mode: { type: "string", enum: ["exclusive", "inclusive"] },
          tax_id: { type: "string" },
          business_register: { type: "string" },
          invoice_prefix: { type: "string" },
          invoice_footer: { type: "string" },
          default_service_pct: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "configure_mobile_money",
      description: "Active/configure les opérateurs mobile money (Wave, Orange Money, MTN, Moov, Free Money…). Liste fournie remplace la précédente.",
      parameters: {
        type: "object",
        properties: {
          operators: {
            type: "array",
            items: {
              type: "object",
              properties: {
                operator_code: { type: "string", description: "wave, orange_money, mtn_momo, moov, free_money" },
                display_name: { type: "string" },
                account_number: { type: "string" },
                merchant_id: { type: "string" },
                instructions: { type: "string" },
                enabled: { type: "boolean" },
              },
              required: ["operator_code"],
            },
          },
        },
        required: ["operators"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "enable_modules",
      description: "Active les modules listés (kitchen, printers, incoming, reports, accounting, customers, suppliers, receipts, inventory, timeclock, payroll, wines, tasting, gueridon, pms, menu_engineering, analytics, advisor, audit, security, backups, fiscal, exports, errors).",
      parameters: {
        type: "object",
        properties: { modules: { type: "array", items: { type: "string" } } },
        required: ["modules"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_kitchen_stations",
      description: "Crée des stations cuisine (chaud, froid, bar, pâtisserie, grill…).",
      parameters: {
        type: "object",
        properties: {
          stations: {
            type: "array",
            items: {
              type: "object",
              properties: { name: { type: "string" }, color: { type: "string" } },
              required: ["name"],
            },
          },
        },
        required: ["stations"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_menu",
      description: "Crée des catégories de menu et leurs plats. Chaque catégorie contient une liste d'items (name, price, description).",
      parameters: {
        type: "object",
        properties: {
          categories: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      price: { type: "number" },
                      description: { type: "string" },
                    },
                    required: ["name", "price"],
                  },
                },
              },
              required: ["name"],
            },
          },
        },
        required: ["categories"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_suppliers",
      description: "Crée des fournisseurs.",
      parameters: {
        type: "object",
        properties: {
          suppliers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                contact_name: { type: "string" },
                phone: { type: "string" },
                email: { type: "string" },
                notes: { type: "string" },
              },
              required: ["name"],
            },
          },
        },
        required: ["suppliers"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_stock_items",
      description: "Crée des articles de stock/inventaire avec unité, quantité initiale, seuil d'alerte et coût.",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                unit: { type: "string" },
                quantity: { type: "number" },
                alert_threshold: { type: "number" },
                cost_per_unit: { type: "number" },
              },
              required: ["name"],
            },
          },
        },
        required: ["items"],
      },
    },
  },
];

const SYSTEM_PROMPT = `Tu es le "Configurateur RestoFlow", un assistant IA qui aide les gérants de restaurant en Afrique de l'Ouest (FCFA, SYSCOHADA) à configurer automatiquement leur logiciel.

Ton rôle :
1. Pose des questions courtes et ciblées en français (1-3 questions à la fois max).
2. Quand tu as assez d'infos sur un sujet, APPELLE LES OUTILS pour appliquer la config (ne demande pas confirmation, agis).
3. Avance module par module dans cet ordre logique : Infos restaurant → Personnalisation publique → Modules à activer → Stations cuisine → Catégories + Menu → Fournisseurs → Stock → Mobile money → Fiscal/TVA → Paie.
4. Propose toujours des valeurs par défaut intelligentes (ex: SYSCOHADA Sénégal: TVA 18%, CNSS 7%, IPRES 6%).
5. Tu peux appeler plusieurs outils en parallèle si tu as les infos.
6. Après chaque outil exécuté, confirme brièvement et passe au sujet suivant.
7. Ne JAMAIS inventer de plats spécifiques sans demander : propose des suggestions et laisse choisir.
8. Réponses courtes, concrètes, en français, jamais de blabla.

Contexte SYSCOHADA Sénégal par défaut : TVA 18%, CNSS employé 7%/employeur 8.4%, IPRES 6%/8.4%, IRPP variable.
Mobile money courants : Wave, Orange Money, Free Money (Sénégal) ; MTN MoMo, Moov (Côte d'Ivoire).`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY missing" }, 500);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: claims } = await supabase.auth.getClaims(auth.replace("Bearer ", ""));
    if (!claims?.claims) return json({ error: "Unauthorized" }, 401);

    const { data: profile } = await supabase
      .from("profiles")
      .select("restaurant_id")
      .eq("id", claims.claims.sub)
      .maybeSingle();
    const restaurantId = profile?.restaurant_id;
    if (!restaurantId) return json({ error: "no_restaurant" }, 400);

    // Verify owner/manager rights via RLS — load restaurant
    const { data: restaurant, error: rErr } = await supabase
      .from("restaurants")
      .select("id, name, country_code, currency, enabled_modules")
      .eq("id", restaurantId)
      .maybeSingle();
    if (rErr || !restaurant) return json({ error: "restaurant_not_found" }, 404);

    const { messages = [] } = await req.json().catch(() => ({ messages: [] }));

    const ctxMsg = `Contexte actuel:\n- Restaurant: ${restaurant.name}\n- Pays: ${restaurant.country_code}\n- Devise: ${restaurant.currency}\n- Modules actifs: ${(restaurant.enabled_modules || []).join(", ")}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "system", content: ctxMsg },
          ...messages,
        ],
        tools,
        tool_choice: "auto",
      }),
    });

    if (aiRes.status === 429) return json({ error: "Trop de requêtes, réessayez." }, 429);
    if (aiRes.status === 402) return json({ error: "Crédits IA épuisés." }, 402);
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI gateway", aiRes.status, t);
      return json({ error: "Erreur IA" }, 500);
    }

    const data = await aiRes.json();
    const choice = data?.choices?.[0]?.message;
    const reply: string = choice?.content ?? "";
    const toolCalls = choice?.tool_calls ?? [];

    const results: { name: string; ok: boolean; message: string }[] = [];

    for (const call of toolCalls) {
      const name = call.function?.name;
      let args: any = {};
      try { args = JSON.parse(call.function?.arguments || "{}"); } catch {}
      try {
        const msg = await execTool(supabase, restaurantId, name, args);
        results.push({ name, ok: true, message: msg });
      } catch (e: any) {
        results.push({ name, ok: false, message: e.message ?? String(e) });
      }
    }

    return json({ reply, toolCalls: results });
  } catch (e) {
    console.error("setup-assistant error", e);
    return json({ error: e instanceof Error ? e.message : "Erreur" }, 500);
  }
});

async function execTool(supabase: any, restaurantId: string, name: string, args: any): Promise<string> {
  switch (name) {
    case "update_restaurant_info": {
      const patch: any = {};
      const fields = ["name", "address", "phone", "description", "whatsapp", "instagram_url", "facebook_url", "theme_color", "slug", "accepts_online_orders", "opening_hours"];
      for (const f of fields) if (args[f] !== undefined) patch[f] = args[f];
      if (patch.slug) {
        patch.slug = String(patch.slug).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
      }
      const { error } = await supabase.from("restaurants").update(patch).eq("id", restaurantId);
      if (error) throw error;
      return `Restaurant mis à jour (${Object.keys(patch).join(", ")})`;
    }
    case "configure_payroll": {
      const payload = { restaurant_id: restaurantId, ...args };
      const { data: existing } = await supabase.from("payroll_settings").select("id").eq("restaurant_id", restaurantId).maybeSingle();
      if (existing) {
        const { error } = await supabase.from("payroll_settings").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("payroll_settings").insert(payload);
        if (error) throw error;
      }
      return "Paramètres de paie enregistrés";
    }
    case "configure_fiscal": {
      const { error } = await supabase.from("restaurants").update(args).eq("id", restaurantId);
      if (error) throw error;
      return "Paramètres fiscaux mis à jour";
    }
    case "configure_mobile_money": {
      const ops = (args.operators || []).map((o: any, i: number) => ({
        restaurant_id: restaurantId,
        operator_code: o.operator_code,
        display_name: o.display_name ?? null,
        account_number: o.account_number ?? null,
        merchant_id: o.merchant_id ?? null,
        instructions: o.instructions ?? null,
        enabled: o.enabled !== false,
        sort_order: i,
      }));
      // Upsert by (restaurant_id, operator_code) – delete then insert for simplicity
      await supabase.from("mobile_money_operators").delete().eq("restaurant_id", restaurantId);
      if (ops.length) {
        const { error } = await supabase.from("mobile_money_operators").insert(ops);
        if (error) throw error;
      }
      return `${ops.length} opérateur(s) mobile money configuré(s)`;
    }
    case "enable_modules": {
      const { data: r } = await supabase.from("restaurants").select("enabled_modules").eq("id", restaurantId).maybeSingle();
      const set = new Set<string>([...(r?.enabled_modules || []), ...((args.modules || []) as string[])]);
      const { error } = await supabase.from("restaurants").update({ enabled_modules: [...set] }).eq("id", restaurantId);
      if (error) throw error;
      return `Modules activés: ${(args.modules || []).join(", ")}`;
    }
    case "create_kitchen_stations": {
      const rows = (args.stations || []).map((s: any, i: number) => ({
        restaurant_id: restaurantId,
        name: s.name,
        color: s.color || "#64748b",
        sort_order: i,
      }));
      if (!rows.length) return "Aucune station";
      const { error } = await supabase.from("kitchen_stations").insert(rows);
      if (error) throw error;
      return `${rows.length} station(s) cuisine créée(s)`;
    }
    case "create_menu": {
      let totalCats = 0, totalItems = 0;
      const cats = args.categories || [];
      for (let i = 0; i < cats.length; i++) {
        const c = cats[i];
        const { data: cat, error: cErr } = await supabase
          .from("menu_categories")
          .insert({ restaurant_id: restaurantId, name: c.name, sort_order: i })
          .select("id")
          .single();
        if (cErr) throw cErr;
        totalCats++;
        const items = (c.items || []).map((it: any, j: number) => ({
          restaurant_id: restaurantId,
          category_id: cat.id,
          name: it.name,
          price: it.price,
          description: it.description ?? null,
          sort_order: j,
        }));
        if (items.length) {
          const { error: iErr } = await supabase.from("menu_items").insert(items);
          if (iErr) throw iErr;
          totalItems += items.length;
        }
      }
      return `${totalCats} catégorie(s) et ${totalItems} plat(s) créés`;
    }
    case "create_suppliers": {
      const rows = (args.suppliers || []).map((s: any) => ({ restaurant_id: restaurantId, ...s }));
      if (!rows.length) return "Aucun fournisseur";
      const { error } = await supabase.from("suppliers").insert(rows);
      if (error) throw error;
      return `${rows.length} fournisseur(s) créé(s)`;
    }
    case "create_stock_items": {
      const rows = (args.items || []).map((s: any) => ({
        restaurant_id: restaurantId,
        name: s.name,
        unit: s.unit || "unité",
        quantity: s.quantity ?? 0,
        alert_threshold: s.alert_threshold ?? 0,
        cost_per_unit: s.cost_per_unit ?? 0,
      }));
      if (!rows.length) return "Aucun article";
      const { error } = await supabase.from("stock_items").insert(rows);
      if (error) throw error;
      return `${rows.length} article(s) de stock créés`;
    }
    default:
      throw new Error(`Outil inconnu: ${name}`);
  }
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}