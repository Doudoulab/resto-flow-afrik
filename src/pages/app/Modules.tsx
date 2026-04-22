import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ALL_MODULES, DEFAULT_ENABLED, MODULE_PLAN_MAP, type ModuleKey, type ModuleInfo } from "@/lib/modules";
import { useSubscription, type PlanTier } from "@/hooks/useSubscription";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";
import { Link } from "react-router-dom";

const CATEGORY_LABELS: Record<ModuleInfo["category"], string> = {
  operations: "Opérations",
  kitchen: "Cuisine",
  finances: "Finances",
  advanced: "Haut de gamme",
  system: "Système",
};

const CATEGORY_DESC: Record<ModuleInfo["category"], string> = {
  operations: "Outils complémentaires de gestion quotidienne",
  kitchen: "Affichage cuisine et impression tickets",
  finances: "Comptabilité, rapports et paie",
  advanced: "Fonctionnalités pour restauration haut de gamme et hôtellerie",
  system: "Sécurité, monitoring et exports techniques",
};

export default function Modules() {
  const { restaurant, refresh } = useAuth();
  const { tier, hasTier } = useSubscription();
  const [enabled, setEnabled] = useState<Set<ModuleKey>>(new Set(DEFAULT_ENABLED));
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurant?.id) return;
    supabase.from("restaurants").select("enabled_modules").eq("id", restaurant.id).maybeSingle()
      .then(({ data }) => {
        if (data?.enabled_modules) setEnabled(new Set(data.enabled_modules as ModuleKey[]));
        setLoading(false);
      });
  }, [restaurant?.id]);

  const TIER_LABEL: Record<PlanTier, string> = { free: "Gratuit", pro: "Pro", business: "Business" };

  const toggle = (key: ModuleKey) => {
    const required = MODULE_PLAN_MAP[key] ?? "free";
    if (!hasTier(required)) {
      toast.error(`Ce module requiert le plan ${TIER_LABEL[required]}`);
      return;
    }
    setEnabled(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const save = async () => {
    if (!restaurant?.id) return;
    // Strip out modules the current plan can't access (defensive)
    const allowed = Array.from(enabled).filter(k => hasTier(MODULE_PLAN_MAP[k] ?? "free"));
    setSaving(true);
    const { error } = await supabase.from("restaurants")
      .update({ enabled_modules: allowed })
      .eq("id", restaurant.id);
    setSaving(false);
    if (error) { toast.error("Erreur : " + error.message); return; }
    setEnabled(new Set(allowed));
    toast.success("Modules mis à jour");
    refresh?.();
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const grouped = ALL_MODULES.reduce((acc, mod) => {
    (acc[mod.category] ||= []).push(mod);
    return acc;
  }, {} as Record<ModuleInfo["category"], ModuleInfo[]>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Modules</h1>
        <p className="text-muted-foreground mt-1">
          Activez seulement les fonctionnalités dont vous avez besoin. Les modules désactivés disparaissent du menu.
        </p>
      </div>

      {(Object.keys(grouped) as ModuleInfo["category"][]).map(cat => (
        <Card key={cat}>
          <CardHeader>
            <CardTitle>{CATEGORY_LABELS[cat]}</CardTitle>
            <CardDescription>{CATEGORY_DESC[cat]}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {grouped[cat].map(mod => (
              <div key={mod.key} className="flex items-center justify-between rounded-md border border-border p-3">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="font-medium">{mod.label}</p>
                  <p className="text-sm text-muted-foreground">{mod.description}</p>
                </div>
                <Switch checked={enabled.has(mod.key)} onCheckedChange={() => toggle(mod.key)} />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={save} disabled={saving} size="lg" className="shadow-lg">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enregistrer les modules
        </Button>
      </div>
    </div>
  );
}
