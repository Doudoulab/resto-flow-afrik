import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string | null;
  onSaved: () => void;
}

export const ItemNotesDialog = ({ open, onOpenChange, itemId, onSaved }: Props) => {
  const [special, setSpecial] = useState("");
  const [allergy, setAllergy] = useState(false);
  const [course, setCourse] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !itemId) return;
    (async () => {
      const { data } = await supabase.from("order_items")
        .select("special_request, is_allergy_alert, course_number")
        .eq("id", itemId).maybeSingle();
      setSpecial(data?.special_request ?? "");
      setAllergy(!!data?.is_allergy_alert);
      setCourse(data?.course_number ?? 1);
    })();
  }, [open, itemId]);

  const save = async () => {
    if (!itemId) return;
    setSaving(true);
    const { error } = await supabase.from("order_items").update({
      special_request: special.trim() || null,
      is_allergy_alert: allergy,
      course_number: Math.max(1, Math.min(9, course)),
    }).eq("id", itemId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Note enregistrée");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Note & cours du plat</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Demande spéciale (sans oignon, à point, etc.)</Label>
            <Textarea value={special} onChange={(e) => setSpecial(e.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Cours de service (1 = entrée, 2 = plat, 3 = dessert…)</Label>
            <Input type="number" min={1} max={9} value={course} onChange={(e) => setCourse(parseInt(e.target.value) || 1)} />
          </div>
          <label className="flex items-center justify-between rounded-md border p-3 cursor-pointer">
            <span className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Alerte allergie
            </span>
            <Switch checked={allergy} onCheckedChange={setAllergy} />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={save} disabled={saving}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};