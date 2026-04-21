import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Crown, AlertTriangle, ChefHat, Bell } from "lucide-react";
import { createElement } from "react";

/**
 * Subscribe to realtime events for the current restaurant and surface
 * staff-relevant notifications via toast (allergies, VIP arrivals,
 * courses fired, table cleared, new QR orders).
 */
export const useStaffNotifications = (restaurantId: string | undefined) => {
  const seenItems = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!restaurantId) return;

    const playBeep = () => {
      try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = 880; g.gain.value = 0.05;
        o.start(); o.stop(ctx.currentTime + 0.15);
      } catch { /* ignored */ }
    };

    const channel = supabase
      .channel(`staff-notif-${restaurantId}`)
      // Allergy alert when an order_item is inserted with is_allergy_alert = true
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_items" }, (payload) => {
        const row = payload.new as { id: string; is_allergy_alert?: boolean; name_snapshot?: string; special_request?: string };
        if (seenItems.current.has(row.id)) return;
        seenItems.current.add(row.id);
        if (row.is_allergy_alert) {
          playBeep();
          toast.warning(`⚠️ ALLERGIE — ${row.name_snapshot}`, {
            description: row.special_request ?? "Vérifier la fiche client",
            duration: 10000,
            icon: createElement(AlertTriangle, { className: "h-5 w-5 text-destructive" }),
          });
        }
      })
      // Course fired -> notify floor staff
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "order_items" }, (payload) => {
        const old = payload.old as { fired_at?: string | null };
        const row = payload.new as { id: string; fired_at?: string | null; name_snapshot?: string; status?: string };
        if (!old.fired_at && row.fired_at) {
          toast(`🍽️ Plat envoyé en cuisine`, { description: row.name_snapshot, duration: 4000 });
        }
        if (row.status === "ready" && (payload.old as { status?: string })?.status !== "ready") {
          playBeep();
          toast.success(`✅ Prêt à servir : ${row.name_snapshot}`, {
            duration: 8000,
            icon: createElement(ChefHat, { className: "h-5 w-5 text-success" }),
          });
        }
      })
      // VIP customer arrival when a paid order references a VIP customer
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, async (payload) => {
        const row = payload.new as { customer_id?: string | null; table_number?: string | null };
        if (!row.customer_id) return;
        const { data } = await supabase
          .from("customers")
          .select("name,is_vip,maitre_notes")
          .eq("id", row.customer_id)
          .maybeSingle();
        if (data?.is_vip) {
          playBeep();
          toast.success(`👑 VIP arrivé : ${data.name}`, {
            description: row.table_number ? `Table ${row.table_number}${data.maitre_notes ? ` — ${data.maitre_notes}` : ""}` : data.maitre_notes ?? undefined,
            duration: 12000,
            icon: createElement(Crown, { className: "h-5 w-5 text-yellow-500" }),
          });
        }
      })
      // New incoming QR order
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "public_orders", filter: `restaurant_id=eq.${restaurantId}` }, (payload) => {
        const row = payload.new as { customer_name?: string | null; table_number?: string | null };
        playBeep();
        toast(`🛎️ Nouvelle commande QR`, {
          description: `${row.customer_name ?? "Client"}${row.table_number ? ` — table ${row.table_number}` : ""}`,
          duration: 8000,
          icon: createElement(Bell, { className: "h-5 w-5 text-primary" }),
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);
};