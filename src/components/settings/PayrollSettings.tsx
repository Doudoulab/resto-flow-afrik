import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface S {
  cnss_employee_pct: number; cnss_employer_pct: number;
  ipres_employee_pct: number; ipres_employer_pct: number;
  irpp_pct: number; other_employee_pct: number; other_employer_pct: number;
  country_code: string;
}

const DEFAULTS: S = {
  cnss_employee_pct: 5.6, cnss_employer_pct: 8.4,
  ipres_employee_pct: 5.6, ipres_employer_pct: 8.4,
  irpp_pct: 10, other_employee_pct: 0, other_employer_pct: 0,
  country_code: "sn",
};

export const PayrollSettings = ({ restaurantId }: { restaurantId: string }) => {
  const [s, setS] = useState<S>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("payroll_settings").select("*").eq("restaurant_id", restaurantId).maybeSingle();
      if (data) setS({
        cnss_employee_pct: Number(data.cnss_employee_pct),
        cnss_employer_pct: Number(data.cnss_employer_pct),
        ipres_employee_pct: Number(data.ipres_employee_pct),
        ipres_employer_pct: Number(data.ipres_employer_pct),
        irpp_pct: Number(data.irpp_pct),
        other_employee_pct: Number(data.other_employee_pct),
        other_employer_pct: Number(data.other_employer_pct),
        country_code: data.country_code,
      });
    })();
  }, [restaurantId]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("payroll_settings").upsert({ restaurant_id: restaurantId, ...s }, { onConflict: "restaurant_id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Paramètres de paie enregistrés");
  };

  const field = (key: keyof S, label: string) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" step="0.1" value={s[key] as number}
        onChange={(e) => setS({ ...s, [key]: parseFloat(e.target.value) || 0 })} />
    </div>
  );

  return (
    <Card>
      <CardHeader><CardTitle>Charges sociales (paie)</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Taux par défaut Sénégal/UEMOA. Ajustez selon votre pays.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {field("cnss_employee_pct", "CNSS salarié (%)")}
          {field("cnss_employer_pct", "CNSS employeur (%)")}
          {field("ipres_employee_pct", "IPRES salarié (%)")}
          {field("ipres_employer_pct", "IPRES employeur (%)")}
          {field("irpp_pct", "IRPP (%)")}
          {field("other_employee_pct", "Autres retenues salarié (%)")}
          {field("other_employer_pct", "Autres charges employeur (%)")}
        </div>
        <Button onClick={save} disabled={saving}>Enregistrer</Button>
      </CardContent>
    </Card>
  );
};