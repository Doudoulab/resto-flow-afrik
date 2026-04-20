import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Copy, ExternalLink } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";
import type { Restaurant } from "@/contexts/AuthContext";

const DAYS: Array<{ key: string; label: string }> = [
  { key: "mon", label: "Lundi" },
  { key: "tue", label: "Mardi" },
  { key: "wed", label: "Mercredi" },
  { key: "thu", label: "Jeudi" },
  { key: "fri", label: "Vendredi" },
  { key: "sat", label: "Samedi" },
  { key: "sun", label: "Dimanche" },
];

type Hours = Record<string, { open: string; close: string; closed?: boolean }>;

const defaultHours: Hours = DAYS.reduce((acc, d) => {
  acc[d.key] = { open: "09:00", close: "22:00", closed: false };
  return acc;
}, {} as Hours);

export const RestaurantCustomization = ({ restaurant, onSaved }: { restaurant: Restaurant; onSaved: () => void }) => {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    description: "",
    whatsapp: "",
    instagram_url: "",
    facebook_url: "",
    theme_color: "#16a34a",
    slug: "",
    accepts_online_orders: true,
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [hours, setHours] = useState<Hours>(defaultHours);

  useEffect(() => {
    setForm({
      description: restaurant.description ?? "",
      whatsapp: restaurant.whatsapp ?? "",
      instagram_url: restaurant.instagram_url ?? "",
      facebook_url: restaurant.facebook_url ?? "",
      theme_color: restaurant.theme_color ?? "#16a34a",
      slug: restaurant.slug ?? "",
      accepts_online_orders: restaurant.accepts_online_orders ?? true,
    });
    setLogoUrl(restaurant.logo_url ?? null);
    setCoverUrl(restaurant.cover_url ?? null);
    const h = (restaurant.opening_hours as Hours) || {};
    const merged: Hours = { ...defaultHours };
    for (const d of DAYS) if (h[d.key]) merged[d.key] = { ...merged[d.key], ...h[d.key] };
    setHours(merged);
  }, [restaurant]);

  const publicUrl = `${window.location.origin}/r/${form.slug || restaurant.slug || ""}`;

  const save = async () => {
    if (form.description.length > 500) { toast.error("Description: 500 caractères max"); return; }
    const slugClean = form.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
    if (slugClean && !/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slugClean)) {
      toast.error("Slug invalide (3-50 caractères, lettres/chiffres/tirets)");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("restaurants")
      .update({
        description: form.description.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        instagram_url: form.instagram_url.trim() || null,
        facebook_url: form.facebook_url.trim() || null,
        theme_color: form.theme_color,
        slug: slugClean || null,
        accepts_online_orders: form.accepts_online_orders,
        logo_url: logoUrl,
        cover_url: coverUrl,
        opening_hours: hours,
      })
      .eq("id", restaurant.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Personnalisation enregistrée");
    onSaved();
  };

  const updateDay = (key: string, patch: Partial<Hours[string]>) => {
    setHours((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Personnalisation de la page publique</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-[auto,1fr]">
          <ImageUpload bucket="restaurant-assets" folder={restaurant.id} value={logoUrl} onChange={setLogoUrl} label="Logo" prefix="logo-" />
          <ImageUpload bucket="restaurant-assets" folder={restaurant.id} value={coverUrl} onChange={setCoverUrl} label="Image de couverture" aspect="wide" prefix="cover-" />
        </div>

        <div className="space-y-2">
          <Label>Description (max 500 caractères)</Label>
          <Textarea rows={3} maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Cuisine africaine authentique au cœur de Dakar…" />
        </div>

        <div className="space-y-2">
          <Label>URL publique (slug)</Label>
          <div className="flex gap-2">
            <span className="flex items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">/r/</span>
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="mon-resto" maxLength={50} />
          </div>
          {form.slug && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <code className="truncate">{publicUrl}</code>
              <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Copié"); }}>
                <Copy className="h-3 w-3" />
              </Button>
              <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label>WhatsApp</Label>
            <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+221771234567" maxLength={20} />
          </div>
          <div className="space-y-2">
            <Label>Instagram (URL)</Label>
            <Input value={form.instagram_url} onChange={(e) => setForm({ ...form, instagram_url: e.target.value })} placeholder="https://instagram.com/…" maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label>Facebook (URL)</Label>
            <Input value={form.facebook_url} onChange={(e) => setForm({ ...form, facebook_url: e.target.value })} placeholder="https://facebook.com/…" maxLength={200} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Couleur principale</Label>
          <div className="flex items-center gap-3">
            <input type="color" value={form.theme_color} onChange={(e) => setForm({ ...form, theme_color: e.target.value })} className="h-10 w-16 cursor-pointer rounded border" />
            <Input value={form.theme_color} onChange={(e) => setForm({ ...form, theme_color: e.target.value })} maxLength={9} className="w-32" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Horaires d'ouverture</Label>
          <div className="space-y-2 rounded-md border p-3">
            {DAYS.map((d) => {
              const h = hours[d.key];
              return (
                <div key={d.key} className="flex flex-wrap items-center gap-3">
                  <div className="w-24 text-sm font-medium">{d.label}</div>
                  <Switch checked={!h.closed} onCheckedChange={(v) => updateDay(d.key, { closed: !v })} />
                  {h.closed ? (
                    <span className="text-xs text-muted-foreground">Fermé</span>
                  ) : (
                    <>
                      <Input type="time" className="w-28" value={h.open} onChange={(e) => updateDay(d.key, { open: e.target.value })} />
                      <span className="text-muted-foreground">→</span>
                      <Input type="time" className="w-28" value={h.close} onChange={(e) => updateDay(d.key, { close: e.target.value })} />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <p className="text-sm font-medium">Accepter les commandes en ligne</p>
            <p className="text-xs text-muted-foreground">Permet aux clients de commander depuis la page publique.</p>
          </div>
          <Switch checked={form.accepts_online_orders} onCheckedChange={(v) => setForm({ ...form, accepts_online_orders: v })} />
        </div>

        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enregistrer la personnalisation
        </Button>
      </CardContent>
    </Card>
  );
};
