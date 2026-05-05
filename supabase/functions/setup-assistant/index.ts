import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =====================================================================
// Wizard de configuration RestoFlow
// Deux modes :
//   action="suggest"  → l'IA renvoie des suggestions JSON (menu, stock, fournisseurs…)
//                        adaptées au pays OHADA et à la cuisine du resto.
//   action="apply"    → on enregistre directement le formulaire validé par le gérant.
// =====================================================================

const _legacy_tools_unused = [
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

const SUGGEST_PROMPT = `Tu es un expert restauration en zone OHADA (Afrique francophone). On te donne un pays, un type de cuisine et une étape du wizard de config (menu, stock, fournisseurs, stations, modules). Tu réponds UNIQUEMENT en JSON valide selon le schéma demandé, en français, avec des valeurs réalistes (prix en devise locale du pays). Aucun texte hors JSON.`;

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

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const { data: profile } = await supabase
      .from("profiles")
      .select("restaurant_id")
      .eq("id", userData.user.id)
      .maybeSingle();
    const restaurantId = profile?.restaurant_id;
    if (!restaurantId) return json({ error: "no_restaurant" }, 400);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "apply") {
      const step = body.step as string;
      const payload = body.payload ?? {};
      try {
        const msg = await execTool(supabase, restaurantId, step, payload);
        return json({ ok: true, message: msg });
      } catch (e: any) {
        return json({ ok: false, error: e.message ?? String(e) }, 400);
      }
    }

    if (action === "suggest") {
      if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY missing" }, 500);
      const { country, cuisine, step, currency, prompt } = body;
      const userPrompt = buildSuggestPrompt(step, { country, cuisine, currency, prompt });
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SUGGEST_PROMPT },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
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
      const content = data?.choices?.[0]?.message?.content ?? "{}";
      let parsed: any = {};
      try { parsed = JSON.parse(content); } catch { parsed = { raw: content }; }
      return json({ ok: true, suggestion: parsed });
    }

    if (action === "generate_image") {
      if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY missing" }, 500);
      const { dish, description, cuisine, country } = body;
      if (!dish) return json({ error: "dish requis" }, 400);
      const imgPrompt = `Photo professionnelle, vue du dessus, lumière naturelle, fond neutre, d'un plat appelé "${dish}"${description ? `, ${description}` : ""}${cuisine ? `, cuisine ${cuisine}` : ""}${country ? `, ${country}` : ""}. Style menu de restaurant, appétissant, haute qualité.`;
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: imgPrompt }],
          modalities: ["image", "text"],
        }),
      });
      if (aiRes.status === 429) return json({ error: "Trop de requêtes" }, 429);
      if (aiRes.status === 402) return json({ error: "Crédits IA épuisés." }, 402);
      if (!aiRes.ok) {
        const t = await aiRes.text();
        console.error("AI image", aiRes.status, t);
        return json({ error: "Erreur génération image" }, 500);
      }
      const data = await aiRes.json();
      const dataUrl: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!dataUrl) return json({ error: "Pas d'image générée" }, 500);
      // Upload vers menu-images
      const m = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!m) return json({ error: "Format image invalide" }, 500);
      const mime = m[1]; const b64 = m[2];
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const ext = mime.split("/")[1] || "png";
      const path = `${restaurantId}/ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("menu-images").upload(path, bytes, { contentType: mime, upsert: false });
      if (upErr) return json({ error: upErr.message }, 500);
      const { data: pub } = supabase.storage.from("menu-images").getPublicUrl(path);
      return json({ ok: true, url: pub.publicUrl });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error("setup-assistant error", e);
    return json({ error: e instanceof Error ? e.message : "Erreur" }, 500);
  }
});

function buildSuggestPrompt(step: string, ctx: { country: string; cuisine?: string; currency: string; prompt?: string }): string {
  const base = `Pays: ${ctx.country}. Cuisine: ${ctx.cuisine || "généraliste"}. Devise: ${ctx.currency}. ${ctx.prompt ? "Demande: " + ctx.prompt : ""}`;
  switch (step) {
    case "menu":
      return `${base}\nPropose un menu typique adapté au pays et à la cuisine, organisé en catégories. Pour chaque plat, ajoute des variantes pertinentes si applicable (ex: tailles S/M/L pour pizza, quantités pour boissons).\nSchéma JSON: { "categories": [ { "name": string, "items": [ { "name": string, "price": number, "description": string, "variants": [ { "name": string, "price_delta": number } ] } ] } ] }\nPrix réalistes en ${ctx.currency}. 4-6 catégories, 4-8 plats par catégorie. variants peut être [].`;
    case "stations":
      return `${base}\nPropose 3 à 5 stations cuisine adaptées.\nSchéma JSON: { "stations": [ { "name": string, "color": string } ] } (color en hex)`;
    case "tables":
      return `${base}\nPropose un plan de salle réaliste : ~12 tables avec libellés (T1, T2…), nombre de couverts (2/4/6/8) et formes.\nSchéma JSON: { "tables": [ { "label": string, "seats": number, "shape": "square"|"round"|"rect" } ] }`;
    case "printers":
      return `${base}\nPropose une configuration imprimantes type pour ce resto : 1 caisse, 1 cuisine, éventuellement 1 bar.\nSchéma JSON: { "printers": [ { "name": string, "printer_type": "receipt"|"kitchen"|"bar", "connection_mode": "agent"|"network"|"bluetooth", "address": string, "paper_width": number } ] }`;
    case "stock":
      return `${base}\nPropose 15 à 25 articles de stock essentiels pour ce type de resto.\nSchéma JSON: { "items": [ { "name": string, "unit": string, "quantity": number, "alert_threshold": number, "cost_per_unit": number } ] }`;
    case "suppliers":
      return `${base}\nPropose 4 à 8 fournisseurs typiques (catégories) pour ce pays.\nSchéma JSON: { "suppliers": [ { "name": string, "contact_name": string, "phone": string, "notes": string } ] }`;
    case "modules":
      return `${base}\nQuels modules RestoFlow recommandes-tu d'activer pour ce type de resto ? Disponibles: kitchen, printers, incoming, reports, accounting, customers, suppliers, receipts, inventory, timeclock, payroll, wines, tasting, gueridon, pms, menu_engineering, analytics, advisor, audit, security, backups, fiscal, exports.\nSchéma JSON: { "modules": [string], "rationale": string }`;
    default:
      return `${base}\nRetourne un JSON pertinent pour l'étape "${step}".`;
  }
}

async function execTool(supabase: any, restaurantId: string, name: string, args: any): Promise<string> {
  switch (name) {
    case "country": {
      const patch: any = {};
      if (args.country_code) patch.country_code = args.country_code;
      if (args.currency) patch.currency = args.currency;
      const { error } = await supabase.from("restaurants").update(patch).eq("id", restaurantId);
      if (error) throw error;
      return `Pays défini (${patch.country_code?.toUpperCase()} · ${patch.currency})`;
    }
    case "info":
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
    case "payroll":
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
    case "fiscal":
    case "configure_fiscal": {
      const { error } = await supabase.from("restaurants").update(args).eq("id", restaurantId);
      if (error) throw error;
      return "Paramètres fiscaux mis à jour";
    }
    case "mobile_money":
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
    case "modules":
    case "enable_modules": {
      const { data: r } = await supabase.from("restaurants").select("enabled_modules").eq("id", restaurantId).maybeSingle();
      const set = new Set<string>([...(r?.enabled_modules || []), ...((args.modules || []) as string[])]);
      const { error } = await supabase.from("restaurants").update({ enabled_modules: [...set] }).eq("id", restaurantId);
      if (error) throw error;
      return `Modules activés: ${(args.modules || []).join(", ")}`;
    }
    case "stations":
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
    case "menu":
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
    case "suppliers":
    case "create_suppliers": {
      const rows = (args.suppliers || []).map((s: any) => ({ restaurant_id: restaurantId, ...s }));
      if (!rows.length) return "Aucun fournisseur";
      const { error } = await supabase.from("suppliers").insert(rows);
      if (error) throw error;
      return `${rows.length} fournisseur(s) créé(s)`;
    }
    case "stock":
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