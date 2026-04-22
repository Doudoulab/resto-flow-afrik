import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Gift } from "lucide-react";
import { toast } from "sonner";

export default function Subscriptions() {
  const qc = useQueryClient();
  const [grantUserId, setGrantUserId] = useState("");
  const [grantPlan, setGrantPlan] = useState("pro_plan");
  const [grantDays, setGrantDays] = useState(30);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subscriptions").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });

  const grant = async () => {
    const priceId = grantPlan === "pro_plan" ? "pro_monthly" : "business_monthly";
    const { error } = await supabase.rpc("admin_grant_subscription", { _user_id: grantUserId, _product_id: grantPlan, _price_id: priceId, _days: grantDays });
    if (error) { toast.error(error.message); return; }
    toast.success(`Plan ${grantPlan} accordé pour ${grantDays} jours`);
    setOpen(false); setGrantUserId(""); qc.invalidateQueries({ queryKey: ["admin-subscriptions"] });
  };

  const statusVariant = (s: string) => s === "active" || s === "trialing" ? "default" : s === "canceled" ? "destructive" : "secondary";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Abonnements</h1>
          <p className="text-muted-foreground mt-1">Tous les abonnements Paddle (sandbox + live)</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Gift className="h-4 w-4 mr-2" /> Offrir un plan</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Offrir un abonnement</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>User ID</Label><Input placeholder="uuid de l'utilisateur" value={grantUserId} onChange={(e) => setGrantUserId(e.target.value)} /></div>
              <div><Label>Plan</Label>
                <Select value={grantPlan} onValueChange={setGrantPlan}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pro_plan">Pro ($29/mo)</SelectItem>
                    <SelectItem value="business_plan">Business ($79/mo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Durée (jours)</Label><Input type="number" value={grantDays} onChange={(e) => setGrantDays(Number(e.target.value))} /></div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={grant} disabled={!grantUserId}>Offrir</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Env</TableHead>
              <TableHead>Période fin</TableHead>
              <TableHead>Annulation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>}
            {!isLoading && data?.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun abonnement</TableCell></TableRow>}
            {data?.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-xs">{s.user_id.slice(0, 8)}...</TableCell>
                <TableCell>{s.product_id}<div className="text-xs text-muted-foreground">{s.price_id}</div></TableCell>
                <TableCell><Badge variant={statusVariant(s.status) as any}>{s.status}</Badge></TableCell>
                <TableCell><Badge variant="outline">{s.environment}</Badge></TableCell>
                <TableCell className="text-sm">{s.current_period_end ? new Date(s.current_period_end).toLocaleDateString("fr-FR") : "—"}</TableCell>
                <TableCell>{s.cancel_at_period_end && <Badge variant="destructive">Prévue</Badge>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}