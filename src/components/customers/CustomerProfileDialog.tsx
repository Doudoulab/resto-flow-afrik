import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Crown, Calendar, Sparkles, History, Save } from "lucide-react";
import { toast } from "sonner";
import { formatFCFA } from "@/lib/currency";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface CustomerFull {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  birthday: string | null;
  is_vip: boolean;
  loyalty_tier: string;
  preferred_language: string;
  tags: string[];
  preferred_table: string | null;
  preferred_seating: string | null;
  preferred_wine: string | null;
  allergies: string | null;
  dietary_preferences: string | null;
  maitre_notes: string | null;
  notes: string | null;
  total_visits: number;
  lifetime_value: number;
  last_visit_at: string | null;
}
interface Visit {
  id: string; visit_date: string; total_spent: number; party_size: number; items_summary: { name: string; qty: number }[]; notes: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  customerId: string | null;
  onSaved?: () => void;
}

const TIERS = [
  { v: "standard", label: "Standard" },
  { v: "silver", label: "Argent" },
  { v: "gold", label: "Or" },
  { v: "platinum", label: "Platine" },
];
const LANGS = [{ v: "fr", l: "Français" }, { v: "en", l: "English" }, { v: "ar", l: "العربية" }];

export const CustomerProfileDialog = ({ open, onOpenChange, customerId, onSaved }: Props) => {
  const [c, setC] = useState<CustomerFull | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !customerId) return;
    (async () => {
      const [cr, vr] = await Promise.all([
        supabase.from("customers").select("*").eq("id", customerId).maybeSingle(),
        supabase.from("customer_visits").select("*").eq("customer_id", customerId).order("visit_date", { ascending: false }).limit(50),
      ]);
      setC(cr.data as CustomerFull);
      setVisits((vr.data ?? []) as unknown as Visit[]);
    })();
  }, [open, customerId]);

  if (!c) return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent><p className="text-muted-foreground py-8 text-center">Chargement…</p></DialogContent>
    </Dialog>
  );

  const update = (patch: Partial<CustomerFull>) => setC({ ...c, ...patch });

  const addTag = () => {
    const t = tagInput.trim();
    if (!t || c.tags.includes(t)) return;
    update({ tags: [...c.tags, t] });
    setTagInput("");
  };
  const removeTag = (t: string) => update({ tags: c.tags.filter((x) => x !== t) });

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("customers").update({
      name: c.name, phone: c.phone, email: c.email, birthday: c.birthday,
      is_vip: c.is_vip, loyalty_tier: c.loyalty_tier, preferred_language: c.preferred_language,
      tags: c.tags, preferred_table: c.preferred_table, preferred_seating: c.preferred_seating,
      preferred_wine: c.preferred_wine, allergies: c.allergies, dietary_preferences: c.dietary_preferences,
      maitre_notes: c.maitre_notes, notes: c.notes,
    }).eq("id", c.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profil enregistré");
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {c.is_vip && <Crown className="h-5 w-5 text-yellow-500" />}
            {c.name}
            <Badge variant="secondary" className="ml-2">{TIERS.find((t) => t.v === c.loyalty_tier)?.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 pb-2">
          <Card><CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Visites</p>
            <p className="text-xl font-bold">{c.total_visits}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">CA cumulé</p>
            <p className="text-xl font-bold text-primary">{formatFCFA(c.lifetime_value)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Dernière visite</p>
            <p className="text-sm font-medium">{c.last_visit_at ? format(parseISO(c.last_visit_at), "d MMM yyyy", { locale: fr }) : "—"}</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profil</TabsTrigger>
            <TabsTrigger value="prefs">Préférences</TabsTrigger>
            <TabsTrigger value="maitre">Maître d'hôtel</TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nom</Label><Input value={c.name} onChange={(e) => update({ name: e.target.value })} /></div>
              <div><Label>Téléphone</Label><Input value={c.phone ?? ""} onChange={(e) => update({ phone: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={c.email ?? ""} onChange={(e) => update({ email: e.target.value })} /></div>
              <div><Label className="flex items-center gap-1"><Calendar className="h-3 w-3" />Date de naissance</Label><Input type="date" value={c.birthday ?? ""} onChange={(e) => update({ birthday: e.target.value })} /></div>
              <div>
                <Label>Niveau fidélité</Label>
                <Select value={c.loyalty_tier} onValueChange={(v) => update({ loyalty_tier: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIERS.map((t) => <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Langue préférée</Label>
                <Select value={c.preferred_language} onValueChange={(v) => update({ preferred_language: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LANGS.map((l) => <SelectItem key={l.v} value={l.v}>{l.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label className="flex items-center gap-2"><Crown className="h-4 w-4 text-yellow-500" /> Statut VIP</Label>
              <Switch checked={c.is_vip} onCheckedChange={(v) => update({ is_vip: v })} />
            </div>
            <div>
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1 mb-2">
                {c.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="cursor-pointer" onClick={() => removeTag(t)}>{t} ×</Badge>
                ))}
                {c.tags.length === 0 && <span className="text-xs text-muted-foreground">Aucun tag</span>}
              </div>
              <div className="flex gap-2">
                <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="Ex: critique, célébrité, allergique noix…" />
                <Button type="button" onClick={addTag}>+</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="prefs" className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Table préférée</Label><Input value={c.preferred_table ?? ""} onChange={(e) => update({ preferred_table: e.target.value })} placeholder="Table 7, terrasse…" /></div>
              <div><Label>Place préférée</Label><Input value={c.preferred_seating ?? ""} onChange={(e) => update({ preferred_seating: e.target.value })} placeholder="Banquette, vue jardin…" /></div>
            </div>
            <div><Label>Vin préféré</Label><Input value={c.preferred_wine ?? ""} onChange={(e) => update({ preferred_wine: e.target.value })} placeholder="Bordeaux, Champagne brut…" /></div>
            <div><Label className="flex items-center gap-1 text-destructive"><Sparkles className="h-3 w-3" /> Allergies</Label><Textarea rows={2} value={c.allergies ?? ""} onChange={(e) => update({ allergies: e.target.value })} placeholder="Arachides, fruits de mer…" /></div>
            <div><Label>Préférences alimentaires</Label><Textarea rows={2} value={c.dietary_preferences ?? ""} onChange={(e) => update({ dietary_preferences: e.target.value })} placeholder="Végétarien, sans gluten, halal…" /></div>
          </TabsContent>

          <TabsContent value="maitre" className="space-y-3 pt-3">
            <div>
              <Label className="flex items-center gap-1"><Crown className="h-3 w-3 text-yellow-500" /> Notes du maître d'hôtel</Label>
              <Textarea rows={6} value={c.maitre_notes ?? ""} onChange={(e) => update({ maitre_notes: e.target.value })}
                placeholder="Ex: Apprécie un accueil avec champagne. Conjoint de Mme Dupont. Préfère le service rapide en semaine. Pourboire généreux…" />
              <p className="text-xs text-muted-foreground mt-1">Notes confidentielles visibles uniquement par votre équipe.</p>
            </div>
            <div>
              <Label>Notes générales</Label>
              <Textarea rows={3} value={c.notes ?? ""} onChange={(e) => update({ notes: e.target.value })} />
            </div>
          </TabsContent>

          <TabsContent value="history" className="pt-3">
            <Label className="flex items-center gap-1 mb-2"><History className="h-4 w-4" /> Dernières visites ({visits.length})</Label>
            {visits.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune visite enregistrée.</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {visits.map((v) => (
                  <Card key={v.id}>
                    <CardContent className="p-3">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{format(parseISO(v.visit_date), "d MMM yyyy 'à' HH'h'mm", { locale: fr })}</span>
                        <span className="font-bold text-primary">{formatFCFA(v.total_spent)}</span>
                      </div>
                      {v.items_summary?.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {v.items_summary.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fermer</Button>
          <Button onClick={save} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};