import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Smartphone, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Provider = "paydunya" | "cinetpay" | "direct_link";

interface Config {
  id?: string;
  enabled: boolean;
  provider: Provider;
  test_mode: boolean;
  paydunya_master_key: string | null;
  paydunya_public_key: string | null;
  paydunya_private_key: string | null;
  paydunya_token: string | null;
  cinetpay_apikey: string | null;
  cinetpay_site_id: string | null;
  cinetpay_secret_key: string | null;
  wave_number: string | null;
  orange_money_number: string | null;
  mtn_momo_number: string | null;
  moov_number: string | null;
}

const empty: Config = {
  enabled: false, provider: "direct_link", test_mode: true,
  paydunya_master_key: "", paydunya_public_key: "", paydunya_private_key: "", paydunya_token: "",
  cinetpay_apikey: "", cinetpay_site_id: "", cinetpay_secret_key: "",
  wave_number: "", orange_money_number: "", mtn_momo_number: "", moov_number: "",
};

export const PaymentSettings = ({ restaurantId }: { restaurantId: string }) => {
  const [cfg, setCfg] = useState<Config>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("payment_configs").select("*").eq("restaurant_id", restaurantId).maybeSingle();
      if (data) setCfg(data as Config);
      setLoading(false);
    };
    load();
  }, [restaurantId]);

  const save = async () => {
    setSaving(true);
    const payload = { ...cfg, restaurant_id: restaurantId };
    delete (payload as Partial<Config> & { id?: string }).id;
    const { error } = await supabase.from("payment_configs").upsert(payload, { onConflict: "restaurant_id" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Configuration Mobile Money enregistrée");
  };

  if (loading) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" /> Mobile Money
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <Label className="text-base">Activer les encaissements Mobile Money</Label>
            <p className="text-sm text-muted-foreground">Wave, Orange Money, MTN, Moov…</p>
          </div>
          <Switch checked={cfg.enabled} onCheckedChange={(v) => setCfg({ ...cfg, enabled: v })} />
        </div>

        {cfg.enabled && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Fournisseur</Label>
                <Select value={cfg.provider} onValueChange={(v) => setCfg({ ...cfg, provider: v as Provider })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct_link">Lien direct (Wave / OM)</SelectItem>
                    <SelectItem value="paydunya">PayDunya (multi-opérateurs)</SelectItem>
                    <SelectItem value="cinetpay">CinetPay (multi-opérateurs)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <Label>Mode test (sandbox)</Label>
                <Switch checked={cfg.test_mode} onCheckedChange={(v) => setCfg({ ...cfg, test_mode: v })} />
              </div>
            </div>

            <Tabs value={cfg.provider} onValueChange={(v) => setCfg({ ...cfg, provider: v as Provider })}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="direct_link">Direct</TabsTrigger>
                <TabsTrigger value="paydunya">PayDunya</TabsTrigger>
                <TabsTrigger value="cinetpay">CinetPay</TabsTrigger>
              </TabsList>

              <TabsContent value="direct_link" className="space-y-3 pt-3">
                <p className="text-sm text-muted-foreground">
                  Pas de frais d'agrégateur. Le client paie directement sur votre numéro marchand.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Numéro Wave</Label>
                    <Input value={cfg.wave_number ?? ""} onChange={(e) => setCfg({ ...cfg, wave_number: e.target.value })} placeholder="+221 77..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Numéro Orange Money</Label>
                    <Input value={cfg.orange_money_number ?? ""} onChange={(e) => setCfg({ ...cfg, orange_money_number: e.target.value })} placeholder="+221 77..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Numéro MTN MoMo</Label>
                    <Input value={cfg.mtn_momo_number ?? ""} onChange={(e) => setCfg({ ...cfg, mtn_momo_number: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Numéro Moov Money</Label>
                    <Input value={cfg.moov_number ?? ""} onChange={(e) => setCfg({ ...cfg, moov_number: e.target.value })} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="paydunya" className="space-y-3 pt-3">
                <p className="text-sm text-muted-foreground">
                  Récupérez vos clés sur <a href="https://paydunya.com" target="_blank" rel="noreferrer" className="underline">paydunya.com</a> → Intégration → API Keys.
                </p>
                <div className="space-y-2">
                  <Label>Master Key</Label>
                  <Input value={cfg.paydunya_master_key ?? ""} onChange={(e) => setCfg({ ...cfg, paydunya_master_key: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Public Key</Label>
                  <Input value={cfg.paydunya_public_key ?? ""} onChange={(e) => setCfg({ ...cfg, paydunya_public_key: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Private Key</Label>
                  <Input type="password" value={cfg.paydunya_private_key ?? ""} onChange={(e) => setCfg({ ...cfg, paydunya_private_key: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Token</Label>
                  <Input type="password" value={cfg.paydunya_token ?? ""} onChange={(e) => setCfg({ ...cfg, paydunya_token: e.target.value })} />
                </div>
              </TabsContent>

              <TabsContent value="cinetpay" className="space-y-3 pt-3">
                <p className="text-sm text-muted-foreground">
                  Récupérez vos clés sur <a href="https://cinetpay.com" target="_blank" rel="noreferrer" className="underline">cinetpay.com</a> → Intégration.
                </p>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input type="password" value={cfg.cinetpay_apikey ?? ""} onChange={(e) => setCfg({ ...cfg, cinetpay_apikey: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Site ID</Label>
                  <Input value={cfg.cinetpay_site_id ?? ""} onChange={(e) => setCfg({ ...cfg, cinetpay_site_id: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Secret Key</Label>
                  <Input type="password" value={cfg.cinetpay_secret_key ?? ""} onChange={(e) => setCfg({ ...cfg, cinetpay_secret_key: e.target.value })} />
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}

        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enregistrer
        </Button>
      </CardContent>
    </Card>
  );
};