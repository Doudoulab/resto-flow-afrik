import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const StockSettings = ({ restaurantId }: { restaurantId: string }) => {
  const [mode, setMode] = useState<"fired" | "paid">("fired");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("restaurants").select("stock_decrement_mode").eq("id", restaurantId).maybeSingle();
      if (data?.stock_decrement_mode) setMode(data.stock_decrement_mode as "fired" | "paid");
    })();
  }, [restaurantId]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("restaurants").update({ stock_decrement_mode: mode }).eq("id", restaurantId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Mode de décrément enregistré");
  };

  return (
    <Card>
      <CardHeader><CardTitle>Décrément automatique du stock</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label>Quand consommer le stock ?</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fired">À l'envoi cuisine (recommandé)</SelectItem>
              <SelectItem value="paid">À l'encaissement</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Mode "envoi cuisine" : le stock baisse dès qu'un plat part en préparation. Mode "encaissement" : le stock baisse à la facturation.
          </p>
        </div>
        <Button onClick={save} disabled={saving}>Enregistrer</Button>
      </CardContent>
    </Card>
  );
};
