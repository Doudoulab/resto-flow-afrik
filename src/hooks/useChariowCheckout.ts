import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ChariowPlan = {
  plan_key: "pro_plan" | "business_plan";
  cycle: "monthly" | "yearly";
};

export function useChariowCheckout() {
  const [loading, setLoading] = useState(false);

  const openCheckout = async ({ plan_key, cycle }: ChariowPlan) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("chariow-checkout", {
        body: { plan_key, cycle },
      });
      if (error) {
        // Try to extract structured error from the response body
        const ctx: any = (error as any).context;
        let detail = error.message;
        try {
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            detail = body?.error || body?.details || JSON.stringify(body);
          }
        } catch { /* ignore */ }
        throw new Error(detail);
      }
      if (data?.ok === false) throw new Error(data.error || "Erreur inconnue");
      if (!data?.url) throw new Error("Aucune URL de paiement renvoyée");
      window.location.href = data.url as string;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Impossible d'ouvrir le paiement: " + msg);
      setLoading(false);
    }
  };

  return { openCheckout, loading };
}