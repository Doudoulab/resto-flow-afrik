import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Receipt } from "lucide-react";

interface Props {
  restaurantId: string;
  onSaved?: () => void;
}

interface FiscalForm {
  tax_id: string;
  business_register: string;
  default_vat_rate: number;
  vat_mode: "inclusive" | "exclusive";
  default_service_pct: number;
  invoice_prefix: string;
  invoice_footer: string;
  next_invoice_number: number;
}

export const FiscalSettings = ({ restaurantId, onSaved }: Props) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FiscalForm>({
    tax_id: "",
    business_register: "",
    default_vat_rate: 18,
    vat_mode: "exclusive",
    default_service_pct: 0,
    invoice_prefix: "FAC",
    invoice_footer: "",
    next_invoice_number: 1,
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("tax_id, business_register, default_vat_rate, vat_mode, default_service_pct, invoice_prefix, invoice_footer, next_invoice_number")
        .eq("id", restaurantId)
        .maybeSingle();
      if (data) {
        setForm({
          tax_id: data.tax_id ?? "",
          business_register: data.business_register ?? "",
          default_vat_rate: Number(data.default_vat_rate ?? 18),
          vat_mode: (data.vat_mode as "inclusive" | "exclusive") ?? "exclusive",
          default_service_pct: Number(data.default_service_pct ?? 0),
          invoice_prefix: data.invoice_prefix ?? "FAC",
          invoice_footer: data.invoice_footer ?? "",
          next_invoice_number: Number(data.next_invoice_number ?? 1),
        });
      }
      setLoading(false);
    })();
  }, [restaurantId]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("restaurants").update({
      tax_id: form.tax_id || null,
      business_register: form.business_register || null,
      default_vat_rate: form.default_vat_rate,
      vat_mode: form.vat_mode,
      default_service_pct: form.default_service_pct,
      invoice_prefix: form.invoice_prefix || "FAC",
      invoice_footer: form.invoice_footer || null,
    }).eq("id", restaurantId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Paramètres fiscaux enregistrés");
    onSaved?.();
  };

  if (loading) {
    return (
      <Card><CardContent className="py-6 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </CardContent></Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" /> Fiscalité & facturation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>NIF / N° d'identification fiscale</Label>
            <Input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} placeholder="Ex: 0123456 A" />
          </div>
          <div className="space-y-2">
            <Label>RCCM / Registre du commerce</Label>
            <Input value={form.business_register} onChange={(e) => setForm({ ...form, business_register: e.target.value })} placeholder="Ex: SN-DKR-2024-B-1234" />
          </div>
          <div className="space-y-2">
            <Label>Taux TVA par défaut (%)</Label>
            <Input type="number" step="0.01" value={form.default_vat_rate} onChange={(e) => setForm({ ...form, default_vat_rate: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="space-y-2">
            <Label>Mode TVA</Label>
            <Select value={form.vat_mode} onValueChange={(v) => setForm({ ...form, vat_mode: v as "inclusive" | "exclusive" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="exclusive">Exclusive (TVA ajoutée au prix)</SelectItem>
                <SelectItem value="inclusive">Inclusive (TVA comprise dans le prix)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Service charge par défaut (%)</Label>
            <Input type="number" step="0.01" value={form.default_service_pct} onChange={(e) => setForm({ ...form, default_service_pct: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="space-y-2">
            <Label>Préfixe facture</Label>
            <Input value={form.invoice_prefix} onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value.toUpperCase() })} placeholder="FAC" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Mentions légales / pied de facture</Label>
          <Textarea value={form.invoice_footer} onChange={(e) => setForm({ ...form, invoice_footer: e.target.value })} rows={3} placeholder="Ex: TVA non applicable, art. 293 B du CGI / Conditions de paiement…" />
        </div>
        <p className="text-xs text-muted-foreground">
          Prochain n° de facture : <span className="font-mono font-semibold">{form.invoice_prefix}-{new Date().getFullYear()}-{String(form.next_invoice_number).padStart(6, "0")}</span>
        </p>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enregistrer
        </Button>
      </CardContent>
    </Card>
  );
};