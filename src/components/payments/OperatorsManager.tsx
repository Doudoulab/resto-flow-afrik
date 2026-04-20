import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Globe, Smartphone } from "lucide-react";
import { COUNTRIES, getCountry, type OperatorCode } from "@/lib/payments/operators";
import { toast } from "sonner";

interface DbOperator {
  id?: string;
  operator_code: string;
  display_name: string | null;
  account_number: string | null;
  merchant_id: string | null;
  enabled: boolean;
  notes: string | null;
  sort_order: number;
}

interface Props {
  restaurantId: string;
  initialCountry?: string | null;
  onCountryChange?: (code: string) => void;
}

export const OperatorsManager = ({ restaurantId, initialCountry, onCountryChange }: Props) => {
  const [country, setCountry] = useState<string>((initialCountry ?? "sn").toLowerCase());
  const [rows, setRows] = useState<Record<string, DbOperator>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const countryDef = useMemo(() => getCountry(country), [country]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("mobile_money_operators")
        .select("*")
        .eq("restaurant_id", restaurantId);
      const map: Record<string, DbOperator> = {};
      (data ?? []).forEach((r) => { map[r.operator_code] = r as DbOperator; });
      setRows(map);
      setLoading(false);
    };
    load();
  }, [restaurantId]);

  const upd = (code: OperatorCode, patch: Partial<DbOperator>) => {
    setRows((prev) => ({
      ...prev,
      [code]: {
        operator_code: code,
        display_name: null, account_number: null, merchant_id: null,
        enabled: true, notes: null, sort_order: 0,
        ...prev[code],
        ...patch,
      },
    }));
  };

  const save = async () => {
    setSaving(true);
    // Update country on restaurant
    const { error: rErr } = await supabase
      .from("restaurants").update({ country_code: country }).eq("id", restaurantId);
    if (rErr) { setSaving(false); toast.error(rErr.message); return; }
    onCountryChange?.(country);

    const payload = Object.values(rows)
      .filter((r) => r.operator_code)
      .map((r, idx) => ({
        restaurant_id: restaurantId,
        operator_code: r.operator_code,
        display_name: r.display_name,
        account_number: r.account_number,
        merchant_id: r.merchant_id,
        enabled: r.enabled,
        notes: r.notes,
        sort_order: idx,
      }));
    if (payload.length > 0) {
      const { error } = await supabase
        .from("mobile_money_operators")
        .upsert(payload, { onConflict: "restaurant_id,operator_code" });
      if (error) { setSaving(false); toast.error(error.message); return; }
    }
    setSaving(false);
    toast.success("Opérateurs Mobile Money enregistrés");
  };

  if (loading) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" /> Opérateurs Mobile Money par pays
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Pays du restaurant</Label>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.flag} {c.name} ({c.dialCode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            La liste d'opérateurs s'adapte automatiquement à votre pays.
          </p>
        </div>

        <div className="space-y-3">
          {countryDef.operators.map((op) => {
            const r = rows[op.code] ?? {
              operator_code: op.code, enabled: false,
              display_name: null, account_number: null, merchant_id: null,
              notes: null, sort_order: 0,
            };
            return (
              <div key={op.code} className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-10 w-10 rounded-md ${op.color} flex items-center justify-center text-white shrink-0`}>
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{op.name}</div>
                      <Badge variant="outline" className="text-xs">
                        {op.action === "deeplink" ? "Lien direct / QR" : "Code USSD"}
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    checked={r.enabled}
                    onCheckedChange={(v) => upd(op.code, { enabled: v })}
                  />
                </div>

                {r.enabled && (
                  <div className="grid gap-3 sm:grid-cols-2 pt-2">
                    {op.needsMerchantId && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Merchant ID (optionnel)</Label>
                        <Input
                          value={r.merchant_id ?? ""}
                          onChange={(e) => upd(op.code, { merchant_id: e.target.value })}
                          placeholder="M_xxxxxxxx"
                        />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        {op.needsMerchantId ? "Numéro (fallback)" : "Numéro marchand"}
                      </Label>
                      <Input
                        value={r.account_number ?? ""}
                        onChange={(e) => upd(op.code, { account_number: e.target.value })}
                        placeholder={`${countryDef.dialCode} ...`}
                      />
                    </div>
                    {op.helpText && (
                      <p className="sm:col-span-2 text-xs text-muted-foreground">{op.helpText}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enregistrer
        </Button>
      </CardContent>
    </Card>
  );
};