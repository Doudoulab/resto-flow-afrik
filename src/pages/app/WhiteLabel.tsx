import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ImageUpload } from "@/components/ImageUpload";
import { PageTitle } from "@/components/layout/PageTitle";
import { toast } from "sonner";
import { Loader2, Globe, Mail, Receipt, Image as ImageIcon, Info } from "lucide-react";

const WhiteLabel = () => {
  const { restaurant, refresh } = useAuth();
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    theme_color: "#16a34a",
    invoice_footer: "",
    invoice_prefix: "INV",
    hide_powered_by: false,
    email_sender_name: "",
    custom_domain: "",
  });

  useEffect(() => {
    if (!restaurant) return;
    const r = restaurant as any;
    setLogoUrl(r.logo_url ?? null);
    setForm({
      theme_color: r.theme_color ?? "#16a34a",
      invoice_footer: r.invoice_footer ?? "",
      invoice_prefix: r.invoice_prefix ?? "INV",
      hide_powered_by: !!r.hide_powered_by,
      email_sender_name: r.email_sender_name ?? "",
      custom_domain: r.custom_domain ?? "",
    });
  }, [restaurant]);

  if (!restaurant) return null;

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("restaurants")
      .update({
        logo_url: logoUrl,
        theme_color: form.theme_color,
        invoice_footer: form.invoice_footer.trim() || null,
        invoice_prefix: form.invoice_prefix.trim() || "INV",
        hide_powered_by: form.hide_powered_by,
        email_sender_name: form.email_sender_name.trim() || null,
        custom_domain: form.custom_domain.trim().toLowerCase() || null,
      })
      .eq("id", restaurant.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Marque blanche enregistrée");
    await refresh();
  };

  return (
    <div className="space-y-6">
      <PageTitle title="Marque blanche" description="Personnalisez l'identité visuelle, les factures et les emails à votre image." />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5" /> Identité visuelle</CardTitle>
          <CardDescription>Logo et couleur principale utilisés sur la page publique, les factures et les tickets.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-[auto,1fr]">
            <ImageUpload bucket="restaurant-assets" folder={restaurant.id} value={logoUrl} onChange={setLogoUrl} label="Logo (carré recommandé)" prefix="logo-" />
            <div className="space-y-2">
              <Label>Couleur principale</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.theme_color} onChange={(e) => setForm({ ...form, theme_color: e.target.value })} className="h-10 w-16 cursor-pointer rounded border" />
                <Input value={form.theme_color} onChange={(e) => setForm({ ...form, theme_color: e.target.value })} maxLength={9} className="w-32" />
              </div>
              <p className="text-xs text-muted-foreground">Cette couleur est utilisée pour les boutons, badges et accents de votre page publique.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> Factures personnalisées</CardTitle>
          <CardDescription>Préfixe de numérotation et mention légale au pied des factures.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Préfixe facture</Label>
              <Input value={form.invoice_prefix} onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value.toUpperCase().slice(0, 8) })} placeholder="INV" />
              <p className="text-xs text-muted-foreground">Ex: <code>{form.invoice_prefix}-2026-000123</code></p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Mention légale (pied de facture)</Label>
            <Textarea rows={3} maxLength={500} value={form.invoice_footer} onChange={(e) => setForm({ ...form, invoice_footer: e.target.value })} placeholder="Merci de votre visite. TVA acquittée sur les débits. RCS Dakar XXX." />
            <p className="text-xs text-muted-foreground">Affiché en bas de chaque facture PDF (500 caractères max).</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Emails à votre marque</CardTitle>
          <CardDescription>Nom de l'expéditeur affiché dans les emails transactionnels (rappels de réservation, reçus, etc.).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>Nom expéditeur</Label>
          <Input value={form.email_sender_name} onChange={(e) => setForm({ ...form, email_sender_name: e.target.value })} placeholder={restaurant.name} maxLength={60} />
          <p className="text-xs text-muted-foreground">Par défaut, le nom de votre restaurant est utilisé.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Page publique</CardTitle>
          <CardDescription>Domaine personnalisé et badge "Propulsé par".</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Domaine personnalisé (optionnel)</Label>
            <Input value={form.custom_domain} onChange={(e) => setForm({ ...form, custom_domain: e.target.value })} placeholder="commande.monresto.com" />
            <p className="text-xs text-muted-foreground">Pointez un CNAME vers <code>resto-flow-afrik.lovable.app</code> puis indiquez votre domaine ici.</p>
            <Alert className="mt-2">
              <Info className="h-4 w-4" />
              <AlertTitle>Configuration DNS</AlertTitle>
              <AlertDescription className="text-xs">
                Chez votre registraire, créez un enregistrement <strong>CNAME</strong> :<br />
                <code>commande</code> → <code>resto-flow-afrik.lovable.app</code><br />
                La propagation DNS prend jusqu'à 48h. Contactez le support une fois le CNAME en place pour activer le domaine.
              </AlertDescription>
            </Alert>
          </div>

          <Separator />

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Masquer le badge "Propulsé par RestoFlow"</p>
              <p className="text-xs text-muted-foreground">Le badge n'apparaîtra plus sur votre page publique.</p>
            </div>
            <Switch checked={form.hide_powered_by} onCheckedChange={(v) => setForm({ ...form, hide_powered_by: v })} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} size="lg">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enregistrer la marque blanche
        </Button>
      </div>
    </div>
  );
};

export default WhiteLabel;
