import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Languages, Loader2 } from "lucide-react";
import { toast } from "sonner";

const LANGS = [
  { code: "en", label: "English 🇬🇧" },
  { code: "ar", label: "العربية 🇸🇦" },
];

interface Translation { id?: string; language_code: string; name: string; description?: string | null }

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  restaurantId: string;
  itemId: string;
  defaultName: string;
  defaultDescription?: string | null;
}

export const MenuTranslationsDialog = ({ open, onOpenChange, restaurantId, itemId, defaultName, defaultDescription }: Props) => {
  const [translations, setTranslations] = useState<Record<string, Translation>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !itemId) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("menu_item_translations")
        .select("id,language_code,name,description")
        .eq("menu_item_id", itemId);
      const map: Record<string, Translation> = {};
      LANGS.forEach((l) => {
        const existing = (data ?? []).find((t) => t.language_code === l.code);
        map[l.code] = existing ?? { language_code: l.code, name: "", description: "" };
      });
      setTranslations(map);
      setLoading(false);
    })();
  }, [open, itemId]);

  const update = (lang: string, patch: Partial<Translation>) =>
    setTranslations((p) => ({ ...p, [lang]: { ...p[lang], ...patch } }));

  const save = async () => {
    setSaving(true);
    const ops = LANGS.map(async (l) => {
      const t = translations[l.code];
      if (!t.name.trim()) {
        // Skip empty translations — also delete existing
        if (t.id) await supabase.from("menu_item_translations").delete().eq("id", t.id);
        return;
      }
      const payload = {
        restaurant_id: restaurantId, menu_item_id: itemId,
        language_code: l.code, name: t.name.trim(),
        description: t.description?.trim() || null,
      };
      if (t.id) {
        await supabase.from("menu_item_translations").update(payload).eq("id", t.id);
      } else {
        await supabase.from("menu_item_translations").insert(payload);
      }
    });
    await Promise.all(ops);
    setSaving(false);
    toast.success("Traductions enregistrées");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" /> Traductions du plat
          </DialogTitle>
        </DialogHeader>
        <div className="rounded bg-muted p-3 text-sm">
          <p className="text-xs text-muted-foreground">Original (FR)</p>
          <p className="font-medium">{defaultName}</p>
          {defaultDescription && <p className="text-xs text-muted-foreground mt-1">{defaultDescription}</p>}
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <Tabs defaultValue="en">
            <TabsList className="grid w-full grid-cols-2">
              {LANGS.map((l) => <TabsTrigger key={l.code} value={l.code}>{l.label}</TabsTrigger>)}
            </TabsList>
            {LANGS.map((l) => (
              <TabsContent key={l.code} value={l.code} className="space-y-3 pt-3">
                <div>
                  <Label>Nom ({l.code.toUpperCase()})</Label>
                  <Input
                    value={translations[l.code]?.name ?? ""}
                    onChange={(e) => update(l.code, { name: e.target.value })}
                    dir={l.code === "ar" ? "rtl" : "ltr"}
                  />
                </div>
                <div>
                  <Label>Description ({l.code.toUpperCase()})</Label>
                  <Textarea
                    rows={3}
                    value={translations[l.code]?.description ?? ""}
                    onChange={(e) => update(l.code, { description: e.target.value })}
                    dir={l.code === "ar" ? "rtl" : "ltr"}
                  />
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={save} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};